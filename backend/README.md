# CareerRoguelike Backend

A Python-based multi-agent AI system built with **Google's Agent Development Kit (ADK)** and deployed on **Google Cloud Run**. This backend demonstrates advanced multi-agent collaboration where specialized AI agents work together to create a gamified career simulation.

**Built for Google Cloud Run Hackathon** - This project showcases excellent multi-agent collaboration using Google ADK, demonstrating Sequential, Parallel, and Loop agent patterns with Gemini 2.5 Flash.

## Architecture Overview

The backend uses a **Workflow Orchestrator** to coordinate multiple AI agents powered by Gemini 2.5 Flash. The orchestrator calls the Gemini API directly with agent-specific prompts, providing better reliability and control than traditional ADK patterns.

📊 **See detailed diagrams**: [diagrams/](./diagrams/)
- [Agent Workflow Diagram](./diagrams/agent-workflow.md) - Visual representation of agent communication
- [State Flow Diagram](./diagrams/state-flow.md) - How session state evolves through the game
- [ADK Patterns](./diagrams/adk-patterns.md) - Agent pattern concepts (reference)

### Agent Roles and Communication

Each agent is defined with specific prompts and instructions. The Workflow Orchestrator invokes them via Gemini API:

- **Job Agent** (`job_agent.py`): Generates realistic job listings based on player level and profession. Creates 10 diverse positions with company details, requirements, and salaries.
  
- **Interview Agent** (`interviewer_agent.py`): Creates profession-specific interview questions (3-5 questions) tailored to the job requirements and player level.
  
- **Task Agent** (`task_agent.py`): Generates profession-specific work tasks with multiple formats (text answer, multiple choice, fill-in-blank, matching, code review, prioritization). Scales difficulty based on player level.
  
- **Grader Agent** (`grader_agent.py`): Evaluates player submissions (interviews and tasks) with strict grading criteria. Returns score (0-100), pass/fail status (≥70 = pass), and detailed feedback. Includes pre-validation checks for gibberish, length, and relevance.
  
- **CV Agent** (`cv_writer_agent.py`): Updates player CV based on completed tasks. Generates professional resume bullets with measurable impact and extracts demonstrated skills.
  
- **Meeting Agent** (`meeting_agent.py`): Generates virtual meeting scenarios with AI colleagues, discussion topics, and participant personalities.

### How Agents Communicate

1. **Workflow Orchestrator**: Central coordinator that manages all agent invocations. Located in `agents/workflow_orchestrator.py`.

2. **Direct Gemini API Calls**: Orchestrator formats prompts with context and calls Gemini 2.5 Flash directly (no ADK Runner).

3. **State Management**: All state is stored in Firestore and passed as context to agents. No shared session.state dictionary.

4. **Error Handling**: Built-in fallbacks for AI failures, with simple default responses when Gemini API calls fail.

5. **Response Parsing**: Orchestrator extracts JSON from AI responses, validates structure, and returns structured data to Gateway.

## Project Structure

