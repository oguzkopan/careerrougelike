"""
Simplified Workflow Orchestrator

This module orchestrates AI agents using Gemini API directly for reliability.
"""

import logging
import json
import re
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class WorkflowOrchestrator:
    """
    Orchestrates AI agents for the job market simulator using Gemini API directly.
    """
    
    def __init__(self):
        """Initialize the workflow orchestrator."""
        from shared.config import GOOGLE_API_KEY, USE_VERTEX_AI, PROJECT_ID
        
        if USE_VERTEX_AI:
            # Use Vertex AI
            import vertexai
            from vertexai.generative_models import GenerativeModel
            vertexai.init(project=PROJECT_ID, location="us-central1")
            self.model = GenerativeModel('gemini-2.0-flash-exp')
            logger.info("WorkflowOrchestrator initialized with Vertex AI")
        else:
            # Use Gemini API
            import google.generativeai as genai
            genai.configure(api_key=GOOGLE_API_KEY)
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            logger.info("WorkflowOrchestrator initialized with Gemini API")
    
    async def generate_jobs(
        self,
        session_id: str,
        player_level: int,
        count: int = 10,
        profession: str = "ios_engineer"
    ) -> List[Dict[str, Any]]:
        """Generate profession-specific job listings."""
        logger.info(f"Generating {count} jobs for session {session_id}, profession {profession}, level {player_level}")
        
        level_desc = "entry-level" if player_level <= 3 else ("mid-level" if player_level <= 7 else "senior")
        
        # Map profession to job types and skills
        profession_map = {
            "ios_engineer": {
                "title": "iOS Engineer",
                "skills": ["Swift", "SwiftUI", "UIKit", "iOS SDK", "Xcode", "Core Data"],
                "positions": ["iOS Developer", "iOS Engineer", "Mobile Engineer (iOS)", "Swift Developer"]
            },
            "data_analyst": {
                "title": "Data Analyst",
                "skills": ["SQL", "Python", "Tableau", "Excel", "Data Visualization", "Statistics"],
                "positions": ["Data Analyst", "Business Analyst", "Data Scientist", "Analytics Engineer"]
            },
            "product_designer": {
                "title": "Product Designer",
                "skills": ["Figma", "Sketch", "Adobe XD", "Design Systems", "User Research", "Prototyping"],
                "positions": ["Product Designer", "UX Designer", "UI/UX Designer", "Design Lead"]
            },
            "sales_associate": {
                "title": "Sales Associate",
                "skills": ["Salesforce", "CRM", "Cold Calling", "Lead Generation", "Negotiation", "B2B Sales"],
                "positions": ["Sales Associate", "Account Executive", "Business Development Rep", "Sales Manager"]
            }
        }
        
        prof_info = profession_map.get(profession, profession_map["ios_engineer"])
        
        # Create explicit examples for each position
        position_examples = []
        for i, pos in enumerate(prof_info['positions'][:min(count, len(prof_info['positions']))]):
            salary_min = 50000 if player_level <= 3 else (90000 if player_level <= 7 else 150000)
            salary_max = 90000 if player_level <= 3 else (150000 if player_level <= 7 else 250000)
            position_examples.append(f'  {{"company_name": "Company{i+1}", "position": "{pos}", "location": "Remote", "job_type": "remote", "salary_range": {{"min": {salary_min}, "max": {salary_max}}}, "level": "{level_desc}", "requirements": {prof_info["skills"][:3]}, "responsibilities": ["Develop features", "Collaborate", "Review"], "benefits": ["Health", "401k", "PTO"], "description": "Great opportunity"}}')
        
        prompt = f"""You are generating job listings for a {prof_info['title']} job search.

STRICT REQUIREMENT: ALL {count} jobs MUST be {prof_info['title']} positions. DO NOT generate jobs for other professions.

Valid position titles (USE THESE EXACTLY):
{chr(10).join(f"- {pos}" for pos in prof_info['positions'])}

Required skills to include:
{chr(10).join(f"- {skill}" for skill in prof_info['skills'])}

Generate EXACTLY {count} jobs. Each job MUST:
1. Have position title from the list above
2. Include skills from the required skills list
3. Be relevant to {prof_info['title']} profession

Output ONLY valid JSON array (no markdown, no explanation):
[
{chr(10).join(position_examples[:3])}
]

Continue this pattern for all {count} jobs. Level: {level_desc}, Salary: ${50000 if player_level <= 3 else (90000 if player_level <= 7 else 150000)}-${90000 if player_level <= 3 else (150000 if player_level <= 7 else 250000)}"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Extract JSON
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                jobs = json.loads(json_match.group())
                
                # Validate profession matching and fix data structure
                valid_jobs = []
                for job in jobs:
                    # Fix field naming (AI might use camelCase)
                    if 'companyName' in job and 'company_name' not in job:
                        job['company_name'] = job.pop('companyName')
                    if 'jobType' in job and 'job_type' not in job:
                        job['job_type'] = job.pop('jobType')
                    if 'salaryRange' in job and 'salary_range' not in job:
                        job['salary_range'] = job.pop('salaryRange')
                    
                    # Ensure required fields exist
                    if not job.get('company_name'):
                        job['company_name'] = "TechCorp Inc"
                    
                    # Check if position matches profession
                    position = job.get('position', '').lower()
                    matches_profession = any(
                        prof_pos.lower() in position or position in prof_pos.lower()
                        for prof_pos in prof_info['positions']
                    )
                    
                    # Also check if any profession skills are in requirements
                    requirements = job.get('requirements', [])
                    has_relevant_skills = any(
                        skill.lower() in ' '.join(requirements).lower()
                        for skill in prof_info['skills']
                    )
                    
                    if matches_profession or has_relevant_skills:
                        valid_jobs.append(job)
                    else:
                        logger.warning(f"Filtered out non-matching job: {job.get('position')}")
                
                # If we filtered out too many, regenerate with stricter prompt
                if len(valid_jobs) < count * 0.5:
                    logger.warning(f"Only {len(valid_jobs)}/{count} jobs matched profession, using fallback generation")
                    valid_jobs = self._generate_fallback_jobs(prof_info, count, level_desc, player_level)
                
                logger.info(f"Successfully generated {len(valid_jobs)} profession-matched jobs")
                return valid_jobs
            
            logger.warning("No JSON found in response, using fallback")
            return self._generate_fallback_jobs(prof_info, count, level_desc, player_level)
            
        except Exception as e:
            logger.error(f"Failed to generate jobs: {e}, using fallback")
            return self._generate_fallback_jobs(prof_info, count, level_desc, player_level)
    
    def _generate_fallback_jobs(self, prof_info: Dict, count: int, level_desc: str, player_level: int) -> List[Dict[str, Any]]:
        """Generate fallback jobs when AI generation fails or doesn't match profession."""
        import uuid
        
        salary_ranges = {
            "entry-level": (50000, 90000),
            "mid-level": (90000, 150000),
            "senior": (150000, 250000)
        }
        salary_min, salary_max = salary_ranges.get(level_desc, (70000, 120000))
        
        companies = ["TechCorp", "InnovateLabs", "DataSystems", "CloudWorks", "StartupHub", 
                    "Enterprise Solutions", "Digital Dynamics", "CodeCraft", "AgileTeam", "FutureTech"]
        
        jobs = []
        for i in range(count):
            position_title = prof_info['positions'][i % len(prof_info['positions'])]
            company = companies[i % len(companies)]
            
            jobs.append({
                "company_name": f"{company} Inc",
                "position": f"{level_desc.title()} {position_title}",
                "location": ["Remote", "San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA"][i % 5],
                "job_type": ["remote", "hybrid", "onsite"][i % 3],
                "salary_range": {
                    "min": salary_min + (i * 5000),
                    "max": salary_max + (i * 5000)
                },
                "level": level_desc,
                "requirements": prof_info['skills'][:3] + [prof_info['skills'][(i + 3) % len(prof_info['skills'])]],
                "responsibilities": [
                    f"Develop and maintain {prof_info['title'].lower()} solutions",
                    "Collaborate with cross-functional teams",
                    "Participate in code reviews and technical discussions",
                    "Contribute to technical documentation"
                ],
                "benefits": ["Health insurance", "401k matching", "Unlimited PTO", "Remote work options"],
                "description": f"Join {company} as a {position_title}. We're looking for a talented professional to join our growing team. You'll work on exciting projects using {', '.join(prof_info['skills'][:3])} and more."
            })
        
        return jobs
    
    async def conduct_interview(self, session_id: str, job_title: str, company_name: str, 
                               requirements: List[str], level: str) -> List[Dict[str, Any]]:
        """Generate interview questions - placeholder."""
        return [
            {"id": "q1", "question": f"Tell me about your experience with {requirements[0] if requirements else 'this field'}?"},
            {"id": "q2", "question": f"Why do you want to work at {company_name}?"},
            {"id": "q3", "question": f"What interests you about the {job_title} role?"}
        ]
    
    async def grade_interview(self, session_id: str, questions: List[Dict], 
                             answers: Dict[str, str]) -> Dict[str, Any]:
        """Grade interview answers strictly with pre-validation."""
        logger.info(f"Grading interview for session {session_id} with {len(questions)} questions")
        
        feedback_list = []
        total_score = 0
        
        for question in questions:
            q_id = question.get("id", "")
            q_text = question.get("question", "")
            expected = question.get("expected_answer", "")
            player_answer = answers.get(q_id, "")
            
            # PRE-VALIDATION: Check for automatic failures and passes
            word_count = len(player_answer.split())
            unique_words = len(set(player_answer.lower().split()))
            
            # Automatic fail conditions
            if not player_answer or not player_answer.strip():
                score = 0
                feedback_text = "Empty answer provided. No content to evaluate."
                logger.info(f"Question {q_id} auto-failed: empty answer")
            elif word_count < 5:
                score = 10
                feedback_text = f"Answer too short ({word_count} words). Minimum 5 words required."
                logger.info(f"Question {q_id} auto-failed: too short ({word_count} words)")
            elif player_answer.lower().strip() in ["i don't know", "i dont know", "idk", "no idea", "not sure", "i don't know."]:
                score = 5
                feedback_text = "Answer indicates lack of knowledge. No substantive content provided."
                logger.info(f"Question {q_id} auto-failed: admits no knowledge")
            elif unique_words < 4 and word_count < 10:
                # Check for gibberish (very low unique word count AND short)
                score = 5
                feedback_text = "Answer appears to be gibberish or lacks meaningful content."
                logger.info(f"Question {q_id} auto-failed: gibberish detected")
            # Check for obviously irrelevant content
            elif any(phrase in player_answer.lower() for phrase in ["pizza", "ice cream", "weather", "favorite color", "watching movies", "my cat", "my dog"]):
                score = 10
                feedback_text = "Answer is off-topic and doesn't address the question."
                logger.info(f"Question {q_id} auto-failed: irrelevant content detected")
            # Check for comprehensive answers (auto-pass with high score)
            elif word_count >= 30 and unique_words >= 20:
                # Comprehensive answer with good vocabulary - likely a good answer
                score = 80
                feedback_text = "Comprehensive answer demonstrating good understanding and effort."
                logger.info(f"Question {q_id} auto-passed: comprehensive answer ({word_count} words, {unique_words} unique)")
            else:
                # Only use AI grading for potentially valid answers
                prompt = f"""You are a balanced technical interviewer. Grade fairly - reward good answers but catch irrelevant ones.

Question: {q_text}
Expected Key Points: {expected}
Candidate Answer: {player_answer}

CRITICAL: First check if the answer is RELEVANT to the question.
- If answer talks about completely unrelated topics (food, hobbies, weather, etc.) → FAIL (0-30)
- If answer is just generic platitudes with no substance → FAIL (31-50)
- If answer addresses the question but is superficial → BORDERLINE (51-69)
- If answer shows understanding and addresses the question → PASS (70+)

GRADING SCALE:
- 0-30: Completely off-topic or irrelevant (talks about unrelated things)
- 31-50: Extremely vague, no real substance or technical content
- 51-69: Somewhat relevant but lacks depth or detail
- 70-79: Addresses question, shows basic understanding ✓ PASS
- 80-89: Good answer with relevant details and examples ✓ PASS
- 90-100: Excellent comprehensive answer ✓ PASS

BE FAIR: Reward genuine effort and understanding. Pass threshold is 70/100.

Output ONLY JSON:
{{
  "score": 0-100,
  "feedback": "Constructive feedback explaining the score"
}}"""
                
                try:
                    response = self.model.generate_content(prompt)
                    response_text = response.text
                    
                    # Extract JSON
                    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                    if json_match:
                        result = json.loads(json_match.group())
                        score = result.get("score", 0)
                        feedback_text = result.get("feedback", "No feedback provided")
                    else:
                        score = 30
                        feedback_text = "Could not parse grading result, defaulting to fail"
                    
                    logger.info(f"Question {q_id} AI-graded: {score}/100")
                    
                except Exception as e:
                    logger.error(f"Failed to grade question {q_id}: {e}")
                    score = 30
                    feedback_text = "Grading error occurred, defaulting to fail"
            
            total_score += score
            feedback_list.append({
                "question": q_text,
                "answer": player_answer,
                "score": score,
                "feedback": feedback_text
            })
        
        # Calculate average
        overall_score = int(total_score / len(questions)) if questions else 0
        passed = overall_score >= 70
        
        logger.info(f"Interview grading complete: {overall_score}/100, passed={passed}")
        
        return {
            "passed": passed,
            "overall_score": overall_score,
            "feedback": feedback_list
        }
    
    async def generate_task(self, session_id: str, job_title: str, company_name: str,
                           player_level: int, tasks_completed: int) -> Dict[str, Any]:
        """Generate a work task with optional AI-generated image."""
        logger.info(f"Generating task for session {session_id}, job {job_title}, level {player_level}")
        
        level_desc = "entry-level" if player_level <= 3 else ("mid-level" if player_level <= 7 else "senior")
        
        # Vary task format based on tasks completed (cycle through formats)
        format_types = ["text_answer", "multiple_choice", "fill_in_blank", "matching", "code_review", "prioritization", "text_answer"]
        format_type = format_types[tasks_completed % len(format_types)]
        
        prompt = f"""You are a work task generator. Create ONE realistic work task.

Job Title: {job_title}
Company: {company_name}
Player Level: {player_level} ({level_desc})
Tasks Completed: {tasks_completed}
Format Type: {format_type}

Generate ONE work task that:
1. Is specific to the job type and industry
2. Scales in difficulty with player level and experience
3. Has clear requirements and acceptance criteria
4. Awards appropriate XP (10-100 based on difficulty)
5. Uses the specified format type

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

For MULTIPLE_CHOICE format, output:
{{
  "id": "task-{session_id}-{tasks_completed + 1}",
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

For FILL_IN_BLANK format, output:
{{
  "id": "task-{session_id}-{tasks_completed + 1}",
  "title": "Brief task title",
  "description": "Context or instructions for the fill-in-blank task",
  "format_type": "fill_in_blank",
  "blank_text": "A paragraph or code snippet with {{blank_0}}, {{blank_1}}, and {{blank_2}} placeholders",
  "blanks": [
    {{"id": "blank_0", "placeholder": "first blank"}},
    {{"id": "blank_1", "placeholder": "second blank"}},
    {{"id": "blank_2", "placeholder": "third blank"}}
  ],
  "expected_answers": {{
    "blank_0": "correct answer for first blank",
    "blank_1": "correct answer for second blank",
    "blank_2": "correct answer for third blank"
  }},
  "requirements": ["Context or background info"],
  "acceptance_criteria": ["Must fill all blanks correctly"],
  "difficulty": 1-10,
  "xp_reward": 10-100,
  "status": "pending",
  "task_type": "designer|engineer|analyst|manager|sales|operations"
}}

For MATCHING format, output:
{{
  "id": "task-{session_id}-{tasks_completed + 1}",
  "title": "Brief task title",
  "description": "Instructions for matching task",
  "format_type": "matching",
  "matching_left": [
    {{"id": "left_0", "text": "First concept"}},
    {{"id": "left_1", "text": "Second concept"}},
    {{"id": "left_2", "text": "Third concept"}},
    {{"id": "left_3", "text": "Fourth concept"}},
    {{"id": "left_4", "text": "Fifth concept"}}
  ],
  "matching_right": [
    {{"id": "right_0", "text": "First definition"}},
    {{"id": "right_1", "text": "Second definition"}},
    {{"id": "right_2", "text": "Third definition"}},
    {{"id": "right_3", "text": "Fourth definition"}},
    {{"id": "right_4", "text": "Fifth definition"}}
  ],
  "correct_matches": {{
    "left_0": "right_2",
    "left_1": "right_0",
    "left_2": "right_4",
    "left_3": "right_1",
    "left_4": "right_3"
  }},
  "requirements": ["Context or background info"],
  "acceptance_criteria": ["Must match all items correctly"],
  "difficulty": 1-10,
  "xp_reward": 10-100,
  "status": "pending",
  "task_type": "designer|engineer|analyst|manager|sales|operations"
}}

For CODE_REVIEW format, output:
{{
  "id": "task-{session_id}-{tasks_completed + 1}",
  "title": "Brief task title",
  "description": "Instructions for code review task",
  "format_type": "code_review",
  "code": "function example() {{\\n  // Code with bugs\\n  return result;\\n}}",
  "bugs": [
    {{"line_number": 2, "description": "Missing variable declaration"}},
    {{"line_number": 3, "description": "Incorrect return value"}}
  ],
  "requirements": ["Identify all bugs", "Explain each issue"],
  "acceptance_criteria": ["Must find all bugs", "Must provide explanations"],
  "difficulty": 1-10,
  "xp_reward": 10-100,
  "status": "pending",
  "task_type": "engineer"
}}

For PRIORITIZATION format, output:
{{
  "id": "task-{session_id}-{tasks_completed + 1}",
  "title": "Brief task title",
  "description": "Instructions for prioritization task",
  "format_type": "prioritization",
  "prioritization_items": [
    {{"id": "item_0", "text": "First item to prioritize"}},
    {{"id": "item_1", "text": "Second item to prioritize"}},
    {{"id": "item_2", "text": "Third item to prioritize"}},
    {{"id": "item_3", "text": "Fourth item to prioritize"}},
    {{"id": "item_4", "text": "Fifth item to prioritize"}}
  ],
  "correct_priority": ["item_2", "item_0", "item_4", "item_1", "item_3"],
  "requirements": ["Context or background info"],
  "acceptance_criteria": ["Must prioritize correctly"],
  "difficulty": 1-10,
  "xp_reward": 10-100,
  "status": "pending",
  "task_type": "designer|engineer|analyst|manager|sales|operations"
}}

For TEXT_ANSWER format (default), output:
{{
  "id": "task-{session_id}-{tasks_completed + 1}",
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
Set task_type based on the job category to enable appropriate visualizations."""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                task_data = json.loads(json_match.group())
                logger.info(f"Generated task: {task_data.get('title', 'Unknown')}")
                
                # Generate image for the task if appropriate
                task_type = task_data.get('task_type', 'engineer')
                task_description = task_data.get('description', '')
                
                # Try to generate image (non-blocking, can fail gracefully)
                try:
                    from shared.image_generator import generate_task_image
                    image_url = generate_task_image(task_type, task_description, job_title)
                    if image_url:
                        task_data['image_url'] = image_url
                        logger.info(f"Generated image for task: {image_url}")
                except Exception as img_error:
                    logger.warning(f"Failed to generate task image: {img_error}")
                    # Continue without image
                
                return task_data
            else:
                logger.error("No JSON found in task generation response")
                raise ValueError("Invalid response format")
                
        except Exception as e:
            logger.error(f"Failed to generate task: {e}")
            # Return fallback task
            return {
                "id": f"task-{session_id}-{tasks_completed + 1}",
                "title": f"Complete project task #{tasks_completed + 1}",
                "description": f"Work on {job_title} responsibilities at {company_name}",
                "requirements": ["Complete the task", "Submit solution"],
                "acceptance_criteria": ["Task is complete", "Quality is good"],
                "difficulty": min(player_level, 5),
                "xp_reward": 50,
                "status": "pending",
                "task_type": "engineer"
            }
    
    async def grade_task(self, session_id: str, task: Dict, solution: str,
                        player_level: int, current_xp: int) -> Dict[str, Any]:
        """Grade task submission based on format type."""
        logger.info(f"Grading task for session {session_id}, format: {task.get('format_type', 'text_answer')}")
        
        format_type = task.get("format_type", "text_answer")
        
        # Handle multiple choice grading
        if format_type == "multiple_choice":
            correct_answer = task.get("correct_answer", "")
            explanation = task.get("explanation", "")
            
            if solution.strip().upper() == correct_answer.strip().upper():
                score = 100
                passed = True
                feedback = f"Correct! {explanation}"
                xp_gained = task.get("xp_reward", 50)
            else:
                score = 0
                passed = False
                feedback = f"Incorrect. The correct answer is {correct_answer}. {explanation}"
                xp_gained = 0
            
            logger.info(f"Multiple choice graded: score={score}, passed={passed}")
            
            # Check for level up
            new_xp = current_xp + xp_gained
            xp_for_next_level = self._calculate_xp_for_level(player_level + 1)
            level_up = new_xp >= xp_for_next_level
            new_level = player_level + 1 if level_up else player_level
            
            return {
                "score": score,
                "passed": passed,
                "feedback": feedback,
                "xp_gained": xp_gained,
                "new_xp": new_xp,
                "level_up": level_up,
                "new_level": new_level
            }
        
        # Handle prioritization grading
        if format_type == "prioritization":
            correct_priority = task.get("correct_priority", [])
            
            try:
                # Parse solution as JSON (should be array of item IDs in priority order)
                player_priority = json.loads(solution)
            except:
                player_priority = []
            
            # Calculate ranking correlation (Spearman's rank correlation coefficient)
            if len(player_priority) != len(correct_priority):
                score = 0
                passed = False
                feedback = f"Incorrect number of items. Expected {len(correct_priority)}, got {len(player_priority)}."
            else:
                # Create rank mappings
                correct_ranks = {item: rank for rank, item in enumerate(correct_priority)}
                player_ranks = {item: rank for rank, item in enumerate(player_priority)}
                
                # Calculate rank differences
                total_diff = 0
                max_diff = 0
                for item in correct_priority:
                    if item in player_ranks:
                        diff = abs(correct_ranks[item] - player_ranks[item])
                        total_diff += diff
                        max_diff += len(correct_priority) - 1
                
                # Score based on how close the ranking is (inverse of normalized difference)
                if max_diff > 0:
                    score = int(100 * (1 - (total_diff / max_diff)))
                else:
                    score = 100
                
                passed = score >= 70
                
                if passed:
                    feedback = f"Good prioritization! Your ranking is {score}% aligned with the optimal priority."
                else:
                    feedback = f"Your prioritization needs improvement. Score: {score}/100. Consider the urgency and impact of each item."
            
            xp_gained = task.get("xp_reward", 50) if passed else int(task.get("xp_reward", 50) * (score / 100))
            
            logger.info(f"Prioritization graded: score={score}, passed={passed}")
            
            # Check for level up
            new_xp = current_xp + xp_gained
            xp_for_next_level = self._calculate_xp_for_level(player_level + 1)
            level_up = new_xp >= xp_for_next_level
            new_level = player_level + 1 if level_up else player_level
            
            return {
                "score": score,
                "passed": passed,
                "feedback": feedback,
                "xp_gained": xp_gained,
                "new_xp": new_xp,
                "level_up": level_up,
                "new_level": new_level
            }
        
        # Handle code review grading
        if format_type == "code_review":
            bugs = task.get("bugs", [])
            code = task.get("code", "")
            
            # Use AI to grade the code review
            prompt = f"""You are a STRICT code review grader. Grade this code review submission.

Code:
{code}

Known Bugs:
{json.dumps(bugs, indent=2)}

Player's Code Review:
{solution}

Evaluate:
1. Did the player identify all bugs? (must find at least 70% of bugs)
2. Are the explanations accurate and clear?
3. Did they provide line numbers or specific locations?

Output ONLY JSON:
{{
  "score": 0-100,
  "passed": true/false,
  "feedback": "Detailed explanation of what was found/missed"
}}

Grading scale:
- 0-30: Found no bugs or completely wrong (FAIL)
- 31-69: Found some bugs but missed critical ones (FAIL)
- 70-100: Found most/all bugs with good explanations (PASS)"""
            
            try:
                response = self.model.generate_content(prompt)
                response_text = response.text
                
                # Extract JSON
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                    score = result.get("score", 0)
                    passed = result.get("passed", False)
                    feedback = result.get("feedback", "No feedback provided")
                else:
                    score = 50
                    passed = False
                    feedback = "Could not parse grading result"
                
                xp_gained = task.get("xp_reward", 50) if passed else int(task.get("xp_reward", 50) * (score / 100))
                
                logger.info(f"Code review graded: score={score}, passed={passed}")
                
                # Check for level up
                new_xp = current_xp + xp_gained
                xp_for_next_level = self._calculate_xp_for_level(player_level + 1)
                level_up = new_xp >= xp_for_next_level
                new_level = player_level + 1 if level_up else player_level
                
                return {
                    "score": score,
                    "passed": passed,
                    "feedback": feedback,
                    "xp_gained": xp_gained,
                    "new_xp": new_xp,
                    "level_up": level_up,
                    "new_level": new_level
                }
                
            except Exception as e:
                logger.error(f"Failed to grade code review: {e}")
                return {
                    "score": 0,
                    "passed": False,
                    "feedback": f"Grading error: {str(e)}",
                    "xp_gained": 0,
                    "new_xp": current_xp,
                    "level_up": False,
                    "new_level": player_level
                }
        
        # Handle matching grading
        if format_type == "matching":
            correct_matches = task.get("correct_matches", {})
            
            try:
                # Parse solution as JSON (should be dict of left_id: right_id)
                player_matches = json.loads(solution)
            except:
                player_matches = {}
            
            # Grade each match
            total_matches = len(correct_matches)
            correct_count = 0
            feedback_parts = []
            
            for left_id, correct_right_id in correct_matches.items():
                player_right_id = player_matches.get(left_id, "")
                
                if player_right_id == correct_right_id:
                    correct_count += 1
                    feedback_parts.append(f"✓ {left_id}: Correct match")
                else:
                    feedback_parts.append(f"✗ {left_id}: Incorrect match")
            
            # Calculate score
            score = int((correct_count / total_matches) * 100) if total_matches > 0 else 0
            passed = score >= 70
            feedback = f"You matched {correct_count}/{total_matches} items correctly.\n" + "\n".join(feedback_parts)
            xp_gained = task.get("xp_reward", 50) if passed else int(task.get("xp_reward", 50) * (score / 100))
            
            logger.info(f"Matching graded: score={score}, passed={passed}, correct={correct_count}/{total_matches}")
            
            # Check for level up
            new_xp = current_xp + xp_gained
            xp_for_next_level = self._calculate_xp_for_level(player_level + 1)
            level_up = new_xp >= xp_for_next_level
            new_level = player_level + 1 if level_up else player_level
            
            return {
                "score": score,
                "passed": passed,
                "feedback": feedback,
                "xp_gained": xp_gained,
                "new_xp": new_xp,
                "level_up": level_up,
                "new_level": new_level
            }
        
        # Handle fill-in-the-blank grading
        if format_type == "fill_in_blank":
            expected_answers = task.get("expected_answers", {})
            
            try:
                # Parse solution as JSON (should be dict of blank_id: answer)
                player_answers = json.loads(solution)
            except:
                # If not JSON, treat as single answer
                player_answers = {"blank_0": solution}
            
            # Grade each blank
            total_blanks = len(expected_answers)
            correct_count = 0
            feedback_parts = []
            
            for blank_id, expected in expected_answers.items():
                player_answer = player_answers.get(blank_id, "").strip().lower()
                expected_lower = expected.strip().lower()
                
                # Check if answer is correct (case-insensitive, allow partial matches)
                if player_answer == expected_lower or expected_lower in player_answer or player_answer in expected_lower:
                    correct_count += 1
                    feedback_parts.append(f"✓ {blank_id}: Correct")
                else:
                    feedback_parts.append(f"✗ {blank_id}: Expected '{expected}', got '{player_answers.get(blank_id, '')}'")
            
            # Calculate score
            score = int((correct_count / total_blanks) * 100) if total_blanks > 0 else 0
            passed = score >= 70
            feedback = f"You got {correct_count}/{total_blanks} blanks correct.\n" + "\n".join(feedback_parts)
            xp_gained = task.get("xp_reward", 50) if passed else int(task.get("xp_reward", 50) * (score / 100))
            
            logger.info(f"Fill-in-blank graded: score={score}, passed={passed}, correct={correct_count}/{total_blanks}")
            
            # Check for level up
            new_xp = current_xp + xp_gained
            xp_for_next_level = self._calculate_xp_for_level(player_level + 1)
            level_up = new_xp >= xp_for_next_level
            new_level = player_level + 1 if level_up else player_level
            
            return {
                "score": score,
                "passed": passed,
                "feedback": feedback,
                "xp_gained": xp_gained,
                "new_xp": new_xp,
                "level_up": level_up,
                "new_level": new_level
            }
        
        # Handle text answer grading (default)
        task_description = task.get("description", "")
        requirements = task.get("requirements", [])
        acceptance_criteria = task.get("acceptance_criteria", [])
        
        prompt = f"""You are a STRICT task grader. Grade this solution rigorously.

Task: {task_description}
Requirements: {', '.join(requirements)}
Acceptance Criteria: {', '.join(acceptance_criteria)}
Solution: {solution}

Evaluate strictly:
- Must meet ALL requirements (missing one = fail)
- Must satisfy ALL acceptance criteria
- Quality must be professional-level
- No placeholder or incomplete work

Output ONLY JSON:
{{
  "score": 0-100,
  "passed": true/false,
  "feedback": "Detailed explanation of score"
}}

Grading scale:
- 0-30: Gibberish/empty/off-topic (FAIL)
- 31-69: Incomplete or missing requirements (FAIL)
- 70-100: Meets all requirements (PASS)"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Extract JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                score = result.get("score", 0)
                passed = result.get("passed", False)
                feedback = result.get("feedback", "No feedback provided")
            else:
                score = 50
                passed = False
                feedback = "Could not parse grading result"
            
            xp_gained = task.get("xp_reward", 50) if passed else 0
            new_xp = current_xp + xp_gained
            
            # Check for level up
            xp_for_next_level = self._calculate_xp_for_level(player_level + 1)
            level_up = new_xp >= xp_for_next_level
            new_level = player_level + 1 if level_up else player_level
            
            logger.info(f"Task graded: score={score}, passed={passed}, xp_gained={xp_gained}")
            
            return {
                "score": score,
                "passed": passed,
                "feedback": feedback,
                "xp_gained": xp_gained,
                "new_xp": new_xp,
                "level_up": level_up,
                "new_level": new_level
            }
            
        except Exception as e:
            logger.error(f"Failed to grade task: {e}")
            return {
                "score": 0,
                "passed": False,
                "feedback": f"Grading error: {str(e)}",
                "xp_gained": 0,
                "new_xp": current_xp,
                "level_up": False,
                "new_level": player_level
            }
    
    def _calculate_xp_for_level(self, level: int) -> int:
        """Calculate XP required for a given level."""
        # Exponential curve: level 1 = 100, level 2 = 250, level 3 = 500, etc.
        return int(100 * (1.5 ** (level - 1)))
    
    async def update_cv(self, session_id: str, current_cv: Dict, action: str,
                       action_data: Dict) -> Dict[str, Any]:
        """Update CV - placeholder."""
        if action == "add_job":
            if "experience" not in current_cv:
                current_cv["experience"] = []
            current_cv["experience"].append(action_data)
        return current_cv
    
    async def grade_voice_answer(
        self,
        session_id: str,
        question: str,
        expected_answer: str,
        audio_path: str
    ) -> Dict[str, Any]:
        """
        Grade a voice answer using Gemini's multimodal capabilities.
        
        Args:
            session_id: Session identifier
            question: Interview question text
            expected_answer: Expected answer key points
            audio_path: Path to audio file
            
        Returns:
            Dictionary with transcription, score, passed, and feedback
        """
        logger.info(f"Grading voice answer for session {session_id}")
        
        try:
            from shared.config import USE_VERTEX_AI
            
            # Upload audio file
            if USE_VERTEX_AI:
                # Vertex AI approach
                import vertexai
                from vertexai.generative_models import Part
                
                # Read audio file
                with open(audio_path, 'rb') as f:
                    audio_data = f.read()
                
                audio_part = Part.from_data(audio_data, mime_type="audio/webm")
                
                prompt = f"""You are a STRICT interview grader with audio transcription capabilities.

