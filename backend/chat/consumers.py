import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

from .models import Chat, Message

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.chat_id = self.scope['url_route']['kwargs']['chat_id']
        self.room_group_name = f'chat_{self.chat_id}'
        user = self.scope['user']

        if not user.is_authenticated:
            await self.close()
            return

        chat = await self.get_chat()
        if chat is None:
            await self.close()
            return

        is_participant = await self.user_in_chat(user.id)
        if not is_participant:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if text_data is None:
            return
        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(json.dumps({'error': 'Invalid JSON payload'}))
            return

        message_text = payload.get('message')
        if not message_text:
            await self.send(json.dumps({'error': 'Message content required'}))
            return

        user = self.scope['user']
        message = await self.save_message(user.id, message_text)
        event = {
            'type': 'chat_message',
            'message_id': message['id'],
            'username': message['username'],
            'message': message['content'],
            'timestamp': message['timestamp'],
        }
        await self.channel_layer.group_send(self.room_group_name, event)

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'id': event['message_id'],
            'username': event['username'],
            'message': event['message'],
            'timestamp': event['timestamp'],
        }))

    @database_sync_to_async
    def get_chat(self):
        try:
            return Chat.objects.get(id=self.chat_id)
        except Chat.DoesNotExist:
            return None

    @database_sync_to_async
    def user_in_chat(self, user_id: int) -> bool:
        return Chat.objects.filter(id=self.chat_id, participants__id=user_id).exists()

    @database_sync_to_async
    def save_message(self, user_id: int, content: str):
        try:
            chat = Chat.objects.get(id=self.chat_id)
            user = User.objects.get(id=user_id)
        except ObjectDoesNotExist:
            raise
        message = Message.objects.create(chat=chat, sender=user, content=content)
        return {
            'id': message.id,
            'username': user.username,
            'content': message.content,
            'timestamp': message.timestamp.isoformat(),
        }