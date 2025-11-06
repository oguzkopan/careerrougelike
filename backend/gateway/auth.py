"""
Firebase Authentication

Provides Firebase authentication utilities for the FastAPI gateway.
Verifies Firebase ID tokens and extracts user information.
"""

import logging
from typing import Optional

import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from shared.config import PROJECT_ID

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
try:
    # Try to initialize with default credentials (works in Cloud Run)
    firebase_admin.initialize_app()
    logger.info("Firebase Admin SDK initialized with default credentials")
except ValueError:
    # Already initialized
    logger.info("Firebase Admin SDK already initialized")
except Exception as e:
    logger.warning(f"Failed to initialize Firebase Admin SDK: {str(e)}")
    logger.warning("Authentication will not work without Firebase initialization")


# HTTP Bearer security scheme
security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Verify Firebase ID token and extract user information
    
    Args:
        credentials: HTTP Authorization credentials with Bearer token
        
    Returns:
        Dictionary with user_id and other claims
        
    Raises:
        HTTPException: If token is invalid or verification fails
    """
    token = credentials.credentials
    
    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(token)
        
        # Extract user information
        user_id = decoded_token.get('uid')
        email = decoded_token.get('email')
        
        logger.info(f"Token verified for user {user_id}")
        
        return {
            'user_id': user_id,
            'email': email,
            'claims': decoded_token
        }
        
    except auth.InvalidIdTokenError:
        logger.warning("Invalid Firebase ID token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    except auth.ExpiredIdTokenError:
        logger.warning("Expired Firebase ID token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired"
        )
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


async def get_current_user(token_data: dict = Security(verify_token)) -> str:
    """
    FastAPI dependency to get current authenticated user ID
    
    Args:
        token_data: Verified token data from verify_token
        
    Returns:
        User ID string
    """
    return token_data['user_id']


async def optional_auth(credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security)) -> Optional[str]:
    """
    Optional authentication dependency
    Returns user_id if authenticated, None otherwise
    
    Args:
        credentials: Optional HTTP Authorization credentials
        
    Returns:
        User ID if authenticated, None otherwise
    """
    if credentials is None:
        return None
    
    try:
        # Manually verify the token
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_id = decoded_token.get('uid')
        logger.info(f"Optional auth: Token verified for user {user_id}")
        return user_id
    except Exception as e:
        logger.warning(f"Optional auth: Token verification failed: {str(e)}")
        return None
