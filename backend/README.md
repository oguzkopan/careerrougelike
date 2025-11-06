# CareerRoguelike Backend

A Python-based multi-agent AI system built with **Google's Agent Development Kit (ADK)** and deployed on **Google Cloud Run**. This backend demonstrates advanced multi-agent collaboration where specialized AI agents work together to create a gamified career simulation.

## Architecture Overview

The backend uses ADK's agent orchestration patterns to coordinate multiple AI agents:

- **Interviewer Agent**: Generates profession-specific interview questions
- **Grader Agent**: Evaluates player answers and provides feedback
- **Task Generator Agent**: Creates profession-specific work tasks
- **CV Writer Agent**: Updates player CV based on accomplishments
- **Event Generator Agent**: Generates random career events with choices
- **Root Agent**: Orchestrates all agents using SequentialAgent pattern

All agents communicate through ADK's event system and share state via `session.state` dictionary.

## Project Structure

```
backend/
├── agents/              # ADK agents (LlmAgent, SequentialAgent, etc.)
├── gateway/             # FastAPI REST API
├── shared/              # Shared utilities (Firestore, config)
├── tools/               # ADK tools for agents
├── requirements.txt     # Python dependencies
├── .env.example         # Environment variables template
├── Dockerfile           # Docker configuration for Cloud Run
└── README.md           # This file
```

## Setup Instructions

### Prerequisites

- Python 3.9 or higher
- Google Cloud Project with Firestore enabled
- Google API Key for Gemini 2.5 Flash

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

5. **Run the FastAPI server locally**:
   ```bash
   uvicorn gateway.main:app --reload --port 8080
   ```

   The API will be available at `http://localhost:8080`

### Testing with ADK CLI

ADK provides CLI tools for testing agents locally:

```bash
# Test individual agents
adk run agents/interviewer_agent.py

# Test with interactive web UI
adk web --port 8000

# Test root agent workflow
adk run agents/root_agent.py
```

## API Endpoints

### Create Session
```bash
POST /sessions
Content-Type: application/json

{
  "profession": "ios_engineer",
  "level": 3
}
```

### Invoke Agent Workflow
```bash
POST /sessions/{session_id}/invoke
Content-Type: application/json

{
  "action": "interview",
  "data": {}
}
```

### Get Session State
```bash
GET /sessions/{session_id}
```

### Get CV Data
```bash
GET /sessions/{session_id}/cv
```

### Health Check
```bash
GET /health
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t career-rl-backend .
```

### Run Locally with Docker

```bash
docker run -p 8080:8080 --env-file .env career-rl-backend
```

## Cloud Run Deployment

### Prerequisites

1. Enable required APIs:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable firestore.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   ```

2. Create Artifact Registry repository:
   ```bash
   gcloud artifacts repositories create career-rl \
     --repository-format=docker \
     --location=europe-west1
   ```

3. Create Firestore database (Native mode) in GCP Console

### Deploy to Cloud Run

1. **Authenticate with Artifact Registry**:
   ```bash
   gcloud auth configure-docker europe-west1-docker.pkg.dev
   ```

2. **Build and tag image**:
   ```bash
   docker build -t career-rl-backend .
   docker tag career-rl-backend europe-west1-docker.pkg.dev/PROJECT_ID/career-rl/backend:latest
   ```

3. **Push to Artifact Registry**:
   ```bash
   docker push europe-west1-docker.pkg.dev/PROJECT_ID/career-rl/backend:latest
   ```

4. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy career-rl-backend \
     --image europe-west1-docker.pkg.dev/PROJECT_ID/career-rl/backend:latest \
     --region europe-west1 \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars GOOGLE_API_KEY=xxx,PROJECT_ID=xxx \
     --min-instances 0 \
     --max-instances 10 \
     --memory 1Gi \
     --cpu 2
   ```

5. **Get deployed URL**:
   ```bash
   gcloud run services describe career-rl-backend \
     --region europe-west1 \
     --format 'value(status.url)'
   ```

## Technologies Used

- **Google ADK**: Multi-agent orchestration framework
- **Python 3.9+**: Primary programming language
- **FastAPI**: REST API gateway
- **Gemini 2.5 Flash**: LLM for all agent reasoning
- **Firestore**: Session state persistence
- **Cloud Run**: Serverless container deployment
- **Docker**: Containerization

## Multi-Agent Patterns Demonstrated

This project showcases several ADK agent patterns:

1. **LlmAgent**: Individual agents that use Gemini for reasoning
2. **SequentialAgent**: Runs agents in sequence, passing state between them
3. **ParallelAgent**: Runs multiple agents concurrently
4. **LoopAgent**: Runs agents in a loop with retry logic

## Development Notes

- All agents use `session.state` dictionary for data sharing
- State is persisted to Firestore after each agent invocation
- The Gateway API controls which agents run based on frontend actions
- Agents communicate through ADK's yield/event system

## Built for Google Cloud Run Hackathon

This project was created to demonstrate excellent multi-agent collaboration using Google ADK and Cloud Run's serverless capabilities.

## License

MIT
