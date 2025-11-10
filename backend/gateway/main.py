"""
FastAPI Gateway

REST API gateway for the CareerRoguelike backend.
Exposes endpoints for session management and agent invocation.
"""

import logging
import uuid
import random
from datetime import datetime
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status, Depends, File, UploadFile, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import tempfile
import os

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

# Initialize model configuration before importing agents
from shared import model_config  # This configures Vertex AI/API key

from agents.root_agent import root_agent
from agents.workflow_orchestrator import WorkflowOrchestrator
from agents.meeting_orchestrator import get_meeting_orchestrator
from shared.firestore_manager import FirestoreManager
from shared.config import PROJECT_ID, USE_VERTEX_AI
from gateway.auth import get_current_user, optional_auth

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Global instances (initialized in lifespan)
firestore_manager: Optional[FirestoreManager] = None
adk_runner: Optional[Runner] = None
workflow_orchestrator: Optional[WorkflowOrchestrator] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup: Initialize Firestore and ADK Runner
    global firestore_manager, adk_runner, workflow_orchestrator
    
    auth_method = "Vertex AI" if USE_VERTEX_AI else "Google AI API"
    logger.info(f"Starting backend with {auth_method} authentication")
    
    # Log CORS configuration for verification
    logger.info("=" * 60)
    logger.info("CORS Configuration:")
    logger.info(f"  Allowed Origins: {allowed_origins}")
    logger.info(f"  Allow Credentials: True")
    logger.info(f"  Allow Methods: *")
    logger.info(f"  Allow Headers: *")
    logger.info("=" * 60)
    
    logger.info("Initializing Firestore client...")
    firestore_manager = FirestoreManager()
    
    logger.info("Initializing ADK Runner with root agent...")
    session_service = InMemorySessionService()
    adk_runner = Runner(
        agent=root_agent,
        app_name="career-roguelike",
        session_service=session_service
    )
    
    logger.info("Initializing Workflow Orchestrator...")
    workflow_orchestrator = WorkflowOrchestrator()
    
    logger.info(f"Backend startup complete (Project: {PROJECT_ID}, Auth: {auth_method})")
    
    yield
    
    # Shutdown
    logger.info("Backend shutdown")


# Create FastAPI application
app = FastAPI(
    title="CareerRoguelike Backend",
    description="Multi-agent AI backend for career simulation game",
    version="1.0.0",
    lifespan=lifespan
)


# Add CORS middleware for frontend
# Allow both the custom domain and the Cloud Run URL
allowed_origins = [
    "https://career-rl-frontend-1086514937351.europe-west1.run.app",
    "https://career-rl-frontend-qy7qschhma-ew.a.run.app",
    "http://localhost:3000",  # For local development
    "http://localhost:4173",  # For local preview
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Add CORS debugging middleware
@app.middleware("http")
async def log_cors_headers(request, call_next):
    """
    Log CORS-related headers for debugging
    """
    origin = request.headers.get("origin", "No origin header")
    method = request.method
    path = request.url.path
    
    # Log incoming request details
    logger.info(f"CORS Debug - Incoming: {method} {path} from origin: {origin}")
    
    # Process request
    response = await call_next(request)
    
    # Log outgoing CORS headers
    cors_headers = {
        key: value for key, value in response.headers.items() 
        if key.lower().startswith("access-control-")
    }
    
    if cors_headers:
        logger.info(f"CORS Debug - Outgoing headers for {path}: {cors_headers}")
    else:
        logger.warning(f"CORS Debug - No CORS headers in response for {path}")
    
    return response


# Request/Response Models
class CreateSessionRequest(BaseModel):
    """Request model for creating a new session"""
    profession: str = Field(..., description="Career profession (ios_engineer, data_analyst, product_designer, sales_associate)")
    level: int = Field(..., ge=1, le=10, description="Starting level (1-10)")


class CreateSessionResponse(BaseModel):
    """Response model for session creation"""
    session_id: str = Field(..., description="Unique session identifier")


class InvokeRequest(BaseModel):
    """Request model for agent invocation"""
    action: str = Field(..., description="Action to perform (interview, submit_answer, generate_task, submit_task, generate_event)")
    data: Dict[str, Any] = Field(default_factory=dict, description="Action-specific data")


class InvokeResponse(BaseModel):
    """Response model for agent invocation"""
    result: Dict[str, Any] = Field(..., description="Agent execution result")
    state: Dict[str, Any] = Field(..., description="Updated session state")


# Health check endpoint
@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint for Cloud Run
    
    Returns:
        Status message
    """
    return {"status": "healthy"}


@app.head("/health", status_code=status.HTTP_200_OK)
async def health_check_head():
    """Health check HEAD endpoint for Cloud Run"""
    return {"status": "healthy"}


@app.get("/metrics", status_code=status.HTTP_200_OK)
async def get_metrics():
    """
    Get system metrics for monitoring
    
    Returns:
        Comprehensive metrics including task generation and meeting conversation stats
    """
    from shared.metrics_tracker import get_metrics_tracker
    
    metrics_tracker = get_metrics_tracker()
    
    return {
        "task_generation": metrics_tracker.get_task_generation_stats(),
        "meeting_conversation": metrics_tracker.get_meeting_stats()
    }


logger.info("FastAPI application initialized")


# Session Management Endpoints

@app.post("/sessions", response_model=CreateSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: CreateSessionRequest,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Create a new game session
    
    Args:
        request: Session creation request with profession and level
        user_id: Optional authenticated user ID
        
    Returns:
        Session ID
        
    Raises:
        HTTPException: If session creation fails
    """
    try:
        # Generate unique session ID
        session_id = f"sess-{uuid.uuid4().hex[:12]}"
        
        # Calculate initial XP requirements
        xp_to_next_level = firestore_manager.calculate_xp_to_next_level(request.level, 0)
        
        # Initialize session data with graduated status
        session_data = {
            "session_id": session_id,
            "profession": request.profession,
            "level": request.level,
            "status": "graduated",  # Player starts as fresh graduate
            "xp": 0,
            "xp_to_next_level": xp_to_next_level,
            "current_job": None,
            "job_history": [],
            "cv_data": {
                "experience": [],
                "skills": [],
                "accomplishments": []
            },
            "stats": {
                "tasks_completed": 0,
                "interviews_passed": 0,
                "interviews_failed": 0,
                "jobs_held": 0
            },
            "state": {}
        }
        
        # Add user_id if authenticated
        if user_id:
            session_data["user_id"] = user_id
        
        # Create session in Firestore
        firestore_manager.create_session(session_id, session_data)
        
        logger.info(f"Created session {session_id} for profession={request.profession}, level={request.level}, status=graduated, user={user_id or 'anonymous'}")
        
        return CreateSessionResponse(session_id=session_id)
        
    except Exception as e:
        logger.error(f"Failed to create session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}"
        )


@app.post("/sessions/{session_id}/invoke", response_model=InvokeResponse)
async def invoke_agent(
    session_id: str,
    request: InvokeRequest,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Invoke ADK agent workflow for a session
    
    Args:
        session_id: Unique session identifier
        request: Invocation request with action and data
        user_id: Optional authenticated user ID
        
    Returns:
        Agent execution result and updated state
        
    Raises:
        HTTPException: If session not found or invocation fails
    """
    try:
        # Load session from Firestore
        try:
            session_data = firestore_manager.get_session(session_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        # Verify user owns this session (if authenticated)
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Prepare message content based on action
        message_content = prepare_message(request.action, request.data, session_data)
        
        # Get user_id (default to session_id if not set)
        user_id = session_data.get("user_id", session_id)
        
        logger.info(f"Invoking agent for session {session_id}, action={request.action}")
        
        # Run agent workflow
        events = adk_runner.run(
            user_id=user_id,
            session_id=session_id,
            new_message=message_content
        )
        
        # Collect results from events
        result = process_events(events)
        
        # Update session state in Firestore
        updated_state = {
            "state": result.get("state", {}),
            "status": result.get("status", session_data.get("status"))
        }
        firestore_manager.update_session(session_id, updated_state)
        
        logger.info(f"Agent invocation complete for session {session_id}")
        
        return InvokeResponse(
            result=result.get("output", {}),
            state=result.get("state", {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to invoke agent for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invoke agent: {str(e)}"
        )


def prepare_message(action: str, data: Dict[str, Any], session_data: Dict[str, Any]) -> str:
    """
    Prepare message content for agent based on action
    
    Args:
        action: Action to perform
        data: Action-specific data
        session_data: Current session data
        
    Returns:
        Message content string
    """
    profession = session_data.get("profession", "")
    level = session_data.get("level", 1)
    state = session_data.get("state", {})
    
    if action == "interview":
        return f"Generate interview questions for {profession} at level {level}"
    
    elif action == "submit_answer":
        answer = data.get("answer", "")
        questions = state.get("interview_questions", [])
        if questions:
            question = questions[0].get("question", "")
            expected = questions[0].get("expected_answer", "")
            return f"Grade this answer:\nQuestion: {question}\nExpected: {expected}\nPlayer Answer: {answer}"
        return f"Grade this answer: {answer}"
    
    elif action == "generate_task":
        return f"Generate a work task for {profession} at level {level}"
    
    elif action == "submit_task":
        answer = data.get("answer", "")
        task = state.get("current_task", {})
        task_prompt = task.get("task_prompt", "")
        criteria = task.get("acceptance_criteria", [])
        return f"Grade this task submission:\nTask: {task_prompt}\nCriteria: {criteria}\nSubmission: {answer}"
    
    elif action == "generate_event":
        recent_performance = state.get("recent_performance", "average")
        return f"Generate a career event for {profession} at level {level} with recent performance: {recent_performance}"
    
    else:
        return f"Action: {action}, Data: {data}"


def process_events(events) -> Dict[str, Any]:
    """
    Process ADK events and extract results
    
    Args:
        events: Iterator of ADK events
        
    Returns:
        Dictionary with output and state
    """
    result = {
        "output": {},
        "state": {},
        "status": "active"
    }
    
    try:
        for event in events:
            # Extract state updates from events
            if hasattr(event, 'state'):
                result["state"].update(event.state)
            
            # Extract output from events
            if hasattr(event, 'content'):
                result["output"]["content"] = event.content
            
            # Log event for debugging
            logger.debug(f"Event: {type(event).__name__}")
    
    except Exception as e:
        logger.error(f"Error processing events: {str(e)}")
        result["output"]["error"] = str(e)
    
    return result


# State Retrieval Endpoints

@app.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Get full session state
    
    Args:
        session_id: Unique session identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Complete session data
        
    Raises:
        HTTPException: If session not found or access denied
    """
    try:
        session_data = firestore_manager.get_session(session_id)
        
        # Verify user owns this session (if authenticated)
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        return session_data
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session: {str(e)}"
        )


@app.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def delete_session(
    session_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Delete a session and all associated data (jobs, tasks, CV, meetings)
    
    Args:
        session_id: Unique session identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If session not found or access denied
    """
    try:
        # Get session to verify ownership
        session_data = firestore_manager.get_session(session_id)
        
        # Verify user owns this session (if authenticated)
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Delete session and all associated data
        firestore_manager.delete_session(session_id)
        
        logger.info(f"Deleted session {session_id} and all associated data")
        
        return {
            "success": True,
            "message": f"Session {session_id} deleted successfully"
        }
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )


@app.get("/sessions/{session_id}/state")
async def get_player_state(
    session_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Get full player state for a session
    
    Args:
        session_id: Unique session identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Complete player state including level, XP, current job, stats
        
    Raises:
        HTTPException: If session not found or access denied
    """
    try:
        session_data = firestore_manager.get_session(session_id)
        
        # Verify user owns this session (if authenticated)
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Extract player state
        current_level = session_data.get("level", 1)
        current_xp = session_data.get("xp", 0)
        
        # Calculate XP to next level if not stored
        xp_to_next_level = session_data.get("xp_to_next_level")
        if xp_to_next_level is None:
            xp_to_next_level = firestore_manager.calculate_xp_to_next_level(current_level, current_xp)
        
        player_state = {
            "session_id": session_id,
            "status": session_data.get("status", "graduated"),
            "profession": session_data.get("profession", ""),
            "level": current_level,
            "xp": current_xp,
            "xp_to_next_level": xp_to_next_level,
            "current_job": session_data.get("current_job"),
            "job_history": session_data.get("job_history", []),
            "stats": session_data.get("stats", {
                "tasks_completed": 0,
                "interviews_passed": 0,
                "interviews_failed": 0,
                "jobs_held": 0
            }),
            "cv_data": session_data.get("cv_data", {
                "experience": [],
                "skills": [],
                "accomplishments": []
            })
        }
        
        return player_state
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get player state for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get player state: {str(e)}"
        )


@app.get("/sessions/{session_id}/cv")
async def get_cv(
    session_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Get CV data for a session
    
    Args:
        session_id: Unique session identifier
        user_id: Optional authenticated user ID
        
    Returns:
        CV data (bullets and skills)
        
    Raises:
        HTTPException: If session not found or access denied
    """
    try:
        session_data = firestore_manager.get_session(session_id)
        
        # Verify user owns this session (if authenticated)
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        cv_data = session_data.get("state", {}).get("cv_data", {})
        
        # Return empty CV structure if no data exists
        if not cv_data:
            cv_data = {
                "bullets": [],
                "skills": []
            }
        
        return cv_data
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get CV for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get CV: {str(e)}"
        )


# ==================== Job Market Flow Endpoints ====================

class GenerateJobsRequest(BaseModel):
    """Request model for generating job listings"""
    player_level: int = Field(..., ge=1, le=10, description="Player's current level (1-10)")
    count: int = Field(default=10, ge=1, le=20, description="Number of jobs to generate (1-20)")


@app.post("/sessions/{session_id}/jobs/generate")
async def generate_jobs(
    session_id: str,
    request: GenerateJobsRequest,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Generate job listings for a session
    
    Args:
        session_id: Unique session identifier
        request: Job generation request with player_level and count
        user_id: Optional authenticated user ID
        
    Returns:
        Array of job listings
        
    Raises:
        HTTPException: If session not found, access denied, or generation fails
    """
    try:
        # Verify session exists
        session_data = firestore_manager.get_session(session_id)
        
        # Verify user owns this session (if authenticated)
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Get profession from session
        profession = session_data.get("profession", "ios_engineer")
        
        logger.info(f"Generating {request.count} jobs for session {session_id}, profession {profession}, level {request.player_level}")
        
        # Generate jobs using workflow orchestrator
        job_listings = await workflow_orchestrator.generate_jobs(
            session_id=session_id,
            player_level=request.player_level,
            count=request.count,
            profession=profession
        )
        
        # Save jobs to Firestore with validation
        import uuid
        for job in job_listings:
            job_id = f"job-{uuid.uuid4().hex[:12]}"
            job['id'] = job_id
            
            # Ensure required fields exist
            if not job.get('company_name'):
                job['company_name'] = "TechCorp Inc"
                logger.warning(f"Job {job_id} missing company_name, using default")
            if not job.get('position'):
                job['position'] = "Software Engineer"
                logger.warning(f"Job {job_id} missing position, using default")
            if not job.get('description'):
                job['description'] = "Exciting opportunity to join our team"
                logger.warning(f"Job {job_id} missing description, using default")
            
            firestore_manager.create_job(job_id, session_id, job)
        
        logger.info(f"Successfully generated and saved {len(job_listings)} jobs")
        
        return {"jobs": job_listings}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate jobs for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate jobs: {str(e)}"
        )


@app.get("/sessions/{session_id}/jobs/{job_id}")
async def get_job_detail(
    session_id: str,
    job_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Get detailed job information
    
    Args:
        session_id: Unique session identifier
        job_id: Unique job identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Full job details including description, requirements, responsibilities, benefits,
        and eligibility status
        
    Raises:
        HTTPException: If session or job not found, or access denied
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Retrieve job from Firestore
        job_data = firestore_manager.get_job(job_id)
        
        # Verify job belongs to this session
        if job_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Job does not belong to this session"
            )
        
        # Check if player is eligible for this job
        player_level = session_data.get("level", 1)
        job_level = job_data.get("level", "entry")
        can_apply = firestore_manager.can_apply_to_job(player_level, job_level)
        
        # Add eligibility information to response
        job_data["can_apply"] = can_apply
        if not can_apply:
            job_data["eligibility_message"] = f"You need to be level {get_min_level_for_job(job_level)} or higher to apply for this {job_level}-level position."
        
        return job_data
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get job details: {str(e)}"
        )


