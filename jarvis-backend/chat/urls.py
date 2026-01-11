from django.urls import path
from .views import ConversationListView, MessageListView

urlpatterns = [
    path('conversations/', ConversationListView.as_view(), name='conversations'),
    path('messages/<int:conversation_id>/', MessageListView.as_view(), name='messages'),
]
