from typing import Optional

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Firm

User = get_user_model()


def build_auth_response(user: User) -> dict:
    firm: Optional[Firm] = Firm.objects.filter(owner=user).first()
    refresh = RefreshToken.for_user(user)
    return {
        'user': {
            'id': user.id,
            'email': user.email,
        },
        'firm': {
            'id': firm.id,
            'name': firm.name,
            'slug': firm.slug,
        }
        if firm
        else None,
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        },
    }