def get_min_level_for_job(job_level: str) -> int:
    """
    Get minimum player level required for a job level.
    
    Args:
        job_level: Job level string (entry, mid, senior)
    
    Returns:
        Minimum player level required
    """
    job_level_lower = job_level.lower()
    if job_level_lower == "entry":
        return 1
    elif job_level_lower == "mid":
        return 4
    elif job_level_lower == "senior":
        return 8
    else:
        return 1


@app.post("/sessions/{session_id}/jobs/{job_id}/interview")
async def start_interview(
    session_id: str,
    job_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Start an interview for a job
    
    Args:
        session_id: Unique session identifier
        job_id: Unique job identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Array of interview questions
        
    Raises:
        HTTPException: If session or job not found, or interview generation fails
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Retrieve job details
        job_data = firestore_manager.get_job(job_id)
        
        # Verify job belongs to this session
        if job_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Job does not belong to this session"
            )
        
        logger.info(f"Starting interview for job {job_id} in session {session_id}")
        
        # Generate interview questions
        questions = await workflow_orchestrator.conduct_interview(
            session_id=session_id,
            job_title=job_data.get("position", ""),
            company_name=job_data.get("company_name", ""),
            requirements=job_data.get("requirements", []),
            level=job_data.get("level", "entry")
        )
        
        # Add unique IDs to questions
        import uuid
        for i, question in enumerate(questions):
            if "id" not in question:
                question["id"] = f"q{i+1}"
        
        # Store questions in session state for grading
        firestore_manager.update_session(session_id, {
            "interview_questions": questions,
            "interview_job_id": job_id
        })
        
        logger.info(f"Generated {len(questions)} interview questions")
        
        return {"questions": questions}
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start interview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start interview: {str(e)}"
        )


class SubmitInterviewRequest(BaseModel):
    """Request model for submitting interview answers"""
    answers: Dict[str, str] = Field(..., description="Dictionary mapping question IDs to answers")


@app.post("/sessions/{session_id}/jobs/{job_id}/interview/submit")
async def submit_interview(
    session_id: str,
    job_id: str,
    request: SubmitInterviewRequest,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Submit interview answers for grading
    
    Args:
        session_id: Unique session identifier
        job_id: Unique job identifier
        request: Interview submission with answers dictionary
        user_id: Optional authenticated user ID
        
    Returns:
        Interview result with pass/fail and feedback
        
    Raises:
        HTTPException: If session or job not found, or grading fails
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Retrieve stored interview questions
        questions = session_data.get("interview_questions", [])
        stored_job_id = session_data.get("interview_job_id")
        
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active interview found. Please start an interview first."
            )
        
        if stored_job_id != job_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Interview questions do not match this job"
            )
        
        logger.info(f"Grading interview for job {job_id} in session {session_id}")
        
        # Grade interview answers
        result = await workflow_orchestrator.grade_interview(
            session_id=session_id,
            questions=questions,
            answers=request.answers
        )
        
        # Update session stats
        stats = session_data.get("stats", {})
        if result["passed"]:
            stats["interviews_passed"] = stats.get("interviews_passed", 0) + 1
        else:
            stats["interviews_failed"] = stats.get("interviews_failed", 0) + 1
        
        firestore_manager.update_session(session_id, {"stats": stats})
        
        # Update job status
        firestore_manager.update_job_status(job_id, "applied")
        
        logger.info(f"Interview graded: passed={result['passed']}, score={result['overall_score']}")
        
        return result
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit interview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit interview: {str(e)}"
        )


