import React, { useState } from 'react';
import StatsPanel from './StatsPanel';
import TaskPanel from './TaskPanel';
import TaskDetailModal from './TaskDetailModal';
import Button from './shared/Button';
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
}

const WorkDashboard: React.FC<WorkDashboardProps> = ({
  sessionId,
  onJobSearch,
  onViewCV,
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg">No active job found.</p>
          <Button onClick={onJobSearch} className="mt-4">
            Search for Jobs
          </Button>
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
                  <span>Started {currentJob.startDate}</span>
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
