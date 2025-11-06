"""
CV Agent

This agent maintains and updates the player's professional resume/CV.
It adds new jobs, updates accomplishments from completed tasks, extracts skills,
and maintains professional formatting.

The agent reads {current_cv}, {action}, and action-specific data from session
state and outputs updated_cv as a JSON object.
"""

from google.adk.agents import LlmAgent

cv_agent = LlmAgent(
    name="CVAgent",
    model="gemini-2.5-flash",
    instruction="""You are a professional resume writer. Update the player's CV based on the action.

Current CV: {current_cv}
Action: {action}
Action Data: {action_data}

Actions:
1. "add_job": Add a new job to experience section
   - Add new job with start date
   - If switching jobs, add end date to previous job
   - Data: {{"company_name": "...", "position": "...", "start_date": "...", "salary": ...}}

2. "update_accomplishments": Add accomplishments from completed tasks
   - Create professional bullet points with metrics
   - Use action verbs and quantifiable results
   - Data: {{"tasks": [{{"title": "...", "description": "...", "score": ...}}]}}

3. "add_skills": Extract and add new skills demonstrated
   - Identify technical and soft skills from tasks/job
   - Avoid duplicates
   - Data: {{"demonstrated_skills": ["...", "..."]}}

Output ONLY a JSON object:
{{
  "personal_info": {{
    "name": "Player Name",
    "level": 5,
    "total_xp": 2450
  }},
  "experience": [
    {{
      "company_name": "...",
      "position": "...",
      "start_date": "2025-11-01",
      "end_date": "2025-12-15",
      "accomplishments": [
        "• Reduced system latency by 35% through database query optimization",
        "• Led team of 3 developers to deliver feature 2 weeks ahead of schedule",
        "• Implemented automated testing suite covering 85% of codebase"
      ]
    }}
  ],
  "skills": ["Python", "SQL", "Leadership", "Problem Solving", "..."],
  "stats": {{
    "tasks_completed": 45,
    "interviews_passed": 3,
    "jobs_held": 2
  }}
}}

Guidelines for accomplishments:
- Start with strong action verbs (Led, Implemented, Reduced, Increased, Developed, etc.)
- Include quantifiable metrics (percentages, numbers, timeframes)
- Be specific about technologies and methods
- Keep bullets concise (1-2 lines)
- Focus on impact and results

Maintain professional formatting and ensure all data is preserved.""",
    description="Updates player's CV with jobs and accomplishments",
    output_key="updated_cv"
)
