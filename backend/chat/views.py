from django.contrib.auth import authenticate, get_user_model, login, logout
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Chat, Message, Profile
from .serializers import (
    ChatCreateSerializer,
    ChatSerializer,
    MessageSerializer,
    ProfileSerializer,
)

User = get_user_model()


class ProfileViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    queryset = Profile.objects.select_related('user')
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj = super().get_object()
        if obj.user != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied('You can only access your own profile unless you are staff.')
        return obj

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile.user != request.user and not request.user.is_staff:
            raise PermissionDenied('You can only edit your own profile.')
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(profile, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        profile = request.user.profile
        if request.method.lower() == 'patch':
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)


class ChatViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Chat.objects.filter(participants=self.request.user).prefetch_related('participants', 'participants__profile').order_by('-created_at')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ChatCreateSerializer
        return ChatSerializer

    def perform_create(self, serializer):
        chat = serializer.save()
        if not chat.participants.filter(id=self.request.user.id).exists():
            chat.participants.add(self.request.user)

    def perform_update(self, serializer):
        chat = serializer.instance
        if not chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied('You must be a participant of the chat to modify it.')
        serializer.save()

    @action(detail=False, methods=['post'], url_path='start')
    def start(self, request):
        username = request.data.get('username')
        if not username:
            return Response({'detail': 'Username is required.'}, status=status.HTTP_400_BAD_REQUEST)
        username = username.strip()
        if username.lower() == request.user.username.lower():
            return Response({'detail': 'You cannot start a chat with yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        chat = (
            Chat.objects.filter(is_group=False, participants=request.user)
            .filter(participants=target_user)
            .first()
        )
        created = False
        if chat is None:
            chat = Chat.objects.create(is_group=False)
            chat.participants.add(request.user, target_user)
            created = True

        chat = Chat.objects.prefetch_related('participants', 'participants__profile').get(id=chat.id)
        serializer = ChatSerializer(chat, context={'request': request})
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)


class MessageViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        chat_id = self.request.query_params.get('chat')
        if not chat_id:
            raise ValidationError('Query parameter "chat" is required.')
        chat = get_object_or_404(Chat, id=chat_id, participants=self.request.user)
        return chat.messages.select_related('sender').order_by('timestamp')

    def perform_create(self, serializer):
        chat_id = self.request.data.get('chat')
        if not chat_id:
            raise ValidationError({'chat': 'This field is required.'})
        chat = get_object_or_404(Chat, id=chat_id)
        if not chat.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied('You must be part of the chat to send messages.')
        serializer.save(chat=chat, sender=self.request.user)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({'detail': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_400_BAD_REQUEST)
    login(request, user)
    serializer = ProfileSerializer(user.profile)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({'detail': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username=username).exists():
        return Response({'detail': 'Username already taken.'}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.create_user(username=username, password=password)
    serializer = ProfileSerializer(user.profile)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def session_view(request):
    if request.user.is_authenticated:
        serializer = ProfileSerializer(request.user.profile)
        return Response(serializer.data)
    return Response({'detail': 'Authentication credentials were not provided.'}, status=status.HTTP_401_UNAUTHORIZED)


