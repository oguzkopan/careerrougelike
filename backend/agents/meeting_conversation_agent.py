"""
Meeting Conversation Agent

This agent generates AI participant conversations for the Interactive Meeting System.
It handles two stages:
1. Initial discussion: AI participants discuss a topic among themselves before the player's turn
2. Response to player: AI participants react to and build on the player's contribution

The agent maintains personality consistency and creates natural, flowing conversations
that advance meeting objectives.
"""

from google.adk.agents import LlmAgent
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional


meeting_conversation_agent = LlmAgent(
    name="MeetingConversationAgent",
    model="gemini-2.0-flash-exp",
    instruction="""You are a workplace conversation generator for AI meeting participants. Generate realistic, natural dialogue that maintains personality consistency and advances the meeting discussion.

CONTEXT PROVIDED:
- Meeting Type: {meeting_type}
- Meeting Context: {meeting_context}
- Current Topic: {current_topic}
- Topic Context: {topic_context}
- Participants: {participants}
- Conversation So Far: {conversation_history}
- Stage: {stage}
- Player Response (if stage is response_to_player): {player_response}

STAGE DEFINITIONS:

1. INITIAL_DISCUSSION:
   - Generate 2-4 messages from AI participants discussing the topic
   - Participants should build on each other's points naturally
   - Create realistic workplace conversation flow
   - End with a natural transition that prompts the player to contribute
   - DO NOT include the player in this stage - only AI participants speak

2. RESPONSE_TO_PLAYER:
   - Generate 1-3 AI reactions to the player's input
   - Acknowledge and reference what the player said
   - Build on the player's contribution
   - Advance the discussion or provide constructive feedback
   - Maintain natural conversation flow

PERSONALITY CONSISTENCY RULES:

Each participant has a personality type that MUST be reflected in their dialogue:

- supportive: Encouraging, positive, offers help and praise
  * "That's a great point! I think we could..."
  * "I really like that approach. Building on that..."
  * "Excellent work on that. Have you considered..."

- analytical: Data-focused, asks for metrics, logical reasoning
  * "What metrics are we using to measure that?"
  * "Looking at the data, I see..."
  * "Can we quantify the impact of..."

- direct: Straight to the point, concise, asks clarifying questions
  * "Let's focus on the key issue here..."
  * "What's the timeline on that?"
  * "Bottom line - can we deliver this?"

- collaborative: Builds on ideas, suggests alternatives, team-oriented
  * "What if we combined your idea with..."
  * "I think we could work together on..."
  * "Let's brainstorm some options..."

- challenging: Constructive pushback, plays devil's advocate, asks tough questions
  * "Have we considered the risks of..."
  * "I'm not sure that addresses the core problem..."
  * "What about the scenario where..."

- enthusiastic: Energetic, optimistic, forward-thinking
  * "This is exciting! We could really..."
  * "I'm seeing some great opportunities here..."
  * "Let's think big on this one..."

- pragmatic: Practical, focused on feasibility and resources
  * "Do we have the resources for that?"
  * "Let's be realistic about the timeline..."
  * "What's the most practical approach?"

- detail_oriented: Thorough, asks about specifics, concerned with accuracy
  * "Can you walk me through the specifics?"
  * "I want to make sure we've covered all the details..."
  * "What about edge cases like..."

CONVERSATION FLOW RULES:

1. Natural Progression:
   - Participants should reference each other by name occasionally
   - Build on previous points made in the conversation
   - Vary message lengths (1-4 sentences)
   - Include occasional questions to each other or the group

2. Meeting Type Appropriateness:
   - team_standup: Quick, focused updates; less debate
   - one_on_one: More personal, developmental, deeper discussion
   - project_review: Status-focused, problem-solving oriented
   - stakeholder_presentation: More formal, results-oriented
   - performance_review: Constructive, goal-oriented, supportive

3. Sentiment Assignment:
   - positive: Agreement, praise, enthusiasm
   - neutral: Information sharing, questions, clarifications
   - constructive: Suggestions, alternatives, improvements
   - challenging: Concerns, pushback, tough questions

4. Realistic Workplace Dynamics:
   - Managers tend to guide discussion and ask questions
   - Senior roles provide expertise and direction
   - Peers collaborate and build on ideas
   - Mix agreement and constructive disagreement
   - Avoid excessive politeness - be natural

RESPONSE GENERATION GUIDELINES:

For INITIAL_DISCUSSION:
- Start with 1-2 participants sharing initial thoughts
- Have other participants respond and build on those thoughts
- Create a natural back-and-forth (not just sequential statements)
- End with a clear opening for the player to contribute
- Example flow:
  1. Manager asks opening question or shares context
  2. Senior team member provides perspective
  3. Another participant builds on or questions that perspective
  4. (Optional) Third participant adds another angle
  5. Natural pause/prompt for player input

For RESPONSE_TO_PLAYER:
- First response should directly acknowledge player's input
- Reference specific points the player made
- Build on their contribution or ask follow-up questions
- If player's response was strong: praise and expand
- If player's response was weak: gently redirect or ask clarifying questions
- If player's response was off-topic: acknowledge and guide back
- Maintain supportive tone even when challenging

TOPIC CONTEXT INTEGRATION:

- Reference the topic's expected_points when appropriate
- Use ai_discussion_prompts as conversation starters
- Relate discussion to the meeting's overall objective
- Connect to previous topics if relevant
- Build toward actionable outcomes

OUTPUT FORMAT:

Generate ONLY a valid JSON array (no markdown, no extra text):
[
  {{
    "participant_id": "participant-abc123",
    "participant_name": "Sarah Chen",
    "participant_role": "Engineering Manager",
    "content": "Natural dialogue that matches personality (1-4 sentences)",
    "sentiment": "positive|neutral|constructive|challenging",
    "references_player": false
  }},
  {{
    "participant_id": "participant-def456",
    "participant_name": "Mike Rodriguez",
    "participant_role": "Senior Engineer",
    "content": "Response that builds on previous message",
    "sentiment": "neutral",
    "references_player": false
  }}
]

For RESPONSE_TO_PLAYER stage, set "references_player": true for messages that directly respond to player input.

IMPORTANT RULES:
- Generate 2-4 messages for initial_discussion
- Generate 1-3 messages for response_to_player
- NEVER include the player as a speaker in the output
- Maintain distinct voices for each participant
- Keep dialogue natural and workplace-appropriate
- Vary sentence structure and length
- Use participant names occasionally but not excessively
- Ensure personalities are clearly reflected in word choice and tone
- Make conversations feel dynamic, not scripted
- Reference the conversation history to maintain continuity
- Don't repeat points already made unless building on them""",
    description="Generates natural AI participant conversations for meetings",
    output_key="conversation_messages"
)


