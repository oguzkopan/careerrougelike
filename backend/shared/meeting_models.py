"""
Meeting Data Models and Utilities

Defines data structures and helper functions for the Interactive Meeting System.
"""

from typing import Dict, Any, List, Optional, Literal
from dataclasses import dataclass, field, asdict
from datetime import datetime
import uuid


# Type aliases for meeting-related enums
MeetingType = Literal["team_standup", "one_on_one", "project_review", "stakeholder_presentation", "performance_review"]
MeetingStatus = Literal["scheduled", "in_progress", "completed"]
MeetingPriority = Literal["optional", "recommended", "required"]
MessageType = Literal["topic_intro", "ai_response", "player_response", "system"]
MessageSentiment = Literal["positive", "neutral", "constructive", "challenging"]


@dataclass
class Participant:
    """Represents a meeting participant (AI or player)."""
    id: str
    name: str
    role: str
    personality: str
    avatar_color: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Firestore storage."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Participant':
        """Create from dictionary."""
        return cls(**data)


@dataclass
class Topic:
    """Represents a discussion topic in a meeting."""
    id: str
    question: str
    context: str
    expected_points: List[str]
    ai_discussion_prompts: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Firestore storage."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Topic':
        """Create from dictionary."""
        return cls(**data)


@dataclass
class ConversationMessage:
    """Represents a message in the meeting conversation."""
    id: str
    type: MessageType
    content: str
    timestamp: str
    participant_id: Optional[str] = None
    participant_name: Optional[str] = None
    participant_role: Optional[str] = None
    sentiment: Optional[MessageSentiment] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Firestore storage."""
        return {k: v for k, v in asdict(self).items() if v is not None}
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConversationMessage':
        """Create from dictionary."""
        return cls(**data)


@dataclass
class Meeting:
    """Represents a complete meeting with all its data."""
    meeting_id: str
    session_id: str
    meeting_type: MeetingType
    title: str
    context: str
    participants: List[Participant]
    topics: List[Topic]
    objective: str
    estimated_duration_minutes: int
    priority: MeetingPriority
    status: MeetingStatus = "scheduled"
    current_topic_index: int = 0
    conversation_history: List[ConversationMessage] = field(default_factory=list)
    elapsed_time_minutes: int = 0
    scheduled_time: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Firestore storage."""
        data = {
            'meeting_id': self.meeting_id,
            'session_id': self.session_id,
            'meeting_type': self.meeting_type,
            'title': self.title,
            'context': self.context,
            'participants': [p.to_dict() for p in self.participants],
            'topics': [t.to_dict() for t in self.topics],
            'objective': self.objective,
            'estimated_duration_minutes': self.estimated_duration_minutes,
            'priority': self.priority,
            'status': self.status,
            'current_topic_index': self.current_topic_index,
            'conversation_history': [m.to_dict() for m in self.conversation_history],
            'elapsed_time_minutes': self.elapsed_time_minutes,
            'scheduled_time': self.scheduled_time,
            'started_at': self.started_at,
            'completed_at': self.completed_at,
            'created_at': self.created_at or datetime.utcnow().isoformat(),
            'updated_at': self.updated_at or datetime.utcnow().isoformat()
        }
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Meeting':
        """Create from dictionary."""
        # Convert nested objects
        participants = [Participant.from_dict(p) for p in data.get('participants', [])]
        topics = [Topic.from_dict(t) for t in data.get('topics', [])]
        conversation_history = [
            ConversationMessage.from_dict(m) 
            for m in data.get('conversation_history', [])
        ]
        
        return cls(
            meeting_id=data['meeting_id'],
            session_id=data['session_id'],
            meeting_type=data['meeting_type'],
            title=data['title'],
            context=data['context'],
            participants=participants,
            topics=topics,
            objective=data['objective'],
            estimated_duration_minutes=data['estimated_duration_minutes'],
            priority=data['priority'],
            status=data.get('status', 'scheduled'),
            current_topic_index=data.get('current_topic_index', 0),
            conversation_history=conversation_history,
            elapsed_time_minutes=data.get('elapsed_time_minutes', 0),
            scheduled_time=data.get('scheduled_time'),
            started_at=data.get('started_at'),
            completed_at=data.get('completed_at'),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at')
        )
    
    def get_current_topic(self) -> Optional[Topic]:
        """Get the current topic being discussed."""
        if 0 <= self.current_topic_index < len(self.topics):
            return self.topics[self.current_topic_index]
        return None
    
    def has_more_topics(self) -> bool:
        """Check if there are more topics to discuss."""
        return self.current_topic_index < len(self.topics) - 1
    
    def advance_to_next_topic(self) -> bool:
        """Advance to the next topic. Returns True if successful, False if no more topics."""
        if self.has_more_topics():
            self.current_topic_index += 1
            return True
        return False


