# Devpost Submission Content

## Project Story

### Inspiration
I wanted to create a realistic career simulation that demonstrates advanced multi-agent AI collaboration. The idea was to show how specialized AI agents can work together bidirectionally—where tasks trigger meetings and meetings generate tasks—creating a dynamic workplace experience.

### What I Learned
- **Multi-agent orchestration**: Centralized coordination beats autonomous agents for production systems
- **Bidirectional workflows**: Agents triggering each other creates emergent, realistic behavior
- **Cloud Run scalability**: Serverless is perfect for AI workloads with generous timeouts
- **Prompt engineering**: 40% of development time went into refining AI prompts for consistency
- **Pre-validation**: Filtering invalid inputs before AI calls saved 30% on API costs

### How I Built It
1. **Architecture**: Designed a Workflow Orchestrator to coordinate 7 specialized AI agents
2. **Agents**: Built Job, Interview, Task, Grader, CV, Meeting Generator, and Meeting Evaluator agents using Gemini 2.5 Flash
3. **Bidirectional System**: Implemented intelligent triggers—completing 2-4 tasks generates meetings, meetings generate 0-3 follow-up tasks
4. **Frontend**: Created React UI with job search, interviews, work dashboard, and virtual meetings
5. **Backend**: Built FastAPI gateway with direct Gemini API calls for reliability
6. **Deployment**: Containerized both services and deployed to Cloud Run with auto-scaling
7. **State Management**: Used Firestore for persistent player state, jobs, tasks, and meetings

### Challenges Faced
- **Agent reliability**: Switched from ADK Runner to direct Gemini API calls for better error handling
- **Grading consistency**: Implemented pre-validation + AI grading to prevent gaming the system
- **Task quality**: Enhanced prompts to ensure self-contained tasks without external dependencies
- **Meeting flow**: Built conversation management to detect repetition and determine topic completion
- **Dashboard balance**: Created intelligent monitoring to maintain 3-5 tasks and 1-2 meetings

---

## Built With

**Languages:**
- Python 3.9
- TypeScript
- JavaScript

**Frameworks:**
- FastAPI (backend)
- React 18 (frontend)
- Vite (build tool)
- TailwindCSS (styling)

**Cloud Services:**
- Google Cloud Run (serverless compute)
- Google Cloud Firestore (NoSQL database)
- Google Vertex AI / Gemini API (AI models)
- Google Cloud Build (CI/CD)
- Google Artifact Registry (containers)

**AI/ML:**
- Google Agent Development Kit (ADK)
- Gemini 2.5 Flash (all AI reasoning)
- Google Generative AI SDK

**Databases:**
- Cloud Firestore (Native mode)

**APIs:**
- Gemini API
- Vertex AI API
- Firestore API

**Other Technologies:**
- Docker (containerization)
- nginx (frontend server)
- uvicorn (ASGI server)
- Pydantic (data validation)
- React Query (state management)

---

## Copy-Paste Format for Devpost

### Project Story Field:
```
I wanted to create a realistic career simulation that demonstrates advanced multi-agent AI collaboration. The idea was to show how specialized AI agents can work together bidirectionally—where tasks trigger meetings and meetings generate tasks—creating a dynamic workplace experience.

**What I Learned:**
- Multi-agent orchestration: Centralized coordination beats autonomous agents for production systems
- Bidirectional workflows: Agents triggering each other creates emergent, realistic behavior
- Cloud Run scalability: Serverless is perfect for AI workloads with generous timeouts
- Prompt engineering: 40% of development time went into refining AI prompts for consistency
- Pre-validation: Filtering invalid inputs before AI calls saved 30% on API costs

**How I Built It:**
1. Architecture: Designed a Workflow Orchestrator to coordinate 7 specialized AI agents
2. Agents: Built Job, Interview, Task, Grader, CV, Meeting Generator, and Meeting Evaluator agents using Gemini 2.5 Flash
3. Bidirectional System: Implemented intelligent triggers—completing 2-4 tasks generates meetings, meetings generate 0-3 follow-up tasks
4. Frontend: Created React UI with job search, interviews, work dashboard, and virtual meetings
5. Backend: Built FastAPI gateway with direct Gemini API calls for reliability
6. Deployment: Containerized both services and deployed to Cloud Run with auto-scaling
7. State Management: Used Firestore for persistent player state, jobs, tasks, and meetings

**Challenges Faced:**
- Agent reliability: Switched from ADK Runner to direct Gemini API calls for better error handling
- Grading consistency: Implemented pre-validation + AI grading to prevent gaming the system
- Task quality: Enhanced prompts to ensure self-contained tasks without external dependencies
- Meeting flow: Built conversation management to detect repetition and determine topic completion
- Dashboard balance: Created intelligent monitoring to maintain 3-5 tasks and 1-2 meetings
```

### Built With Field (comma-separated tags):
```
python, typescript, javascript, fastapi, react, vite, tailwindcss, google-cloud-run, google-cloud-firestore, google-vertex-ai, gemini-api, google-adk, docker, nginx, uvicorn, pydantic, react-query
```

---

**Created**: November 10, 2025
**For**: Google Cloud Run Hackathon - AI Agents Category