First, transcribe the audio answer accurately.
Then, grade the answer rigorously against the question and expected answer.

Question: {question}
Expected Answer Key Points: {expected_answer}

CRITICAL: FAIL (score 0-30) if answer is gibberish, empty (< 20 words), off-topic, or just repeats the question.

Check for:
1. Key concepts from expected answer (must have 60%+)
2. Technical accuracy
3. Completeness and detail (30-50+ words for good answers)
4. Specific examples, not vague statements

Output ONLY JSON:
{{
  "transcription": "Full transcription of the audio",
  "score": 0-100,
  "passed": true/false (pass ONLY if score >= 70),
  "feedback": "Detailed explanation of score"
}}

Grading scale:
- 0-30: Gibberish/empty/off-topic (FAIL)
- 31-69: Incomplete or inaccurate (FAIL)
- 70-100: Meets requirements (PASS)"""
                
                response = self.model.generate_content([prompt, audio_part])
                
            else:
                # Gemini API approach - use inline audio instead of file upload
                # File upload API has issues with WebM format from browsers
                import google.generativeai as genai
                from google.generativeai.types import content_types
                
                # Read audio file as bytes
                with open(audio_path, 'rb') as f:
                    audio_data = f.read()
                
                # Create audio part directly (no file upload needed)
                audio_part = {
                    "mime_type": "audio/webm",
                    "data": audio_data
                }
                
                prompt = f"""You are a STRICT interview grader with audio transcription capabilities.

