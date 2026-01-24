from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Conversation, Message, Reaction
from .serializers import ConversationSerializer, MessageSerializer, ReactionSerializer
from django.db.models import Q, Count
from django.contrib.auth import get_user_model
from rest_framework.views import APIView

User = get_user_model()

class ConversationListView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.conversations.all().order_by('-id')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        recipient_username = request.data.get('recipient')
        
        if not recipient_username:
             return Response({"error": "Recipient username is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient = User.objects.get(username=recipient_username)
            if recipient == request.user:
                conversation = Conversation.objects.filter(participants=request.user).annotate(num_participants=Count('participants')).filter(num_participants=1).first()
                if not conversation:
                    conversation = Conversation.objects.create()
                    conversation.participants.add(request.user)
            else:
                conversation = Conversation.objects.filter(participants=request.user).filter(participants=recipient).annotate(num_participants=Count('participants')).filter(num_participants=2).first()
                
                if not conversation:
                    conversation = Conversation.objects.create()
                    conversation.participants.add(request.user, recipient)
            
            response_serializer = self.get_serializer(conversation)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except User.DoesNotExist:
            return Response({"error": "Recipient user not found."}, status=status.HTTP_404_NOT_FOUND)

class ConversationDetailView(generics.DestroyAPIView):
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can only delete conversations they are part of
        return self.request.user.conversations.all()

class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conversation_id = self.kwargs['conversation_id']
        return Message.objects.filter(conversation_id=conversation_id).order_by('timestamp')

class MessageDetailView(generics.DestroyAPIView):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can only delete their own messages
        return self.request.user.sent_messages.all()

class ReactionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id)
            # Check if user is participant
            if not message.conversation.participants.filter(id=request.user.id).exists():
                return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
            emoji = request.data.get('reaction')
            if not emoji:
                return Response({"error": "Emoji required"}, status=status.HTTP_400_BAD_REQUEST)

            # Toggle reaction
            existing = Reaction.objects.filter(message=message, user=request.user, emoji=emoji).first()
            if existing:
                existing.delete()
                return Response({"status": "removed"}, status=status.HTTP_200_OK)
            else:
                Reaction.objects.create(message=message, user=request.user, emoji=emoji)
                return Response({"status": "added"}, status=status.HTTP_201_CREATED)

        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)
