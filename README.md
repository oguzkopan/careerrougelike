<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CareerRoguelike – AI-Powered Job Market Simulator

A gamified career simulation powered by Google's Agent Development Kit (ADK) and deployed on Google Cloud Run. Experience a dynamic job market where AI agents generate realistic job listings, conduct interviews, create work tasks, and manage your career progression in real-time.

**Built for the Google Cloud Run Hackathon**

## 🎮 Try It Out

**Live Demo**: https://career-rl-frontend-1086514937351.europe-west1.run.app

Start as a fresh graduate, browse AI-generated job listings, ace interviews, complete work tasks, gain experience, and climb the career ladder—all powered by intelligent multi-agent collaboration.

## 🏗️ Architecture

This application demonstrates advanced multi-agent AI collaboration with a complete job market simulation:

- **Frontend**: React + TypeScript with Vite, served by nginx on Cloud Run
- **Backend**: Python FastAPI + Google ADK multi-agent orchestration on Cloud Run
- **Database**: Google Cloud Firestore for persistent game state
- **AI**: Gemini 2.5 Flash for all agent reasoning and content generation

### Deployed Services

- **Frontend URL**: https://career-rl-frontend-1086514937351.europe-west1.run.app
- **Backend URL**: https://career-rl-backend-1086514937351.europe-west1.run.app
- **Project**: careerrogue-4df28
- **Region**: europe-west1

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│  Graduation → Job Search → Interview → Work → Career Growth │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API (HTTPS)
┌────────────────────▼────────────────────────────────────────┐
│                   FastAPI Gateway                            │
│              (Session & State Management)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Workflow Orchestrator                           │
│         (Coordinates Multi-Agent Workflows)                  │
└─────┬──────┬──────┬──────┬──────┬──────────────────────────┘
      │      │      │      │      │
   ┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐
   │ Job ││Inter││Task ││Grade││ CV  │  ← AI Agents
   │Agent││Agent││Agent││Agent││Agent│  (Gemini 2.5 Flash)
   └──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘
      └──────┴──────┴──────┴──────┘
                     │
              ┌──────▼──────┐
              │  Firestore  │  ← Persistent State
              └─────────────┘
```

### 🤖 Multi-Agent Architecture

#### Agent Communication Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (React Frontend)                       │
│  User Actions: Browse Jobs, Answer Interviews, Submit Tasks          │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             │ HTTP REST API
                             │
┌────────────────────────────▼─────────────────────────────────────────┐
│                    GATEWAY (FastAPI main.py)                          │
│                                                                        │
│  Endpoints:                                                           │
│  • POST /sessions/{id}/jobs/generate                                 │
│  • POST /sessions/{id}/jobs/{job_id}/interview                       │
│  • POST /sessions/{id}/jobs/{job_id}/interview/submit                │
│  • POST /sessions/{id}/tasks/{task_id}/submit                        │
│  • POST /sessions/{id}/meetings/generate                             │
│                                                                        │
│  Responsibilities:                                                    │
│  • Request validation & authentication                                │
│  • Session management                                                 │
│  • Route to Workflow Orchestrator                                    │
│  • Response formatting                                                │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             │ Direct Function Calls
                             │
┌────────────────────────────▼─────────────────────────────────────────┐
│              ORCHESTRATOR (workflow_orchestrator.py)                  │
│                                                                        │
│  Methods:                                                             │
│  • generate_jobs(session_id, player_level, count, profession)        │
│  • conduct_interview(session_id, job_title, company, requirements)   │
│  • grade_interview(session_id, questions, answers)                   │
│  • generate_task(session_id, job_title, company, player_level)       │
│  • grade_task(session_id, task, solution, player_level, xp)          │
│  • update_cv(session_id, current_cv, action, action_data)            │
│  • generate_meeting(session_id, meeting_type, job_title, ...)        │
│                                                                        │
│  Responsibilities:                                                    │
│  • Coordinate agent execution                                         │
│  • Format prompts with context                                        │
│  • Parse and validate AI responses                                    │
│  • Handle errors and fallbacks                                        │
└─────┬──────┬──────┬──────┬──────┬──────┬─────────────────────────────┘
      │      │      │      │      │      │
      │      │      │      │      │      │ Gemini API Calls
      │      │      │      │      │      │
   ┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐┌──▼──┐
   │ Job ││Inter││Task ││Grade││ CV  ││Meet │  AI AGENTS
   │Agent││Agent││Agent││Agent││Agent││Agent│  (Gemini 2.5 Flash)
   └──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘
      │      │      │      │      │      │
      │      │      │      │      │      │ Generated Content
      │      │      │      │      │      │
      └──────┴──────┴──────┴──────┴──────┘
                     │
                     │ State Updates
                     │
┌────────────────────▼─────────────────────────────────────────────────┐
│                    FIRESTORE (Database)                               │
│                                                                        │
│  Collections:                                                         │
│  • sessions/     - Player state, level, XP, current job              │
│  • jobs/         - Generated job listings                             │
│  • tasks/        - Work assignments                                   │
│  • meetings/     - Virtual meeting scenarios                          │
│                                                                        │
│  Operations:                                                          │
│  • Read: Get session state, retrieve jobs/tasks                      │
│  • Write: Update XP, save new jobs, mark tasks complete              │
│  • Query: Get active tasks, filter jobs by session                   │
└───────────────────────────────────────────────────────────────────────┘
```

