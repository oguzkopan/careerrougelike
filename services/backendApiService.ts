/**
 * Backend API Service
 * 
 * Connects to the Cloud Run backend for multi-agent ADK workflow
 */

import { 
    Profession, 
    PlayerProfile, 
    Task, 
    StoryEvent, 
    JobListing, 
    PlayerState, 
    WorkTask,
    Meeting,
    MeetingSummary,
    MeetingParticipant,
    ConversationMessage,
    MeetingTopic,
    MeetingState,
    ValidationResult
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transformJob, transformJobs } from '../utils/jobTransform';

// Re-export useQueryClient for use in components
export { useQueryClient };

// Cloud Run backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://career-rl-backend-1086514937351.europe-west1.run.app';

// Meeting-specific types for API responses
export interface MeetingDetails {
    meeting_data: Meeting & {
        topics: MeetingTopic[];
        objective: string;
        elapsed_time_minutes?: number;
    };
    conversation_history: ConversationMessage[];
    current_topic_index: number;
    is_player_turn: boolean;
    is_processing: boolean;
    meeting_complete: boolean;
}

export interface MeetingTurnResponse {
    ai_messages?: ConversationMessage[];
    conversation_history?: ConversationMessage[];
    meeting_complete?: boolean;
    topic_complete?: boolean;
    current_topic_index?: number;
    next_topic_index?: number;
    transition_message?: string;
    is_player_turn?: boolean;
    evaluation?: {
        score: number;
        xp_earned: number;
        strengths: string[];
        improvements: string[];
    };
    outcomes?: MeetingSummary;
}

// Error types
export class SessionExpiredError extends Error {
    constructor(message = 'Session has expired') {
        super(message);
        this.name = 'SessionExpiredError';
    }
}

export class NetworkError extends Error {
    constructor(message = 'Network connection failed') {
        super(message);
        this.name = 'NetworkError';
    }
}

export class AgentError extends Error {
    constructor(message = 'AI agent failed to process request') {
        super(message);
        this.name = 'AgentError';
    }
}

/**
 * Enhanced fetch with timeout and error handling
 */
const fetchWithTimeout = async (
    url: string,
    options: RequestInit = {},
    timeout = 30000
): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new NetworkError('Request timed out. Please check your connection.');
        }
        throw new NetworkError('Failed to connect to server. Please check your internet connection.');
    }
};

/**
 * Handle API response errors
 */
const handleApiError = async (response: Response, context: string): Promise<never> => {
    let errorMessage = `${context}: ${response.statusText}`;
    
    try {
        const errorData = await response.json();
        if (errorData.detail) {
            errorMessage = errorData.detail;
        }
    } catch {
        // If we can't parse error JSON, use status text
    }

    // Check for session expiry
    if (response.status === 404 && errorMessage.toLowerCase().includes('session')) {
        throw new SessionExpiredError('Your session has expired. Please start a new game.');
    }

    // Check for agent failures
    if (response.status === 500 || response.status === 503) {
        throw new AgentError('Our AI service is temporarily unavailable. Please try again.');
    }

    // Check for network issues
    if (response.status === 0 || !response.ok) {
        throw new NetworkError(errorMessage);
    }

    throw new Error(errorMessage);
};

/**
 * Retry logic for failed requests
 */
const retryRequest = async <T>(
    fn: () => Promise<T>,
    maxRetries = 2,
    delay = 1000
): Promise<T> => {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            
            // Don't retry on session expiry or validation errors
            if (error instanceof SessionExpiredError || 
                (error instanceof Error && error.message.includes('validation'))) {
                throw error;
            }
            
            // Don't retry if we've exhausted attempts
            if (i === maxRetries) {
                throw error;
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
    
    throw lastError!;
};

/**
 * Create a new game session
 */
export const createSession = async (profession: Profession): Promise<{ sessionId: string }> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions`, {
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
            await handleApiError(response, 'Failed to create session');
        }

        const data = await response.json();
        return { sessionId: data.session_id };
    });
};

/**
 * Delete a session and all associated data
 */
export const deleteSession = async (sessionId: string): Promise<{ success: boolean }> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            await handleApiError(response, 'Failed to delete session');
        }

        const data = await response.json();
        return { success: data.success };
    });
};

/**
 * Invoke an agent action
 */
export const invokeAgent = async (
    sessionId: string,
    action: string,
    data: Record<string, any> = {}
): Promise<{ result: any; state: any }> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/invoke`, {
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
            await handleApiError(response, 'Failed to invoke agent');
        }

        return await response.json();
    });
};

