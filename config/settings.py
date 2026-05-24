from pathlib import Path
import os

try:
    from dotenv import load_dotenv
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
ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', '*')

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
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
# Default to local filesystem storage; if cloudinary is installed we'll override below
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME', ''),
    'API_KEY': os.getenv('CLOUDINARY_API_KEY', ''),
    'API_SECRET': os.getenv('CLOUDINARY_API_SECRET', ''),
}

# Try to use Cloudinary storage when available, otherwise fall back to local storage
try:
    from cloudinary_storage.storage import MediaCloudinaryStorage
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
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.getenv('DB_NAME', str(BASE_DIR / 'db.sqlite3')),
        'USER': os.getenv('DB_USER', ''),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', ''),
        'PORT': os.getenv('DB_PORT', ''),
    }
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
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')

# Include FRONTEND_URL (and any EXTRA_CORS_ORIGINS) in allowed origins when
# wildcard CORS is not enabled. This helps deployments (Vercel/Render) where
# the frontend origin is provided via `FRONTEND_URL` or via env vars.
if not CORS_ALLOW_ALL_ORIGINS:
    try:
        frontend_origin = FRONTEND_URL.rstrip('/')
    except Exception:
        frontend_origin = ''

    if frontend_origin and frontend_origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(frontend_origin)

    # Optional: allow adding more origins via EXTRA_CORS_ORIGINS env var
    extra_origins = env_list('EXTRA_CORS_ORIGINS', '')
    for origin in extra_origins:
        if origin and origin not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(origin)

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
#  EMAIL CONFIGURATION (Gmail SMTP)
# ─────────────────────────────────────────────

# Control email backend via environment variable
# USE_CONSOLE_EMAIL=True  -> prints to console (development, no SMTP needed)
# USE_CONSOLE_EMAIL=False -> sends real emails via Gmail SMTP (production/testing)
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', True)
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

# ⚠️  IMPORTANT FOR GMAIL - FOLLOW THESE STEPS:
# 1. Enable 2-Factor Authentication on your Google Account: https://myaccount.google.com/security
# 2. Generate an App Password: https://myaccount.google.com/apppasswords
#    - Select "Mail" and "Windows Computer" (or your platform)
#    - Google will generate a 16-character password
# 3. Copy that password to your .env file:
#    EMAIL_HOST_USER=your-email@gmail.com
#    EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx  (the 16-char password from Google)
# 4. Set USE_CONSOLE_EMAIL=False in .env to use real SMTP
# 5. Test with: python manage.py shell
#    >>> from django.core.mail import send_mail
#    >>> send_mail('Test', 'Test message', 'from@gmail.com', ['to@gmail.com'], fail_silently=False)

# ─────────────────────────────────────────────
#  FRONTEND URL (for activation links)
# ─────────────────────────────────────────────

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')  # Vite dev server

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