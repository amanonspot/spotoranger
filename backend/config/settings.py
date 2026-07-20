from pathlib import Path
import os

from dotenv import load_dotenv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent

# Load env from repo root `.env`, then backend `.env` (later wins).
load_dotenv(REPO_ROOT / ".env")
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "false").lower() == "true"
ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "apps.core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

_database_url = os.getenv("DATABASE_URL", "").strip()
if not _database_url:
    raise RuntimeError(
        "DATABASE_URL is required. Use PostgreSQL, e.g. "
        "postgresql://USER:PASSWORD@127.0.0.1:5432/spoto_ranger"
    )
if _database_url.startswith("sqlite"):
    raise RuntimeError(
        "SQLite is not supported. Set DATABASE_URL to a PostgreSQL connection string."
    )

DATABASES = {
    "default": dj_database_url.parse(_database_url, conn_max_age=600),
}

AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
X_FRAME_OPTIONS = "DENY"

if ENVIRONMENT == "production":
    if SECRET_KEY in {"change-me", "local-dev-secret", "change-me-to-a-long-random-secret"}:
        raise RuntimeError("Set a strong DJANGO_SECRET_KEY before running in production.")
    SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "false").lower() == "true"
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"

# OTP / SMS (2Factor + DLT) — ported from Spoto main backend
SMS_API_KEY = os.getenv("SMS_API_KEY", "")
DLT_SENDER_ID = os.getenv("DLT_SENDER_ID", "")
DLT_TEMPLATE_ID = os.getenv("DLT_TEMPLATE_ID", "")
DLT_PE_ID = os.getenv("DLT_PE_ID", "")
DEFAULT_LOGIN_PHONE_NUMBER = os.getenv("DEFAULT_LOGIN_PHONE_NUMBER", "")
DEFAULT_OTP = os.getenv("DEFAULT_OTP") or os.getenv("OTP_DEV_CODE", "")
OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))
MIN_WITHDRAWAL_AMOUNT = int(os.getenv("MIN_WITHDRAWAL_AMOUNT", "100"))