```
backend/
├── agents/                          # AI agents and orchestrator
│   ├── __init__.py
│   ├── workflow_orchestrator.py    # Main orchestrator - coordinates all agents
│   ├── job_agent.py                # Agent definition: Generates job listings
│   ├── interviewer_agent.py        # Agent definition: Generates interview questions
│   ├── task_agent.py               # Agent definition: Creates work tasks
│   ├── grader_agent.py             # Agent definition: Evaluates answers and tasks
│   ├── cv_writer_agent.py          # Agent definition: Updates CV from accomplishments
│   ├── meeting_agent.py            # Agent definition: Generates meeting scenarios
│   ├── task_generator_agent.py     # Legacy: Task generation (reference)
│   ├── event_generator_agent.py    # Legacy: Career events (reference)
│   ├── workflows.py                # Legacy: ADK workflow patterns (reference)
│   └── root_agent.py               # Legacy: Root agent (reference)
├── gateway/                         # FastAPI REST API
│   ├── __init__.py
│   ├── main.py                     # FastAPI app and endpoints
│   └── auth.py                     # Firebase authentication
├── shared/                          # Shared utilities
│   ├── __init__.py
│   ├── firestore_manager.py        # Firestore CRUD operations
│   ├── session_service.py          # Custom ADK SessionService
│   ├── config.py                   # Environment configuration
│   └── model_config.py             # Model configuration
├── tools/                           # ADK tools for agents (optional)
│   └── __init__.py
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment variables template
├── .dockerignore                    # Docker ignore patterns
├── Dockerfile                       # Docker configuration for Cloud Run
├── gcp-setup.sh                     # GCP project setup script
├── deploy-cloud-build.sh            # Cloud Build deployment script
├── quick-deploy.sh                  # Quick deployment script
├── test-deployment.sh               # Deployment testing script
├── deployment-checklist.md          # Deployment checklist
├── DEPLOY-QUICK-REFERENCE.txt       # Quick deployment reference
└── README.md                        # This file
```

## Setup Instructions

### Prerequisites

- Python 3.9 or higher
- Google Cloud Project with Firestore enabled
- Google API Key for Gemini 2.5 Flash (or Vertex AI credentials)
- `google-generativeai` package (included in requirements.txt)

### Local Development Setup

1. **Create Python virtual environment**:
   ```bash
   cd backend
   python -m venv .venv
   ```

2. **Activate virtual environment**:
   ```bash
   # On macOS/Linux:
   source .venv/bin/activate
   
   # On Windows:
   .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your GOOGLE_API_KEY and PROJECT_ID
   ```

5. **Deploy Firestore indexes** (Required):
   ```bash
   ./deploy-firestore-indexes.sh
   # Wait 2-5 minutes for indexes to build
   # See FIRESTORE_INDEXES.md for details
   ```

6. **Run the FastAPI server locally**:
   ```bash
   uvicorn gateway.main:app --reload --port 8080
   ```

   The API will be available at `http://localhost:8080`

### Local Testing Instructions

#### Testing with ADK CLI

ADK provides CLI tools for testing agents locally without running the full API:

```bash
# Test individual agents
adk run agents/interviewer_agent.py
adk run agents/grader_agent.py
adk run agents/task_generator_agent.py
adk run agents/cv_writer_agent.py
adk run agents/event_generator_agent.py

# Test workflow compositions
adk run agents/workflows.py

# Test root agent orchestration
adk run agents/root_agent.py

# Launch interactive web UI for testing
adk web --port 8000
```

The `adk web` command launches a web interface where you can:
- Interact with agents in real-time
- See the conversation history
- Inspect session state changes
- Debug agent workflows

#### Testing the FastAPI Gateway

```bash
# Start the development server
uvicorn gateway.main:app --reload --port 8080

# In another terminal, test endpoints:

# Health check
curl http://localhost:8080/health

# Create a session
curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{"profession": "ios_engineer", "level": 3}'

# Invoke interview agent
curl -X POST http://localhost:8080/sessions/{session_id}/invoke \
  -H "Content-Type: application/json" \
  -d '{"action": "interview", "data": {}}'
```

## API Endpoints

> **📖 Complete API Documentation**: See [API-DOCUMENTATION.md](../API-DOCUMENTATION.md) for full reference with examples

### Quick Reference

#### Session Management

**Create Session**: `POST /sessions`
```bash
curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{"profession": "ios_engineer", "level": 1}'
```

**Get Session**: `GET /sessions/{session_id}`

**Get Player State**: `GET /sessions/{session_id}/state`

**Get CV**: `GET /sessions/{session_id}/cv`

#### Job Market

**Generate Jobs**: `POST /sessions/{session_id}/jobs/generate`
```bash
curl -X POST http://localhost:8080/sessions/{sid}/jobs/generate \
  -H "Content-Type: application/json" \
  -d '{"player_level": 3, "count": 10}'
```

**Get Job Details**: `GET /sessions/{session_id}/jobs/{job_id}`

