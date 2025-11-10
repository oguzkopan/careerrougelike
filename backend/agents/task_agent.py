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
6. **CRITICAL**: Is SELF-CONTAINED and SOLVABLE without external documents or attachments
7. **CRITICAL**: Provides ALL necessary information within the task description itself

CRITICAL RULES - NEVER GENERATE MEETINGS:
- DO NOT create tasks that involve "meetings", "discussions with colleagues", "check-ins", or "1-on-1s"
- DO NOT create tasks with "participants", "attendees", or "meeting agenda"
- DO NOT create tasks that require real-time conversation, dialogue, or interactive discussion
- DO NOT use keywords: meeting, check-in, standup, discussion, attend, participants, colleagues, team sync
- Tasks MUST be INDIVIDUAL WORK that can be completed alone
- If collaboration is needed, frame it as "prepare a document for team review" NOT "attend a meeting"

GOOD TASK EXAMPLES (individual work):
✅ "Write a proposal for the new feature architecture"
✅ "Review the code and document your findings in a report"
✅ "Analyze the quarterly data and create a summary with recommendations"
✅ "Design a mockup for the user dashboard redesign"
✅ "Draft an email to stakeholders explaining the project timeline"

BAD TASK EXAMPLES (these are meetings, NOT tasks):
❌ "Weekly check-in with your manager"
❌ "Attend the team standup meeting"
❌ "Discuss project progress with stakeholders"
❌ "1-on-1 meeting with your direct report"
❌ "Participate in the sprint planning session"
❌ "Join the architecture review discussion"

IMPORTANT RULES:
- DO NOT reference "attached documents", "provided files", "see attachment", or similar
- DO NOT ask to review external P&IDs, diagrams, spreadsheets, or documents
- If a task needs data, INCLUDE the data directly in the description or requirements
- If a task needs code, INCLUDE the code snippet directly in the description
- Make tasks that can be answered with knowledge, reasoning, or creativity
- Tasks should be answerable based on the information provided in the task itself

Task types by job category:
- Engineer/Developer: Algorithm design, system architecture questions, debugging scenarios (with code provided), best practices, optimization strategies
- Analyst: Data interpretation (with data provided), SQL query writing, metric calculation, trend analysis
- Designer: Design critique, UX improvement suggestions, color scheme selection, layout planning
- Manager: Priority ranking, resource allocation decisions, conflict resolution scenarios, strategy planning
- Sales/Marketing: Campaign strategy, customer persona creation, messaging development, market positioning
- Operations: Process improvement ideas, efficiency optimization, workflow design, quality metrics

Difficulty scaling:
- Level 1-3: Simple, well-defined tasks (difficulty 1-3, XP 10-30)
- Level 4-7: Complex tasks requiring problem-solving (difficulty 4-7, XP 40-70)
- Level 8-10: Strategic, high-impact tasks (difficulty 8-10, XP 80-100)

TASK FORMAT TYPES (vary these to keep gameplay interesting):

1. TEXT_ANSWER (default): Open-ended question requiring written response
2. MULTIPLE_CHOICE: Question with 4 options, one correct answer
3. FILL_IN_BLANK: Paragraph or code with 3-5 blanks to fill
4. CODE_REVIEW: Code snippet with 2-4 bugs to identify
5. PRIORITIZATION: 5-8 items to rank by priority

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

GOOD TASK EXAMPLES (self-contained, solvable):

✅ GOOD - Process Engineer:
"Design a heat exchanger selection strategy for a new cooling system. The system needs to cool 1000 L/min of water from 80°C to 40°C. Ambient temperature is 25°C. Recommend the type of heat exchanger (shell-and-tube, plate, or air-cooled) and justify your choice based on efficiency, cost, and maintenance considerations."

✅ GOOD - Software Engineer:
"Review this Python function and identify potential issues:
```python
def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)
```
Identify at least 2 potential bugs or edge cases and suggest improvements."

✅ GOOD - Data Analyst:
"Analyze this sales data: Q1: $120K, Q2: $95K, Q3: $150K, Q4: $180K. Calculate the year-over-year growth rate, identify the trend, and provide 2-3 recommendations for Q1 of next year."

❌ BAD - References external documents:
"Review the attached P&ID diagram and identify discrepancies with the equipment list."

❌ BAD - Requires unavailable files:
"Analyze the provided Excel spreadsheet and create a summary report."

Make the task realistic, specific, and appropriate for the job and level.
Vary format_type to create diverse gameplay experiences.
Set task_type based on the job category to enable appropriate visualizations.
ALWAYS ensure tasks are self-contained and solvable with the information provided.""",
    description="Generates work tasks appropriate to the player's job",
    output_key="new_task"
)