@app.post("/sessions/{session_id}/jobs/{job_id}/accept")
async def accept_job_offer(
    session_id: str,
    job_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Accept a job offer after passing interview
    
    Args:
        session_id: Unique session identifier
        job_id: Unique job identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Success message with updated player state
        
    Raises:
        HTTPException: If session or job not found, or acceptance fails
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Check if job already accepted (idempotency check)
        current_job = session_data.get("current_job")
        if current_job and current_job.get("job_id") == job_id:
            logger.info(f"Job {job_id} already accepted for session {session_id}, returning existing state")
            
            # Return existing state with tasks
            tasks = firestore_manager.get_active_tasks(session_id)
            
            return {
                "success": True,
                "message": "Job already accepted",
                "player_state": {
                    "status": session_data.get("status", "employed"),
                    "current_job": current_job,
                    "cv_data": session_data.get("cv_data", {"experience": [], "skills": []})
                },
                "tasks": tasks
            }
        
        # Retrieve job details
        job_data = firestore_manager.get_job(job_id)
        
        # Verify job belongs to this session
        if job_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Job does not belong to this session"
            )
        
        logger.info(f"Accepting job {job_id} for session {session_id}")
        
        # Get current CV data
        current_cv = session_data.get("cv_data", {"experience": [], "skills": []})
        
        # Update CV with new job
        from datetime import datetime
        new_job_data = {
            "company_name": job_data.get("company_name", ""),
            "position": job_data.get("position", ""),
            "start_date": datetime.utcnow().isoformat(),
            "accomplishments": []
        }
        
        updated_cv = await workflow_orchestrator.update_cv(
            session_id=session_id,
            current_cv=current_cv,
            action="add_job",
            action_data=new_job_data
        )
        
        # Update player status to employed
        player_state = {
            "status": "employed",
            "current_job": {
                "job_id": job_id,
                "company_name": job_data.get("company_name", ""),
                "position": job_data.get("position", ""),
                "start_date": new_job_data["start_date"],
                "salary": job_data.get("salary_range", {}).get("max", 0)
            },
            "cv_data": updated_cv
        }
        
        firestore_manager.update_player_state(session_id, player_state)
        
        # Add job to history
        firestore_manager.add_job_to_history(session_id, player_state["current_job"])
        
        # Generate initial tasks and meetings IN PARALLEL (dynamic based on job level)
        import uuid
        import random
        import asyncio
        generated_tasks = []
        generated_meetings = []
        
        player_level = session_data.get("level", 1)
        job_level = job_data.get("level", "entry")
        
        # Determine task and meeting counts based on job level
        if job_level == "entry":
            # Entry level: 2-3 tasks, 1 meeting
            num_tasks = random.randint(2, 3)
            num_meetings = 1
            meeting_types = ["team_standup", "one_on_one"]
        elif job_level == "mid":
            # Mid level: 3-4 tasks, 1-2 meetings
            num_tasks = random.randint(3, 4)
            num_meetings = random.randint(1, 2)
            meeting_types = ["team_standup", "one_on_one", "project_review"]
        else:  # senior
            # Senior level: 4-5 tasks, 2-3 meetings
            num_tasks = random.randint(4, 5)
            num_meetings = random.randint(2, 3)
            meeting_types = ["team_standup", "one_on_one", "project_review", "stakeholder_presentation"]
        
        logger.info(f"Generating {num_tasks} work tasks and {num_meetings} meetings IN PARALLEL for {job_level} level job")
        
        # Generate work tasks and meetings IN PARALLEL
        async def generate_single_task(index: int):
            try:
                logger.info(f"[Task Gen] Starting generation for task {index+1}/{num_tasks}")
                task = await workflow_orchestrator.generate_task(
                    session_id=session_id,
                    job_title=job_data.get("position", ""),
                    company_name=job_data.get("company_name", ""),
                    player_level=player_level,
                    tasks_completed=session_data.get("stats", {}).get("tasks_completed", 0) + index
                )
                
                task_id = f"task-{uuid.uuid4().hex[:12]}"
                task["id"] = task_id
                task["task_type"] = "work"
                
                logger.info(f"[Task Gen] Task {index+1} generated: {task.get('title', 'Unknown')} (format: {task.get('format_type', 'unknown')})")
                logger.info(f"[Task Gen] Creating task {task_id} in Firestore with status: {task.get('status', 'pending')}")
                
                firestore_manager.create_task(task_id, session_id, task)
                
                logger.info(f"[Task Gen] Task {task_id} successfully created in Firestore")
                return task
            except Exception as e:
                logger.error(f"[Task Gen] Failed to generate work task {index+1}: {e}", exc_info=True)
                return None
        
        async def generate_single_meeting(index: int):
            meeting_type = random.choice(meeting_types)
            
            try:
                # Generate actual meeting object (not a task)
                meeting_data = await workflow_orchestrator.generate_meeting(
                    session_id=session_id,
                    meeting_type=meeting_type,
                    job_title=job_data.get("position", ""),
                    company_name=job_data.get("company_name", ""),
                    player_level=player_level,
                    recent_performance="new_hire" if index == 0 else "average"
                )
                
                meeting_id = f"meeting-{uuid.uuid4().hex[:12]}"
                meeting_data["id"] = meeting_id
                meeting_data["status"] = "scheduled"
                meeting_data["session_id"] = session_id
                
                # Normalize field names (AI might use duration_minutes instead of estimated_duration_minutes)
                if "duration_minutes" in meeting_data and "estimated_duration_minutes" not in meeting_data:
                    meeting_data["estimated_duration_minutes"] = meeting_data.pop("duration_minutes")
                
                # Store meeting in Firestore
                firestore_manager.create_meeting(meeting_id, session_id, meeting_data)
                
                logger.info(f"Generated meeting {index+1}: {meeting_data.get('title', 'Meeting')}")
                return meeting_data
            except Exception as e:
                logger.error(f"Failed to generate meeting {index+1}: {e}")
                return None
        
        # Run all generations in parallel
        task_coroutines = [generate_single_task(i) for i in range(num_tasks)]
        meeting_coroutines = [generate_single_meeting(i) for i in range(num_meetings)]
        
        # Execute all in parallel
        all_results = await asyncio.gather(*task_coroutines, *meeting_coroutines, return_exceptions=True)
        
        # Separate tasks and meetings from results
        generated_tasks = [r for r in all_results[:num_tasks] if r is not None and not isinstance(r, Exception)]
        generated_meetings = [r for r in all_results[num_tasks:] if r is not None and not isinstance(r, Exception)]
        
        # Log detailed results
        logger.info(f"[Task Gen] Generation complete: {len(generated_tasks)}/{num_tasks} tasks, {len(generated_meetings)}/{num_meetings} meetings")
        
        if len(generated_tasks) < num_tasks:
            failed_tasks = num_tasks - len(generated_tasks)
            logger.warning(f"[Task Gen] {failed_tasks} task(s) failed to generate")
            
        if len(generated_meetings) < num_meetings:
            failed_meetings = num_meetings - len(generated_meetings)
            logger.warning(f"[Task Gen] {failed_meetings} meeting(s) failed to generate")
        
        # Log task IDs for verification
        if generated_tasks:
            task_ids = [t.get('id', 'unknown') for t in generated_tasks]
            logger.info(f"[Task Gen] Generated task IDs: {task_ids}")
        
        logger.info(f"Job accepted, CV updated, {len(generated_tasks)} tasks and {len(generated_meetings)} meetings generated IN PARALLEL")
        
        # Update stats
        stats = session_data.get("stats", {})
        stats["jobs_held"] = stats.get("jobs_held", 0) + 1
        firestore_manager.update_session(session_id, {"stats": stats})
        
        return {
            "success": True,
            "message": "Job offer accepted successfully",
            "player_state": player_state,
            "tasks": generated_tasks,
            "meetings": generated_meetings
        }
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to accept job offer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to accept job offer: {str(e)}"
        )


@app.get("/sessions/{session_id}/tasks")
async def get_tasks(
    session_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Get active tasks for a session
    
    Args:
        session_id: Unique session identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Array of tasks with status (filtered to exclude invalid data)
        
    Raises:
        HTTPException: If session not found or access denied
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Retrieve active tasks
        tasks = firestore_manager.get_active_tasks(session_id)
        
        # Filter out any meetings that might have been stored as tasks
        # Also filter out deprecated matching tasks
        validated_tasks = []
        for task in tasks:
            # Skip deprecated matching tasks
            if task.get('format_type') == 'matching':
                logger.info(f"Filtering out deprecated matching task {task.get('id')} from session {session_id}")
                continue
                
            is_valid, error_msg = firestore_manager.validate_task_data(task)
            if is_valid:
                validated_tasks.append(task)
            else:
                logger.warning(f"Found invalid task {task.get('id')} in session {session_id}: {error_msg}")
                logger.warning(f"This item should be in meetings collection: {task}")
        
        # Log filtering summary if any invalid tasks were found
        if len(validated_tasks) < len(tasks):
            filtered_count = len(tasks) - len(validated_tasks)
            logger.info(f"Filtered {filtered_count} invalid task(s) from {len(tasks)} total for session {session_id}")
        
        return {"tasks": validated_tasks}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get tasks for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tasks: {str(e)}"
        )


class SubmitTaskRequest(BaseModel):
    """Request model for submitting task solution"""
    solution: str = Field(..., description="Player's solution to the task")


