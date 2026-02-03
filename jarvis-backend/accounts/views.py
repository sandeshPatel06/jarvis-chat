from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from .serializers import RegisterSerializer, UserSerializer
from django.contrib.auth import get_user_model
from chat.models import Message
from chat.serializers import MessageSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class CustomLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })

from rest_framework.views import APIView
from rest_framework import status

class CheckContactsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        phone_numbers = request.data.get('phone_numbers', [])
        
        # Normalize phone numbers: remove non-numeric chars and keep last 10 digits
        from utils.formatting import normalize_phone
        
        # Normalize incoming phone numbers
        normalized_phones = [normalize_phone(p) for p in phone_numbers if p]
        
        # Get all users and filter by normalized phone numbers
        all_users = User.objects.exclude(phone_number__isnull=True).exclude(phone_number='')
        matched_users = []
        
        for user in all_users:
            user_phone_normalized = normalize_phone(user.phone_number)
            if user_phone_normalized in normalized_phones:
                matched_users.append(user)
        
        serializer = UserSerializer(matched_users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def delete(self, request, *args, **kwargs):
        user = self.get_object()
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

from .models import BlockedUser

class PublicUserProfileView(generics.RetrieveAPIView):
    """
    Retrieve public profile information for a specific user by ID.
    Respects privacy settings for profile photo visibility.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.all()
    lookup_field = 'pk'

    def retrieve(self, request, *args, **kwargs):
        try:
            user = self.get_object()
            serializer = self.get_serializer(user)
            data = serializer.data
            
            # Respect privacy settings for profile photo
            if user.privacy_profile_photo == 'nobody':
                data['profile_picture'] = None
            elif user.privacy_profile_photo == 'contacts':
                # For now, show to all authenticated users
                # In future, check if requester is in user's contacts
                pass
            
            # Check if viewer blocked this user or is blocked by them (optional UI hint)
            # For now, just return raw profile
            
            return Response(data)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class BlockUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """List blocked users"""
        blocked_users = BlockedUser.objects.filter(blocker=request.user)
        # Return list of blocked user IDs
        blocked_ids = blocked_users.values_list('blocked_id', flat=True)
        return Response(blocked_ids)

    def post(self, request):
        """Block a user"""
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user_to_block = User.objects.get(id=user_id)
            if user_to_block == request.user:
                 return Response({"error": "Cannot block yourself"}, status=status.HTTP_400_BAD_REQUEST)

            BlockedUser.objects.get_or_create(blocker=request.user, blocked=user_to_block)
            return Response({"status": "blocked"}, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request):
        """Unblock a user"""
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user_to_unblock = User.objects.get(id=user_id)
            deleted_count, _ = BlockedUser.objects.filter(blocker=request.user, blocked=user_to_unblock).delete()
            
            if deleted_count > 0:
                # Release pending messages
                # Find undelivered messages from this user to me
                # usage of distinct() might be needed if multiple conversations, but usually just one 1-on-1
                pending_messages = Message.objects.filter(
                    sender=user_to_unblock,
                    conversation__participants=request.user,
                    is_delivered=False
                ).distinct()
                
                # We can either push them via WS or just let the user fetch them. 
                # Pushing is better for "live" feel.
                
                channel_layer = get_channel_layer()
                
                for message in pending_messages:
                    # Determine conversation link?
                    # We just need to send it to the current user (the blocker who is unblocking)
                   
                    data = MessageSerializer(message).data
                    async_to_sync(channel_layer.group_send)(
                        f"user_{request.user.id}",
                        {
                            'type': 'chat_message',
                            'message': data
                        }
                    )
            
            return Response({"status": "unblocked"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
             return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
