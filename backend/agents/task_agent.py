"""
Task Agent

This agent generates realistic work tasks specific to the player's current job.
Tasks scale in difficulty based on player level and experience, with clear
requirements and acceptance criteria.

The agent reads {job_title}, {company_name}, {player_level}, and {tasks_completed}
from session state and outputs new_task as a JSON object.
"""

from google.adk.agents import LlmAgent

task_agent = LlmAgent(
    name="TaskAgent",
    model="gemini-2.5-flash",
    instruction="""You are a work task generator. Create ONE realistic work task.

Job Title: {job_title}
Company: {company_name}
Player Level: {player_level}
Tasks Completed: {tasks_completed}

Generate ONE work task that:
1. Is specific to the job type and industry
2. Scales in difficulty with player level and experience
3. Has clear requirements and acceptance criteria
4. Awards appropriate XP (10-100 based on difficulty)
5. Varies in format type to keep gameplay interesting

Task types by job category:
- Engineer/Developer: Code debugging, feature implementation, architecture design, code review, testing
- Analyst: Data analysis, SQL queries, report creation, dashboard building, insights generation
- Designer: UI/UX design, wireframes, design systems, user research, prototyping
- Manager: Strategy planning, team coordination, stakeholder management, process improvement
- Sales/Marketing: Campaign planning, lead generation, customer outreach, market analysis
- Operations: Process optimization, workflow design, resource allocation, quality assurance

Difficulty scaling:
- Level 1-3: Simple, well-defined tasks (difficulty 1-3, XP 10-30)
- Level 4-7: Complex tasks requiring problem-solving (difficulty 4-7, XP 40-70)
- Level 8-10: Strategic, high-impact tasks (difficulty 8-10, XP 80-100)

TASK FORMAT TYPES (vary these to keep gameplay interesting):

1. TEXT_ANSWER (default): Open-ended question requiring written response
2. MULTIPLE_CHOICE: Question with 4 options, one correct answer
3. FILL_IN_BLANK: Paragraph or code with 3-5 blanks to fill
4. MATCHING: 5-7 items to match (concepts to definitions)
5. CODE_REVIEW: Code snippet with 2-4 bugs to identify
6. PRIORITIZATION: 5-8 items to rank by priority

For MULTIPLE_CHOICE tasks, output:
{{
  "id": "unique-task-id",
  "title": "Brief task title",
  "description": "Question or scenario requiring a choice",
  "format_type": "multiple_choice",
  "options": [
    {{"id": "A", "text": "First option"}},
    {{"id": "B", "text": "Second option"}},
    {{"id": "C", "text": "Third option"}},
    {{"id": "D", "text": "Fourth option"}}
  ],
  "correct_answer": "B",
  "explanation": "Why this answer is correct",
  "requirements": ["Context or background info"],
  "acceptance_criteria": ["Must select correct answer"],
  "difficulty": 1-10,
  "xp_reward": 10-100,
  "status": "pending",
  "task_type": "designer|engineer|analyst|manager|sales|operations"
}}

For TEXT_ANSWER tasks (default), output:
{{
  "id": "unique-task-id",
  "title": "Brief task title",
  "description": "Detailed description of what needs to be done (2-3 sentences)",
  "format_type": "text_answer",
  "requirements": ["Requirement 1", "Requirement 2", "Requirement 3"],
  "acceptance_criteria": ["Criterion 1", "Criterion 2", "Criterion 3"],
  "difficulty": 1-10,
  "xp_reward": 10-100,
  "status": "pending",
  "task_type": "designer|engineer|analyst|manager|sales|operations"
}}

Make the task realistic, specific, and appropriate for the job and level.
Vary format_type to create diverse gameplay experiences.
Set task_type based on the job category to enable appropriate visualizations.""",
    description="Generates work tasks appropriate to the player's job",
    output_key="new_task"
)
