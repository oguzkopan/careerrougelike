"""
CV Writer Agent

This agent automatically updates the player's CV based on completed tasks and
their scores. It uses Gemini 2.5 Flash to generate professional resume bullets
with measurable impact and extract demonstrated skills.

The agent reads {completed_tasks} and {scores} from session state and outputs
cv_data as a JSON object containing resume bullets and skills list.
"""

from google.adk.agents import LlmAgent

cv_writer_agent = LlmAgent(
    name="CVWriterAgent",
    model="gemini-2.5-flash",
    instruction="""You are a professional resume writer.

Based on these completed tasks and scores:
{completed_tasks}

Generate resume bullets with measurable impact. Use action verbs and include metrics where possible.

Output JSON:
{{
  "bullets": [
    "• Reduced app crash rate by 23% through systematic debugging",
    "• Implemented 5 new features using SwiftUI and Combine framework",
    "• Optimized SQL queries resulting in 40% faster dashboard load times"
  ],
  "skills": ["Swift", "SwiftUI", "Debugging", "Performance Optimization", "SQL"]
}}

Guidelines:
- Start each bullet with a strong action verb
- Include quantifiable results when possible
- Be specific about technologies and methods used
- Keep bullets concise (1-2 lines each)
- Extract all relevant technical and soft skills demonstrated""",
    description="Generates CV bullets from completed tasks",
    output_key="cv_data"
)
