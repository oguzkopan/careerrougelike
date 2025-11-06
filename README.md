<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CareerRoguelike – Multi-Agent Profession Simulator

A gamified career simulation powered by Google's Agent Development Kit (ADK) and deployed on Google Cloud Run.

**Built for the Google Cloud Run Hackathon**

## 🎮 Try It Out

**Live Demo**: https://career-rl-frontend-1086514937351.europe-west1.run.app

## 🏗️ Architecture

This application demonstrates advanced multi-agent AI collaboration:

- **Frontend**: React + Vite application served by nginx on Cloud Run
- **Backend**: Python FastAPI + Google ADK multi-agent system on Cloud Run
- **Database**: Google Cloud Firestore for session persistence
- **AI**: Gemini 2.5 Flash for all agent reasoning

### Deployed Services

- **Frontend URL**: https://career-rl-frontend-1086514937351.europe-west1.run.app
- **Backend URL**: https://career-rl-backend-1086514937351.europe-west1.run.app
- **Project**: careerrogue-4df28
- **Region**: europe-west1

## 📚 Documentation

- [Quick Reference](QUICK-REFERENCE.md) - Common commands and quick fixes
- [Frontend Deployment Guide](FRONTEND-DEPLOYMENT.md) - Detailed deployment instructions
- [Backend README](backend/README.md) - Detailed ADK architecture and agent workflows
- [Deployment Verification](DEPLOYMENT-VERIFICATION.md) - Deployment status and tests
- [Cleanup Summary](CLEANUP-SUMMARY.md) - Frontend cleanup details
- [Hackathon Submission](backend/HACKATHON-SUBMISSION.md) - Submission details

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

- **Multi-Agent AI System**: Specialized agents for interviews, grading, task generation, CV writing, and events
- **ADK Patterns**: Demonstrates SequentialAgent, ParallelAgent, and LoopAgent
- **Cloud-Native**: Auto-scaling, scale-to-zero, serverless architecture
- **Real-time Collaboration**: Agents communicate through ADK's event system
- **Persistent State**: Firestore integration for session management

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
