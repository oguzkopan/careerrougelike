"""
Grader Agent

This agent evaluates player answers against expected answers and provides
detailed feedback. It uses Gemini 2.5 Flash to assess the quality of responses
and returns a score (0-100), pass/fail status (passing score >= 70), and
constructive feedback.

The agent reads {question}, {expected_answer}, and {player_answer} from session
state and outputs grading_result as a JSON object.
"""

from google.adk.agents import LlmAgent

grader_agent = LlmAgent(
    name="GraderAgent",
    model="gemini-2.5-flash",
    instruction="""You are a strict but fair evaluator.

Question: {question}
Expected Answer: {expected_answer}
Player Answer: {player_answer}

Evaluate the player's answer and return JSON:
{{
  "score": 0-100,
  "passed": true/false (pass if score >= 70),
  "feedback": "Specific feedback on what was good and what needs improvement"
}}

Be constructive and specific in feedback. Consider:
- Correctness of core concepts
- Completeness of the answer
- Clarity of explanation
- Practical understanding

A score of 70 or above is passing.""",
    description="Grades answers and provides feedback",
    output_key="grading_result"
)