/**
 * Get session state
 */
export const getSession = async (sessionId: string): Promise<any> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            await handleApiError(response, 'Failed to get session');
        }

        return await response.json();
    });
};

/**
 * Get CV data
 */
export const getCV = async (sessionId: string): Promise<{ bullets: string[]; skills: string[] }> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/cv`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            await handleApiError(response, 'Failed to get CV');
        }

        return await response.json();
    });
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<{ status: string }> => {
    const response = await fetchWithTimeout(`${BACKEND_URL}/health`, {
        method: 'GET',
    }, 5000); // Shorter timeout for health check

    if (!response.ok) {
        throw new NetworkError('Backend service is unavailable');
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

/**
 * Generate job listings
 */
export const generateJobListings = async (
    sessionId: string,
    playerLevel: number = 1,
    count: number = 10
): Promise<JobListing[]> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/jobs/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                player_level: playerLevel,
                count,
            }),
        }, 45000); // Longer timeout for AI generation

        if (!response.ok) {
            await handleApiError(response, 'Failed to generate job listings');
        }

        const data = await response.json();
        return transformJobs(data.jobs || []);
    });
};

/**
 * Get job detail
 */
export const getJobDetail = async (sessionId: string, jobId: string): Promise<JobListing> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/jobs/${jobId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            await handleApiError(response, 'Failed to get job detail');
        }

        const data = await response.json();
        return transformJob(data);
    });
};

/**
 * Refresh job listings
 */
export const refreshJobListings = async (sessionId: string, playerLevel: number = 1): Promise<JobListing[]> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/jobs/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                player_level: playerLevel,
            }),
        }, 45000); // Longer timeout for AI generation

        if (!response.ok) {
            await handleApiError(response, 'Failed to refresh job listings');
        }

        const data = await response.json();
        return transformJobs(data.jobs || []);
    });
};

/**
 * Start interview for a job
 */
export const startInterview = async (
    sessionId: string,
    jobId: string
): Promise<{ questions: Array<{ id: string; question: string; expectedAnswer?: string }> }> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/jobs/${jobId}/interview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }, 45000); // Longer timeout for AI generation

        if (!response.ok) {
            await handleApiError(response, 'Failed to start interview');
        }

        return await response.json();
    });
};

/**
 * Submit interview answers
 */
export const submitInterviewAnswers = async (
    sessionId: string,
    jobId: string,
    answers: Record<string, string>
): Promise<{
    passed: boolean;
    overallScore: number;
    feedback: Array<{
        question: string;
        answer: string;
        score: number;
        feedback: string;
    }>;
}> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/jobs/${jobId}/interview/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ answers }),
        }, 60000); // Longer timeout for grading multiple answers

        if (!response.ok) {
            await handleApiError(response, 'Failed to submit interview answers');
        }

        return await response.json();
    });
};

/**
 * Accept job offer
 */
export const acceptJobOffer = async (sessionId: string, jobId: string): Promise<void> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/jobs/${jobId}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }, 90000); // Extended timeout for CV update and task generation (3 tasks with AI)

        if (!response.ok) {
            await handleApiError(response, 'Failed to accept job offer');
        }
    });
};

/**
 * React Query hook for job listings
 */
export const useJobListings = (sessionId: string | null, playerLevel: number = 1) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['jobListings', sessionId, playerLevel],
        queryFn: () => {
            if (!sessionId) throw new Error('No session ID');
            return generateJobListings(sessionId, playerLevel);
        },
        enabled: !!sessionId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error) => {
            // Don't retry on session expiry
            if (error instanceof SessionExpiredError) return false;
            // Retry up to 2 times for other errors
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    const refreshMutation = useMutation({
        mutationFn: () => {
            if (!sessionId) throw new Error('No session ID');
            return refreshJobListings(sessionId, playerLevel);
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['jobListings', sessionId, playerLevel], data);
        },
        retry: 1,
    });

    return {
        listings: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
        refresh: refreshMutation.mutate,
        isRefreshing: refreshMutation.isPending,
        refreshError: refreshMutation.error,
    };
};

/**
 * React Query hook for interview
 */
export const useInterview = (sessionId: string | null, jobId: string | null) => {
    const queryClient = useQueryClient();

    // Query to get interview questions
    const questionsQuery = useQuery({
        queryKey: ['interview', sessionId, jobId],
        queryFn: () => {
            if (!sessionId || !jobId) throw new Error('Missing session ID or job ID');
            return startInterview(sessionId, jobId);
        },
        enabled: !!sessionId && !!jobId,
        retry: (failureCount, error) => {
            if (error instanceof SessionExpiredError) return false;
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: Infinity, // Don't refetch questions once loaded
    });

    // Mutation to submit answers
    const submitMutation = useMutation({
        mutationFn: ({ answers }: { answers: Record<string, string> }) => {
            if (!sessionId || !jobId) throw new Error('Missing session ID or job ID');
            return submitInterviewAnswers(sessionId, jobId, answers);
        },
        retry: 1,
    });

    // Mutation to accept job offer
    const acceptOfferMutation = useMutation({
        mutationFn: () => {
            if (!sessionId || !jobId) throw new Error('Missing session ID or job ID');
            return acceptJobOffer(sessionId, jobId);
        },
        onSuccess: () => {
            // Invalidate relevant queries after accepting offer
            queryClient.invalidateQueries({ queryKey: ['playerState', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['tasks', sessionId] });
        },
        retry: 1,
    });

    return {
        questions: questionsQuery.data?.questions || [],
        isLoadingQuestions: questionsQuery.isLoading,
        isErrorQuestions: questionsQuery.isError,
        errorQuestions: questionsQuery.error,
        refetchQuestions: questionsQuery.refetch,
        submitAnswers: submitMutation.mutate,
        submitAnswersAsync: submitMutation.mutateAsync,
        isSubmitting: submitMutation.isPending,
        submitResult: submitMutation.data,
        submitError: submitMutation.error,
        acceptOffer: acceptOfferMutation.mutate,
        acceptOfferAsync: acceptOfferMutation.mutateAsync,
        isAcceptingOffer: acceptOfferMutation.isPending,
        acceptOfferError: acceptOfferMutation.error,
    };
};

/**
 * Get player state
 */
export const getPlayerState = async (sessionId: string): Promise<PlayerState> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/state`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            await handleApiError(response, 'Failed to get player state');
        }

        const data = await response.json();
        
        // Transform snake_case to camelCase for frontend
        return {
            ...data,
            sessionId: data.session_id || sessionId,
            xpToNextLevel: data.xp_to_next_level || data.xpToNextLevel,
            currentJob: data.current_job ? {
                jobId: data.current_job.job_id,
                companyName: data.current_job.company_name,
                position: data.current_job.position,
                startDate: data.current_job.start_date,
                salary: data.current_job.salary
            } : undefined,
            stats: {
                tasksCompleted: data.stats?.tasks_completed || 0,
                jobsHeld: data.stats?.jobs_held || 0,
                interviewsPassed: data.stats?.interviews_passed || 0,
                interviewsFailed: data.stats?.interviews_failed || 0
            },
            cv_data: data.cv_data
        };
    });
};

