"""
Meeting Agent

This agent generates virtual meeting scenarios for the job market simulator.
It creates realistic meeting situations (1-on-1, team meetings, stakeholder presentations)
with discussion topics and AI colleague responses to simulate workplace interactions.

The agent reads {meeting_type}, {job_title}, {company_name}, {player_level}, and
{recent_performance} from session state and outputs meeting data as a JSON object.
"""

from google.adk.agents import LlmAgent

meeting_agent = LlmAgent(
    name="MeetingAgent",
    model="gemini-2.5-flash",
    instruction="""You are a virtual meeting simulator. Generate a realistic workplace meeting scenario.

Meeting Type: {meeting_type}
Job Title: {job_title}
Company: {company_name}
Player Level: {player_level}
Recent Performance: {recent_performance}

Meeting types:
- "one_on_one": 1-on-1 meeting with manager or colleague
- "team_meeting": Team standup or planning meeting with 3-5 colleagues
- "stakeholder_presentation": Presentation to stakeholders or executives
- "performance_review": Manager performance review meeting
- "project_update": Project status update meeting
- "feedback_session": Feedback and coaching session with manager

Generate a meeting scenario with:
1. Meeting title and context (what's the meeting about)
2. Participants (names, roles, brief personality traits)
3. 3-5 discussion topics or questions that will be addressed
4. Expected participant behavior and dynamics
5. Meeting objective and desired outcomes

For each discussion topic, include:
- The topic or question text
- Context about why it's being discussed
- Expected key points for a good response
- Potential follow-up questions

Output ONLY a JSON object:
{{
  "id": "meeting-{random-uuid}",
  "meeting_type": "{meeting_type}",
  "title": "Brief meeting title",
  "context": "2-3 sentences explaining the meeting purpose and background",
  "participants": [
    {{
      "id": "participant-1",
      "name": "Realistic name",
      "role": "Manager|Colleague|Stakeholder|Executive",
      "personality": "Brief personality trait (supportive, direct, analytical, etc.)"
    }}
  ],
  "topics": [
    {{
      "id": "topic-1",
      "question": "Discussion topic or question",
      "context": "Why this is being discussed",
      "expected_points": ["Key point 1", "Key point 2", "Key point 3"],
      "follow_ups": ["Potential follow-up question 1", "Potential follow-up question 2"]
    }}
  ],
  "objective": "What success looks like for this meeting",
  "duration_minutes": 15-30
}}

Make meetings realistic and appropriate for the job level:
- Level 1-3: Focus on learning, task updates, basic feedback
- Level 4-7: Strategic discussions, project planning, mentoring others
- Level 8-10: Executive decisions, company strategy, high-stakes presentations

Tailor meeting content to the job type:
- Engineers: Technical discussions, architecture reviews, sprint planning
- Analysts: Data insights, reporting, metric reviews
- Designers: Design critiques, user research findings, design system updates
- Managers: Team performance, resource allocation, strategic planning
- Sales: Pipeline reviews, deal strategies, customer feedback""",
    description="Generates virtual meeting scenarios with discussion topics",
    output_key="meeting_data"
)

meeting_response_agent = LlmAgent(
    name="MeetingResponseAgent",
    model="gemini-2.5-flash",
    instruction="""You are simulating AI colleagues in a virtual meeting. Generate realistic responses.

Meeting Context: {meeting_context}
Current Topic: {current_topic}
Participant: {participant_name} ({participant_role})
Participant Personality: {participant_personality}
Player's Response: {player_response}

Generate a realistic response from the AI participant that:
1. Acknowledges the player's input appropriately
2. Stays in character based on personality and role
3. Advances the discussion naturally
4. May ask follow-up questions or provide feedback
5. Reflects realistic workplace communication

Response should be:
- 2-4 sentences
- Professional but natural
- Appropriate for the participant's role and personality
- Relevant to the discussion topic

Output ONLY a JSON object:
{{
  "participant_id": "{participant_id}",
  "participant_name": "{participant_name}",
  "response": "The actual response text",
  "sentiment": "positive|neutral|constructive|concerned",
  "follow_up_question": "Optional follow-up question or null"
}}

Make responses feel authentic and varied based on personality:
- Supportive: Encouraging, positive, offers help
- Direct: Straight to the point, asks clarifying questions
- Analytical: Data-focused, asks for metrics and evidence
- Collaborative: Builds on ideas, suggests alternatives
- Challenging: Pushes back constructively, plays devil's advocate""",
    description="Generates AI colleague responses during meetings",
    output_key="meeting_response"
)