@app.post("/sessions/{session_id}/tasks/{task_id}/submit")
async def submit_task(
    session_id: str,
    task_id: str,
    request: SubmitTaskRequest,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Submit a task solution for grading
    
    Args:
        session_id: Unique session identifier
        task_id: Unique task identifier
        request: Task submission with solution text
        user_id: Optional authenticated user ID
        
    Returns:
        Grading result, XP gained, level up status
        
    Raises:
        HTTPException: If session or task not found, or grading fails
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Retrieve task
        task_data = firestore_manager.get_task(task_id)
        
        # Verify task belongs to this session
        if task_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Task does not belong to this session"
            )
        
        logger.info(f"Grading task {task_id} for session {session_id}")
        
        # Grade task
        result = await workflow_orchestrator.grade_task(
            session_id=session_id,
            task=task_data,
            solution=request.solution,
            player_level=session_data.get("level", 1),
            current_xp=session_data.get("xp", 0)
        )
        
        # Update task status
        firestore_manager.update_task(task_id, {
            "status": "completed" if result["passed"] else "failed",
            "solution": request.solution,
            "score": result["score"],
            "feedback": result["feedback"],
            "attempts": task_data.get("attempts", 0) + 1
        })
        
        # Check if task failed and should trigger a meeting
        if not result["passed"]:
            attempts = task_data.get("attempts", 0) + 1
            
            # If task failed 2+ times, trigger a feedback meeting
            if attempts >= 2:
                current_job = session_data.get("current_job", {})
                if current_job:
                    try:
                        logger.info(f"Task {task_id} failed {attempts} times, triggering feedback meeting")
                        
                        meeting_data = await workflow_orchestrator.generate_meeting(
                            session_id=session_id,
                            meeting_type="feedback_session",
                            job_title=current_job.get("position", ""),
                            company_name=current_job.get("company_name", ""),
                            player_level=session_data.get("level", 1),
                            recent_performance="needs_improvement"
                        )
                        
                        # Save meeting to Firestore
                        meeting_id = f"meeting-{uuid.uuid4().hex[:12]}"
                        meeting_data["id"] = meeting_id
                        meeting_data["session_id"] = session_id
                        meeting_data["status"] = "scheduled"
                        meeting_data["trigger_reason"] = f"task_failure_{task_id}"
                        
                        # Normalize field names
                        if "duration_minutes" in meeting_data and "estimated_duration_minutes" not in meeting_data:
                            meeting_data["estimated_duration_minutes"] = meeting_data.pop("duration_minutes")
                        
                        firestore_manager.create_meeting(meeting_id, session_id, meeting_data)
                        
                        result["meeting_triggered"] = True
                        result["meeting_id"] = meeting_id
                        result["meeting_reason"] = "task_failure"
                        
                        logger.info(f"Feedback meeting triggered: {meeting_id} due to task failures")
                    except Exception as e:
                        logger.error(f"Failed to generate feedback meeting: {e}")
        
        # Award XP and check for level up
        if result["passed"]:
            xp_result = firestore_manager.add_xp(session_id, result["xp_gained"])
            result["new_xp"] = xp_result["new_xp"]
            result["new_level"] = xp_result["new_level"]
            result["level_up"] = xp_result["leveled_up"]
            result["xp_to_next_level"] = xp_result["xp_to_next_level"]
            
            # Update task completion stats
            stats = session_data.get("stats", {})
            tasks_completed = stats.get("tasks_completed", 0) + 1
            stats["tasks_completed"] = tasks_completed
            firestore_manager.update_session(session_id, {"stats": stats})
            
            # Check if a meeting should be triggered
            recent_tasks = firestore_manager.get_completed_tasks(session_id, limit=5)
            meeting_trigger = await workflow_orchestrator.should_trigger_meeting(
                session_id=session_id,
                tasks_completed=tasks_completed,
                player_level=result["new_level"],
                recent_tasks=recent_tasks
            )
            
            if meeting_trigger:
                # Generate and schedule a meeting
                current_job = session_data.get("current_job", {})
                if current_job:
                    try:
                        meeting_data = await workflow_orchestrator.generate_meeting(
                            session_id=session_id,
                            meeting_type=meeting_trigger["meeting_type"],
                            job_title=current_job.get("position", ""),
                            company_name=current_job.get("company_name", ""),
                            player_level=result["new_level"],
                            recent_performance=meeting_trigger["recent_performance"]
                        )
                        
                        # Save meeting to Firestore
                        meeting_id = f"meeting-{uuid.uuid4().hex[:12]}"
                        meeting_data["id"] = meeting_id
                        meeting_data["session_id"] = session_id
                        meeting_data["status"] = "scheduled"
                        meeting_data["responses"] = []
                        meeting_data["current_topic_index"] = 0
                        meeting_data["conversation_history"] = []
                        
                        # Normalize field names
                        if "duration_minutes" in meeting_data and "estimated_duration_minutes" not in meeting_data:
                            meeting_data["estimated_duration_minutes"] = meeting_data.pop("duration_minutes")
                        
                        firestore_manager.create_meeting(meeting_id, session_id, meeting_data)
                        
                        # Update last meeting trigger
                        firestore_manager.update_session(session_id, {
                            "last_meeting_trigger_at_task": tasks_completed
                        })
                        
                        result["meeting_triggered"] = True
                        result["meeting_id"] = meeting_id
                        result["meeting_type"] = meeting_trigger["meeting_type"]
                        
                        logger.info(f"Meeting triggered: {meeting_id} ({meeting_trigger['meeting_type']})")
                    except Exception as e:
                        logger.error(f"Failed to generate meeting: {e}")
                        # Don't fail task submission if meeting generation fails
            
            # Generate new tasks and meetings if dashboard is getting low
            active_tasks = firestore_manager.get_active_tasks(session_id)
            active_meetings = firestore_manager.get_active_meetings(session_id)
            
            # Target: 3-5 tasks and 1-2 meetings on dashboard
            tasks_to_generate = max(0, 3 - len(active_tasks))
            meetings_to_generate = max(0, 1 - len(active_meetings))
            
            new_tasks = []
            new_meetings = []
            
            # Generate tasks if needed
            if tasks_to_generate > 0:
                logger.info(f"Dashboard low on tasks ({len(active_tasks)}), generating {tasks_to_generate} new tasks")
                
                for i in range(tasks_to_generate):
                    try:
                        new_task = await workflow_orchestrator.generate_task(
                            session_id=session_id,
                            job_title=session_data.get("current_job", {}).get("position", ""),
                            company_name=session_data.get("current_job", {}).get("company_name", ""),
                            player_level=result["new_level"],
                            tasks_completed=tasks_completed + i
                        )
                        
                        new_task_id = f"task-{uuid.uuid4().hex[:12]}"
                        new_task["id"] = new_task_id
                        new_task["task_type"] = "work"
                        firestore_manager.create_task(new_task_id, session_id, new_task)
                        new_tasks.append(new_task)
                        logger.info(f"Generated task {i+1}/{tasks_to_generate}: {new_task.get('title')}")
                    except Exception as e:
                        logger.error(f"Failed to generate task {i+1}: {e}")
            
            # Generate meetings if needed (occasionally)
            if meetings_to_generate > 0 and random.random() < 0.5:  # 50% chance
                logger.info(f"Dashboard low on meetings ({len(active_meetings)}), generating {meetings_to_generate} new meetings")
                
                current_job = session_data.get("current_job", {})
                if current_job:
                    for i in range(meetings_to_generate):
                        try:
                            # Determine meeting type based on recent activity
                            meeting_types = ["one_on_one", "team_meeting", "project_update"]
                            meeting_type = random.choice(meeting_types)
                            
                            meeting_data = await workflow_orchestrator.generate_meeting(
                                session_id=session_id,
                                meeting_type=meeting_type,
                                job_title=current_job.get("position", ""),
                                company_name=current_job.get("company_name", ""),
                                player_level=result["new_level"],
                                recent_performance="good"
                            )
                            
                            meeting_id = f"meeting-{uuid.uuid4().hex[:12]}"
                            meeting_data["id"] = meeting_id
                            meeting_data["session_id"] = session_id
                            meeting_data["status"] = "scheduled"
                            
                            # Normalize field names
                            if "duration_minutes" in meeting_data and "estimated_duration_minutes" not in meeting_data:
                                meeting_data["estimated_duration_minutes"] = meeting_data.pop("duration_minutes")
                            
                            firestore_manager.create_meeting(meeting_id, session_id, meeting_data)
                            new_meetings.append(meeting_data)
                            logger.info(f"Generated meeting {i+1}/{meetings_to_generate}: {meeting_data.get('title')}")
                        except Exception as e:
                            logger.error(f"Failed to generate meeting {i+1}: {e}")
            
            # Add to result
            if new_tasks:
                result["new_tasks"] = new_tasks
            if new_meetings:
                result["new_meetings"] = new_meetings
            
            # Update CV with accomplishment
            current_cv = session_data.get("cv_data", {"experience": [], "skills": []})
            accomplishment = f"Completed: {task_data.get('title', 'task')}"
            
            updated_cv = await workflow_orchestrator.update_cv(
                session_id=session_id,
                current_cv=current_cv,
                action="update_accomplishments",
                action_data={"accomplishment": accomplishment}
            )
            
            firestore_manager.update_cv(session_id, updated_cv)
        
        logger.info(f"Task graded: passed={result['passed']}, xp_gained={result.get('xp_gained', 0)}")
        
        return result
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task {task_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit task: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit task: {str(e)}"
        )


@app.post("/sessions/{session_id}/jobs/refresh")
async def refresh_jobs(
    session_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Refresh job listings by marking old ones as expired and generating new ones
    
    Args:
        session_id: Unique session identifier
        user_id: Optional authenticated user ID
        
    Returns:
        New job listings
        
    Raises:
        HTTPException: If session not found or refresh fails
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        logger.info(f"Refreshing jobs for session {session_id}")
        
        # Mark old active jobs as expired
        old_jobs = firestore_manager.get_jobs_by_session(session_id, status="active")
        for job in old_jobs:
            firestore_manager.update_job_status(job["job_id"], "expired")
        
        logger.info(f"Marked {len(old_jobs)} old jobs as expired")
        
        # Generate new jobs
        player_level = session_data.get("level", 1)
        profession = session_data.get("profession", "ios_engineer")
        job_listings = await workflow_orchestrator.generate_jobs(
            session_id=session_id,
            player_level=player_level,
            count=10,
            profession=profession
        )
        
        # Save new jobs to Firestore
        import uuid
        for job in job_listings:
            job_id = f"job-{uuid.uuid4().hex[:12]}"
            job['id'] = job_id
            firestore_manager.create_job(job_id, session_id, job)
        
        logger.info(f"Generated and saved {len(job_listings)} new jobs")
        
        return {"jobs": job_listings}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to refresh jobs for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh jobs: {str(e)}"
        )


# ==================== Voice Input Endpoints ====================

@app.post("/sessions/{session_id}/interview/voice")
async def submit_interview_voice_answer(
    session_id: str,
    question_id: str = Form(...),
    audio: UploadFile = File(...),
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Submit a voice answer for an interview question
    
    Args:
        session_id: Unique session identifier
        question_id: Question identifier
        audio: Audio file (WebM, MP3, or WAV)
        user_id: Optional authenticated user ID
        
    Returns:
        Transcription and grading result
        
    Raises:
        HTTPException: If session not found or processing fails
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Retrieve stored interview questions
        questions = session_data.get("interview_questions", [])
        
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active interview found. Please start an interview first."
            )
        
        # Find the specific question
        question_data = None
        for q in questions:
            if q.get("id") == question_id:
                question_data = q
                break
        
        if not question_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question {question_id} not found"
            )
        
        logger.info(f"Processing voice answer for question {question_id} in session {session_id}")
        logger.info(f"Audio content type: {audio.content_type}, filename: {audio.filename}")
        
        # Validate audio format
        valid_audio_types = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg']
        content_type = audio.content_type or ''
        
        # Extract base content type (remove codec info)
        base_content_type = content_type.split(';')[0].strip()
        
        if base_content_type not in valid_audio_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported audio format: {content_type}. Supported formats: WebM, MP3, WAV, OGG"
            )
        
        # Determine file extension based on content type
        extension_map = {
            'audio/webm': '.webm',
            'audio/mp3': '.mp3',
            'audio/mpeg': '.mp3',
            'audio/wav': '.wav',
            'audio/ogg': '.ogg'
        }
        file_extension = extension_map.get(base_content_type, '.webm')
        
        # Validate file size (max 10MB)
        content = await audio.read()
        max_size = 10 * 1024 * 1024  # 10MB
        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Audio file too large. Maximum size is 10MB"
            )
        
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio file is empty"
            )
        
        # Save audio file temporarily with correct extension
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(content)
            temp_audio_path = temp_file.name
        
        try:
            # Process voice input using Gemini multimodal
            result = await workflow_orchestrator.grade_voice_answer(
                session_id=session_id,
                question=question_data.get("question", ""),
                expected_answer=question_data.get("expected_answer", ""),
                audio_path=temp_audio_path,
                mime_type=base_content_type
            )
            
            logger.info(f"Voice answer processed: transcription length={len(result.get('transcription', ''))}, score={result.get('score', 0)}")
            
            return result
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process voice answer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process voice answer: {str(e)}"
        )


