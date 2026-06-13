import os
from datetime import timedelta
from pathlib import Path

import environ
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DJANGO_SECRET_KEY=(str, 'change-me'),
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    DATABASE_URL=(str, 'postgresql://'),
    DATABASE_CONNECT_TIMEOUT=(int, 5),
    DB_DEBUG_ON_STARTUP=(bool, True),
    REDIS_URL=(str, 'redis://127.0.0.1:6379/0'),
    CORS_ALLOWED_ORIGINS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
    JWT_ACCESS_MINUTES=(int, 15),
    JWT_REFRESH_DAYS=(int, 7),
    EMAIL_BACKEND=(str, 'django.core.mail.backends.console.EmailBackend'),
    DEFAULT_FROM_EMAIL=(str, 'Legal SaaS <no-reply@localhost>'),
    EMAIL_HOST=(str, ''),
    EMAIL_PORT=(int, 587),
    EMAIL_HOST_USER=(str, ''),
    EMAIL_HOST_PASSWORD=(str, ''),
    EMAIL_USE_TLS=(bool, True),
    FRONTEND_URL=(str, 'http://localhost:3000'),
    STRIPE_PUBLIC_KEY=(str, ''),
    STRIPE_SECRET_KEY=(str, ''),
    STRIPE_WEBHOOK_SECRET=(str, ''),
    STRIPE_API_VERSION=(str, '2026-02-25.clover'),
    OTP_EMAIL_ENABLED=(bool, False),
    INVITE_EXPIRE_HOURS=(int, 24),
    DEFAULT_USER_PASSWORD=(str, 'Welcome@12345'),
    WEBSOCKET_ALLOWED_ORIGINS=(list, []),
    STORAGE_BACKEND=(str, 'local'),
    DOCUMENT_MAX_SIZE_MB=(int, 5),
    DOCUMENT_ALLOWED_EXTENSIONS=(list, ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'ppt', 'pptx']),
    ECOMMERCE_MAX_IMAGE_SIZE_MB=(int, 5),
    ECOMMERCE_ALLOWED_IMAGE_EXTENSIONS=(list, ['png', 'jpg', 'jpeg', 'webp']),
)

environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('DJANGO_SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')

DATABASES = {
    'default': env.db(),
}

if DATABASES['default'].get('ENGINE') == 'django.db.backends.postgresql':
    DATABASES['default'].setdefault('OPTIONS', {})
    DATABASES['default']['OPTIONS'].setdefault(
        'connect_timeout',
        env('DATABASE_CONNECT_TIMEOUT'),
    )

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'django_filters',
    'corsheaders',
    'drf_spectacular',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'core',
    # realtime + notifications
    'channels',
    'apps.notifx',
    'apps.wsx',
    'apps.authx',
    'apps.firms',
    'apps.cases',
    'apps.usersx',
    'apps.casetypes',
    'apps.task_templates',
    'apps.tasks',
    'apps.audit',
    'apps.intake',
    'apps.rbac',
    'apps.billing',
    'apps.hearings',
    'apps.dashboard',
    'apps.documents',
    'apps.ecommerce',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = env('STATIC_ROOT', default=BASE_DIR / 'staticfiles')
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'common.exception_handler.custom_exception_handler',
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_THROTTLE_RATES': {
        'intake_public_minute': '5/min',
        'intake_public_hour': '30/hour',
        'intake_phone_email_hour': '3/hour',
    },
    'DEFAULT_PAGINATION_CLASS': 'common.pagination.DefaultPageNumberPagination',
    'PAGE_SIZE': 20,
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'AuthX API',
    'DESCRIPTION': 'Authentication and firm onboarding API',
    'VERSION': '1.0.0',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=env('JWT_ACCESS_MINUTES')),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=env('JWT_REFRESH_DAYS')),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'REFRESH_COOKIE_NAME': 'refresh_token',
    'REFRESH_COOKIE_PATH': '/',
    # Leave domain empty to let the browser scope it to the current host (works for 127.0.0.1 and localhost)
    'REFRESH_COOKIE_DOMAIN': os.environ.get('REFRESH_COOKIE_DOMAIN', ''),
    'REFRESH_COOKIE_SECURE': False,
    'REFRESH_COOKIE_SAMESITE': 'Lax',
}

