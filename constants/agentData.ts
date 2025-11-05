
import { AgentConfig, AgentType } from '../types';

export const AGENT_DATA: { service: string; description: string; agents: AgentConfig[] }[] = [
  {
    service: 'Orchestrator Service (ADK Multi-Agent Brain)',
    description: 'Holds conversation state, routes work to specialist agents, and applies policies. Uses fast models for short-lived calls.',
    agents: [
      {
        id: AgentType.ORCHESTRATOR,
        name: 'Orchestrator Agent',
        description: 'The "Director" agent that decides which specialist agent should handle the current game state and what tools they can use.',
        model: 'Gemini 2.5 Flash',
        promptSnippet: `Input: session state, last event
Output: which agent to call next + tool call schema for that agent.`
      },
      {
        id: AgentType.INTERVIEWER,
        name: 'Interviewer Agent',
        description: 'Generates interview rounds, questions, follow-ups, and makes the final hiring decision based on performance.',
        model: 'Gemini 2.5 Pro',
        promptSnippet: `Generate interview rounds, follow-ups, and final decision.
Output: structured questions, expected solution patterns, scoring map.`
      },
      {
        id: AgentType.TASK_GENERATOR,
        name: 'Task Generator Agent',
        description: 'Produces concrete, solvable tasks (code, SQL, UX critique, sales scenario) with time pressure and acceptance criteria.',
        model: 'Gemini 2.5 Pro',
        promptSnippet: `You generate solvable, level-appropriate tasks for an iOS engineer.
Constraints:
- L1-L3: UIKit/SwiftUI basics, bugs, small refactors.
- L4-L6: concurrency, async/await, architecture, PR review.
- L7-L10: performance diagnosis, crash triage, complex feature breakdown.
Output schema:
{ "taskId": "...", "type":"code", "prompt":"...", "acceptanceCriteria":["..."], "expectedOutline":["..."], "difficulty": 1-10 }
Ensure deterministic seed: {{seed}}.`,
      },
      {
        id: AgentType.COACH,
        name: 'Coach Agent',
        description: 'Provides targeted learning advice, links to documentation, and suggests practice follow-up questions for players who are struggling.',
        model: 'Gemini 2.5 Flash',
        promptSnippet: `A player failed a task. Provide a helpful hint or a link to a relevant resource to help them learn and retry.`
      },
      {
        id: AgentType.SAFETY_AGENT,
        name: 'Safety/Anti-Cheat Agent',
        description: 'Red-teams game content for safety, detects copy-paste answers, abuse patterns, and applies rate-limits to prevent spam.',
        model: 'Gemini 2.5 Flash',
        promptSnippet: `Analyze the user's input for any violations of the safety policy or indications of cheating (e.g., direct copy-paste from a known source).`
      }
    ]
  },
  {
    service: 'Grader Worker (Worker Pool)',
    description: 'Handles heavy auto-grading and rubric comparisons for player submissions. Produces detailed feedback and numeric scores.',
    agents: [
       {
        id: AgentType.AUTO_GRADER,
        name: 'Auto-Grader Agent',
        description: 'Uses rubrics and exemplars to grade player answers, returning a score and constructive feedback. Can request hints from the Coach Agent.',
        model: 'Gemini 2.5 Pro',
        promptSnippet: `Grade the player's answer using the rubric and expectedOutline.
Return:
{ "score":0-100, "passed":true/false, "feedback":"3 bullets", "improvSteps":["..."], "hintIfRetry":"..." }
Be strict on correctness; add partial credit for reasoning.`,
      },
    ]
  },
  {
    service: 'Simulation Engine',
    description: 'Manages the world state, including company/day simulation, random events, team feedback synthesis, and the overall economy.',
    agents: [
      {
        id: AgentType.COMPANY_SIMULATOR,
        name: 'Company Simulator Agent',
        description: 'Synthesizes the daily work environment: stand-up updates, new blockers, pull request reviews, messages from stakeholders, and shifting project priorities.',
        model: 'Gemini Flash Lite',
        promptSnippet: `Generate a brief (1-2 sentence) update for a Level {L} {Profession} starting a new week. Mention a high-level goal, a potential blocker, or a team dynamic.`
      },
      {
        id: AgentType.EVENT_GENERATOR,
        name: 'Event Generator Agent',
        description: 'Injects surprise, branching events into the simulation. Outputs 2-4 choices for the player, each with different consequences.',
        model: 'Gemini 2.5 Flash',
        promptSnippet: `A random event occurs. Create a scenario (e.g., production incident, scope creep) and provide 3 distinct choices for the player to resolve it.`
      },
      {
        id: AgentType.EVENT_RESOLVER,
        name: 'Event Resolver Agent',
        description: 'Generates a narrative consequence based on the player\'s choice during an event, making the story more dynamic.',
        model: 'Gemini Flash Lite',
        promptSnippet: `An event occurred: {event}. The player chose: {choice}. Write a short, one-sentence consequence for this action.`
      },
      {
        id: AgentType.ECONOMY_AGENT,
        name: 'Economy Agent',
        description: 'Maintains the simulated job market state, including the number of open roles, the hiring bar difficulty curve, and salary expectations.',
        model: 'Gemini 2.5 Flash',
        promptSnippet: `Based on the current market heat ({{heat_index}}), adjust the hiring bar difficulty by a delta of ±(1-3) and generate a short market summary.`
      }
    ]
  },
  {
    service: 'CV Writer Service',
    description: 'Handles the generation and formatting of the player\'s curriculum vitae, including writing bullet points and exporting to PDF.',
    agents: [
      {
        id: AgentType.CV_AGENT,
        name: 'CV Agent',
        description: 'Updates the player\'s skills and achievements. Transforms completed tasks into quantifiable resume bullet points and handles PDF export.',
        model: 'Gemini 2.5 Pro',
        promptSnippet: `Transform completed tasks into 1-2 resume bullets with measurable impact.
Return:
{ "bullets":["• Reduced crash rate by 12% by ..."], "skillsGained":["SwiftUI","LLDB"], "levelDelta": -1|0|+1 }`,
      }
    ]
  }
];