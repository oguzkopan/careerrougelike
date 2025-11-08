"""
Meeting Evaluation Agent

This agent evaluates player participation in meetings and determines outcomes.
It assesses response quality, professionalism, and contribution to meeting objectives,
then generates constructive feedback and determines XP rewards and task generation.

The agent provides:
1. Participation scoring (0-100)
2. XP rewards based on performance (20-50 XP)
3. Constructive feedback (strengths and improvements)
4. Decision on whether to generate follow-up tasks
5. Context for task generation if applicable
"""

from google.adk.agents import LlmAgent
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional


meeting_evaluation_agent = LlmAgent(
    name="MeetingEvaluationAgent",
    model="gemini-2.0-flash-exp",
    instruction="""You are a meeting participation evaluator. Assess the player's contributions to the meeting and provide constructive feedback that helps them improve their workplace communication skills.

CONTEXT PROVIDED:
- Meeting Type: {meeting_type}
- Meeting Objective: {meeting_objective}
- Topics Discussed: {topics}
- Player Responses: {player_responses}
- AI Participant Reactions: {ai_reactions}
- Player Level: {player_level}
- Company Context: {company_context}

YOUR TASK:

Evaluate the player's meeting participation across multiple dimensions:
1. Relevance: Did responses address the topics and questions?
2. Professionalism: Was communication clear, respectful, and workplace-appropriate?
3. Contribution Quality: Did responses add value to the discussion?
4. Engagement: Did the player actively participate throughout?
5. Impact: Did contributions help achieve the meeting objective?

EVALUATION CRITERIA BY MEETING TYPE:

team_standup:
- Clarity of updates and status reports
- Identification of blockers and challenges
- Conciseness and respect for others' time
- Team collaboration and support

one_on_one:
- Openness and honesty in discussion
- Receptiveness to feedback
- Articulation of goals and challenges
- Professional relationship building

project_review:
- Technical accuracy and detail
- Problem-solving contributions
- Understanding of project context
- Constructive suggestions and solutions

stakeholder_presentation:
- Clarity of communication to non-technical audience
- Confidence and professionalism
- Handling of questions and concerns
- Results-oriented focus

performance_review:
- Self-awareness and reflection
- Goal-setting and growth mindset
- Receptiveness to feedback
- Professional maturity

SCORING RUBRIC (0-100):

90-100 (Exceptional):
- All responses highly relevant and insightful
- Excellent professionalism and communication
- Significant contributions that advanced discussion
- Proactive engagement and leadership
- Clear impact on meeting outcomes

75-89 (Strong):
- Most responses relevant and valuable
- Good professionalism and clarity
- Solid contributions to discussion
- Consistent engagement
- Positive impact on meeting

60-74 (Satisfactory):
- Responses generally relevant
- Adequate professionalism
- Some valuable contributions
- Participated when prompted
- Met basic meeting expectations

45-59 (Needs Improvement):
- Some responses off-topic or unclear
- Occasional professionalism issues
- Limited valuable contributions
- Minimal engagement
- Marginal impact on meeting

0-44 (Poor):
- Many responses irrelevant or inappropriate
- Professionalism concerns
- Little to no valuable contribution
- Disengaged or disruptive
- Negative or no impact on meeting

XP CALCULATION:

Base XP by meeting type:
- team_standup: 20-35 XP
- one_on_one: 25-40 XP
- project_review: 30-45 XP
- stakeholder_presentation: 30-45 XP
- performance_review: 35-50 XP

XP = Base_Min + (Score / 100) * (Base_Max - Base_Min)

Round to nearest 5 XP.

FEEDBACK GENERATION:

Strengths (2-3 points):
- Specific, actionable observations about what the player did well
- Reference actual responses or behaviors
- Be encouraging and specific
- Examples:
  * "You provided clear, detailed updates on your progress with the authentication feature"
  * "Your questions about timeline constraints showed good project awareness"
  * "You handled the challenging question about technical debt professionally"

Improvements (1-2 points):
- Constructive, actionable suggestions for growth
- Be specific but supportive
- Focus on skills that can be developed
- Frame positively (what to do, not just what not to do)
- Examples:
  * "Consider providing more specific timelines when discussing deliverables"
  * "Try to ask clarifying questions earlier in the discussion"
  * "You could strengthen your responses by connecting them to business impact"

AVOID:
- Generic feedback ("good job", "needs work")
- Harsh or discouraging language
- Focusing only on negatives
- Vague suggestions without actionable steps
- Comparing to others

TASK GENERATION DECISION:

Decide if the meeting should generate follow-up tasks based on:

Generate tasks (should_generate_tasks = true) when:
- Meeting type naturally produces action items (project_review, stakeholder_presentation)
- Specific deliverables or next steps were discussed
- Player's participation was strong enough to warrant new responsibilities
- Meeting objective included planning or problem-solving
- Score >= 60 (satisfactory or better)

Do NOT generate tasks when:
- Meeting type is primarily informational (team_standup, performance_review)
- No specific action items were discussed
- Player's participation was poor (score < 60)
- Meeting was cut short or incomplete
- Topics were purely retrospective or feedback-focused

Task Generation Context:
If generating tasks, provide 2-3 sentences describing:
- What specific work items emerged from the meeting
- What the player should focus on
- Any constraints or priorities mentioned
- Connection to meeting discussions

LEVEL-BASED EXPECTATIONS:

Level 1-3 (Entry-level):
- More lenient scoring
- Focus on effort and engagement
- Emphasize learning and growth
- Simpler task generation

Level 4-7 (Mid-level):
- Moderate expectations
- Balance between execution and strategy
- Expect some leadership in discussions
- More complex task generation

Level 8-10 (Senior):
- High expectations
- Strategic thinking and leadership
- Mentoring and guiding others
- High-impact task generation

OUTPUT FORMAT:

Generate ONLY a valid JSON object (no markdown, no extra text):
{{
  "score": 0-100,
  "xp_earned": 20-50,
  "strengths": [
    "Specific strength 1 with example",
    "Specific strength 2 with example",
    "Specific strength 3 with example (optional)"
  ],
  "improvements": [
    "Constructive suggestion 1",
    "Constructive suggestion 2 (optional)"
  ],
  "should_generate_tasks": true|false,
  "task_generation_context": "Context for task generation (2-3 sentences, or empty string if not generating tasks)",
  "evaluation_summary": "Brief 1-2 sentence overall assessment",
  "participation_level": "exceptional|strong|satisfactory|needs_improvement|poor"
}}

IMPORTANT RULES:
- Be fair and consistent in scoring
- Provide specific, actionable feedback
- Balance encouragement with constructive criticism
- Consider player level in expectations
- Make task generation decisions based on meeting context and performance
- Ensure feedback references actual player responses
- Maintain professional, supportive tone
- Focus on growth and development
- Be honest but kind
- Recognize effort even when results are mixed

RESPONSE QUALITY INDICATORS:

High Quality:
- Directly addresses the question or topic
- Provides specific details or examples
- Shows understanding of context
- Offers solutions or insights
- Demonstrates critical thinking
- Professional language and tone

Medium Quality:
- Generally relevant to topic
- Some detail but could be more specific
- Basic understanding shown
- Adequate professionalism
- Meets minimum expectations

Low Quality:
- Off-topic or tangential
- Vague or generic
- Misses key context
- Unprofessional or unclear
- Minimal effort or thought

ENGAGEMENT INDICATORS:

Strong Engagement:
- Responds to all topics
- Asks clarifying questions
- Builds on others' points
- Volunteers information
- Shows enthusiasm

Moderate Engagement:
- Responds when prompted
- Adequate participation
- Some interaction with others
- Meets basic requirements

Weak Engagement:
- Minimal responses
- Short or incomplete answers
- No questions or follow-up
- Appears disinterested

Remember: Your evaluation helps players improve their workplace communication skills. Be constructive, specific, and supportive while maintaining honest assessment standards.""",
    description="Evaluates player meeting participation and determines outcomes",
    output_key="evaluation_result"
)


