"""
Meeting Completion Agent

This agent determines when meeting topics and entire meetings should conclude.
It analyzes conversation flow, topic coverage, and time elapsed to make intelligent
decisions about when to transition between topics or end the meeting.

The agent ensures meetings feel natural by:
1. Detecting when topics have been adequately discussed
2. Generating smooth transition messages between topics
3. Determining when the entire meeting should conclude
4. Preventing meetings from becoming too long or repetitive
"""

from google.adk.agents import LlmAgent
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional


meeting_completion_agent = LlmAgent(
    name="MeetingCompletionAgent",
    model="gemini-2.0-flash-exp",
    instruction="""You are a meeting flow analyzer that determines when topics and meetings should conclude. Your goal is to ensure meetings feel natural, productive, and don't drag on unnecessarily.

CONTEXT PROVIDED:
- Meeting Type: {meeting_type}
- Meeting Objective: {meeting_objective}
- Current Topic: {current_topic}
- Topic Context: {topic_context}
- Conversation History for This Topic: {topic_conversation_history}
- Topics Remaining: {topics_remaining}
- Time Elapsed: {time_elapsed_minutes} minutes
- Total Topics: {total_topics}
- Current Topic Index: {current_topic_index}

YOUR TASK:

Analyze the conversation and determine:
1. Has the current topic been adequately discussed?
2. Have the key points been covered?
3. Is the conversation becoming repetitive or circular?
4. Should we move to the next topic or conclude the meeting?

TOPIC COMPLETION CRITERIA:

A topic is considered adequately discussed when:
- The main question has been addressed
- Key expected points have been mentioned or discussed
- Player has contributed at least 2-3 meaningful responses
- Conversation is reaching natural conclusion (not new substantial points)
- Discussion is becoming repetitive
- Sufficient depth has been reached for the meeting type

Topic completion thresholds by meeting type:
- team_standup: 2-3 player contributions (quick updates)
- one_on_one: 3-4 player contributions (deeper discussion)
- project_review: 3-4 player contributions (thorough coverage)
- stakeholder_presentation: 2-3 player contributions (focused presentation)
- performance_review: 4-5 player contributions (comprehensive feedback)

DO NOT conclude a topic too early:
- If player has only contributed once, topic is NOT complete
- If key expected points haven't been touched on, topic is NOT complete
- If conversation just started, topic is NOT complete

MEETING COMPLETION CRITERIA:

A meeting should conclude when:
- All topics have been discussed (topics_remaining = 0)
- Time elapsed exceeds estimated duration significantly (>25 minutes)
- Meeting objective has been achieved
- Natural conclusion point has been reached

DO NOT conclude meeting if:
- There are still topics remaining and time allows
- Current topic just started
- Meeting objective hasn't been met

TRANSITION MESSAGE GUIDELINES:

When moving to next topic:
- Acknowledge what was discussed in current topic
- Create smooth segue to next topic
- Keep it brief (1-2 sentences)
- Maintain professional tone
- Examples:
  * "Great discussion on [topic]. Let's move on to [next topic]."
  * "Thanks for those insights. Now, let's talk about [next topic]."
  * "That covers [topic] well. Next, I'd like to discuss [next topic]."

When concluding meeting:
- Summarize key outcomes briefly
- Thank participants
- Indicate next steps if applicable
- Examples:
  * "That wraps up our discussion. Thanks everyone for your input today."
  * "Great meeting. We've covered all the key points. Let's follow up on [action items]."
  * "Thanks for your time. I think we have a clear path forward."

ANALYSIS FACTORS:

1. Conversation Depth:
   - Count player contributions to current topic
   - Check if expected points have been discussed
   - Assess if new information is still being shared

2. Repetition Detection:
   - Are participants repeating the same points?
   - Is the conversation going in circles?
   - Has the discussion plateaued?

3. Time Management:
   - How much time has elapsed?
   - How many topics remain?
   - Is the meeting running too long?

4. Meeting Type Appropriateness:
   - Standups should be quick (10-15 min total)
   - One-on-ones can be longer (15-20 min)
   - Project reviews need thorough coverage (20-25 min)
   - Presentations should be focused (15-20 min)
   - Performance reviews need depth (20-25 min)

OUTPUT FORMAT:

Generate ONLY a valid JSON object (no markdown, no extra text):
{{
  "topic_complete": true|false,
  "meeting_complete": true|false,
  "reason": "Brief explanation of your decision (1-2 sentences)",
  "transition_message": "Message to display when moving to next topic or concluding meeting (1-2 sentences)",
  "confidence": "high|medium|low",
  "analysis": {{
    "player_contributions_count": 0,
    "key_points_covered": ["point1", "point2"],
    "repetition_detected": true|false,
    "time_pressure": true|false,
    "recommendation": "continue|transition|conclude"
  }}
}}

DECISION LOGIC:

If topics_remaining > 0 and time_elapsed_minutes < 20:
  - Focus on topic_complete decision
  - Set meeting_complete = false unless time is critical
  - Generate transition message to next topic

If topics_remaining = 0:
  - Set topic_complete = true
  - Set meeting_complete = true
  - Generate concluding message

If time_elapsed_minutes > 25:
  - Consider concluding meeting even if topics remain
  - Set meeting_complete = true
  - Generate apologetic concluding message about time

CONFIDENCE LEVELS:

- high: Clear indicators that topic/meeting should conclude
  * Multiple player contributions
  * All key points covered
  * Natural conversation ending
  * Time limits reached

- medium: Some indicators but not all
  * Adequate player contributions but could go deeper
  * Most key points covered
  * Conversation slowing but not stopped

- low: Uncertain, could go either way
  * Minimal player contributions
  * Some key points missing
  * Conversation still active
  * Time allows for more discussion

IMPORTANT RULES:
- Be decisive but not hasty
- Prioritize natural conversation flow over rigid time limits
- Ensure player has had adequate opportunity to contribute
- Don't let meetings drag on unnecessarily
- Match completion timing to meeting type
- Generate appropriate transition messages for the context
- Consider the meeting objective in your decision
- Balance thoroughness with efficiency""",
    description="Determines when meeting topics and meetings should conclude",
    output_key="completion_decision"
)


