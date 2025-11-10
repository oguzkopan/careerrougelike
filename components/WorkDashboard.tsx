import React, { useState } from 'react';
import StatsPanel from './StatsPanel';
import TaskPanel from './TaskPanel';
import TaskDetailModal from './TaskDetailModal';
import MeetingsSection from './MeetingsSection';
import MeetingSummaryModal from './MeetingSummaryModal';
import MeetingView from './MeetingView';
import Button from './shared/Button';
import ResetButton from './shared/ResetButton';
import AgentFallback from './AgentFallback';
import { Briefcase, Calendar, DollarSign, Search, FileText } from 'lucide-react';
import { WorkTask, Meeting, MeetingSummary, isWorkTask, isMeeting } from '../types';
import { useTasks, usePlayerState, useMeetings, joinMeeting, respondToTopic, SessionExpiredError } from '../services/backendApiService';
import { useToast } from './shared/Toast';
import LoadingSpinner from './shared/LoadingSpinner';
import './meetings.css';

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
  const [selectedTaskData, setSelectedTaskData] = useState<WorkTask | null>(null);
  const [submittedTaskId, setSubmittedTaskId] = useState<string | null>(null);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [meetingSummary, setMeetingSummary] = useState<MeetingSummary | null>(null);
  const { showToast } = useToast();

  // Fetch player state, tasks, and meetings
  const { 
    data: playerState, 
    isLoading: isLoadingState,
    error: stateError,
    refetch: refetchState
  } = usePlayerState(sessionId);
  const {
    tasks: allTasks,
    isLoading: isLoadingTasks,
    submitTaskAsync,
    isSubmitting,
    submitResult,
    error: tasksError,
    refetch: refetchTasks,
  } = useTasks(sessionId);
  
  // Filter out matching tasks (deprecated format)
  // Using type assertion because matching was removed from TaskFormatType but may still exist in database
  const tasks = allTasks.filter(task => (task.formatType as string) !== 'matching');
  const {
    meetings,
    isLoading: isLoadingMeetings,
    error: meetingsError,
    refetch: refetchMeetings,
  } = useMeetings(sessionId);

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

  const selectedTask = selectedTaskData || tasks.find((task) => task.id === selectedTaskId);

  const handleSelectTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setSelectedTaskId(taskId);
      setSelectedTaskData(task); // Store the task data
    }
  };

  const handleCloseModal = () => {
    setSelectedTaskId(null);
    setSelectedTaskData(null); // Clear the stored task data
  };

  const handleSubmitTask = async (solution: string) => {
    if (!selectedTaskId) return;

    try {
      // Track which task this result belongs to
      setSubmittedTaskId(selectedTaskId);
      
      const result = await submitTaskAsync({ taskId: selectedTaskId, solution });
      
      // Result will be passed to the modal via submitResult prop
      // The modal will display the score, XP, and feedback
      console.log('Task submitted successfully:', result);
      
      // Refresh tasks and player state to show updated data
      refetchTasks();
      refetchState();
    } catch (error) {
      showToast('Failed to submit task. Please try again.', 'error');
      console.error('Task submission error:', error);
    }
  };

  const [activeMeetingState, setActiveMeetingState] = useState<any>(null);

  const handleJoinMeeting = async (meetingId: string) => {
    try {
      const meetingState = await joinMeeting(sessionId, meetingId);
      setActiveMeetingId(meetingId);
      
      // Store the full meeting state including conversation history
      if (meetingState && meetingState.meeting_data) {
        // Merge the meeting state data with conversation history
        const fullMeetingData = {
          ...meetingState.meeting_data,
          conversation_history: meetingState.conversation_history,
          is_player_turn: meetingState.is_player_turn,
          current_topic_index: meetingState.current_topic_index
        };
        setActiveMeetingState(fullMeetingData);
        console.log('[WorkDashboard] Meeting joined with initial conversation:', meetingState.conversation_history?.length || 0, 'messages');
      }
      
      refetchMeetings();
    } catch (error) {
      showToast('Failed to join meeting. Please try again.', 'error');
      console.error('Meeting join error:', error);
    }
  };

  const handleRespondToTopic = async (topicId: string, response: string) => {
    if (!activeMeetingId) return { ai_responses: [], evaluation: {}, next_topic_index: 0, meeting_complete: false };
    
    try {
      const result = await respondToTopic(sessionId, activeMeetingId, topicId, response);
      return result;
    } catch (error) {
      showToast('Failed to submit response. Please try again.', 'error');
      console.error('Meeting response error:', error);
      throw error;
    }
  };

  const handleEndMeeting = async () => {
    if (!activeMeetingId) return;
    
    try {
      // Complete the meeting and get summary
      const { completeMeeting } = await import('../services/backendApiService');
      const summary = await completeMeeting(sessionId, activeMeetingId);
      
      // Show the meeting summary modal
      setMeetingSummary({
        meetingId: activeMeetingId,
        xpGained: summary.xp_gained || 0,
        overallScore: summary.participation_score || 0,
        feedback: {
          strengths: summary.feedback?.strengths || [],
          improvements: summary.feedback?.improvements || [],
        },
        generatedTasks: summary.generated_tasks || [],
        keyDecisions: summary.key_decisions || [],
        actionItems: summary.action_items || [],
        earlyDeparture: false,
      });
      
      // Clear active meeting
      setActiveMeetingId(null);
      setActiveMeetingState(null);
      
      // Refresh data
      refetchMeetings();
      refetchTasks();
      refetchState();
    } catch (error) {
      console.error('Failed to complete meeting:', error);
      showToast('Failed to load meeting summary. Please try again.', 'error');
      
      // Still close the meeting even if summary fails
      setActiveMeetingId(null);
      setActiveMeetingState(null);
      refetchMeetings();
      refetchTasks();
      refetchState();
    }
  };

  const handleLeaveMeeting = (summary: any) => {
    // Convert the leave meeting response to MeetingSummary format
    const partialSummary: MeetingSummary = {
      meetingId: activeMeetingId || '',
      xpGained: summary.xp_gained || summary.xpGained || 0,
      overallScore: summary.overall_score || summary.overallScore || 0,
      feedback: {
        strengths: summary.strengths || [],
        improvements: summary.improvements || [],
      },
      generatedTasks: summary.generated_tasks || summary.generatedTasks || [],
      keyDecisions: summary.key_decisions || summary.keyDecisions || [],
      actionItems: summary.action_items || summary.actionItems || [],
      earlyDeparture: summary.early_departure || summary.earlyDeparture || true,
    };

    setMeetingSummary(partialSummary);
    setActiveMeetingId(null);
    setActiveMeetingState(null); // Clear the stored meeting state
    refetchMeetings();
    refetchTasks();
    refetchState();
  };

  const handleCloseMeetingSummary = () => {
    setMeetingSummary(null);
  };

  // Handle errors
  if (stateError || tasksError || meetingsError) {
    const error = stateError || tasksError || meetingsError;
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
              refetchMeetings();
            }}
            onCancel={error instanceof SessionExpiredError ? 
              () => window.location.href = '/' : 
              onJobSearch}
          />
        </div>
      </div>
    );
  }

  if (isLoadingState || isLoadingTasks || isLoadingMeetings) {
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

  // Apply type guards to filter tasks and meetings data
  const workTasks = tasks.filter(isWorkTask);
  const meetingsList = (meetings || []).filter(isMeeting);

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
        {/* If in active meeting, show MeetingView */}
        {activeMeetingId ? (
          (() => {
            // Use the stored meeting state if available (includes conversation history)
            // Otherwise fall back to the meeting from the list
            const activeMeeting = activeMeetingState || meetingsList.find(m => m.id === activeMeetingId);
            if (!activeMeeting) {
              return (
                <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-8 text-center">
                  <Calendar className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Meeting Not Found</h2>
                  <p className="text-gray-400 mb-6">
                    The meeting you're trying to join could not be found.
                  </p>
                  <Button onClick={handleEndMeeting}>
                    Return to Dashboard
                  </Button>
                </div>
              );
            }
            
            // Ensure duration_minutes is set (use estimated_duration_minutes as fallback)
            const meetingDataWithDuration = {
              ...activeMeeting,
              duration_minutes: activeMeeting.duration_minutes || activeMeeting.estimated_duration_minutes
            };
            
            return (
              <MeetingView
                meetingData={meetingDataWithDuration as any}
                sessionId={sessionId}
                onRespond={handleRespondToTopic}
                onEndMeeting={handleEndMeeting}
                onLeaveMeeting={handleLeaveMeeting}
              />
            );
          })()
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
            {/* Left Sidebar - Stats Panel */}
            <aside className="lg:col-span-3 order-1">
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto stats-scroll">
                <StatsPanel playerStats={playerStats} />
              </div>
            </aside>

            {/* Main Content - Tasks Section */}
            <main className="lg:col-span-6 order-3 lg:order-2">
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">Active Tasks</span>
                </h2>
                <TaskPanel tasks={workTasks} onSelectTask={handleSelectTask} />
              </div>
            </main>

            {/* Right Sidebar - Meetings Section */}
            <aside className="lg:col-span-3 order-2 lg:order-3">
              <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-700/50 overflow-hidden lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] flex flex-col max-h-[500px] lg:max-h-[calc(100vh-3rem)]">
                <div className="p-3 md:p-4 lg:p-6 border-b border-purple-700/30 flex-shrink-0">
                  <h2 className="text-base md:text-lg lg:text-xl font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-purple-400 flex-shrink-0" />
                    <span className="truncate">Meetings</span>
                  </h2>
                </div>
                <div className="overflow-y-auto flex-1 p-3 md:p-4 lg:p-6 meetings-scroll">
                  <MeetingsSection
                    meetings={meetingsList}
                    onJoinMeeting={handleJoinMeeting}
                    isLoading={isLoadingMeetings}
                  />
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={handleCloseModal}
          onSubmit={handleSubmitTask}
          isSubmitting={isSubmitting}
          submitResult={selectedTaskId === submittedTaskId ? submitResult : null}
        />
      )}

      {/* Meeting Summary Modal */}
      {meetingSummary && (
        <MeetingSummaryModal
          summary={meetingSummary}
          onClose={handleCloseMeetingSummary}
        />
      )}
    </div>
  );
};

export default WorkDashboard;