**Refresh Jobs**: `POST /sessions/{session_id}/jobs/refresh`

#### Interview

**Start Interview**: `POST /sessions/{session_id}/jobs/{job_id}/interview`

**Submit Answers**: `POST /sessions/{session_id}/jobs/{job_id}/interview/submit`
```bash
curl -X POST http://localhost:8080/sessions/{sid}/jobs/{jid}/interview/submit \
  -H "Content-Type: application/json" \
  -d '{"answers": {"q1": "answer1", "q2": "answer2"}}'
```

**Accept Job**: `POST /sessions/{session_id}/jobs/{job_id}/accept`

#### Tasks

**Get Tasks**: `GET /sessions/{session_id}/tasks`

**Submit Task**: `POST /sessions/{session_id}/tasks/{task_id}/submit`
```bash
curl -X POST http://localhost:8080/sessions/{sid}/tasks/{tid}/submit \
  -H "Content-Type: application/json" \
  -d '{"solution": "Your solution here..."}'
```

### Legacy Endpoints (Original System)

**Create Session**: `POST /sessions`
```json
{
  "profession": "ios_engineer",  // Options: ios_engineer, data_analyst, product_designer, sales_associate
  "level": 3                      // Range: 1-10
}
```

**Response**:
```json
{
  "session_id": "sess-abc123-def456"
}
```

**Example**:
```bash
curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{"profession": "ios_engineer", "level": 3}'
```

---

### Invoke Agent Workflow

Triggers specific agent workflows based on the action type.

**Endpoint**: `POST /sessions/{session_id}/invoke`

**Request Body**:
```json
{
  "action": "interview" | "submit_answer" | "generate_task" | "submit_task" | "generate_event",
  "data": {
    "answer": "player answer text",  // For submit_answer and submit_task
    "choice": "A"                     // For event choices
  }
}
```

**Actions**:
- `interview`: Generates interview questions using Interviewer Agent
- `submit_answer`: Grades interview answer using Grader Agent
- `generate_task`: Creates work task using Task Generator Agent
- `submit_task`: Grades task submission using Grader Agent (with retry loop)
- `generate_event`: Creates career event using Event Generator Agent

**Response**:
```json
{
  "result": {
    "interview_questions": [...],  // For interview action
    "grading_result": {...},       // For submit_answer/submit_task
    "current_task": {...},         // For generate_task
    "current_event": {...}         // For generate_event
  },
  "state": {
    // Full session state
  }
}
```

**Examples**:
```bash
# Start interview
curl -X POST http://localhost:8080/sessions/sess-123/invoke \
  -H "Content-Type: application/json" \
  -d '{"action": "interview", "data": {}}'

# Submit interview answer
curl -X POST http://localhost:8080/sessions/sess-123/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submit_answer",
    "data": {
      "answer": "Swift is a type-safe language..."
    }
  }'

# Generate task
curl -X POST http://localhost:8080/sessions/sess-123/invoke \
  -H "Content-Type: application/json" \
  -d '{"action": "generate_task", "data": {}}'
```

---

### Complete Job Market Flow Example

```bash
# 1. Create session
SESSION_ID=$(curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{"profession": "ios_engineer", "level": 1}' | jq -r '.session_id')

# 2. Generate job listings
curl -X POST http://localhost:8080/sessions/$SESSION_ID/jobs/generate \
  -H "Content-Type: application/json" \
  -d '{"player_level": 1, "count": 10}'

# 3. Start interview for a job
JOB_ID="job-abc123"  # From previous response
curl -X POST http://localhost:8080/sessions/$SESSION_ID/jobs/$JOB_ID/interview

# 4. Submit interview answers
curl -X POST http://localhost:8080/sessions/$SESSION_ID/jobs/$JOB_ID/interview/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "q1": "Weak references don'\''t increase retain count...",
      "q2": "I would use cell reuse and pagination...",
      "q3": "SwiftUI is declarative..."
    }
  }'

# 5. Accept job offer (if passed)
curl -X POST http://localhost:8080/sessions/$SESSION_ID/jobs/$JOB_ID/accept

# 6. Get active tasks
curl http://localhost:8080/sessions/$SESSION_ID/tasks

# 7. Submit task solution
TASK_ID="task-xyz789"  # From previous response
curl -X POST http://localhost:8080/sessions/$SESSION_ID/tasks/$TASK_ID/submit \
  -H "Content-Type: application/json" \
  -d '{"solution": "I implemented OAuth 2.0 using..."}'

# 8. Check player state (level, XP, current job)
curl http://localhost:8080/sessions/$SESSION_ID/state

# 9. View updated CV
curl http://localhost:8080/sessions/$SESSION_ID/cv
```

