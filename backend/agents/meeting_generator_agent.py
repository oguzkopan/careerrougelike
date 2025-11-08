"""
Meeting Generator Agent

This agent generates realistic workplace meeting scenarios for the Interactive Meeting System.
It creates meetings with appropriate types, participants, and discussion topics based on the
player's current job context, recent tasks, and career level.

The agent reads job context, recent tasks, and trigger information to generate complete
meeting scenarios with participants, topics, and objectives.
"""

from google.adk.agents import LlmAgent
import uuid
import random

# Avatar colors for participants
AVATAR_COLORS = [
    "#3B82F6",  # Blue
    "#10B981",  # Green
    "#F59E0B",  # Amber
    "#EF4444",  # Red
    "#8B5CF6",  # Purple
    "#EC4899",  # Pink
    "#14B8A6",  # Teal
    "#F97316",  # Orange
]

meeting_generator_agent = LlmAgent(
    name="MeetingGeneratorAgent",
    model="gemini-2.0-flash-exp",
    instruction="""You are a workplace meeting scenario generator. Generate a realistic meeting based on the provided context.

Context:
- Job Title: {job_title}
- Company: {company_name}
- Player Level: {player_level}
- Recent Tasks: {recent_tasks}
- Meeting Trigger: {trigger_reason}
- Tasks Completed Since Last Meeting: {tasks_since_meeting}

Your goal is to create an immersive, contextually relevant meeting that:
1. Relates to the player's recent work and tasks
2. Matches the appropriate meeting type for the trigger
3. Includes realistic participants with distinct personalities
4. Has 3-5 discussion topics that feel natural and relevant
5. Provides clear objectives and outcomes

MEETING TYPE SELECTION RULES:

Based on trigger_reason:
- "task_completion" (2-4 tasks done): Generate team_standup (60%), project_review (30%), or one_on_one (10%)
- "scheduled": Generate any type based on player level and context
- "manager_request": Generate one_on_one (70%) or performance_review (30%)
- "milestone": Generate stakeholder_presentation (50%) or project_review (50%)

Meeting Types:
1. team_standup: Quick updates, blockers, daily plans (3-4 participants, 10-15 min)
2. one_on_one: Focused discussion with manager (2 participants, 15-20 min)
3. project_review: Status updates, problem-solving, planning (4-6 participants, 20-25 min)
4. stakeholder_presentation: Player presents to executives/stakeholders (3-5 participants, 15-20 min)
5. performance_review: Feedback, goals, career development (2 participants, 20-25 min)

PARTICIPANT GENERATION RULES:

Number of participants by meeting type:
- team_standup: 3-4 (manager + 2-3 colleagues)
- one_on_one: 2 (player + manager)
- project_review: 4-6 (manager + team members + optional stakeholder)
- stakeholder_presentation: 3-5 (player + manager + 2-3 executives/stakeholders)
- performance_review: 2 (player + manager)

Participant roles by job type:
- Engineer/Developer: Engineering Manager, Senior Engineer, Tech Lead, Product Manager, QA Engineer
- Analyst: Analytics Manager, Senior Analyst, Data Scientist, Business Analyst, Product Manager
- Designer: Design Manager, Senior Designer, UX Researcher, Product Manager, Developer
- Manager: Director, Senior Manager, Team Lead, Executive, Department Head
- Sales: Sales Director, Account Executive, Sales Manager, Marketing Manager, Customer Success
- Operations: Operations Manager, Process Engineer, Quality Manager, Supply Chain Manager, Plant Manager

Personality types (assign different ones to each participant):
- supportive: Encouraging, positive, offers help and praise
- analytical: Data-focused, asks for metrics, logical reasoning
- direct: Straight to the point, concise, asks clarifying questions
- collaborative: Builds on ideas, suggests alternatives, team-oriented
- challenging: Constructive pushback, plays devil's advocate, asks tough questions
- enthusiastic: Energetic, optimistic, forward-thinking
- pragmatic: Practical, focused on feasibility and resources
- detail_oriented: Thorough, asks about specifics, concerned with accuracy

TOPIC GENERATION RULES:

Topics should:
1. Reference specific recent tasks the player completed (use {recent_tasks})
2. Build on each other naturally (topic 2 relates to topic 1, etc.)
3. Match the meeting type's purpose
4. Scale in complexity with player level
5. Include realistic workplace scenarios

For team_standup topics:
- "What did you accomplish yesterday/this week?"
- "What are you working on today/this sprint?"
- "Any blockers or challenges?"
- "Quick updates on [specific project from recent tasks]"

For one_on_one topics:
- Career development and goals
- Feedback on recent work
- Challenges and support needed
- Project priorities and direction

For project_review topics:
- Status update on [specific project]
- Technical challenges and solutions
- Timeline and milestone review
- Resource needs and dependencies

For stakeholder_presentation topics:
- Project overview and objectives
- Key results and metrics
- Challenges and mitigation strategies
- Next steps and timeline

For performance_review topics:
- Accomplishments and strengths
- Areas for growth
- Career goals and development
- Feedback and expectations

Each topic should include:
- question: The discussion point or question (1-2 sentences)
- context: Why this is being discussed (1-2 sentences, reference recent tasks when relevant)
- expected_points: 3-4 key points that would make a good response
- ai_discussion_prompts: 2-3 prompts for what AI participants should discuss before player's turn

PRIORITY ASSIGNMENT:

- optional: Casual team standups, informal check-ins (20%)
- recommended: Regular project reviews, scheduled 1-on-1s (60%)
- required: Performance reviews, critical stakeholder presentations, urgent problem-solving (20%)

OUTPUT FORMAT:

Generate ONLY a valid JSON object (no markdown, no extra text):
{{
  "id": "meeting-{generate_uuid}",
  "meeting_type": "team_standup|one_on_one|project_review|stakeholder_presentation|performance_review",
  "title": "Brief, specific meeting title (e.g., 'Sprint Planning Check-in', 'Q2 Performance Review')",
  "context": "2-3 sentences explaining the meeting purpose and background. Reference recent tasks when relevant.",
  "participants": [
    {{
      "id": "participant-{generate_uuid}",
      "name": "Realistic first and last name",
      "role": "Specific job title appropriate for the meeting",
      "personality": "One of the personality types listed above",
      "avatar_color": "Hex color code (will be assigned automatically)"
    }}
  ],
  "topics": [
    {{
      "id": "topic-{generate_uuid}",
      "question": "Discussion topic or question",
      "context": "Why this is being discussed (reference recent tasks when possible)",
      "expected_points": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
      "ai_discussion_prompts": ["What AI should discuss 1", "What AI should discuss 2", "What AI should discuss 3"]
    }}
  ],
  "objective": "Clear statement of what success looks like for this meeting",
  "estimated_duration_minutes": 10-25,
  "priority": "optional|recommended|required"
}}

LEVEL-BASED SCALING:

Level 1-3 (Entry-level):
- Focus on learning, task updates, basic feedback
- Simpler topics, more guidance
- Supportive participants
- Shorter meetings (10-15 min)

Level 4-7 (Mid-level):
- Strategic discussions, project planning, mentoring
- Complex problem-solving
- Mix of supportive and challenging participants
- Medium meetings (15-20 min)

Level 8-10 (Senior):
- Executive decisions, company strategy, high-stakes presentations
- Leadership and vision topics
- More challenging participants
- Longer meetings (20-25 min)

IMPORTANT:
- Make meetings feel authentic and grounded in the player's work
- Reference specific tasks from {recent_tasks} in topics and context
- Vary meeting types to avoid repetition
- Ensure participants have distinct personalities
- Create natural conversation flow through topic progression
- Match meeting complexity to player level""",
    description="Generates contextually relevant workplace meeting scenarios",
    output_key="meeting_data"
)


