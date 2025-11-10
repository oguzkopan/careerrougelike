"""
Error Handler

Provides comprehensive error handling utilities for task generation and meeting operations,
including retry logic with exponential backoff, detailed logging, and monitoring alerts.
"""

import logging
import time
import json
from typing import Dict, Any, Optional, Callable, TypeVar, List
from functools import wraps
from datetime import datetime
import traceback

logger = logging.getLogger(__name__)

T = TypeVar('T')


class TaskGenerationError(Exception):
    """Exception raised when task generation fails."""
    pass


class MeetingOperationError(Exception):
    """Exception raised when meeting operations fail."""
    pass


class ValidationError(Exception):
    """Exception raised when validation fails."""
    pass


class ErrorMetrics:
    """
    Tracks error metrics for monitoring and alerting.
    """
    
    def __init__(self):
        """Initialize error metrics tracker."""
        self.task_generation_failures = {}
        self.meeting_operation_failures = {}
        self.validation_failures = {}
        self.retry_counts = {}
        self.fallback_usage = {}
    
    def record_task_generation_failure(
        self,
        format_type: str,
        error_type: str,
        session_id: str
    ) -> None:
        """Record a task generation failure."""
        key = f"{format_type}:{error_type}"
        if key not in self.task_generation_failures:
            self.task_generation_failures[key] = []
        
        self.task_generation_failures[key].append({
            'timestamp': datetime.utcnow().isoformat(),
            'session_id': session_id,
            'format_type': format_type,
            'error_type': error_type
        })
        
        # Alert if repeated failures (more than 5 in last hour)
        recent_failures = [
            f for f in self.task_generation_failures[key]
            if (datetime.utcnow() - datetime.fromisoformat(f['timestamp'])).seconds < 3600
        ]
        
        if len(recent_failures) >= 5:
            logger.critical(
                f"ALERT: Repeated task generation failures detected! "
                f"Format: {format_type}, Error: {error_type}, "
                f"Count: {len(recent_failures)} in last hour"
            )
    
    def record_meeting_operation_failure(
        self,
        operation: str,
        error_type: str,
        meeting_id: str
    ) -> None:
        """Record a meeting operation failure."""
        key = f"{operation}:{error_type}"
        if key not in self.meeting_operation_failures:
            self.meeting_operation_failures[key] = []
        
        self.meeting_operation_failures[key].append({
            'timestamp': datetime.utcnow().isoformat(),
            'meeting_id': meeting_id,
            'operation': operation,
            'error_type': error_type
        })
        
        # Alert if repeated failures
        recent_failures = [
            f for f in self.meeting_operation_failures[key]
            if (datetime.utcnow() - datetime.fromisoformat(f['timestamp'])).seconds < 3600
        ]
        
        if len(recent_failures) >= 5:
            logger.critical(
                f"ALERT: Repeated meeting operation failures detected! "
                f"Operation: {operation}, Error: {error_type}, "
                f"Count: {len(recent_failures)} in last hour"
            )
    
    def record_validation_failure(
        self,
        format_type: str,
        errors: List[str],
        session_id: str
    ) -> None:
        """Record a validation failure."""
        if format_type not in self.validation_failures:
            self.validation_failures[format_type] = []
        
        self.validation_failures[format_type].append({
            'timestamp': datetime.utcnow().isoformat(),
            'session_id': session_id,
            'errors': errors
        })
    
    def record_retry(self, operation: str, attempt: int) -> None:
        """Record a retry attempt."""
        if operation not in self.retry_counts:
            self.retry_counts[operation] = []
        
        self.retry_counts[operation].append({
            'timestamp': datetime.utcnow().isoformat(),
            'attempt': attempt
        })
    
    def record_fallback_usage(self, operation: str, reason: str) -> None:
        """Record fallback usage."""
        if operation not in self.fallback_usage:
            self.fallback_usage[operation] = []
        
        self.fallback_usage[operation].append({
            'timestamp': datetime.utcnow().isoformat(),
            'reason': reason
        })
        
        logger.warning(f"Fallback used for {operation}: {reason}")
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get a summary of all metrics."""
        return {
            'task_generation_failures': len(sum(self.task_generation_failures.values(), [])),
            'meeting_operation_failures': len(sum(self.meeting_operation_failures.values(), [])),
            'validation_failures': len(sum(self.validation_failures.values(), [])),
            'total_retries': len(sum(self.retry_counts.values(), [])),
            'fallback_usage_count': len(sum(self.fallback_usage.values(), []))
        }


# Global metrics instance
_metrics_instance = None


def get_error_metrics() -> ErrorMetrics:
    """Get the singleton ErrorMetrics instance."""
    global _metrics_instance
    if _metrics_instance is None:
        _metrics_instance = ErrorMetrics()
    return _metrics_instance


def retry_with_exponential_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """
    Decorator for retrying a function with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential backoff calculation
        exceptions: Tuple of exceptions to catch and retry
    
    Returns:
        Decorated function with retry logic
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            metrics = get_error_metrics()
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    result = await func(*args, **kwargs)
                    
                    # Log successful retry if not first attempt
                    if attempt > 0:
                        logger.info(
                            f"Function {func.__name__} succeeded on attempt {attempt + 1}/{max_retries}"
                        )
                    
                    return result
                    
                except exceptions as e:
                    last_exception = e
                    
                    # Record retry metrics
                    metrics.record_retry(func.__name__, attempt + 1)
                    
                    # Log the error
                    logger.warning(
                        f"Function {func.__name__} failed on attempt {attempt + 1}/{max_retries}: {str(e)}"
                    )
                    
                    # If this was the last attempt, don't sleep
                    if attempt == max_retries - 1:
                        break
                    
                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (exponential_base ** attempt), max_delay)
                    
                    logger.info(f"Retrying in {delay:.2f} seconds...")
                    time.sleep(delay)
            
            # All retries exhausted
            logger.error(
                f"Function {func.__name__} failed after {max_retries} attempts. "
                f"Last error: {str(last_exception)}"
            )
            raise last_exception
        
        return wrapper
    return decorator