#### Agent Roles & Communication

**1. Job Agent** (`job_agent.py`)
```
Purpose: Generate realistic job listings
Input:   Player level, profession, count
Process: → Gemini API with profession-specific prompt
         → Parse JSON response
         → Validate required fields
Output:  Array of job objects
Storage: → Firestore jobs/ collection
```

**2. Interview Agent** (`interviewer_agent.py` via Orchestrator)
```
Purpose: Create job-specific interview questions
Input:   Job title, company, requirements, level
Process: → Gemini API with interview prompt
         → Extract 3-5 questions with expected answers
         → Validate question format
Output:  Array of question objects
Storage: → Session state (interview_questions field)
```

**3. Task Agent** (`task_agent.py` via Orchestrator)
```
Purpose: Generate profession-specific work tasks
Input:   Job title, company, player level, tasks completed
Process: → Gemini API with task generation prompt
         → Support multiple formats (text, multiple choice, etc.)
         → Include difficulty and XP reward
Output:  Task object with requirements and criteria
Storage: → Firestore tasks/ collection
```

**4. Grader Agent** (`grader_agent.py` via Orchestrator)
```
Purpose: Evaluate answers and task submissions
Input:   Question/task, expected answer, player submission
Process: → Pre-validation (length, relevance checks)
         → Gemini API for AI grading
         → Score calculation (0-100)
         → Pass/fail determination (≥70 = pass)
Output:  Score, passed boolean, detailed feedback
Storage: → Update task status in Firestore
         → Update session stats
```

**5. CV Agent** (`cv_writer_agent.py` via Orchestrator)
```
Purpose: Update resume based on accomplishments
Input:   Current CV, action type, action data
Process: → Add job experience
         → Extract skills from tasks
         → Generate professional bullets
Output:  Updated CV object
Storage: → Session cv_data field in Firestore
```

**6. Meeting Agent** (`meeting_agent.py` via Orchestrator)
```
Purpose: Generate virtual meeting scenarios
Input:   Meeting type, job title, player level, performance
Process: → Gemini API with meeting scenario prompt
         → Create participants with personalities
         → Generate discussion topics
Output:  Meeting object with participants and topics
Storage: → Firestore meetings/ collection
```

### 🔄 Complete Workflow Examples

#### Job Application Workflow

```
1. CLIENT → GATEWAY
   POST /sessions/{id}/jobs/generate
   Body: { player_level: 3, count: 10 }

2. GATEWAY → ORCHESTRATOR
   workflow_orchestrator.generate_jobs(session_id, 3, 10, "ios_engineer")

3. ORCHESTRATOR → JOB AGENT
   Prompt: "Generate 10 iOS Engineer jobs for level 3..."
   
4. JOB AGENT → GEMINI API
   Request: Gemini 2.5 Flash with structured prompt
   
5. GEMINI API → JOB AGENT
   Response: JSON array of 10 job listings
   
6. JOB AGENT → ORCHESTRATOR
   Parsed and validated job objects
   
7. ORCHESTRATOR → FIRESTORE
   Save each job to jobs/ collection
   
8. ORCHESTRATOR → GATEWAY
   Return job listings array
   
9. GATEWAY → CLIENT
   HTTP 200 with jobs JSON
```

#### Interview Workflow

