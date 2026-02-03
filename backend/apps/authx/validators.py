import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def validate_strong_password(password: str):
    """Enforce strong password rules with clear errors."""
    if len(password) < 12:
        raise ValidationError(_('Password must be at least 12 characters long.'))
    if not re.search(r'[A-Z]', password):
        raise ValidationError(_('Password must include at least one uppercase letter.'))
    if not re.search(r'[a-z]', password):
        raise ValidationError(_('Password must include at least one lowercase letter.'))
    if not re.search(r'\d', password):
        raise ValidationError(_('Password must include at least one digit.'))
    if not re.search(r'[^A-Za-z0-9]', password):
        raise ValidationError(_('Password must include at least one special character.'))
