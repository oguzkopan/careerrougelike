# Building CareerRoguelike: A Multi-Agent AI Job Market Simulator on Google Cloud Run

## How I Built a Production-Ready AI Application with 7 Specialized Agents in 2 Weeks

*This article was created for the Google Cloud Run Hackathon (AI Agents Category)*

---

## 🎯 The Challenge

What if you could simulate an entire career journey—from graduation to senior leadership—powered entirely by AI? That's the question I set out to answer with **CareerRoguelike**, a gamified job market simulator that uses Google's Agent Development Kit (ADK) and Cloud Run to create a dynamic, intelligent career experience.

**Try it live:** https://career-rl-frontend-1086514937351.europe-west1.run.app

---

## 🏗️ The Architecture: 7 Agents, One Orchestrator

The heart of CareerRoguelike is a sophisticated multi-agent system where specialized AI agents collaborate to create a realistic job market experience. Here's how it works:

### The Agent Team

1. **Job Agent** - Generates 10 profession-specific job listings with realistic salaries, requirements, and company details
2. **Interview Agent** - Creates 3-5 job-specific interview questions tailored to the position
3. **Grader Agent** - Evaluates answers with strict criteria, providing scores and constructive feedback
4. **Task Agent** - Generates work assignments in multiple formats (text, multiple choice, matching, code review)
5. **CV Agent** - Updates your resume with accomplishments, skills, and professional bullet points
6. **Meeting Generator Agent** - Creates virtual workplace meetings with AI colleagues
7. **Meeting Evaluation Agent** - Scores your participation and generates follow-up tasks

### The Orchestrator Pattern

Instead of letting agents run independently, I implemented a **Workflow Orchestrator** that:
- Coordinates all agent execution
- Calls Gemini 2.5 Flash API directly for reliability
- Manages state through Cloud Firestore
- Handles errors with intelligent fallbacks
- Ensures consistent data flow

This centralized approach provides better control, debugging, and scalability than distributed agent systems.



---

## 🚀 Why Cloud Run Was Perfect for This

Cloud Run proved to be the ideal platform for a multi-agent AI application:

### 1. **Serverless Scalability**
- Scales to zero when not in use (cost = $0)
- Automatically scales up to handle traffic spikes
- No infrastructure management required

### 2. **Fast Cold Starts**
- 3-5 second cold start for first request
- <1 second for warm requests
- Perfect for interactive AI applications

### 3. **Generous Timeouts**
- 300-second request timeout
- Enough time for complex AI workflows
- Multiple agent invocations in single request

### 4. **Easy Deployment**
```bash
# Deploy backend
gcloud run deploy career-rl-backend \
  --source ./backend \
  --region europe-west1 \
  --allow-unauthenticated

# Deploy frontend
gcloud run deploy career-rl-frontend \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated
```

That's it! No Kubernetes, no load balancers, no complex configuration.

---

## 🤖 The AI Magic: How Agents Collaborate

Let me walk you through a complete workflow to show how agents work together:

### Example: Task Completion Flow

```
1. Player submits a task solution
   ↓
2. Gateway validates request and retrieves task details
   ↓
3. Orchestrator calls Grader Agent via Gemini API
   ↓
4. Grader Agent evaluates solution:
   - Pre-validates (length, relevance, gibberish detection)
   - AI grades against requirements
   - Generates score (0-100) and feedback
   ↓
5. If passed (≥70):
   - Orchestrator awards XP
   - Checks for level up
   - Calls CV Agent to add accomplishment
   - Generates new task if needed
   ↓
6. Firestore updates:
   - Task marked complete
   - Player XP increased
   - Stats updated
   - CV updated
   ↓
7. Response sent to frontend with:
   - Score and feedback
   - XP gained
   - Level up notification
   - New task (if generated)
```

**Time:** 2-3 seconds for the entire workflow

---

## 💡 Key Technical Decisions

### 1. Direct Gemini API Calls vs ADK Runner

I initially tried using ADK's Runner for agent orchestration, but switched to direct Gemini API calls for several reasons:

**Pros of Direct API:**
- More reliable (fewer abstraction layers)
- Better error handling
- Easier debugging
- Faster response times
- More control over prompts

**When to Use ADK Runner:**
- Complex multi-turn conversations
- Need for built-in session management
- Rapid prototyping

### 2. Firestore for State Management

Cloud Firestore was perfect for this application:

**Collections:**
- `sessions/` - Player state, level, XP, current job
- `jobs/` - Generated job listings
- `tasks/` - Work assignments
- `meetings/` - Virtual meeting scenarios

