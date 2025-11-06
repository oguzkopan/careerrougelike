# Agent Workflow Diagram

This diagram shows how agents communicate through ADK patterns (Sequential, Parallel, Loop).

```mermaid
flowchart TB
    subgraph Frontend["React Frontend"]
        UI[Game UI]
    end
    
    subgraph CloudRun["Google Cloud Run - Backend Service"]
        GW[FastAPI Gateway<br/>Port 8080]
        
        subgraph ADK["ADK Agent System"]
            RUNNER[ADK Runner<br/>Event Loop]
            
            subgraph RootAgent["Root Agent (SequentialAgent)"]
                ROOT[Orchestrator]
            end
            
            subgraph Agents["Individual Agents (LlmAgent)"]
                INT[Interviewer Agent<br/>Generates Questions]
                GRAD[Grader Agent<br/>Evaluates Answers]
                TASK[Task Generator<br/>Creates Tasks]
                CV[CV Writer<br/>Updates Resume]
                EVENT[Event Generator<br/>Creates Events]
            end
            
            subgraph Workflows["Advanced Workflows"]
                LOOP[LoopAgent<br/>Retry Logic]
                PARALLEL[ParallelAgent<br/>Concurrent Tasks]
            end
        end
        
        STATE[(Session State<br/>Dictionary)]
    end
    
    subgraph GCP["Google Cloud Services"]
        FS[(Firestore<br/>Persistence)]
        GEMINI[Gemini 2.5 Flash<br/>LLM API]
    end
    
    UI -->|REST API| GW
    GW -->|Invoke| RUNNER
    RUNNER -->|Execute| ROOT
    
    ROOT -->|Sequential| INT
    ROOT -->|Sequential| GRAD
    ROOT -->|Sequential| TASK
    ROOT -->|Sequential| CV
    ROOT -->|Sequential| EVENT
    
    INT -.->|Read/Write| STATE
    GRAD -.->|Read/Write| STATE
    TASK -.->|Read/Write| STATE
    CV -.->|Read/Write| STATE
    EVENT -.->|Read/Write| STATE
    
    GRAD -->|Wrapped in| LOOP
    TASK -->|Can use| PARALLEL
    
    INT -->|LLM Calls| GEMINI
    GRAD -->|LLM Calls| GEMINI
    TASK -->|LLM Calls| GEMINI
    CV -->|LLM Calls| GEMINI
    EVENT -->|LLM Calls| GEMINI
    
    STATE -->|Persist| FS
    FS -->|Load| STATE
    
    RUNNER -->|Return Events| GW
    GW -->|Response| UI
    
    style ROOT fill:#4285f4,color:#fff
    style INT fill:#34a853,color:#fff
    style GRAD fill:#34a853,color:#fff
    style TASK fill:#34a853,color:#fff
    style CV fill:#34a853,color:#fff
    style EVENT fill:#34a853,color:#fff
    style LOOP fill:#fbbc04,color:#000
    style PARALLEL fill:#fbbc04,color:#000
    style STATE fill:#ea4335,color:#fff
```

## Pattern Explanations

### SequentialAgent (Root Agent)
The Root Agent orchestrates all sub-agents in sequence. Each agent completes before the next begins, with state passed through the session.state dictionary.

### LlmAgent (Individual Agents)
Each specialized agent uses Gemini 2.5 Flash to perform its specific task:
- **Interviewer**: Reads profession/level → Generates questions
- **Grader**: Reads questions/answers → Returns score/feedback
- **Task Generator**: Reads profession/level → Creates work task
- **CV Writer**: Reads completed tasks → Generates resume bullets
- **Event Generator**: Reads profession/performance → Creates career event

### LoopAgent (Retry Logic)
Wraps the Grader Agent to allow task retries. If a player fails a task, they get one more attempt with feedback.

### ParallelAgent (Concurrent Execution)
Demonstrates running multiple task generators simultaneously for all four professions, showcasing ADK's parallel execution capabilities.
