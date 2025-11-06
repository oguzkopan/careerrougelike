# CareerRoguelike Screenshots Guide

Guide for capturing high-quality screenshots for documentation and hackathon submission.

---

## Required Screenshots

### 1. Graduation Screen
**Filename**: `01-graduation-screen.png`

**What to capture**:
- Full screen showing graduation message
- "Start Job Search" button prominently displayed
- Any animations or confetti effects
- Clean, professional look

**Tips**:
- Use fresh session (clear browser cache)
- Capture at 1920x1080 resolution
- Ensure button is in hover state for visual appeal

---

### 2. Job Listings View
**Filename**: `02-job-listings.png`

**What to capture**:
- Grid of 6-10 job cards visible
- Color coding (green/blue/purple) for different levels
- Company names, positions, salary ranges
- "View Details" buttons
- Stats panel showing player level and XP

**Tips**:
- Scroll to show variety of jobs
- Ensure at least 3 different job levels visible
- Capture with realistic company names
- Show filter/sort controls if implemented

---

### 3. Job Detail View
**Filename**: `03-job-detail.png`

**What to capture**:
- Full job description
- Requirements list
- Responsibilities list
- Benefits list
- Salary range and job type
- "Start Interview" button
- "Back to Listings" button

**Tips**:
- Choose a mid-level position for best example
- Ensure all sections are visible (may need to scroll and stitch)
- Show company logo placeholder
- Highlight key information

---

### 4. Interview Questions
**Filename**: `04-interview-questions.png`

**What to capture**:
- 3-5 interview questions displayed
- Text areas for answers
- Progress indicator (Question X of Y)
- Job title and company name at top
- "Submit Answers" button

**Tips**:
- Fill in sample answers to show interaction
- Show character count if implemented
- Capture with professional-looking questions
- Ensure all questions fit in viewport

---

### 5. Interview Results (Pass)
**Filename**: `05-interview-results-pass.png`

**What to capture**:
- Pass animation or confetti
- Overall score (e.g., 85/100)
- Feedback for each question
- "Accept Offer" and "Decline Offer" buttons
- Positive, encouraging message

**Tips**:
- Capture during or just after animation
- Show detailed feedback for at least 2 questions
- Ensure score is clearly visible
- Highlight constructive feedback

---

### 6. Interview Results (Fail) - Optional
**Filename**: `06-interview-results-fail.png`

**What to capture**:
- Fail message
- Score below 70
- Constructive feedback
- "Back to Job Listings" button
- Encouraging message to try again

**Tips**:
- Show how system handles failure gracefully
- Highlight helpful feedback
- Demonstrate learning opportunity

---

### 7. Work Dashboard
**Filename**: `07-work-dashboard.png`

**What to capture**:
- Current job info card (company, position, salary, start date)
- Stats panel (level, XP bar, statistics)
- Task panel with 3-5 task cards
- Navigation buttons (Job Search, View CV)
- Clean, organized layout

**Tips**:
- Ensure XP bar shows partial progress
- Show variety of task difficulties
- Capture with realistic job information
- Highlight key UI elements

---

### 8. Task Detail Modal
**Filename**: `08-task-detail.png`

**What to capture**:
- Task title and description
- Requirements list
- Acceptance criteria
- Difficulty rating (stars or number)
- XP reward
- Solution text area
- "Submit Solution" button

**Tips**:
- Choose a mid-difficulty task
- Fill in sample solution to show interaction
- Ensure all criteria are visible
- Show professional task description

---

### 9. Task Success with XP
**Filename**: `09-task-success.png`

**What to capture**:
- Success message
- Score and feedback
- XP gained animation
- Updated XP bar
- Level up notification (if applicable)
- New task appearing

**Tips**:
- Capture during XP count-up animation
- Show before/after XP values
- Highlight level up if it occurs
- Demonstrate progression system

---

### 10. CV View
**Filename**: `10-cv-view.png`

**What to capture**:
- Personal info (name, level, total XP)
- Job history with dates
- Accomplishments for each job
- Skills list
- Career statistics
- Professional resume layout

**Tips**:
- Show at least 2 jobs in history
- Include 5-10 accomplishments
- Display 10-15 skills
- Ensure professional formatting
- Show "Export to PDF" button if implemented

---

### 11. Job Switching Flow
**Filename**: `11-job-switching.png`

**What to capture**:
- Job listings while employed
- Current job indicator
- New job comparison (salary, title)
- "Apply" or "Start Interview" button
- Status showing player is employed

**Tips**:
- Show higher-level jobs available
- Highlight salary increase opportunity
- Demonstrate career progression
- Show seamless transition

---

### 12. Level Up Animation
**Filename**: `12-level-up.png`

**What to capture**:
- Level up notification
- New level badge
- XP bar resetting
- Celebration animation
- Unlocked features message (if any)

**Tips**:
- Capture during animation peak
- Show clear level change (e.g., 3 → 4)
- Highlight visual effects
- Demonstrate reward system

---

## Technical Screenshots

### 13. Architecture Diagram
**Filename**: `13-architecture.png`

**What to capture**:
- System architecture diagram
- Frontend, backend, agents, database
- Data flow arrows
- Technology labels
- Clean, professional diagram

**Tips**:
- Use high-resolution export
- Ensure all text is readable
- Use consistent colors
- Add legend if needed

---

### 14. Cloud Run Console
**Filename**: `14-cloud-run.png`

**What to capture**:
- Both services (frontend and backend)
- Service URLs
- Instance counts
- Memory and CPU allocation
- Region (europe-west1)
- Status (healthy)

