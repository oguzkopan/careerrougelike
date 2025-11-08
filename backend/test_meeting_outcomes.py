"""
Test script for meeting outcome generation

This script tests the meeting outcome generation functionality including:
- Meeting evaluation
- Task generation from meetings
- XP awards
- Summary creation with decisions and action items
"""

import asyncio
import sys
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_meeting_outcomes():
    """Test meeting outcome generation."""
    from agents.workflow_orchestrator import WorkflowOrchestrator
    
    orchestrator = WorkflowOrchestrator()
    
    # Mock meeting data
    meeting_data = {
        "meeting_id": "test-meeting-123",
        "session_id": "test-session-456",
        "meeting_type": "project_review",
        "title": "Sprint Planning Meeting",
        "context": "Discuss upcoming sprint goals and task allocation",
        "objective": "Align on sprint priorities and assign tasks",
        "player_level": 5,
        "job_title": "Software Engineer",
        "company_name": "TechCorp",
        "tasks_completed": 10,
        "topics": [
            {
                "id": "topic-1",
                "question": "What are the priority features for this sprint?",
                "context": "Need to align on sprint goals",
                "expected_points": ["Feature A", "Bug fixes", "Technical debt"]
            },
            {
                "id": "topic-2",
                "question": "How should we allocate resources?",
                "context": "Team capacity planning",
                "expected_points": ["Team assignments", "Timeline", "Dependencies"]
            }
        ],
        "conversation_history": [
            {
                "id": "msg-1",
                "type": "topic_intro",
                "content": "Let's discuss sprint priorities...",
                "timestamp": "2025-11-08T10:00:00Z"
            },
            {
                "id": "msg-2",
                "type": "ai_response",
                "participant_id": "p-1",
                "participant_name": "Sarah Chen",
                "participant_role": "Manager",
                "content": "I think we should focus on the authentication feature first.",
                "sentiment": "positive",
                "timestamp": "2025-11-08T10:00:15Z"
            },
            {
                "id": "msg-3",
                "type": "player_response",
                "participant_name": "You",
                "content": "I agree. We should prioritize authentication and then move to the dashboard. I can lead the authentication work and estimate it will take about 2 weeks.",
                "timestamp": "2025-11-08T10:01:00Z"
            },
            {
                "id": "msg-4",
                "type": "ai_response",
                "participant_id": "p-1",
                "participant_name": "Sarah Chen",
                "participant_role": "Manager",
                "content": "Great! Let's plan to have authentication completed by end of sprint. We decided to prioritize authentication over other features.",
                "sentiment": "positive",
                "timestamp": "2025-11-08T10:01:30Z"
            },
            {
                "id": "msg-5",
                "type": "player_response",
                "participant_name": "You",
                "content": "I will need to review the security requirements and set up the OAuth integration. I'll create a detailed implementation plan.",
                "timestamp": "2025-11-08T10:02:00Z"
            }
        ],
        "participants": [
            {
                "id": "p-1",
                "name": "Sarah Chen",
                "role": "Manager",
                "personality": "supportive",
                "avatar_color": "#3B82F6"
            }
        ]
    }
    
    print("\n" + "="*60)
    print("Testing Meeting Outcome Generation")
    print("="*60)
    
    # Test 1: Evaluate meeting participation
    print("\n1. Evaluating meeting participation...")
    try:
        evaluation = await orchestrator.evaluate_meeting_participation(
            session_id="test-session-456",
            meeting_id="test-meeting-123",
            meeting_data=meeting_data
        )
        
        print(f"   ✓ Evaluation completed")
        print(f"   - Score: {evaluation.get('score', 0)}/100")
        print(f"   - XP Earned: {evaluation.get('xp_earned', 0)}")
        print(f"   - Should Generate Tasks: {evaluation.get('should_generate_tasks', False)}")
        print(f"   - Participation Level: {evaluation.get('participation_level', 'unknown')}")
        print(f"   - Strengths: {len(evaluation.get('strengths', []))} items")
        print(f"   - Improvements: {len(evaluation.get('improvements', []))} items")
        
    except Exception as e:
        print(f"   ✗ Evaluation failed: {e}")
        return False
    
    # Test 2: Generate meeting outcomes
    print("\n2. Generating meeting outcomes...")
    try:
        outcomes = await orchestrator.generate_meeting_outcomes(
            session_id="test-session-456",
            meeting_id="test-meeting-123",
            meeting_data=meeting_data,
            evaluation=evaluation
        )
        
        print(f"   ✓ Outcomes generated")
        print(f"   - Generated Tasks: {len(outcomes.get('generated_tasks', []))}")
        print(f"   - Key Decisions: {len(outcomes.get('key_decisions', []))}")
        print(f"   - Action Items: {len(outcomes.get('action_items', []))}")
        print(f"   - XP Earned: {outcomes.get('xp_earned', 0)}")
        
        # Display generated tasks
        if outcomes.get('generated_tasks'):
            print("\n   Generated Tasks:")
            for i, task in enumerate(outcomes['generated_tasks'], 1):
                print(f"     {i}. {task.get('title', 'Untitled')}")
                print(f"        - XP: {task.get('xp_reward', 0)}")
                print(f"        - Difficulty: {task.get('difficulty', 0)}/10")
        
        # Display key decisions
        if outcomes.get('key_decisions'):
            print("\n   Key Decisions:")
            for i, decision in enumerate(outcomes['key_decisions'], 1):
                print(f"     {i}. {decision[:80]}...")
        
        # Display action items
        if outcomes.get('action_items'):
            print("\n   Action Items:")
            for i, item in enumerate(outcomes['action_items'], 1):
                print(f"     {i}. {item[:80]}...")
        
    except Exception as e:
        print(f"   ✗ Outcome generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 3: Test helper methods
    print("\n3. Testing helper methods...")
    try:
        # Test _extract_key_decisions
        decisions = orchestrator._extract_key_decisions(meeting_data['conversation_history'])
        print(f"   ✓ Extracted {len(decisions)} key decisions")
        
        # Test _extract_action_items
        action_items = orchestrator._extract_action_items(
            meeting_data['conversation_history'],
            outcomes.get('generated_tasks', [])
        )
        print(f"   ✓ Extracted {len(action_items)} action items")
        
    except Exception as e:
        print(f"   ✗ Helper methods failed: {e}")
        return False
    
    print("\n" + "="*60)
    print("✓ All tests passed!")
    print("="*60)
    return True


if __name__ == "__main__":
    success = asyncio.run(test_meeting_outcomes())
    sys.exit(0 if success else 1)
