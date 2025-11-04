from django.contrib import admin
from django.urls import include, path
from rest_framework import routers
from chat import views
from django.conf import settings
from django.conf.urls.static import static

router = routers.DefaultRouter()
router.register(r'users', views.UserSearchViewSet, basename='user')
router.register(r'chats', views.ChatViewSet, basename='chat')
router.register(r'messages', views.MessageViewSet, basename='message')
router.register(r'profiles', views.ProfileViewSet, basename='profile')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', views.login_view, name='api-login'),
    path('api/auth/logout/', views.logout_view, name='api-logout'),
    path('api/auth/register/', views.register_view, name='api-register'),
    path('api/auth/session/', views.session_view, name='api-session'),
    path('api/', include(router.urls)),
    path('api/auth/', include('rest_framework.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

