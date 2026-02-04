from typing import Optional, Tuple

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Firm, UserProfile

User = get_user_model()


def _get_profile(user: User) -> UserProfile:
    profile, _ = UserProfile.objects.get_or_create(user=user, defaults={'email_verified': False})
    return profile


def build_tokens(user: User) -> Tuple[str, str]:
    """Return (access, refresh) pair for user."""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


def build_auth_body(user: User, access_token: str, firm: Optional[Firm] = None) -> dict:
    firm = firm or Firm.objects.filter(owner=user).first()
    profile = _get_profile(user)
    return {
        'user': {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': 'Owner',
            'email_verified': profile.email_verified,
        },
        'firm': {
            'id': firm.id,
            'name': firm.name,
            'slug': firm.slug,
        }
        if firm
        else None,
        'tokens': {
            'access': access_token,
        },
    }