```
1. CLIENT → GATEWAY
   POST /sessions/{id}/jobs/{job_id}/interview

2. GATEWAY → FIRESTORE
   Retrieve job details
   
3. GATEWAY → ORCHESTRATOR
   conduct_interview(session_id, job_title, company, requirements, level)

4. ORCHESTRATOR → INTERVIEW AGENT (via Gemini)
   Generate 3-5 questions for this specific job
   
5. ORCHESTRATOR → FIRESTORE
   Store questions in session.interview_questions
   
6. ORCHESTRATOR → GATEWAY → CLIENT
   Return questions array

--- Player answers questions ---

7. CLIENT → GATEWAY
   POST /sessions/{id}/jobs/{job_id}/interview/submit
   Body: { answers: { "q1": "answer1", "q2": "answer2", ... } }

8. GATEWAY → FIRESTORE
   Retrieve stored questions
   
9. GATEWAY → ORCHESTRATOR
   grade_interview(session_id, questions, answers)

10. ORCHESTRATOR → GRADER AGENT (via Gemini)
    For each question:
    - Pre-validate answer (length, relevance)
    - AI grade with Gemini
    - Calculate score
    
11. ORCHESTRATOR → FIRESTORE
    Update session stats (interviews_passed/failed)
    
12. ORCHESTRATOR → GATEWAY → CLIENT
    Return { passed: true, overall_score: 85, feedback: [...] }
```

#### Task Completion Workflow

```
1. CLIENT → GATEWAY
   POST /sessions/{id}/tasks/{task_id}/submit
   Body: { solution: "player's answer" }

2. GATEWAY → FIRESTORE
   Retrieve task details and session state
   
3. GATEWAY → ORCHESTRATOR
   grade_task(session_id, task, solution, player_level, current_xp)

4. ORCHESTRATOR → GRADER AGENT (via Gemini)
   Evaluate solution against requirements
   
5. GRADER AGENT → ORCHESTRATOR
   Return { score: 85, passed: true, feedback: "..." }

6. ORCHESTRATOR → FIRESTORE
   - Update task status to "completed"
   - Add XP to player (firestore_manager.add_xp)
   - Check for level up
   - Update stats.tasks_completed
   
7. ORCHESTRATOR → CV AGENT (if passed)
   update_cv(session_id, current_cv, "add_accomplishment", task_data)
   
8. ORCHESTRATOR → TASK AGENT (if needed)
   Generate new task to maintain 3-5 active tasks
   
9. ORCHESTRATOR → GATEWAY → CLIENT
   Return {
     score: 85,
     passed: true,
     xp_gained: 50,
     new_xp: 550,
     level_up: true,
     new_level: 4,
     new_task: {...}
   }
```

### 🗄️ Firestore Data Model

```
sessions/
  {session_id}/
    - session_id: string
    - user_id: string (optional)
    - profession: string
    - level: number (1-10)
    - xp: number
    - xp_to_next_level: number
    - status: "graduated" | "employed"
    - current_job: object | null
    - job_history: array
    - cv_data: object
    - stats: object
    - interview_questions: array (temporary)
    - interview_job_id: string (temporary)
    - created_at: timestamp
    - updated_at: timestamp

jobs/
  {job_id}/
    - job_id: string
    - session_id: string
    - company_name: string
    - position: string
    - location: string
    - job_type: "remote" | "hybrid" | "onsite"
    - salary_range: { min: number, max: number }
    - level: "entry" | "mid" | "senior"
    - requirements: array
    - responsibilities: array
    - benefits: array
    - description: string
    - status: "active" | "expired" | "applied"
    - created_at: timestamp

tasks/
  {task_id}/
    - task_id: string
    - session_id: string
    - title: string
    - description: string
    - format_type: "text_answer" | "multiple_choice" | ...
    - requirements: array
    - acceptance_criteria: array
    - difficulty: number (1-10)
    - xp_reward: number
    - status: "pending" | "in-progress" | "completed"
    - solution: string (when submitted)
    - score: number (when graded)
    - feedback: string (when graded)
    - created_at: timestamp
    - updated_at: timestamp

meetings/
  {meeting_id}/
    - meeting_id: string
    - session_id: string
    - meeting_type: string
    - title: string
    - context: string
    - participants: array
    - topics: array
    - status: "active" | "completed"
    - created_at: timestamp
```

### 🔐 Agent Communication Security

**Client ↔ Gateway**
- HTTPS only (enforced by Cloud Run)
- CORS configured for specific origins
- Optional Firebase authentication
- Session ID validation

**Gateway ↔ Orchestrator**
- Direct Python function calls (same process)
- No network communication
- Shared memory space

**Orchestrator ↔ Agents**
- Direct Gemini API calls via SDK
- API key authentication
- Rate limiting handled by Google
- Retry logic for transient failures