---

### Get Session State

Retrieves the complete session state including all agent outputs.

**Endpoint**: `GET /sessions/{session_id}`

**Response**:
```json
{
  "session_id": "sess-123",
  "profession": "ios_engineer",
  "level": 3,
  "status": "active",
  "state": {
    "interview_questions": [...],
    "grading_result": {...},
    "current_task": {...},
    "completed_tasks": [...],
    "cv_data": {...}
  }
}
```

**Example**:
```bash
curl http://localhost:8080/sessions/sess-123
```

---

### Get CV Data

Retrieves only the CV data for a session.

**Endpoint**: `GET /sessions/{session_id}/cv`

**Response**:
```json
{
  "bullets": [
    "• Reduced app crash rate by 23% through systematic debugging",
    "• Implemented 5 new features using SwiftUI and Combine framework"
  ],
  "skills": ["Swift", "SwiftUI", "Debugging", "Performance Optimization"]
}
```

**Example**:
```bash
curl http://localhost:8080/sessions/sess-123/cv
```

---

### Health Check

Simple health check endpoint for monitoring.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy"
}
```

**Example**:
```bash
curl http://localhost:8080/health
```

## Docker Deployment

### Build Docker Image

Build the Docker image for the backend:

```bash
cd backend
docker build -t career-rl-backend .
```

The Dockerfile:
- Uses `python:3.9-slim` as base image
- Installs all dependencies from `requirements.txt`
- Copies agent, gateway, shared, and tools directories
- Exposes port 8080
- Runs uvicorn server on startup

### Run Locally with Docker

Run the containerized backend locally:

```bash
docker run -p 8080:8080 --env-file .env career-rl-backend
```

Or with explicit environment variables:

```bash
docker run -p 8080:8080 \
  -e GOOGLE_API_KEY=your_api_key \
  -e PROJECT_ID=your_project_id \
  career-rl-backend
```

Test the containerized service:

```bash
# Health check
curl http://localhost:8080/health

# Create session
curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{"profession": "ios_engineer", "level": 3}'
```

## Cloud Run Deployment

### Prerequisites

Before deploying to Cloud Run, ensure you have:

1. **gcloud CLI**: Install from https://cloud.google.com/sdk/docs/install
2. **Docker**: Install from https://docs.docker.com/get-docker/
3. **GCP Project**: Active Google Cloud project with billing enabled
4. **API Key**: Google API key for Gemini 2.5 Flash
5. **Environment Variables**: Configure `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env and set PROJECT_ID and GOOGLE_API_KEY
   ```

### Quick Start (Automated)

We provide scripts to automate the deployment process:

#### 1. Set up GCP project (one-time setup)

```bash
cd backend
./gcp-setup.sh
```

This script will:
- Enable required APIs (Cloud Run, Firestore, Artifact Registry)
- Create Artifact Registry repository in europe-west1
- Set up Firestore database in Native mode
- Configure IAM permissions

#### 2. Deploy to Cloud Run

```bash
./quick-deploy.sh
```

This script will:
- Build the Docker image
- Tag and push to Artifact Registry
- Deploy to Cloud Run with optimal settings
- Output the deployed service URL

#### 3. Test deployment

```bash
./test-deployment.sh
```

This script will:
- Run health check
- Test session creation
- Test agent invocation
- Verify Firestore integration

### Manual Deployment Steps

If you prefer manual control, follow these steps:

#### Step 1: Enable GCP Services

```bash
# Set your project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