/**
 * Get active tasks
 */
export const getTasks = async (sessionId: string): Promise<WorkTask[]> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/tasks`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            await handleApiError(response, 'Failed to get tasks');
        }

        const data = await response.json();
        const tasks = data.tasks || [];
        
        // Transform snake_case to camelCase
        return tasks.map((task: any) => ({
            ...task,
            xpReward: task.xp_reward || task.xpReward || 100,
            createdAt: task.created_at || task.createdAt,
            updatedAt: task.updated_at || task.updatedAt,
            dueDate: task.due_date || task.dueDate,
            formatType: task.format_type || task.formatType,
            acceptanceCriteria: task.acceptance_criteria || task.acceptanceCriteria,
            imageUrl: task.image_url || task.imageUrl,
            correctAnswer: task.correct_answer || task.correctAnswer,
            blankText: task.blank_text || task.blankText
        }));
    });
};

/**
 * Submit task solution
 */
export const submitTaskSolution = async (
    sessionId: string,
    taskId: string,
    solution: string
): Promise<{
    score: number;
    feedback: string;
    xpGained: number;
    leveledUp: boolean;
    newLevel?: number;
}> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/tasks/${taskId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ solution }),
        }, 60000); // Longer timeout for grading and task generation

        if (!response.ok) {
            await handleApiError(response, 'Failed to submit task solution');
        }

        return await response.json();
    });
};

/**
 * React Query hook for player state
 */
export const usePlayerState = (sessionId: string | null) => {
    return useQuery({
        queryKey: ['playerState', sessionId],
        queryFn: () => {
            if (!sessionId) throw new Error('No session ID');
            return getPlayerState(sessionId);
        },
        enabled: !!sessionId,
        refetchInterval: 30000, // Auto-refresh every 30 seconds
        retry: (failureCount, error) => {
            if (error instanceof SessionExpiredError) return false;
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 10000, // Consider data stale after 10 seconds
    });
};

/**
 * React Query hook for tasks
 */
export const useTasks = (sessionId: string | null) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['tasks', sessionId],
        queryFn: () => {
            if (!sessionId) throw new Error('No session ID');
            return getTasks(sessionId);
        },
        enabled: !!sessionId,
        retry: (failureCount, error) => {
            if (error instanceof SessionExpiredError) return false;
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 5000,
    });

    const submitMutation = useMutation({
        mutationFn: ({ taskId, solution }: { taskId: string; solution: string }) => {
            if (!sessionId) throw new Error('No session ID');
            return submitTaskSolution(sessionId, taskId, solution);
        },
        onSuccess: () => {
            // Invalidate and refetch tasks and player state after submission
            queryClient.invalidateQueries({ queryKey: ['tasks', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['playerState', sessionId] });
        },
        retry: 1,
    });

    return {
        tasks: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
        submitTask: submitMutation.mutate,
        submitTaskAsync: submitMutation.mutateAsync,
        isSubmitting: submitMutation.isPending,
        submitResult: submitMutation.data,
        submitError: submitMutation.error,
    };
};

/**
 * Submit voice answer for interview question
 */
export const submitInterviewVoiceAnswer = async (
    sessionId: string,
    questionId: string,
    audioBlob: Blob
): Promise<{
    transcription: string;
    score: number;
    passed: boolean;
    feedback: string;
}> => {
    // Validate inputs
    if (!sessionId || !questionId) {
        throw new Error('Session ID and Question ID are required');
    }
    
    if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Audio blob is empty or invalid');
    }
    
    // Validate audio format
    const validAudioTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
    const blobType = audioBlob.type.split(';')[0]; // Remove codec info
    
    if (!validAudioTypes.includes(blobType)) {
        throw new Error(`Invalid audio format: ${audioBlob.type}. Supported formats: WebM, MP3, WAV`);
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (audioBlob.size > maxSize) {
        throw new Error('Audio file too large. Maximum size is 10MB');
    }
    
    return retryRequest(async () => {
        // Construct FormData with proper MIME type
        const formData = new FormData();
        formData.append('question_id', questionId);
        
        // Determine file extension based on MIME type
        let extension = 'webm';
        if (blobType.includes('mp3') || blobType.includes('mpeg')) {
            extension = 'mp3';
        } else if (blobType.includes('wav')) {
            extension = 'wav';
        } else if (blobType.includes('ogg')) {
            extension = 'ogg';
        }
        
        formData.append('audio', audioBlob, `answer.${extension}`);

        const response = await fetchWithTimeout(
            `${BACKEND_URL}/sessions/${sessionId}/interview/voice`,
            {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header - let browser set it with boundary
            },
            90000 // Longer timeout for audio processing
        );

        if (!response.ok) {
            await handleApiError(response, 'Failed to submit voice answer');
        }

        return await response.json();
    }, 1); // Only retry once for voice submissions
};

/**
 * Submit voice solution for task
 */
export const submitTaskVoiceSolution = async (
    sessionId: string,
    taskId: string,
    audioBlob: Blob
): Promise<{
    transcription: string;
    score: number;
    feedback: string;
    xpGained: number;
    leveledUp: boolean;
    newLevel?: number;
}> => {
    return retryRequest(async () => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'solution.webm');

        const response = await fetchWithTimeout(
            `${BACKEND_URL}/sessions/${sessionId}/tasks/${taskId}/voice`,
            {
                method: 'POST',
                body: formData,
            },
            90000 // Longer timeout for audio processing
        );

        if (!response.ok) {
            await handleApiError(response, 'Failed to submit voice solution');
        }

        return await response.json();
    });
};

// ============================================================================
// MEETING API FUNCTIONS AND HOOKS
// ============================================================================
// Comprehensive meeting state management with:
// - API service functions for all meeting endpoints
// - React Query hooks with real-time updates and caching
// - Optimistic UI updates for better UX
// - Error handling and retry logic
// - Conversation history caching
// ============================================================================

/**
 * Get meetings for a session
 */
export const getMeetings = async (sessionId: string): Promise<Meeting[]> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(`${BACKEND_URL}/sessions/${sessionId}/meetings`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            await handleApiError(response, 'Failed to get meetings');
        }

        const data = await response.json();
        return data.meetings || [];
    });
};

/**
 * Get meeting details
 */
export const getMeetingDetails = async (sessionId: string, meetingId: string): Promise<MeetingDetails> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(
            `${BACKEND_URL}/sessions/${sessionId}/meetings/${meetingId}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            await handleApiError(response, 'Failed to get meeting details');
        }

        return await response.json();
    });
};