First, transcribe the audio answer accurately.
Then, grade the answer rigorously against the question and expected answer.

Question: {question}
Expected Answer Key Points: {expected_answer}

CRITICAL: FAIL (score 0-30) if answer is gibberish, empty (< 20 words), off-topic, or just repeats the question.

Check for:
1. Key concepts from expected answer (must have 60%+)
2. Technical accuracy
3. Completeness and detail (30-50+ words for good answers)
4. Specific examples, not vague statements

Output ONLY JSON:
{{
  "transcription": "Full transcription of the audio",
  "score": 0-100,
  "passed": true/false (pass ONLY if score >= 70),
  "feedback": "Detailed explanation of score"
}}

Grading scale:
- 0-30: Gibberish/empty/off-topic (FAIL)
- 31-69: Incomplete or inaccurate (FAIL)
- 70-79: Addresses question but needs more depth (FAIL - need 80+ to pass)
- 80-100: Good answer, meets requirements (PASS)"""
                
                response = self.model.generate_content([prompt, audio_part])
            
            response_text = response.text
            
            # Extract JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                logger.info(f"Voice answer graded: score={result.get('score', 0)}, transcription_length={len(result.get('transcription', ''))}")
                return result
            else:
                logger.warning("No JSON found in voice grading response")
                return {
                    "transcription": response_text[:200],
                    "score": 50,
                    "passed": False,
                    "feedback": "Could not parse grading result"
                }
                
        except Exception as e:
            logger.error(f"Failed to grade voice answer: {e}")
            return {
                "transcription": "[Transcription failed]",
                "score": 0,
                "passed": False,
                "feedback": f"Error processing voice answer: {str(e)}"
            }
    
    async def grade_voice_task(
        self,
        session_id: str,
        task: Dict[str, Any],
        audio_path: str,
        player_level: int,
        current_xp: int
    ) -> Dict[str, Any]:
        """
        Grade a voice task solution using Gemini's multimodal capabilities.
        
        Args:
            session_id: Session identifier
            task: Task data with description, requirements, criteria
            audio_path: Path to audio file
            player_level: Current player level
            current_xp: Current XP
            
        Returns:
            Dictionary with transcription, score, passed, feedback, and XP
        """
        logger.info(f"Grading voice task solution for session {session_id}")
        
        try:
            from shared.config import USE_VERTEX_AI
            
            task_description = task.get("description", "")
            requirements = task.get("requirements", [])
            acceptance_criteria = task.get("acceptance_criteria", [])
            xp_reward = task.get("xp_reward", 50)
            
            # Upload audio file
            if USE_VERTEX_AI:
                # Vertex AI approach
                import vertexai
                from vertexai.generative_models import Part
                
                # Read audio file
                with open(audio_path, 'rb') as f:
                    audio_data = f.read()
                
                audio_part = Part.from_data(audio_data, mime_type="audio/webm")
                
                prompt = f"""You are a STRICT task grader with audio transcription capabilities.

