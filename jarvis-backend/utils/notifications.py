import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings
import os

# Initialize Firebase Admin
if not firebase_admin._apps:
    try:
        cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            # Try to find a serviceAccountKey.json in the project root or similar
            # Or assume default credential loading if env var is set
            firebase_admin.initialize_app()
    except Exception as e:
        print(f"Warning: Failed to initialize Firebase Admin: {e}")

def send_fcm_notification(user, title, body, data=None):
    """
    Send an FCM notification to a specific user.
    """
    if not user.fcm_token:
        return False
    
    if not user.notifications_enabled:
        return False

    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=user.fcm_token,
        )
        response = messaging.send(message)
        return True
    except Exception as e:
        print(f"Error sending FCM notification to {user.username}: {e}")
        return False
