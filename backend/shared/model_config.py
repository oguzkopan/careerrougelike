"""
Model Configuration for ADK Agents

This module configures the LLM backend for ADK agents.
It supports both Vertex AI (recommended for production) and Google AI API (development).

When using Vertex AI:
- Uses Application Default Credentials (no API key needed)
- Requires Vertex AI API to be enabled in GCP
- Requires proper IAM permissions

When using Google AI API:
- Requires GOOGLE_API_KEY environment variable
- Simpler setup for local development
"""

import os
import logging
from typing import Optional
from shared.config import (
    PROJECT_ID,
    USE_VERTEX_AI,
    VERTEX_AI_LOCATION,
    GOOGLE_API_KEY
)

logger = logging.getLogger(__name__)


def configure_adk_model() -> None:
    """
    Configure ADK to use either Vertex AI or Google AI API.
    
    This function sets the appropriate environment variables for ADK
    to use the correct model backend.
    
    For Vertex AI:
    - Sets GOOGLE_GENAI_USE_VERTEXAI=true
    - Sets GOOGLE_CLOUD_PROJECT to PROJECT_ID
    - Sets GOOGLE_CLOUD_LOCATION to VERTEX_AI_LOCATION
    
    For Google AI API:
    - Sets GOOGLE_API_KEY
    """
    if USE_VERTEX_AI:
        logger.info(f"Configuring ADK to use Vertex AI in project {PROJECT_ID}")
        
        # Configure ADK to use Vertex AI
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "true"
        os.environ["GOOGLE_CLOUD_PROJECT"] = PROJECT_ID
        os.environ["GOOGLE_CLOUD_LOCATION"] = VERTEX_AI_LOCATION
        
        logger.info(f"Vertex AI configured: project={PROJECT_ID}, location={VERTEX_AI_LOCATION}")
        logger.info("Using Application Default Credentials for authentication")
        
    else:
        logger.info("Configuring ADK to use Google AI API")
        
        if not GOOGLE_API_KEY:
            raise ValueError(
                "GOOGLE_API_KEY must be set when USE_VERTEX_AI is false. "
                "Please set it in your .env file."
            )
        
        # Ensure API key is set in environment
        os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
        
        logger.info("Google AI API configured with API key")


def get_model_name() -> str:
    """
    Get the model name to use for ADK agents.
    
    Returns:
        str: Model name (e.g., "gemini-2.0-flash-exp")
    """
    # ADK supports various Gemini models
    # For production, use stable models like gemini-2.0-flash
    # For development, you can use experimental models
    return "gemini-2.0-flash-exp"


def get_model_config() -> dict:
    """
    Get model configuration dictionary for ADK agents.
    
    Returns:
        dict: Configuration dictionary with model settings
    """
    return {
        "model": get_model_name(),
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 2048,
    }


# Configure model on module import
try:
    configure_adk_model()
    logger.info("Model configuration initialized successfully")
except Exception as e:
    logger.error(f"Failed to configure model: {e}")
    raise


__all__ = [
    "configure_adk_model",
    "get_model_name",
    "get_model_config",
]