**Why Firestore?**
- NoSQL flexibility for evolving schemas
- Real-time updates (future feature)
- Automatic scaling
- Strong consistency for critical updates (XP, level-ups)
- Easy querying (get active tasks, filter jobs)

### 3. Strict Grading with Pre-Validation

One challenge was preventing players from gaming the system with gibberish answers. I implemented a two-stage grading system:

**Stage 1: Pre-Validation (Fast)**
```python
# Automatic fail conditions
if not answer or len(answer.split()) < 5:
    return score=0, feedback="Answer too short"

if answer.lower() in ["i don't know", "idk", "no idea"]:
    return score=5, feedback="No substantive content"

if unique_words < 4 and word_count < 10:
    return score=5, feedback="Appears to be gibberish"
```

**Stage 2: AI Grading (Thorough)**
Only valid answers reach Gemini API for detailed evaluation.

This approach:
- Saves API costs (no wasted calls on gibberish)
- Provides instant feedback for obvious failures
- Reserves AI for nuanced evaluation

---

## 📊 Performance Metrics

After deploying to Cloud Run, here's what I observed:

| Metric | Value | Notes |
|--------|-------|-------|
| Cold Start | 3-5s | First request after idle |
| Warm Request | <1s | Subsequent requests |
| Job Generation | 2-3s | 10 jobs via Gemini |
| Interview Questions | 1.5-2s | 3-5 questions |
| Answer Grading | 1-2s | Per question |
| Task Generation | 2-2.5s | Single task |
| Meeting Generation | 2-3s | Full meeting scenario |
| Concurrent Sessions | 100+ | Tested successfully |
| Cost (idle) | $0 | Scales to zero |

---

## 🎮 The Player Experience

Here's what makes CareerRoguelike unique:

### 1. **Dynamic Job Market**
Every job listing is AI-generated based on:
- Your profession (iOS Engineer, Data Analyst, Designer, Sales, etc.)
- Your level (1-10)
- Market-appropriate salaries
- Realistic requirements and responsibilities

### 2. **Intelligent Interviews**
Interview questions are tailored to:
- The specific job you're applying for
- The company's requirements
- Your experience level
- Industry best practices

### 3. **Varied Work Tasks**
Tasks come in multiple formats:
- **Text Answer**: Open-ended questions
- **Multiple Choice**: Technical knowledge tests
- **Fill in the Blank**: Code completion, documentation
- **Matching**: Concepts to definitions
- **Code Review**: Find bugs in code snippets
- **Prioritization**: Rank items by importance

### 4. **Virtual Meetings**
Participate in realistic workplace meetings:
- **Team Standups**: Quick updates and blockers
- **One-on-Ones**: Career development discussions
- **Project Reviews**: Status updates and problem-solving
- **Stakeholder Presentations**: Present to executives
- **Performance Reviews**: Feedback and goal-setting

AI colleagues have distinct personalities (supportive, analytical, direct, challenging) and respond naturally to your contributions.

**Bidirectional Intelligence:**
- Complete 2-4 tasks → Triggers project review meeting
- Fail a task 2+ times → Triggers feedback session
- Complete meeting → Generates 0-3 follow-up tasks
- Dashboard automatically replenishes tasks and meetings

### 5. **Career Progression**
- Start at Level 1 (Junior)
- Complete tasks to earn XP
- Level up to unlock better jobs
- Build your CV automatically
- Track your career stats

---

## 🔧 Technical Stack

**Frontend:**
- React 18 + TypeScript
- Vite for fast builds
- TailwindCSS for styling
- React Query for API state
- Deployed on Cloud Run (nginx)

**Backend:**
- Python 3.9 + FastAPI
- Google ADK (Agent Development Kit)
- Gemini 2.5 Flash for all AI
- Cloud Firestore for persistence
- Deployed on Cloud Run (uvicorn)

**Infrastructure:**
- Google Cloud Run (serverless)
- Cloud Firestore (NoSQL database)
- Vertex AI / Gemini API
- Cloud Build (CI/CD)
- Artifact Registry (container images)

---

## 🚧 Challenges & Solutions

### Challenge 1: Agent Reliability

**Problem:** ADK Runner occasionally failed with cryptic errors.

**Solution:** Switched to direct Gemini API calls with:
- Retry logic (3 attempts with exponential backoff)
- Fallback responses for failures
- Detailed error logging
- Graceful degradation

### Challenge 2: Grading Consistency

**Problem:** AI grading was sometimes too lenient or harsh.

**Solution:** Implemented strict grading rubric:
- Pre-validation for obvious failures
- Keyword presence checks
- Concept understanding evaluation
- Consistent scoring scale (0-100, pass ≥70)
- Detailed feedback generation