def generate_evaluation_id() -> str:
    """Generate a unique evaluation ID."""
    return f"eval-{uuid.uuid4().hex[:8]}"


def calculate_xp_for_score(
    score: int,
    meeting_type: str,
    player_level: int
) -> int:
    """
    Calculate XP reward based on participation score and meeting type.
    
    Args:
        score: Participation score (0-100)
        meeting_type: Type of meeting
        player_level: Player's current level
    
    Returns:
        XP amount (20-50, rounded to nearest 5)
    """
    # Base XP ranges by meeting type
    xp_ranges = {
        'team_standup': (20, 35),
        'one_on_one': (25, 40),
        'project_review': (30, 45),
        'stakeholder_presentation': (30, 45),
        'performance_review': (35, 50)
    }
    
    base_min, base_max = xp_ranges.get(meeting_type, (25, 40))
    
    # Calculate XP based on score
    xp = base_min + (score / 100) * (base_max - base_min)
    
    # Bonus for higher level players (they get slightly more XP)
    if player_level >= 8:
        xp *= 1.1
    elif player_level >= 5:
        xp *= 1.05
    
    # Round to nearest 5
    xp = round(xp / 5) * 5
    
    # Ensure within bounds
    xp = max(20, min(50, int(xp)))
    
    return xp


