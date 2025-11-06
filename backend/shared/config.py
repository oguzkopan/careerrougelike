"""
Configuration Module for CareerRoguelike Backend

Loads and validates environment variables from .env file.
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class ConfigurationError(Exception):
    """Raised when required configuration is missing or invalid."""
    pass


class Config:
    """
    Configuration class that loads and validates environment variables.
    
    All configuration values are loaded from environment variables.
    Required variables are validated on initialization.
    """
    
    def __init__(self):
        """Initialize configuration and validate required variables."""
        self._load_config()
        self._validate_config()
    
    def _load_config(self) -> None:
        """Load configuration from environment variables."""
        # Google Cloud Configuration
        self.PROJECT_ID: Optional[str] = os.getenv("PROJECT_ID")
        self.PROJECT_NUMBER: Optional[str] = os.getenv("PROJECT_NUMBER")
        
        # Vertex AI Configuration (recommended for production)
        self.USE_VERTEX_AI: bool = os.getenv("USE_VERTEX_AI", "true").lower() == "true"
        self.VERTEX_AI_LOCATION: str = os.getenv("VERTEX_AI_LOCATION", "us-central1")
        
        # Google AI API Key (fallback for development)
        self.GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
        
        # Firestore Configuration
        self.FIRESTORE_DB: str = os.getenv("FIRESTORE_DB", "(default)")
        
        # Environment
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        
        # API Configuration
        self.API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
        self.API_PORT: int = int(os.getenv("API_PORT", "8080"))
        
        # CORS Configuration
        self.CORS_ORIGINS: list[str] = self._parse_cors_origins()
    
    def _parse_cors_origins(self) -> list[str]:
        """Parse CORS origins from environment variable."""
        cors_origins = os.getenv("CORS_ORIGINS", "*")
        if cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in cors_origins.split(",")]
    
    def _validate_config(self) -> None:
        """
        Validate that all required configuration variables are set.
        
        Raises:
            ConfigurationError: If any required variable is missing
        """
        # PROJECT_ID is always required
        if not self.PROJECT_ID:
            raise ConfigurationError(
                "Missing required environment variable: PROJECT_ID. "
                "Please set it in your .env file or environment."
            )
        
        # If not using Vertex AI, require API key
        if not self.USE_VERTEX_AI and not self.GOOGLE_API_KEY:
            raise ConfigurationError(
                "Either USE_VERTEX_AI must be true or GOOGLE_API_KEY must be set. "
                "Please configure one in your .env file."
            )
    
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT.lower() == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT.lower() == "development"
    
    def __repr__(self) -> str:
        """String representation of configuration (without sensitive data)."""
        auth_method = "Vertex AI" if self.USE_VERTEX_AI else "API Key"
        return (
            f"Config(PROJECT_ID={self.PROJECT_ID}, "
            f"ENVIRONMENT={self.ENVIRONMENT}, "
            f"AUTH={auth_method}, "
            f"FIRESTORE_DB={self.FIRESTORE_DB})"
        )


# Global configuration instance
# This will be initialized when the module is imported
try:
    config = Config()
except ConfigurationError as e:
    # In development, we might want to continue without full config
    # In production, this should fail fast
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        raise
    else:
        print(f"Warning: {e}")
        config = None


# Export individual configuration values for convenience
PROJECT_ID = config.PROJECT_ID if config else None
PROJECT_NUMBER = config.PROJECT_NUMBER if config else None
USE_VERTEX_AI = config.USE_VERTEX_AI if config else True
VERTEX_AI_LOCATION = config.VERTEX_AI_LOCATION if config else "us-central1"
GOOGLE_API_KEY = config.GOOGLE_API_KEY if config else None
FIRESTORE_DB = config.FIRESTORE_DB if config else "(default)"
ENVIRONMENT = config.ENVIRONMENT if config else "development"
API_HOST = config.API_HOST if config else "0.0.0.0"
API_PORT = config.API_PORT if config else 8080
CORS_ORIGINS = config.CORS_ORIGINS if config else ["*"]


__all__ = [
    "Config",
    "ConfigurationError",
    "config",
    "PROJECT_ID",
    "PROJECT_NUMBER",
    "USE_VERTEX_AI",
    "VERTEX_AI_LOCATION",
    "GOOGLE_API_KEY",
    "FIRESTORE_DB",
    "ENVIRONMENT",
    "API_HOST",
    "API_PORT",
    "CORS_ORIGINS",
]
