import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfessionSelector from './components/ProfessionSelector';
import GameScreen from './components/GameScreen';
import AgentDashboard from './components/AgentDashboard';
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
}> = ({ sessionId, onSelectJob }) => {
  const { listings, isLoading, refresh, isRefreshing, error, refetch } = apiService.useJobListings(sessionId, 1);
  
  return (
    <JobListingsView
      listings={listings}
      onSelectJob={onSelectJob}
      onRefresh={refresh}
      isLoading={isLoading || isRefreshing}
      error={error as Error}
      onRetry={refetch}
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
}> = ({ sessionId, jobId, onInterviewComplete, onBack }) => {
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
  const { acceptOffer, isAcceptingOffer } = apiService.useInterview(sessionId, jobId);

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
    try {
      await acceptOffer();
      onAcceptOffer();
    } catch (error) {
      console.error('Failed to accept offer:', error);
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
      isAcceptingOffer={isAcceptingOffer}
    />
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'game' | 'agents'>('game');
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

  const handleAcceptOffer = useCallback(async () => {
    if (!appState.sessionId || !appState.selectedJobId) return;
    
    setAppState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await apiService.acceptJobOffer(appState.sessionId, appState.selectedJobId);
      
      // Small delay to ensure backend updates and queries refetch
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAppState(prev => ({
        ...prev,
        currentState: 'working',
        selectedJobId: null,
        interviewResult: null,
        isLoading: false,
      }));
      showToast('Congratulations! You\'ve accepted the job offer!', 'success');
    } catch (err) {
      console.error('Failed to accept offer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept job offer.';
      showToast(errorMessage, 'error');
      setAppState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  }, [appState.sessionId, appState.selectedJobId, showToast]);

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

  // Render based on view (agents dashboard or game)
  if (view === 'agents') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="agents"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          <AgentDashboard onNavigateBack={() => setView('game')} />
        </motion.div>
      </AnimatePresence>
    );
  }

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
            onNavigateToAgents={() => setView('agents')}
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
              onNavigateToAgents={() => setView('agents')}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default App;