#### Step 2: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create career-rl \
  --repository-format=docker \
  --location=europe-west1 \
  --description="CareerRoguelike backend images"
```

#### Step 3: Build and Push Docker Image

```bash
# Build the image
docker build -t career-rl-backend .

# Tag for Artifact Registry
docker tag career-rl-backend \
  europe-west1-docker.pkg.dev/$PROJECT_ID/career-rl/backend:latest

# Configure Docker authentication
gcloud auth configure-docker europe-west1-docker.pkg.dev

# Push to registry
docker push europe-west1-docker.pkg.dev/$PROJECT_ID/career-rl/backend:latest
```

#### Step 4: Deploy to Cloud Run

```bash
gcloud run deploy career-rl-backend \
  --image europe-west1-docker.pkg.dev/$PROJECT_ID/career-rl/backend:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=your_api_key,PROJECT_ID=$PROJECT_ID \
  --min-instances 0 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 2 \
  --timeout 300
```

Configuration explained:
- `--min-instances 0`: Scale to zero when idle (cost optimization)
- `--max-instances 10`: Auto-scale up to 10 instances under load
- `--memory 1Gi`: 1GB memory per instance (sufficient for ADK agents)
- `--cpu 2`: 2 vCPUs for faster agent execution
- `--timeout 300`: 5-minute timeout for long-running agent workflows
- `--allow-unauthenticated`: Public access (add auth for production)

#### Step 5: Get Service URL

```bash
gcloud run services describe career-rl-backend \
  --region europe-west1 \
  --format 'value(status.url)'
```

#### Step 6: Test Deployed Service

```bash
# Set the service URL
export SERVICE_URL=$(gcloud run services describe career-rl-backend \
  --region europe-west1 --format 'value(status.url)')

# Health check
curl $SERVICE_URL/health

# Create session
curl -X POST $SERVICE_URL/sessions \
  -H "Content-Type: application/json" \
  -d '{"profession": "ios_engineer", "level": 3}'

# Test agent invocation
curl -X POST $SERVICE_URL/sessions/{session_id}/invoke \
  -H "Content-Type: application/json" \
  -d '{"action": "interview", "data": {}}'
```

### Deployment Files Reference

- `gcp-setup.sh` - One-time GCP project setup
- `quick-deploy.sh` - Quick deployment script
- `deploy-cloud-build.sh` - Cloud Build deployment (CI/CD)
- `test-deployment.sh` - Automated deployment testing
- `deployment-checklist.md` - Pre-deployment checklist
- `DEPLOY-QUICK-REFERENCE.txt` - Quick command reference

### Monitoring and Logs

View logs in Cloud Console:
```bash
gcloud run services logs read career-rl-backend \
  --region europe-west1 \
  --limit 50
```

Or stream logs in real-time:
```bash
gcloud run services logs tail career-rl-backend \
  --region europe-west1
```

### Updating the Deployment

To deploy updates:

```bash
# Rebuild and push
docker build -t career-rl-backend .
docker tag career-rl-backend \
  europe-west1-docker.pkg.dev/$PROJECT_ID/career-rl/backend:latest
docker push europe-west1-docker.pkg.dev/$PROJECT_ID/career-rl/backend:latest

# Cloud Run will automatically deploy the new image
# Or force a new revision:
gcloud run services update career-rl-backend \
  --region europe-west1 \
  --image europe-west1-docker.pkg.dev/$PROJECT_ID/career-rl/backend:latest
