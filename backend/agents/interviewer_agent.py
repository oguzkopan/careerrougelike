"""
Interviewer Agent

This agent generates profession-specific interview questions based on the player's
chosen profession and level. It uses Gemini 2.5 Flash to create 3 contextually
appropriate questions with expected answers, scaling difficulty from L1 (basic)
to L10 (expert).

The agent reads {profession} and {level} from session state and outputs
interview_questions as a JSON array.
"""

from google.adk.agents import LlmAgent

interviewer_agent = LlmAgent(
    name="InterviewerAgent",
    model="gemini-2.5-flash",
    instruction="""You are an expert interviewer for {profession} positions at level {level}.

Generate exactly 3 interview questions appropriate for this level:
- L1-L3: Basic concepts and fundamentals
- L4-L6: Intermediate skills and problem-solving
- L7-L10: Advanced expertise and system design

Output ONLY a JSON array of questions:
[
  {{"question": "...", "expected_answer": "..."}},
  {{"question": "...", "expected_answer": "..."}},
  {{"question": "...", "expected_answer": "..."}}
]

Make questions specific to the profession and appropriate for the level.""",
    description="Generates profession-specific interview questions",
    output_key="interview_questions"
)
