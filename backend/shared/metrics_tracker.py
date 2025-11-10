"""
Metrics Tracker

Comprehensive metrics tracking for task generation and meeting operations.
Provides logging and monitoring capabilities for system performance and reliability.
"""

import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
from collections import defaultdict
import threading

logger = logging.getLogger(__name__)


class MetricsTracker:
    """
    Tracks and logs metrics for task generation and meeting operations.
    
    Provides:
    - Task generation success/failure rates by format type
    - Repair attempt success rates
    - Fallback usage frequency
    - Generation latency tracking
    - Meeting conversation metrics
    - Polling request frequency
    - Meeting completion rates
    """
    
    def __init__(self):
        """Initialize metrics tracker with thread-safe counters."""
        self._lock = threading.Lock()
        
        # Task generation metrics
        self.task_generation_attempts = defaultdict(int)
        self.task_generation_successes = defaultdict(int)
        self.task_generation_failures = defaultdict(int)
        self.task_validation_failures = defaultdict(int)
        self.task_repair_attempts = defaultdict(int)
        self.task_repair_successes = defaultdict(int)
        self.task_fallback_usage = defaultdict(int)
        self.task_generation_latencies = defaultdict(list)
        
        # Meeting conversation metrics
        self.meeting_message_counts = defaultdict(int)
        self.meeting_generation_latencies = defaultdict(list)
        self.meeting_completions = defaultdict(int)
        self.meeting_early_leaves = defaultdict(int)
        self.meeting_polling_requests = defaultdict(int)
        
        # Timestamps for rate calculations
        self.last_metrics_log = time.time()
        self.metrics_log_interval = 300  # Log summary every 5 minutes
    
    # ==================== Task Generation Metrics ====================
    
    def record_task_generation_attempt(self, format_type: str) -> None:
        """
        Record a task generation attempt.
        
        Args:
            format_type: Type of task being generated
        """
        with self._lock:
            self.task_generation_attempts[format_type] += 1
    
    def record_task_generation_success(
        self,
        format_type: str,
        latency_seconds: float,
        session_id: Optional[str] = None
    ) -> None:
        """
        Record a successful task generation.
        
        Args:
            format_type: Type of task generated
            latency_seconds: Time taken to generate the task
            session_id: Optional session identifier for detailed logging
        """
        with self._lock:
            self.task_generation_successes[format_type] += 1
            self.task_generation_latencies[format_type].append(latency_seconds)
        
        logger.info(
            f"Task generation success: format={format_type}, "
            f"latency={latency_seconds:.2f}s, session={session_id or 'N/A'}"
        )
        
        self._check_and_log_summary()
    
    def record_task_generation_failure(
        self,
        format_type: str,
        reason: str,
        session_id: Optional[str] = None
    ) -> None:
        """
        Record a failed task generation.
        
        Args:
            format_type: Type of task that failed to generate
            reason: Reason for failure
            session_id: Optional session identifier for detailed logging
        """
        with self._lock:
            self.task_generation_failures[format_type] += 1
        
        logger.error(
            f"Task generation failure: format={format_type}, "
            f"reason={reason}, session={session_id or 'N/A'}"
        )
        
        self._check_and_log_summary()
    
    def record_task_validation_failure(
        self,
        format_type: str,
        errors: List[str],
        session_id: Optional[str] = None
    ) -> None:
        """
        Record a task validation failure.
        
        Args:
            format_type: Type of task that failed validation
            errors: List of validation errors
            session_id: Optional session identifier for detailed logging
        """
        with self._lock:
            self.task_validation_failures[format_type] += 1
        
        logger.warning(
            f"Task validation failure: format={format_type}, "
            f"errors={len(errors)}, session={session_id or 'N/A'}"
        )
        logger.warning(f"Validation errors: {errors}")
    
    def record_task_repair_attempt(
        self,
        format_type: str,
        success: bool,
        session_id: Optional[str] = None
    ) -> None:
        """
        Record a task repair attempt.
        
        Args:
            format_type: Type of task being repaired
            success: Whether the repair was successful
            session_id: Optional session identifier for detailed logging
        """
        with self._lock:
            self.task_repair_attempts[format_type] += 1
            if success:
                self.task_repair_successes[format_type] += 1
        
        status = "success" if success else "failed"
        logger.info(
            f"Task repair attempt: format={format_type}, "
            f"status={status}, session={session_id or 'N/A'}"
        )
    
    def record_task_fallback_usage(
        self,
        original_format: str,
        fallback_format: str,
        reason: str,
        session_id: Optional[str] = None
    ) -> None:
        """
        Record usage of fallback task format.
        
        Args:
            original_format: Original format that failed
            fallback_format: Fallback format used
            reason: Reason for fallback
            session_id: Optional session identifier for detailed logging
        """
        with self._lock:
            self.task_fallback_usage[original_format] += 1
        
        logger.warning(
            f"Task fallback used: original={original_format}, "
            f"fallback={fallback_format}, reason={reason}, "
            f"session={session_id or 'N/A'}"
        )
        
        self._check_and_log_summary()
    
    def get_task_generation_stats(self) -> Dict[str, Any]:
        """
        Get task generation statistics.
        
        Returns:
            Dictionary containing task generation metrics by format type
        """
        with self._lock:
            stats = {}
            
            for format_type in set(
                list(self.task_generation_attempts.keys()) +
                list(self.task_generation_successes.keys()) +
                list(self.task_generation_failures.keys())
            ):
                attempts = self.task_generation_attempts[format_type]
                successes = self.task_generation_successes[format_type]
                failures = self.task_generation_failures[format_type]
                validations = self.task_validation_failures[format_type]
                repairs = self.task_repair_attempts[format_type]
                repair_successes = self.task_repair_successes[format_type]
                fallbacks = self.task_fallback_usage[format_type]
                latencies = self.task_generation_latencies[format_type]
                
                success_rate = (successes / attempts * 100) if attempts > 0 else 0
                repair_success_rate = (repair_successes / repairs * 100) if repairs > 0 else 0
                avg_latency = sum(latencies) / len(latencies) if latencies else 0
                
                stats[format_type] = {
                    'attempts': attempts,
                    'successes': successes,
                    'failures': failures,
                    'success_rate': round(success_rate, 2),
                    'validation_failures': validations,
                    'repair_attempts': repairs,
                    'repair_successes': repair_successes,
                    'repair_success_rate': round(repair_success_rate, 2),
                    'fallback_usage': fallbacks,
                    'avg_latency_seconds': round(avg_latency, 2),
                    'min_latency_seconds': round(min(latencies), 2) if latencies else 0,
                    'max_latency_seconds': round(max(latencies), 2) if latencies else 0
                }
            
            return stats
    
    # ==================== Meeting Conversation Metrics ====================
    
    def record_meeting_message_generation(
        self,
        meeting_id: str,
        message_count: int,
        latency_seconds: float,
        stage: str
    ) -> None:
        """
        Record meeting message generation.
        
        Args:
            meeting_id: Unique meeting identifier
            message_count: Number of messages generated
            latency_seconds: Time taken to generate messages
            stage: Stage of conversation (initial_discussion, response_to_player)
        """
        with self._lock:
            self.meeting_message_counts[stage] += message_count
            self.meeting_generation_latencies[stage].append(latency_seconds)
        
        logger.info(
            f"Meeting messages generated: meeting={meeting_id}, "
            f"count={message_count}, stage={stage}, "
            f"latency={latency_seconds:.2f}s"
        )
        
        self._check_and_log_summary()
    
    def record_meeting_polling_request(
        self,
        meeting_id: str,
        new_messages_count: int
    ) -> None:
        """
        Record a meeting polling request.
        
        Args:
            meeting_id: Unique meeting identifier
            new_messages_count: Number of new messages returned
        """
        with self._lock:
            self.meeting_polling_requests[meeting_id] += 1
        
        # Only log if new messages were found (to reduce noise)
        if new_messages_count > 0:
            logger.debug(
                f"Meeting polling: meeting={meeting_id}, "
                f"new_messages={new_messages_count}"
            )
    
    def record_meeting_completion(
        self,
        meeting_id: str,
        duration_minutes: float,
        topics_completed: int
    ) -> None:
        """
        Record a meeting completion.
        
        Args:
            meeting_id: Unique meeting identifier
            duration_minutes: Duration of the meeting
            topics_completed: Number of topics completed
        """
        with self._lock:
            self.meeting_completions['completed'] += 1
        
        logger.info(
            f"Meeting completed: meeting={meeting_id}, "
            f"duration={duration_minutes:.1f}min, "
            f"topics={topics_completed}"
        )
        
        self._check_and_log_summary()
    
    def record_meeting_early_leave(
        self,
        meeting_id: str,
        duration_minutes: float,
        topics_completed: int,
        total_topics: int
    ) -> None:
        """
        Record a meeting left early.
        
        Args:
            meeting_id: Unique meeting identifier
            duration_minutes: Duration before leaving
            topics_completed: Number of topics completed
            total_topics: Total number of topics
        """
        with self._lock:
            self.meeting_early_leaves['left_early'] += 1
        
        completion_percentage = (topics_completed / total_topics * 100) if total_topics > 0 else 0
        
        logger.info(
            f"Meeting left early: meeting={meeting_id}, "
            f"duration={duration_minutes:.1f}min, "
            f"completion={completion_percentage:.1f}% ({topics_completed}/{total_topics})"
        )
        
        self._check_and_log_summary()
    
    def get_meeting_stats(self) -> Dict[str, Any]:
        """
        Get meeting conversation statistics.
        
        Returns:
            Dictionary containing meeting metrics
        """
        with self._lock:
            total_completions = self.meeting_completions.get('completed', 0)
            total_early_leaves = self.meeting_early_leaves.get('left_early', 0)
            total_meetings = total_completions + total_early_leaves
            
            completion_rate = (total_completions / total_meetings * 100) if total_meetings > 0 else 0
            early_leave_rate = (total_early_leaves / total_meetings * 100) if total_meetings > 0 else 0
            
            # Calculate message generation stats by stage
            message_stats = {}
            for stage in ['initial_discussion', 'response_to_player']:
                count = self.meeting_message_counts[stage]
                latencies = self.meeting_generation_latencies[stage]
                avg_latency = sum(latencies) / len(latencies) if latencies else 0
                
                message_stats[stage] = {
                    'total_messages': count,
                    'avg_latency_seconds': round(avg_latency, 2),
                    'min_latency_seconds': round(min(latencies), 2) if latencies else 0,
                    'max_latency_seconds': round(max(latencies), 2) if latencies else 0
                }
            
            # Calculate polling stats
            total_polls = sum(self.meeting_polling_requests.values())
            unique_meetings_polled = len(self.meeting_polling_requests)
            avg_polls_per_meeting = (total_polls / unique_meetings_polled) if unique_meetings_polled > 0 else 0
            
            return {
                'total_meetings': total_meetings,
                'completed': total_completions,
                'left_early': total_early_leaves,
                'completion_rate': round(completion_rate, 2),
                'early_leave_rate': round(early_leave_rate, 2),
                'message_generation': message_stats,
                'polling': {
                    'total_requests': total_polls,
                    'unique_meetings': unique_meetings_polled,
                    'avg_requests_per_meeting': round(avg_polls_per_meeting, 2)
                }
            }
    
    # ==================== Summary Logging ====================
    
    def _check_and_log_summary(self) -> None:
        """
        Check if it's time to log a metrics summary and do so if needed.
        """
        current_time = time.time()
        if current_time - self.last_metrics_log >= self.metrics_log_interval:
            self.log_metrics_summary()
            self.last_metrics_log = current_time
    
    def log_metrics_summary(self) -> None:
        """
        Log a comprehensive metrics summary.
        """
        logger.info("=" * 80)
        logger.info("METRICS SUMMARY")
        logger.info("=" * 80)
        
        # Task generation metrics
        task_stats = self.get_task_generation_stats()
        if task_stats:
            logger.info("\nTask Generation Metrics:")
            logger.info("-" * 80)
            for format_type, stats in task_stats.items():
                logger.info(f"\n  Format: {format_type}")
                logger.info(f"    Attempts: {stats['attempts']}")
                logger.info(f"    Successes: {stats['successes']} ({stats['success_rate']}%)")
                logger.info(f"    Failures: {stats['failures']}")
                logger.info(f"    Validation Failures: {stats['validation_failures']}")
                logger.info(f"    Repair Attempts: {stats['repair_attempts']}")
                logger.info(f"    Repair Successes: {stats['repair_successes']} ({stats['repair_success_rate']}%)")
                logger.info(f"    Fallback Usage: {stats['fallback_usage']}")
                logger.info(f"    Avg Latency: {stats['avg_latency_seconds']}s")
                logger.info(f"    Latency Range: {stats['min_latency_seconds']}s - {stats['max_latency_seconds']}s")
        
        # Meeting conversation metrics
        meeting_stats = self.get_meeting_stats()
        if meeting_stats['total_meetings'] > 0:
            logger.info("\nMeeting Conversation Metrics:")
            logger.info("-" * 80)
            logger.info(f"  Total Meetings: {meeting_stats['total_meetings']}")
            logger.info(f"  Completed: {meeting_stats['completed']} ({meeting_stats['completion_rate']}%)")
            logger.info(f"  Left Early: {meeting_stats['left_early']} ({meeting_stats['early_leave_rate']}%)")
            
            logger.info("\n  Message Generation:")
            for stage, stats in meeting_stats['message_generation'].items():
                logger.info(f"    {stage}:")
                logger.info(f"      Total Messages: {stats['total_messages']}")
                logger.info(f"      Avg Latency: {stats['avg_latency_seconds']}s")
                logger.info(f"      Latency Range: {stats['min_latency_seconds']}s - {stats['max_latency_seconds']}s")
            
            logger.info("\n  Polling:")
            logger.info(f"    Total Requests: {meeting_stats['polling']['total_requests']}")
            logger.info(f"    Unique Meetings: {meeting_stats['polling']['unique_meetings']}")
            logger.info(f"    Avg Requests/Meeting: {meeting_stats['polling']['avg_requests_per_meeting']}")
        
        logger.info("\n" + "=" * 80)
    
    def reset_metrics(self) -> None:
        """
        Reset all metrics counters.
        
        Useful for testing or periodic resets.
        """
        with self._lock:
            self.task_generation_attempts.clear()
            self.task_generation_successes.clear()
            self.task_generation_failures.clear()
            self.task_validation_failures.clear()
            self.task_repair_attempts.clear()
            self.task_repair_successes.clear()
            self.task_fallback_usage.clear()
            self.task_generation_latencies.clear()
            
            self.meeting_message_counts.clear()
            self.meeting_generation_latencies.clear()
            self.meeting_completions.clear()
            self.meeting_early_leaves.clear()
            self.meeting_polling_requests.clear()
            
            self.last_metrics_log = time.time()
        
        logger.info("Metrics reset")


# Singleton instance
_metrics_tracker_instance = None


def get_metrics_tracker() -> MetricsTracker:
    """
    Get the singleton MetricsTracker instance.
    
    Returns:
        MetricsTracker instance
    """
    global _metrics_tracker_instance
    if _metrics_tracker_instance is None:
        _metrics_tracker_instance = MetricsTracker()
    return _metrics_tracker_instance
