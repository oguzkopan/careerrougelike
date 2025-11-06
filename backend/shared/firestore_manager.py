"""
Firestore Manager

Manages session persistence in Google Cloud Firestore.
Provides CRUD operations for game session documents.
"""

from google.cloud import firestore
from typing import Dict, Any, Optional
from datetime import datetime


class FirestoreManager:
    """Manager for Firestore session persistence"""
    
    def __init__(self, collection_name: str = "sessions"):
        """
        Initialize Firestore client
        
        Args:
            collection_name: Name of the Firestore collection for sessions
        """
        self.db = firestore.Client()
        self.collection = collection_name
    
    def create_session(self, session_id: str, data: Dict[str, Any]) -> None:
        """
        Create new session document in Firestore
        
        Args:
            session_id: Unique session identifier
            data: Session data dictionary
        """
        data['created_at'] = datetime.utcnow()
        data['updated_at'] = datetime.utcnow()
        self.db.collection(self.collection).document(session_id).set(data)
    
    def get_session(self, session_id: str) -> Dict[str, Any]:
        """
        Get session document from Firestore
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Session data dictionary
            
        Raises:
            ValueError: If session not found
        """
        doc = self.db.collection(self.collection).document(session_id).get()
        if not doc.exists:
            raise ValueError(f"Session {session_id} not found")
        return doc.to_dict()
    
    def update_session(self, session_id: str, data: Dict[str, Any]) -> None:
        """
        Update session document in Firestore
        
        Args:
            session_id: Unique session identifier
            data: Updated session data (partial or full)
        """
        data['updated_at'] = datetime.utcnow()
        self.db.collection(self.collection).document(session_id).update(data)
    
    def session_exists(self, session_id: str) -> bool:
        """
        Check if session exists in Firestore
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            True if session exists, False otherwise
        """
        doc = self.db.collection(self.collection).document(session_id).get()
        return doc.exists