def format_player_responses_for_context(
    player_responses: List[Dict[str, Any]],
    topics: List[Dict[str, Any]]
) -> str:
    """
    Format player responses with their corresponding topics for evaluation context.
    
    Args:
        player_responses: List of player response messages
        topics: List of topic dictionaries
    
    Returns:
        Formatted string of player responses with context
    """
    if not player_responses:
        return "No player responses recorded"
    
    formatted = []
    
    for i, response in enumerate(player_responses, 1):
        content = response.get('content', '')
        timestamp = response.get('timestamp', '')
        
        # Try to determine which topic this response relates to
        topic_context = "General discussion"
        # This is simplified - in practice, you'd track which topic each response belongs to
        
        formatted.append(f"Response {i}:\n{content}\n")
    
    return "\n".join(formatted)


def format_ai_reactions_for_context(
    ai_responses: List[Dict[str, Any]],
    player_responses: List[Dict[str, Any]]
) -> str:
    """
    Format AI reactions to player responses for evaluation context.
    
    Args:
        ai_responses: List of AI response messages
        player_responses: List of player response messages
    
    Returns:
        Formatted string of AI reactions
    """
    if not ai_responses:
        return "No AI reactions recorded"
    
    # Filter AI responses that reference the player
    relevant_reactions = [
        msg for msg in ai_responses
        if msg.get('references_player', False)
    ]
    
    if not relevant_reactions:
        return "No direct AI reactions to player responses"
    
    formatted = []
    for reaction in relevant_reactions:
        name = reaction.get('participant_name', 'Unknown')
        content = reaction.get('content', '')
        sentiment = reaction.get('sentiment', 'neutral')
        
        formatted.append(f"{name} ({sentiment}): {content}")
    
    return "\n\n".join(formatted)


def format_topics_for_context(topics: List[Dict[str, Any]]) -> str:
    """
    Format meeting topics for evaluation context.
    
    Args:
        topics: List of topic dictionaries
    
    Returns:
        Formatted string of topics
    """
    if not topics:
        return "No topics discussed"
    
    formatted = []
    for i, topic in enumerate(topics, 1):
        question = topic.get('question', '')
        context = topic.get('context', '')
        expected_points = topic.get('expected_points', [])
        
        formatted.append(f"Topic {i}: {question}")
        formatted.append(f"Context: {context}")
        if expected_points:
            formatted.append(f"Expected Points: {', '.join(expected_points)}")
        formatted.append("")
    
    return "\n".join(formatted)


def determine_participation_level(score: int) -> str:
    """
    Determine participation level category based on score.
    
    Args:
        score: Participation score (0-100)
    
    Returns:
        Participation level string
    """
    if score >= 90:
        return "exceptional"
    elif score >= 75:
        return "strong"
    elif score >= 60:
        return "satisfactory"
    elif score >= 45:
        return "needs_improvement"
    else:
        return "poor"


