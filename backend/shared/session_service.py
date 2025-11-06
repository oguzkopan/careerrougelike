"""
Custom SessionService for CareerRoguelike Backend

Extends ADK's InMemorySessionService to sync session state with Firestore.
This ensures that all ADK session state changes are persisted to the database.
"""

from google.adk.sessions import InMemorySessionService, Session
from typing import Optional, Dict, Any
import logging

from backend.shared.firestore_manager import FirestoreManager

logger = logging.getLogger(__name__)


class FirestoreSessionService(InMemorySessionService):
    """
    Custom SessionService that syncs ADK session state with Firestore.
    
    This class extends InMemorySessionService to provide automatic persistence
    of session state to Firestore after each state change. It maintains the
    in-memory cache for fast access while ensuring durability through Firestore.
    """
    
    def __init__(self, firestore_manager: Optional[FirestoreManager] = None):
        """
        Initialize the FirestoreSessionService.
        
        Args:
            firestore_manager: Optional FirestoreManager instance. If not provided,
                             a new instance will be created.
        """
        super().__init__()
        self.firestore = firestore_manager or FirestoreManager()
        logger.info("FirestoreSessionService initialized")
    
    def create_session(
        self,
        user_id: str,
        session_id: str,
        app_name: str,
        initial_state: Optional[Dict[str, Any]] = None
    ) -> Session:
        """
        Create a new session and persist it to Firestore.
        
        Args:
            user_id: User identifier
            session_id: Unique session identifier
            app_name: Application name
            initial_state: Optional initial state dictionary
        
        Returns:
            Created Session object
        """
        # Create session in memory using parent class
        session = super().create_session(user_id, session_id, app_name, initial_state)
        
        # Persist to Firestore
        try:
            session_data = {
                "user_id": user_id,
                "session_id": session_id,
                "app_name": app_name,
                "state": session.state or {},
                "status": "active"
            }
            self.firestore.create_session(session_id, session_data)
            logger.info(f"Session {session_id} created and persisted to Firestore")
        except Exception as e:
            logger.error(f"Failed to persist session {session_id} to Firestore: {e}")
            # Continue with in-memory session even if Firestore fails
        
        return session
    
    def get_session(self, user_id: str, session_id: str) -> Optional[Session]:
        """
        Retrieve a session, loading from Firestore if not in memory.
        
        Args:
            user_id: User identifier
            session_id: Unique session identifier
        
        Returns:
            Session object if found, None otherwise
        """
        # Try to get from memory first
        session = super().get_session(user_id, session_id)
        
        if session is None:
            # Try to load from Firestore
            try:
                session_data = self.firestore.get_session(session_id)
                
                # Verify user_id matches
                if session_data.get("user_id") != user_id:
                    logger.warning(
                        f"User ID mismatch for session {session_id}: "
                        f"expected {user_id}, got {session_data.get('user_id')}"
                    )
                    return None
                
                # Recreate session in memory
                session = self.create_session(
                    user_id=user_id,
                    session_id=session_id,
                    app_name=session_data.get("app_name", "career-roguelike"),
                    initial_state=session_data.get("state", {})
                )
                logger.info(f"Session {session_id} loaded from Firestore")
            except ValueError:
                # Session not found in Firestore
                logger.debug(f"Session {session_id} not found in Firestore")
                return None
            except Exception as e:
                logger.error(f"Failed to load session {session_id} from Firestore: {e}")
                return None
        
        return session
    
    def update_session_state(
        self,
        user_id: str,
        session_id: str,
        state_updates: Dict[str, Any]
    ) -> None:
        """
        Update session state and sync to Firestore.
        
        Args:
            user_id: User identifier
            session_id: Unique session identifier
            state_updates: Dictionary of state updates to apply
        """
        # Update in-memory state using parent class
        super().update_session_state(user_id, session_id, state_updates)
        
        # Sync to Firestore
        try:
            session = super().get_session(user_id, session_id)
            if session:
                self.firestore.update_session(
                    session_id,
                    {"state": session.state}
                )
                logger.debug(f"Session {session_id} state synced to Firestore")
        except Exception as e:
            logger.error(f"Failed to sync session {session_id} state to Firestore: {e}")
            # Continue even if Firestore sync fails
    
    def delete_session(self, user_id: str, session_id: str) -> None:
        """
        Delete a session from memory and Firestore.
        
        Args:
            user_id: User identifier
            session_id: Unique session identifier
        """
        # Delete from memory using parent class
        super().delete_session(user_id, session_id)
        
        # Delete from Firestore
        try:
            self.firestore.delete_session(session_id)
            logger.info(f"Session {session_id} deleted from Firestore")
        except ValueError:
            # Session not found in Firestore, already deleted
            logger.debug(f"Session {session_id} not found in Firestore during deletion")
        except Exception as e:
            logger.error(f"Failed to delete session {session_id} from Firestore: {e}")
    
    def sync_session_to_firestore(self, user_id: str, session_id: str) -> bool:
        """
        Manually sync a session's current state to Firestore.
        
        This method can be called to force a sync of the current session state
        to Firestore, useful after multiple state changes or before critical operations.
        
        Args:
            user_id: User identifier
            session_id: Unique session identifier
        
        Returns:
            True if sync was successful, False otherwise
        """
        try:
            session = super().get_session(user_id, session_id)
            if not session:
                logger.warning(f"Cannot sync session {session_id}: not found in memory")
                return False
            
            self.firestore.update_session(
                session_id,
                {"state": session.state}
            )
            logger.info(f"Session {session_id} manually synced to Firestore")
            return True
        except Exception as e:
            logger.error(f"Failed to manually sync session {session_id}: {e}")
            return False
