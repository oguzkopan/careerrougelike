"""
Standalone test for XP calculation logic
"""

# XP progression constants (from FirestoreManager)
BASE_XP_REQUIREMENT = 1000  # XP needed for level 2
XP_MULTIPLIER = 1.5  # Exponential growth factor

def calculate_xp_for_level(level: int) -> int:
    """
    Calculate total XP required to reach a specific level.
    Uses exponential curve: XP = BASE * (MULTIPLIER ^ (level - 1))
    """
    if level <= 1:
        return 0
    
    total_xp = 0
    for lvl in range(2, level + 1):
        total_xp += int(BASE_XP_REQUIREMENT * (XP_MULTIPLIER ** (lvl - 2)))
    
    return total_xp

def calculate_xp_to_next_level(current_level: int, current_xp: int) -> int:
    """
    Calculate XP needed to reach the next level.
    """
    xp_for_next_level = calculate_xp_for_level(current_level + 1)
    return xp_for_next_level - current_xp

def can_apply_to_job(player_level: int, job_level: str) -> bool:
    """
    Check if a player can apply to a job based on their level.
    """
    job_level_lower = job_level.lower()
    
    if job_level_lower == "entry":
        return player_level >= 1
    elif job_level_lower == "mid":
        return player_level >= 4
    elif job_level_lower == "senior":
        return player_level >= 8
    else:
        return True

def test_xp_calculations():
    """Test XP calculation logic"""
    
    print("Testing XP Calculations:")
    print("-" * 50)
    
    # Test XP requirements for each level
    for level in range(1, 11):
        total_xp = calculate_xp_for_level(level)
        print(f"Level {level}: {total_xp:,} total XP required")
    
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
        xp_to_next = calculate_xp_to_next_level(level, xp)
        print(f"Level {level}, XP {xp:,}: {xp_to_next:,} XP to next level")
    
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
    
    all_passed = True
    for player_level, job_level, expected in test_jobs:
        result = can_apply_to_job(player_level, job_level)
        status = "✓" if result == expected else "✗"
        if result != expected:
            all_passed = False
        print(f"{status} Level {player_level} -> {job_level} job: {result} (expected {expected})")
    
    print("\n" + "-" * 50)
    if all_passed:
        print("✓ All tests passed!")
    else:
        print("✗ Some tests failed!")
    
    return all_passed

if __name__ == "__main__":
    success = test_xp_calculations()
    exit(0 if success else 1)