@app.post("/sessions/{session_id}/tasks/{task_id}/voice")
async def submit_task_voice_solution(
    session_id: str,
    task_id: str,
    audio: UploadFile = File(...),
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Submit a voice solution for a task
    
    Args:
        session_id: Unique session identifier
        task_id: Task identifier
        audio: Audio file (WebM, MP3, or WAV)
        user_id: Optional authenticated user ID
        
    Returns:
        Transcription and grading result with XP
        
    Raises:
        HTTPException: If session or task not found, or processing fails
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Retrieve task
        task_data = firestore_manager.get_task(task_id)
        
        # Verify task belongs to this session
        if task_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Task does not belong to this session"
            )
        
        logger.info(f"Processing voice solution for task {task_id} in session {session_id}")
        logger.info(f"Audio content type: {audio.content_type}, filename: {audio.filename}")
        
        # Validate audio format
        valid_audio_types = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg']
        content_type = audio.content_type or ''
        
        # Extract base content type (remove codec info)
        base_content_type = content_type.split(';')[0].strip()
        
        if base_content_type not in valid_audio_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported audio format: {content_type}. Supported formats: WebM, MP3, WAV, OGG"
            )
        
        # Determine file extension based on content type
        extension_map = {
            'audio/webm': '.webm',
            'audio/mp3': '.mp3',
            'audio/mpeg': '.mp3',
            'audio/wav': '.wav',
            'audio/ogg': '.ogg'
        }
        file_extension = extension_map.get(base_content_type, '.webm')
        
        # Validate file size (max 10MB)
        content = await audio.read()
        max_size = 10 * 1024 * 1024  # 10MB
        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Audio file too large. Maximum size is 10MB"
            )
        
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio file is empty"
            )
        
        # Save audio file temporarily with correct extension
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(content)
            temp_audio_path = temp_file.name
        
        try:
            # Process voice input using Gemini multimodal
            result = await workflow_orchestrator.grade_voice_task(
                session_id=session_id,
                task=task_data,
                audio_path=temp_audio_path,
                player_level=session_data.get("level", 1),
                current_xp=session_data.get("xp", 0),
                mime_type=base_content_type
            )
            
            # Update task status
            firestore_manager.update_task(task_id, {
                "status": "completed" if result["passed"] else "pending",
                "solution": result.get("transcription", "[Voice Solution]"),
                "score": result["score"],
                "feedback": result["feedback"]
            })
            
            # Award XP and check for level up
            if result["passed"]:
                xp_result = firestore_manager.add_xp(session_id, result["xp_gained"])
                result["new_xp"] = xp_result["new_xp"]
                result["new_level"] = xp_result["new_level"]
                result["level_up"] = xp_result["leveled_up"]
                result["xp_to_next_level"] = xp_result["xp_to_next_level"]
                
                # Update task completion stats
                stats = session_data.get("stats", {})
                tasks_completed = stats.get("tasks_completed", 0) + 1
                stats["tasks_completed"] = tasks_completed
                firestore_manager.update_session(session_id, {"stats": stats})
                
                # Check if a meeting should be triggered
                recent_tasks = firestore_manager.get_completed_tasks(session_id, limit=5)
                meeting_trigger = await workflow_orchestrator.should_trigger_meeting(
                    session_id=session_id,
                    tasks_completed=tasks_completed,
                    player_level=result["new_level"],
                    recent_tasks=recent_tasks
                )
                
                if meeting_trigger:
                    # Generate and schedule a meeting
                    current_job = session_data.get("current_job", {})
                    if current_job:
                        try:
                            meeting_data = await workflow_orchestrator.generate_meeting(
                                session_id=session_id,
                                meeting_type=meeting_trigger["meeting_type"],
                                job_title=current_job.get("position", ""),
                                company_name=current_job.get("company_name", ""),
                                player_level=result["new_level"],
                                recent_performance=meeting_trigger["recent_performance"]
                            )
                            
                            # Save meeting to Firestore
                            meeting_id = f"meeting-{uuid.uuid4().hex[:12]}"
                            meeting_data["id"] = meeting_id
                            meeting_data["session_id"] = session_id
                            meeting_data["status"] = "scheduled"
                            meeting_data["responses"] = []
                            meeting_data["current_topic_index"] = 0
                            meeting_data["conversation_history"] = []
                            
                            # Normalize field names
                            if "duration_minutes" in meeting_data and "estimated_duration_minutes" not in meeting_data:
                                meeting_data["estimated_duration_minutes"] = meeting_data.pop("duration_minutes")
                            
                            firestore_manager.create_meeting(meeting_id, session_id, meeting_data)
                            
                            # Update last meeting trigger
                            firestore_manager.update_session(session_id, {
                                "last_meeting_trigger_at_task": tasks_completed
                            })
                            
                            result["meeting_triggered"] = True
                            result["meeting_id"] = meeting_id
                            result["meeting_type"] = meeting_trigger["meeting_type"]
                            
                            logger.info(f"Meeting triggered: {meeting_id} ({meeting_trigger['meeting_type']})")
                        except Exception as e:
                            logger.error(f"Failed to generate meeting: {e}")
                            # Don't fail task submission if meeting generation fails
                
                # Generate new task if needed
                active_tasks = firestore_manager.get_active_tasks(session_id)
                if len(active_tasks) < 3:
                    new_task = await workflow_orchestrator.generate_task(
                        session_id=session_id,
                        job_title=session_data.get("current_job", {}).get("position", ""),
                        company_name=session_data.get("current_job", {}).get("company_name", ""),
                        player_level=result["new_level"],
                        tasks_completed=tasks_completed
                    )
                    
                    new_task_id = f"task-{uuid.uuid4().hex[:12]}"
                    new_task["id"] = new_task_id
                    firestore_manager.create_task(new_task_id, session_id, new_task)
                    result["new_task"] = new_task
                
                # Update CV with accomplishment
                current_cv = session_data.get("cv_data", {"experience": [], "skills": []})
                accomplishment = f"Completed: {task_data.get('title', 'task')}"
                
                updated_cv = await workflow_orchestrator.update_cv(
                    session_id=session_id,
                    current_cv=current_cv,
                    action="update_accomplishments",
                    action_data={"accomplishment": accomplishment}
                )
                
                firestore_manager.update_cv(session_id, updated_cv)
            
            logger.info(f"Voice task graded: passed={result['passed']}, xp_gained={result.get('xp_gained', 0)}")
            
            return result
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task {task_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process voice task solution: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process voice task solution: {str(e)}"
        )


# ==================== Meeting System Endpoints ====================

class GenerateMeetingRequest(BaseModel):
    """Request model for generating a meeting"""
    meeting_type: str = Field(..., description="Type of meeting (one_on_one, team_meeting, stakeholder_presentation, performance_review, project_update, feedback_session)")


@app.get("/sessions/{session_id}/meetings")
async def get_meetings(
    session_id: str,
    meeting_status: Optional[str] = None,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Get all meetings for a session
    
    Args:
        session_id: Unique session identifier
        meeting_status: Optional filter by status (scheduled, in_progress, completed)
        user_id: Optional authenticated user ID
        
    Returns:
        Array of meetings (scheduled, in-progress, completed, filtered to exclude invalid data)
        
    Raises:
        HTTPException: If session not found or access denied
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Retrieve meetings from Firestore
        meetings = firestore_manager.get_meetings_by_session(session_id, status=meeting_status)
        
        # Filter out any tasks that might have been stored as meetings
        validated_meetings = []
        for meeting in meetings:
            is_valid, error_msg = firestore_manager.validate_meeting_data(meeting)
            if is_valid:
                validated_meetings.append(meeting)
            else:
                logger.warning(f"Found invalid meeting {meeting.get('id')} in session {session_id}: {error_msg}")
                logger.warning(f"This item should be in tasks collection: {meeting}")
        
        # Log filtering summary if any invalid meetings were found
        if len(validated_meetings) < len(meetings):
            filtered_count = len(meetings) - len(validated_meetings)
            logger.info(f"Filtered {filtered_count} invalid meeting(s) from {len(meetings)} total for session {session_id}")
        
        return {"meetings": validated_meetings}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get meetings for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get meetings: {str(e)}"
        )


@app.post("/sessions/{session_id}/meetings/generate")
async def generate_meeting(
    session_id: str,
    request: GenerateMeetingRequest,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Generate a virtual meeting scenario
    
    Args:
        session_id: Unique session identifier
        request: Meeting generation request with meeting type
        user_id: Optional authenticated user ID
        
    Returns:
        Meeting data with participants, topics, and context
        
    Raises:
        HTTPException: If session not found or generation fails
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Verify player is employed
        if session_data.get("status") != "employed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Player must be employed to attend meetings"
            )
        
        current_job = session_data.get("current_job", {})
        if not current_job:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active job found"
            )
        
        logger.info(f"Generating {request.meeting_type} meeting for session {session_id}")
        
        # Calculate recent performance based on completed tasks
        stats = session_data.get("stats", {})
        tasks_completed = stats.get("tasks_completed", 0)
        if tasks_completed < 3:
            recent_performance = "new_employee"
        elif tasks_completed < 10:
            recent_performance = "developing"
        else:
            recent_performance = "strong"
        
        # Generate meeting using workflow orchestrator
        meeting_data = await workflow_orchestrator.generate_meeting(
            session_id=session_id,
            meeting_type=request.meeting_type,
            job_title=current_job.get("position", ""),
            company_name=current_job.get("company_name", ""),
            player_level=session_data.get("level", 1),
            recent_performance=recent_performance
        )
        
        # Save meeting to Firestore
        import uuid
        meeting_id = f"meeting-{uuid.uuid4().hex[:12]}"
        meeting_data["id"] = meeting_id
        meeting_data["session_id"] = session_id
        meeting_data["status"] = "active"
        meeting_data["responses"] = []
        meeting_data["current_topic_index"] = 0
        
        # Normalize field names
        if "duration_minutes" in meeting_data and "estimated_duration_minutes" not in meeting_data:
            meeting_data["estimated_duration_minutes"] = meeting_data.pop("duration_minutes")
        
        firestore_manager.create_meeting(meeting_id, session_id, meeting_data)
        
        logger.info(f"Generated meeting {meeting_id} with {len(meeting_data.get('topics', []))} topics")
        
        return meeting_data
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate meeting: {str(e)}"
        )


@app.get("/sessions/{session_id}/meetings/{meeting_id}")
async def get_meeting(
    session_id: str,
    meeting_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Get meeting details and current state
    
    Args:
        session_id: Unique session identifier
        meeting_id: Unique meeting identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Meeting data with participants, topics, and response history
        
    Raises:
        HTTPException: If session or meeting not found
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Retrieve meeting from Firestore
        meeting_data = firestore_manager.get_meeting(meeting_id)
        
        # Verify meeting belongs to this session
        if meeting_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Meeting does not belong to this session"
            )
        
        return meeting_data
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meeting {meeting_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get meeting {meeting_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get meeting: {str(e)}"
        )


@app.post("/sessions/{session_id}/meetings/{meeting_id}/join")
async def join_meeting(
    session_id: str,
    meeting_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Join a scheduled meeting
    
    This endpoint initializes the meeting state in Firestore if it's the first join,
    generates the initial AI discussion using MeetingOrchestrator, and returns the
    meeting state with conversation history. It sets appropriate status and turn flags.
    
    Args:
        session_id: Unique session identifier
        meeting_id: Unique meeting identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Dictionary containing:
            - meeting_id: Meeting identifier
            - status: Meeting status (in_progress)
            - current_topic_index: Current topic index
            - conversation_history: List of conversation messages
            - is_player_turn: Boolean indicating if it's player's turn
            - meeting_data: Full meeting data for UI display
        
    Raises:
        HTTPException: If session or meeting not found, or meeting already completed
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Use MeetingStateManager for state operations
        from shared.meeting_state_manager import MeetingStateManager
        state_manager = MeetingStateManager()
        
        # Retrieve meeting from Firestore
        meeting_data = firestore_manager.get_meeting(meeting_id)
        
        # Verify meeting belongs to this session
        if meeting_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Meeting does not belong to this session"
            )
        
        # Check if meeting is already completed
        current_status = meeting_data.get("status", "scheduled")
        if current_status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Meeting has already been completed"
            )
        
        logger.info(f"Joining meeting {meeting_id} for session {session_id}, current status: {current_status}")
        
        # Check if this is the first join (meeting is scheduled or has no conversation history)
        conversation_history = meeting_data.get("conversation_history", [])
        is_first_join = current_status == "scheduled" or len(conversation_history) == 0
        
        if is_first_join:
            # Initialize conversation with first topic
            topics = meeting_data.get("topics", [])
            if not topics:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Meeting has no topics"
                )
            
            # Update status to in_progress
            state_manager.update_meeting_status(meeting_id, "in_progress")
            
            # Use MeetingOrchestrator to start the first topic discussion
            orchestrator = get_meeting_orchestrator()
            messages = await orchestrator.start_topic_discussion(
                meeting_id=meeting_id,
                topic_index=0
            )
            
            logger.info(f"Meeting {meeting_id} started with {len(messages)} initial messages")
        else:
            # Rejoining an in-progress meeting - just return current state
            logger.info(f"Rejoining in-progress meeting {meeting_id}")
        
        # Get updated meeting state
        meeting_state = state_manager.get_meeting_state(meeting_id)
        
        return {
            "meeting_id": meeting_id,
            "status": meeting_state.get("status", "in_progress"),
            "current_topic_index": meeting_state.get("current_topic_index", 0),
            "conversation_history": meeting_state.get("conversation_history", []),
            "is_player_turn": meeting_state.get("is_player_turn", False),
            "meeting_data": {
                "id": meeting_id,
                "meeting_type": meeting_state.get("meeting_type", ""),
                "title": meeting_state.get("title", ""),
                "context": meeting_state.get("context", ""),
                "participants": meeting_state.get("participants", []),
                "topics": meeting_state.get("topics", []),
                "objective": meeting_state.get("objective", ""),
                "estimated_duration_minutes": meeting_state.get("estimated_duration_minutes", 30),
                "priority": meeting_state.get("priority", "medium")
            }
        }
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meeting {meeting_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to join meeting {meeting_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join meeting: {str(e)}"
        )


class RespondToMeetingRequest(BaseModel):
    """Request model for responding to a meeting topic"""
    topic_id: str = Field(..., description="ID of the topic being responded to")
    response: str = Field(..., description="Player's response to the topic")


@app.post("/sessions/{session_id}/meetings/{meeting_id}/topics/{topic_index}/start")
async def start_meeting_topic(
    session_id: str,
    meeting_id: str,
    topic_index: int,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Start a new topic in an ongoing meeting
    
    This endpoint is called by the frontend to start a new topic after the previous
    topic is complete. It generates the topic introduction and initial AI discussion.
    
    Args:
        session_id: Unique session identifier
        meeting_id: Unique meeting identifier
        topic_index: Index of the topic to start (0-based)
        user_id: Optional authenticated user ID
        
    Returns:
        Dictionary containing:
            - messages: List of messages (topic intro + AI discussion)
            - current_topic_index: Updated topic index
            - is_player_turn: Boolean indicating if it's player's turn
        
    Raises:
        HTTPException: If session/meeting not found or topic start fails
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Use MeetingStateManager for state operations
        from shared.meeting_state_manager import MeetingStateManager
        state_manager = MeetingStateManager()
        
        # Retrieve meeting from Firestore
        meeting_data = state_manager.get_meeting_state(meeting_id)
        
        # Verify meeting belongs to this session
        if meeting_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Meeting does not belong to this session"
            )
        
        # Validate topic index
        topics = meeting_data.get("topics", [])
        if topic_index < 0 or topic_index >= len(topics):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid topic index {topic_index}"
            )
        
        logger.info(f"Starting topic {topic_index} for meeting {meeting_id}")
        
        # Use MeetingOrchestrator to start the topic discussion
        orchestrator = get_meeting_orchestrator()
        messages = await orchestrator.start_topic_discussion(
            meeting_id=meeting_id,
            topic_index=topic_index
        )
        
        # Get updated meeting state
        updated_meeting = state_manager.get_meeting_state(meeting_id)
        
        logger.info(f"Topic {topic_index} started with {len(messages)} messages")
        
        return {
            "messages": messages,
            "current_topic_index": updated_meeting.get("current_topic_index", topic_index),
            "is_player_turn": updated_meeting.get("is_player_turn", False)
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start topic {topic_index}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start topic: {str(e)}"
        )