def generate_completion_id() -> str:
    """Generate a unique completion decision ID."""
    return f"completion-{uuid.uuid4().hex[:8]}"


def extract_topic_conversation(
    conversation_history: List[Dict[str, Any]],
    current_topic_index: int
) -> List[Dict[str, Any]]:
    """
    Extract conversation messages relevant to the current topic.
    
    Args:
        conversation_history: Full conversation history
        current_topic_index: Index of current topic
    
    Returns:
        List of messages for the current topic
    """
    # Find where current topic starts
    topic_intro_marker = f"topic-{current_topic_index}"
    
    topic_messages = []
    in_current_topic = False
    
    for msg in conversation_history:
        # Check if this is the start of current topic
        if msg.get('type') == 'topic_intro' and current_topic_index == msg.get('topic_index'):
            in_current_topic = True
            topic_messages.append(msg)
            continue
        
        # Check if we've moved to next topic
        if msg.get('type') == 'topic_intro' and in_current_topic:
            break
        
        # Add messages that are part of current topic
        if in_current_topic:
            topic_messages.append(msg)
    
    return topic_messages


def count_player_contributions(topic_conversation: List[Dict[str, Any]]) -> int:
    """
    Count how many times the player has contributed to the current topic.
    
    Args:
        topic_conversation: Conversation messages for current topic
    
    Returns:
        Number of player contributions
    """
    return sum(
        1 for msg in topic_conversation
        if msg.get('type') == 'player_response'
    )


def format_topic_conversation_for_context(
    topic_conversation: List[Dict[str, Any]],
    max_messages: int = 20
) -> str:
    """
    Format topic conversation history for the agent context.
    
    Args:
        topic_conversation: Conversation messages for current topic
        max_messages: Maximum number of messages to include
    
    Returns:
        Formatted string of topic conversation
    """
    if not topic_conversation:
        return "No conversation yet for this topic"
    
    # Get recent messages
    recent_messages = topic_conversation[-max_messages:]
    
    formatted_messages = []
    for msg in recent_messages:
        msg_type = msg.get('type', 'unknown')
        
        if msg_type == 'topic_intro':
            formatted_messages.append(f"[TOPIC INTRODUCED]: {msg['content']}")
        elif msg_type == 'ai_response':
            name = msg.get('participant_name', 'Unknown')
            content = msg['content']
            formatted_messages.append(f"{name}: {content}")
        elif msg_type == 'player_response':
            content = msg['content']
            formatted_messages.append(f"Player: {content}")
    
    return "\n\n".join(formatted_messages)


def format_current_topic_for_context(topic: Dict[str, Any]) -> str:
    """
    Format current topic information for the agent context.
    
    Args:
        topic: Topic dictionary
    
    Returns:
        Formatted string describing the topic
    """
    question = topic.get('question', '')
    context = topic.get('context', '')
    expected_points = topic.get('expected_points', [])
    
    formatted = f"Question: {question}\n"
    formatted += f"Context: {context}\n"
    
    if expected_points:
        formatted += f"Expected Points to Cover:\n"
        for point in expected_points:
            formatted += f"  - {point}\n"
    
    return formatted


def calculate_time_elapsed(
    started_at: str,
    current_time: Optional[str] = None
) -> int:
    """
    Calculate time elapsed since meeting started.
    
    Args:
        started_at: ISO format timestamp when meeting started
        current_time: ISO format timestamp for current time (defaults to now)
    
    Returns:
        Minutes elapsed
    """
    try:
        start = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
        
        if current_time:
            current = datetime.fromisoformat(current_time.replace('Z', '+00:00'))
        else:
            current = datetime.utcnow()
        
        elapsed = current - start
        return int(elapsed.total_seconds() / 60)
    except Exception:
        # If parsing fails, return 0
        return 0


