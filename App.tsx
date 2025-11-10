import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import ProfessionSelector from './components/ProfessionSelector';
import GameScreen from './components/GameScreen';
import GraduationScreen from './components/GraduationScreen';
import JobListingsView from './components/JobListingsView';
import JobDetailView from './components/JobDetailView';
import InterviewView from './components/InterviewView';
import InterviewResultView from './components/InterviewResultView';
import WorkDashboard from './components/WorkDashboard';
import CVView from './components/CVView';
import ErrorBoundary from './components/ErrorBoundary';
import AgentFallback from './components/AgentFallback';
import { GameState, Profession, JobListing, InterviewResult } from './types';
import { PROFESSIONS } from './constants';
import * as apiService from './services/backendApiService';
import { useToast } from './components/shared/Toast';

// State machine states for job market simulator
type AppState = 
  | 'graduated' 
  | 'job_searching' 
  | 'viewing_job' 
  | 'interviewing' 
  | 'employed' 
  | 'working'
  | 'viewing_cv'
  | 'selecting_profession'; // Legacy state for backward compatibility

interface AppStateData {
  currentState: AppState;
  sessionId: string | null;
  profession: string | null; // Added: store profession ID
  selectedJobId: string | null;
  interviewResult: InterviewResult | null;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'job_market_sim_state';

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3
};

// Wrapper components that fetch data and pass to actual components
const JobListingsViewWrapper: React.FC<{
  sessionId: string | null;
  onSelectJob: (jobId: string) => void;
  onReset?: () => void;
}> = ({ sessionId, onSelectJob, onReset }) => {
  const { listings, isLoading, refresh, isRefreshing, error, refetch } = apiService.useJobListings(sessionId, 1);
  
  return (
    <JobListingsView
      listings={listings}
      onSelectJob={onSelectJob}
      onRefresh={refresh}
      isLoading={isLoading || isRefreshing}
      error={error as Error}
      onRetry={refetch}
      onReset={onReset}
    />
  );
};