### Challenge 3: Task Generation Quality

**Problem:** AI sometimes generated tasks requiring external documents.

**Solution:** Enhanced prompts with strict rules:
- "NEVER reference attached documents"
- "Include all necessary data in description"
- "Make tasks self-contained and solvable"
- Validation to convert incomplete tasks to simpler formats

### Challenge 4: Meeting Conversation Flow

**Problem:** AI participants sometimes repeated points or went off-topic.

**Solution:** Implemented conversation management:
- Track conversation history
- Detect repetition
- Determine topic completion
- Generate smooth transitions
- Time-based meeting conclusion

### Challenge 5: Bidirectional Task-Meeting System

**Problem:** Tasks and meetings felt disconnected; dashboard would run empty.

**Solution:** Implemented intelligent bidirectional generation:
- Tasks trigger meetings after 2-4 completions
- Task failures (2+ attempts) trigger feedback meetings
- Meetings generate 0-3 follow-up tasks
- Automatic dashboard replenishment (target: 3-5 tasks, 1-2 meetings)
- Context propagation between tasks and meetings

---

## 📈 What I Learned

### 1. **Orchestration > Autonomy**
For production applications, centralized orchestration beats autonomous agents. You get:
- Better error handling
- Easier debugging
- Consistent behavior
- Predictable costs

### 2. **Prompt Engineering is Critical**
Spent 40% of development time refining prompts:
- Clear instructions
- Structured output formats
- Edge case handling
- Fallback behaviors

### 3. **Pre-Validation Saves Money**
Filtering obvious failures before AI calls:
- Reduced API costs by ~30%
- Improved response times
- Better user experience

### 4. **Cloud Run is Production-Ready**
No issues with:
- Scaling
- Reliability
- Performance
- Deployment

### 5. **Firestore is Flexible**
NoSQL was perfect for:
- Evolving schemas
- Complex nested data
- Fast queries
- Atomic updates

---

## 🎯 Results

After 2 weeks of development:

✅ **7 specialized AI agents** working in harmony
✅ **100% serverless** on Cloud Run
✅ **Production-ready** with error handling
✅ **Scales to zero** (cost-efficient)
✅ **Fast response times** (<3s for most operations)
✅ **Rich user experience** with multiple game mechanics
✅ **Comprehensive documentation** for future developers

---

## 🔮 Future Enhancements

Ideas for v2:

1. **Real-time Multiplayer**
   - Compete with other players
   - Shared job market
   - Leaderboards

2. **Advanced Analytics**
   - Career path recommendations
   - Skill gap analysis
   - Market trends

3. **More Professions**
   - 20+ career paths
   - Industry-specific mechanics
   - Cross-functional roles

4. **Company Simulation**
   - Build your own company
   - Hire AI employees
   - Manage projects

5. **Voice Interactions**
   - Voice-based interviews
   - Speech-to-text for meetings
   - Natural conversation

---

## 💭 Final Thoughts

Building CareerRoguelike taught me that **multi-agent AI systems are ready for production**—if you architect them correctly. The key insights:

1. **Orchestrate, don't distribute** - Centralized control beats autonomous chaos
2. **Cloud Run is perfect for AI** - Serverless + generous timeouts = win
3. **Gemini 2.5 Flash is fast** - 1-3 second responses for complex tasks
4. **Pre-validation matters** - Filter garbage before expensive AI calls
5. **User experience first** - AI is the engine, not the product

The future of AI applications isn't just about having smart agents—it's about orchestrating them into coherent, reliable, delightful experiences.

---

## 🔗 Links

- **Live Demo:** https://career-rl-frontend-1086514937351.europe-west1.run.app
- **GitHub:** [Your GitHub URL]
- **Architecture Docs:** See BACKEND_MULTI_AGENT_ARCHITECTURE.md
- **API Docs:** See API-DOCUMENTATION.md

---

## 🙏 Acknowledgments

Built for the **Google Cloud Run Hackathon** (AI Agents Category)

Technologies used:
- Google Cloud Run
- Google Gemini 2.5 Flash
- Google Cloud Firestore
- Google Agent Development Kit (ADK)
- React + TypeScript
- Python + FastAPI

---

**Want to build your own multi-agent AI application?** Start with Cloud Run and Gemini API. The infrastructure is ready—you just need the idea.

*Questions? Comments? Let me know in the comments below!*

---

**Tags:** #GoogleCloud #CloudRun #AI #Gemini #MultiAgent #Serverless #Python #React #GameDev #Hackathon

