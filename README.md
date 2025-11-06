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

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│  Graduation → Job Search → Interview → Work → Career Growth │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API
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

## 📚 Documentation

> **📑 [Documentation Index](DOCUMENTATION-INDEX.md)** - Complete guide to all documentation

### Getting Started
- [Quick Reference](QUICK-REFERENCE.md) - Common commands and quick fixes
- [API Documentation](API-DOCUMENTATION.md) - Complete REST API reference with examples
- [Architecture Guide](ARCHITECTURE.md) - System architecture and design patterns

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

## 🎮 How It Works

### Complete Career Journey

1. **🎓 Graduation**: Start as a fresh graduate ready to enter the job market
2. **💼 Job Search**: Browse 10 AI-generated job listings tailored to your level
3. **📋 Job Details**: View complete job descriptions, requirements, and benefits
4. **🎤 Interview**: Answer 3-5 job-specific questions generated by AI
5. **✅ Evaluation**: Receive detailed feedback and pass/fail results
6. **🎉 Job Offer**: Accept the position and start working
7. **📝 Work Tasks**: Complete profession-specific assignments to gain XP
8. **📈 Level Up**: Progress from Level 1 (Junior) to Level 10 (Expert)
9. **🔄 Job Switch**: Search for better opportunities as you advance
10. **📄 CV Growth**: Your resume automatically updates with accomplishments

### AI Agents in Action

**Job Agent** → Generates realistic job listings
```
Input: Player level 3
Output: 10 jobs (entry to mid-level positions)
- TechCorp: Senior iOS Engineer ($100k-$140k)
- DataFlow: Data Analyst ($80k-$110k)
- DesignHub: Product Designer ($90k-$120k)
```

**Interview Agent** → Creates job-specific questions
```
Input: iOS Engineer position
Output: 3-5 technical questions
- "Explain weak vs strong references in Swift"
- "How would you optimize a UITableView?"
- "Describe your SwiftUI experience"
```

**Grader Agent** → Evaluates with feedback
```
Input: Player's answer
Output: Score (0-100) + detailed feedback
- Score: 85/100 ✅ Pass
- "Excellent explanation of memory management..."
```

**Task Agent** → Generates work assignments
```
Input: iOS Engineer, Level 3
Output: Profession-specific task
- "Implement OAuth 2.0 authentication"
- Difficulty: 5/10, XP Reward: 50
```

**CV Agent** → Updates resume automatically
```
Input: Completed task
Output: Updated CV
- Added: "Implemented OAuth 2.0 authentication system"
- Skills: Swift, OAuth 2.0, Security
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
- **📋 Work Tasks**: Profession-specific assignments that match your current job
- **📈 Career Progression**: Gain XP, level up, and unlock higher-tier positions
- **📄 Auto-Updated CV**: Your resume grows with your accomplishments
- **🔄 Job Switching**: Search for better opportunities while employed

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

- **Multi-Agent Architecture**: 5+ specialized AI agents working together
- **Google ADK**: Showcases Sequential, Parallel, and Loop agent patterns
- **Cloud Run**: Fully serverless, auto-scaling deployment
- **Gemini 2.5 Flash**: Fast, efficient AI reasoning
- **Firestore**: Cloud-native persistence
- **Production-Ready**: Docker, nginx, CORS, health checks

## 📄 License

MIT

## 🙏 Acknowledgments

Built with Google's Agent Development Kit (ADK) for the Google Cloud Run Hackathon.
