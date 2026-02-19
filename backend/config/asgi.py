import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
from apps.wsx.auth import TokenAuthMiddleware
from apps.wsx import routing as ws_routing

dj_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": dj_app,
        "websocket": TokenAuthMiddleware(
            AuthMiddlewareStack(
                URLRouter(
                    ws_routing.websocket_urlpatterns
                )
            )
        ),
    }
)