/**
 * Generate a new meeting
 */
export const generateMeeting = async (
    sessionId: string,
    trigger?: string
): Promise<Meeting> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(
            `${BACKEND_URL}/sessions/${sessionId}/meetings/generate`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ trigger: trigger || 'manual' }),
            },
            45000 // Longer timeout for AI generation
        );

        if (!response.ok) {
            await handleApiError(response, 'Failed to generate meeting');
        }

        return await response.json();
    });
};

/**
 * Join a meeting
 * Returns meeting state with conversation history and turn management
 */
export const joinMeeting = async (sessionId: string, meetingId: string): Promise<MeetingState> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(
            `${BACKEND_URL}/sessions/${sessionId}/meetings/${meetingId}/join`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            45000 // Longer timeout for initial AI discussion generation
        );

        if (!response.ok) {
            await handleApiError(response, 'Failed to join meeting');
        }

        const data = await response.json();
        
        // Ensure all required fields are present in the response
        return {
            meeting_data: data.meeting_data,
            conversation_history: data.conversation_history || [],
            current_topic_index: data.current_topic_index ?? 0,
            is_player_turn: data.is_player_turn ?? false,
            is_processing: data.is_processing ?? false,
            meeting_complete: data.meeting_complete ?? false,
        };
    }, 2, 1000); // Retry up to 2 times with 1s delay
};

