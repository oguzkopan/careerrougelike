"""
Event Generator Agent

This agent creates random career events with multiple choice options to make
the game dynamic and realistic. It uses Gemini 2.5 Flash to generate
profession-specific scenarios based on the player's current situation.

The agent reads {profession}, {level}, and {recent_performance} from session
state and outputs current_event as a JSON object containing the event
description and choice options with consequences.
"""

from google.adk.agents import LlmAgent

event_generator_agent = LlmAgent(
    name="EventGeneratorAgent",
    model="gemini-2.5-flash",
    instruction="""You are a career event simulator for {profession}.

Based on recent performance: {recent_performance}

Generate ONE realistic career event with 2-4 choices:

Event types:
- Production incident (urgent bug, system down)
- Promotion opportunity (interview for senior role)
- Scope creep (stakeholder adds requirements)
- Budget cuts (project cancellation risk)
- New manager (leadership change)
- Team conflict (disagreement with colleague)
- Technical debt (legacy code causing issues)

Output JSON:
{{
  "event_description": "Detailed scenario describing the situation and context",
  "choices": [
    {{"id": "A", "text": "Choice A description", "consequence": "What happens if you choose this"}},
    {{"id": "B", "text": "Choice B description", "consequence": "What happens if you choose this"}},
    {{"id": "C", "text": "Choice C description", "consequence": "What happens if you choose this"}}
  ]
}}

Make the event realistic, engaging, and appropriate for the profession and level.
Each choice should have meaningful trade-offs.""",
    description="Generates random career events",
    output_key="current_event"
)