def should_force_conclusion(
    time_elapsed_minutes: int,
    meeting_type: str,
    topics_remaining: int
) -> bool:
    """
    Determine if meeting should be forcefully concluded due to time constraints.
    
    Args:
        time_elapsed_minutes: Minutes elapsed since meeting started
        meeting_type: Type of meeting
        topics_remaining: Number of topics remaining
    
    Returns:
        True if meeting should be forcefully concluded
    """
    # Maximum durations by meeting type
    max_durations = {
        'team_standup': 15,
        'one_on_one': 20,
        'project_review': 25,
        'stakeholder_presentation': 20,
        'performance_review': 25
    }
    
    max_duration = max_durations.get(meeting_type, 20)
    
    # Force conclusion if significantly over time
    if time_elapsed_minutes > max_duration + 5:
        return True
    
    # Force conclusion if at max time and many topics remain (won't finish in time)
    if time_elapsed_minutes >= max_duration and topics_remaining > 2:
        return True
    
    return False


def validate_completion_decision(decision: Dict[str, Any]) -> bool:
    """
    Validate that the completion decision meets requirements.
    
    Args:
        decision: Completion decision dictionary
    
    Returns:
        True if valid, False otherwise
    """
    required_fields = ['topic_complete', 'meeting_complete', 'reason', 'transition_message']
    
    # Check required fields
    for field in required_fields:
        if field not in decision:
            return False
    
    # Check boolean fields are actually boolean
    if not isinstance(decision['topic_complete'], bool):
        return False
    if not isinstance(decision['meeting_complete'], bool):
        return False
    
    # Check reason and transition message are non-empty strings
    if not decision['reason'] or not isinstance(decision['reason'], str):
        return False
    if not decision['transition_message'] or not isinstance(decision['transition_message'], str):
        return False
    
    # Check confidence level if present
    if 'confidence' in decision:
        valid_confidence = ['high', 'medium', 'low']
        if decision['confidence'] not in valid_confidence:
            return False
    
    return True


def post_process_completion_decision(
    decision: Dict[str, Any],
    meeting_type: str,
    time_elapsed_minutes: int,
    topics_remaining: int
) -> Dict[str, Any]:
    """
    Post-process the completion decision to ensure consistency and add metadata.
    
    Args:
        decision: Raw completion decision from agent
        meeting_type: Type of meeting
        time_elapsed_minutes: Minutes elapsed
        topics_remaining: Number of topics remaining
    
    Returns:
        Processed completion decision
    """
    # Add ID if not present
    if 'id' not in decision:
        decision['id'] = generate_completion_id()
    
    # Add timestamp
    if 'timestamp' not in decision:
        decision['timestamp'] = datetime.utcnow().isoformat()
    
    # Ensure confidence is set
    if 'confidence' not in decision:
        decision['confidence'] = 'medium'
    
    # Override decision if time forces conclusion
    if should_force_conclusion(time_elapsed_minutes, meeting_type, topics_remaining):
        decision['meeting_complete'] = True
        decision['topic_complete'] = True
        decision['reason'] = "Meeting time limit reached"
        decision['transition_message'] = "We're at our time limit. Thanks everyone for your contributions today."
        decision['confidence'] = 'high'
    
    # Ensure meeting_complete is true if no topics remaining
    if topics_remaining == 0:
        decision['meeting_complete'] = True
        decision['topic_complete'] = True
    
    # Ensure meeting_complete is false if topics remaining and not forced
    if topics_remaining > 0 and not should_force_conclusion(time_elapsed_minutes, meeting_type, topics_remaining):
        decision['meeting_complete'] = False
    
    return decision


def create_transition_message(
    current_topic: Dict[str, Any],
    next_topic: Optional[Dict[str, Any]],
    is_conclusion: bool
) -> str:
    """
    Create a transition message between topics or for meeting conclusion.
    
    Args:
        current_topic: Current topic dictionary
        next_topic: Next topic dictionary (None if concluding)
        is_conclusion: Whether this is the final conclusion
    
    Returns:
        Transition message string
    """
    if is_conclusion:
        return "That wraps up our discussion. Thanks everyone for your input today."
    
    if next_topic:
        current_subject = current_topic.get('question', 'that topic')
        next_subject = next_topic.get('question', 'the next topic')
        
        # Extract key words from questions
        current_key = current_subject.split()[:5]
        next_key = next_subject.split()[:5]
        
        return f"Good discussion on {' '.join(current_key)}. Let's move on to {' '.join(next_key)}."
    
    return "Let's move on to the next topic."


def get_minimum_contributions_for_topic(meeting_type: str) -> int:
    """
    Get minimum number of player contributions before a topic can be considered complete.
    
    Args:
        meeting_type: Type of meeting
    
    Returns:
        Minimum number of contributions
    """
    minimums = {
        'team_standup': 2,
        'one_on_one': 3,
        'project_review': 3,
        'stakeholder_presentation': 2,
        'performance_review': 4
    }
    
    return minimums.get(meeting_type, 2)


__all__ = [
    "meeting_completion_agent",
    "generate_completion_id",
    "extract_topic_conversation",
    "count_player_contributions",
    "format_topic_conversation_for_context",
    "format_current_topic_for_context",
    "calculate_time_elapsed",
    "should_force_conclusion",
    "validate_completion_decision",
    "post_process_completion_decision",
    "create_transition_message",
    "get_minimum_contributions_for_topic",
]
