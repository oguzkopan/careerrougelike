"""
Test script for player state management functionality
"""

import sys
sys.path.insert(0, '.')

from shared.firestore_manager import FirestoreManager

def test_xp_calculations():
    """Test XP calculation logic"""
    fm = FirestoreManager()
    
    print("Testing XP Calculations:")
    print("-" * 50)
    
    # Test XP requirements for each level
    for level in range(1, 11):
        total_xp = fm.calculate_xp_for_level(level)
        print(f"Level {level}: {total_xp} total XP required")
    
    print("\n" + "-" * 50)
    print("Testing XP to Next Level:")
    print("-" * 50)
    
    # Test XP to next level calculations
    test_cases = [
        (1, 0),      # Level 1, 0 XP
        (1, 500),    # Level 1, 500 XP
        (2, 1000),   # Level 2, 1000 XP
        (5, 5000),   # Level 5, 5000 XP
    ]
    
    for level, xp in test_cases:
        xp_to_next = fm.calculate_xp_to_next_level(level, xp)
        print(f"Level {level}, XP {xp}: {xp_to_next} XP to next level")
    
    print("\n" + "-" * 50)
    print("Testing Job Eligibility:")
    print("-" * 50)
    
    # Test job eligibility
    test_jobs = [
        (1, "entry", True),
        (3, "entry", True),
        (3, "mid", False),
        (4, "mid", True),
        (7, "mid", True),
        (7, "senior", False),
        (8, "senior", True),
        (10, "senior", True),
    ]
    
    for player_level, job_level, expected in test_jobs:
        result = fm.can_apply_to_job(player_level, job_level)
        status = "✓" if result == expected else "✗"
        print(f"{status} Level {player_level} -> {job_level} job: {result} (expected {expected})")
    
    print("\n" + "-" * 50)
    print("All tests completed!")

if __name__ == "__main__":
    test_xp_calculations()
