# CareerRoguelike API Documentation

Complete REST API reference for the CareerRoguelike backend service.

**Base URL**: `https://career-rl-backend-1086514937351.europe-west1.run.app`

**Local Development**: `http://localhost:8080`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Session Management](#session-management)
3. [Job Market Endpoints](#job-market-endpoints)
4. [Interview Endpoints](#interview-endpoints)
5. [Task Management](#task-management)
6. [Player State](#player-state)
7. [Error Handling](#error-handling)
8. [Rate Limits](#rate-limits)

---

## Authentication

Currently, the API supports optional Firebase authentication. All endpoints work without authentication for demo purposes, but authenticated requests will have user-specific session isolation.

**Headers** (optional):
```
Authorization: Bearer <firebase-token>
```

---

## Session Management

### Create Session

Create a new game session with specified profession and starting level.

**Endpoint**: `POST /sessions`

**Request Body**:
```json
{
  "profession": "ios_engineer",
  "level": 1
}
```

**Profession Options**:
- `ios_engineer` - iOS/Mobile Development
- `data_analyst` - Data Analysis
- `product_designer` - Product/UX Design
- `sales_associate` - Sales

**Level Range**: 1-10 (1 = Junior, 10 = Expert)

**Response** (201 Created):
```json
{
  "session_id": "sess-abc123def456"
}
```

**Example**:
```bash
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "profession": "ios_engineer",
    "level": 1
  }'
```

---

### Get Session

Retrieve complete session data including all state.

**Endpoint**: `GET /sessions/{session_id}`

**Response** (200 OK):
```json
{
  "session_id": "sess-abc123def456",
  "profession": "ios_engineer",
  "level": 3,
  "status": "employed",
  "xp": 450,
  "xp_to_next_level": 600,
  "current_job": {
    "job_id": "job-xyz789",
    "company_name": "TechCorp",
    "position": "Senior iOS Engineer",
    "start_date": "2025-11-06T10:00:00Z",
    "salary": 120000
  },
  "job_history": [...],
  "cv_data": {...},
  "stats": {
    "tasks_completed": 15,
    "interviews_passed": 2,
    "interviews_failed": 1,
    "jobs_held": 2
  },
  "state": {...}
}
```

**Example**:
```bash
curl https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/sess-abc123def456
```

---

## Job Market Endpoints

### Generate Job Listings

Generate AI-powered job listings appropriate for player's level.

**Endpoint**: `POST /sessions/{session_id}/jobs/generate`

**Request Body**:
```json
{
  "player_level": 3,
  "count": 10
}
```

**Parameters**:
- `player_level` (required): Player's current level (1-10)
- `count` (optional): Number of jobs to generate (1-20, default: 10)

**Response** (200 OK):
```json
{
  "jobs": [
    {
      "id": "job-abc123",
      "company_name": "TechCorp",
      "company_logo": null,
      "position": "Senior iOS Engineer",
      "location": "San Francisco, CA",
      "job_type": "remote",
      "salary_range": {
        "min": 100000,
        "max": 140000
      },
      "level": "mid",
      "requirements": [
        "5+ years Swift experience",
        "SwiftUI and UIKit proficiency",
        "Experience with REST APIs"
      ],
      "responsibilities": [
        "Design and implement iOS features",
        "Collaborate with product team",
        "Mentor junior developers"
      ],
      "benefits": [
        "Health insurance",
        "401k matching",
        "Remote work"
      ],
      "description": "We're looking for an experienced iOS engineer...",
      "posted_date": "2025-11-06T10:00:00Z"
    }
  ]
}
```

**Job Levels**:
- `entry`: Level 1-3 players (Junior positions)
- `mid`: Level 4-7 players (Senior positions)
- `senior`: Level 8-10 players (Lead/Principal positions)

**Example**:
```bash
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/sess-abc123/jobs/generate \
  -H "Content-Type: application/json" \
  -d '{
    "player_level": 3,
    "count": 10
  }'
```

---

### Get Job Details

Retrieve detailed information about a specific job listing.

**Endpoint**: `GET /sessions/{session_id}/jobs/{job_id}`

**Response** (200 OK):
```json
{
  "id": "job-abc123",
  "session_id": "sess-abc123",
  "company_name": "TechCorp",
  "position": "Senior iOS Engineer",
  "location": "San Francisco, CA",
  "job_type": "remote",
  "salary_range": {
    "min": 100000,
    "max": 140000
  },
  "level": "mid",
  "requirements": [...],
  "responsibilities": [...],
  "benefits": [...],
  "description": "Full job description...",
  "qualifications": [...],
  "can_apply": true,
  "eligibility_message": null
}
```

**Eligibility**:
- `can_apply`: Boolean indicating if player meets level requirements
- `eligibility_message`: Explanation if player cannot apply

**Example**:
```bash
curl https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/sess-abc123/jobs/job-xyz789
```

---

### Refresh Job Listings

Mark old jobs as expired and generate new listings.

**Endpoint**: `POST /sessions/{session_id}/jobs/refresh`

**Response** (200 OK):
```json
{
  "jobs": [...]
}
```

**Example**:
```bash
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/sess-abc123/jobs/refresh
```

---

## Interview Endpoints

### Start Interview

Generate interview questions for a specific job.

**Endpoint**: `POST /sessions/{session_id}/jobs/{job_id}/interview`

**Response** (200 OK):
```json
{
  "questions": [
    {
      "id": "q1",
      "question": "Explain the difference between weak and strong references in Swift.",
      "expected_answer": "Weak references don't increase retain count..."
    },
    {
      "id": "q2",
      "question": "How would you optimize a UITableView with thousands of cells?",
      "expected_answer": "Use cell reuse, lazy loading, pagination..."
    },
    {
      "id": "q3",
      "question": "Describe your experience with SwiftUI vs UIKit.",
      "expected_answer": "SwiftUI is declarative, UIKit is imperative..."
    }
  ]
}
```

**Notes**:
- Generates 3-5 questions based on job requirements
- Questions are stored in session state for grading
- Questions are job-specific and level-appropriate

**Example**:
```bash
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/sess-abc123/jobs/job-xyz789/interview
```

---

### Submit Interview Answers

Submit answers for grading and receive interview results.

**Endpoint**: `POST /sessions/{session_id}/jobs/{job_id}/interview/submit`

**Request Body**:
```json
{
  "answers": {
    "q1": "Weak references don't increase the retain count, so the object can be deallocated...",
    "q2": "I would implement cell reuse using dequeueReusableCell, implement pagination...",
    "q3": "SwiftUI uses a declarative syntax which makes UI code more readable..."
  }
}
```

**Response** (200 OK):
```json
{
  "passed": true,
  "overall_score": 85,
  "feedback": [
    {
      "question_id": "q1",
      "question": "Explain the difference between weak and strong references in Swift.",
      "answer": "Weak references don't increase the retain count...",
      "score": 90,
      "feedback": "Excellent explanation of memory management concepts."
    },
    {
      "question_id": "q2",
      "question": "How would you optimize a UITableView with thousands of cells?",
      "answer": "I would implement cell reuse...",
      "score": 80,
      "feedback": "Good understanding of optimization techniques. Could mention prefetching."
    },
    {
      "question_id": "q3",
      "question": "Describe your experience with SwiftUI vs UIKit.",
      "answer": "SwiftUI uses a declarative syntax...",
      "score": 85,
      "feedback": "Clear comparison of both frameworks."
    }
  ]
}
```

**Grading Criteria**:
- Score >= 70: Pass
- Score < 70: Fail
- Overall score is average of all question scores

**Example**:
```bash
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/sess-abc123/jobs/job-xyz789/interview/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "q1": "Weak references...",
      "q2": "Cell reuse...",
      "q3": "SwiftUI is declarative..."
    }
  }'
```

---

### Accept Job Offer

Accept a job offer after passing the interview.

**Endpoint**: `POST /sessions/{session_id}/jobs/{job_id}/accept`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Job offer accepted successfully",
  "player_state": {
    "status": "employed",
    "current_job": {
      "job_id": "job-xyz789",
      "company_name": "TechCorp",
      "position": "Senior iOS Engineer",
      "start_date": "2025-11-06T10:00:00Z",
      "salary": 140000
    },
    "cv_data": {...}
  },
  "tasks": [
    {
      "id": "task-abc123",
      "title": "Implement User Authentication",
      "description": "Add OAuth 2.0 authentication...",
      "difficulty": 5,
      "xp_reward": 50,
      "status": "pending"
    }
  ]
}
```

**Side Effects**:
- Updates player status to "employed"
- Adds job to CV and job history
- Generates 3-5 initial work tasks
- Updates stats (jobs_held counter)

**Example**:
```bash
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/sess-abc123/jobs/job-xyz789/accept
```

---

## Task Management

### Get Active Tasks

Retrieve all active tasks for the current job.

**Endpoint**: `GET /sessions/{session_id}/tasks`

**Response** (200 OK):
```json
{
  "tasks": [
    {
      "id": "task-abc123",
      "session_id": "sess-abc123",
      "title": "Implement User Authentication",
      "description": "Add OAuth 2.0 authentication to the iOS app...",
      "requirements": [
        "Use OAuth 2.0 protocol",
        "Support Google and Apple sign-in",
        "Implement token refresh"
      ],
      "acceptance_criteria": [
        "Users can sign in with Google",
        "Users can sign in with Apple",
        "Tokens are securely stored",
        "Token refresh works automatically"
      ],
      "difficulty": 5,
      "xp_reward": 50,
      "status": "pending",
      "created_at": "2025-11-06T10:00:00Z"
    }
  ]
}
```

**Task Status**:
- `pending`: Not yet started
- `in-progress`: Currently being worked on
- `completed`: Successfully completed

**Example**:
```bash
curl https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/sess-abc123/tasks
```

---

### Submit Task Solution

Submit a solution for grading and XP rewards.

**Endpoint**: `POST /sessions/{session_id}/tasks/{task_id}/submit`

**Request Body**:
```json
{
  "solution": "I implemented OAuth 2.0 using the GoogleSignIn SDK and AuthenticationServices framework. The implementation includes:\n\n1. Google Sign-In integration with proper scope configuration\n2. Apple Sign-In using ASAuthorizationController\n3. Secure token storage in Keychain\n4. Automatic token refresh using refresh tokens\n5. Error handling for network failures\n\nThe code follows iOS security best practices and handles edge cases like expired tokens and revoked access."
}
```

**Response** (200 OK):
```json
{
  "passed": true,
  "score": 88,
  "feedback": "Excellent implementation! You correctly used the native frameworks and followed security best practices. The token refresh mechanism is well-designed. Consider adding biometric authentication for additional security.",
  "xp_gained": 50,
  "new_xp": 500,
  "new_level": 4,
  "level_up": true,
  "xp_to_next_level": 800,
  "new_task": {
    "id": "task-def456",
    "title": "Optimize App Performance",
    "description": "Reduce app launch time...",
    "difficulty": 6,
    "xp_reward": 60,
    "status": "pending"
  }
}
```

**Grading**:
- Score >= 70: Pass (awards XP)
- Score < 70: Fail (no XP, can retry)

**Side Effects** (on pass):
- Awards XP based on task difficulty
- Checks for level up
- Generates new task if queue < 3 tasks
- Updates CV with accomplishment
- Updates stats (tasks_completed counter)

**Example**:
```bash
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/sess-abc123/tasks/task-abc123/submit \
  -H "Content-Type: application/json" \
  -d '{
    "solution": "I implemented OAuth 2.0 using..."
  }'
```

---

## Player State

### Get Player State

Retrieve complete player state including level, XP, job, and stats.

**Endpoint**: `GET /sessions/{session_id}/state`

**Response** (200 OK):
```json
{
  "session_id": "sess-abc123",
  "status": "employed",
  "profession": "ios_engineer",
  "level": 4,
  "xp": 500,
  "xp_to_next_level": 800,
  "current_job": {
    "job_id": "job-xyz789",
    "company_name": "TechCorp",
    "position": "Senior iOS Engineer",
    "start_date": "2025-11-06T10:00:00Z",
    "salary": 140000
  },
  "job_history": [
    {
      "job_id": "job-abc123",
      "company_name": "StartupCo",
      "position": "iOS Developer",
      "start_date": "2025-11-01T10:00:00Z",
      "end_date": "2025-11-06T10:00:00Z",
      "salary": 90000
    }
  ],
  "stats": {
    "tasks_completed": 15,
    "interviews_passed": 2,
    "interviews_failed": 1,
    "jobs_held": 2
  },
  "cv_data": {
    "experience": [...],
    "skills": [...],
    "accomplishments": [...]
  }
}
```

**Player Status**:
- `graduated`: Fresh graduate, ready to job search
- `job_searching`: Browsing job listings
- `interviewing`: In an active interview
- `employed`: Currently employed and working

**Example**:
```bash
curl https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/sess-abc123/state
```

---

### Get CV Data

Retrieve player's CV/resume data.

**Endpoint**: `GET /sessions/{session_id}/cv`

**Response** (200 OK):
```json
{
  "experience": [
    {
      "company_name": "TechCorp",
      "position": "Senior iOS Engineer",
      "start_date": "2025-11-06T10:00:00Z",
      "end_date": null,
      "accomplishments": [
        "Implemented OAuth 2.0 authentication system",
        "Optimized app launch time by 40%",
        "Led migration to SwiftUI"
      ]
    },
    {
      "company_name": "StartupCo",
      "position": "iOS Developer",
      "start_date": "2025-11-01T10:00:00Z",
      "end_date": "2025-11-06T10:00:00Z",
      "accomplishments": [
        "Built core app features using UIKit",
        "Integrated REST API with Alamofire"
      ]
    }
  ],
  "skills": [
    "Swift",
    "SwiftUI",
    "UIKit",
    "OAuth 2.0",
    "REST APIs",
    "Performance Optimization",
    "Alamofire",
    "Combine"
  ],
  "accomplishments": [
    "Completed 15 work tasks",
    "Passed 2 interviews",
    "Held 2 positions"
  ]
}
```

**Example**:
```bash
curl https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/sess-abc123/cv
```

---

## Error Handling

All endpoints return standard HTTP status codes and error responses.

### Error Response Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `403 Forbidden`: Access denied (wrong user)
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Example Errors

**Session Not Found** (404):
```json
{
  "detail": "Session sess-abc123 not found"
}
```

**Access Denied** (403):
```json
{
  "detail": "You do not have access to this session"
}
```

**Invalid Request** (400):
```json
{
  "detail": "No active interview found. Please start an interview first."
}
```

---

## Rate Limits

Currently, no rate limits are enforced for demo purposes. In production, consider:

- 100 requests per minute per session
- 10 job generations per hour per session
- 5 interview attempts per hour per session

---

## Health Check

### Health Check Endpoint

Simple endpoint for monitoring service health.

**Endpoint**: `GET /health`

**Response** (200 OK):
```json
{
  "status": "healthy"
}
```

**Example**:
```bash
curl https://career-rl-backend-1086514937351.europe-west1.run.app/health
```

---

## Complete Flow Example

Here's a complete example of the job market flow:

```bash
# 1. Create session
SESSION_ID=$(curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions \
  -H "Content-Type: application/json" \
  -d '{"profession": "ios_engineer", "level": 1}' | jq -r '.session_id')

# 2. Generate job listings
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/$SESSION_ID/jobs/generate \
  -H "Content-Type: application/json" \
  -d '{"player_level": 1, "count": 10}'

# 3. Get job details
JOB_ID="job-abc123"  # From previous response
curl https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/$SESSION_ID/jobs/$JOB_ID

# 4. Start interview
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/$SESSION_ID/jobs/$JOB_ID/interview

# 5. Submit interview answers
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/$SESSION_ID/jobs/$JOB_ID/interview/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "q1": "Your answer here...",
      "q2": "Your answer here...",
      "q3": "Your answer here..."
    }
  }'

# 6. Accept job offer (if passed)
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/$SESSION_ID/jobs/$JOB_ID/accept

# 7. Get active tasks
curl https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/$SESSION_ID/tasks

# 8. Submit task solution
TASK_ID="task-abc123"  # From previous response
curl -X POST https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/$SESSION_ID/tasks/$TASK_ID/submit \
  -H "Content-Type: application/json" \
  -d '{
    "solution": "Your solution here..."
  }'

# 9. Check player state
curl https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/$SESSION_ID/state

# 10. View CV
curl https://career-rl-backend-1086514937351.europe-west1.run.app/sessions/$SESSION_ID/cv
```

---

## Support

For issues or questions:
- GitHub Issues: [Repository Issues](https://github.com/yourusername/careerrougelike/issues)
- Documentation: [README.md](./README.md)
- Backend Details: [backend/README.md](./backend/README.md)

---

**Last Updated**: November 6, 2025
