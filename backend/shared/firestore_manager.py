"""
Firestore Manager for CareerRoguelike Backend

Handles all Firestore operations for session persistence, job listings, tasks, and player state.
"""

from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from typing import Dict, Any, Optional, List
from datetime import datetime
import math
import logging

logger = logging.getLogger(__name__)


class FirestoreManager:
    """
    Manages Firestore operations for game sessions.
    
    This class provides CRUD operations for session documents stored in Firestore.
    All sessions are stored in the 'sessions' collection.
    Jobs are stored in 'jobs' collection, tasks in 'tasks' collection.
    """
    
    # XP progression constants
    BASE_XP_REQUIREMENT = 1000  # XP needed for level 2
    XP_MULTIPLIER = 1.5  # Exponential growth factor
    
    def __init__(self, collection_name: str = "sessions"):
        """
        Initialize Firestore client and set collection name.
        
        Args:
            collection_name: Name of the Firestore collection (default: "sessions")
        """
        self.db = firestore.Client()
        self.collection_name = collection_name
        self.jobs_collection = "jobs"
        self.tasks_collection = "tasks"
    
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
        Delete a session document and all associated data from Firestore.
        This includes jobs, tasks, meetings, and CV data.
        
        Args:
            session_id: Unique identifier for the session
        
        Raises:
            ValueError: If session document does not exist
            Exception: If deletion fails for other reasons
        """
        try:
            # Check if session exists
            doc_ref = self.db.collection(self.collection_name).document(session_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise ValueError(f"Session {session_id} not found")
            
            # Delete associated jobs
            jobs_query = self.db.collection(self.jobs_collection).where(
                filter=FieldFilter("session_id", "==", session_id)
            )
            jobs_docs = jobs_query.stream()
            for job_doc in jobs_docs:
                job_doc.reference.delete()
                logger.info(f"Deleted job {job_doc.id} for session {session_id}")
            
            # Delete associated tasks
            tasks_query = self.db.collection(self.tasks_collection).where(
                filter=FieldFilter("session_id", "==", session_id)
            )
            tasks_docs = tasks_query.stream()
            for task_doc in tasks_docs:
                task_doc.reference.delete()
                logger.info(f"Deleted task {task_doc.id} for session {session_id}")
            
            # Delete associated meetings
            meetings_query = self.db.collection('meetings').where(
                filter=FieldFilter("session_id", "==", session_id)
            )
            meetings_docs = meetings_query.stream()
            for meeting_doc in meetings_docs:
                meeting_doc.reference.delete()
                logger.info(f"Deleted meeting {meeting_doc.id} for session {session_id}")
            
            # Finally, delete the session document
            doc_ref.delete()
            logger.info(f"Deleted session {session_id} and all associated data")
            
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
    
    # ==================== Job Listings Methods ====================
    
    def create_job(self, job_id: str, session_id: str, job_data: Dict[str, Any]) -> None:
        """
        Create a new job listing in Firestore.
        
        Args:
            job_id: Unique identifier for the job
            session_id: Session ID this job belongs to
            job_data: Job data dictionary containing company, position, requirements, etc.
        
        Raises:
            Exception: If job creation fails
        """
        try:
            job_data['job_id'] = job_id
            job_data['session_id'] = session_id
            job_data['created_at'] = datetime.utcnow()
            job_data['status'] = job_data.get('status', 'active')  # active, expired, applied
            
            self.db.collection(self.jobs_collection).document(job_id).set(job_data)
        except Exception as e:
            raise Exception(f"Failed to create job {job_id}: {str(e)}")
    
    def get_job(self, job_id: str) -> Dict[str, Any]:
        """
        Retrieve a job listing from Firestore.
        
        Args:
            job_id: Unique identifier for the job
        
        Returns:
            Dictionary containing job data
        
        Raises:
            ValueError: If job document does not exist
            Exception: If retrieval fails for other reasons
        """
        try:
            doc = self.db.collection(self.jobs_collection).document(job_id).get()
            
            if not doc.exists:
                raise ValueError(f"Job {job_id} not found")
            
            return doc.to_dict()
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to retrieve job {job_id}: {str(e)}")
    
    def get_jobs_by_session(self, session_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve all job listings for a specific session.
        
        Args:
            session_id: Session identifier
            status: Optional filter by job status (active, expired, applied)
        
        Returns:
            List of job dictionaries
        
        Raises:
            Exception: If query fails
        """
        try:
            jobs_ref = self.db.collection(self.jobs_collection)
            query = jobs_ref.where(filter=FieldFilter("session_id", "==", session_id))
            
            if status:
                query = query.where(filter=FieldFilter("status", "==", status))
            
            # Order by created_at descending (newest first)
            query = query.order_by("created_at", direction=firestore.Query.DESCENDING)
            
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            raise Exception(f"Failed to retrieve jobs for session {session_id}: {str(e)}")
    
    def update_job_status(self, job_id: str, status: str) -> None:
        """
        Update the status of a job listing.
        
        Args:
            job_id: Unique identifier for the job
            status: New status (active, expired, applied)
        
        Raises:
            ValueError: If job document does not exist
            Exception: If update fails
        """
        try:
            doc_ref = self.db.collection(self.jobs_collection).document(job_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise ValueError(f"Job {job_id} not found")
            
            doc_ref.update({
                'status': status,
                'updated_at': datetime.utcnow()
            })
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to update job {job_id}: {str(e)}")
    
    # ==================== Task Methods ====================
    
    def create_task(self, task_id: str, session_id: str, task_data: Dict[str, Any]) -> None:
        """
        Create a new task in Firestore.
        
        Args:
            task_id: Unique identifier for the task
            session_id: Session ID this task belongs to
            task_data: Task data dictionary containing title, description, difficulty, etc.
        
        Raises:
            Exception: If task creation fails
        """
        try:
            task_data['task_id'] = task_id
            task_data['session_id'] = session_id
            task_data['created_at'] = datetime.utcnow()
            task_data['updated_at'] = datetime.utcnow()
            task_data['status'] = task_data.get('status', 'pending')  # pending, in-progress, completed
            task_data['task_type'] = task_data.get('task_type', 'work')  # work, meeting
            
            self.db.collection(self.tasks_collection).document(task_id).set(task_data)
        except Exception as e:
            raise Exception(f"Failed to create task {task_id}: {str(e)}")
    
    def update_task(self, task_id: str, update_data: Dict[str, Any]) -> None:
        """
        Update an existing task in Firestore.
        
        Args:
            task_id: Unique identifier for the task
            update_data: Dictionary containing fields to update
        
        Raises:
            ValueError: If task document does not exist
            Exception: If update fails
        """
        try:
            doc_ref = self.db.collection(self.tasks_collection).document(task_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise ValueError(f"Task {task_id} not found")
            
            update_data['updated_at'] = datetime.utcnow()
            doc_ref.update(update_data)
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to update task {task_id}: {str(e)}")
    
    def get_active_tasks(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve all active tasks (pending or in-progress) for a session.
        
        Args:
            session_id: Session identifier
        
        Returns:
            List of task dictionaries
        
        Raises:
            Exception: If query fails
        """
        try:
            tasks_ref = self.db.collection(self.tasks_collection)
            query = tasks_ref.where(filter=FieldFilter("session_id", "==", session_id))
            query = query.where(filter=FieldFilter("status", "in", ["pending", "in-progress"]))
            query = query.order_by("created_at", direction=firestore.Query.ASCENDING)
            
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            raise Exception(f"Failed to retrieve active tasks for session {session_id}: {str(e)}")
    
    def get_completed_tasks(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieve recently completed tasks for a session.
        
        Args:
            session_id: Session identifier
            limit: Maximum number of tasks to retrieve (default: 10)
        
        Returns:
            List of completed task dictionaries, ordered by completion time (most recent first)
        
        Raises:
            Exception: If query fails
        """
        try:
            tasks_ref = self.db.collection(self.tasks_collection)
            query = tasks_ref.where(filter=FieldFilter("session_id", "==", session_id))
            query = query.where(filter=FieldFilter("status", "==", "completed"))
            query = query.order_by("updated_at", direction=firestore.Query.DESCENDING)
            query = query.limit(limit)
            
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            # If the query fails (e.g., missing index), return empty list
            # This prevents breaking the flow if Firestore index isn't set up yet
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to retrieve completed tasks for session {session_id}: {str(e)}")
            return []
    
    def get_task(self, task_id: str) -> Dict[str, Any]:
        """
        Retrieve a specific task from Firestore.
        
        Args:
            task_id: Unique identifier for the task
        
        Returns:
            Dictionary containing task data
        
        Raises:
            ValueError: If task document does not exist
            Exception: If retrieval fails
        """
        try:
            doc = self.db.collection(self.tasks_collection).document(task_id).get()
            
            if not doc.exists:
                raise ValueError(f"Task {task_id} not found")
            
            return doc.to_dict()
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to retrieve task {task_id}: {str(e)}")
    
    # ==================== Player State Methods ====================
    
    def update_player_state(self, session_id: str, state_data: Dict[str, Any]) -> None:
        """
        Update player state fields in the session document.
        
        Args:
            session_id: Session identifier
            state_data: Dictionary containing player state fields to update
                       (status, level, xp, current_job, etc.)
        
        Raises:
            ValueError: If session does not exist
            Exception: If update fails
        """
        try:
            self.update_session(session_id, state_data)
        except Exception as e:
            raise Exception(f"Failed to update player state for session {session_id}: {str(e)}")
    
    # ==================== CV Methods ====================
    
    def update_cv(self, session_id: str, cv_data: Dict[str, Any]) -> None:
        """
        Update the CV data in the session document.
        
        Args:
            session_id: Session identifier
            cv_data: Dictionary containing CV data (experience, skills, accomplishments)
        
        Raises:
            ValueError: If session does not exist
            Exception: If update fails
        """
        try:
            self.update_session(session_id, {'cv_data': cv_data})
        except Exception as e:
            raise Exception(f"Failed to update CV for session {session_id}: {str(e)}")
    
    def add_job_to_history(self, session_id: str, job_data: Dict[str, Any]) -> None:
        """
        Add a job to the player's job history in the session document.
        
        Args:
            session_id: Session identifier
            job_data: Dictionary containing job information (company, position, dates, etc.)
        
        Raises:
            ValueError: If session does not exist
            Exception: If update fails
        """
        try:
            session = self.get_session(session_id)
            job_history = session.get('job_history', [])
            job_history.append(job_data)
            
            self.update_session(session_id, {'job_history': job_history})
        except Exception as e:
            raise Exception(f"Failed to add job to history for session {session_id}: {str(e)}")
    
    # ==================== XP and Level Management ====================
    
    def calculate_xp_for_level(self, level: int) -> int:
        """
        Calculate total XP required to reach a specific level.
        Uses exponential curve: XP = BASE * (MULTIPLIER ^ (level - 1))
        
        Args:
            level: Target level
        
        Returns:
            Total XP required to reach that level
        """
        if level <= 1:
            return 0
        
        total_xp = 0
        for lvl in range(2, level + 1):
            total_xp += int(self.BASE_XP_REQUIREMENT * (self.XP_MULTIPLIER ** (lvl - 2)))
        
        return total_xp
    
    def calculate_xp_to_next_level(self, current_level: int, current_xp: int) -> int:
        """
        Calculate XP needed to reach the next level.
        
        Args:
            current_level: Player's current level
            current_xp: Player's current total XP
        
        Returns:
            XP needed to reach next level
        """
        xp_for_next_level = self.calculate_xp_for_level(current_level + 1)
        return xp_for_next_level - current_xp
    
    def add_xp(self, session_id: str, xp_amount: int) -> Dict[str, Any]:
        """
        Add XP to a player and check for level up.
        
        Args:
            session_id: Session identifier
            xp_amount: Amount of XP to add
        
        Returns:
            Dictionary with keys:
                - new_xp: Updated total XP
                - new_level: Updated level
                - leveled_up: Boolean indicating if player leveled up
                - xp_to_next_level: XP needed for next level
        
        Raises:
            ValueError: If session does not exist
            Exception: If update fails
        """
        try:
            session = self.get_session(session_id)
            current_xp = session.get('xp', 0)
            current_level = session.get('level', 1)
            
            new_xp = current_xp + xp_amount
            new_level = current_level
            leveled_up = False
            
            # Check for level up(s)
            while True:
                xp_required_for_next = self.calculate_xp_for_level(new_level + 1)
                if new_xp >= xp_required_for_next:
                    new_level += 1
                    leveled_up = True
                else:
                    break
            
            xp_to_next = self.calculate_xp_to_next_level(new_level, new_xp)
            
            # Update session
            update_data = {
                'xp': new_xp,
                'level': new_level,
                'xp_to_next_level': xp_to_next
            }
            
            # Update stats
            stats = session.get('stats', {})
            stats['tasks_completed'] = stats.get('tasks_completed', 0) + 1
            update_data['stats'] = stats
            
            self.update_session(session_id, update_data)
            
            return {
                'new_xp': new_xp,
                'new_level': new_level,
                'leveled_up': leveled_up,
                'xp_to_next_level': xp_to_next
            }
        except Exception as e:
            raise Exception(f"Failed to add XP for session {session_id}: {str(e)}")
    
    def check_level_up(self, session_id: str) -> Dict[str, Any]:
        """
        Check if player should level up based on current XP.
        
        Args:
            session_id: Session identifier
        
        Returns:
            Dictionary with keys:
                - should_level_up: Boolean
                - current_level: Current level
                - current_xp: Current XP
                - xp_to_next_level: XP needed for next level
        
        Raises:
            ValueError: If session does not exist
            Exception: If check fails
        """
        try:
            session = self.get_session(session_id)
            current_xp = session.get('xp', 0)
            current_level = session.get('level', 1)
            
            xp_required_for_next = self.calculate_xp_for_level(current_level + 1)
            should_level_up = current_xp >= xp_required_for_next
            xp_to_next = self.calculate_xp_to_next_level(current_level, current_xp)
            
            return {
                'should_level_up': should_level_up,
                'current_level': current_level,
                'current_xp': current_xp,
                'xp_to_next_level': xp_to_next
            }
        except Exception as e:
            raise Exception(f"Failed to check level up for session {session_id}: {str(e)}")
    
    def can_apply_to_job(self, player_level: int, job_level: str) -> bool:
        """
        Check if a player can apply to a job based on their level.
        
        Job level mapping:
        - entry: levels 1-3
        - mid: levels 4-7
        - senior: levels 8-10
        
        Args:
            player_level: Player's current level (1-10)
            job_level: Job level string (entry, mid, senior)
        
        Returns:
            True if player can apply, False otherwise
        """
        job_level_lower = job_level.lower()
        
        if job_level_lower == "entry":
            return player_level >= 1  # Anyone can apply to entry-level
        elif job_level_lower == "mid":
            return player_level >= 4  # Need level 4+ for mid-level
        elif job_level_lower == "senior":
            return player_level >= 8  # Need level 8+ for senior
        else:
            # Unknown job level, allow application
            return True
    
    # ==================== Meeting Management ====================
    
    def create_meeting(self, meeting_id: str, session_id: str, meeting_data: Dict[str, Any]) -> None:
        """
        Create a new meeting in Firestore.
        
        Meeting document structure:
        {
            "meeting_id": str,
            "session_id": str,
            "meeting_type": str (team_standup, one_on_one, project_review, stakeholder_presentation, performance_review),
            "title": str,
            "status": str (scheduled, in_progress, completed),
            "context": str,
            "participants": List[Dict] (id, name, role, personality, avatar_color),
            "topics": List[Dict] (id, question, context, expected_points, ai_discussion_prompts),
            "current_topic_index": int,
            "conversation_history": List[Dict] (id, type, participant_id, participant_name, content, sentiment, timestamp),
            "objective": str,
            "estimated_duration_minutes": int,
            "priority": str (optional, recommended, required),
            "scheduled_time": Optional[str],
            "started_at": Optional[str],
            "completed_at": Optional[str],
            "elapsed_time_minutes": int,
            "created_at": str,
            "updated_at": str
        }
        
        Args:
            meeting_id: Unique meeting identifier
            session_id: Session identifier
            meeting_data: Meeting data dictionary
        
        Raises:
            Exception: If meeting creation fails
        """
        try:
            # Set required fields
            meeting_data['meeting_id'] = meeting_id
            meeting_data['session_id'] = session_id
            meeting_data['created_at'] = datetime.utcnow().isoformat()
            meeting_data['updated_at'] = datetime.utcnow().isoformat()
            
            # Set defaults if not provided
            meeting_data.setdefault('status', 'scheduled')
            meeting_data.setdefault('current_topic_index', 0)
            meeting_data.setdefault('conversation_history', [])
            meeting_data.setdefault('elapsed_time_minutes', 0)
            meeting_data.setdefault('started_at', None)
            meeting_data.setdefault('completed_at', None)
            meeting_data.setdefault('scheduled_time', None)
            
            # Create document
            meeting_ref = self.db.collection('meetings').document(meeting_id)
            meeting_ref.set(meeting_data)
            logger.info(f"Created meeting {meeting_id} for session {session_id}")
        except Exception as e:
            raise Exception(f"Failed to create meeting {meeting_id}: {str(e)}")
    
    def get_meeting(self, meeting_id: str) -> Dict[str, Any]:
        """
        Retrieve a meeting from Firestore.
        
        Args:
            meeting_id: Unique meeting identifier
        
        Returns:
            Meeting data dictionary
        
        Raises:
            ValueError: If meeting not found
            Exception: If retrieval fails
        """
        try:
            meeting_ref = self.db.collection('meetings').document(meeting_id)
            meeting_doc = meeting_ref.get()
            
            if not meeting_doc.exists:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            return meeting_doc.to_dict()
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to get meeting {meeting_id}: {str(e)}")
    
    def update_meeting(self, meeting_id: str, updates: Dict[str, Any]) -> None:
        """
        Update a meeting in Firestore.
        
        Args:
            meeting_id: Unique meeting identifier
            updates: Dictionary of fields to update
        
        Raises:
            ValueError: If meeting not found
            Exception: If update fails
        """
        try:
            meeting_ref = self.db.collection('meetings').document(meeting_id)
            meeting_doc = meeting_ref.get()
            
            if not meeting_doc.exists:
                raise ValueError(f"Meeting {meeting_id} not found")
            
            updates['updated_at'] = datetime.utcnow().isoformat()
            meeting_ref.update(updates)
            logger.info(f"Updated meeting {meeting_id}")
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to update meeting {meeting_id}: {str(e)}")
    
    def get_meetings_by_session(self, session_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all meetings for a session, optionally filtered by status.
        
        Args:
            session_id: Session identifier
            status: Optional status filter (scheduled, in_progress, completed)
        
        Returns:
            List of meeting dictionaries ordered by created_at descending
        
        Raises:
            Exception: If query fails
        """
        try:
            query = self.db.collection('meetings').where(
                filter=FieldFilter("session_id", "==", session_id)
            )
            
            if status:
                query = query.where(filter=FieldFilter("status", "==", status))
            
            # Order by created_at descending (newest first)
            query = query.order_by("created_at", direction=firestore.Query.DESCENDING)
            
            meetings = []
            for doc in query.stream():
                meeting_data = doc.to_dict()
                meetings.append(meeting_data)
            
            return meetings
        except Exception as e:
            raise Exception(f"Failed to get meetings for session {session_id}: {str(e)}")
    
    def update_meeting_status(self, meeting_id: str, status: str) -> None:
        """
        Update the status of a meeting.
        
        Args:
            meeting_id: Unique meeting identifier
            status: New status (scheduled, in_progress, completed)
        
        Raises:
            ValueError: If meeting not found
            Exception: If update fails
        """
        try:
            updates = {'status': status}
            
            # Set timestamps based on status
            if status == 'in_progress':
                updates['started_at'] = datetime.utcnow().isoformat()
            elif status == 'completed':
                updates['completed_at'] = datetime.utcnow().isoformat()
            
            self.update_meeting(meeting_id, updates)
        except Exception as e:
            raise Exception(f"Failed to update meeting status for {meeting_id}: {str(e)}")
    
    def append_conversation_message(
        self,
        meeting_id: str,
        message: Dict[str, Any]
    ) -> None:
        """
        Append a message to the meeting's conversation history.
        
        Message structure:
        {
            "id": str,
            "type": str (topic_intro, ai_response, player_response, system),
            "participant_id": Optional[str],
            "participant_name": Optional[str],
            "participant_role": Optional[str],
            "content": str,
            "sentiment": Optional[str] (positive, neutral, constructive, challenging),
            "timestamp": str
        }
        
        Args:
            meeting_id: Unique meeting identifier
            message: Message dictionary to append
        
        Raises:
            ValueError: If meeting not found
            Exception: If update fails
        """
        try:
            meeting = self.get_meeting(meeting_id)
            conversation_history = meeting.get('conversation_history', [])
            
            # Add timestamp if not present
            if 'timestamp' not in message:
                message['timestamp'] = datetime.utcnow().isoformat()
            
            conversation_history.append(message)
            
            self.update_meeting(meeting_id, {
                'conversation_history': conversation_history
            })
        except Exception as e:
            raise Exception(f"Failed to append message to meeting {meeting_id}: {str(e)}")
    
    def update_meeting_topic(self, meeting_id: str, topic_index: int) -> None:
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
            self.update_meeting(meeting_id, {
                'current_topic_index': topic_index
            })
        except Exception as e:
            raise Exception(f"Failed to update topic for meeting {meeting_id}: {str(e)}")
    
    def get_active_meetings(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Get all active meetings (scheduled or in_progress) for a session.
        
        Args:
            session_id: Session identifier
        
        Returns:
            List of active meeting dictionaries
        
        Raises:
            Exception: If query fails
        """
        try:
            query = self.db.collection('meetings').where(
                filter=FieldFilter("session_id", "==", session_id)
            )
            query = query.where(
                filter=FieldFilter("status", "in", ["scheduled", "in_progress"])
            )
            query = query.order_by("created_at", direction=firestore.Query.ASCENDING)
            
            meetings = []
            for doc in query.stream():
                meeting_data = doc.to_dict()
                meetings.append(meeting_data)
            
            return meetings
        except Exception as e:
            raise Exception(f"Failed to get active meetings for session {session_id}: {str(e)}")
    
    # ==================== Meeting Summary Management ====================
    
    def create_meeting_summary(
        self,
        meeting_id: str,
        session_id: str,
        summary_data: Dict[str, Any]
    ) -> None:
        """
        Create a meeting summary document in Firestore.
        
        Summary document structure:
        {
            "meeting_id": str,
            "session_id": str,
            "xp_earned": int,
            "participation_score": int,
            "generated_tasks": List[Dict] (task_id, title, source),
            "key_decisions": List[str],
            "action_items": List[str],
            "feedback": Dict (strengths: List[str], improvements: List[str]),
            "created_at": str
        }
        
        Args:
            meeting_id: Unique meeting identifier
            session_id: Session identifier
            summary_data: Summary data dictionary
        
        Raises:
            Exception: If summary creation fails
        """
        try:
            summary_data['meeting_id'] = meeting_id
            summary_data['session_id'] = session_id
            summary_data['created_at'] = datetime.utcnow().isoformat()
            
            # Use meeting_id as document ID for easy lookup
            summary_ref = self.db.collection('meeting_summaries').document(meeting_id)
            summary_ref.set(summary_data)
            logger.info(f"Created meeting summary for meeting {meeting_id}")
        except Exception as e:
            raise Exception(f"Failed to create meeting summary for {meeting_id}: {str(e)}")
    
    def get_meeting_summary(self, meeting_id: str) -> Dict[str, Any]:
        """
        Retrieve a meeting summary from Firestore.
        
        Args:
            meeting_id: Unique meeting identifier
        
        Returns:
            Meeting summary dictionary
        
        Raises:
            ValueError: If summary not found
            Exception: If retrieval fails
        """
        try:
            summary_ref = self.db.collection('meeting_summaries').document(meeting_id)
            summary_doc = summary_ref.get()
            
            if not summary_doc.exists:
                raise ValueError(f"Meeting summary for {meeting_id} not found")
            
            return summary_doc.to_dict()
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to get meeting summary for {meeting_id}: {str(e)}")
    
    def update_meeting_summary(self, meeting_id: str, updates: Dict[str, Any]) -> None:
        """
        Update a meeting summary in Firestore.
        
        Args:
            meeting_id: Unique meeting identifier
            updates: Dictionary of fields to update
        
        Raises:
            ValueError: If summary not found
            Exception: If update fails
        """
        try:
            summary_ref = self.db.collection('meeting_summaries').document(meeting_id)
            summary_doc = summary_ref.get()
            
            if not summary_doc.exists:
                raise ValueError(f"Meeting summary for {meeting_id} not found")
            
            summary_ref.update(updates)
            logger.info(f"Updated meeting summary for meeting {meeting_id}")
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to update meeting summary for {meeting_id}: {str(e)}")