def generate_meeting_id() -> str:
    """Generate a unique meeting ID."""
    return f"meeting-{uuid.uuid4().hex[:12]}"


def generate_participant_id() -> str:
    """Generate a unique participant ID."""
    return f"participant-{uuid.uuid4().hex[:8]}"


def generate_topic_id() -> str:
    """Generate a unique topic ID."""
    return f"topic-{uuid.uuid4().hex[:8]}"


def assign_avatar_colors(participants: list) -> list:
    """
    Assign unique avatar colors to participants.
    
    Args:
        participants: List of participant dictionaries
    
    Returns:
        List of participants with avatar_color assigned
    """
    colors = AVATAR_COLORS.copy()
    random.shuffle(colors)
    
    for i, participant in enumerate(participants):
        if i < len(colors):
            participant['avatar_color'] = colors[i]
        else:
            # If we run out of predefined colors, generate a random one
            participant['avatar_color'] = f"#{random.randint(0, 0xFFFFFF):06x}"
    
    return participants


def post_process_meeting_data(meeting_data: dict) -> dict:
    """
    Post-process the generated meeting data to ensure all IDs are unique
    and avatar colors are assigned.
    
    Args:
        meeting_data: Raw meeting data from the agent
    
    Returns:
        Processed meeting data with proper IDs and colors
    """
    # Ensure meeting has a proper ID
    if not meeting_data.get('id') or 'generate_uuid' in meeting_data.get('id', ''):
        meeting_data['id'] = generate_meeting_id()
    
    # Process participants
    if 'participants' in meeting_data:
        for participant in meeting_data['participants']:
            # Ensure participant has proper ID
            if not participant.get('id') or 'generate_uuid' in participant.get('id', ''):
                participant['id'] = generate_participant_id()
        
        # Assign avatar colors
        meeting_data['participants'] = assign_avatar_colors(meeting_data['participants'])
    
    # Process topics
    if 'topics' in meeting_data:
        for topic in meeting_data['topics']:
            # Ensure topic has proper ID
            if not topic.get('id') or 'generate_uuid' in topic.get('id', ''):
                topic['id'] = generate_topic_id()
    
    return meeting_data