**Tips**:
- Show services list view
- Highlight key metrics
- Ensure URLs are visible
- Demonstrate serverless deployment

---

### 15. Firestore Collections
**Filename**: `15-firestore.png`

**What to capture**:
- Collections list (sessions, jobs, tasks)
- Sample document structure
- Field names and types
- Indexes if configured
- Data organization

**Tips**:
- Show at least one document expanded
- Highlight key fields
- Demonstrate data structure
- Ensure no sensitive data visible

---

### 16. Agent Code Example
**Filename**: `16-agent-code.png`

**What to capture**:
- One agent definition (e.g., job_agent.py)
- LlmAgent configuration
- Instruction prompt
- Output key
- Clean, readable code

**Tips**:
- Use syntax highlighting
- Show complete agent definition
- Ensure code is well-formatted
- Highlight key components

---

### 17. API Request/Response
**Filename**: `17-api-example.png`

**What to capture**:
- Browser DevTools Network tab
- API request (e.g., POST /jobs/generate)
- Request payload
- Response data
- Status code (200)

**Tips**:
- Use formatted JSON view
- Show realistic data
- Highlight key fields
- Demonstrate API design

---

### 18. Mobile Responsive View
**Filename**: `18-mobile-view.png`

**What to capture**:
- Mobile viewport (375x667 or similar)
- Key screens (job listings, dashboard)
- Responsive layout
- Touch-friendly buttons
- Readable text

**Tips**:
- Use browser DevTools device mode
- Show 2-3 screens side by side
- Demonstrate responsive design
- Ensure usability on mobile

---

## Screenshot Specifications

### Technical Requirements
- **Resolution**: 1920x1080 (desktop), 375x667 (mobile)
- **Format**: PNG (lossless)
- **Color Space**: sRGB
- **DPI**: 72 (web) or 144 (retina)
- **File Size**: < 2MB per image

### Quality Guidelines
- **Clarity**: Sharp, no blur or compression artifacts
- **Lighting**: Consistent brightness across screenshots
- **Colors**: Accurate color representation
- **Text**: All text must be readable
- **UI**: No browser chrome unless relevant

### Composition Tips
- **Framing**: Center important elements
- **Whitespace**: Leave breathing room around content
- **Focus**: Highlight key features
- **Context**: Show enough UI for understanding
- **Consistency**: Use same browser/theme for all shots

---

## Tools and Setup

### Recommended Tools
- **macOS**: Cmd+Shift+4 (native), CleanShot X (paid)
- **Windows**: Snipping Tool, ShareX (free)
- **Linux**: Flameshot, GNOME Screenshot
- **Browser**: Chrome DevTools (F12)
- **Editing**: Figma, Photoshop, GIMP

### Browser Setup
1. **Clear cache** for fresh experience
2. **Disable extensions** (except React DevTools)
3. **Use incognito mode** for clean state
4. **Set zoom to 100%**
5. **Hide bookmarks bar** (Cmd+Shift+B)
6. **Full screen mode** (F11) for clean capture

### Screen Recording Alternative
If screenshots aren't enough, record screen:
- **macOS**: QuickTime, ScreenFlow
- **Windows**: OBS Studio, Camtasia
- **Linux**: SimpleScreenRecorder, OBS Studio
- **Settings**: 1080p, 30fps, H.264 codec

---

## Annotation Guidelines

### When to Annotate
- Highlight new features
- Point out AI-generated content
- Show data flow
- Explain complex interactions
- Guide viewer's attention

### Annotation Tools
- **Arrows**: Point to specific elements
- **Circles**: Highlight important areas
- **Text boxes**: Add explanations
- **Numbers**: Show sequence of steps
- **Colors**: Use brand colors consistently

### Annotation Best Practices
- Keep annotations minimal
- Use consistent style
- Don't obscure important content
- Use readable font size (14pt+)
- Maintain visual hierarchy

---

## Organization

### File Naming Convention
```
[number]-[section]-[description].png

Examples:
01-graduation-screen.png
02-job-listings.png
03-job-detail.png
```

### Folder Structure
```
screenshots/
├── user-flow/
│   ├── 01-graduation-screen.png
│   ├── 02-job-listings.png
│   ├── 03-job-detail.png
│   └── ...
├── technical/
│   ├── 13-architecture.png
│   ├── 14-cloud-run.png
│   └── ...
├── mobile/
│   ├── 18-mobile-view.png
│   └── ...
└── annotated/
    ├── 01-graduation-annotated.png
    └── ...
```

---

## Usage in Documentation

### README.md
```markdown
## Screenshots

### Graduation Screen
![Graduation](screenshots/user-flow/01-graduation-screen.png)

### Job Listings
![Job Listings](screenshots/user-flow/02-job-listings.png)
```

### Hackathon Submission
- Include 3-5 key screenshots
- Show complete user flow
- Highlight technical architecture
- Demonstrate multi-agent collaboration

### Demo Video
- Use screenshots as B-roll
- Overlay annotations during narration
- Show before/after comparisons
- Highlight key features

---

## Checklist

Before submitting screenshots:

- [ ] All 18 screenshots captured
- [ ] Consistent resolution and quality
- [ ] No sensitive data visible
- [ ] Professional appearance
- [ ] Readable text and UI
- [ ] Proper file naming
- [ ] Organized in folders
- [ ] Annotated versions created (if needed)
- [ ] Compressed for web (if needed)
- [ ] Backed up in multiple locations

---

**Last Updated**: November 6, 2025