def generate_message_id() -> str:
    """Generate a unique message ID."""
    return f"msg-{uuid.uuid4().hex[:8]}"


def format_participants_for_context(participants: List[Dict[str, Any]]) -> str:
    """
    Format participant information for the agent context.
    
    Args:
        participants: List of participant dictionaries
    
    Returns:
        Formatted string describing participants
    """
    participant_descriptions = []
    for p in participants:
        desc = f"- {p['name']} ({p['role']}): {p['personality']} personality"
        participant_descriptions.append(desc)
    
    return "\n".join(participant_descriptions)


def format_conversation_history(
    conversation_history: List[Dict[str, Any]],
    max_messages: int = 15
) -> str:
    """
    Format conversation history for the agent context.
    Limits to recent messages to avoid context overflow.
    
    Args:
        conversation_history: List of conversation message dictionaries
        max_messages: Maximum number of recent messages to include
    
    Returns:
        Formatted string of conversation history
    """
    if not conversation_history:
        return "No previous conversation"
    
    # Get recent messages
    recent_messages = conversation_history[-max_messages:]
    
    formatted_messages = []
    for msg in recent_messages:
        msg_type = msg.get('type', 'unknown')
        
        if msg_type == 'topic_intro':
            formatted_messages.append(f"[TOPIC INTRODUCED]: {msg['content']}")
        elif msg_type == 'ai_response':
            name = msg.get('participant_name', 'Unknown')
            role = msg.get('participant_role', '')
            content = msg['content']
            formatted_messages.append(f"{name} ({role}): {content}")
        elif msg_type == 'player_response':
            content = msg['content']
            formatted_messages.append(f"Player: {content}")
        elif msg_type == 'system':
            formatted_messages.append(f"[SYSTEM]: {msg['content']}")
    
    return "\n\n".join(formatted_messages)


def format_topic_for_context(topic: Dict[str, Any]) -> str:
    """
    Format topic information for the agent context.
    
    Args:
        topic: Topic dictionary
    
    Returns:
        Formatted string describing the topic
    """
    question = topic.get('question', '')
    context = topic.get('context', '')
    expected_points = topic.get('expected_points', [])
    ai_prompts = topic.get('ai_discussion_prompts', [])
    
    formatted = f"Question: {question}\n"
    formatted += f"Context: {context}\n"
    
    if expected_points:
        formatted += f"Expected Discussion Points:\n"
        for point in expected_points:
            formatted += f"  - {point}\n"
    
    if ai_prompts:
        formatted += f"AI Discussion Prompts:\n"
        for prompt in ai_prompts:
            formatted += f"  - {prompt}\n"
    
    return formatted


