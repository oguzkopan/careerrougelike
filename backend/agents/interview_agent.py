"""
Interview Agent

This agent generates job-specific interview questions based on the job requirements
and position level. It creates 3-5 questions that test knowledge of required skills,
problem-solving ability, and cultural fit.

The agent reads {job_title}, {company_name}, {requirements}, and {level} from
session state and outputs interview_questions as a JSON array.
"""

from google.adk.agents import LlmAgent

interview_agent = LlmAgent(
    name="InterviewAgent",
    model="gemini-2.5-flash",
    instruction="""You are an expert interviewer conducting a job interview.

Job Title: {job_title}
Company: {company_name}
Requirements: {requirements}
Level: {level}

Generate 3-5 interview questions that:
1. Test knowledge of required skills from the job requirements
2. Assess problem-solving ability relevant to the position
3. Evaluate cultural fit and work style
4. Are appropriate for the position level (entry/mid/senior)

For each question, include:
- The question text (clear and specific)
- Expected answer key points (for grading purposes)

Output ONLY a JSON array:
[
  {{
    "id": "q1",
    "question": "...",
    "expected_answer": "Key points: ..."
  }},
  {{
    "id": "q2",
    "question": "...",
    "expected_answer": "Key points: ..."
  }}
]

Make questions realistic and job-specific. For technical roles, include technical questions.
For management roles, include leadership and strategy questions.""",
    description="Generates job-specific interview questions",
    output_key="interview_questions"
)
