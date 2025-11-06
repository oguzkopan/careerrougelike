"""
Configuration Module

Loads and validates environment variables for the backend application.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


# Google Cloud Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
PROJECT_ID = os.getenv("PROJECT_ID")
FIRESTORE_DB = os.getenv("FIRESTORE_DB", "(default)")

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")


def validate_config():
    """
    Validate that required environment variables are set
    
    Raises:
        ValueError: If required variables are missing
    """
    required_vars = {
        "GOOGLE_API_KEY": GOOGLE_API_KEY,
        "PROJECT_ID": PROJECT_ID
    }
    
    missing = [name for name, value in required_vars.items() if not value]
    
    if missing:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            f"Please set them in your .env file or environment."
        )


# Validate on import
if ENVIRONMENT != "test":
    validate_config()