EMAIL_BACKEND = env('EMAIL_BACKEND')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL')
FRONTEND_URL = env('FRONTEND_URL')
STRIPE_PUBLIC_KEY = env('STRIPE_PUBLIC_KEY')
STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET')
STRIPE_API_VERSION = env('STRIPE_API_VERSION')
OTP_EMAIL_ENABLED = env('OTP_EMAIL_ENABLED')
INVITE_EXPIRE_HOURS = env('INVITE_EXPIRE_HOURS')
DEFAULT_USER_PASSWORD = env('DEFAULT_USER_PASSWORD')
ECOMMERCE_MAX_IMAGE_SIZE_MB = env('ECOMMERCE_MAX_IMAGE_SIZE_MB')
ECOMMERCE_ALLOWED_IMAGE_EXTENSIONS = env('ECOMMERCE_ALLOWED_IMAGE_EXTENSIONS')

RECAPTCHA_ENABLED = env.bool('RECAPTCHA_ENABLED', default=False)
RECAPTCHA_SECRET_KEY = env('RECAPTCHA_SECRET_KEY', default='')
RECAPTCHA_VERSION = env('RECAPTCHA_VERSION', default='v3')
RECAPTCHA_V3_MIN_SCORE = env.float('RECAPTCHA_V3_MIN_SCORE', default=0.5)
RECAPTCHA_V3_EXPECTED_ACTION = env('RECAPTCHA_V3_EXPECTED_ACTION', default='intake_submit')

if EMAIL_BACKEND != 'django.core.mail.backends.console.EmailBackend':
    EMAIL_HOST = env('EMAIL_HOST')
    EMAIL_PORT = env('EMAIL_PORT')
    EMAIL_HOST_USER = env('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD')
    EMAIL_USE_TLS = env('EMAIL_USE_TLS')

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = env('CORS_ALLOWED_ORIGINS') or [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://72.60.211.107:3000",
]
CSRF_TRUSTED_ORIGINS = env('CSRF_TRUSTED_ORIGINS') or [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://72.60.211.107:3000",
]
CORS_ALLOW_HEADERS = list(default_headers) + ["x-device-id", "x-firm-id"]
# Simplify local dev: allow all when DEBUG
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

AUTHENTICATION_BACKENDS = [
    'apps.authx.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# Channels / Redis
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [env('REDIS_URL', default='redis://127.0.0.1:6379/0')],
        },
    },
}

# Celery
CELERY_BROKER_URL = env('REDIS_URL', default='redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_TASK_ALWAYS_EAGER = env.bool('CELERY_TASK_ALWAYS_EAGER', default=False)

# File storage (local default; S3 via django-storages if configured)
STORAGE_BACKEND = env('STORAGE_BACKEND', default='local')
DEFAULT_FILE_STORAGE = env('DEFAULT_FILE_STORAGE', default='django.core.files.storage.FileSystemStorage')
if STORAGE_BACKEND == 's3':
    DEFAULT_FILE_STORAGE = env(
        'DEFAULT_FILE_STORAGE',
        default='storages.backends.s3boto3.S3Boto3Storage',
    )
MEDIA_ROOT = env('MEDIA_ROOT', default=BASE_DIR / 'media')
MEDIA_URL = '/media/'
DOCUMENT_MAX_SIZE_MB = env('DOCUMENT_MAX_SIZE_MB', default=5)
DOCUMENT_MAX_SIZE_BYTES = DOCUMENT_MAX_SIZE_MB * 1024 * 1024
DOCUMENT_ALLOWED_EXTENSIONS = [e.lower() for e in env('DOCUMENT_ALLOWED_EXTENSIONS', default=['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'ppt', 'pptx'])]
DOCUMENT_ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]
