/**
 * Example usage of WorkDashboard component
 * 
 * This demonstrates how to integrate the WorkDashboard with the player state API
 */

import React from 'react';
import WorkDashboard from './WorkDashboard';
import { usePlayerState, useTasks } from '../services/backendApiService';
import LoadingSpinner from './shared/LoadingSpinner';

interface WorkDashboardContainerProps {
  sessionId: string;
  onJobSearch: () => void;
  onViewCV: () => void;
  onSelectTask: (taskId: string) => void;
}

const WorkDashboardContainer: React.FC<WorkDashboardContainerProps> = ({
  sessionId,
  onJobSearch,
  onViewCV,
  onSelectTask,
}) => {
  // Fetch player state with auto-refresh every 30 seconds
  const { data: playerState, isLoading: isLoadingState, isError: isErrorState } = usePlayerState(sessionId);
  
  // Fetch active tasks
  const { tasks, isLoading: isLoadingTasks, isError: isErrorTasks } = useTasks(sessionId);

  // Loading state
  if (isLoadingState || isLoadingTasks) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (isErrorState || isErrorTasks || !playerState || !playerState.currentJob) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-400">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  // Transform player state to dashboard props
  const currentJob = {
    companyName: playerState.currentJob.companyName,
    position: playerState.currentJob.position,
    startDate: new Date(playerState.currentJob.startDate).toLocaleDateString(),
    salary: playerState.currentJob.salary,
  };

  const playerStats = {
    level: playerState.level,
    xp: playerState.xp,
    xpToNextLevel: playerState.xpToNextLevel,
    tasksCompleted: playerState.stats.tasksCompleted,
    jobsHeld: playerState.stats.jobsHeld,
    interviewsPassed: playerState.stats.interviewsPassed,
  };

  const activeTasks = tasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    difficulty: task.difficulty,
    status: task.status,
    xpReward: task.xpReward,
  }));

  return (
    <WorkDashboard
      currentJob={currentJob}
      playerStats={playerStats}
      activeTasks={activeTasks}
      onJobSearch={onJobSearch}
      onViewCV={onViewCV}
      onSelectTask={onSelectTask}
    />
  );
};

export default WorkDashboardContainer;
