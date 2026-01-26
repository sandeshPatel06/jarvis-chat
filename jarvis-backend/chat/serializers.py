from rest_framework import serializers
from .models import Conversation, Message, Reaction, Call
from accounts.serializers import UserSerializer

class ReactionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = Reaction
        fields = ['emoji', 'username', 'timestamp']

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    reactions = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field='emoji'
    )
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'text', 'file', 'file_type', 'file_name', 'timestamp', 'is_read', 'is_delivered', 'reactions', 'reply_to']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.reply_to:
            representation['reply_to'] = {
                'id': instance.reply_to.id,
                'text': instance.reply_to.text,
                'sender': instance.reply_to.sender.username
            }
        return representation

class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'last_message', 'unread_count']

    def get_last_message(self, obj):
        message = obj.messages.order_by('-timestamp').first()
        if message:
            return MessageSerializer(message).data
        return None

    def get_unread_count(self, obj):
        user = self.context['request'].user
        return obj.messages.exclude(sender=user).filter(is_read=False).count()

class CallSerializer(serializers.ModelSerializer):
    caller = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    
    class Meta:
        model = Call
        fields = ['id', 'caller', 'receiver', 'started_at', 'ended_at', 'status', 'is_video']
