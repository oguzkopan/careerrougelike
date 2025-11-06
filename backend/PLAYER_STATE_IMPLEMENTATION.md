# Player State Management Implementation

## Overview
This document describes the implementation of Task 5: Update player state management for the Job Market Simulator.

## Changes Made

### 1. Modified POST /api/sessions Endpoint
**File:** `backend/gateway/main.py`

**Changes:**
- Initialize player with status "graduated" instead of "new"
- Added comprehensive player state initialization including:
  - `xp`: Starting at 0
  - `xp_to_next_level`: Calculated based on level
  - `current_job`: Initially null
  - `job_history`: Empty array
  - `cv_data`: Empty structure with experience, skills, accomplishments
  - `stats`: Initialized with all counters at 0

**Example Response:**
```json
{
  "session_id": "sess-abc123",
  "status": "graduated",
  "level": 1,
  "xp": 0,
  "xp_to_next_level": 1000,
  "current_job": null,
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
  }
}
```

### 2. Added GET /api/sessions/{sessionId}/state Endpoint
**File:** `backend/gateway/main.py`

**Purpose:** Return full player state including level, XP, XP to next level, current job, and stats.

**Response Structure:**
```json
{
  "session_id": "sess-abc123",
  "status": "graduated",
  "profession": "ios_engineer",
  "level": 5,
  "xp": 8125,
  "xp_to_next_level": 5062,
  "current_job": {
    "job_id": "job-xyz",
    "company_name": "TechCorp",
    "position": "Senior iOS Engineer",
    "start_date": "2025-11-06T10:00:00Z",
    "salary": 120000
  },
  "job_history": [...],
  "stats": {
    "tasks_completed": 45,
    "interviews_passed": 3,
    "interviews_failed": 2,
    "jobs_held": 2
  },
  "cv_data": {...}
}
```

### 3. XP Calculation Logic
**File:** `backend/shared/firestore_manager.py`

**Exponential Curve Formula:**
- Base XP Requirement: 1,000 XP
- Multiplier: 1.5x per level
- Formula: `XP = BASE * (MULTIPLIER ^ (level - 1))`

**Level Progression Table:**
| Level | Total XP Required | XP for This Level |
|-------|-------------------|-------------------|
| 1     | 0                 | 0                 |
| 2     | 1,000             | 1,000             |
| 3     | 2,500             | 1,500             |
| 4     | 4,750             | 2,250             |
| 5     | 8,125             | 3,375             |
| 6     | 13,187            | 5,062             |
| 7     | 20,780            | 7,593             |
| 8     | 32,170            | 11,390            |
| 9     | 49,255            | 17,085            |
| 10    | 74,883            | 25,628            |

**Methods:**
- `calculate_xp_for_level(level)`: Returns total XP needed to reach a level
- `calculate_xp_to_next_level(current_level, current_xp)`: Returns XP needed for next level
- `add_xp(session_id, xp_amount)`: Adds XP and handles level-ups automatically
- `check_level_up(session_id)`: Checks if player should level up

### 4. Level-Up Logic
**File:** `backend/shared/firestore_manager.py`

**Implementation:**
- Automatically checks for level-up when XP is added
- Handles multiple level-ups in a single XP gain
- Updates session with new level and recalculates XP to next level
- Returns level-up status in response

**Example:**
```python
result = firestore_manager.add_xp(session_id, 5000)
# Returns:
# {
#   "new_xp": 5000,
#   "new_level": 4,
#   "leveled_up": True,
#   "xp_to_next_level": 3125
# }
```

### 5. Job Eligibility Check
**File:** `backend/shared/firestore_manager.py` and `backend/gateway/main.py`

**Method:** `can_apply_to_job(player_level, job_level)`

**Rules:**
- Entry-level jobs: Level 1+ (anyone can apply)
- Mid-level jobs: Level 4+ required
- Senior-level jobs: Level 8+ required

**Integration:**
- Added to GET /api/sessions/{sessionId}/jobs/{jobId} endpoint
- Returns `can_apply` boolean and `eligibility_message` if not eligible

**Example Response:**
```json
{
  "job_id": "job-xyz",
  "company_name": "TechCorp",
  "position": "Senior iOS Engineer",
  "level": "senior",
  "can_apply": false,
  "eligibility_message": "You need to be level 8 or higher to apply for this senior-level position."
}
```

## Requirements Satisfied

✅ **1.1, 1.2, 1.3, 1.4, 1.5:** Player initialization with "graduated" status
✅ **16.1:** Level and XP tracking with exponential curve
✅ **16.2:** XP to next level calculation
✅ **16.3:** Stats tracking (tasks completed, interviews passed, jobs held)
✅ **16.4:** Level-up logic with automatic progression
✅ **16.5:** Job eligibility based on player level

## Testing

A standalone test script was created to verify the implementation:
- **File:** `backend/test_xp_logic.py`
- **Tests:** XP calculations, level progression, job eligibility
- **Result:** All tests passed ✓

## API Endpoints Summary

### POST /api/sessions
- **Purpose:** Create new session with graduated status
- **Changes:** Initializes full player state

### GET /api/sessions/{sessionId}/state
- **Purpose:** Get complete player state
- **Returns:** Level, XP, current job, stats, CV data

### GET /api/sessions/{sessionId}/jobs/{jobId}
- **Purpose:** Get job details with eligibility check
- **Returns:** Job data + can_apply + eligibility_message

## Next Steps

The player state management is now complete and ready for integration with:
- Frontend graduation screen (Task 6)
- Job listings view (Task 7)
- Work dashboard (Task 10)
- Task system (Task 11)
