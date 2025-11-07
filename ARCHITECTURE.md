# CareerRoguelike Architecture

Complete system architecture documentation for the AI-powered job market simulator.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Multi-Agent System](#multi-agent-system)
4. [Data Flow](#data-flow)
5. [State Management](#state-management)
6. [Deployment Architecture](#deployment-architecture)
7. [Technology Stack](#technology-stack)

---

## System Overview

CareerRoguelike is a full-stack gamified career simulation that demonstrates advanced multi-agent AI collaboration. The system uses a Workflow Orchestrator to coordinate specialized AI agents powered by Gemini 2.5 Flash that work together to create a dynamic, realistic job market experience.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│                    (React + TypeScript + Vite)                   │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Graduation│  │   Job    │  │Interview │  │   Work   │        │
│  │  Screen  │→ │ Listings │→ │   Flow   │→ │Dashboard │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         React Query (API State Management)            │       │
│  └──────────────────────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS/REST
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      API Gateway Layer                           │
│                    (FastAPI + Python 3.9)                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              REST API Endpoints                       │       │
│  │  • Session Management                                 │       │
│  │  • Job Market Operations                              │       │
│  │  • Interview Workflows                                │       │
│  │  • Task Management                                    │       │
│  │  • Player State                                       │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         Authentication & Authorization                │       │
│  │         (Optional Firebase Auth)                      │       │
│  └──────────────────────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  Orchestration Layer                             │
│                  (Workflow Orchestrator)                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         Multi-Agent Workflow Coordinator              │       │
│  │  • generate_jobs()                                    │       │
│  │  • conduct_interview()                                │       │
│  │  • grade_interview()                                  │       │
│  │  • generate_task()                                    │       │
│  │  • grade_task()                                       │       │
│  │  • update_cv()                                        │       │
│  └──────────────────────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      Agent Layer                                 │
│              (Workflow Orchestrator + Gemini)                    │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Job    │  │Interview │  │   Task   │  │  Grader  │       │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │              │             │              │
│       └─────────────┴──────────────┴─────────────┘              │
│                         │                                        │
│                    ┌────▼─────┐      ┌──────────┐              │
│                    │    CV    │      │ Meeting  │              │
│                    │  Agent   │      │  Agent   │              │
│                    └──────────┘      └──────────┘              │
│                                                                   │
│  All agents invoked via Orchestrator → Gemini 2.5 Flash        │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Persistence Layer                             │
│                  (Google Cloud Firestore)                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Sessions   │  │     Jobs     │  │    Tasks     │         │
│  │  Collection  │  │  Collection  │  │  Collection  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                   │
│  • Player state persistence                                      │
│  • Job listings storage                                          │
│  • Task queue management                                         │
│  • CV data storage                                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Components

```
App.tsx (Root State Machine)
│
├── GraduationScreen.tsx
│   └── Displays welcome message and "Start Job Search" button
│
├── JobListingsView.tsx
│   ├── JobCard.tsx (x10)
│   │   └── Displays company, position, salary, requirements
│   └── Filter/Sort Controls
│
├── JobDetailView.tsx
│   └── Full job description with "Start Interview" button
│
├── InterviewView.tsx
│   ├── Question display with text areas
│   ├── Progress indicator
│   └── Submit button
│
├── InterviewResultView.tsx
│   ├── Pass/Fail animation
│   ├── Feedback display
│   └── Accept/Decline buttons
│
├── WorkDashboard.tsx
│   ├── StatsPanel.tsx
│   │   ├── Level badge
│   │   ├── XP progress bar
│   │   └── Career statistics
│   │
│   ├── TaskPanel.tsx
│   │   └── TaskCard.tsx (x3-5)
│   │       └── Task ticket with difficulty and XP
│   │
│   └── Navigation buttons
│
├── TaskDetailModal.tsx
│   ├── Task description
│   ├── Solution text area
│   └── Submit button
│
└── CVView.tsx
    ├── Personal info
    ├── Job history
    ├── Skills list
    └── Accomplishments
```

### Backend Components

```
gateway/main.py (FastAPI Application)
│
├── Session Management Endpoints
│   ├── POST /sessions
│   ├── GET /sessions/{id}
│   └── GET /sessions/{id}/state
│
├── Job Market Endpoints
│   ├── POST /sessions/{id}/jobs/generate
│   ├── GET /sessions/{id}/jobs/{job_id}
│   └── POST /sessions/{id}/jobs/refresh
│
├── Interview Endpoints
│   ├── POST /sessions/{id}/jobs/{job_id}/interview
│   ├── POST /sessions/{id}/jobs/{job_id}/interview/submit
│   └── POST /sessions/{id}/jobs/{job_id}/accept
│
└── Task Endpoints
    ├── GET /sessions/{id}/tasks
    └── POST /sessions/{id}/tasks/{task_id}/submit

agents/workflow_orchestrator.py
│
├── generate_jobs(session_id, player_level, count)
├── conduct_interview(session_id, job_title, company, requirements, level)
├── grade_interview(session_id, questions, answers)
├── generate_task(session_id, job_title, company, player_level, tasks_completed)
├── grade_task(session_id, task, solution, player_level, current_xp)
└── update_cv(session_id, current_cv, action, action_data)

agents/ (AI Agents - Invoked via Orchestrator)
│
├── workflow_orchestrator.py
│   └── Coordinates all agent execution via Gemini API
│
├── job_agent.py (Agent Definition)
│   └── Generates realistic job listings
│
├── interviewer_agent.py (Agent Definition)
│   └── Creates job-specific interview questions
│
├── task_agent.py (Agent Definition)
│   └── Generates profession-specific work tasks
│
├── grader_agent.py (Agent Definition)
│   └── Evaluates answers and provides feedback
│
├── cv_writer_agent.py (Agent Definition)
│   └── Updates resume based on accomplishments
│
└── meeting_agent.py (Agent Definition)
    └── Generates virtual meeting scenarios

shared/firestore_manager.py
│
├── Session CRUD operations
├── Job CRUD operations
├── Task CRUD operations
├── Player state management
├── XP and level calculations
└── CV data management
```

---

## Multi-Agent System

### Agent Roles and Responsibilities

#### 1. Job Agent
**Purpose**: Generate realistic job listings

**Input**:
- Player level (1-10)
- Number of jobs to generate
- Industry preferences (optional)

**Output**:
```json
{
  "company_name": "TechCorp",
  "position": "Senior iOS Engineer",
  "level": "mid",
  "salary_range": {"min": 100000, "max": 140000},
  "requirements": [...],
  "responsibilities": [...],
  "benefits": [...]
}
```

**AI Model**: Gemini 2.5 Flash

---

#### 2. Interview Agent
**Purpose**: Create job-specific interview questions

**Input**:
- Job title
- Company name
- Job requirements
- Position level

**Output**:
```json
{
  "questions": [
    {
      "id": "q1",
      "question": "Explain weak vs strong references in Swift",
      "expected_answer": "Key points for grading..."
    }
  ]
}
```

**AI Model**: Gemini 2.5 Flash

---

#### 3. Task Agent
**Purpose**: Generate profession-specific work assignments

**Input**:
- Job title
- Company name
- Player level
- Tasks completed count

**Output**:
```json
{
  "title": "Implement User Authentication",
  "description": "Add OAuth 2.0 authentication...",
  "requirements": [...],
  "acceptance_criteria": [...],
  "difficulty": 5,
  "xp_reward": 50
}
```

**AI Model**: Gemini 2.5 Flash

---

#### 4. Grader Agent
**Purpose**: Evaluate answers and task submissions

**Input**:
- Question/Task prompt
- Expected answer/criteria
- Player's submission

**Output**:
```json
{
  "score": 85,
  "passed": true,
  "feedback": "Excellent explanation..."
}
```

**AI Model**: Gemini 2.5 Flash

---

#### 5. CV Agent
**Purpose**: Update resume based on accomplishments

**Input**:
- Current CV data
- Action (add_job, update_accomplishments, add_skills)
- Action data

**Output**:
```json
{
  "experience": [...],
  "skills": [...],
  "accomplishments": [...]
}
```

**AI Model**: Gemini 2.5 Flash

---

### Agent Communication Pattern

```
┌─────────────────────────────────────────────────────────┐
│                  Workflow Orchestrator                   │
│            (workflow_orchestrator.py)                    │
│                                                           │
│  Coordinates agent execution and manages state flow      │
│  • Prepares context from session state                   │
│  • Formats prompts with agent-specific instructions      │
│  • Calls Gemini API directly                             │
│  • Parses and validates responses                        │
│  • Returns structured output                             │
└───────┬─────────────────────────────────────────────────┘
        │
        │ 1. Prepare context (job info, player level, etc)
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│                  Gemini 2.5 Flash API                      │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  1. Receive formatted prompt with context        │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                    │
│                       ▼                                    │
│  ┌──────────────────────────────────────────────────┐    │
│  │  2. Generate response based on agent role        │    │
│  │     (Job listings, questions, grading, etc.)     │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                    │
│                       ▼                                    │
│  ┌──────────────────────────────────────────────────┐    │
│  │  3. Return JSON-formatted response                │    │
│  └──────────────────────────────────────────────────┘    │
└───────────────────────┬───────────────────────────────────┘
                        │
                        │ 4. Parse and validate JSON
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│                  Workflow Orchestrator                     │
│                                                            │
│  • Validates response structure                           │
│  • Handles errors with fallbacks                          │
│  • Returns structured data to Gateway                     │
└───────────────────────┬───────────────────────────────────┘
                        │
                        │ 5. Update session state
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│                    Firestore Database                      │
│                                                            │
│  Persist updated state for durability                     │
└────────────────────────────────────────────────────────────┘
```

**Key Points**:
- **No ADK Runner**: Orchestrator calls Gemini API directly for reliability
- **Agent Definitions**: Agent files define prompts and instructions
- **Centralized Control**: Orchestrator manages all agent invocations
- **Error Handling**: Built-in fallbacks for AI failures
- **State Management**: All state flows through Firestore

---

## Data Flow

### Complete Job Market Flow

```
1. GRADUATION
   Frontend: Display GraduationScreen
   User: Click "Start Job Search"
   Frontend: Transition to JobListingsView
   
2. JOB GENERATION
   Frontend: POST /sessions/{id}/jobs/generate
   Backend: workflow_orchestrator.generate_jobs()
   Agent: Job Agent generates 10 listings
   Firestore: Save jobs to jobs collection
   Frontend: Display JobCard components
   
3. JOB SELECTION
   User: Click "View Details" on JobCard
   Frontend: GET /sessions/{id}/jobs/{job_id}
   Backend: Retrieve job from Firestore
   Frontend: Display JobDetailView
   
4. INTERVIEW START
   User: Click "Start Interview"
   Frontend: POST /sessions/{id}/jobs/{job_id}/interview
   Backend: workflow_orchestrator.conduct_interview()
   Agent: Interview Agent generates 3-5 questions
   Firestore: Store questions in session state
   Frontend: Display InterviewView with questions
   
5. INTERVIEW SUBMISSION
   User: Fill answers and click "Submit"
   Frontend: POST /sessions/{id}/jobs/{job_id}/interview/submit
   Backend: workflow_orchestrator.grade_interview()
   Agent: Grader Agent evaluates each answer
   Backend: Calculate overall score and pass/fail
   Firestore: Update stats (interviews_passed/failed)
   Frontend: Display InterviewResultView
   
6. JOB ACCEPTANCE (if passed)
   User: Click "Accept Offer"
   Frontend: POST /sessions/{id}/jobs/{job_id}/accept
   Backend: workflow_orchestrator.update_cv()
   Agent: CV Agent adds job to resume
   Backend: workflow_orchestrator.generate_task() x3
   Agent: Task Agent creates 3 initial tasks
   Firestore: Update player state, save tasks
   Frontend: Transition to WorkDashboard
   
7. TASK COMPLETION
   User: Click task, enter solution, submit
   Frontend: POST /sessions/{id}/tasks/{task_id}/submit
   Backend: workflow_orchestrator.grade_task()
   Agent: Grader Agent evaluates solution
   Backend: Award XP, check level up
   Firestore: Update XP, level, task status
   Backend: workflow_orchestrator.generate_task() (if needed)
   Backend: workflow_orchestrator.update_cv()
   Agent: CV Agent adds accomplishment
   Frontend: Show XP gained, level up animation
   
8. JOB SWITCHING (while employed)
   User: Click "Job Search" from WorkDashboard
   Frontend: Navigate to JobListingsView
   [Repeat steps 2-6]
   Backend: End date previous job, start new job
   Backend: Clear old tasks, generate new tasks
   Frontend: Return to WorkDashboard with new job
```

---

## State Management

### Session State Structure

```json
{
  "session_id": "sess-abc123def456",
  "user_id": "user-xyz789",
  "profession": "ios_engineer",
  "level": 4,
  "xp": 500,
  "xp_to_next_level": 800,
  "status": "employed",
  
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
  
  "cv_data": {
    "experience": [...],
    "skills": [...],
    "accomplishments": [...]
  },
  
  "stats": {
    "tasks_completed": 15,
    "interviews_passed": 2,
    "interviews_failed": 1,
    "jobs_held": 2
  },
  
  "interview_questions": [...],
  "interview_job_id": "job-xyz789",
  
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-06T12:00:00Z"
}
```

### XP and Leveling System

```python
def calculate_xp_to_next_level(current_level, current_xp):
    """
    Exponential XP curve for career progression
    
    Level 1→2: 200 XP
    Level 2→3: 400 XP
    Level 3→4: 600 XP
    Level 4→5: 800 XP
    ...
    Level 9→10: 1800 XP
    """
    base_xp = 200
    xp_per_level = current_level * base_xp
    return xp_per_level

def add_xp(session_id, xp_gained):
    """
    Add XP and check for level up
    
    Returns:
        {
            "new_xp": 500,
            "new_level": 4,
            "leveled_up": True,
            "xp_to_next_level": 800
        }
    """
    # Implementation in firestore_manager.py
```

### Task Difficulty and XP Rewards

| Difficulty | XP Reward | Description |
|------------|-----------|-------------|
| 1-2 | 10-20 | Simple tasks (bug fixes, minor features) |
| 3-4 | 30-40 | Moderate tasks (feature implementation) |
| 5-6 | 50-60 | Complex tasks (architecture, optimization) |
| 7-8 | 70-80 | Advanced tasks (system design, leadership) |
| 9-10 | 90-100 | Expert tasks (major initiatives, innovation) |

---

## Deployment Architecture

### Cloud Run Services

```
┌─────────────────────────────────────────────────────────┐
│                    Google Cloud Run                      │
│                   (europe-west1)                         │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │         Frontend Service                        │     │
│  │  career-rl-frontend-1086514937351              │     │
│  │                                                 │     │
│  │  • Docker: nginx + React build                 │     │
│  │  • Min Instances: 0 (scale to zero)            │     │
│  │  • Max Instances: 10                           │     │
│  │  • Memory: 512Mi                               │     │
│  │  • CPU: 1                                      │     │
│  │  • Port: 8080                                  │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │         Backend Service                         │     │
│  │  career-rl-backend-1086514937351               │     │
│  │                                                 │     │
│  │  • Docker: Python 3.9 + FastAPI                │     │
│  │  • Min Instances: 0 (scale to zero)            │     │
│  │  • Max Instances: 10                           │     │
│  │  • Memory: 1Gi                                 │     │
│  │  • CPU: 2                                      │     │
│  │  • Timeout: 300s                               │     │
│  │  • Port: 8080                                  │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Google Cloud Firestore                      │
│                (Native Mode)                             │
│                                                           │
│  Collections:                                            │
│  • sessions                                              │
│  • jobs                                                  │
│  • tasks                                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           Google Gemini 2.5 Flash API                    │
│                                                           │
│  Used by all AI agents for content generation           │
└─────────────────────────────────────────────────────────┘
```

### Container Images

**Frontend Dockerfile**:
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

**Backend Dockerfile**:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY agents/ ./agents/
COPY gateway/ ./gateway/
COPY shared/ ./shared/
COPY tools/ ./tools/
EXPOSE 8080
CMD ["uvicorn", "gateway.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Auto-Scaling Behavior

```
Requests/sec    Instances    Behavior
─────────────────────────────────────────────────────
0               0            Scale to zero (cost $0)
1-10            1            Single instance handles load
11-50           2-3          Scale up gradually
51-100          4-6          Continue scaling
100+            7-10         Max capacity reached
```

**Cold Start**: 3-5 seconds (first request after idle)
**Warm Request**: <1 second (subsequent requests)

---

## Technology Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript 5
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3
- **Animations**: Framer Motion
- **State Management**: React Query (TanStack Query)
- **HTTP Client**: Fetch API
- **Server**: nginx (Alpine)

### Backend
- **Framework**: FastAPI 0.104+
- **Language**: Python 3.9+
- **AI Framework**: Google ADK (Agent Development Kit)
- **LLM**: Gemini 2.5 Flash
- **Database**: Google Cloud Firestore
- **Server**: Uvicorn (ASGI)
- **Authentication**: Firebase Admin SDK (optional)

### Infrastructure
- **Cloud Platform**: Google Cloud Platform
- **Compute**: Cloud Run (Serverless)
- **Database**: Firestore (NoSQL)
- **Container Registry**: Artifact Registry
- **Region**: europe-west1
- **CI/CD**: Cloud Build (optional)

### Development Tools
- **Version Control**: Git
- **Package Manager**: npm (frontend), pip (backend)
- **Containerization**: Docker
- **API Testing**: curl, Postman
- **Agent Testing**: ADK CLI, ADK Web UI

---

## Performance Characteristics

### Response Times

| Operation | Average Time | Notes |
|-----------|--------------|-------|
| Job Generation | 2-3s | Generates 10 jobs via Gemini |
| Interview Questions | 1.5-2s | Generates 3-5 questions |
| Answer Grading | 1-2s per answer | Parallel grading possible |
| Task Generation | 2-2.5s | Single task generation |
| Task Grading | 1.5-2s | Includes XP calculation |
| CV Update | 1-1.5s | Resume formatting |
| State Retrieval | <100ms | Firestore read |

### Scalability

- **Concurrent Sessions**: 100+ (tested)
- **Requests/Second**: 50+ per instance
- **Max Instances**: 10 (configurable)
- **Database**: Firestore scales automatically
- **Cost**: Pay only for actual usage (scale to zero)

---

## Security Considerations

### Current Implementation
- CORS configured for specific origins
- Optional Firebase authentication
- Session isolation by session_id
- No sensitive data in logs

### Production Recommendations
- Enable Firebase Auth for all endpoints
- Add rate limiting (100 req/min per session)
- Use Secret Manager for API keys
- Implement Firestore security rules
- Add request validation middleware
- Enable Cloud Armor for DDoS protection
- Use HTTPS only (enforced by Cloud Run)

---

## Monitoring and Observability

### Cloud Run Metrics
- Request count
- Request latency (p50, p95, p99)
- Error rate
- Instance count
- CPU utilization
- Memory utilization

### Application Logs
- Agent invocations
- API requests
- Error traces
- Performance metrics

### Firestore Metrics
- Read/write operations
- Document count
- Storage size
- Index usage

---

## Future Enhancements

### Microservices Architecture
Split into specialized services:
- Job Service (job generation and management)
- Interview Service (interview and grading)
- Task Service (task generation and grading)
- CV Service (resume management)
- State Service (player state management)

### Advanced Features
- Real-time notifications (Pub/Sub)
- Streaming responses (Server-Sent Events)
- Caching layer (Redis/Memorystore)
- Analytics dashboard (BigQuery)
- A/B testing framework
- Multi-language support

### Performance Optimizations
- Pre-generate job pools
- Cache interview questions
- Batch agent operations
- Optimize Firestore queries
- Implement CDN for frontend

---

**Last Updated**: November 6, 2025
