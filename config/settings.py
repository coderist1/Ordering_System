from pathlib import Path
import os
from urllib.parse import urlparse

import dj_database_url

try:
    from dotenv import load_dotenv  # type: ignore[import-not-found]
except Exception:
    load_dotenv = None



BASE_DIR = Path(__file__).resolve().parent.parent
if load_dotenv is not None:
    load_dotenv(BASE_DIR / '.env')


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def env_list(name: str, default: str = ''):
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(',') if item.strip()]

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-order-system-key-2024')  # Change this in production!
DEBUG = env_bool('DEBUG', True)
ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', 'localhost,127.0.0.1,.onrender.com')

if '*' not in ALLOWED_HOSTS:
    extra_hosts = []

    frontend_host = urlparse(os.getenv('FRONTEND_URL', '')).hostname
    if frontend_host:
        extra_hosts.append(frontend_host)

    render_url_host = urlparse(os.getenv('RENDER_EXTERNAL_URL', '')).hostname
    if render_url_host:
        extra_hosts.append(render_url_host)

    render_host = os.getenv('RENDER_EXTERNAL_HOSTNAME', '')
    if render_host:
        extra_hosts.append(render_host)

    for host in extra_hosts:
        if host and host not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(host)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'orders',
    'chatbot',
]

# Optionally include cloudinary apps when the package is installed in the environment
try:
    import cloudinary  # type: ignore
    INSTALLED_APPS.insert(6, 'cloudinary')
    INSTALLED_APPS.insert(7, 'cloudinary_storage')
except Exception:
    # Cloudinary not installed; skip those apps
    pass

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://ordering-system-6rn1.vercel.app')
# Default to local filesystem storage; if cloudinary is installed we'll override below
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME', ''),
    'API_KEY': os.getenv('CLOUDINARY_API_KEY', ''),
    'API_SECRET': os.getenv('CLOUDINARY_API_SECRET', ''),
}

# Try to use Cloudinary storage when available, otherwise fall back to local storage
try:
    from cloudinary_storage.storage import MediaCloudinaryStorage  # type: ignore[import-not-found]
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    storage = MediaCloudinaryStorage()
except Exception:
    # Cloudinary not installed or not configured in this environment; use local storage
    storage = None



MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
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
        'DIRS': [BASE_DIR / 'orders' / 'templates'],
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

DATABASES = {
    'default': dj_database_url.config(
        default=os.getenv('DATABASE_URL', f'sqlite:///{BASE_DIR / "db.sqlite3"}'),
        conn_max_age=int(os.getenv('DB_CONN_MAX_AGE', '600')),
    )
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static'] if (BASE_DIR / 'static').exists() else []

# Whitenoise serves static files efficiently in production deployments.
STATICFILES_STORAGE = os.getenv(
    'STATICFILES_STORAGE',
    'whitenoise.storage.CompressedManifestStaticFilesStorage' if not DEBUG else 'django.contrib.staticfiles.storage.StaticFilesStorage'
)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOW_ALL_ORIGINS = env_bool('CORS_ALLOW_ALL_ORIGINS', True)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173,https://ordering-system-6rn1.vercel.app')

CSRF_TRUSTED_ORIGINS = env_list(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173,https://ordering-system-6rn1.vercel.app',
)

for origin in (os.getenv('FRONTEND_URL', ''), os.getenv('RENDER_EXTERNAL_URL', '')):
    origin = origin.rstrip('/')
    if origin and origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(origin)

DJOSER = {
    'SEND_ACTIVATION_EMAIL': env_bool('SEND_ACTIVATION_EMAIL', True),
    'USER_CREATE_PASSWORD_RETYPE': True,
    'ACTIVATION_URL': 'activate/{uid}/{token}',
    'EMAIL_FRONTEND_DOMAIN': os.getenv('EMAIL_FRONTEND_DOMAIN', 'localhost:5173'),
    'EMAIL_FRONTEND_PROTOCOL': os.getenv('EMAIL_FRONTEND_PROTOCOL', 'http'),
    'EMAIL_FRONTEND_SITE_NAME': 'AMU Bowls',
    'SERIALIZERS': {
        'user_create': 'orders.serializers.DjoserUserCreateSerializer',
        'user_create_password_retype': 'orders.serializers.DjoserUserCreateSerializer',
        'user': 'orders.serializers.UserSerializer',
        'current_user': 'orders.serializers.UserSerializer',
    },
    'EMAIL': {'activation': 'orders.emails.CustomActivationEmail'},
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Order Processing Workflow API',
    'DESCRIPTION': 'API for managing orders with workflow state machine.',
    'VERSION': '1.0.0',
}

# ─────────────────────────────────────────────
#  EMAIL CONFIGURATION
# ─────────────────────────────────────────────

EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp-relay.brevo.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', True)
EMAIL_USE_SSL = env_bool('EMAIL_USE_SSL', False)
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'Ordering System <mathewpolinar5@gmail.com>')

# ─────────────────────────────────────────────
#  FRONTEND URL (for activation links)
# ─────────────────────────────────────────────

FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://ordering-system-6rn1.vercel.app')  # Live Vercel server

# ─────────────────────────────────────────────
#  ACTIVATION TOKEN TIMEOUT (seconds)
# ─────────────────────────────────────────────

ACTIVATION_TOKEN_EXPIRE_HOURS = 24

# Backend URL used for activation fallback links (change if your API runs on a different host/port)
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')


if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', False)
    SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', True)
    CSRF_COOKIE_SECURE = env_bool('CSRF_COOKIE_SECURE', True)
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'