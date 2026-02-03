from .base import *  # noqa

DEBUG = env.bool('DEBUG', default=True)

if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['*']

if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]

if not CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]