/**
 * Submit response to meeting
 * Handles player input and returns AI reactions with updated meeting state
 */
export const submitMeetingResponse = async (
    sessionId: string,
    meetingId: string,
    topicId: string,
    response: string
): Promise<MeetingTurnResponse> => {
    return retryRequest(async () => {
        const apiResponse = await fetchWithTimeout(
            `${BACKEND_URL}/sessions/${sessionId}/meetings/${meetingId}/respond`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topic_id: topicId, response }),
            },
            60000 // Longer timeout for AI response generation
        );

        if (!apiResponse.ok) {
            await handleApiError(apiResponse, 'Failed to submit meeting response');
        }

        const data = await apiResponse.json();
        
        // Normalize response format
        return {
            ai_messages: data.ai_messages || [],
            conversation_history: data.conversation_history || [],
            meeting_complete: data.meeting_complete ?? false,
            topic_complete: data.topic_complete ?? false,
            current_topic_index: data.current_topic_index,
            next_topic_index: data.next_topic_index,
            transition_message: data.transition_message,
            is_player_turn: data.is_player_turn ?? false,
            evaluation: data.evaluation,
            outcomes: data.outcomes,
        };
    }, 2, 1000); // Retry up to 2 times with 1s delay
};

/**
 * Respond to a meeting topic (alias for submitMeetingResponse)
 */
export const respondToTopic = async (
    sessionId: string,
    meetingId: string,
    topicId: string,
    response: string
): Promise<{
    ai_responses: any[];
    evaluation: any;
    next_topic_index: number;
    meeting_complete: boolean;
}> => {
    const result = await submitMeetingResponse(sessionId, meetingId, topicId, response);
    return {
        ai_responses: result.ai_messages || [],
        evaluation: result.evaluation || {},
        next_topic_index: result.next_topic_index || 0,
        meeting_complete: result.meeting_complete || false
    };
};

/**
 * Start a new topic in an ongoing meeting
 * Returns topic introduction and initial AI discussion messages
 */
export const startMeetingTopic = async (
    sessionId: string,
    meetingId: string,
    topicIndex: number
): Promise<{
    messages: any[];
    current_topic_index: number;
    is_player_turn: boolean;
}> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(
            `${BACKEND_URL}/sessions/${sessionId}/meetings/${meetingId}/topics/${topicIndex}/start`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            30000
        );

        if (!response.ok) {
            await handleApiError(response, 'Failed to start meeting topic');
        }

        return await response.json();
    });
};