def select_participants_for_turn(
    participants: List[Dict[str, Any]],
    stage: str,
    conversation_history: List[Dict[str, Any]],
    num_messages: int
) -> List[Dict[str, Any]]:
    """
    Select which participants should speak in this turn.
    Ensures variety and realistic conversation flow.
    
    Args:
        participants: List of all participants
        stage: "initial_discussion" or "response_to_player"
        conversation_history: Previous conversation messages
        num_messages: Number of messages to generate
    
    Returns:
        List of selected participants (may include duplicates for multiple messages)
    """
    # Get participants who have spoken recently
    recent_speakers = set()
    if conversation_history:
        for msg in conversation_history[-5:]:
            if msg.get('type') == 'ai_response' and msg.get('participant_id'):
                recent_speakers.add(msg['participant_id'])
    
    # For initial discussion, prefer starting with manager or senior roles
    if stage == "initial_discussion" and not conversation_history:
        # Sort by role priority (managers first, then senior roles)
        priority_roles = ['manager', 'director', 'lead', 'senior']
        sorted_participants = sorted(
            participants,
            key=lambda p: any(role in p['role'].lower() for role in priority_roles),
            reverse=True
        )
        return sorted_participants[:num_messages]
    
    # For response to player, prefer participants who haven't spoken recently
    available_participants = [
        p for p in participants
        if p['id'] not in recent_speakers or len(recent_speakers) == len(participants)
    ]
    
    if not available_participants:
        available_participants = participants
    
    # Select participants, preferring variety
    selected = []
    for i in range(min(num_messages, len(available_participants))):
        selected.append(available_participants[i])
    
    return selected


def post_process_conversation_messages(
    messages: List[Dict[str, Any]],
    participants: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Post-process generated conversation messages to ensure proper formatting
    and add missing fields.
    
    Args:
        messages: Raw messages from the agent
        participants: List of participant dictionaries
    
    Returns:
        Processed messages with proper IDs and timestamps
    """
    processed_messages = []
    
    for msg in messages:
        # Ensure message has required fields
        if not msg.get('id'):
            msg['id'] = generate_message_id()
        
        if not msg.get('timestamp'):
            msg['timestamp'] = datetime.utcnow().isoformat()
        
        # Set message type
        msg['type'] = 'ai_response'
        
        # Ensure participant info is complete
        if msg.get('participant_id'):
            # Find participant details
            participant = next(
                (p for p in participants if p['id'] == msg['participant_id']),
                None
            )
            if participant:
                msg['participant_name'] = participant['name']
                msg['participant_role'] = participant['role']
        
        # Ensure sentiment is set
        if not msg.get('sentiment'):
            msg['sentiment'] = 'neutral'
        
        # Ensure references_player is set
        if 'references_player' not in msg:
            msg['references_player'] = False
        
        processed_messages.append(msg)
    
    return processed_messages


def validate_conversation_messages(messages: List[Dict[str, Any]]) -> bool:
    """
    Validate that generated messages meet requirements.
    
    Args:
        messages: List of message dictionaries
    
    Returns:
        True if valid, False otherwise
    """
    if not messages:
        return False
    
    required_fields = ['participant_id', 'participant_name', 'content', 'sentiment']
    
    for msg in messages:
        # Check required fields
        for field in required_fields:
            if field not in msg or not msg[field]:
                return False
        
        # Check content length (should be reasonable)
        if len(msg['content']) < 10 or len(msg['content']) > 1000:
            return False
        
        # Check sentiment is valid
        valid_sentiments = ['positive', 'neutral', 'constructive', 'challenging']
        if msg['sentiment'] not in valid_sentiments:
            return False
    
    return True


def create_player_turn_prompt() -> Dict[str, Any]:
    """
    Create a system message prompting the player to respond.
    
    Returns:
        System message dictionary
    """
    return {
        'id': generate_message_id(),
        'type': 'system',
        'content': "Your turn to speak. Share your thoughts on this topic.",
        'timestamp': datetime.utcnow().isoformat()
    }


def determine_message_count(
    stage: str,
    conversation_history: List[Dict[str, Any]],
    num_participants: int
) -> int:
    """
    Determine how many AI messages to generate based on context.
    
    Args:
        stage: "initial_discussion" or "response_to_player"
        conversation_history: Previous conversation messages
        num_participants: Number of participants in the meeting
    
    Returns:
        Number of messages to generate (2-4 for initial, 1-3 for response)
    """
    if stage == "initial_discussion":
        # More messages for larger groups
        if num_participants >= 5:
            return 4
        elif num_participants >= 3:
            return 3
        else:
            return 2
    else:  # response_to_player
        # Fewer messages in response to player
        if num_participants >= 4:
            return 3
        elif num_participants >= 3:
            return 2
        else:
            return 1


__all__ = [
    "meeting_conversation_agent",
    "generate_message_id",
    "format_participants_for_context",
    "format_conversation_history",
    "format_topic_for_context",
    "select_participants_for_turn",
    "post_process_conversation_messages",
    "validate_conversation_messages",
    "create_player_turn_prompt",
    "determine_message_count",
]
