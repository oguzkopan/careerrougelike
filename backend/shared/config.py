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
        self.GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
        self.PROJECT_ID: Optional[str] = os.getenv("PROJECT_ID")
        
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
        required_vars = {
            "GOOGLE_API_KEY": self.GOOGLE_API_KEY,
            "PROJECT_ID": self.PROJECT_ID,
        }
        
        missing_vars = [
            var_name for var_name, var_value in required_vars.items()
            if not var_value
        ]
        
        if missing_vars:
            raise ConfigurationError(
                f"Missing required environment variables: {', '.join(missing_vars)}. "
                f"Please set them in your .env file or environment."
            )
    
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT.lower() == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT.lower() == "development"
    
    def __repr__(self) -> str:
        """String representation of configuration (without sensitive data)."""
        return (
            f"Config(PROJECT_ID={self.PROJECT_ID}, "
            f"ENVIRONMENT={self.ENVIRONMENT}, "
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
GOOGLE_API_KEY = config.GOOGLE_API_KEY if config else None
PROJECT_ID = config.PROJECT_ID if config else None
FIRESTORE_DB = config.FIRESTORE_DB if config else "(default)"
ENVIRONMENT = config.ENVIRONMENT if config else "development"
API_HOST = config.API_HOST if config else "0.0.0.0"
API_PORT = config.API_PORT if config else 8080
CORS_ORIGINS = config.CORS_ORIGINS if config else ["*"]


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
]