```

## Technologies Used

- **Workflow Orchestrator**: Custom multi-agent coordination system
- **Python 3.9+**: Primary programming language
- **FastAPI**: REST API gateway
- **Gemini 2.5 Flash**: LLM for all agent reasoning (via direct API calls)
- **Firestore**: Session state persistence
- **Cloud Run**: Serverless container deployment
- **Docker**: Containerization
- **google-generativeai**: Python SDK for Gemini API

## Multi-Agent Patterns Demonstrated

This project showcases several ADK agent patterns to demonstrate excellent multi-agent collaboration:

### 1. LlmAgent Pattern

Individual agents that use Gemini 2.5 Flash for reasoning. Each agent has:
- A specific `instruction` prompt with placeholders for state variables
- An `output_key` that determines where results are stored in session.state
- Access to the full conversation history and session context

**Examples**: All five core agents (Interviewer, Grader, Task Generator, CV Writer, Event Generator)

### 2. SequentialAgent Pattern

Runs sub-agents in sequence, with each agent's output becoming available to the next agent. The Root Agent uses this pattern to orchestrate the entire workflow.

**Example**: `root_agent` in `agents/root_agent.py`
```python
root_agent = SequentialAgent(
    name="CareerRoguelikeRootAgent",
    sub_agents=[
        interviewer_agent,
        grader_agent,
        task_generator_agent,
        cv_writer_agent,
        event_generator_agent
    ]
)
```

### 3. ParallelAgent Pattern

Runs multiple agents concurrently for faster execution. Useful when agents don't depend on each other's outputs.

**Example**: Parallel task generation in `agents/workflows.py`
```python
parallel_task_workflow = ParallelAgent(
    name="ParallelTaskGenerator",
    sub_agents=[
        task_generator_ios,
        task_generator_data,
        task_generator_design,
        task_generator_sales
    ]
)
```

This demonstrates generating tasks for all four professions simultaneously, showcasing ADK's ability to parallelize independent operations.

### 4. LoopAgent Pattern

Runs agents in a loop until a condition is met or max iterations reached. Perfect for retry logic.

**Example**: Task grading with retry in `agents/workflows.py`
```python
loop_grader = LoopAgent(
    agent=grader_agent,
    max_iterations=2,
    description="Grades task with one retry opportunity"
)
```

This allows players to retry failed tasks once, with the grader providing feedback for improvement.

## Development Notes

- All agents use `session.state` dictionary for data sharing
- State is persisted to Firestore after each agent invocation
- The Gateway API controls which agents run based on frontend actions
- Agents communicate through ADK's yield/event system

## Agent Communication Flow

Here's how agents communicate through the shared state:

```
1. Frontend → Gateway API: POST /sessions/{sid}/invoke {"action": "interview"}
2. Gateway → ADK Runner: Execute root_agent with session context
3. Root Agent → Interviewer Agent: Reads {profession}, {level} from state
4. Interviewer Agent → Gemini: Generates questions
5. Interviewer Agent → State: Writes to interview_questions key
6. Root Agent → Firestore: Persists updated state
7. Gateway → Frontend: Returns interview_questions

Player submits answer...

