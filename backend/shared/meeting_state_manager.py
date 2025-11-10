"""
Meeting State Manager

Manages meeting state in Firestore with atomic operations for the Interactive Meeting System.
Provides methods for initializing meetings, appending messages, polling for new messages,
and managing turn state.
"""

from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
import uuid

from shared.metrics_tracker import get_metrics_tracker

logger = logging.getLogger(__name__)


class MeetingStateManager:
    """
    Manages meeting state in Firestore with atomic operations.
    
    This class provides methods for:
    - Initializing meeting documents
    - Appending messages with atomic operations
    - Polling for new messages
    - Managing player turn state
    - Retrieving meeting state
    - Marking meetings as complete
    """
    
    def __init__(self):
        """Initialize Firestore client and metrics tracker."""
        self.db = firestore.Client()
        self.meetings_collection = "meetings"
        self.metrics_tracker = get_metrics_tracker()
    
    def initialize_meeting(self, session_id: str, meeting_data: Dict[str, Any]) -> str:
        """
        Create a new meeting document in Firestore.
        
        Args:
            session_id: Session identifier
            meeting_data: Meeting data dictionary containing:
                - meeting_type: Type of meeting
                - title: Meeting title
                - context: Meeting context
                - participants: List of participant dictionaries
                - topics: List of topic dictionaries
                - objective: Meeting objective
                - estimated_duration_minutes: Estimated duration
                - priority: Meeting priority
                - scheduled_time: Optional scheduled time
        
        Returns:
            meeting_id: Unique identifier for the created meeting
        
        Raises:
            Exception: If meeting creation fails
        """
        try:
            # Generate unique meeting ID
            meeting_id = f"meeting-{uuid.uuid4().hex[:12]}"
            
            # Set required fields
            meeting_data['meeting_id'] = meeting_id
            meeting_data['session_id'] = session_id
            meeting_data['status'] = 'scheduled'
            meeting_data['current_topic_index'] = 0
            meeting_data['conversation_history'] = []
            meeting_data['is_player_turn'] = False
            meeting_data['last_message_timestamp'] = None
            meeting_data['elapsed_time_minutes'] = 0
            meeting_data['started_at'] = None
            meeting_data['completed_at'] = None
            meeting_data['created_at'] = datetime.utcnow().isoformat()
            meeting_data['updated_at'] = datetime.utcnow().isoformat()
            
            # Create document
            meeting_ref = self.db.collection(self.meetings_collection).document(meeting_id)
            meeting_ref.set(meeting_data)
            
            logger.info(f"Initialized meeting {meeting_id} for session {session_id}")
            return meeting_id
            
        except Exception as e:
            logger.error(f"Failed to initialize meeting for session {session_id}: {str(e)}")
            raise Exception(f"Failed to initialize meeting: {str(e)}")
    
    def append_messages(self, meeting_id: str, messages: List[Dict[str, Any]]) -> None:
        """
        Append messages to the meeting's conversation history using atomic Firestore operations.
        
        Each message should have the structure:
        {
            "id": str,
            "type": str (topic_intro, ai_response, player_response, player_turn),
            "participant_id": Optional[str],
            "participant_name": Optional[str],
            "participant_role": Optional[str],
            "content": str,
            "sentiment": Optional[str] (positive, neutral, constructive, challenging),
            "timestamp": str (ISO 8601),
            "sequence_number": int
        }
        
        Args:
            meeting_id: Unique meeting identifier
            messages: List of message dictionaries to append
        
        Raises:
            ValueError: If meeting not found
            Exception: If append operation fails
        """
        try:
            meeting_ref = self.db.collection(self.meetings_collection).document(meeting_id)
            
            # Check if meeting exists
            meeting_doc = meeting_ref.get()
            if not meeting_doc.exists:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            # Get current conversation history to determine sequence numbers
            meeting_data = meeting_doc.to_dict()
            current_history = meeting_data.get('conversation_history', [])
            next_sequence = len(current_history)
            
            # Add sequence numbers and timestamps to messages
            for i, message in enumerate(messages):
                if 'sequence_number' not in message:
                    message['sequence_number'] = next_sequence + i
                if 'timestamp' not in message:
                    message['timestamp'] = datetime.utcnow().isoformat()
            
            # Use atomic array union operation to append messages
            # Note: We use update with arrayUnion for atomic operation
            meeting_ref.update({
                'conversation_history': firestore.ArrayUnion(messages),
                'last_message_timestamp': messages[-1]['timestamp'],
                'updated_at': datetime.utcnow().isoformat()
            })
            
            logger.info(f"Appended {len(messages)} messages to meeting {meeting_id}")
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to append messages to meeting {meeting_id}: {str(e)}")
            raise Exception(f"Failed to append messages: {str(e)}")
    
    def get_messages_since(
        self, 
        meeting_id: str, 
        last_message_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get messages from a meeting since a specific message ID (for polling support).
        
        Args:
            meeting_id: Unique meeting identifier
            last_message_id: Optional ID of the last message the client has seen.
                           If None, returns all messages.
        
        Returns:
            List of message dictionaries in chronological order
        
        Raises:
            ValueError: If meeting not found
            Exception: If retrieval fails
        """
        try:
            meeting_ref = self.db.collection(self.meetings_collection).document(meeting_id)
            meeting_doc = meeting_ref.get()
            
            if not meeting_doc.exists:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            meeting_data = meeting_doc.to_dict()
            conversation_history = meeting_data.get('conversation_history', [])
            
            # If no last_message_id provided, return all messages
            if not last_message_id:
                return conversation_history
            
            # Find the index of the last message the client has seen
            last_message_index = -1
            for i, msg in enumerate(conversation_history):
                if msg.get('id') == last_message_id:
                    last_message_index = i
                    break
            
            # Return messages after the last seen message
            if last_message_index >= 0:
                new_messages = conversation_history[last_message_index + 1:]
                logger.info(f"Retrieved {len(new_messages)} new messages for meeting {meeting_id}")
                
                # Record polling request metrics
                self.metrics_tracker.record_meeting_polling_request(meeting_id, len(new_messages))
                
                return new_messages
            else:
                # If last_message_id not found, return all messages
                # This handles the case where the client's state is out of sync
                logger.warning(f"Last message ID {last_message_id} not found in meeting {meeting_id}, returning all messages")
                
                # Record polling request metrics
                self.metrics_tracker.record_meeting_polling_request(meeting_id, len(conversation_history))
                
                return conversation_history
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to get messages for meeting {meeting_id}: {str(e)}")
            raise Exception(f"Failed to get messages: {str(e)}")
    
    def set_player_turn(self, meeting_id: str, is_player_turn: bool) -> None:
        """
        Set the player turn flag for a meeting.
        
        Args:
            meeting_id: Unique meeting identifier
            is_player_turn: Boolean indicating if it's the player's turn
        
        Raises:
            ValueError: If meeting not found
            Exception: If update fails
        """
        try:
            meeting_ref = self.db.collection(self.meetings_collection).document(meeting_id)
            
            # Check if meeting exists
            meeting_doc = meeting_ref.get()
            if not meeting_doc.exists:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            # Update player turn flag
            meeting_ref.update({
                'is_player_turn': is_player_turn,
                'updated_at': datetime.utcnow().isoformat()
            })
            
            logger.info(f"Set player turn to {is_player_turn} for meeting {meeting_id}")
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to set player turn for meeting {meeting_id}: {str(e)}")
            raise Exception(f"Failed to set player turn: {str(e)}")
    
    def get_meeting_state(self, meeting_id: str) -> Dict[str, Any]:
        """
        Retrieve the complete meeting state from Firestore.
        
        Args:
            meeting_id: Unique meeting identifier
        
        Returns:
            Dictionary containing complete meeting state including:
                - meeting_data: All meeting fields
                - conversation_history: List of messages
                - current_topic_index: Current topic index
                - is_player_turn: Boolean indicating if it's player's turn
                - status: Meeting status
        
        Raises:
            ValueError: If meeting not found
            Exception: If retrieval fails
        """
        try:
            meeting_ref = self.db.collection(self.meetings_collection).document(meeting_id)
            meeting_doc = meeting_ref.get()
            
            if not meeting_doc.exists:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            meeting_data = meeting_doc.to_dict()
            
            logger.info(f"Retrieved meeting state for meeting {meeting_id}")
            return meeting_data
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to get meeting state for meeting {meeting_id}: {str(e)}")
            raise Exception(f"Failed to get meeting state: {str(e)}")
    
    def mark_meeting_complete(self, meeting_id: str) -> None:
        """
        Mark a meeting as completed and set completion timestamp.
        
        Args:
            meeting_id: Unique meeting identifier
        
        Raises:
            ValueError: If meeting not found
            Exception: If update fails
        """
        try:
            meeting_ref = self.db.collection(self.meetings_collection).document(meeting_id)
            
            # Check if meeting exists
            meeting_doc = meeting_ref.get()
            if not meeting_doc.exists:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            # Update status and completion timestamp
            meeting_ref.update({
                'status': 'completed',
                'completed_at': datetime.utcnow().isoformat(),
                'is_player_turn': False,
                'updated_at': datetime.utcnow().isoformat()
            })
            
            logger.info(f"Marked meeting {meeting_id} as complete")
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to mark meeting {meeting_id} as complete: {str(e)}")
            raise Exception(f"Failed to mark meeting complete: {str(e)}")
    
    def mark_meeting_left_early(self, meeting_id: str) -> None:
        """
        Mark a meeting as left early by the player.
        
        Args:
            meeting_id: Unique meeting identifier
        
        Raises:
            ValueError: If meeting not found
            Exception: If update fails
        """
        try:
            meeting_ref = self.db.collection(self.meetings_collection).document(meeting_id)
            
            # Check if meeting exists
            meeting_doc = meeting_ref.get()
            if not meeting_doc.exists:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            meeting_data = meeting_doc.to_dict()
            
            # Update status
            meeting_ref.update({
                'status': 'left_early',
                'completed_at': datetime.utcnow().isoformat(),
                'is_player_turn': False,
                'updated_at': datetime.utcnow().isoformat()
            })
            
            logger.info(f"Marked meeting {meeting_id} as left early")
            
            # Record early leave metrics
            started_at = meeting_data.get('started_at')
            if started_at:
                start_time = datetime.fromisoformat(started_at)
                end_time = datetime.utcnow()
                duration_minutes = (end_time - start_time).total_seconds() / 60
            else:
                duration_minutes = 0
            
            current_topic_index = meeting_data.get('current_topic_index', 0)
            total_topics = len(meeting_data.get('topics', []))
            
            self.metrics_tracker.record_meeting_early_leave(
                meeting_id,
                duration_minutes,
                current_topic_index,
                total_topics
            )
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to mark meeting {meeting_id} as left early: {str(e)}")
            raise Exception(f"Failed to mark meeting as left early: {str(e)}")
    
    def update_meeting_status(self, meeting_id: str, status: str) -> None:
        """
        Update the status of a meeting.
        
        Args:
            meeting_id: Unique meeting identifier
            status: New status (scheduled, in_progress, completed, left_early)
        
        Raises:
            ValueError: If meeting not found
            Exception: If update fails
        """
        try:
            meeting_ref = self.db.collection(self.meetings_collection).document(meeting_id)
            
            # Check if meeting exists
            meeting_doc = meeting_ref.get()
            if not meeting_doc.exists:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            updates = {
                'status': status,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Set timestamps based on status
            if status == 'in_progress':
                updates['started_at'] = datetime.utcnow().isoformat()
            elif status in ['completed', 'left_early']:
                updates['completed_at'] = datetime.utcnow().isoformat()
            
            meeting_ref.update(updates)
            
            logger.info(f"Updated meeting {meeting_id} status to {status}")
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to update meeting {meeting_id} status: {str(e)}")
            raise Exception(f"Failed to update meeting status: {str(e)}")
    
    def update_current_topic(self, meeting_id: str, topic_index: int) -> None:
        """
        Update the current topic index for a meeting.
        
        Args:
            meeting_id: Unique meeting identifier
            topic_index: New topic index
        
        Raises:
            ValueError: If meeting not found
            Exception: If update fails
        """
        try:
            meeting_ref = self.db.collection(self.meetings_collection).document(meeting_id)
            
            # Check if meeting exists
            meeting_doc = meeting_ref.get()
            if not meeting_doc.exists:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            meeting_ref.update({
                'current_topic_index': topic_index,
                'updated_at': datetime.utcnow().isoformat()
            })
            
            logger.info(f"Updated meeting {meeting_id} to topic index {topic_index}")
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to update topic for meeting {meeting_id}: {str(e)}")
            raise Exception(f"Failed to update topic: {str(e)}")