/**
 * Complete a meeting and get full summary
 * Generates tasks, awards XP, and returns meeting outcomes
 */
export const completeMeeting = async (
    sessionId: string,
    meetingId: string
): Promise<any> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(
            `${BACKEND_URL}/sessions/${sessionId}/meetings/${meetingId}/complete`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            60000 // Longer timeout for task generation
        );

        if (!response.ok) {
            await handleApiError(response, 'Failed to complete meeting');
        }

        return await response.json();
    });
};

/**
 * Leave a meeting early
 * Marks meeting as left_early and returns partial XP summary
 */
export const leaveMeeting = async (
    sessionId: string,
    meetingId: string
): Promise<MeetingSummary> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(
            `${BACKEND_URL}/sessions/${sessionId}/meetings/${meetingId}/leave`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            30000
        );

        if (!response.ok) {
            await handleApiError(response, 'Failed to leave meeting');
        }

        const data = await response.json();
        
        // Normalize summary format (handle both snake_case and camelCase)
        return {
            meetingId: data.meeting_id || data.meetingId,
            sessionId: data.session_id || data.sessionId,
            xpGained: data.xp_earned || data.xpGained || 0,
            overallScore: data.overallScore,
            participationScore: data.participation_score || data.participationScore,
            generatedTasks: data.generated_tasks || data.generatedTasks || [],
            keyDecisions: data.key_decisions || data.keyDecisions || [],
            actionItems: data.action_items || data.actionItems || [],
            feedback: data.feedback || { strengths: [], improvements: [] },
            earlyDeparture: data.early_departure ?? data.earlyDeparture ?? true,
            createdAt: data.created_at || data.createdAt,
        };
    }, 2, 1000); // Retry up to 2 times with 1s delay
};

/**
 * Get new meeting messages since last message ID (for live polling)
 * Enhanced with better error handling for polling requests
 */
export const getMeetingMessages = async (
    sessionId: string,
    meetingId: string,
    lastMessageId: string | null
): Promise<ConversationMessage[]> => {
    return retryRequest(async () => {
        const url = lastMessageId 
            ? `${BACKEND_URL}/sessions/${sessionId}/meetings/${meetingId}/messages?since=${lastMessageId}`
            : `${BACKEND_URL}/sessions/${sessionId}/meetings/${meetingId}/messages`;
        
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }, 10000); // Shorter timeout for polling requests

        if (!response.ok) {
            // Don't throw error for 404 - just return empty array (meeting may not exist yet)
            if (response.status === 404) {
                console.warn(`Meeting ${meetingId} not found or no messages available`);
                return [];
            }
            await handleApiError(response, 'Failed to get meeting messages');
        }

        const data = await response.json();
        return data.messages || [];
    }, 2, 500); // Retry up to 2 times with shorter delay for polling
};

/**
 * Get meeting summary
 */
export const getMeetingSummary = async (
    sessionId: string,
    meetingId: string
): Promise<MeetingSummary> => {
    return retryRequest(async () => {
        const response = await fetchWithTimeout(
            `${BACKEND_URL}/sessions/${sessionId}/meetings/${meetingId}/summary`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            await handleApiError(response, 'Failed to get meeting summary');
        }

        return await response.json();
    });
};

/**
 * React Query hook for meetings list
 */
export const useMeetings = (sessionId: string | null) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['meetings', sessionId],
        queryFn: () => {
            if (!sessionId) throw new Error('No session ID');
            return getMeetings(sessionId);
        },
        enabled: !!sessionId,
        retry: (failureCount, error) => {
            if (error instanceof SessionExpiredError) return false;
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 5000, // Consider data stale after 5 seconds
        refetchInterval: 10000, // Auto-refresh every 10 seconds for real-time updates
    });

    const generateMutation = useMutation({
        mutationFn: (trigger?: string) => {
            if (!sessionId) throw new Error('No session ID');
            return generateMeeting(sessionId, trigger);
        },
        onSuccess: (newMeeting) => {
            // Add new meeting to the cache
            queryClient.setQueryData(['meetings', sessionId], (old: Meeting[] = []) => {
                return [...old, newMeeting];
            });
        },
        retry: 1,
    });

    return {
        meetings: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
        generateMeeting: generateMutation.mutate,
        generateMeetingAsync: generateMutation.mutateAsync,
        isGenerating: generateMutation.isPending,
        generateError: generateMutation.error,
    };
};

