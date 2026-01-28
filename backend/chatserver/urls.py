from django.contrib import admin
from django.urls import include, path
from rest_framework import routers
from chat import views
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views

router = routers.DefaultRouter()
router.register(r'users', views.UserSearchViewSet, basename='user')
router.register(r'chats', views.ChatViewSet, basename='chat')
router.register(r'messages', views.MessageViewSet, basename='message')
router.register(r'profiles', views.ProfileViewSet, basename='profile')

urlpatterns = [
    path('', views.index, name='home'),
    path('admin/', admin.site.urls),
    path('api/auth/login/', views.login_view, name='api-login'),
    path('api/auth/logout/', views.logout_view, name='api-logout'),
    path('api/auth/register/', views.register_view, name='api-register'),
    path('api/auth/session/', views.session_view, name='api-session'),
    path('api/', include(router.urls)),
    path('api/auth/', include('rest_framework.urls')),
    # Authentication views (login/logout) using built-in class-based views
    path('accounts/login/', auth_views.LoginView.as_view(), name='login'),
    path('accounts/logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('accounts/register/', views.register_user, name='register'),
    path('send-email/', views.send_email_view, name='send-email'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