const JobDetailViewWrapper: React.FC<{
  sessionId: string | null;
  jobId: string | null;
  onBack: () => void;
  onStartInterview: () => void;
}> = ({ sessionId, jobId, onBack, onStartInterview }) => {
  const [job, setJob] = React.useState<JobListing | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchJob = async () => {
      if (!sessionId || !jobId) return;
      try {
        setIsLoading(true);
        const jobData = await apiService.getJobDetail(sessionId, jobId);
        setJob(jobData);
      } catch (error) {
        console.error('Failed to fetch job details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [sessionId, jobId]);

  if (isLoading || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading job details...</div>
      </div>
    );
  }

  return (
    <JobDetailView
      job={job}
      onBack={onBack}
      onStartInterview={onStartInterview}
    />
  );
};

const InterviewViewWrapper: React.FC<{
  sessionId: string | null;
  jobId: string | null;
  onInterviewComplete: (result: InterviewResult) => void;
  onBack: () => void;
  onReset?: () => void;
}> = ({ sessionId, jobId, onInterviewComplete, onBack, onReset }) => {
  const { 
    questions, 
    isLoadingQuestions, 
    submitAnswersAsync, 
    isSubmitting,
    errorQuestions,
    submitError,
    refetchQuestions
  } = apiService.useInterview(sessionId, jobId);
  const [job, setJob] = React.useState<JobListing | null>(null);
  const [jobError, setJobError] = React.useState<Error | null>(null);
  const { showToast } = useToast();

  React.useEffect(() => {
    const fetchJob = async () => {
      if (!sessionId || !jobId) return;
      try {
        const jobData = await apiService.getJobDetail(sessionId, jobId);
        setJob(jobData);
        setJobError(null);
      } catch (error) {
        console.error('Failed to fetch job details:', error);
        setJobError(error as Error);
      }
    };
    fetchJob();
  }, [sessionId, jobId]);

  const handleSubmitAnswers = async (answers: Record<string, string>) => {
    try {
      const result = await submitAnswersAsync({ answers });
      onInterviewComplete(result);
    } catch (error) {
      console.error('Failed to submit interview answers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit answers';
      showToast(errorMessage, 'error');
    }
  };

  if (errorQuestions || jobError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <AgentFallback
            agentName="Interview Generator"
            error={(errorQuestions || jobError)?.message}
            onRetry={refetchQuestions}
            onCancel={onBack}
          />
        </div>
      </div>
    );
  }

  if (isLoadingQuestions || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading interview...</div>
      </div>
    );
  }

  return (
    <InterviewView
      jobTitle={job.position}
      companyName={job.companyName}
      questions={questions}
      onSubmitAnswers={handleSubmitAnswers}
      isSubmitting={isSubmitting}
      sessionId={sessionId}
      onBack={onBack}
      onReset={onReset}
    />
  );
};

const InterviewResultViewWrapper: React.FC<{
  result: InterviewResult;
  sessionId: string | null;
  jobId: string | null;
  onAcceptOffer: () => void;
  onDeclineOffer: () => void;
  onBackToListings: () => void;
}> = ({ result, sessionId, jobId, onAcceptOffer, onDeclineOffer, onBackToListings }) => {
  const [job, setJob] = React.useState<JobListing | null>(null);
  const [isAccepting, setIsAccepting] = React.useState(false);
  const { acceptOfferAsync, isAcceptingOffer } = apiService.useInterview(sessionId, jobId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  React.useEffect(() => {
    const fetchJob = async () => {
      if (!sessionId || !jobId) return;
      try {
        const jobData = await apiService.getJobDetail(sessionId, jobId);
        setJob(jobData);
      } catch (error) {
        console.error('Failed to fetch job details:', error);
      }
    };
    fetchJob();
  }, [sessionId, jobId]);

  const handleAcceptOffer = async () => {
    // Prevent duplicate calls
    if (isAccepting || isAcceptingOffer) return;
    
    setIsAccepting(true);
    try {
      console.log('[Accept Offer] Starting job acceptance...');
      console.log('[Accept Offer] Session ID:', sessionId);
      console.log('[Accept Offer] Job ID:', jobId);
      
      // Accept the offer via API (this waits for backend to complete)
      await acceptOfferAsync();
      console.log('[Accept Offer] Backend accepted offer successfully');
      
      // Invalidate queries immediately to force refetch
      console.log('[Accept Offer] Invalidating queries...');
      await queryClient.invalidateQueries({ queryKey: ['playerState', sessionId] });
      await queryClient.invalidateQueries({ queryKey: ['tasks', sessionId] });
      
      // Poll for state to be ready (with timeout)
      const pollInterval = 1000; // Check every second
      const maxWaitTime = 20000; // Wait up to 20 seconds
      const startTime = Date.now();
      
      let playerStateReady = false;
      let tasksReady = false;
      let pollAttempts = 0;
      
      while (Date.now() - startTime < maxWaitTime && (!playerStateReady || !tasksReady)) {
        pollAttempts++;
        try {
          const [playerState, tasks] = await Promise.all([
            apiService.getPlayerState(sessionId!),
            apiService.getTasks(sessionId!)
          ]);
          
          playerStateReady = !!playerState.currentJob;
          tasksReady = tasks.length > 0;
          
          console.log(`[Accept Offer] Poll attempt ${pollAttempts}:`, {
            hasJob: playerStateReady,
            tasksCount: tasks.length,
            status: playerState.status,
            jobData: playerState.currentJob
          });
          
          if (playerStateReady && tasksReady) {
            console.log('[Accept Offer] State is ready! Navigating...');
            break;
          }
          
          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } catch (error) {
          console.error(`[Accept Offer] Poll attempt ${pollAttempts} failed:`, error);
          // Continue polling even on error
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }
      
      if (!playerStateReady || !tasksReady) {
        console.warn('[Accept Offer] State not ready after polling:', {
          playerStateReady,
          tasksReady,
          pollAttempts,
          timeElapsed: Date.now() - startTime
        });
        // Still navigate - the WorkDashboard will show a loading state
      }
      
      // Navigate to work dashboard
      console.log('[Accept Offer] Navigating to work dashboard...');
      onAcceptOffer();
    } catch (error) {
      console.error('[Accept Offer] FAILED to accept offer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept job offer';
      showToast(errorMessage, 'error');
      setIsAccepting(false);
      // Don't navigate on error
    }
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <InterviewResultView
      result={result}
      jobTitle={job.position}
      companyName={job.companyName}
      newJobOffer={{
        position: job.position,
        companyName: job.companyName,
        salary: job.salaryRange?.min || 75000,
        level: job.level || 'entry'
      }}
      onAcceptOffer={handleAcceptOffer}
      onDeclineOffer={onDeclineOffer}
      onBackToListings={onBackToListings}
      isAcceptingOffer={isAccepting || isAcceptingOffer}
    />
  );
};

const App: React.FC = () => {
  const { showToast } = useToast();
  
  // Legacy game state for backward compatibility
  const [gameState, setGameState] = useState<GameState>({
    stage: 'selecting_profession',
    sessionId: null,
    playerProfile: null,
    currentTask: null,
    storyEvents: [],
    isLoading: false,
    error: null,
  });

  // New state machine for job market simulator
  const [appState, setAppState] = useState<AppStateData>(() => {
    // Try to load state from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved state:', e);
      }
    }
    return {
      currentState: 'selecting_profession',
      sessionId: null,
      profession: null,
      selectedJobId: null,
      interviewResult: null,
      isLoading: false,
      error: null,
    };
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  // Load state from backend on mount if we have a session
  useEffect(() => {
    const loadStateFromBackend = async () => {
      if (appState.sessionId && appState.currentState !== 'selecting_profession') {
        try {
          const playerState = await apiService.getPlayerState(appState.sessionId);
          
          // Map backend status to app state
          let newState: AppState = appState.currentState;
          if (playerState.status === 'graduated') {
            newState = 'graduated';
          } else if (playerState.status === 'job_searching') {
            newState = 'job_searching';
          } else if (playerState.status === 'employed') {
            newState = 'working';
          }
          
          setAppState(prev => ({
            ...prev,
            currentState: newState,
          }));
        } catch (error) {
          console.error('Failed to load state from backend:', error);
          
          // Handle session expiry
          if (error instanceof apiService.SessionExpiredError) {
            showToast('Your session has expired. Please start a new game.', 'warning');
            localStorage.removeItem(STORAGE_KEY);
            setAppState({
              currentState: 'selecting_profession',
              sessionId: null,
              profession: null,
              selectedJobId: null,
              interviewResult: null,
              isLoading: false,
              error: null,
            });
          }
        }
      }
    };

    loadStateFromBackend();
  }, []); // Only run on mount

  // State transition handlers
  const handleStartGame = useCallback(async (profession: Profession) => {
    setAppState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { sessionId } = await apiService.createSession(profession);
      
      setAppState({
        currentState: 'graduated',
        sessionId,
        profession: profession.id, // Store profession ID
        selectedJobId: null,
        interviewResult: null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to start game:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start a new game session.';
      showToast(errorMessage, 'error');
      setAppState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  }, [showToast]);

  const handleStartJobSearch = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      currentState: 'job_searching',
      selectedJobId: null,
      interviewResult: null,
    }));
  }, []);

  const handleSelectJob = useCallback((jobId: string) => {
    setAppState(prev => ({
      ...prev,
      currentState: 'viewing_job',
      selectedJobId: jobId,
    }));
  }, []);

  const handleBackToListings = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      currentState: 'job_searching',
      selectedJobId: null,
      interviewResult: null,
    }));
  }, []);

  const handleStartInterview = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      currentState: 'interviewing',
    }));
  }, []);

  const handleInterviewComplete = useCallback((result: InterviewResult) => {
    setAppState(prev => ({
      ...prev,
      interviewResult: result,
    }));
  }, []);

  const handleAcceptOffer = useCallback(() => {
    // Navigation happens after InterviewResultViewWrapper completes the API call
    // This ensures backend has updated player state and generated tasks
    setAppState(prev => ({
      ...prev,
      currentState: 'working',
      selectedJobId: null,
      interviewResult: null,
      isLoading: false,
    }));
    showToast('Welcome to your new job! Check out your tasks below.', 'success');
  }, [showToast]);

  const handleDeclineOffer = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      currentState: 'job_searching',
      selectedJobId: null,
      interviewResult: null,
    }));
  }, []);

  const handleViewCV = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      currentState: 'viewing_cv',
    }));
  }, []);

  const handleCloseCV = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      currentState: 'working',
    }));
  }, []);

  const handleJobSearchFromDashboard = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      currentState: 'job_searching',
      selectedJobId: null,
      interviewResult: null,
    }));
  }, []);

  const handleReset = useCallback(() => {
    // Clear localStorage immediately
    localStorage.removeItem(STORAGE_KEY);
    
    // Reset app state to initial selecting_profession state
    setAppState({
      currentState: 'selecting_profession',
      sessionId: null,
      profession: null,
      selectedJobId: null,
      interviewResult: null,
      isLoading: false,
      error: null,
    });
    
    // Clear React Query cache
    const queryClient = apiService.useQueryClient();
    queryClient.clear();
    
    // Show success toast
    showToast('Game reset. Starting fresh!', 'success');
  }, [showToast]);

  // Legacy handlers for backward compatibility
  const handleSubmitAnswer = useCallback(async (answer: string) => {
    if (!gameState.sessionId || !gameState.currentTask) return;
    
    setGameState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { feedback, score, nextTask, newProfile, newStoryEvent } = await apiService.submitAnswer(gameState.sessionId, gameState.currentTask.id, answer);
      
      setGameState(prev => ({
        ...prev,
        stage: nextTask ? (nextTask.type === 'event' ? 'event' : (nextTask.type === 'interview' ? 'interview' : 'working')) : 'game_over',
        playerProfile: newProfile,
        currentTask: nextTask,
        storyEvents: [...prev.storyEvents, {type: 'feedback', content: `Score: ${score}/10. ${feedback}`}, newStoryEvent],
        isLoading: false,
      }));

    } catch (err) {
      setGameState(prev => ({ ...prev, isLoading: false, error: 'Failed to submit answer.' }));
    }
  }, [gameState.sessionId, gameState.currentTask]);
  
  const handleSubmitEventChoice = useCallback(async (choice: string) => {
    if (!gameState.sessionId || !gameState.currentTask) return;

    setGameState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { nextTask, newProfile, newStoryEvent } = await apiService.submitEventChoice(gameState.sessionId, gameState.currentTask.id, choice);

      setGameState(prev => ({
        ...prev,
        stage: 'working',
        playerProfile: newProfile,
        currentTask: nextTask,
        storyEvents: [...prev.storyEvents, newStoryEvent],
        isLoading: false,
      }));
    } catch (err) {
      setGameState(prev => ({ ...prev, isLoading: false, error: 'Failed to process event choice.' }));
    }
  }, [gameState.sessionId, gameState.currentTask]);

  // Render based on app state
  return (
    <AnimatePresence mode="wait">
      {appState.currentState === 'selecting_profession' && (
        <motion.div
          key="selecting_profession"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          <ProfessionSelector 
            professions={PROFESSIONS} 
            onSelectProfession={handleStartGame} 
            isLoading={appState.isLoading}
          />
        </motion.div>
      )}

      {appState.currentState === 'graduated' && (
        <motion.div
          key="graduated"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          <GraduationScreen 
            onStartJobSearch={handleStartJobSearch}
            onReset={handleReset}
            profession={appState.profession || undefined}
          />
        </motion.div>
      )}

      {appState.currentState === 'job_searching' && (
        <motion.div
          key="job_searching"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          <JobListingsViewWrapper
            sessionId={appState.sessionId}
            onSelectJob={handleSelectJob}
            onReset={handleReset}
          />
        </motion.div>
      )}

      {appState.currentState === 'viewing_job' && (
        <motion.div
          key="viewing_job"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          <JobDetailViewWrapper
            sessionId={appState.sessionId}
            jobId={appState.selectedJobId}
            onBack={handleBackToListings}
            onStartInterview={handleStartInterview}
          />
        </motion.div>
      )}

      {appState.currentState === 'interviewing' && !appState.interviewResult && (
        <motion.div
          key="interviewing"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          <InterviewViewWrapper
            sessionId={appState.sessionId}
            jobId={appState.selectedJobId}
            onInterviewComplete={handleInterviewComplete}
            onBack={handleBackToListings}
            onReset={handleReset}
          />
        </motion.div>
      )}

      {appState.currentState === 'interviewing' && appState.interviewResult && (
        <motion.div
          key="interview_result"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          <InterviewResultViewWrapper
            result={appState.interviewResult}
            sessionId={appState.sessionId}
            jobId={appState.selectedJobId}
            onAcceptOffer={handleAcceptOffer}
            onDeclineOffer={handleDeclineOffer}
            onBackToListings={handleBackToListings}
          />
        </motion.div>
      )}

      {appState.currentState === 'working' && (
        <motion.div
          key="working"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          <WorkDashboard
            sessionId={appState.sessionId!}
            onJobSearch={handleJobSearchFromDashboard}
            onViewCV={handleViewCV}
            onReset={handleReset}
          />
        </motion.div>
      )}

      {appState.currentState === 'viewing_cv' && (
        <motion.div
          key="viewing_cv"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          <CVView
            sessionId={appState.sessionId!}
            onClose={handleCloseCV}
          />
        </motion.div>
      )}

      {/* Fallback to legacy game screen for backward compatibility */}
      {!['selecting_profession', 'graduated', 'job_searching', 'viewing_job', 'interviewing', 'working', 'viewing_cv'].includes(appState.currentState) && (
        <motion.div
          key="legacy"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          {gameState.stage === 'graduated' ? (
            <GraduationScreen 
              onStartJobSearch={() => setGameState(prev => ({ ...prev, stage: 'selecting_profession' }))}
              playerName={gameState.playerProfile?.name}
            />
          ) : (
            <GameScreen 
              gameState={gameState}
              onSubmitAnswer={handleSubmitAnswer}
              onSubmitEventChoice={handleSubmitEventChoice}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default App;