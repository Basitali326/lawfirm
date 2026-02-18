# Chat + Notifications Module

## Run locally
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DJANGO_SETTINGS_MODULE=config.settings.local
export DATABASE_URL=sqlite:///db.sqlite3
export REDIS_URL=redis://127.0.0.1:6379/0
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Celery worker (notifications/email stubs)
```bash
celery -A config worker -l info
```

### Channels / WebSocket
ASGI entrypoint: `config.asgi:application`  
WS endpoint: `ws://<host>/ws/chat/?token=<access-token>`

## API summary (all responses follow envelope)
- `GET /api/v1/chat/rooms/` list rooms for current user.
- `POST /api/v1/chat/rooms/` create group room.
- `GET /api/v1/chat/rooms/<id>/messages/` list messages (paginated).
- `POST /api/v1/chat/rooms/<id>/messages/` send message.
- `POST /api/v1/chat/rooms/<id>/messages/read/` mark read.
- `POST /api/v1/chat/messages/<id>/attachments/` upload attachment.
- `GET /api/v1/notifications/` list notifications.
- `POST /api/v1/notifications/<id>/read/` mark read.

## WebSocket events
Client → Server:
- `room.join {room_id}`
- `message.send {room_id, body, client_msg_id}`
- `typing.start / typing.stop {room_id}`
- `room.read {room_id, last_message_id}`

Server → Client:
- `room.joined`
- `message.new {message}`
- `typing {room_id, user_id, is_typing}`
- `receipt.updated {room_id, user_id, status, last_message_id}`
- `notification.new {notification}`
- `error {code, message}`

