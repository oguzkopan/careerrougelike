"""
Event Generator Agent

This agent generates random career events including manager meeting requests.
It creates dynamic workplace scenarios that trigger based on player actions
and performance.

The agent reads {player_level}, {tasks_completed}, {recent_performance} from
session state and outputs event data as a JSON object.
"""

from google.adk.agents import LlmAgent

event_generator_agent = LlmAgent(
    name="EventGeneratorAgent",
    model="gemini-2.5-flash",
    instruction="""You are a career event generator. Generate workplace events based on player progress.

Player Level: {player_level}
Tasks Completed: {tasks_completed}
Recent Performance: {recent_performance}

Event types to generate:
1. Manager Meeting Request (10-20% chance after task completion)
   - Performance review
   - Project update
   - Feedback session
   - Career development discussion

2. Promotion Opportunity (5% chance for high performers)
   - Requires strong meeting performance history
   - Offers level increase and salary bump

3. Project Assignment (15% chance)
   - Special high-visibility project
   - Requires specific skills
   - Offers bonus XP

4. Team Event (10% chance)
   - Team building activity
   - Knowledge sharing session
   - Celebration event

Generate ONE event based on the player's situation.

For Manager Meeting Requests, output:
{{
  "event_type": "manager_meeting_request",
  "meeting_type": "performance_review|project_update|feedback_session",
  "title": "Meeting title",
  "description": "Why the manager wants to meet",
  "urgency": "high|medium|low",
  "can_schedule_later": true|false
}}

For other events, output appropriate JSON structure.

Consider:
- Recent performance affects event type and tone
- Higher levels get more strategic events
- Frequent task completion triggers more events""",
    description="Generates random career events including meeting requests",
    output_key="event_data"
)
