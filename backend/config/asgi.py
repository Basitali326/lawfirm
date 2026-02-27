import os

# Prefer local settings when running dev servers (Daphne/UVicorn)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator, OriginValidator
from django.conf import settings
from django.core.asgi import get_asgi_application

dj_app = get_asgi_application()

# Import websocket modules only after Django app registry is ready.
from apps.wsx.auth import TokenAuthMiddleware
from apps.wsx import routing as ws_routing

ws_app = TokenAuthMiddleware(URLRouter(ws_routing.websocket_urlpatterns))
if getattr(settings, "WEBSOCKET_ALLOWED_ORIGINS", None):
    ws_app = OriginValidator(ws_app, settings.WEBSOCKET_ALLOWED_ORIGINS)
ws_app = AllowedHostsOriginValidator(ws_app)

application = ProtocolTypeRouter(
    {
        "http": dj_app,
        # WebSocket auth via JWT token only (query param); no session/cookie stack
        "websocket": ws_app,
    }
)
