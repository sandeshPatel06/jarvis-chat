from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Conversation, Message, Reaction, Call
from .serializers import ConversationSerializer, MessageSerializer, ReactionSerializer, CallSerializer
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
                 # Self chat
                conversation = Conversation.objects.filter(participants=request.user).annotate(num_participants=Count('participants')).filter(num_participants=1).first()
                if not conversation:
                     conversation = Conversation.objects.create()
                     conversation.participants.add(request.user)
            else:
                # 1-on-1 chat
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

from rest_framework.pagination import LimitOffsetPagination

class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination

    def get_queryset(self):
        conversation_id = self.kwargs['conversation_id']
        # Return newest messages first for inverted list
        return Message.objects.filter(conversation_id=conversation_id).order_by('-timestamp')

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

            # Replace existing reaction from this user
            # First, delete any existing reactions from this user on this message
            Reaction.objects.filter(message=message, user=request.user).delete()
            
            # Then create the new reaction
            Reaction.objects.create(message=message, user=request.user, emoji=emoji)
            return Response({"status": "added"}, status=status.HTTP_201_CREATED)

        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)

from rest_framework.parsers import MultiPartParser, FormParser
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class MessageUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        conversation_id = request.data.get('conversation_id')
        recipient_username = request.data.get('recipient_username')
        text = request.data.get('text', '')
        file = request.data.get('file')
        file_type = request.data.get('file_type')
        file_name = request.data.get('file_name')
        reply_to_id = request.data.get('reply_to_id')

        # Allow file only, text only, or both
        if not file and not text:
             return Response({"error": "Message must have text or file"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conversation = None
            if conversation_id:
                try:
                    conversation = Conversation.objects.get(id=conversation_id)
                except Conversation.DoesNotExist:
                    pass
            
            if not conversation and recipient_username:
                try:
                    recipient = User.objects.get(username=recipient_username)
                    if recipient == request.user:
                        # Self chat
                        conversation = Conversation.objects.filter(participants=request.user).annotate(num_participants=Count('participants')).filter(num_participants=1).first()
                        if not conversation:
                            conversation = Conversation.objects.create()
                            conversation.participants.add(request.user)
                    else:
                        conversation = Conversation.objects.filter(participants=request.user).filter(participants=recipient).annotate(num_participants=Count('participants')).filter(num_participants=2).first()
                        if not conversation:
                            conversation = Conversation.objects.create()
                            conversation.participants.add(request.user, recipient)
                except User.DoesNotExist:
                    pass

            if not conversation:
                return Response({"error": "Conversation not found or recipient invalid"}, status=status.HTTP_404_NOT_FOUND)
            
            # Verify user is in conversation
            if not conversation.participants.filter(id=request.user.id).exists():
                 return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
            reply_to_message = None
            if reply_to_id:
                reply_to_message = Message.objects.filter(id=reply_to_id).first()

            message = Message.objects.create(
                conversation=conversation,
                sender=request.user,
                text=text,
                file=file,
                file_type=file_type,
                file_name=file_name,
                reply_to=reply_to_message
            )

            serializer = MessageSerializer(message)
            data = serializer.data

            # Broadcast via WebSocket
            channel_layer = get_channel_layer()

            # Broadcast to all participants
            for participant in conversation.participants.all():
                 async_to_sync(channel_layer.group_send)(
                    f"user_{participant.id}",
                    {
                        'type': 'chat_message',
                        'message': data
                    }
                )

            return Response(data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(e)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CallViewSet(generics.ListCreateAPIView):
    serializer_class = CallSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return calls where user is caller OR receiver
        return Call.objects.filter(
            Q(caller=self.request.user) | Q(receiver=self.request.user)
        ).order_by('-started_at')

    def perform_create(self, serializer):
        recipient_username = self.request.data.get('receiver_username')
        try:
            receiver = User.objects.get(username=recipient_username)
            serializer.save(caller=self.request.user, receiver=receiver)
        except User.DoesNotExist:
             raise serializers.ValidationError("Receiver not found")
