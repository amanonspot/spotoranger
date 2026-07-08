import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import auth, health, notifications, properties, ranger, training, wallet

app = FastAPI(
    title="Spoto Ranger API",
    version="0.1.0",
    description="REST APIs for the Spoto Ranger Platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(properties.router, prefix="/properties", tags=["properties"])
app.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
app.include_router(training.router, prefix="/training", tags=["training"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
app.include_router(ranger.router, prefix="/ranger", tags=["ranger"])