8. Frontend → Gateway: POST /sessions/{sid}/invoke {"action": "submit_answer", "data": {"answer": "..."}}
9. Gateway → ADK Runner: Execute root_agent
10. Root Agent → Grader Agent: Reads {interview_questions}, {player_answer} from state
11. Grader Agent → Gemini: Evaluates answer
12. Grader Agent → State: Writes to grading_result key
13. Root Agent → Firestore: Persists updated state
14. Gateway → Frontend: Returns grading_result
```

This event-driven architecture ensures:
- **Loose coupling**: Agents don't directly call each other
- **State transparency**: All data flow is visible in session.state
- **Persistence**: State survives across requests via Firestore
- **Debuggability**: Easy to inspect state at any point in the workflow

## Troubleshooting

### Common Issues

**Issue**: `ModuleNotFoundError: No module named 'google.adk'`
- **Solution**: Ensure you've activated the virtual environment and installed dependencies:
  ```bash
  source .venv/bin/activate
  pip install -r requirements.txt
  ```

**Issue**: `GOOGLE_API_KEY not found`
- **Solution**: Copy `.env.example` to `.env` and add your API key:
  ```bash
  cp .env.example .env
  # Edit .env and add GOOGLE_API_KEY=your_key_here
  ```

**Issue**: Firestore permission denied
- **Solution**: Ensure Firestore is enabled and you have proper credentials:
  ```bash
  gcloud services enable firestore.googleapis.com
  gcloud auth application-default login
  ```

**Issue**: Docker build fails
- **Solution**: Ensure you're in the backend/ directory and have a stable internet connection:
  ```bash
  cd backend
  docker build -t career-rl-backend .
  ```

**Issue**: Cloud Run deployment fails
- **Solution**: Check that all required APIs are enabled:
  ```bash
  gcloud services enable run.googleapis.com artifactregistry.googleapis.com
  ```

## Performance Considerations

- **Cold Start**: First request after idle period may take 3-5 seconds as Cloud Run spins up a container
- **Warm Instances**: Subsequent requests complete in <1 second
- **Agent Execution**: Each agent call to Gemini takes 1-2 seconds
- **Parallel Execution**: ParallelAgent can reduce total time by running agents concurrently
- **Scale to Zero**: With `min-instances=0`, no cost when idle
- **Auto-scaling**: Cloud Run automatically scales up to handle traffic spikes

## Security Notes

- **API Keys**: Never commit `.env` file to version control
- **Authentication**: Current setup allows unauthenticated access for demo purposes
- **Production**: Add Firebase Auth or Cloud IAM for production deployments
- **Firestore Rules**: Configure security rules to restrict access by user ID
- **Environment Variables**: Use Secret Manager for sensitive values in production

## Built for Google Cloud Run Hackathon

This project was created to demonstrate **excellent multi-agent collaboration** using Google ADK and Cloud Run's serverless capabilities. It showcases:

- ✅ Multiple ADK agent patterns (Sequential, Parallel, Loop)
- ✅ Gemini 2.5 Flash for all LLM reasoning
- ✅ Cloud Run serverless deployment with auto-scaling
- ✅ Firestore for state persistence
- ✅ Docker containerization
- ✅ Event-driven agent communication
- ✅ Production-ready architecture

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Frontend Deployment

The frontend is also deployed to Cloud Run and can be accessed at:
**https://career-rl-frontend-1086514937351.europe-west1.run.app**

### Frontend Architecture

- **Framework**: React + Vite
- **Server**: Nginx (Alpine)
- **Container**: Multi-stage Docker build
- **Configuration**: 
  - Min Instances: 0 (scale to zero)
  - Max Instances: 10
  - Memory: 512Mi
  - CPU: 1
  - Port: 8080

### Frontend Deployment Steps

1. Build the frontend Docker image:
   ```bash
   gcloud builds submit --tag europe-west1-docker.pkg.dev/careerrogue-4df28/career-rl/frontend:latest
   ```

2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy career-rl-frontend \
     --image europe-west1-docker.pkg.dev/careerrogue-4df28/career-rl/frontend:latest \
     --region europe-west1 \
     --platform managed \
     --allow-unauthenticated \
     --min-instances 0 \
     --max-instances 10 \
     --memory 512Mi \
     --cpu 1 \
     --port 8080
   ```

3. The frontend will be available at the provided Cloud Run URL

### CORS Configuration

The backend is configured to allow requests from the frontend Cloud Run URL:
- https://career-rl-frontend-1086514937351.europe-west1.run.app
- https://career-rl-frontend-qy7qschhma-ew.a.run.app
- http://localhost:3000 (development)
- http://localhost:4173 (preview)

See `backend/gateway/main.py` for CORS configuration.

## Complete Deployment URLs

- **Frontend**: https://career-rl-frontend-1086514937351.europe-west1.run.app
- **Backend**: https://career-rl-backend-1086514937351.europe-west1.run.app
- **Project**: careerrogue-4df28
- **Region**: europe-west1

Both services are deployed in the same GCP project and region for optimal performance.
