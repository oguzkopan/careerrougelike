/**
 * Backend API Service
 * 
 * Connects to the Cloud Run backend for multi-agent ADK workflow
 */

import { Profession, PlayerProfile, Task, StoryEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Cloud Run backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://career-rl-backend-1086514937351.europe-west1.run.app';

/**
 * Create a new game session
 */
export const createSession = async (profession: Profession): Promise<{ sessionId: string }> => {
    const response = await fetch(`${BACKEND_URL}/sessions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            profession: profession.id,
            level: 1,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
    }

    const data = await response.json();
    return { sessionId: data.session_id };
};

/**
 * Invoke an agent action
 */
export const invokeAgent = async (
    sessionId: string,
    action: string,
    data: Record<string, any> = {}
): Promise<{ result: any; state: any }> => {
    const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}/invoke`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action,
            data,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to invoke agent: ${response.statusText}`);
    }

    return await response.json();
};

/**
 * Get session state
 */
export const getSession = async (sessionId: string): Promise<any> => {
    const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return await response.json();
};

/**
 * Get CV data
 */
export const getCV = async (sessionId: string): Promise<{ bullets: string[]; skills: string[] }> => {
    const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}/cv`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get CV: ${response.statusText}`);
    }

    return await response.json();
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<{ status: string }> => {
    const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
    }

    return await response.json();
};


/**
 * Start a new game session (compatible with old apiService interface)
 */
export const startSession = async (profession: Profession, seed?: string): Promise<{ sessionId: string; initialTask: Task; playerProfile: PlayerProfile }> => {
    // Create session
    const { sessionId } = await createSession(profession);
    
    // Create initial player profile
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
    
    // Generate interview question via backend
    const { result } = await invokeAgent(sessionId, 'interview', {});
    
    const initialTask: Task = {
        id: uuidv4(),
        type: 'interview',
        title: 'Initial Screening Interview',
        description: result.content || 'Tell us about your experience and why you want this role.',
        prompt: 'Provide your answer below.',
    };
    
    return { sessionId, initialTask, playerProfile };
};

/**
 * Submit an answer to a task (compatible with old apiService interface)
 */
export const submitAnswer = async (sessionId: string, taskId: string, answer: string): Promise<{ 
    feedback: string; 
    score: number; 
    nextTask: Task | null; 
    newProfile: PlayerProfile; 
    newStoryEvent: StoryEvent 
}> => {
    // Submit answer to backend for grading
    const { result, state } = await invokeAgent(sessionId, 'submit_answer', { answer });
    
    // Parse grading result
    const gradingResult = result.grading_result || { score: 70, passed: true, feedback: 'Good answer!' };
    const score = Math.floor(gradingResult.score / 10); // Convert 0-100 to 0-10
    const feedback = gradingResult.feedback || 'Your answer has been evaluated.';
    
    // Get updated session
    const session = await getSession(sessionId);
    const playerProfile: PlayerProfile = {
        name: "Player One",
        profession: session.profession,
        level: session.level || 1,
        score: (session.state?.total_score || 0) + score,
        cv: session.state?.cv_data?.bullets || [],
        skills: session.state?.cv_data?.skills || [],
    };
    
    // Determine next task
    let nextTask: Task | null = null;
    let newStoryEvent: StoryEvent;
    
    if (gradingResult.passed) {
        // Generate next task
        const { result: taskResult } = await invokeAgent(sessionId, 'generate_task', {});
        const taskData = taskResult.current_task || {};
        
        nextTask = {
            id: uuidv4(),
            type: 'task',
            title: 'Your Next Task',
            description: taskData.task_prompt || 'Complete your assigned work.',
            prompt: 'Provide your solution below.',
        };
        
        newStoryEvent = { 
            type: 'system', 
            content: `Great job! You passed with a score of ${score}/10. Moving on to your next task.` 
        };
    } else {
        newStoryEvent = { 
            type: 'system', 
            content: `Score: ${score}/10. ${feedback}. Keep trying!` 
        };
    }
    
    return { feedback, score, nextTask, newProfile: playerProfile, newStoryEvent };
};

/**
 * Submit an event choice (compatible with old apiService interface)
 */
export const submitEventChoice = async (sessionId: string, taskId: string, choice: string): Promise<{ 
    nextTask: Task; 
    newProfile: PlayerProfile; 
    newStoryEvent: StoryEvent 
}> => {
    // Process event choice via backend
    const { result, state } = await invokeAgent(sessionId, 'handle_event', { choice });
    
    // Get updated session
    const session = await getSession(sessionId);
    const playerProfile: PlayerProfile = {
        name: "Player One",
        profession: session.profession,
        level: session.level || 1,
        score: session.state?.total_score || 0,
        cv: session.state?.cv_data?.bullets || [],
        skills: session.state?.cv_data?.skills || [],
    };
    
    // Generate next task
    const { result: taskResult } = await invokeAgent(sessionId, 'generate_task', {});
    const taskData = taskResult.current_task || {};
    
    const nextTask: Task = {
        id: uuidv4(),
        type: 'task',
        title: 'Your Next Task',
        description: taskData.task_prompt || 'Complete your assigned work.',
        prompt: 'Provide your solution below.',
    };
    
    const newStoryEvent: StoryEvent = {
        type: 'system',
        content: result.content || 'Event handled. Moving forward with your next task.'
    };
    
    return { nextTask, newProfile: playerProfile, newStoryEvent };
};