First, transcribe the audio solution accurately.
Then, grade the solution rigorously against the task requirements.

Task: {task_description}
Requirements: {', '.join(requirements)}
Acceptance Criteria: {', '.join(acceptance_criteria)}

Evaluate strictly:
- Must meet ALL requirements (missing one = fail)
- Must satisfy ALL acceptance criteria
- Quality must be professional-level
- No placeholder or incomplete work

Output ONLY JSON:
{{
  "transcription": "Full transcription of the audio",
  "score": 0-100,
  "passed": true/false,
  "feedback": "Detailed explanation of score"
}}

Grading scale:
- 0-30: Gibberish/empty/off-topic (FAIL)
- 31-69: Incomplete or missing requirements (FAIL)
- 70-100: Meets all requirements (PASS)"""
                
                response = self.model.generate_content([prompt, audio_part])
                
            else:
                # Gemini API approach
                import google.generativeai as genai
                
                # Upload file to Gemini
                audio_file = genai.upload_file(audio_path)
                
                prompt = f"""You are a STRICT task grader with audio transcription capabilities.

First, transcribe the audio solution accurately.
Then, grade the solution rigorously against the task requirements.

Task: {task_description}
Requirements: {', '.join(requirements)}
Acceptance Criteria: {', '.join(acceptance_criteria)}

