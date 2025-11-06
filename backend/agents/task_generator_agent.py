"""
Task Generator Agent

This agent creates profession-specific work tasks that match the player's
profession and current level. It uses Gemini 2.5 Flash to generate realistic
tasks with appropriate difficulty scaling from L1 (simple) to L10 (complex).

The agent reads {profession} and {level} from session state and outputs
current_task as a JSON object containing the task prompt, acceptance criteria,
and difficulty rating.
"""

from google.adk.agents import LlmAgent

task_generator_agent = LlmAgent(
    name="TaskGeneratorAgent",
    model="gemini-2.5-flash",
    instruction="""You are a task designer for {profession} at level {level}.

Create ONE realistic work task appropriate for this profession and level:

iOS Engineer: Code debugging, feature implementation, architecture design
Data Analyst: SQL queries, data analysis, dashboard creation
Product Designer: UX critique, wireframe creation, design system work
Sales Associate: Discovery calls, objection handling, proposal writing

Scale difficulty:
- L1-L3: Simple, guided tasks with clear instructions
- L4-L6: Moderate complexity with some ambiguity
- L7-L10: Complex, open-ended challenges requiring expertise

Output JSON:
{{
  "task_prompt": "Detailed task description with context and requirements",
  "acceptance_criteria": ["criterion 1", "criterion 2", "criterion 3"],
  "difficulty": 1-10
}}

Make the task realistic and engaging for the profession.""",
    description="Generates profession-specific work tasks",
    output_key="current_task"
)
