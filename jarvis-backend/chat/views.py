from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from django.db.models import Q, Count
from django.contrib.auth import get_user_model

User = get_user_model()

class ConversationListView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.conversations.all().order_by('-id')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        # We don't strictly require valid data for 'recipient' field as it's not on the model serializer directly likely
        # But if we had other fields we would check. 
        # Actually serializer.is_valid() is good to check for basic valid json structure.
        serializer.is_valid(raise_exception=True)

        recipient_username = request.data.get('recipient')
        
        if not recipient_username:
             return Response({"error": "Recipient username is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient = User.objects.get(username=recipient_username)
            if recipient == request.user:
                # Self Chat logic: Find conversation with exactly 1 participant (the user)
                conversation = Conversation.objects.filter(participants=request.user).annotate(num_participants=Count('participants')).filter(num_participants=1).first()
                if not conversation:
                    conversation = Conversation.objects.create()
                    conversation.participants.add(request.user)
            else:
                # Private Chat logic: Find conversation with these two participants
                # Note: This simple filter might return group chats if we had them.
                # Ideally check for num_participants=2 as well
                conversation = Conversation.objects.filter(participants=request.user).filter(participants=recipient).annotate(num_participants=Count('participants')).filter(num_participants=2).first()
                
                if not conversation:
                    conversation = Conversation.objects.create()
                    conversation.participants.add(request.user, recipient)
            
            # Serialize the instance (whether new or existing)
            response_serializer = self.get_serializer(conversation)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except User.DoesNotExist:
            return Response({"error": "Recipient user not found."}, status=status.HTTP_404_NOT_FOUND)

class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conversation_id = self.kwargs['conversation_id']
        return Message.objects.filter(conversation_id=conversation_id).order_by('timestamp')
