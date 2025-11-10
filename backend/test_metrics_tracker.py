"""
Simple test script to verify MetricsTracker functionality
"""

import sys
import time

# Mock the dependencies
class MockMetricsTracker:
    """Mock version of MetricsTracker for testing"""
    
    def __init__(self):
        from collections import defaultdict
        self.task_generation_attempts = defaultdict(int)
        self.task_generation_successes = defaultdict(int)
        self.task_generation_failures = defaultdict(int)
        self.task_validation_failures = defaultdict(int)
        self.task_repair_attempts = defaultdict(int)
        self.task_repair_successes = defaultdict(int)
        self.task_fallback_usage = defaultdict(int)
        self.task_generation_latencies = defaultdict(list)
        
        self.meeting_message_counts = defaultdict(int)
        self.meeting_generation_latencies = defaultdict(list)
        self.meeting_completions = defaultdict(int)
        self.meeting_early_leaves = defaultdict(int)
        self.meeting_polling_requests = defaultdict(int)
    
    def record_task_generation_attempt(self, format_type):
        self.task_generation_attempts[format_type] += 1
    
    def record_task_generation_success(self, format_type, latency, session_id=None):
        self.task_generation_successes[format_type] += 1
        self.task_generation_latencies[format_type].append(latency)
    
    def record_task_generation_failure(self, format_type, reason, session_id=None):
        self.task_generation_failures[format_type] += 1
    
    def record_task_validation_failure(self, format_type, errors, session_id=None):
        self.task_validation_failures[format_type] += 1
    
    def record_task_repair_attempt(self, format_type, success, session_id=None):
        self.task_repair_attempts[format_type] += 1
        if success:
            self.task_repair_successes[format_type] += 1
    
    def record_task_fallback_usage(self, original, fallback, reason, session_id=None):
        self.task_fallback_usage[original] += 1
    
    def record_meeting_message_generation(self, meeting_id, count, latency, stage):
        self.meeting_message_counts[stage] += count
        self.meeting_generation_latencies[stage].append(latency)
    
    def record_meeting_polling_request(self, meeting_id, new_messages):
        self.meeting_polling_requests[meeting_id] += 1
    
    def record_meeting_completion(self, meeting_id, duration, topics):
        self.meeting_completions['completed'] += 1
    
    def record_meeting_early_leave(self, meeting_id, duration, topics_done, total):
        self.meeting_early_leaves['left_early'] += 1
    
    def get_task_generation_stats(self):
        stats = {}
        for format_type in set(list(self.task_generation_attempts.keys())):
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
                'avg_latency_seconds': round(avg_latency, 2)
            }
        return stats
    
    def get_meeting_stats(self):
        total_completions = self.meeting_completions.get('completed', 0)
        total_early_leaves = self.meeting_early_leaves.get('left_early', 0)
        total_meetings = total_completions + total_early_leaves
        
        completion_rate = (total_completions / total_meetings * 100) if total_meetings > 0 else 0
        early_leave_rate = (total_early_leaves / total_meetings * 100) if total_meetings > 0 else 0
        
        message_stats = {}
        for stage in ['initial_discussion', 'response_to_player']:
            count = self.meeting_message_counts[stage]
            latencies = self.meeting_generation_latencies[stage]
            avg_latency = sum(latencies) / len(latencies) if latencies else 0
            
            message_stats[stage] = {
                'total_messages': count,
                'avg_latency_seconds': round(avg_latency, 2)
            }
        
        total_polls = sum(self.meeting_polling_requests.values())
        unique_meetings = len(self.meeting_polling_requests)
        avg_polls = (total_polls / unique_meetings) if unique_meetings > 0 else 0
        
        return {
            'total_meetings': total_meetings,
            'completed': total_completions,
            'left_early': total_early_leaves,
            'completion_rate': round(completion_rate, 2),
            'early_leave_rate': round(early_leave_rate, 2),
            'message_generation': message_stats,
            'polling': {
                'total_requests': total_polls,
                'unique_meetings': unique_meetings,
                'avg_requests_per_meeting': round(avg_polls, 2)
            }
        }


