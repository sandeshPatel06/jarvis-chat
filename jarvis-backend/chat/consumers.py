import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # We assume url is /ws/chat/
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return

        self.room_group_name = f"user_{self.user.id}"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        await self.update_user_status(True)

    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name'):
             await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        await self.update_user_status(False)

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', 'chat_message')

        if message_type == 'mark_read':
            message_id = text_data_json.get('message_id')
            conversation_id = text_data_json.get('conversation_id') # Optional context
            if message_id:
                sender_id = await self.mark_message_read(message_id)
                if sender_id:
                     # Notify the sender that their message was read
                    sender_group_name = f"user_{sender_id}"
                    await self.channel_layer.group_send(
                        sender_group_name,
                        {
                            'type': 'message_read',
                            'message_id': message_id,
                            'conversation_id': conversation_id
                        }
                    )
            return

        if text_data_json.get('type') == 'typing':
            print(f"[WS] Received typing event: {text_data_json}")
            conversation_id = text_data_json.get('conversation_id')
            recipient_id = text_data_json.get('recipient_id')
            
            # Find recipient and broadcast
            # We reuse the logic: if recipient_id provided use it, else derive
             # Note: For typing, strictly non-db-write. We might need a quick lookup if recipient_id is missing.
            final_recipient_id = recipient_id
            
            if not final_recipient_id and conversation_id:
                 final_recipient_id = await self.get_recipient_from_conversation(conversation_id)

            if final_recipient_id:
                 print(f"[WS] Broadcasting typing to user_{final_recipient_id}")
                 await self.channel_layer.group_send(
                    f"user_{final_recipient_id}",
                    {
                        'type': 'user_typing',
                        'conversation_id': conversation_id,
                        'sender_id': self.user.id,
                        'sender_username': self.user.username
                    }
                )
            return

        message_text = text_data_json.get('message')
        recipient_id = text_data_json.get('recipient_id')
        conversation_id = text_data_json.get('conversation_id')

        if message_text:
            # Save message to database
            saved_message_data, recipient_id_derived = await self.save_message(message_text, recipient_id, conversation_id)

            if saved_message_data:
                # Send message to sender
                await self.send(text_data=json.dumps({
                    'message': saved_message_data
                }))

                # Determine final recipient_id (payload takes precedence, but usually derived is safer for consistency)
                final_recipient_id = recipient_id or recipient_id_derived

                # Send message to recipient's group
                if final_recipient_id:
                    recipient_group_name = f"user_{final_recipient_id}"
                    await self.channel_layer.group_send(
                        recipient_group_name,
                        {
                            'type': 'chat_message',
                            'message': saved_message_data
                        }
                    )

    async def user_typing(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_typing',
            'conversation_id': event['conversation_id'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username']
        }))

    async def chat_message(self, event):
        message = event['message']
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))

    @database_sync_to_async
    def get_recipient_from_conversation(self, conversation_id):
        from .models import Conversation
        try:
             conversation = Conversation.objects.get(id=conversation_id)
             other_participant = conversation.participants.exclude(id=self.user.id).first()
             return other_participant.id if other_participant else None
        except Exception as e:
            print(f"[WS] Error finding recipient: {e}")
            return None

    async def message_read(self, event):
        # Notify user that their message was read
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_id': event['message_id'],
            'conversation_id': event.get('conversation_id')
        }))

    @database_sync_to_async
    def update_user_status(self, is_online):
        from django.utils import timezone
        User.objects.filter(id=self.user.id).update(
            is_online=is_online,
            last_seen=timezone.now()
        )

    @database_sync_to_async
    def mark_message_read(self, message_id):
        from .models import Message
        try:
            message = Message.objects.get(id=message_id)
            if not message.is_read:
                message.is_read = True
                message.save()
                return message.sender.id
            return None
        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def save_message(self, message_text, recipient_id, conversation_id):
        from .models import Conversation, Message
        from .serializers import MessageSerializer
        from django.db.models import Q

        try:
            conversation = None
            if conversation_id:
                conversation = Conversation.objects.get(id=conversation_id)
            elif recipient_id:
                 recipient = User.objects.get(id=recipient_id)
                 conversation = Conversation.objects.filter(participants=self.user).filter(participants=recipient).first()
            
            if conversation:
                message = Message.objects.create(
                    conversation=conversation,
                    sender=self.user,
                    text=message_text
                )
                
                # Determine recipient for return
                data = MessageSerializer(message).data
                
                # Logic to find the "other" participant
                # Note: this assumes 1-on-1 chat relative to the sender
                other_participant = conversation.participants.exclude(id=self.user.id).first()
                derived_recipient_id = other_participant.id if other_participant else None
                
                # If it's a self-chat (user talking to themselves), exclude might return None if they are the ONLY participant
                # So we check if self.user is in participants and count is 1
                if conversation.participants.count() == 1 and conversation.participants.first() == self.user:
                     derived_recipient_id = self.user.id

                return data, derived_recipient_id
                
        except Exception as e:
            print(f"Error saving message: {e}")
            return None, None
        return None, None
