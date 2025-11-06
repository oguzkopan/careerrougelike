# Demo Video Script

**Duration**: 3 minutes  
**Target**: Google Cloud Run Hackathon judges  
**Focus**: Excellent multi-agent collaboration using Google ADK

---

## Video Structure

### Opening (0:00 - 0:20)

**Visual**: Title slide with project logo

**Script**:
> "Hi! I'm excited to show you CareerRoguelike Backend - a multi-agent AI system built with Google's Agent Development Kit and deployed on Cloud Run. This project demonstrates excellent multi-agent collaboration where specialized AI agents work together to create a gamified career simulation."

**On Screen**:
- Project title: "CareerRoguelike Backend"
- Subtitle: "Multi-Agent AI with Google ADK & Cloud Run"
- Built for Google Cloud Run Hackathon

---

### Section 1: Architecture Overview (0:20 - 0:50)

**Visual**: Show architecture diagram from `diagrams/agent-workflow.md`

**Script**:
> "The system uses five specialized AI agents, each powered by Gemini 2.5 Flash. The Interviewer Agent generates profession-specific questions. The Grader Agent evaluates answers and provides feedback. The Task Generator creates realistic work tasks. The CV Writer updates your resume based on accomplishments. And the Event Generator creates dynamic career scenarios."

**On Screen**:
- Highlight each agent as mentioned
- Show arrows indicating communication flow
- Emphasize "session.state" dictionary for data sharing

**Key Points**:
- 5 specialized agents
- All use Gemini 2.5 Flash
- Communicate via shared state
- Orchestrated by Root Agent

---

### Section 2: Code Walkthrough (0:50 - 1:20)

**Visual**: VS Code showing agent code

**Script**:
> "Let me show you the code. Here's the Interviewer Agent - it's an ADK LlmAgent that reads profession and level from state, generates three interview questions, and stores them in the interview_questions key. The Grader Agent reads those questions and the player's answer, evaluates them using Gemini, and returns a score, pass/fail status, and detailed feedback."

**On Screen**:
```python
# Show interviewer_agent.py
interviewer_agent = LlmAgent(
    name="InterviewerAgent",
    model="gemini-2.5-flash",
    instruction="Generate 3 interview questions for {profession} at level {level}",
    output_key="interview_questions"
)

# Show grader_agent.py
grader_agent = LlmAgent(
    name="GraderAgent",
    model="gemini-2.5-flash",
    instruction="Evaluate answer and return score, passed, feedback",
    output_key="grading_result"
)
```

**Key Points**:
- Simple, clean agent definitions
- Clear input/output keys
- Gemini 2.5 Flash for reasoning

---

### Section 3: ADK Patterns (1:20 - 1:50)

**Visual**: Show `diagrams/adk-patterns.md` diagrams

**Script**:
> "The project showcases three ADK patterns. First, the SequentialAgent pattern - the Root Agent runs sub-agents in order, passing state between them. Second, the ParallelAgent pattern - we generate tasks for all four professions simultaneously, which is 4 times faster than sequential execution. Third, the LoopAgent pattern - the Grader is wrapped in a loop to allow task retries, giving players a second chance with feedback."

**On Screen**:
- Show Sequential diagram: Interview → Grade → Task → CV
- Show Parallel diagram: 4 task generators running concurrently
- Show Loop diagram: Grader with retry logic

**Key Points**:
- SequentialAgent for orchestration
- ParallelAgent for speed (4x faster)
- LoopAgent for retry logic

---

### Section 4: Live Demo with ADK Web UI (1:50 - 2:20)

**Visual**: ADK web UI at localhost:8000

**Script**:
> "Let's see it in action using ADK's web interface. I'll start an interview for iOS Engineer at level 3. Watch as the Interviewer Agent generates three technical questions. Now I'll submit an answer about ARC in Swift. The Grader Agent evaluates it, gives me a score of 85, marks it as passed, and provides constructive feedback. Notice how the state updates in real-time - you can see the interview_questions and grading_result keys being populated."

**On Screen**:
1. Type: "Interview for iOS Engineer level 3"
2. Show generated questions
3. Submit answer about ARC
4. Show grading result with score and feedback
5. Highlight state inspector showing updated keys

**Key Points**:
- Real-time agent execution
- State updates visible
- Constructive feedback from AI

---

### Section 5: Cloud Run Deployment (2:20 - 2:45)

**Visual**: Google Cloud Console showing Cloud Run service

**Script**:
> "The entire system is deployed on Cloud Run. Here's the deployed service running in europe-west1. It's configured to scale from zero to ten instances automatically. When idle, it costs nothing. Under load, it scales up instantly. The FastAPI gateway exposes REST endpoints that the frontend calls to invoke agent workflows. State is persisted to Firestore, so sessions survive across requests."

**On Screen**:
- Cloud Run service dashboard
- Show metrics: requests, latency, instances
- Show environment variables (GOOGLE_API_KEY, PROJECT_ID)
- Show logs with agent execution traces
- Show Firestore collection with session documents

**Key Points**:
- Serverless deployment
- Auto-scaling (0-10 instances)
- Firestore persistence
- Production-ready

---

### Section 6: End-to-End Flow (2:45 - 3:00)

**Visual**: Quick montage of complete workflow

