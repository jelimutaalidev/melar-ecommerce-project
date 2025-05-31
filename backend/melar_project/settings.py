"""
Django settings for melar_project project.
"""

from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-cp_aw9zwun$b#1&#8wsr3(@d%_6+=78jthyyi_&=l5q9%o&!c3')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = []
# if not DEBUG:
#     ALLOWED_HOSTS = ['www.yourdomain.com', 'api.yourdomain.com']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework.authtoken',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'corsheaders', # Tambahkan ini'

    'melar_api.apps.MelarApiConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # Tambahkan ini di atas
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'melar_project.urls'

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

WSGI_APPLICATION = 'melar_project.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Jakarta'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ) + (('rest_framework.renderers.BrowsableAPIRenderer',) if DEBUG else ()),
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser' # Pastikan ini ada
    ],
}

REST_AUTH = {
    'REGISTER_SERIALIZER': 'melar_api.serializers.CustomRegisterSerializer',
    'USER_DETAILS_SERIALIZER': 'melar_api.serializers.UserSerializer',
    'SESSION_LOGIN': False,
    'USE_JWT': False,
}

SITE_ID = 1

AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
)

# --- Pengaturan django-allauth yang Diperbarui ---

# HAPUS SEMUA PENGATURAN ACCOUNT_* YANG USANG (boolean atau string tunggal untuk metode auth)
# Seperti: ACCOUNT_AUTHENTICATION_METHOD, ACCOUNT_EMAIL_REQUIRED, ACCOUNT_USERNAME_REQUIRED,
# dan terutama ACCOUNT_SIGNUP_PASSWORD_ENTER_TWICE (boolean)

# Metode login yang diizinkan.
ACCOUNT_LOGIN_METHODS = ['email', 'username']

# Menentukan field mana di model User yang akan digunakan sebagai username dan email oleh allauth.
ACCOUNT_USER_MODEL_USERNAME_FIELD = 'username'
ACCOUNT_USER_MODEL_EMAIL_FIELD = 'email'

# Konfigurasi bagaimana email dan username ditangani (menggantikan boolean *_REQUIRED)
ACCOUNT_EMAIL_HANDLING = 'mandatory' # Email wajib
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USERNAME_HANDLING = 'mandatory' # Username wajib
ACCOUNT_USERNAME_MIN_LENGTH = 3

# Verifikasi email
ACCOUNT_EMAIL_VERIFICATION = 'none' # Ubah ke 'mandatory' di produksi.

# Apakah konfirmasi password diperlukan saat sign up (password2)
# Pengaturan boolean ACCOUNT_SIGNUP_PASSWORD_ENTER_TWICE sudah usang.
# Ini sekarang dikelola oleh form/serializer. dj_rest_auth's RegisterSerializer
# dan allauth's SignupForm secara default akan meminta konfirmasi password.
# Jadi, kita tidak perlu lagi setting boolean usang tersebut.

# Pengaturan lain yang direkomendasikan (tidak usang)
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = False
ACCOUNT_LOGOUT_ON_GET = False
ACCOUNT_LOGIN_ON_PASSWORD_RESET = False
ACCOUNT_LOGOUT_REDIRECT_URL = '/'
ACCOUNT_PRESERVE_USERNAME_CASING = False
ACCOUNT_SESSION_REMEMBER = True

# ACCOUNT_SIGNUP_FIELDS: Ini adalah cara allauth (terutama untuk form HTML-nya)
# untuk mengetahui field mana yang harus disertakan dan bagaimana.
# Untuk API, CustomRegisterSerializer Anda yang utama.
# Peringatan menyarankan format ini untuk menggantikan boolean lama.
ACCOUNT_SIGNUP_FIELDS = {
    # Kunci adalah nama field seperti yang dikenali allauth atau nama field di User model.
    # Value adalah 'mandatory', 'optional', atau 'none'.
    # 'password' dan 'password2' (konfirmasi) biasanya tidak didefinisikan di sini
    # karena sudah dihandle oleh form/serializer berdasarkan kebutuhan konfirmasi password.
    'username': 'mandatory', # Sesuai dengan ACCOUNT_USERNAME_HANDLING
    'email': 'mandatory',    # Sesuai dengan ACCOUNT_EMAIL_HANDLING
}
# Jika ACCOUNT_USERNAME_HANDLING Anda set ke 'none' atau 'optional', sesuaikan di atas.

ACCOUNT_FORMS = {
    'signup': 'allauth.account.forms.SignupForm', # Default
}

if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    # ... (konfigurasi SMTP Anda) ...
    
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173", # Ganti dengan port frontend Anda jika berbeda
    "http://127.0.0.1:5173",
]
# Jika Anda ingin mengizinkan semua origin (tidak disarankan untuk produksi):
# CORS_ALLOW_ALL_ORIGINS = True

# Untuk mengizinkan pengiriman kredensial (seperti cookies atau header Authorization)
CORS_ALLOW_CREDENTIALS = True

# Anda mungkin juga perlu mengatur header yang diizinkan jika frontend mengirim header kustom
# CORS_ALLOW_HEADERS = list(default_headers) + ['my-custom-header']