def should_generate_tasks_for_meeting(
    meeting_type: str,
    score: int,
    topics: List[Dict[str, Any]],
    meeting_objective: str
) -> bool:
    """
    Determine if meeting should generate follow-up tasks based on type and performance.
    
    Args:
        meeting_type: Type of meeting
        score: Participation score
        topics: List of topics discussed
        meeting_objective: Meeting objective
    
    Returns:
        True if tasks should be generated
    """
    # Don't generate tasks for poor performance
    if score < 60:
        return False
    
    # Meeting types that typically generate tasks
    task_generating_types = ['project_review', 'stakeholder_presentation']
    
    if meeting_type in task_generating_types:
        return True
    
    # Check if meeting objective or topics suggest action items
    action_keywords = ['implement', 'build', 'create', 'develop', 'fix', 'improve', 'deliver']
    
    objective_lower = meeting_objective.lower()
    if any(keyword in objective_lower for keyword in action_keywords):
        return True
    
    # Check topics for action-oriented content
    for topic in topics:
        topic_text = f"{topic.get('question', '')} {topic.get('context', '')}".lower()
        if any(keyword in topic_text for keyword in action_keywords):
            return True
    
    return False


def validate_evaluation_result(evaluation: Dict[str, Any]) -> bool:
    """
    Validate that the evaluation result meets requirements.
    
    Args:
        evaluation: Evaluation result dictionary
    
    Returns:
        True if valid, False otherwise
    """
    required_fields = [
        'score', 'xp_earned', 'strengths', 'improvements',
        'should_generate_tasks', 'task_generation_context'
    ]
    
    # Check required fields
    for field in required_fields:
        if field not in evaluation:
            return False
    
    # Validate score range
    if not isinstance(evaluation['score'], (int, float)) or not (0 <= evaluation['score'] <= 100):
        return False
    
    # Validate XP range
    if not isinstance(evaluation['xp_earned'], int) or not (20 <= evaluation['xp_earned'] <= 50):
        return False
    
    # Validate strengths (should have 2-3 items)
    if not isinstance(evaluation['strengths'], list) or not (2 <= len(evaluation['strengths']) <= 3):
        return False
    
    # Validate improvements (should have 1-2 items)
    if not isinstance(evaluation['improvements'], list) or not (1 <= len(evaluation['improvements']) <= 2):
        return False
    
    # Validate boolean field
    if not isinstance(evaluation['should_generate_tasks'], bool):
        return False
    
    # Validate task generation context
    if not isinstance(evaluation['task_generation_context'], str):
        return False
    
    # If generating tasks, context should not be empty
    if evaluation['should_generate_tasks'] and not evaluation['task_generation_context'].strip():
        return False
    
    return True


def post_process_evaluation_result(
    evaluation: Dict[str, Any],
    meeting_type: str,
    player_level: int,
    score_override: Optional[int] = None
) -> Dict[str, Any]:
    """
    Post-process the evaluation result to ensure consistency and add metadata.
    
    Args:
        evaluation: Raw evaluation result from agent
        meeting_type: Type of meeting
        player_level: Player's current level
        score_override: Optional score override for testing
    
    Returns:
        Processed evaluation result
    """
    # Add ID if not present
    if 'id' not in evaluation:
        evaluation['id'] = generate_evaluation_id()
    
    # Add timestamp
    if 'timestamp' not in evaluation:
        evaluation['timestamp'] = datetime.utcnow().isoformat()
    
    # Override score if provided (for testing)
    if score_override is not None:
        evaluation['score'] = score_override
    
    # Recalculate XP to ensure consistency
    evaluation['xp_earned'] = calculate_xp_for_score(
        evaluation['score'],
        meeting_type,
        player_level
    )
    
    # Ensure participation level is set
    if 'participation_level' not in evaluation:
        evaluation['participation_level'] = determine_participation_level(evaluation['score'])
    
    # Ensure evaluation summary exists
    if 'evaluation_summary' not in evaluation:
        level = evaluation['participation_level']
        evaluation['evaluation_summary'] = f"Your participation was {level}. Keep up the good work!"
    
    # Trim strengths and improvements to required lengths
    if len(evaluation['strengths']) > 3:
        evaluation['strengths'] = evaluation['strengths'][:3]
    
    if len(evaluation['improvements']) > 2:
        evaluation['improvements'] = evaluation['improvements'][:2]
    
    # Ensure task generation context is empty string if not generating tasks
    if not evaluation['should_generate_tasks']:
        evaluation['task_generation_context'] = ""
    
    return evaluation


