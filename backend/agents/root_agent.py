"""
Root Agent

This is the main orchestrator agent for the CareerRoguelike backend. It
coordinates all workflow agents using ADK's SequentialAgent pattern and
demonstrates multi-agent collaboration.

The root agent manages the complete game flow:
1. Interview workflow (interviewer → grader)
2. Task workflow (task generator → grader with retry → CV writer)
3. Event generation
4. Parallel task generation (demo)

This agent is used by the ADK Runner in the FastAPI Gateway to execute
the multi-agent workflow based on frontend requests.
"""

import logging
from google.adk.agents import SequentialAgent
from backend.agents.workflows import (
    interview_workflow,
    task_workflow,
    parallel_task_workflow
)
from backend.agents.event_generator_agent import event_generator_agent

# Configure logging to show agent transitions
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Root Agent - Main orchestrator for all workflows
# This agent coordinates the entire game flow by running sub-workflows in sequence.
# The actual execution order is controlled by the Gateway API based on player actions.
root_agent = SequentialAgent(
    name="CareerRoguelikeRootAgent",
    sub_agents=[
        interview_workflow,
        task_workflow,
        event_generator_agent,
        parallel_task_workflow  # Optional demo workflow
    ],
    description="Root orchestrator agent that coordinates all CareerRoguelike workflows"
)


# Log agent initialization
logger.info("Root agent initialized with workflows: interview, task, event, parallel_task")
logger.info("Root agent ready for execution via ADK Runner")


# Export root_agent for use by Runner in Gateway
__all__ = ['root_agent']
