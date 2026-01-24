from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Conversation, Message
from .serializers import MessageSerializer
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

User = get_user_model()

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

        if not file and not text:
             return Response({"error": "Message must have text or file"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conversation = None
            if conversation_id:
                conversation = Conversation.objects.get(id=conversation_id)
            elif recipient_username:
                recipient = User.objects.get(username=recipient_username)
                # Logic to find or create conversation (simplified for brevity, should match create logic)
                # Ideally, frontend sends conversation_id if existing.
                # If new, we might need full create logic or rely on consumer-like find/create.
                # For robust upload, let's look up 1-on-1:
                conversation = Conversation.objects.filter(participants=request.user).filter(participants=recipient).first()
                if not conversation:
                     conversation = Conversation.objects.create()
                     conversation.participants.add(request.user, recipient)

            if not conversation:
                return Response({"error": "Conversation not found or recipient invalid"}, status=status.HTTP_404_NOT_FOUND)
            
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
            
            # Send to sender (to confirm upload and sync ID)
            # Actually, standard REST response confirms to sender.
            # But we want to sync other devices of sender too? Yes.
            
            # Helper to broadcast
            def broadcast_to_user(user_id, event_type, msg_data):
                async_to_sync(channel_layer.group_send)(
                    f"user_{user_id}",
                    {
                        'type': event_type,
                        'message': msg_data
                    }
                )

            # Broadcast to all participants
            for participant in conversation.participants.all():
                 broadcast_to_user(participant.id, 'chat_message', data)

            return Response(data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(e)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
