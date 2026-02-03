from .base import *  # noqa

DEBUG = env.bool('DEBUG', default=False)

# Example security settings (uncomment when behind HTTPS)
# SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
# SECURE_SSL_REDIRECT = True
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True

ALLOWED_HOSTS = env('ALLOWED_HOSTS') or []