Evaluate strictly:
- Must meet ALL requirements (missing one = fail)
- Must satisfy ALL acceptance criteria
- Quality must be professional-level
- No placeholder or incomplete work

Output ONLY JSON:
{{
  "transcription": "Full transcription of the audio",
  "score": 0-100,
  "passed": true/false,
  "feedback": "Detailed explanation of score"
}}

Grading scale:
- 0-30: Gibberish/empty/off-topic (FAIL)
- 31-69: Incomplete or missing requirements (FAIL)
- 70-100: Meets all requirements (PASS)"""
                
                response = self.model.generate_content([prompt, audio_file])
            
            response_text = response.text
            
            # Extract JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                
                # Add XP information
                result["xp_gained"] = xp_reward if result.get("passed", False) else 0
                
                logger.info(f"Voice task graded: score={result.get('score', 0)}, passed={result.get('passed', False)}")
                return result
            else:
                logger.warning("No JSON found in voice task grading response")
                return {
                    "transcription": response_text[:200],
                    "score": 50,
                    "passed": False,
                    "feedback": "Could not parse grading result",
                    "xp_gained": 0
                }
                
        except Exception as e:
            logger.error(f"Failed to grade voice task: {e}")
            return {
                "transcription": "[Transcription failed]",
                "score": 0,
                "passed": False,
                "feedback": f"Error processing voice task: {str(e)}",
                "xp_gained": 0
            }


    async def generate_meeting(
        self,
        session_id: str,
        meeting_type: str,
        job_title: str,
        company_name: str,
        player_level: int,
        recent_performance: str
    ) -> Dict[str, Any]:
        """Generate a virtual meeting scenario."""
        logger.info(f"Generating {meeting_type} meeting for session {session_id}")
        
        level_desc = "junior" if player_level <= 3 else ("mid-level" if player_level <= 7 else "senior")
        
        prompt = f"""Generate a realistic workplace meeting scenario.

