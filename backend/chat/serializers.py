from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Chat, Message, Profile

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Profile
        fields = ['id', 'username', 'nickname', 'avatar', 'status']
        read_only_fields = ['id', 'username']


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'profile']
        read_only_fields = ['id', 'username', 'profile']


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'chat', 'sender', 'content', 'timestamp']
        read_only_fields = ['id', 'sender', 'timestamp']


class ChatSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = ['id', 'name', 'is_group', 'participants', 'last_message', 'created_at']
        read_only_fields = ['id', 'participants', 'last_message', 'created_at']

    def get_last_message(self, obj):
        message = obj.messages.order_by('-timestamp').first()
        if message:
            return MessageSerializer(message).data
        return None


class ChatCreateSerializer(serializers.ModelSerializer):
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        help_text='List of user IDs to include in the chat',
    )

    class Meta:
        model = Chat
        fields = ['id', 'name', 'is_group', 'participant_ids']
        read_only_fields = ['id']

    def validate_participant_ids(self, value):
        unique_ids = list(dict.fromkeys(value))
        if not unique_ids:
            raise serializers.ValidationError('Provide at least one participant user ID.')
        return unique_ids

    def create(self, validated_data):
        participant_ids = validated_data.pop('participant_ids', [])
        request_user = self.context['request'].user
        participants = list(User.objects.filter(id__in=participant_ids))
        missing_ids = set(participant_ids) - {user.id for user in participants}
        if missing_ids:
            raise serializers.ValidationError({'participant_ids': f'Unknown user ids: {sorted(missing_ids)}'})
        if request_user not in participants:
            participants.append(request_user)
        chat = Chat.objects.create(**validated_data)
        chat.participants.add(*participants)
        return chat

    def update(self, instance, validated_data):
        participant_ids = validated_data.pop('participant_ids', None)
        instance = super().update(instance, validated_data)
        if participant_ids is not None:
            participants = list(User.objects.filter(id__in=participant_ids))
            missing_ids = set(participant_ids) - {user.id for user in participants}
            if missing_ids:
                raise serializers.ValidationError({'participant_ids': f'Unknown user ids: {sorted(missing_ids)}'})
            instance.participants.set(participants)
            instance.participants.add(self.context['request'].user)
        return instance
