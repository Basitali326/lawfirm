import jwt
from django.conf import settings
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_str):
    jwt_auth = JWTAuthentication()
    try:
        validated = jwt_auth.get_validated_token(token_str)
        user = jwt_auth.get_user(validated)
        return user
    except Exception:
        return None


class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = None
        if query_string:
            for part in query_string.split("&"):
                if part.startswith("token="):
                    token = part.split("=", 1)[1]
                    break
        if not token:
            return await super().__call__(scope, receive, send)
        user = await get_user_from_token(token)
        scope["user"] = user
        return await super().__call__(scope, receive, send)

