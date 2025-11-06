"""Shared utilities and services"""

from backend.shared.config import (
    Config,
    ConfigurationError,
    config,
    GOOGLE_API_KEY,
    PROJECT_ID,
    FIRESTORE_DB,
    ENVIRONMENT,
    API_HOST,
    API_PORT,
    CORS_ORIGINS,
)
from backend.shared.firestore_manager import FirestoreManager
from backend.shared.session_service import FirestoreSessionService

__all__ = [
    "Config",
    "ConfigurationError",
    "config",
    "GOOGLE_API_KEY",
    "PROJECT_ID",
    "FIRESTORE_DB",
    "ENVIRONMENT",
    "API_HOST",
    "API_PORT",
    "CORS_ORIGINS",
    "FirestoreManager",
    "FirestoreSessionService",
]