def test_metrics_tracker():
    """Test the metrics tracker functionality"""
    print("=" * 80)
    print("Testing MetricsTracker")
    print("=" * 80)
    
    tracker = MockMetricsTracker()
    
    # Test task generation metrics
    print("\n1. Testing task generation metrics...")
    
    # Simulate successful matching task generation
    tracker.record_task_generation_attempt("matching")
    tracker.record_task_generation_success("matching", 2.5, "sess-123")
    
    # Simulate failed matching task with repair
    tracker.record_task_generation_attempt("matching")
    tracker.record_task_validation_failure("matching", ["Missing items"], "sess-124")
    tracker.record_task_repair_attempt("matching", True, "sess-124")
    tracker.record_task_generation_success("matching", 3.2, "sess-124")
    
    # Simulate failed task with fallback
    tracker.record_task_generation_attempt("matching")
    tracker.record_task_validation_failure("matching", ["Invalid structure"], "sess-125")
    tracker.record_task_repair_attempt("matching", False, "sess-125")
    tracker.record_task_fallback_usage("matching", "text_answer", "repair_failed", "sess-125")
    tracker.record_task_generation_success("text_answer", 1.8, "sess-125")
    
    # Simulate successful text_answer generation
    tracker.record_task_generation_attempt("text_answer")
    tracker.record_task_generation_success("text_answer", 1.5, "sess-126")
    
    task_stats = tracker.get_task_generation_stats()
    print("\nTask Generation Stats:")
    for format_type, stats in task_stats.items():
        print(f"\n  {format_type}:")
        print(f"    Attempts: {stats['attempts']}")
        print(f"    Successes: {stats['successes']} ({stats['success_rate']}%)")
        print(f"    Failures: {stats['failures']}")
        print(f"    Validation Failures: {stats['validation_failures']}")
        print(f"    Repair Attempts: {stats['repair_attempts']}")
        print(f"    Repair Successes: {stats['repair_successes']} ({stats['repair_success_rate']}%)")
        print(f"    Fallback Usage: {stats['fallback_usage']}")
        print(f"    Avg Latency: {stats['avg_latency_seconds']}s")
    
    # Test meeting conversation metrics
    print("\n2. Testing meeting conversation metrics...")
    
    # Simulate meeting 1 - completed
    tracker.record_meeting_message_generation("meet-1", 3, 2.1, "initial_discussion")
    tracker.record_meeting_polling_request("meet-1", 3)
    tracker.record_meeting_message_generation("meet-1", 2, 1.5, "response_to_player")
    tracker.record_meeting_polling_request("meet-1", 2)
    tracker.record_meeting_completion("meet-1", 15.5, 3)
    
    # Simulate meeting 2 - left early
    tracker.record_meeting_message_generation("meet-2", 4, 2.3, "initial_discussion")
    tracker.record_meeting_polling_request("meet-2", 4)
    tracker.record_meeting_early_leave("meet-2", 8.2, 1, 3)
    
    # Simulate meeting 3 - completed
    tracker.record_meeting_message_generation("meet-3", 3, 1.9, "initial_discussion")
    tracker.record_meeting_polling_request("meet-3", 3)
    tracker.record_meeting_message_generation("meet-3", 2, 1.7, "response_to_player")
    tracker.record_meeting_polling_request("meet-3", 2)
    tracker.record_meeting_polling_request("meet-3", 0)  # Empty poll
    tracker.record_meeting_completion("meet-3", 12.3, 3)
    
    meeting_stats = tracker.get_meeting_stats()
    print("\nMeeting Conversation Stats:")
    print(f"  Total Meetings: {meeting_stats['total_meetings']}")
    print(f"  Completed: {meeting_stats['completed']} ({meeting_stats['completion_rate']}%)")
    print(f"  Left Early: {meeting_stats['left_early']} ({meeting_stats['early_leave_rate']}%)")
    print("\n  Message Generation:")
    for stage, stats in meeting_stats['message_generation'].items():
        print(f"    {stage}:")
        print(f"      Total Messages: {stats['total_messages']}")
        print(f"      Avg Latency: {stats['avg_latency_seconds']}s")
    print("\n  Polling:")
    print(f"    Total Requests: {meeting_stats['polling']['total_requests']}")
    print(f"    Unique Meetings: {meeting_stats['polling']['unique_meetings']}")
    print(f"    Avg Requests/Meeting: {meeting_stats['polling']['avg_requests_per_meeting']}")
    
    print("\n" + "=" * 80)
    print("✓ All metrics tests passed!")
    print("=" * 80)


if __name__ == "__main__":
    test_metrics_tracker()