@dataclass
class MeetingSummary:
    """Represents the summary and outcomes of a completed meeting."""
    meeting_id: str
    session_id: str
    xp_earned: int
    participation_score: int
    generated_tasks: List[Dict[str, str]]  # List of {task_id, title, source}
    key_decisions: List[str]
    action_items: List[str]
    feedback: Dict[str, List[str]]  # {strengths: [...], improvements: [...]}
    created_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Firestore storage."""
        return {
            'meeting_id': self.meeting_id,
            'session_id': self.session_id,
            'xp_earned': self.xp_earned,
            'participation_score': self.participation_score,
            'generated_tasks': self.generated_tasks,
            'key_decisions': self.key_decisions,
            'action_items': self.action_items,
            'feedback': self.feedback,
            'created_at': self.created_at or datetime.utcnow().isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MeetingSummary':
        """Create from dictionary."""
        return cls(**data)


# Helper functions for meeting state management

def generate_meeting_id() -> str:
    """Generate a unique meeting ID."""
    return f"meeting-{uuid.uuid4().hex[:12]}"


def generate_participant_id() -> str:
    """Generate a unique participant ID."""
    return f"participant-{uuid.uuid4().hex[:8]}"


def generate_topic_id() -> str:
    """Generate a unique topic ID."""
    return f"topic-{uuid.uuid4().hex[:8]}"


def generate_message_id() -> str:
    """Generate a unique message ID."""
    return f"msg-{uuid.uuid4().hex[:8]}"


def create_system_message(content: str) -> ConversationMessage:
    """Create a system message for the conversation."""
    return ConversationMessage(
        id=generate_message_id(),
        type="system",
        content=content,
        timestamp=datetime.utcnow().isoformat()
    )


def create_topic_intro_message(topic: Topic) -> ConversationMessage:
    """Create a topic introduction message."""
    return ConversationMessage(
        id=generate_message_id(),
        type="topic_intro",
        content=f"{topic.question}\n\n{topic.context}",
        timestamp=datetime.utcnow().isoformat()
    )


def create_ai_message(
    participant: Participant,
    content: str,
    sentiment: Optional[MessageSentiment] = None
) -> ConversationMessage:
    """Create an AI participant message."""
    return ConversationMessage(
        id=generate_message_id(),
        type="ai_response",
        participant_id=participant.id,
        participant_name=participant.name,
        participant_role=participant.role,
        content=content,
        sentiment=sentiment,
        timestamp=datetime.utcnow().isoformat()
    )


def create_player_message(content: str) -> ConversationMessage:
    """Create a player response message."""
    return ConversationMessage(
        id=generate_message_id(),
        type="player_response",
        participant_name="You",
        content=content,
        timestamp=datetime.utcnow().isoformat()
    )


def calculate_meeting_duration(meeting: Meeting) -> int:
    """
    Calculate the duration of a meeting in minutes.
    
    Args:
        meeting: Meeting object
    
    Returns:
        Duration in minutes, or 0 if meeting hasn't started
    """
    if not meeting.started_at:
        return 0
    
    start_time = datetime.fromisoformat(meeting.started_at)
    end_time = datetime.fromisoformat(meeting.completed_at) if meeting.completed_at else datetime.utcnow()
    
    duration = (end_time - start_time).total_seconds() / 60
    return int(duration)


def is_meeting_timeout(meeting: Meeting, max_duration_minutes: int = 20) -> bool:
    """
    Check if a meeting has exceeded the maximum duration.
    
    Args:
        meeting: Meeting object
        max_duration_minutes: Maximum allowed duration (default: 20)
    
    Returns:
        True if meeting has timed out, False otherwise
    """
    if meeting.status != "in_progress":
        return False
    
    duration = calculate_meeting_duration(meeting)
    return duration >= max_duration_minutes


def get_player_responses(meeting: Meeting) -> List[ConversationMessage]:
    """
    Extract all player responses from the conversation history.
    
    Args:
        meeting: Meeting object
    
    Returns:
        List of player response messages
    """
    return [
        msg for msg in meeting.conversation_history
        if msg.type == "player_response"
    ]


def get_ai_responses(meeting: Meeting) -> List[ConversationMessage]:
    """
    Extract all AI responses from the conversation history.
    
    Args:
        meeting: Meeting object
    
    Returns:
        List of AI response messages
    """
    return [
        msg for msg in meeting.conversation_history
        if msg.type == "ai_response"
    ]


def format_meeting_for_display(meeting: Meeting) -> Dict[str, Any]:
    """
    Format meeting data for frontend display.
    
    Args:
        meeting: Meeting object
    
    Returns:
        Dictionary with formatted meeting data
    """
    return {
        'id': meeting.meeting_id,
        'meeting_type': meeting.meeting_type,
        'title': meeting.title,
        'status': meeting.status,
        'scheduled_time': meeting.scheduled_time,
        'priority': meeting.priority,
        'participants': [
            {
                'id': p.id,
                'name': p.name,
                'role': p.role,
                'personality': p.personality,
                'avatar_color': p.avatar_color
            }
            for p in meeting.participants
        ],
        'estimated_duration_minutes': meeting.estimated_duration_minutes,
        'context_preview': meeting.context[:150] + '...' if len(meeting.context) > 150 else meeting.context,
        'topic_count': len(meeting.topics),
        'current_topic_index': meeting.current_topic_index
    }
