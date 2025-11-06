"""
Workflow Orchestrator

This module orchestrates multiple AI agents to handle the job market simulator flows.
It uses ADK's Runner to execute agents and manages state transitions, error handling,
and retry logic for agent failures.

The orchestrator coordinates:
- Job generation (Job Agent)
- Interview question generation (Interview Agent)
- Interview answer grading (Grader Agent)
- Work task generation (Task Agent)
- Task solution grading (Grader Agent)
- CV updates (CV Agent)
"""

import logging
import json
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from shared.config import GOOGLE_API_KEY, USE_VERTEX_AI

logger = logging.getLogger(__name__)


class WorkflowOrchestrator:
    """
    Orchestrates AI agents for the job market simulator.
    
    This class manages the execution of multiple AI agents using Gemini API directly,
    handles state management, implements retry logic, and provides error handling
    for agent failures.
    """
    
    def __init__(self):
        """Initialize the workflow orchestrator."""
        # Configure Gemini API
        if not USE_VERTEX_AI and GOOGLE_API_KEY:
            genai.configure(api_key=GOOGLE_API_KEY)
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            logger.info("WorkflowOrchestrator initialized with Gemini API")
        else:
            # Use Vertex AI
            from vertexai.generative_models import GenerativeModel
            self.model = GenerativeModel('gemini-2.0-flash-exp')
            logger.info("WorkflowOrchestrator initialized with Vertex AI")
    
    async def generate_jobs(
        self,
        session_id: str,
        player_level: int,
        count: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Generate job listings using the Job Agent.
        
        Args:
            session_id: Unique session identifier
            player_level: Player's current level (1-10)
            count: Number of jobs to generate (default: 10)
        
        Returns:
            List of job listing dictionaries
        
        Raises:
            Exception: If job generation fails after retries
        """
        logger.info(f"Generating {count} jobs for session {session_id}, level {player_level}")
        
        try:
            # Prepare prompt for job generation
            level_desc = "entry-level" if player_level <= 3 else ("mid-level" if player_level <= 7 else "senior")
            
            prompt = f"""You are a job market simulator. Generate {count} realistic job listings for a player at level {player_level} ({level_desc}).

Industries: Tech, Finance, Healthcare, Retail, Education, Manufacturing, Media, Consulting

For each job, create:
1. Company name (realistic, varied across industries)
2. Position title (appropriate for player level)
3. Location and job type (remote/hybrid/onsite)
4. Salary range (market-appropriate for level and industry)
5. Requirements (3-5 items with specific skills)
6. Responsibilities (3-5 items describing daily work)
7. Benefits (2-4 items like health insurance, 401k, PTO)
8. Job description (2-3 paragraphs explaining the role and company)

Level mapping:
- Level 1-3: Entry-level positions (Junior, Associate, Entry-Level)
- Level 4-7: Mid-level positions (Senior, Lead, Staff)
- Level 8-10: Senior positions (Principal, Director, VP, Senior Director)

Output ONLY a JSON array (no markdown, no explanation):
[
  {{
    "company_name": "...",
    "position": "...",
    "location": "...",
    "job_type": "remote|hybrid|onsite",
    "salary_range": {{"min": 50000, "max": 80000}},
    "level": "entry|mid|senior",
    "requirements": ["...", "...", "..."],
    "responsibilities": ["...", "...", "..."],
    "benefits": ["...", "..."],
    "description": "..."
  }}
]

Make each job unique with varied companies, positions, and industries. Ensure salary ranges are realistic for the level."""
            
            # Run the agent with retry logic
            result = await self._run_agent_with_retry(
                agent_name="JobAgent",
                prompt=prompt,
                output_key="job_listings",
                max_retries=3
            )
            
            # Extract job listings from result
            job_listings = result.get("job_listings", [])
            if not isinstance(job_listings, list):
                job_listings = [job_listings] if job_listings else []
            
            logger.info(f"Successfully generated {len(job_listings)} jobs")
            return job_listings
            
        except Exception as e:
            logger.error(f"Failed to generate jobs: {e}")
            raise Exception(f"Job generation failed: {str(e)}")
    
    async def conduct_interview(
        self,
        session_id: str,
        job_title: str,
        company_name: str,
        requirements: List[str],
        level: str
    ) -> List[Dict[str, Any]]:
        """
        Generate interview questions using the Interview Agent.
        
        Args:
            session_id: Unique session identifier
            job_title: Position title for the job
            company_name: Name of the company
            requirements: List of job requirements
            level: Job level (entry/mid/senior)
        
        Returns:
            List of interview question dictionaries
        
        Raises:
            Exception: If interview generation fails after retries
        """
        logger.info(f"Conducting interview for {job_title} at {company_name}")
        
        try:
            # Prepare session state
            session_state = {
                "job_title": job_title,
                "company_name": company_name,
                "requirements": ", ".join(requirements),
                "level": level
            }
            
            # Run the interview agent
            result = await self._run_agent_with_retry(
                agent=interview_agent,
                session_id=session_id,
                session_state=session_state,
                max_retries=3
            )
            
            # Extract questions
            questions = self._parse_json_output(
                result.get("interview_questions", "[]"),
                default=[]
            )
            
            logger.info(f"Generated {len(questions)} interview questions")
            return questions
            
        except Exception as e:
            logger.error(f"Failed to conduct interview: {e}")
            raise Exception(f"Interview generation failed: {str(e)}")

    async def grade_interview(
        self,
        session_id: str,
        questions: List[Dict[str, Any]],
        answers: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Grade interview answers using the Grader Agent.
        
        Evaluates each answer against the expected answer and calculates
        an overall score and pass/fail status.
        
        Args:
            session_id: Unique session identifier
            questions: List of question dictionaries with expected answers
            answers: Dictionary mapping question IDs to player answers
        
        Returns:
            Dictionary with overall score, pass/fail status, and feedback per question
        
        Raises:
            Exception: If grading fails after retries
        """
        logger.info(f"Grading interview for session {session_id}")
        
        try:
            feedback_list = []
            total_score = 0
            
            # Grade each answer
            for question in questions:
                question_id = question.get("id")
                question_text = question.get("question")
                expected_answer = question.get("expected_answer", "")
                player_answer = answers.get(question_id, "")
                
                # Prepare session state for grading
                session_state = {
                    "question": question_text,
                    "expected_answer": expected_answer,
                    "player_answer": player_answer
                }
                
                # Run grader agent
                result = await self._run_agent_with_retry(
                    agent=grader_agent,
                    session_id=f"{session_id}_q{question_id}",
                    session_state=session_state,
                    max_retries=2
                )
                
                # Parse grading result
                grading = self._parse_json_output(
                    result.get("grading_result", "{}"),
                    default={}
                )
                
                score = grading.get("score", 0)
                feedback = grading.get("feedback", "No feedback provided")
                
                feedback_list.append({
                    "question": question_text,
                    "answer": player_answer,
                    "score": score,
                    "feedback": feedback
                })
                
                total_score += score
            
            # Calculate overall results
            num_questions = len(questions)
            overall_score = total_score / num_questions if num_questions > 0 else 0
            passed = overall_score >= 70
            
            result = {
                "passed": passed,
                "overall_score": round(overall_score, 2),
                "feedback": feedback_list
            }
            
            logger.info(f"Interview graded: score={overall_score:.2f}, passed={passed}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to grade interview: {e}")
            raise Exception(f"Interview grading failed: {str(e)}")
    
    async def generate_task(
        self,
        session_id: str,
        job_title: str,
        company_name: str,
        player_level: int,
        tasks_completed: int
    ) -> Dict[str, Any]:
        """
        Generate a work task using the Task Agent.
        
        Args:
            session_id: Unique session identifier
            job_title: Player's current job title
            company_name: Player's current company
            player_level: Player's current level
            tasks_completed: Number of tasks completed so far
        
        Returns:
            Task dictionary with title, description, requirements, etc.
        
        Raises:
            Exception: If task generation fails after retries
        """
        logger.info(f"Generating task for {job_title} at {company_name}")
        
        try:
            # Prepare session state
            session_state = {
                "job_title": job_title,
                "company_name": company_name,
                "player_level": player_level,
                "tasks_completed": tasks_completed
            }
            
            # Run task agent
            result = await self._run_agent_with_retry(
                agent=task_agent,
                session_id=session_id,
                session_state=session_state,
                max_retries=3
            )
            
            # Parse task
            task = self._parse_json_output(
                result.get("new_task", "{}"),
                default={}
            )
            
            logger.info(f"Generated task: {task.get('title', 'Unknown')}")
            return task
            
        except Exception as e:
            logger.error(f"Failed to generate task: {e}")
            raise Exception(f"Task generation failed: {str(e)}")
    
    async def grade_task(
        self,
        session_id: str,
        task: Dict[str, Any],
        solution: str,
        player_level: int,
        current_xp: int
    ) -> Dict[str, Any]:
        """
        Grade a task solution using the Grader Agent.
        
        Evaluates the solution, awards XP, and checks for level up.
        
        Args:
            session_id: Unique session identifier
            task: Task dictionary with description, requirements, criteria
            solution: Player's submitted solution
            player_level: Player's current level
            current_xp: Player's current XP
        
        Returns:
            Dictionary with score, feedback, XP gained, and level up status
        
        Raises:
            Exception: If grading fails after retries
        """
        logger.info(f"Grading task {task.get('id')} for session {session_id}")
        
        try:
            # Prepare session state for grading
            session_state = {
                "task_description": task.get("description", ""),
                "requirements": ", ".join(task.get("requirements", [])),
                "acceptance_criteria": ", ".join(task.get("acceptance_criteria", [])),
                "solution": solution
            }
            
            # Run grader agent
            result = await self._run_agent_with_retry(
                agent=grader_agent,
                session_id=f"{session_id}_task{task.get('id')}",
                session_state=session_state,
                max_retries=2
            )
            
            # Parse grading result
            grading = self._parse_json_output(
                result.get("grading_result", "{}"),
                default={}
            )
            
            score = grading.get("score", 0)
            passed = grading.get("passed", False)
            feedback = grading.get("feedback", "No feedback provided")
            
            # Calculate XP award
            base_xp = task.get("xp_reward", 50)
            # Bonus XP for high scores
            xp_multiplier = 1.0 if score < 90 else 1.2
            xp_gained = int(base_xp * xp_multiplier) if passed else 0
            
            # Calculate new XP and check for level up
            new_xp = current_xp + xp_gained
            xp_for_next_level = self._calculate_xp_for_level(player_level + 1)
            level_up = new_xp >= xp_for_next_level
            new_level = player_level + 1 if level_up else player_level
            
            result = {
                "score": score,
                "passed": passed,
                "feedback": feedback,
                "xp_gained": xp_gained,
                "new_xp": new_xp,
                "level_up": level_up,
                "new_level": new_level,
                "xp_to_next_level": xp_for_next_level if not level_up else self._calculate_xp_for_level(new_level + 1)
            }
            
            logger.info(
                f"Task graded: score={score}, passed={passed}, "
                f"xp_gained={xp_gained}, level_up={level_up}"
            )
            return result
            
        except Exception as e:
            logger.error(f"Failed to grade task: {e}")
            raise Exception(f"Task grading failed: {str(e)}")

    async def update_cv(
        self,
        session_id: str,
        current_cv: Dict[str, Any],
        action: str,
        action_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update player's CV using the CV Agent.
        
        Args:
            session_id: Unique session identifier
            current_cv: Current CV data
            action: Action to perform (add_job, update_accomplishments, add_skills)
            action_data: Data specific to the action
        
        Returns:
            Updated CV dictionary
        
        Raises:
            Exception: If CV update fails after retries
        """
        logger.info(f"Updating CV for session {session_id}, action: {action}")
        
        try:
            # Prepare session state
            session_state = {
                "current_cv": json.dumps(current_cv),
                "action": action,
                "action_data": json.dumps(action_data)
            }
            
            # Run CV agent
            result = await self._run_agent_with_retry(
                agent=cv_agent,
                session_id=session_id,
                session_state=session_state,
                max_retries=3
            )
            
            # Parse updated CV
            updated_cv = self._parse_json_output(
                result.get("updated_cv", "{}"),
                default=current_cv  # Fallback to current CV if parsing fails
            )
            
            logger.info(f"CV updated successfully for action: {action}")
            return updated_cv
            
        except Exception as e:
            logger.error(f"Failed to update CV: {e}")
            # Return current CV on failure to avoid data loss
            logger.warning("Returning current CV due to update failure")
            return current_cv
    
    async def _run_agent_with_retry(
        self,
        agent_name: str,
        prompt: str,
        output_key: str,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Run an AI agent with retry logic for handling failures.
        
        Args:
            agent_name: Name of the agent for logging
            prompt: The prompt to send to the model
            output_key: The key to use for the output in the result dict
            max_retries: Maximum number of retry attempts (default: 3)
        
        Returns:
            Agent result dictionary
        
        Raises:
            Exception: If all retry attempts fail
        """
        last_error = None
        
        for attempt in range(max_retries):
            try:
                logger.debug(
                    f"Running {agent_name}, attempt {attempt + 1}/{max_retries}"
                )
                
                # Generate response using Gemini
                response = self.model.generate_content(prompt)
                
                # Extract text from response
                response_text = response.text
                
                # Parse JSON from response
                result = self._extract_json_from_response(response_text, output_key)
                
                logger.debug(f"{agent_name} completed successfully")
                return result
                
            except Exception as e:
                last_error = e
                logger.warning(
                    f"{agent_name} failed on attempt {attempt + 1}/{max_retries}: {e}"
                )
                
                # Don't retry on the last attempt
                if attempt < max_retries - 1:
                    logger.info(f"Retrying {agent_name}...")
                    continue
        
        # All retries exhausted
        error_msg = f"{agent_name} failed after {max_retries} attempts: {last_error}"
        logger.error(error_msg)
        raise Exception(error_msg)
    
    def _extract_json_from_response(self, response_text: str, output_key: str) -> Dict[str, Any]:
        """Extract JSON from model response."""
        try:
            # Try to find JSON in the response
            import re
            # Look for JSON array or object
            json_match = re.search(r'(\[.*\]|\{.*\})', response_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(1))
                return {output_key: parsed}
            
            # If no JSON found, try parsing the whole response
            parsed = json.loads(response_text)
            return {output_key: parsed}
            
        except Exception as e:
            logger.warning(f"Failed to parse JSON from response: {e}")
            # Return empty result
            return {output_key: [] if output_key.endswith('s') else {}}
    
    def _prepare_agent_message(self, agent: Any, session_state: Dict[str, Any]) -> str:
        """Prepare the message/prompt for an agent based on its type and session state."""
        if agent == job_agent:
            return f"Generate {session_state.get('count', 10)} job listings for player level {session_state.get('player_level', 1)}"
        elif agent == interview_agent:
            return f"Generate interview questions for {session_state.get('job_title', '')} at {session_state.get('company_name', '')}"
        elif agent == task_agent:
            return f"Generate a work task for {session_state.get('job_title', '')} at level {session_state.get('player_level', 1)}"
        elif agent == grader_agent:
            if 'solution' in session_state:
                return f"Grade this solution: {session_state.get('solution', '')}"
            else:
                return f"Grade this answer: {session_state.get('answer', '')}"
        elif agent == cv_agent:
            return f"Update CV with action: {session_state.get('action', '')}"
        else:
            return json.dumps(session_state)
    
    def _extract_agent_output(self, content: str, agent: Any) -> Dict[str, Any]:
        """Extract structured output from agent response."""
        try:
            # Try to parse as JSON first
            if isinstance(content, str):
                # Look for JSON in the content
                import re
                json_match = re.search(r'\{.*\}|\[.*\]', content, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group())
                    # Wrap in appropriate key based on agent
                    if agent == job_agent:
                        return {"job_listings": parsed if isinstance(parsed, list) else [parsed]}
                    elif agent == interview_agent:
                        return {"interview_questions": parsed if isinstance(parsed, list) else [parsed]}
                    elif agent == task_agent:
                        return {"new_task": parsed}
                    elif agent == grader_agent:
                        return {"grading_result": parsed}
                    elif agent == cv_agent:
                        return {"updated_cv": parsed}
            
            # If content is already structured, return it
            if isinstance(content, dict):
                return content
            
            # Fallback: return content as-is wrapped in appropriate key
            if agent == job_agent:
                return {"job_listings": content}
            elif agent == interview_agent:
                return {"interview_questions": content}
            elif agent == task_agent:
                return {"new_task": content}
            elif agent == grader_agent:
                return {"grading_result": content}
            elif agent == cv_agent:
                return {"updated_cv": content}
            
            return {"output": content}
            
        except Exception as e:
            logger.warning(f"Failed to extract agent output: {e}")
            return {"output": content}
    
    def _parse_json_output(
        self,
        output: str,
        default: Any = None
    ) -> Any:
        """
        Parse JSON output from agent with error handling.
        
        Args:
            output: JSON string from agent
            default: Default value to return if parsing fails
        
        Returns:
            Parsed JSON object or default value
        """
        try:
            # Handle case where output is already a dict/list
            if isinstance(output, (dict, list)):
                return output
            
            # Try to parse as JSON
            return json.loads(output)
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON output: {e}")
            logger.debug(f"Raw output: {output[:200]}...")  # Log first 200 chars
            
            # Try to extract JSON from markdown code blocks
            if "```json" in output:
                try:
                    start = output.index("```json") + 7
                    end = output.index("```", start)
                    json_str = output[start:end].strip()
                    return json.loads(json_str)
                except (ValueError, json.JSONDecodeError):
                    pass
            
            # Try to extract JSON from plain code blocks
            if "```" in output:
                try:
                    start = output.index("```") + 3
                    end = output.index("```", start)
                    json_str = output[start:end].strip()
                    return json.loads(json_str)
                except (ValueError, json.JSONDecodeError):
                    pass
            
            # Return default if all parsing attempts fail
            logger.warning(f"Using default value: {default}")
            return default
    
    def _calculate_xp_for_level(self, level: int) -> int:
        """
        Calculate XP required to reach a specific level.
        
        Uses an exponential curve: XP = 100 * (level ^ 1.5)
        
        Args:
            level: Target level
        
        Returns:
            XP required to reach the level
        """
        if level <= 1:
            return 0
        
        # Exponential curve for XP requirements
        # Level 2: 283 XP
        # Level 3: 520 XP
        # Level 4: 800 XP
        # Level 5: 1118 XP
        # Level 10: 3162 XP
        return int(100 * (level ** 1.5))


# Export the orchestrator class
__all__ = ["WorkflowOrchestrator"]