@app.post("/sessions/{session_id}/meetings/{meeting_id}/respond")
async def respond_to_meeting(
    session_id: str,
    meeting_id: str,
    request: RespondToMeetingRequest,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Submit a response to a meeting topic and get AI colleague responses
    
    This endpoint stores the player response in Firestore, generates AI reactions
    using MeetingOrchestrator, updates meeting state (topic index, turn flags),
    and returns the updated conversation state. It handles meeting completion
    when all topics are finished.
    
    Args:
        session_id: Unique session identifier
        meeting_id: Unique meeting identifier
        request: Response with topic_id and player's response text
        user_id: Optional authenticated user ID
        
    Returns:
        Dictionary containing:
            - ai_responses: List of AI colleague responses (legacy format)
            - evaluation: Player response evaluation with score and feedback
            - next_topic_index: Index of next topic (if any)
            - meeting_complete: Boolean indicating if meeting is done
            - topic_complete: Boolean indicating if current topic is done
            - conversation_history: Updated conversation history
            - is_player_turn: Boolean indicating if it's player's turn
        
    Raises:
        HTTPException: If session or meeting not found, or response fails
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Use MeetingStateManager for state operations
        from shared.meeting_state_manager import MeetingStateManager
        state_manager = MeetingStateManager()
        
        # Retrieve meeting from Firestore
        meeting_data = state_manager.get_meeting_state(meeting_id)
        
        # Verify meeting belongs to this session
        if meeting_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Meeting does not belong to this session"
            )
        
        # Find the topic
        topics = meeting_data.get("topics", [])
        topic_data = None
        for topic in topics:
            if topic.get("id") == request.topic_id:
                topic_data = topic
                break
        
        if not topic_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Topic {request.topic_id} not found in meeting"
            )
        
        logger.info(f"Processing response to topic {request.topic_id} in meeting {meeting_id}")
        
        # Use MeetingOrchestrator to process player response
        orchestrator = get_meeting_orchestrator()
        result = await orchestrator.process_player_response(
            meeting_id=meeting_id,
            topic_id=request.topic_id,
            response=request.response
        )
        
        # Convert AI messages to legacy format for compatibility
        ai_responses = []
        for ai_msg in result['ai_messages']:
            ai_responses.append({
                "participant_name": ai_msg.get("participant_name", ""),
                "response": ai_msg.get("content", ""),
                "sentiment": ai_msg.get("sentiment", "neutral")
            })
        
        # Grade the player's response
        evaluation = await workflow_orchestrator.grade_meeting_response(
            session_id=session_id,
            topic=topic_data,
            player_response=request.response,
            player_level=session_data.get("level", 1)
        )
        
        # Store response in meeting data for legacy compatibility
        response_record = {
            "topic_id": request.topic_id,
            "player_response": request.response,
            "ai_responses": ai_responses,
            "evaluation": evaluation,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        meeting_responses = meeting_data.get("responses", [])
        meeting_responses.append(response_record)
        
        firestore_manager.update_meeting(meeting_id, {
            "responses": meeting_responses
        })
        
        # REMOVED: Auto-start next topic
        # The frontend now controls topic transitions for better UX and simpler flow.
        # Frontend will display AI reactions sequentially, then transition to next topic
        # and call backend to start it when ready.
        # This eliminates the need for polling and makes the system more predictable.
        
        # Get updated meeting state
        updated_meeting = state_manager.get_meeting_state(meeting_id)
        
        logger.info(
            f"Meeting response processed: score={evaluation.get('score', 0)}, "
            f"topic_complete={result['topic_complete']}, meeting_complete={result['meeting_complete']}"
        )
        
        return {
            "ai_responses": ai_responses,
            "evaluation": evaluation,
            "next_topic_index": result.get('next_topic_index'),
            "meeting_complete": result['meeting_complete'],
            "topic_complete": result['topic_complete'],
            "conversation_history": updated_meeting.get("conversation_history", []),
            "is_player_turn": updated_meeting.get("is_player_turn", False),
            "current_topic_index": updated_meeting.get("current_topic_index", 0)
        }
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meeting {meeting_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to respond to meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to respond to meeting: {str(e)}"
        )


@app.get("/sessions/{session_id}/meetings/{meeting_id}/messages")
async def get_meeting_messages(
    session_id: str,
    meeting_id: str,
    since: Optional[str] = None,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Get new meeting messages since a specific message ID (for live polling)
    
    This endpoint supports the polling mechanism for real-time meeting updates.
    It queries Firestore for messages after the specified ID and returns them
    in chronological order, including "player_turn" signal messages.
    
    Args:
        session_id: Unique session identifier
        meeting_id: Unique meeting identifier
        since: Optional message ID to get messages after (for polling)
        user_id: Optional authenticated user ID
        
    Returns:
        Dictionary containing:
            - messages: List of new conversation messages in chronological order
            - is_player_turn: Boolean indicating if it's the player's turn
        
    Raises:
        HTTPException: If session or meeting not found, or access denied
    """
    try:
        logger.info(
            f"🔍 Polling request: session={session_id}, meeting={meeting_id}, since={since}"
        )
        
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Use MeetingStateManager to get messages
        from shared.meeting_state_manager import MeetingStateManager
        state_manager = MeetingStateManager()
        
        try:
            # Get messages since the specified message ID
            new_messages = state_manager.get_messages_since(meeting_id, since)
            
            logger.info(
                f"📨 Found {len(new_messages)} messages for meeting {meeting_id}"
            )
            
            # Get current meeting state for player turn flag
            meeting_state = state_manager.get_meeting_state(meeting_id)
            
            # Verify meeting belongs to this session
            if meeting_state.get("session_id") != session_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Meeting does not belong to this session"
                )
            
            is_player_turn = meeting_state.get("is_player_turn", False)
            
            logger.info(
                f"✅ Retrieved {len(new_messages)} new messages for meeting {meeting_id} "
                f"(since: {since or 'start'}, is_player_turn: {is_player_turn})"
            )
            
            # Log message details for debugging
            if new_messages:
                logger.info(f"📋 Message types: {[msg.get('type') for msg in new_messages]}")
            
            return {
                "messages": new_messages,
                "is_player_turn": is_player_turn
            }
            
        except ValueError as e:
            # Meeting not found
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meeting {meeting_id} not found"
            )
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meeting {meeting_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get meeting messages for {meeting_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get meeting messages: {str(e)}"
        )


@app.post("/sessions/{session_id}/meetings/{meeting_id}/leave")
async def leave_meeting(
    session_id: str,
    meeting_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Leave a meeting early
    
    This endpoint marks the meeting as "left_early" in Firestore, calculates and
    awards partial XP based on progress, generates a meeting summary, and updates
    player state with meeting statistics.
    
    Args:
        session_id: Unique session identifier
        meeting_id: Unique meeting identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Dictionary containing:
            - success: Boolean indicating success
            - early_departure: Boolean (always True)
            - overall_score: Average score from completed topics
            - xp_gained: Partial XP awarded (50% of normal)
            - new_xp: Updated player XP
            - new_level: Updated player level
            - level_up: Boolean indicating if player leveled up
            - xp_to_next_level: XP needed for next level
            - message: Feedback message
            - summary: Meeting summary text
        
    Raises:
        HTTPException: If session or meeting not found, or meeting already completed
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Use MeetingStateManager for state operations
        from shared.meeting_state_manager import MeetingStateManager
        state_manager = MeetingStateManager()
        
        # Retrieve meeting from Firestore
        meeting_data = state_manager.get_meeting_state(meeting_id)
        
        # Verify meeting belongs to this session
        if meeting_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Meeting does not belong to this session"
            )
        
        # Check if meeting is already completed
        current_status = meeting_data.get("status", "scheduled")
        if current_status == "completed" or current_status == "left_early":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Meeting has already been completed or left"
            )
        
        logger.info(f"Player leaving meeting {meeting_id} early")
        
        # Calculate partial score based on responses so far
        responses = meeting_data.get("responses", [])
        total_score = 0
        for response in responses:
            evaluation = response.get("evaluation", {})
            total_score += evaluation.get("score", 0)
        
        overall_score = total_score / len(responses) if responses else 0
        
        # Calculate topics completed
        current_topic_index = meeting_data.get("current_topic_index", 0)
        total_topics = len(meeting_data.get("topics", []))
        topics_completed = len(responses)
        completion_percentage = (topics_completed / total_topics * 100) if total_topics > 0 else 0
        
        # Award reduced XP (50% of normal, scaled by completion)
        meeting_type = meeting_data.get("meeting_type", "one_on_one")
        base_xp = {
            "one_on_one": 20,
            "team_meeting": 30,
            "team_standup": 25,
            "stakeholder_presentation": 50,
            "performance_review": 40,
            "project_review": 35,
            "project_update": 30,
            "feedback_session": 25
        }.get(meeting_type, 30)
        
        # XP calculation: base * score_multiplier * completion_multiplier * early_departure_penalty
        xp_multiplier = 0.5 + (overall_score / 100)
        completion_multiplier = completion_percentage / 100
        full_xp = int(base_xp * xp_multiplier)
        partial_xp = int(full_xp * completion_multiplier * 0.5)  # 50% penalty for early departure
        
        # Ensure minimum XP of 5 if any topics were completed
        if topics_completed > 0 and partial_xp < 5:
            partial_xp = 5
        
        # Award partial XP
        xp_result = firestore_manager.add_xp(session_id, partial_xp)
        
        # Mark meeting as left early using MeetingStateManager
        state_manager.mark_meeting_left_early(meeting_id)
        
        # Update meeting with additional data
        firestore_manager.update_meeting(meeting_id, {
            "overall_score": overall_score,
            "xp_gained": partial_xp,
            "early_departure": True,
            "topics_completed": topics_completed,
            "completion_percentage": completion_percentage
        })
        
        # Generate meeting summary
        summary = (
            f"You left the meeting after completing {topics_completed} of {total_topics} topics "
            f"({int(completion_percentage)}% complete). "
        )
        if overall_score > 0:
            summary += f"Your average score was {int(overall_score)}/100. "
        summary += f"You earned {partial_xp} XP (partial credit for early departure)."
        
        # Track meeting stats (even for early departure)
        meeting_performance = {
            "meeting_id": meeting_id,
            "meeting_type": meeting_type,
            "score": overall_score,
            "xp_gained": partial_xp,
            "tasks_generated": 0,
            "early_departure": True,
            "topics_completed": topics_completed,
            "total_topics": total_topics,
            "date": datetime.utcnow().isoformat()
        }
        
        meeting_history = session_data.get("meeting_history", [])
        meeting_history.append(meeting_performance)
        
        # Update meeting statistics
        stats = session_data.get("stats", {})
        meetings_attended = stats.get("meetings_attended", 0) + 1
        
        # Calculate average meeting score
        total_meeting_score = sum(m.get("score", 0) for m in meeting_history)
        avg_meeting_score = int(total_meeting_score / len(meeting_history)) if meeting_history else 0
        
        stats["meetings_attended"] = meetings_attended
        stats["avg_meeting_score"] = avg_meeting_score
        
        firestore_manager.update_session(session_id, {
            "meeting_history": meeting_history,
            "last_meeting_completed_at": datetime.utcnow().isoformat(),
            "stats": stats
        })
        
        logger.info(
            f"Meeting left early: partial_xp={partial_xp}, "
            f"topics_completed={topics_completed}/{total_topics}, "
            f"meetings_attended={meetings_attended}"
        )
        
        # Generate new tasks and meetings if dashboard is getting low
        active_tasks = firestore_manager.get_active_tasks(session_id)
        active_meetings = firestore_manager.get_active_meetings(session_id)
        
        # Target: 3-5 tasks and 1-2 meetings on dashboard
        tasks_to_generate = max(0, 3 - len(active_tasks))
        meetings_to_generate = max(0, 1 - len(active_meetings))
        
        new_tasks_generated = []
        new_meetings_generated = []
        
        # Generate tasks if needed
        if tasks_to_generate > 0:
            logger.info(f"Dashboard low on tasks ({len(active_tasks)}), generating {tasks_to_generate} new tasks")
            
            current_tasks_completed = session_data.get("stats", {}).get("tasks_completed", 0)
            current_job = session_data.get("current_job", {})
            
            for i in range(tasks_to_generate):
                try:
                    new_task = await workflow_orchestrator.generate_task(
                        session_id=session_id,
                        job_title=current_job.get("position", ""),
                        company_name=current_job.get("company_name", ""),
                        player_level=xp_result["new_level"],
                        tasks_completed=current_tasks_completed + i
                    )
                    
                    new_task_id = f"task-{uuid.uuid4().hex[:12]}"
                    new_task["id"] = new_task_id
                    new_task["task_type"] = "work"
                    firestore_manager.create_task(new_task_id, session_id, new_task)
                    new_tasks_generated.append(new_task)
                    logger.info(f"Generated task {i+1}/{tasks_to_generate}: {new_task.get('title')}")
                except Exception as e:
                    logger.error(f"Failed to generate task {i+1}: {e}")
        
        # Generate meetings if needed (occasionally)
        if meetings_to_generate > 0 and random.random() < 0.5:  # 50% chance
            logger.info(f"Dashboard low on meetings ({len(active_meetings)}), generating {meetings_to_generate} new meetings")
            
            current_job = session_data.get("current_job", {})
            if current_job:
                for i in range(meetings_to_generate):
                    try:
                        # Determine meeting type based on recent activity
                        meeting_types = ["one_on_one", "team_meeting", "project_update"]
                        meeting_type = random.choice(meeting_types)
                        
                        new_meeting_data = await workflow_orchestrator.generate_meeting(
                            session_id=session_id,
                            meeting_type=meeting_type,
                            job_title=current_job.get("position", ""),
                            company_name=current_job.get("company_name", ""),
                            player_level=xp_result["new_level"],
                            recent_performance="good"
                        )
                        
                        new_meeting_id = f"meeting-{uuid.uuid4().hex[:12]}"
                        new_meeting_data["id"] = new_meeting_id
                        new_meeting_data["session_id"] = session_id
                        new_meeting_data["status"] = "scheduled"
                        
                        # Normalize field names
                        if "duration_minutes" in new_meeting_data and "estimated_duration_minutes" not in new_meeting_data:
                            new_meeting_data["estimated_duration_minutes"] = new_meeting_data.pop("duration_minutes")
                        
                        firestore_manager.create_meeting(new_meeting_id, session_id, new_meeting_data)
                        new_meetings_generated.append(new_meeting_data)
                        logger.info(f"Generated meeting {i+1}/{meetings_to_generate}: {new_meeting_data.get('title')}")
                    except Exception as e:
                        logger.error(f"Failed to generate meeting {i+1}: {e}")
        
        return {
            "success": True,
            "early_departure": True,
            "overall_score": overall_score,
            "xp_gained": partial_xp,
            "new_xp": xp_result["new_xp"],
            "new_level": xp_result["new_level"],
            "level_up": xp_result["leveled_up"],
            "xp_to_next_level": xp_result["xp_to_next_level"],
            "message": "You left the meeting early. Partial XP awarded.",
            "summary": summary,
            "topics_completed": topics_completed,
            "total_topics": total_topics,
            "completion_percentage": int(completion_percentage)
        }
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meeting {meeting_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to leave meeting {meeting_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to leave meeting: {str(e)}"
        )


@app.post("/sessions/{session_id}/meetings/{meeting_id}/complete")
async def complete_meeting(
    session_id: str,
    meeting_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Complete a meeting, evaluate participation, generate outcomes, and award XP.
    
    This endpoint:
    1. Evaluates player's meeting participation using Meeting Evaluation Agent
    2. Determines if meeting should generate follow-up tasks
    3. Generates 0-3 tasks based on meeting discussions (if applicable)
    4. Awards XP for meeting participation
    5. Creates meeting summary with decisions and action items
    
    Args:
        session_id: Unique session identifier
        meeting_id: Unique meeting identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Meeting summary with evaluation, generated tasks, XP, and feedback
        
    Raises:
        HTTPException: If session or meeting not found
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Retrieve meeting from Firestore
        meeting_data = firestore_manager.get_meeting(meeting_id)
        
        # Verify meeting belongs to this session
        if meeting_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Meeting does not belong to this session"
            )
        
        logger.info(f"Completing meeting {meeting_id} for session {session_id}")
        
        # Add player level and job info to meeting data for evaluation
        meeting_data['player_level'] = session_data.get('level', 1)
        meeting_data['job_title'] = session_data.get('current_job', {}).get('position', 'Employee')
        meeting_data['company_name'] = session_data.get('current_job', {}).get('company_name', 'Company')
        meeting_data['tasks_completed'] = session_data.get('tasks_completed', 0)
        
        # Step 1: Evaluate meeting participation using Meeting Evaluation Agent
        logger.info(f"Evaluating meeting participation for {meeting_id}")
        evaluation = await workflow_orchestrator.evaluate_meeting_participation(
            session_id=session_id,
            meeting_id=meeting_id,
            meeting_data=meeting_data
        )
        
        # Step 2: Generate meeting outcomes (tasks, XP, summary)
        logger.info(f"Generating meeting outcomes for {meeting_id}")
        outcomes = await workflow_orchestrator.generate_meeting_outcomes(
            session_id=session_id,
            meeting_id=meeting_id,
            meeting_data=meeting_data,
            evaluation=evaluation
        )
        
        # Step 3: Award XP for meeting participation
        xp_gained = outcomes.get('xp_earned', 0)
        xp_result = firestore_manager.add_xp(session_id, xp_gained)
        
        # Step 4: Save generated tasks to Firestore
        generated_tasks = outcomes.get('generated_tasks', [])
        task_ids = []
        for task in generated_tasks:
            task_id = firestore_manager.add_task(session_id, task)
            task_ids.append(task_id)
            logger.info(f"Generated task from meeting: {task_id} - {task.get('title')}")
        
        # Step 5: Update meeting status and save summary
        firestore_manager.update_meeting(meeting_id, {
            "status": "completed",
            "participation_score": outcomes.get('participation_score', 0),
            "xp_gained": xp_gained,
            "completed_at": datetime.utcnow().isoformat()
        })
        
        # Save meeting summary to Firestore
        summary_data = {
            "xp_earned": xp_gained,
            "participation_score": outcomes.get('participation_score', 0),
            "generated_tasks": [
                {
                    "task_id": task_ids[i] if i < len(task_ids) else None,
                    "title": task.get('title', ''),
                    "source": "meeting"
                }
                for i, task in enumerate(generated_tasks)
            ],
            "key_decisions": outcomes.get('key_decisions', []),
            "action_items": outcomes.get('action_items', []),
            "feedback": outcomes.get('feedback', {})
        }
        
        firestore_manager.create_meeting_summary(meeting_id, session_id, summary_data)
        
        # Step 6: Track meeting performance for career progression
        meeting_performance = {
            "meeting_id": meeting_id,
            "meeting_type": meeting_data.get("meeting_type", "one_on_one"),
            "score": outcomes.get('participation_score', 0),
            "xp_gained": xp_gained,
            "tasks_generated": len(generated_tasks),
            "date": datetime.utcnow().isoformat()
        }
        
        # Store in session for future reference
        meeting_history = session_data.get("meeting_history", [])
        meeting_history.append(meeting_performance)
        
        # Update meeting statistics
        stats = session_data.get("stats", {})
        meetings_attended = stats.get("meetings_attended", 0) + 1
        
        # Calculate average meeting score
        total_meeting_score = sum(m.get("score", 0) for m in meeting_history)
        avg_meeting_score = int(total_meeting_score / len(meeting_history)) if meeting_history else 0
        
        stats["meetings_attended"] = meetings_attended
        stats["avg_meeting_score"] = avg_meeting_score
        
        firestore_manager.update_session(session_id, {
            "meeting_history": meeting_history,
            "last_meeting_completed_at": datetime.utcnow().isoformat(),
            "stats": stats
        })
        
        # Step 7: Update CV with meeting participation
        # Periodically update CV with meeting accomplishments (every 3 meetings)
        if meetings_attended % 3 == 0:
            try:
                current_cv = session_data.get("cv_data", {
                    "experience": [],
                    "skills": [],
                    "accomplishments": []
                })
                
                # Get recent meetings for CV update
                recent_meetings = meeting_history[-3:] if len(meeting_history) >= 3 else meeting_history
                
                meeting_action_data = {
                    "meetings": [
                        {
                            "meeting_type": m.get("meeting_type", ""),
                            "title": meeting_data.get("title", "") if m.get("meeting_id") == meeting_id else f"{m.get('meeting_type', 'meeting').replace('_', ' ').title()}",
                            "score": m.get("score", 0),
                            "key_decisions": outcomes.get('key_decisions', []) if m.get("meeting_id") == meeting_id else [],
                            "generated_tasks": m.get("tasks_generated", 0)
                        }
                        for m in recent_meetings
                    ],
                    "total_meetings": meetings_attended,
                    "avg_score": avg_meeting_score
                }
                
                # Update CV using CV Agent
                updated_cv = await workflow_orchestrator.update_cv(
                    session_id=session_id,
                    current_cv=current_cv,
                    action="add_meeting_participation",
                    action_data=meeting_action_data
                )
                
                # Save updated CV
                firestore_manager.update_session(session_id, {
                    "cv_data": updated_cv
                })
                
                logger.info(f"Updated CV with meeting participation for session {session_id}")
            except Exception as cv_error:
                logger.error(f"Failed to update CV with meeting participation: {cv_error}")
                # Continue even if CV update fails
        
        logger.info(
            f"Meeting completed: score={outcomes.get('participation_score')}, "
            f"xp_gained={xp_gained}, tasks_generated={len(generated_tasks)}"
        )
        
        # Generate new tasks and meetings if dashboard is getting low
        active_tasks = firestore_manager.get_active_tasks(session_id)
        active_meetings = firestore_manager.get_active_meetings(session_id)
        
        # Target: 3-5 tasks and 1-2 meetings on dashboard
        tasks_to_generate = max(0, 3 - len(active_tasks))
        meetings_to_generate = max(0, 1 - len(active_meetings))
        
        new_tasks_generated = []
        new_meetings_generated = []
        
        # Generate tasks if needed
        if tasks_to_generate > 0:
            logger.info(f"Dashboard low on tasks ({len(active_tasks)}), generating {tasks_to_generate} new tasks")
            
            current_tasks_completed = session_data.get("stats", {}).get("tasks_completed", 0)
            current_job = session_data.get("current_job", {})
            
            for i in range(tasks_to_generate):
                try:
                    new_task = await workflow_orchestrator.generate_task(
                        session_id=session_id,
                        job_title=current_job.get("position", ""),
                        company_name=current_job.get("company_name", ""),
                        player_level=xp_result["new_level"],
                        tasks_completed=current_tasks_completed + i
                    )
                    
                    new_task_id = f"task-{uuid.uuid4().hex[:12]}"
                    new_task["id"] = new_task_id
                    new_task["task_type"] = "work"
                    firestore_manager.create_task(new_task_id, session_id, new_task)
                    new_tasks_generated.append(new_task)
                    logger.info(f"Generated task {i+1}/{tasks_to_generate}: {new_task.get('title')}")
                except Exception as e:
                    logger.error(f"Failed to generate task {i+1}: {e}")
        
        # Generate meetings if needed (occasionally)
        if meetings_to_generate > 0 and random.random() < 0.5:  # 50% chance
            logger.info(f"Dashboard low on meetings ({len(active_meetings)}), generating {meetings_to_generate} new meetings")
            
            current_job = session_data.get("current_job", {})
            if current_job:
                for i in range(meetings_to_generate):
                    try:
                        # Determine meeting type based on recent activity
                        meeting_types = ["one_on_one", "team_meeting", "project_update"]
                        meeting_type = random.choice(meeting_types)
                        
                        new_meeting_data = await workflow_orchestrator.generate_meeting(
                            session_id=session_id,
                            meeting_type=meeting_type,
                            job_title=current_job.get("position", ""),
                            company_name=current_job.get("company_name", ""),
                            player_level=xp_result["new_level"],
                            recent_performance="good"
                        )
                        
                        new_meeting_id = f"meeting-{uuid.uuid4().hex[:12]}"
                        new_meeting_data["id"] = new_meeting_id
                        new_meeting_data["session_id"] = session_id
                        new_meeting_data["status"] = "scheduled"
                        
                        # Normalize field names
                        if "duration_minutes" in new_meeting_data and "estimated_duration_minutes" not in new_meeting_data:
                            new_meeting_data["estimated_duration_minutes"] = new_meeting_data.pop("duration_minutes")
                        
                        firestore_manager.create_meeting(new_meeting_id, session_id, new_meeting_data)
                        new_meetings_generated.append(new_meeting_data)
                        logger.info(f"Generated meeting {i+1}/{meetings_to_generate}: {new_meeting_data.get('title')}")
                    except Exception as e:
                        logger.error(f"Failed to generate meeting {i+1}: {e}")
        
        # Return comprehensive meeting summary
        return {
            "success": True,
            "participation_score": outcomes.get('participation_score', 0),
            "xp_gained": xp_gained,
            "new_xp": xp_result["new_xp"],
            "new_level": xp_result["new_level"],
            "level_up": xp_result["leveled_up"],
            "xp_to_next_level": xp_result["xp_to_next_level"],
            "generated_tasks": [
                {
                    "task_id": task_ids[i] if i < len(task_ids) else None,
                    "title": task.get('title', ''),
                    "description": task.get('description', ''),
                    "xp_reward": task.get('xp_reward', 0),
                    "difficulty": task.get('difficulty', 1)
                }
                for i, task in enumerate(generated_tasks)
            ],
            "key_decisions": outcomes.get('key_decisions', []),
            "action_items": outcomes.get('action_items', []),
            "feedback": outcomes.get('feedback', {}),
            "meeting_summary": {
                "meeting_type": meeting_data.get("meeting_type", ""),
                "title": meeting_data.get("title", ""),
                "topics_discussed": len(meeting_data.get("topics", [])),
                "participation_level": evaluation.get('participation_level', 'satisfactory')
            }
        }
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meeting {meeting_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to complete meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete meeting: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Failed to complete meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete meeting: {str(e)}"
        )


@app.get("/sessions/{session_id}/meetings/{meeting_id}/summary")
async def get_meeting_summary(
    session_id: str,
    meeting_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Get meeting summary after completion
    
    Args:
        session_id: Unique session identifier
        meeting_id: Unique meeting identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Meeting summary with outcomes, generated tasks, and evaluation
        
    Raises:
        HTTPException: If session or meeting not found, or meeting not completed
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Retrieve meeting from Firestore
        meeting_data = firestore_manager.get_meeting(meeting_id)
        
        # Verify meeting belongs to this session
        if meeting_data.get("session_id") != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Meeting does not belong to this session"
            )
        
        # Check if meeting is completed
        if meeting_data.get("status") != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Meeting has not been completed yet"
            )
        
        # Try to get existing summary from Firestore
        try:
            summary = firestore_manager.get_meeting_summary(meeting_id)
            return summary
        except:
            # Generate summary if it doesn't exist
            pass
        
        # Generate summary from meeting data
        responses = meeting_data.get("responses", [])
        
        # Extract key decisions and action items from responses
        key_decisions = []
        action_items = []
        feedback_strengths = []
        feedback_improvements = []
        
        for response in responses:
            evaluation = response.get("evaluation", {})
            if evaluation.get("score", 0) >= 70:
                feedback_strengths.append(f"Good response to: {response.get('topic_id', 'topic')}")
            else:
                feedback_improvements.append(f"Could improve on: {response.get('topic_id', 'topic')}")
        
        # Create summary
        summary = {
            "meeting_id": meeting_id,
            "session_id": session_id,
            "meeting_type": meeting_data.get("meeting_type", ""),
            "xp_earned": meeting_data.get("xp_gained", 0),
            "participation_score": meeting_data.get("overall_score", 0),
            "generated_tasks": [],  # Tasks would be generated separately
            "key_decisions": key_decisions if key_decisions else ["Meeting objectives discussed"],
            "action_items": action_items if action_items else ["Follow up on discussed topics"],
            "feedback": {
                "strengths": feedback_strengths if feedback_strengths else ["Active participation"],
                "improvements": feedback_improvements if feedback_improvements else ["Continue engaging in discussions"]
            },
            "early_departure": meeting_data.get("early_departure", False),
            "created_at": meeting_data.get("completed_at", datetime.utcnow().isoformat())
        }
        
        # Save summary to Firestore
        firestore_manager.create_meeting_summary(
            meeting_id=meeting_id,
            session_id=session_id,
            xp_earned=summary["xp_earned"],
            participation_score=summary["participation_score"],
            generated_tasks=summary["generated_tasks"],
            key_decisions=summary["key_decisions"],
            action_items=summary["action_items"],
            feedback=summary["feedback"]
        )
        
        return summary
        
    except ValueError as e:
        error_msg = str(e)
        if "Session" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meeting {meeting_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get meeting summary for {meeting_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get meeting summary: {str(e)}"
        )


# ==================== Event System Endpoints ====================

@app.get("/sessions/{session_id}/events/check")
async def check_for_events(
    session_id: str,
    user_id: Optional[str] = Depends(optional_auth)
):
    """
    Check if any random events should be triggered (e.g., manager meeting requests)
    
    Args:
        session_id: Unique session identifier
        user_id: Optional authenticated user ID
        
    Returns:
        Event data if an event is triggered, null otherwise
        
    Raises:
        HTTPException: If session not found
    """
    try:
        # Verify session exists and user has access
        session_data = firestore_manager.get_session(session_id)
        
        if user_id and session_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Only check for events if player is employed
        if session_data.get("status") != "employed":
            return {"event": None}
        
        # Calculate recent performance
        stats = session_data.get("stats", {})
        tasks_completed = stats.get("tasks_completed", 0)
        meeting_history = session_data.get("meeting_history", [])
        
        if len(meeting_history) > 0:
            avg_meeting_score = sum(m.get("score", 0) for m in meeting_history[-3:]) / min(len(meeting_history), 3)
            if avg_meeting_score >= 80:
                recent_performance = "excellent"
            elif avg_meeting_score >= 60:
                recent_performance = "good"
            else:
                recent_performance = "needs_improvement"
        else:
            recent_performance = "new_employee"
        
        # Check for event
        event_data = await workflow_orchestrator.check_for_event(
            session_id=session_id,
            player_level=session_data.get("level", 1),
            tasks_completed=tasks_completed,
            recent_performance=recent_performance,
            meeting_history=meeting_history
        )
        
        if event_data:
            logger.info(f"Event triggered for session {session_id}: {event_data.get('event_type')}")
        
        return {"event": event_data}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check for events: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check for events: {str(e)}"
        )
