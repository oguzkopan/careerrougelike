"""
Agent Workflows

This module defines composite workflows that orchestrate multiple agents using
ADK's SequentialAgent, ParallelAgent, and LoopAgent patterns. These workflows
demonstrate advanced multi-agent collaboration for the CareerRoguelike game.

Workflows:
- interview_workflow: Sequential interview → grading flow
- task_workflow: Task generation → grading with retry → CV update
- parallel_task_workflow: Parallel task generation for all professions (demo)
"""

from google.adk.agents import SequentialAgent, ParallelAgent, LoopAgent, LlmAgent
from backend.agents.interviewer_agent import interviewer_agent
from backend.agents.grader_agent import grader_agent
from backend.agents.task_generator_agent import task_generator_agent
from backend.agents.cv_writer_agent import cv_writer_agent


# Interview Workflow
# This workflow demonstrates a simple sequential pattern where the interviewer
# generates questions and the grader evaluates the player's answers.
interview_workflow = SequentialAgent(
    name="InterviewWorkflow",
    sub_agents=[
        interviewer_agent,
        grader_agent
    ],
    description="Sequential workflow for conducting interviews: generates questions then grades answers"
)


# Task Workflow with Retry Logic
# This workflow demonstrates the LoopAgent pattern for retry logic. The grader
# agent is wrapped in a LoopAgent that allows up to 2 attempts at grading a task.
# If the player fails on the first attempt, they get one retry with feedback.
# The workflow then updates the CV based on completed tasks.

# Wrap grader_agent in LoopAgent for retry mechanism
loop_grader = LoopAgent(
    name="LoopGraderAgent",
    sub_agent=grader_agent,
    max_iterations=2,
    description="Grader with retry logic - allows up to 2 attempts at task completion"
)

# Task workflow: generate task → grade with retry → update CV
task_workflow = SequentialAgent(
    name="TaskWorkflow",
    sub_agents=[
        task_generator_agent,
        loop_grader,
        cv_writer_agent
    ],
    description="Sequential workflow for task completion: generates task, grades with retry logic, then updates CV"
)


# Parallel Task Generation Workflow (Demo)
# This workflow demonstrates the ParallelAgent pattern by generating tasks for
# all 4 professions concurrently. This is primarily for demonstration purposes
# to showcase ADK's parallel execution capabilities and is faster than sequential
# generation when creating multiple tasks at once.

# Create 4 instances of task_generator_agent, one for each profession
# Note: In practice, these would be configured with different profession contexts
ios_task_generator = LlmAgent(
    name="iOSTaskGenerator",
    model="gemini-2.5-flash",
    instruction=task_generator_agent.instruction,
    description="Generates tasks for iOS Engineer profession",
    output_key="ios_task"
)

data_analyst_task_generator = LlmAgent(
    name="DataAnalystTaskGenerator",
    model="gemini-2.5-flash",
    instruction=task_generator_agent.instruction,
    description="Generates tasks for Data Analyst profession",
    output_key="data_analyst_task"
)

designer_task_generator = LlmAgent(
    name="DesignerTaskGenerator",
    model="gemini-2.5-flash",
    instruction=task_generator_agent.instruction,
    description="Generates tasks for Product Designer profession",
    output_key="designer_task"
)

sales_task_generator = LlmAgent(
    name="SalesTaskGenerator",
    model="gemini-2.5-flash",
    instruction=task_generator_agent.instruction,
    description="Generates tasks for Sales Associate profession",
    output_key="sales_task"
)

# Parallel workflow that runs all 4 task generators concurrently
parallel_task_workflow = ParallelAgent(
    name="ParallelTaskWorkflow",
    sub_agents=[
        ios_task_generator,
        data_analyst_task_generator,
        designer_task_generator,
        sales_task_generator
    ],
    description="Parallel workflow for generating tasks for all 4 professions concurrently - demonstrates ParallelAgent pattern"
)