Meeting Type: {meeting_type}
Job Title: {job_title}
Company: {company_name}
Player Level: {player_level} ({level_desc})
Recent Performance: {recent_performance}

Meeting types:
- "one_on_one": 1-on-1 meeting with manager or colleague
- "team_meeting": Team standup or planning meeting with 3-5 colleagues
- "stakeholder_presentation": Presentation to stakeholders or executives
- "performance_review": Manager performance review meeting
- "project_update": Project status update meeting
- "feedback_session": Feedback and coaching session with manager

Generate a meeting scenario with:
1. Meeting title and context (what's the meeting about)
2. Participants (2-5 people with names, roles, brief personality traits)
3. 3-5 discussion topics or questions that will be addressed
4. Meeting objective and desired outcomes

Output ONLY a JSON object (no markdown, no explanation):
{{
  "meeting_type": "{meeting_type}",
  "title": "Brief meeting title",
  "context": "2-3 sentences explaining the meeting purpose and background",
  "participants": [
    {{
      "id": "participant-1",
      "name": "Realistic name",
      "role": "Manager|Colleague|Stakeholder|Executive",
      "personality": "Brief personality trait (supportive, direct, analytical, etc.)"
    }}
  ],
  "topics": [
    {{
      "id": "topic-1",
      "question": "Discussion topic or question",
      "context": "Why this is being discussed",
      "expected_points": ["Key point 1", "Key point 2", "Key point 3"]
    }}
  ],
  "objective": "What success looks like for this meeting",
  "duration_minutes": 15-30
}}

Make meetings realistic and appropriate for the job level:
- Junior: Focus on learning, task updates, basic feedback
- Mid-level: Strategic discussions, project planning, mentoring others
- Senior: Executive decisions, company strategy, high-stakes presentations

Tailor meeting content to the job type."""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Extract JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                meeting_data = json.loads(json_match.group())
                logger.info(f"Generated meeting with {len(meeting_data.get('topics', []))} topics")
                return meeting_data
            else:
                logger.warning("No JSON found in meeting generation response")
                # Return a default meeting
                return {
                    "meeting_type": meeting_type,
                    "title": f"{meeting_type.replace('_', ' ').title()}",
                    "context": f"A {meeting_type.replace('_', ' ')} to discuss current work.",
                    "participants": [
                        {
                            "id": "participant-1",
                            "name": "Alex Manager",
                            "role": "Manager",
                            "personality": "supportive"
                        }
                    ],
                    "topics": [
                        {
                            "id": "topic-1",
                            "question": "How is your current project progressing?",
                            "context": "Regular check-in on work status",
                            "expected_points": ["Progress update", "Challenges", "Next steps"]
                        }
                    ],
                    "objective": "Align on current work and next steps",
                    "duration_minutes": 20
                }
        except Exception as e:
            logger.error(f"Failed to generate meeting: {e}")
            # Return a default meeting
            return {
                "meeting_type": meeting_type,
                "title": f"{meeting_type.replace('_', ' ').title()}",
                "context": f"A {meeting_type.replace('_', ' ')} to discuss current work.",
                "participants": [
                    {
                        "id": "participant-1",
                        "name": "Alex Manager",
                        "role": "Manager",
                        "personality": "supportive"
                    }
                ],
                "topics": [
                    {
                        "id": "topic-1",
                        "question": "How is your current project progressing?",
                        "context": "Regular check-in on work status",
                        "expected_points": ["Progress update", "Challenges", "Next steps"]
                    }
                ],
                "objective": "Align on current work and next steps",
                "duration_minutes": 20
            }
    
    async def generate_meeting_response(
        self,
        session_id: str,
        meeting_context: str,
        current_topic: str,
        participant_name: str,
        participant_role: str,
        participant_personality: str,
        player_response: str
    ) -> Dict[str, Any]:
        """Generate AI colleague response during a meeting."""
        logger.info(f"Generating response from {participant_name} in session {session_id}")
        
        prompt = f"""You are simulating an AI colleague in a virtual meeting. Generate a realistic response.

Meeting Context: {meeting_context}
Current Topic: {current_topic}
Participant: {participant_name} ({participant_role})
Participant Personality: {participant_personality}
Player's Response: {player_response}

Generate a realistic response from the AI participant that:
1. Acknowledges the player's input appropriately
2. Stays in character based on personality and role
3. Advances the discussion naturally
4. May ask follow-up questions or provide feedback
5. Reflects realistic workplace communication

Response should be:
- 2-4 sentences
- Professional but natural
- Appropriate for the participant's role and personality
- Relevant to the discussion topic

Output ONLY a JSON object (no markdown, no explanation):
{{
  "participant_name": "{participant_name}",
  "response": "The actual response text",
  "sentiment": "positive|neutral|constructive|concerned"
}}

Make responses feel authentic and varied based on personality:
- Supportive: Encouraging, positive, offers help
- Direct: Straight to the point, asks clarifying questions
- Analytical: Data-focused, asks for metrics and evidence
- Collaborative: Builds on ideas, suggests alternatives
- Challenging: Pushes back constructively, plays devil's advocate"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Extract JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                colleague_response = json.loads(json_match.group())
                return colleague_response
            else:
                logger.warning("No JSON found in meeting response generation")
                return {
                    "participant_name": participant_name,
                    "response": "That's a good point. Let's continue the discussion.",
                    "sentiment": "neutral"
                }
        except Exception as e:
            logger.error(f"Failed to generate meeting response: {e}")
            return {
                "participant_name": participant_name,
                "response": "Thank you for sharing that perspective.",
                "sentiment": "neutral"
            }
    
    async def grade_meeting_response(
        self,
        session_id: str,
        topic: Dict[str, Any],
        player_response: str,
        player_level: int
    ) -> Dict[str, Any]:
        """Grade player's meeting participation."""
        logger.info(f"Grading meeting response for session {session_id}")
        
        prompt = f"""Grade this meeting response based on relevance, professionalism, and contribution quality.

Topic: {topic.get('question', '')}
Context: {topic.get('context', '')}
Expected Points: {', '.join(topic.get('expected_points', []))}
Player's Response: {player_response}
Player Level: {player_level}

Evaluate based on:
1. Relevance to the topic (30 points)
2. Professionalism and communication (30 points)
3. Quality of contribution (40 points)

Output ONLY a JSON object (no markdown, no explanation):
{{
  "score": 0-100,
  "feedback": "Specific feedback on the response",
  "strengths": ["What was good"],
  "improvements": ["What could be better"]
}}

Grading scale:
- 0-30: Off-topic, unprofessional, or unhelpful
- 31-69: Somewhat relevant but lacking depth or professionalism
- 70-100: Relevant, professional, and valuable contribution"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Extract JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                evaluation = json.loads(json_match.group())
                logger.info(f"Meeting response graded: score={evaluation.get('score', 0)}")
                return evaluation
            else:
                logger.warning("No JSON found in meeting grading response")
                return {
                    "score": 50,
                    "feedback": "Could not evaluate response properly",
                    "strengths": ["Participated in the meeting"],
                    "improvements": ["Provide more specific details"]
                }
        except Exception as e:
            logger.error(f"Failed to grade meeting response: {e}")
            return {
                "score": 50,
                "feedback": f"Error evaluating response: {str(e)}",
                "strengths": ["Participated in the meeting"],
                "improvements": ["Try again"]
            }
    
    async def check_for_event(
        self,
        session_id: str,
        player_level: int,
        tasks_completed: int,
        recent_performance: str,
        meeting_history: List[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Check if a random event should be triggered (10-20% chance for manager meeting)."""
        import random
        
        # Check for promotion opportunity based on meeting performance
        if meeting_history and len(meeting_history) >= 3:
            recent_meetings = meeting_history[-3:]
            avg_meeting_score = sum(m.get("score", 0) for m in recent_meetings) / len(recent_meetings)
            
            # 10% chance for promotion if meeting performance is excellent (>= 80)
            if avg_meeting_score >= 80 and random.random() < 0.10:
                logger.info(f"Triggering promotion opportunity for session {session_id}")
                return {
                    "event_type": "promotion_opportunity",
                    "title": "Promotion Opportunity",
                    "description": f"Based on your excellent meeting performance (average score: {avg_meeting_score:.0f}), you've been identified for a promotion opportunity!",
                    "benefits": {
                        "level_increase": 1,
                        "salary_increase_percent": 15,
                        "new_responsibilities": True
                    }
                }
        
        # 15% chance to trigger a manager meeting request
        if random.random() < 0.15:
            logger.info(f"Triggering manager meeting request for session {session_id}")
            
            meeting_types = ["performance_review", "project_update", "feedback_session"]
            meeting_type = random.choice(meeting_types)
            
            prompt = f"""Generate a manager meeting request event.

Player Level: {player_level}
Tasks Completed: {tasks_completed}
Recent Performance: {recent_performance}
Meeting Type: {meeting_type}

Generate a realistic manager meeting request with:
- Title explaining what the meeting is about
- Description of why the manager wants to meet
- Urgency level based on the meeting type
- Whether it can be scheduled for later

Output ONLY a JSON object (no markdown, no explanation):
{{
  "event_type": "manager_meeting_request",
  "meeting_type": "{meeting_type}",
  "title": "Brief meeting title",
  "description": "Why the manager wants to meet (2-3 sentences)",
  "urgency": "high|medium|low",
  "can_schedule_later": true|false
}}

Make it realistic and appropriate for the player's level and performance."""
            
            try:
                response = self.model.generate_content(prompt)
                response_text = response.text
                
                # Extract JSON
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    event_data = json.loads(json_match.group())
                    logger.info(f"Generated event: {event_data.get('event_type')}")
                    return event_data
                else:
                    logger.warning("No JSON found in event generation response")
                    return None
            except Exception as e:
                logger.error(f"Failed to generate event: {e}")
                return None
        
        return None


__all__ = ["WorkflowOrchestrator"]
