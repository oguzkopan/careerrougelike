"""
FastAPI Gateway

REST API gateway for the CareerRoguelike backend.
Exposes endpoints for session management and agent invocation.
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

# Initialize model configuration before importing agents
from shared import model_config  # This configures Vertex AI/API key

from agents.root_agent import root_agent
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup: Initialize Firestore and ADK Runner
    global firestore_manager, adk_runner
    
    auth_method = "Vertex AI" if USE_VERTEX_AI else "Google AI API"
    logger.info(f"Starting backend with {auth_method} authentication")
    
    logger.info("Initializing Firestore client...")
    firestore_manager = FirestoreManager()
    
    logger.info("Initializing ADK Runner with root agent...")
    session_service = InMemorySessionService()
    adk_runner = Runner(
        agent=root_agent,
        app_name="career-roguelike",
        session_service=session_service
    )
    
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
        
        # Initialize session data
        session_data = {
            "session_id": session_id,
            "profession": request.profession,
            "level": request.level,
            "status": "new",
            "state": {}
        }
        
        # Add user_id if authenticated
        if user_id:
            session_data["user_id"] = user_id
        
        # Create session in Firestore
        firestore_manager.create_session(session_id, session_data)
        
        logger.info(f"Created session {session_id} for profession={request.profession}, level={request.level}, user={user_id or 'anonymous'}")
        
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
