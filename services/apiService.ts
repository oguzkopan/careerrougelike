import { Profession, PlayerProfile, Task, StoryEvent, AgentType } from '../types';
import { generateWithAgent } from './geminiService';
import { v4 as uuidv4 } from 'uuid';

// --- MOCKED DATABASE ---
let mockSession: {
    sessionId: string;
    playerProfile: PlayerProfile;
    taskCounter: number;
    currentTask: Task | null;
    seed?: string;
} | null = null;
// --- END MOCKED DATABASE ---

export const startSession = async (profession: Profession, seed?: string): Promise<{ sessionId: string; initialTask: Task; playerProfile: PlayerProfile; }> => {
    const sessionId = uuidv4();
    const playerProfile: PlayerProfile = {
        name: "Player One",
        profession,
        level: 1,
        score: 0,
        cv: [{
            id: uuidv4(),
            role: `Aspiring ${profession.name}`,
            company: 'CareerRoguelike University',
            duration: '2024 - Present',
            bulletPoints: ['Completed rigorous training and simulation exercises.']
        }],
        skills: [],
    };

    const interviewQuestion = await generateWithAgent(AgentType.INTERVIEWER, { profession, level: 1 });

    const initialTask: Task = {
        id: uuidv4(),
        type: 'interview',
        title: 'Initial Screening Interview',
        description: interviewQuestion,
        prompt: 'Provide your answer below.',
    };

    mockSession = { sessionId, playerProfile, taskCounter: 0, seed, currentTask: initialTask };

    return { sessionId, initialTask, playerProfile };
};


export const submitAnswer = async (sessionId: string, taskId: string, answer: string): Promise<{ feedback: string; score: number; nextTask: Task | null; newProfile: PlayerProfile; newStoryEvent: StoryEvent; }> => {
    if (!mockSession || mockSession.sessionId !== sessionId) {
        throw new Error("Invalid session.");
    }
    
    // In a real app, we'd look up the task by taskId. Here we assume it's the current one.
    const currentTaskDescription = `An interview question for a ${mockSession.playerProfile.profession.name} role.`;

    const gradingResult = await generateWithAgent(AgentType.AUTO_GRADER, {
        profession: mockSession.playerProfile.profession,
        level: mockSession.playerProfile.level,
        taskDescription: currentTaskDescription,
        userAnswer: answer,
    });

    const { score, feedback } = gradingResult;
    mockSession.playerProfile.score += score;
    mockSession.taskCounter += 1;
    
    // Onboarding after interview
    if (mockSession.taskCounter === 1) {
       const companyUpdate = await generateWithAgent(AgentType.COMPANY_SIMULATOR, {
            profession: mockSession.playerProfile.profession,
            level: mockSession.playerProfile.level,
       });

       const newStoryEvent: StoryEvent = { type: 'system', content: `Congratulations, you've been hired! Welcome to the team. ${companyUpdate}` };

       const nextTask: Task = {
           id: uuidv4(),
           type: 'task',
           title: 'Your First On-the-job Task',
           description: `As a new hire, your first task is to get familiar with the codebase. Review the documentation for the 'Phoenix' project and summarize its main components.`,
           prompt: 'Provide your summary below.',
       };
       
       mockSession.currentTask = nextTask;
       return { feedback, score, nextTask, newProfile: mockSession.playerProfile, newStoryEvent };
    }
    
    // Trigger an event every 2 tasks
    if (mockSession.taskCounter > 1 && mockSession.taskCounter % 2 !== 0) {
        const eventResult = await generateWithAgent(AgentType.EVENT_GENERATOR, {
            profession: mockSession.playerProfile.profession,
            level: mockSession.playerProfile.level,
        });
        const newStoryEvent: StoryEvent = { type: 'event', content: 'A new event is unfolding!' };
        const eventTask: Task = {
            id: uuidv4(),
            type: 'event',
            title: 'A Random Event Occurred',
            description: eventResult.description,
            prompt: 'What do you do?',
            choices: eventResult.choices,
        };
        mockSession.currentTask = eventTask;
        return { feedback, score, nextTask: eventTask, newProfile: mockSession.playerProfile, newStoryEvent };
    }


    // Placeholder for subsequent tasks
    if (mockSession.taskCounter < 10) { // End after 10 turns
         const companyUpdate = await generateWithAgent(AgentType.COMPANY_SIMULATOR, {
            profession: mockSession.playerProfile.profession,
            level: mockSession.playerProfile.level,
       });
       const newStoryEvent: StoryEvent = { type: 'system', content: `New week, new challenges. ${companyUpdate}` };
       const nextTask: Task = {
           id: uuidv4(),
           type: 'task',
           title: `Week ${Math.floor(mockSession.taskCounter / 2)} Task`,
           description: `A new task has been assigned to you. Details are in the project management tool. Your manager has asked you to prioritize addressing a bug in the payments module.`,
           prompt: 'Outline your plan to tackle this bug.',
       };
        mockSession.currentTask = nextTask;
        return { feedback, score, nextTask, newProfile: mockSession.playerProfile, newStoryEvent };
    }
    
    // End of game
    const newStoryEvent: StoryEvent = { type: 'system', content: 'Your trial period is over. Well done!' };
    mockSession.currentTask = null;
    return { feedback, score, nextTask: null, newProfile: mockSession.playerProfile, newStoryEvent };
};

export const submitEventChoice = async (sessionId: string, taskId: string, choice: string): Promise<{ nextTask: Task; newProfile: PlayerProfile; newStoryEvent: StoryEvent; }> => {
    if (!mockSession || mockSession.sessionId !== sessionId) {
        throw new Error("Invalid session.");
    }
    
    if (!mockSession.currentTask || mockSession.currentTask.type !== 'event') {
        throw new Error("Cannot submit a choice when not in an event.");
    }

    mockSession.playerProfile.score += 2; // Small bonus for handling the event

    const consequenceText = await generateWithAgent(AgentType.EVENT_RESOLVER, {
        eventDescription: mockSession.currentTask.description,
        playerChoice: choice,
    });

    const consequence: StoryEvent = {
        type: 'system',
        content: consequenceText
    };

    // Generate the next proper task after the event is handled
    const companyUpdate = await generateWithAgent(AgentType.COMPANY_SIMULATOR, {
        profession: mockSession.playerProfile.profession,
        level: mockSession.playerProfile.level,
    });
    const newStoryEvent: StoryEvent = { type: 'system', content: `With the event handled, it's time for your next task. ${companyUpdate}` };
    const nextTask: Task = {
        id: uuidv4(),
        type: 'task',
        title: `Week ${Math.floor(mockSession.taskCounter / 2)} Follow-up Task`,
        description: `Following the recent event, your manager wants you to focus on a new priority. A bug has been reported in the user authentication flow.`,
        prompt: 'Investigate the bug and outline your fix.',
    };
    
    mockSession.currentTask = nextTask;
    return { nextTask, newProfile: mockSession.playerProfile, newStoryEvent: consequence };
};