/**
 * React Query hook for meeting details with conversation history
 */
export const useMeetingDetails = (sessionId: string | null, meetingId: string | null) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['meetingDetails', sessionId, meetingId],
        queryFn: () => {
            if (!sessionId || !meetingId) throw new Error('Missing session ID or meeting ID');
            return getMeetingDetails(sessionId, meetingId);
        },
        enabled: !!sessionId && !!meetingId,
        retry: (failureCount, error) => {
            if (error instanceof SessionExpiredError) return false;
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 2000, // Short stale time for real-time conversation updates
        refetchInterval: (query) => {
            // Only auto-refresh if meeting is in progress
            const data = query.state.data;
            return data?.meeting_data?.status === 'in_progress' ? 3000 : false;
        },
    });

    const joinMutation = useMutation({
        mutationFn: () => {
            if (!sessionId || !meetingId) throw new Error('Missing session ID or meeting ID');
            return joinMeeting(sessionId, meetingId);
        },
        onSuccess: (meetingState) => {
            // Update meeting details cache with initial state
            queryClient.setQueryData(['meetingDetails', sessionId, meetingId], meetingState);
            // Update meetings list to reflect status change
            queryClient.invalidateQueries({ queryKey: ['meetings', sessionId] });
        },
        retry: 1,
    });

    const respondMutation = useMutation({
        mutationFn: ({ topicId, response }: { topicId: string; response: string }) => {
            if (!sessionId || !meetingId) throw new Error('Missing session ID or meeting ID');
            return submitMeetingResponse(sessionId, meetingId, topicId, response);
        },
        onSuccess: (turnResponse) => {
            // Update meeting details cache with new conversation state
            queryClient.setQueryData(['meetingDetails', sessionId, meetingId], (old: MeetingDetails) => {
                if (!old) return old;
                return {
                    ...old,
                    conversation_history: turnResponse.conversation_history || old.conversation_history,
                    current_topic_index: turnResponse.current_topic_index ?? old.current_topic_index,
                    is_player_turn: turnResponse.is_player_turn ?? old.is_player_turn,
                    meeting_complete: turnResponse.meeting_complete ?? old.meeting_complete,
                };
            });
            
            // If meeting is complete, invalidate meetings list and player state
            if (turnResponse.meeting_complete) {
                queryClient.invalidateQueries({ queryKey: ['meetings', sessionId] });
                queryClient.invalidateQueries({ queryKey: ['playerState', sessionId] });
                queryClient.invalidateQueries({ queryKey: ['tasks', sessionId] });
            }
        },
        retry: 1,
    });

    const leaveMutation = useMutation({
        mutationFn: () => {
            if (!sessionId || !meetingId) throw new Error('Missing session ID or meeting ID');
            return leaveMeeting(sessionId, meetingId);
        },
        onSuccess: () => {
            // Invalidate queries after leaving
            queryClient.invalidateQueries({ queryKey: ['meetings', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['meetingDetails', sessionId, meetingId] });
            queryClient.invalidateQueries({ queryKey: ['playerState', sessionId] });
        },
        retry: 1,
    });

    return {
        meetingDetails: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
        joinMeeting: joinMutation.mutate,
        joinMeetingAsync: joinMutation.mutateAsync,
        isJoining: joinMutation.isPending,
        joinError: joinMutation.error,
        submitResponse: respondMutation.mutate,
        submitResponseAsync: respondMutation.mutateAsync,
        isSubmitting: respondMutation.isPending,
        submitResult: respondMutation.data,
        submitError: respondMutation.error,
        leaveMeeting: leaveMutation.mutate,
        leaveMeetingAsync: leaveMutation.mutateAsync,
        isLeaving: leaveMutation.isPending,
        leaveError: leaveMutation.error,
    };
};

/**
 * React Query hook for meeting summary
 */
export const useMeetingSummary = (sessionId: string | null, meetingId: string | null) => {
    return useQuery({
        queryKey: ['meetingSummary', sessionId, meetingId],
        queryFn: () => {
            if (!sessionId || !meetingId) throw new Error('Missing session ID or meeting ID');
            return getMeetingSummary(sessionId, meetingId);
        },
        enabled: !!sessionId && !!meetingId,
        retry: (failureCount, error) => {
            if (error instanceof SessionExpiredError) return false;
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: Infinity, // Summary doesn't change once created
    });
};