def select_meeting_type_by_trigger(
    trigger_reason: str,
    player_level: int,
    tasks_since_meeting: int
) -> str:
    """
    Select an appropriate meeting type based on the trigger and context.
    
    Args:
        trigger_reason: Why the meeting is being generated
        player_level: Player's current level
        tasks_since_meeting: Number of tasks completed since last meeting
    
    Returns:
        Meeting type string
    """
    if trigger_reason == "task_completion":
        # After completing tasks, usually team standups or project reviews
        weights = {
            "team_standup": 60,
            "project_review": 30,
            "one_on_one": 10
        }
    elif trigger_reason == "manager_request":
        # Manager-initiated meetings
        weights = {
            "one_on_one": 70,
            "performance_review": 30
        }
    elif trigger_reason == "milestone":
        # Milestone meetings
        weights = {
            "stakeholder_presentation": 50,
            "project_review": 50
        }
    else:  # "scheduled" or other
        # Balanced mix based on level
        if player_level <= 3:
            weights = {
                "team_standup": 40,
                "one_on_one": 30,
                "project_review": 30
            }
        elif player_level <= 7:
            weights = {
                "team_standup": 25,
                "one_on_one": 25,
                "project_review": 35,
                "stakeholder_presentation": 15
            }
        else:
            weights = {
                "one_on_one": 20,
                "project_review": 30,
                "stakeholder_presentation": 30,
                "performance_review": 20
            }
    
    # Select based on weights
    meeting_types = list(weights.keys())
    probabilities = list(weights.values())
    
    return random.choices(meeting_types, weights=probabilities, k=1)[0]


def format_recent_tasks_for_context(recent_tasks: list) -> str:
    """
    Format recent tasks into a readable string for the agent context.
    
    Args:
        recent_tasks: List of task dictionaries
    
    Returns:
        Formatted string describing recent tasks
    """
    if not recent_tasks:
        return "No recent tasks completed"
    
    task_descriptions = []
    for task in recent_tasks[-5:]:  # Last 5 tasks
        title = task.get('title', 'Untitled task')
        task_type = task.get('task_type', 'general')
        task_descriptions.append(f"- {title} ({task_type})")
    
    return "\n".join(task_descriptions)


__all__ = [
    "meeting_generator_agent",
    "generate_meeting_id",
    "generate_participant_id",
    "generate_topic_id",
    "assign_avatar_colors",
    "post_process_meeting_data",
    "select_meeting_type_by_trigger",
    "format_recent_tasks_for_context",
]