**Script**:
> "To recap: a player selects a profession, the Interviewer Agent generates questions, the Grader evaluates answers, the Task Generator creates work tasks, the Grader evaluates task submissions with retry logic, the CV Writer updates the resume, and the Event Generator creates dynamic career events. All of this is powered by excellent multi-agent collaboration using Google ADK, Gemini 2.5 Flash, and Cloud Run. Thank you!"

**On Screen**:
- Fast-paced sequence showing:
  - Session creation
  - Interview questions
  - Grading result
  - Task generation
  - CV update
  - Event with choices
- End with project GitHub URL and Cloud Run URL

**Key Points**:
- Complete workflow demonstrated
- Multi-agent collaboration
- Google Cloud technologies

---

## Recording Checklist

### Pre-Recording
- [ ] Clean up desktop and browser tabs
- [ ] Close unnecessary applications
- [ ] Set screen resolution to 1920x1080
- [ ] Test microphone audio quality
- [ ] Prepare all code files and diagrams
- [ ] Start ADK web UI: `adk web --port 8000`
- [ ] Have Cloud Console open with service deployed
- [ ] Have Firestore console open
- [ ] Prepare example session for demo

### During Recording
- [ ] Speak clearly and at moderate pace
- [ ] Use cursor to highlight important elements
- [ ] Zoom in on code when needed
- [ ] Show state updates in real-time
- [ ] Demonstrate actual agent execution (not mocked)
- [ ] Keep energy high and enthusiasm genuine

### Post-Recording
- [ ] Edit for clarity and pacing
- [ ] Add captions/subtitles
- [ ] Add background music (optional, subtle)
- [ ] Add text overlays for key points
- [ ] Export at 1080p, 30fps
- [ ] Upload to YouTube
- [ ] Set title: "CareerRoguelike: Multi-Agent AI with Google ADK & Cloud Run"
- [ ] Add description with links
- [ ] Add tags: #CloudRunHackathon, #GoogleADK, #Gemini, #MultiAgent
- [ ] Set thumbnail with project logo

---

## Video Description Template

```
CareerRoguelike Backend - Multi-Agent AI System

Built for the Google Cloud Run Hackathon, this project demonstrates excellent multi-agent collaboration using Google's Agent Development Kit (ADK).

🎯 Key Features:
• 5 specialized AI agents powered by Gemini 2.5 Flash
• Sequential, Parallel, and Loop agent patterns
• Event-driven communication via shared state
• Deployed on Cloud Run with auto-scaling
• Firestore for state persistence
• FastAPI REST gateway

🏗️ Architecture:
• Interviewer Agent: Generates profession-specific questions
• Grader Agent: Evaluates answers with detailed feedback
• Task Generator: Creates realistic work tasks
• CV Writer: Updates resume from accomplishments
• Event Generator: Creates dynamic career scenarios

🚀 Technologies:
• Google ADK (Agent Development Kit)
• Gemini 2.5 Flash
• Google Cloud Run
• Firestore
• FastAPI
• Docker

🔗 Links:
• GitHub: [your-repo-url]
• Cloud Run: [your-service-url]
• Documentation: [readme-url]

#CloudRunHackathon #GoogleADK #Gemini #MultiAgent #CloudRun #AI #Python
```

---

## Screenshot Locations

Capture these screenshots for the video:

1. **Architecture Diagram**: `backend/diagrams/agent-workflow.md` (rendered)
2. **Code - Interviewer Agent**: `backend/agents/interviewer_agent.py`
3. **Code - Root Agent**: `backend/agents/root_agent.py`
4. **ADK Patterns Diagram**: `backend/diagrams/adk-patterns.md` (rendered)
5. **ADK Web UI - Chat**: http://localhost:8000
6. **ADK Web UI - State Inspector**: http://localhost:8000 (state tab)
7. **Cloud Run Dashboard**: Google Cloud Console
8. **Cloud Run Logs**: Google Cloud Console (showing agent execution)
9. **Firestore Console**: Google Cloud Console (showing session documents)
10. **API Response**: Postman or curl showing JSON response

---

## Alternative: Screen Recording Tools

### macOS
- **QuickTime Player**: Built-in, simple
- **OBS Studio**: Free, professional features
- **ScreenFlow**: Paid, excellent editing

### Recording Settings
- Resolution: 1920x1080
- Frame Rate: 30fps
- Audio: 44.1kHz, stereo
- Format: MP4 (H.264)

### Editing Software
- **iMovie**: Free, simple
- **Final Cut Pro**: Professional
- **DaVinci Resolve**: Free, powerful

---

## Tips for Great Demo Video

1. **Start Strong**: Hook viewers in first 10 seconds
2. **Show, Don't Tell**: Demonstrate actual functionality
3. **Highlight Innovation**: Emphasize multi-agent collaboration
4. **Keep Pace**: 3 minutes goes fast, stay focused
5. **Professional Quality**: Good audio is more important than video
6. **Clear Visuals**: Zoom in on code, use high contrast
7. **Enthusiasm**: Show genuine excitement about the project
8. **Call to Action**: End with GitHub and Cloud Run URLs

---

## Backup Plan: Slide Deck

If live demo has issues, prepare backup slides:

1. Title slide
2. Architecture diagram
3. Code snippets (agents)
4. ADK patterns diagrams
5. Screenshots of working system
6. Cloud Run deployment
7. Performance metrics
8. Conclusion with links

Export as PDF and have ready during recording.
