from django.urls import path
from .views import RegisterView, CustomLoginView, CheckContactsView, UserProfileView

urlpatterns = [
    path('signup/', RegisterView.as_view(), name='signup'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('check-contacts/', CheckContactsView.as_view(), name='check-contacts'),
    path('profile/', UserProfileView.as_view(), name='profile'),
]