def log_detailed_error(
    operation: str,
    error: Exception,
    context: Dict[str, Any],
    include_traceback: bool = True
) -> None:
    """
    Log detailed error information for debugging.
    
    Args:
        operation: Name of the operation that failed
        error: The exception that was raised
        context: Dictionary of contextual information
        include_traceback: Whether to include full traceback
    """
    error_details = {
        'operation': operation,
        'error_type': type(error).__name__,
        'error_message': str(error),
        'timestamp': datetime.utcnow().isoformat(),
        'context': context
    }
    
    if include_traceback:
        error_details['traceback'] = traceback.format_exc()
    
    logger.error(f"Detailed error log: {json.dumps(error_details, indent=2)}")


def handle_malformed_json(
    response_text: str,
    operation: str,
    context: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Attempt to extract and parse JSON from malformed response.
    
    Args:
        response_text: The response text that may contain malformed JSON
        operation: Name of the operation for logging
        context: Contextual information for logging
    
    Returns:
        Parsed JSON dictionary if successful, None otherwise
    """
    import re
    
    try:
        # Try to find JSON in the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            
            # Try to parse
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON decode error in {operation}: {str(e)}")
                
                # Try to fix common JSON issues
                # Remove control characters
                json_str = ''.join(
                    char if ord(char) >= 32 or char in '\n\r\t' else ' '
                    for char in json_str
                )
                
                # Try parsing again
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    logger.error(f"Could not parse JSON even after cleanup in {operation}")
                    log_detailed_error(
                        operation,
                        e,
                        {**context, 'response_text': response_text[:500]},
                        include_traceback=False
                    )
                    return None
        else:
            logger.error(f"No JSON found in response for {operation}")
            log_detailed_error(
                operation,
                ValueError("No JSON found in response"),
                {**context, 'response_text': response_text[:500]},
                include_traceback=False
            )
            return None
            
    except Exception as e:
        logger.error(f"Unexpected error parsing JSON in {operation}: {str(e)}")
        log_detailed_error(operation, e, context)
        return None


def create_fallback_task(
    session_id: str,
    job_title: str,
    company_name: str,
    player_level: int,
    tasks_completed: int,
    reason: str
) -> Dict[str, Any]:
    """
    Create a fallback task when generation fails.
    
    Args:
        session_id: Session identifier
        job_title: Job title for the task
        company_name: Company name
        player_level: Player's current level
        tasks_completed: Number of tasks completed
        reason: Reason for fallback
    
    Returns:
        Fallback task dictionary
    """
    metrics = get_error_metrics()
    metrics.record_fallback_usage('task_generation', reason)
    
    logger.warning(
        f"Creating fallback task for session {session_id}: {reason}"
    )
    
    return {
        "id": f"task-{session_id}-{tasks_completed + 1}",
        "title": f"Complete project task #{tasks_completed + 1}",
        "description": f"Work on {job_title} responsibilities at {company_name}. "
                      f"Complete assigned work and submit your solution.",
        "format_type": "text_answer",
        "requirements": [
            "Complete the assigned task",
            "Submit a detailed solution",
            "Ensure quality meets professional standards"
        ],
        "acceptance_criteria": [
            "Task is fully complete",
            "Solution is well-documented",
            "Quality meets expectations"
        ],
        "difficulty": min(player_level, 5),
        "xp_reward": 50,
        "status": "pending",
        "task_type": "engineer"
    }


def create_fallback_meeting_message(
    participant_name: str,
    reason: str
) -> Dict[str, Any]:
    """
    Create a fallback meeting message when generation fails.
    
    Args:
        participant_name: Name of the participant
        reason: Reason for fallback
    
    Returns:
        Fallback message dictionary
    """
    metrics = get_error_metrics()
    metrics.record_fallback_usage('meeting_message_generation', reason)
    
    logger.warning(
        f"Creating fallback meeting message for {participant_name}: {reason}"
    )
    
    from shared.meeting_models import generate_message_id
    from datetime import datetime
    
    return {
        'id': generate_message_id(),
        'type': 'ai_response',
        'participant_name': participant_name,
        'content': "I think we should move forward with this discussion. What are your thoughts?",
        'sentiment': 'neutral',
        'timestamp': datetime.utcnow().isoformat()
    }
