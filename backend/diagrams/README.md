# Documentation and Diagrams

This folder contains comprehensive documentation and visual diagrams for the CareerRoguelike Backend project.

## Contents

### Architecture Diagrams
- **[agent-workflow.md](./agent-workflow.md)** - Visual representation of how agents communicate through ADK patterns (Sequential, Parallel, Loop)
- **[state-flow.md](./state-flow.md)** - Detailed sequence diagram showing how session.state evolves throughout the game flow
- **[adk-patterns.md](./adk-patterns.md)** - In-depth explanation of Sequential, Parallel, and Loop patterns with code examples

### Testing and Demo
- **[testing-guide.md](./testing-guide.md)** - Comprehensive guide for testing agents locally with ADK CLI, including expected outputs and troubleshooting
- **[demo-video-script.md](./demo-video-script.md)** - Complete script for recording the 3-minute demo video, with timing, visuals, and key points

## Quick Links

### For Developers
Start with [testing-guide.md](./testing-guide.md) to learn how to test agents locally.

### For Understanding Architecture
Review [agent-workflow.md](./agent-workflow.md) and [adk-patterns.md](./adk-patterns.md) to understand the multi-agent system.

### For Demo Preparation
Follow [demo-video-script.md](./demo-video-script.md) to record your demo video.

### For Debugging
Use [state-flow.md](./state-flow.md) to understand how data flows through the system.

## Rendering Mermaid Diagrams

The diagrams use Mermaid syntax. To render them:

### In GitHub
GitHub automatically renders Mermaid diagrams in markdown files.

### Locally
Use one of these tools:
- **VS Code**: Install "Markdown Preview Mermaid Support" extension
- **Mermaid Live Editor**: https://mermaid.live/
- **CLI**: `npm install -g @mermaid-js/mermaid-cli` then `mmdc -i diagram.md -o diagram.png`

### Export to PNG
For the hackathon submission, export diagrams to PNG:

```bash
# Install mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Export diagrams
mmdc -i agent-workflow.md -o agent-workflow.png
mmdc -i state-flow.md -o state-flow.png
mmdc -i adk-patterns.md -o adk-patterns.png
```

## Documentation Structure

```
diagrams/
├── README.md                    # This file
├── agent-workflow.md            # High-level architecture
├── state-flow.md                # State management flow
├── adk-patterns.md              # ADK pattern examples
├── testing-guide.md             # Testing instructions
└── demo-video-script.md         # Demo video guide
```

## Key Concepts

### Multi-Agent Collaboration
The system demonstrates excellent multi-agent collaboration through:
1. **Specialized Agents**: Each agent has a specific role
2. **Shared State**: Agents communicate via session.state dictionary
3. **Event-Driven**: Loose coupling through ADK's event system
4. **Orchestration**: Root Agent coordinates the workflow

### ADK Patterns
Three patterns are demonstrated:
1. **SequentialAgent**: Run agents in order (Interview → Grade → Task → CV)
2. **ParallelAgent**: Run agents concurrently (4x speedup for task generation)
3. **LoopAgent**: Retry logic with feedback (task grading with second chance)

### State Management
All agents read from and write to `session.state`:
- **Transparent**: All data flow is visible
- **Persistent**: State is saved to Firestore
- **Accumulative**: State grows as agents add data
- **Accessible**: Frontend can query any state key

## Contributing

When adding new diagrams or documentation:
1. Use Mermaid for diagrams (consistent style)
2. Include code examples where relevant
3. Add clear explanations and context
4. Update this README with new files
5. Test that diagrams render correctly

## Questions?

See the main [README.md](../README.md) for project overview and setup instructions.