**Orchestrator ↔ Firestore**
- Google Cloud SDK authentication
- Service account credentials
- Automatic connection pooling
- Transaction support for critical updates

## 📚 Documentation

> **📑 [Documentation Index](DOCUMENTATION-INDEX.md)** - Complete guide to all documentation

### Getting Started
- [Quick Reference](QUICK-REFERENCE.md) - Common commands and quick fixes
- [API Documentation](API-DOCUMENTATION.md) - Complete REST API reference with examples
- [Architecture Guide](ARCHITECTURE.md) - Detailed system architecture and design patterns

### Development
- [Backend README](backend/README.md) - Detailed ADK architecture and agent workflows
- [Agent Diagrams](backend/diagrams/) - Visual workflow and state flow diagrams
- [Testing Guide](backend/diagrams/testing-guide.md) - How to test the system

### Deployment
- [Deployment Summary](DEPLOYMENT_SUMMARY.md) - Current deployment status
- [Backend Deployment](backend/README.md#cloud-run-deployment) - Backend deployment guide
- [Frontend Deployment](deploy-frontend.sh) - Frontend deployment script

### Hackathon
- [Hackathon Submission](backend/HACKATHON-SUBMISSION.md) - Official submission document
- [Demo Video Script](DEMO-VIDEO-SCRIPT.md) - Video recording guide and script

---

## 🔄 Agent Interaction Patterns

### Pattern 1: Sequential Agent Execution (Interview Flow)

```
Client Request
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Gateway: POST /interview                                │
│  • Validate session                                      │
│  • Extract job details from Firestore                   │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Orchestrator: conduct_interview()                       │
│  • Prepare context (job title, requirements, level)     │
│  • Format prompt for Interview Agent                    │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Interview Agent (Gemini 2.5 Flash)                     │
│  • Generate 3-5 job-specific questions                  │
│  • Include expected answer key points                   │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Orchestrator: Parse & Validate                         │
│  • Extract JSON from response                           │
│  • Validate question format                             │
│  • Add unique IDs                                        │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Firestore: Store Questions                             │
│  • Save to session.interview_questions                  │
│  • Store job_id for validation                          │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Gateway: Return Response                               │
│  • Format questions array                               │
│  • Send to client                                        │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
      Client Displays Questions

--- Player Answers ---

Client Submits Answers
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Gateway: POST /interview/submit                        │
│  • Retrieve stored questions                            │
│  • Validate answers match questions                     │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Orchestrator: grade_interview()                        │
│  • Pre-validate each answer (length, relevance)         │
│  • Prepare grading prompts                              │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Grader Agent (Gemini 2.5 Flash) - FOR EACH QUESTION   │
│  • Compare answer to expected key points                │
│  • Check for technical accuracy                         │
│  • Evaluate completeness                                │
│  • Generate score (0-100) and feedback                  │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Orchestrator: Calculate Results                        │
│  • Average scores across questions                      │
│  • Determine pass/fail (≥70 = pass)                     │
│  • Compile feedback array                               │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Firestore: Update Stats                                │
│  • Increment interviews_passed or interviews_failed     │
│  • Update job status to "applied"                       │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
      Client Shows Results
```

### Pattern 2: Task Generation → Grading → CV Update Chain

```
Client: Submit Task Solution
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Gateway: POST /tasks/{task_id}/submit                  │
│  • Retrieve task from Firestore                         │
│  • Get session state (level, XP)                        │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Orchestrator: grade_task()                             │
│  • Check task format (text, multiple choice, etc.)      │
│  • Prepare grading context                              │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Grader Agent (Gemini 2.5 Flash)                        │
│  • Evaluate against requirements                        │
│  • Check acceptance criteria                            │
│  • Generate score and feedback                          │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Orchestrator: Process Results                          │
│  • If passed: award XP                                  │
│  • Check for level up                                   │
│  • Trigger CV update                                    │
│  • Generate new task if needed                          │
└────────────┬────────────────────────────────────────────┘
             │
             ├─────────────────────────────────────────────┐
             │                                             │
             ▼                                             ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│  Firestore: Update Task      │    │  CV Agent (Gemini 2.5 Flash) │
│  • Mark as completed         │    │  • Add accomplishment bullet │
│  • Store solution & score    │    │  • Extract demonstrated skills│
└──────────────────────────────┘    └────────────┬─────────────────┘
             │                                    │
             │                                    ▼
             │                       ┌──────────────────────────────┐
             │                       │  Firestore: Update CV        │
             │                       │  • Save new bullets          │
             │                       │  • Update skills list        │
             │                       └──────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Firestore: Update Player State                         │
│  • Add XP (firestore_manager.add_xp)                    │
│  • Update level if leveled up                           │
│  • Increment tasks_completed stat                       │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Orchestrator: Check Task Queue                         │
│  • If < 3 active tasks, generate new one                │
└────────────┬────────────────────────────────────────────┘
             │
             ▼ (if needed)
┌─────────────────────────────────────────────────────────┐
│  Task Agent (Gemini 2.5 Flash)                          │
│  • Generate new task for current job                    │
│  • Scale difficulty to player level                     │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Firestore: Save New Task                               │
│  • Add to tasks/ collection                             │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
      Return Complete Results to Client
      (score, XP, level up, new task)
```

### Pattern 3: Parallel Job Generation (Batch Processing)

```
Client: Request Job Listings
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  Gateway: POST /jobs/generate                           │
│  • Validate session                                      │
│  • Get player level and profession                      │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Orchestrator: generate_jobs()                          │
│  • Determine level tier (entry/mid/senior)              │
│  • Calculate salary range                               │
│  • Prepare profession-specific prompt                   │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Job Agent (Gemini 2.5 Flash)                           │
│  • Generate 10 diverse job listings                     │
│  • Include company, position, requirements, etc.        │
│  • Ensure profession match                              │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Orchestrator: Parse & Validate                         │
│  • Extract JSON array                                   │
│  • Validate required fields                             │
│  • Add unique IDs                                        │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Firestore: Batch Save (Parallel)                       │
│  • Save all 10 jobs concurrently                        │
│  • Link to session_id                                   │
│  • Set status to "active"                               │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
      Return Job Listings to Client
```

### Communication Protocols

**Client ↔ Gateway (REST API)**
```
Protocol: HTTPS
Format: JSON
Authentication: Optional (Firebase Auth)
Rate Limiting: Handled by Cloud Run
Timeout: 300 seconds
```

**Gateway ↔ Orchestrator (In-Process)**
```
Protocol: Direct Python function calls
Format: Python objects
Latency: < 1ms
Error Handling: Try-catch blocks
```

**Orchestrator ↔ Gemini API (HTTP)**
```
Protocol: HTTPS
Format: JSON
Authentication: API Key / Service Account
Model: gemini-2.0-flash-exp
Timeout: 60 seconds
Retry: 3 attempts with exponential backoff
```

**Orchestrator ↔ Firestore (gRPC)**
```
Protocol: gRPC over HTTPS
Format: Protocol Buffers
Authentication: Service Account
Connection: Pooled
Transactions: Supported for critical updates
```

## 🎮 How It Works

### Complete Career Journey

1. **🎓 Graduation**: Start as a fresh graduate ready to enter the job market
2. **💼 Job Search**: Browse 10 AI-generated job listings tailored to your level
3. **📋 Job Details**: View complete job descriptions, requirements, and benefits
4. **🎤 Interview**: Answer 3-5 job-specific questions generated by AI
5. **✅ Evaluation**: Receive detailed feedback and pass/fail results
6. **🎉 Job Offer**: Accept the position and start working
7. **📝 Work Tasks**: Complete profession-specific assignments to gain XP
8. **👥 Meetings**: Participate in virtual meetings with AI colleagues
9. **📈 Level Up**: Progress from Level 1 (Junior) to Level 10 (Expert)
10. **🔄 Job Switch**: Search for better opportunities as you advance
11. **📄 CV Growth**: Your resume automatically updates with accomplishments

### Work & Meeting System

**When you accept a job**, you receive a mix of work tasks and meetings:

**Entry Level Jobs** (Level 1-3):
- 2-3 work tasks (bug fixes, simple features, basic analysis)
- 1 meeting (onboarding, team introduction)

**Mid Level Jobs** (Level 4-7):
- 3-4 work tasks (feature implementation, complex analysis, design systems)
- 1-2 meetings (project updates, team standups, 1-on-1s)

**Senior Level Jobs** (Level 8-10):
- 4-5 work tasks (architecture, strategy, leadership, major initiatives)
- 2-3 meetings (stakeholder presentations, executive reviews, strategic planning)

**Meeting Features**:
- Interactive discussions with AI colleagues
- Multiple participants with unique personalities
- Discussion topics relevant to your role
- Performance scoring (0-100)
- Meeting notes and key takeaways
- Action items that become new tasks
- XP rewards for participation

### 🎯 Task and Meeting Generation

When you accept a job, the system dynamically generates work tasks and meetings based on the job level:

| Job Level | Work Tasks | Meetings | Meeting Types |
|-----------|------------|----------|---------------|
| **Entry** | 2-3 tasks | 1 meeting | One-on-one, Team Meeting |
| **Mid** | 3-4 tasks | 1-2 meetings | One-on-one, Team Meeting, Project Update |
| **Senior** | 4-5 tasks | 2-3 meetings | One-on-one, Team Meeting, Project Update, Stakeholder Presentation |

**Task Types**:
- **Work Tasks**: Regular assignments (coding, analysis, design, sales activities)
- **Meeting Tasks**: Interactive meetings with AI colleagues that generate action items

**Meeting Flow**:
1. Meeting appears in task list with 👥 icon
2. Click to start meeting
3. Participate in discussion topics
4. AI colleagues respond to your contributions
5. Meeting completes with notes and action items
6. Action items become new tasks automatically

---

### 🎯 What Each Agent Generates

#### Job Agent
**Generates**: Realistic job listings with complete details

**Example Output**:
```json
{
  "company_name": "TechCorp Inc",
  "position": "Senior iOS Engineer",
  "location": "San Francisco, CA",
  "job_type": "hybrid",
  "salary_range": { "min": 100000, "max": 140000 },
  "level": "mid",
  "requirements": [
    "5+ years iOS development",
    "Expert in Swift and SwiftUI",
    "Experience with Combine framework",
    "Strong understanding of iOS SDK"
  ],
  "responsibilities": [
    "Design and implement new iOS features",
    "Optimize app performance and memory usage",
    "Mentor junior developers",
    "Collaborate with design and backend teams"
  ],
  "benefits": [
    "Health insurance",
    "401k matching",
    "Unlimited PTO",
    "Stock options"
  ],
  "description": "Join our team building the next generation..."
}
```

#### Interview Agent
**Generates**: Job-specific interview questions with expected answers

**Example Output**:
```json
[
  {
    "id": "q1",
    "question": "Explain the difference between weak and strong references in Swift. When would you use each?",
    "expected_answer": "Strong references increase retain count and prevent deallocation. Weak references don't increase retain count and become nil when object is deallocated. Use weak for delegates and closures to prevent retain cycles."
  },
  {
    "id": "q2",
    "question": "How would you optimize a UITableView with thousands of cells?",
    "expected_answer": "Use cell reuse, implement prefetching, lazy load images, cache data, use lightweight views, avoid complex layouts in cells."
  },
  {
    "id": "q3",
    "question": "Describe your experience with SwiftUI and how it differs from UIKit.",
    "expected_answer": "SwiftUI is declarative vs UIKit's imperative approach. Uses state management, automatic UI updates, cross-platform support. Simpler syntax but less mature than UIKit."
  }
]
```

#### Task Agent
**Generates**: Profession-specific work assignments with multiple formats

**Text Answer Task**:
```json
{
  "id": "task-abc123",
  "title": "Implement OAuth 2.0 Authentication",
  "description": "Add OAuth 2.0 authentication to the iOS app using the Authorization Code flow. Support Google and Apple sign-in providers.",
  "format_type": "text_answer",
  "requirements": [
    "Implement OAuth 2.0 flow",
    "Support multiple providers",
    "Secure token storage"
  ],
  "acceptance_criteria": [
    "Users can sign in with Google/Apple",
    "Tokens stored securely in Keychain",
    "Proper error handling"
  ],
  "difficulty": 5,
  "xp_reward": 50,
  "task_type": "engineer"
}
```

**Multiple Choice Task**:
```json
{
  "id": "task-def456",
  "title": "Choose Best Data Structure",
  "description": "You need to store user preferences that require fast lookup by key and maintain insertion order. Which data structure is best?",
  "format_type": "multiple_choice",
  "options": [
    { "id": "A", "text": "Array" },
    { "id": "B", "text": "Dictionary" },
    { "id": "C", "text": "Set" },
    { "id": "D", "text": "OrderedDictionary" }
  ],
  "correct_answer": "D",
  "explanation": "OrderedDictionary provides O(1) lookup like Dictionary while maintaining insertion order.",
  "difficulty": 3,
  "xp_reward": 30
}
```

#### Grader Agent
**Generates**: Detailed evaluation with score and feedback

**Interview Grading**:
```json
{
  "passed": true,
  "overall_score": 85,
  "feedback": [
    {
      "question": "Explain weak vs strong references...",
      "answer": "Strong references keep objects alive...",
      "score": 90,
      "feedback": "Excellent explanation! You correctly identified the key differences and provided a practical example of retain cycles."
    },
    {
      "question": "How would you optimize a UITableView...",
      "answer": "I would use cell reuse and lazy loading...",
      "score": 80,
      "feedback": "Good answer covering the main optimization techniques. Could have mentioned prefetching for even better performance."
    }
  ]
}
```

**Task Grading**:
```json
{
  "score": 85,
  "passed": true,
  "feedback": "Excellent implementation! Your OAuth 2.0 flow correctly handles the authorization code exchange and token refresh. The Keychain integration is secure. Minor improvement: add more detailed error messages for better debugging.",
  "xp_gained": 50,
  "new_xp": 550,
  "level_up": true,
  "new_level": 4,
  "xp_to_next_level": 800
}
```

#### CV Agent
**Generates**: Professional resume bullets and skills

**Example Output**:
```json
{
  "experience": [
    {
      "company_name": "TechCorp Inc",
      "position": "Senior iOS Engineer",
      "start_date": "2025-11-06T10:00:00Z",
      "accomplishments": [
        "• Implemented OAuth 2.0 authentication system supporting Google and Apple sign-in",
        "• Optimized UITableView performance reducing scroll lag by 60%",
        "• Migrated 5 legacy UIKit screens to SwiftUI improving code maintainability"
      ]
    }
  ],
  "skills": [
    "Swift",
    "SwiftUI",
    "UIKit",
    "OAuth 2.0",
    "Combine",
    "iOS SDK",
    "Performance Optimization",
    "Security",
    "Keychain"
  ]
}
```

#### Meeting Agent
**Generates**: Virtual meeting scenarios with AI colleagues

**Example Output**:
```json
{
  "meeting_type": "one_on_one",
  "title": "Weekly 1:1 with Manager",
  "context": "Regular check-in to discuss current project progress, challenges, and career development goals.",
  "participants": [
    {
      "id": "participant-1",
      "name": "Sarah Chen",
      "role": "Engineering Manager",
      "personality": "supportive"
    }
  ],
  "topics": [
    {
      "id": "topic-1",
      "question": "How is the OAuth implementation progressing?",
      "context": "Following up on the authentication task assigned last week",
      "expected_points": [
        "Progress update",
        "Technical challenges faced",
        "Timeline for completion"
      ]
    },
    {
      "id": "topic-2",
      "question": "What areas would you like to focus on for professional growth?",
      "context": "Career development discussion",
      "expected_points": [
        "Skills to develop",
        "Projects of interest",
        "Long-term career goals"
      ]
    }
  ],
  "objective": "Align on project status and discuss career development",
  "duration_minutes": 20
}
```

## 🚀 Run Locally

### Frontend

**Prerequisites:** Node.js 20+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables in `.env`:
   ```bash
   VITE_BACKEND_URL=https://career-rl-backend-1086514937351.europe-west1.run.app
   VITE_GOOGLE_API_KEY=your-api-key-here
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

### Backend

See [backend/README.md](backend/README.md) for detailed setup instructions.

## 🐳 Deploy to Cloud Run

### Frontend Deployment

**Quick Deploy** (one command):
```bash
./quick-deploy-frontend.sh
```

**Full Deploy** (with options):
```bash
./deploy-frontend.sh
```

For detailed deployment instructions, see [FRONTEND-DEPLOYMENT.md](FRONTEND-DEPLOYMENT.md)

### Backend Deployment

See [backend/README.md](backend/README.md) for backend deployment instructions.

## 🎯 Features

### Complete Job Market Simulation
- **🎓 Graduation Screen**: Start your career journey as a fresh graduate
- **💼 Dynamic Job Market**: AI-generated job listings with realistic companies, positions, and requirements
- **🎤 AI-Powered Interviews**: Job-specific interview questions tailored to each position
- **✅ Intelligent Grading**: Fair evaluation of interview answers and task submissions
- **📋 Dynamic Work Tasks**: 2-5 profession-specific assignments based on job level
- **👥 Interactive Meetings**: 1-3 virtual meetings with AI colleagues (level-dependent)
- **🎯 Meeting Action Items**: Meetings generate follow-up tasks automatically
- **📈 Career Progression**: Gain XP, level up, and unlock higher-tier positions
- **📄 Auto-Updated CV**: Your resume grows with your accomplishments
- **🔄 Job Switching**: Search for better opportunities while employed
- **🎙️ Voice Input**: Answer interviews and tasks using voice (multimodal AI)

### Multi-Agent AI System
- **Job Agent**: Generates realistic job listings across industries and levels
- **Interview Agent**: Creates job-specific interview questions
- **Task Agent**: Generates profession-appropriate work assignments
- **Grader Agent**: Evaluates answers and provides constructive feedback
- **CV Agent**: Updates your resume based on completed work

### Technical Excellence
- **ADK Patterns**: Demonstrates SequentialAgent, ParallelAgent, and LoopAgent
- **Cloud-Native**: Auto-scaling (0-10 instances), scale-to-zero, serverless architecture
- **Real-time AI**: All content generated dynamically by Gemini 2.5 Flash
- **Persistent State**: Firestore integration for session management
- **Production-Ready**: Docker, nginx, CORS, health checks, error handling

## 📦 Project Structure

```
.
├── components/          # React components
├── services/           # API services
├── backend/            # Python ADK backend
│   ├── agents/        # ADK agents
│   ├── gateway/       # FastAPI gateway
│   ├── shared/        # Shared utilities
│   └── tools/         # Agent tools
├── Dockerfile         # Frontend Docker config
├── nginx.conf         # Nginx configuration
└── cloudbuild.yaml    # Cloud Build config
```

## 🏆 Hackathon Highlights

### Multi-Agent Architecture Excellence

**6 Specialized AI Agents**:
1. **Job Agent** - Generates realistic job market listings
2. **Interview Agent** - Creates profession-specific interview questions
3. **Task Agent** - Generates work assignments with multiple formats
4. **Grader Agent** - Evaluates submissions with detailed feedback
5. **CV Agent** - Updates resume based on accomplishments
6. **Meeting Agent** - Simulates virtual workplace meetings

**Agent Coordination**:
- **Workflow Orchestrator** coordinates all agent execution
- **Sequential workflows** for interview → grading → CV update
- **Parallel processing** for batch job generation
- **State management** via Firestore for persistence
- **Error handling** with fallbacks for AI failures

**Google ADK Patterns Demonstrated**:
- ✅ **SequentialAgent**: Interview workflow (interviewer → grader)
- ✅ **LoopAgent**: Task grading with retry logic
- ✅ **ParallelAgent**: Concurrent task generation demo
- ✅ **LlmAgent**: All individual agents powered by Gemini

**Cloud Run Excellence**:
- ✅ Fully serverless, auto-scaling (0-10 instances)
- ✅ Scale-to-zero for cost efficiency
- ✅ Docker containerization for both frontend and backend
- ✅ Health checks and graceful shutdown
- ✅ CORS configuration for secure cross-origin requests

**Gemini 2.5 Flash Integration**:
- ✅ Fast, efficient AI reasoning (1-3s response times)
- ✅ Structured JSON output parsing
- ✅ Multimodal support (voice input for interviews/tasks)
- ✅ Context-aware prompting for realistic content

**Firestore Persistence**:
- ✅ Cloud-native NoSQL database
- ✅ Real-time state synchronization
- ✅ Indexed queries for performance
- ✅ Transaction support for critical updates

**Production-Ready Features**:
- ✅ Docker multi-stage builds
- ✅ nginx reverse proxy
- ✅ Environment-based configuration
- ✅ Comprehensive error handling
- ✅ Logging and monitoring
- ✅ API documentation

### Key Architectural Decisions

**Why Workflow Orchestrator Instead of Pure ADK?**
- More control over agent execution flow
- Better error handling and fallbacks
- Easier to add custom logic (XP calculation, level ups)
- Direct Gemini API calls for reliability
- Simpler debugging and testing

**Why Firestore Over SQL?**
- Serverless, auto-scaling database
- No connection pooling needed
- Flexible schema for game state
- Real-time updates support
- Native GCP integration

**Why Gemini 2.5 Flash?**
- Fast response times (1-3s)
- Cost-effective for high volume
- Excellent JSON output quality
- Multimodal capabilities (voice)
- Latest model with best performance

**Why Cloud Run?**
- True serverless (scale to zero)
- Pay only for actual usage
- Auto-scaling based on traffic
- Built-in load balancing
- Easy deployment from containers

## 📄 License

MIT

## 🙏 Acknowledgments

Built with Google's Agent Development Kit (ADK) for the Google Cloud Run Hackathon.
