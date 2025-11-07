import React, { useState } from 'react';
import StatsPanel from './StatsPanel';
import TaskPanel from './TaskPanel';
import TaskDetailModal from './TaskDetailModal';
import Button from './shared/Button';
import ResetButton from './shared/ResetButton';
import AgentFallback from './AgentFallback';
import { Briefcase, Calendar, DollarSign, Search, FileText } from 'lucide-react';
import { WorkTask } from '../types';
import { useTasks, usePlayerState, SessionExpiredError } from '../services/backendApiService';
import { useToast } from './shared/Toast';
import LoadingSpinner from './shared/LoadingSpinner';

interface WorkDashboardProps {
  sessionId: string;
  onJobSearch: () => void;
  onViewCV: () => void;
  onReset?: () => void;
}

const WorkDashboard: React.FC<WorkDashboardProps> = ({
  sessionId,
  onJobSearch,
  onViewCV,
  onReset,
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Fetch player state and tasks
  const { 
    data: playerState, 
    isLoading: isLoadingState,
    error: stateError,
    refetch: refetchState
  } = usePlayerState(sessionId);
  const {
    tasks,
    isLoading: isLoadingTasks,
    submitTaskAsync,
    isSubmitting,
    submitResult,
    error: tasksError,
    refetch: refetchTasks,
  } = useTasks(sessionId);

  // Auto-refresh when job is not ready (polling mechanism)
  React.useEffect(() => {
    if (!isLoadingState && !isLoadingTasks && playerState && !playerState.currentJob) {
      console.log('[WorkDashboard] Job not ready, setting up auto-refresh...');
      
      const intervalId = setInterval(() => {
        console.log('[WorkDashboard] Auto-refreshing state...');
        refetchState();
        refetchTasks();
      }, 2000); // Poll every 2 seconds
      
      // Clear interval after 30 seconds to prevent infinite polling
      const timeoutId = setTimeout(() => {
        console.log('[WorkDashboard] Auto-refresh timeout reached');
        clearInterval(intervalId);
      }, 30000);
      
      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, [playerState, isLoadingState, isLoadingTasks, refetchState, refetchTasks]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleCloseModal = () => {
    setSelectedTaskId(null);
  };

  const handleSubmitTask = async (solution: string) => {
    if (!selectedTaskId) return;

    try {
      const result = await submitTaskAsync({ taskId: selectedTaskId, solution });
      
      // Show toast notification
      if (result.leveledUp) {
        showToast(
          `🎉 Level Up! You reached Level ${result.newLevel}! +${result.xpGained} XP`,
          'success'
        );
      } else {
        showToast(`✅ Task completed! +${result.xpGained} XP earned`, 'success');
      }
    } catch (error) {
      showToast('Failed to submit task. Please try again.', 'error');
      console.error('Task submission error:', error);
    }
  };

  // Handle errors
  if (stateError || tasksError) {
    const error = stateError || tasksError;
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <AgentFallback
            agentName="Work Dashboard"
            error={error instanceof SessionExpiredError ? 
              'Your session has expired. Please start a new game.' : 
              error?.message}
            onRetry={() => {
              refetchState();
              refetchTasks();
            }}
            onCancel={error instanceof SessionExpiredError ? 
              () => window.location.href = '/' : 
              onJobSearch}
          />
        </div>
      </div>
    );
  }

  if (isLoadingState || isLoadingTasks) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!playerState || !playerState.currentJob) {
    // Log debug info
    console.log('[WorkDashboard] No job found - playerState:', playerState);
    console.log('[WorkDashboard] Tasks:', tasks);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="animate-pulse">
            <Briefcase className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
          </div>
          <div>
            <p className="text-gray-300 text-xl font-semibold mb-2">Setting up your new job...</p>
            <p className="text-gray-500 text-sm mb-4">
              We're preparing your workspace and generating your first tasks. This may take a moment.
            </p>
            
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
          
          {/* Debug info */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-left text-xs space-y-1">
            <p className="text-gray-400 font-semibold mb-2">Debug Info:</p>
            <p className="text-gray-500">State Loaded: {playerState ? 'Yes' : 'No'}</p>
            <p className="text-gray-500">Has Job: {playerState?.currentJob ? 'Yes' : 'No'}</p>
            <p className="text-gray-500">Status: {playerState?.status || 'Unknown'}</p>
            <p className="text-gray-500">Tasks Count: {tasks.length}</p>
            <p className="text-gray-500">Session ID: {sessionId.substring(0, 8)}...</p>
            {playerState && (
              <details className="mt-2">
                <summary className="text-gray-400 cursor-pointer hover:text-gray-300">Full State</summary>
                <pre className="mt-2 text-gray-600 text-[10px] overflow-auto max-h-40">
                  {JSON.stringify(playerState, null, 2)}
                </pre>
              </details>
            )}
          </div>
          
          <div className="flex gap-3 justify-center mt-6">
            <Button onClick={() => {
              console.log('[WorkDashboard] Manual refresh - Current state:', { playerState, tasks });
              refetchState();
              refetchTasks();
            }} variant="secondary">
              Refresh
            </Button>
            <Button onClick={onJobSearch}>
              Search for Jobs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentJob = playerState.currentJob;
  const playerStats = {
    level: playerState.level,
    xp: playerState.xp,
    xpToNextLevel: playerState.xpToNextLevel,
    tasksCompleted: playerState.stats.tasksCompleted,
    jobsHeld: playerState.stats.jobsHeld,
    interviewsPassed: playerState.stats.interviewsPassed,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header with Current Job Info */}
      <header className="bg-gray-800/50 border-b border-gray-700 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="w-6 h-6 text-indigo-400" />
                <h1 className="text-2xl font-bold text-white">{currentJob.position}</h1>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{currentJob.companyName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Started {new Date(currentJob.startDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}</span>
                </div>
                {currentJob.salary && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-green-400">
                      ${currentJob.salary.toLocaleString()}/year
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={onJobSearch}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Job Search
              </Button>
              <Button
                onClick={onViewCV}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View CV
              </Button>
              {onReset && <ResetButton onReset={onReset} />}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Meeting Notification Banner - Placeholder for future implementation */}
        {/* This will be populated when event checking is integrated */}
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Stats Panel */}
          <aside className="lg:col-span-1">
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden sticky top-6">
              <StatsPanel playerStats={playerStats} />
            </div>
          </aside>

          {/* Main Area - Task Panel */}
          <main className="lg:col-span-3">
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Active Tasks</h2>
              <TaskPanel tasks={tasks} onSelectTask={handleSelectTask} />
            </div>
          </main>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={handleCloseModal}
          onSubmit={handleSubmitTask}
          isSubmitting={isSubmitting}
          submitResult={submitResult}
        />
      )}
    </div>
  );
};

export default WorkDashboard;
