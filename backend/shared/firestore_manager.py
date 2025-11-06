"""
Firestore Manager for CareerRoguelike Backend

Handles all Firestore operations for session persistence.
"""

from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from typing import Dict, Any, Optional
from datetime import datetime


class FirestoreManager:
    """
    Manages Firestore operations for game sessions.
    
    This class provides CRUD operations for session documents stored in Firestore.
    All sessions are stored in the 'sessions' collection.
    """
    
    def __init__(self, collection_name: str = "sessions"):
        """
        Initialize Firestore client and set collection name.
        
        Args:
            collection_name: Name of the Firestore collection (default: "sessions")
        """
        self.db = firestore.Client()
        self.collection_name = collection_name
    
    def create_session(self, session_id: str, data: Dict[str, Any]) -> None:
        """
        Create a new session document in Firestore.
        
        Args:
            session_id: Unique identifier for the session
            data: Session data dictionary containing profession, level, status, etc.
        
        Raises:
            Exception: If session creation fails
        """
        try:
            # Add timestamps
            data['created_at'] = datetime.utcnow()
            data['updated_at'] = datetime.utcnow()
            
            # Create document
            self.db.collection(self.collection_name).document(session_id).set(data)
        except Exception as e:
            raise Exception(f"Failed to create session {session_id}: {str(e)}")
    
    def get_session(self, session_id: str) -> Dict[str, Any]:
        """
        Retrieve a session document from Firestore.
        
        Args:
            session_id: Unique identifier for the session
        
        Returns:
            Dictionary containing session data
        
        Raises:
            ValueError: If session document does not exist
            Exception: If retrieval fails for other reasons
        """
        try:
            doc = self.db.collection(self.collection_name).document(session_id).get()
            
            if not doc.exists:
                raise ValueError(f"Session {session_id} not found")
            
            return doc.to_dict()
        except ValueError:
            # Re-raise ValueError for not found
            raise
        except Exception as e:
            raise Exception(f"Failed to retrieve session {session_id}: {str(e)}")
    
    def update_session(self, session_id: str, data: Dict[str, Any]) -> None:
        """
        Update an existing session document in Firestore.
        
        Args:
            session_id: Unique identifier for the session
            data: Dictionary containing fields to update
        
        Raises:
            ValueError: If session document does not exist
            Exception: If update fails for other reasons
        """
        try:
            # Check if document exists
            doc_ref = self.db.collection(self.collection_name).document(session_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise ValueError(f"Session {session_id} not found")
            
            # Add updated timestamp
            data['updated_at'] = datetime.utcnow()
            
            # Update document
            doc_ref.update(data)
        except ValueError:
            # Re-raise ValueError for not found
            raise
        except Exception as e:
            raise Exception(f"Failed to update session {session_id}: {str(e)}")
    
    def delete_session(self, session_id: str) -> None:
        """
        Delete a session document from Firestore.
        
        Args:
            session_id: Unique identifier for the session
        
        Raises:
            ValueError: If session document does not exist
            Exception: If deletion fails for other reasons
        """
        try:
            doc_ref = self.db.collection(self.collection_name).document(session_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise ValueError(f"Session {session_id} not found")
            
            doc_ref.delete()
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to delete session {session_id}: {str(e)}")
    
    def get_user_sessions(self, user_id: str) -> list[Dict[str, Any]]:
        """
        Retrieve all sessions for a specific user.
        
        Args:
            user_id: User identifier
        
        Returns:
            List of session dictionaries
        
        Raises:
            Exception: If query fails
        """
        try:
            sessions_ref = self.db.collection(self.collection_name)
            query = sessions_ref.where(filter=FieldFilter("user_id", "==", user_id))
            docs = query.stream()
            
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            raise Exception(f"Failed to retrieve sessions for user {user_id}: {str(e)}")