def create_default_evaluation(
    meeting_type: str,
    player_level: int,
    reason: str = "Unable to evaluate"
) -> Dict[str, Any]:
    """
    Create a default evaluation when agent evaluation fails.
    
    Args:
        meeting_type: Type of meeting
        player_level: Player's current level
        reason: Reason for default evaluation
    
    Returns:
        Default evaluation dictionary
    """
    default_score = 70  # Satisfactory default
    
    return {
        'id': generate_evaluation_id(),
        'score': default_score,
        'xp_earned': calculate_xp_for_score(default_score, meeting_type, player_level),
        'strengths': [
            "You participated in the meeting and shared your thoughts",
            "You engaged with the discussion topics"
        ],
        'improvements': [
            "Continue to develop your communication skills in future meetings"
        ],
        'should_generate_tasks': False,
        'task_generation_context': "",
        'evaluation_summary': f"Meeting participation recorded. {reason}",
        'participation_level': 'satisfactory',
        'timestamp': datetime.utcnow().isoformat()
    }


def extract_key_contributions(
    player_responses: List[Dict[str, Any]],
    topics: List[Dict[str, Any]]
) -> List[str]:
    """
    Extract key contributions from player responses for summary.
    
    Args:
        player_responses: List of player response messages
        topics: List of topics discussed
    
    Returns:
        List of key contribution summaries
    """
    contributions = []
    
    for response in player_responses:
        content = response.get('content', '')
        # Extract first sentence or first 100 characters as summary
        if '.' in content:
            summary = content.split('.')[0] + '.'
        else:
            summary = content[:100] + '...' if len(content) > 100 else content
        
        contributions.append(summary)
    
    return contributions


def calculate_response_quality_metrics(
    player_responses: List[Dict[str, Any]],
    topics: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Calculate metrics about response quality for evaluation context.
    
    Args:
        player_responses: List of player response messages
        topics: List of topics discussed
    
    Returns:
        Dictionary of quality metrics
    """
    if not player_responses:
        return {
            'total_responses': 0,
            'avg_response_length': 0,
            'responses_per_topic': 0,
            'engagement_level': 'none'
        }
    
    total_responses = len(player_responses)
    total_length = sum(len(r.get('content', '')) for r in player_responses)
    avg_length = total_length / total_responses if total_responses > 0 else 0
    
    responses_per_topic = total_responses / len(topics) if topics else 0
    
    # Determine engagement level
    if responses_per_topic >= 3:
        engagement = 'high'
    elif responses_per_topic >= 2:
        engagement = 'medium'
    elif responses_per_topic >= 1:
        engagement = 'low'
    else:
        engagement = 'minimal'
    
    return {
        'total_responses': total_responses,
        'avg_response_length': int(avg_length),
        'responses_per_topic': round(responses_per_topic, 1),
        'engagement_level': engagement
    }


__all__ = [
    "meeting_evaluation_agent",
    "generate_evaluation_id",
    "calculate_xp_for_score",
    "format_player_responses_for_context",
    "format_ai_reactions_for_context",
    "format_topics_for_context",
    "determine_participation_level",
    "should_generate_tasks_for_meeting",
    "validate_evaluation_result",
    "post_process_evaluation_result",
    "create_default_evaluation",
    "extract_key_contributions",
    "calculate_response_quality_metrics",
]
