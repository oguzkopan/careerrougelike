import React from 'react';
import { WorkTask } from '../types';
import { Clock, Star } from 'lucide-react';

interface TaskPanelProps {
  tasks: WorkTask[];
  onSelectTask: (taskId: string) => void;
}

const TaskPanel: React.FC<TaskPanelProps> = ({ tasks, onSelectTask }) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No active tasks at the moment.</p>
        <p className="text-gray-500 text-sm mt-2">New tasks will appear here soon!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
      {tasks.map((task) => (
        <TaskTicket key={task.id} task={task} onSelect={() => onSelectTask(task.id)} />
      ))}
    </div>
  );
};

// Task Ticket Component
interface TaskTicketProps {
  task: WorkTask;
  onSelect: () => void;
}

const TaskTicket: React.FC<TaskTicketProps> = ({ task, onSelect }) => {
  // Color coding by status
  const getStatusStyles = () => {
    switch (task.status) {
      case 'pending':
        return {
          border: 'border-gray-600',
          bg: 'bg-gray-800/50',
          badge: 'bg-gray-700 text-gray-300',
          hover: 'hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20',
        };
      case 'in-progress':
        return {
          border: 'border-blue-600',
          bg: 'bg-blue-900/20',
          badge: 'bg-blue-700 text-blue-200',
          hover: 'hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20',
        };
      case 'completed':
        return {
          border: 'border-green-600',
          bg: 'bg-green-900/20',
          badge: 'bg-green-700 text-green-200',
          hover: 'hover:border-green-400 hover:shadow-lg hover:shadow-green-500/20',
        };
      default:
        return {
          border: 'border-gray-600',
          bg: 'bg-gray-800/50',
          badge: 'bg-gray-700 text-gray-300',
          hover: 'hover:border-indigo-500',
        };
    }
  };

  const statusStyles = getStatusStyles();
  const isCompleted = task.status === 'completed';

  const statusLabels = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    completed: 'Completed',
  };

  // Render difficulty stars
  const renderDifficultyStars = () => {
    const difficultyLabels = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
    const difficultyLevel = task.difficulty || 2; // Default to medium if not set
    
    return (
      <div className="flex items-center gap-1" title={`Difficulty: ${difficultyLabels[difficultyLevel - 1] || 'Medium'}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < difficultyLevel ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      className={`p-4 md:p-5 rounded-lg border-2 transition-all duration-200 cursor-pointer ${statusStyles.border} ${statusStyles.bg} ${statusStyles.hover} ${
        isCompleted ? 'opacity-75' : ''
      }`}
      onClick={onSelect}
    >
      {/* Header with status badge */}
      <div className="flex justify-between items-start mb-2 md:mb-3">
        <h3 className="font-semibold text-white text-sm md:text-base flex-1 pr-2 line-clamp-2">
          {task.title}
        </h3>
        <span
          className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap ${statusStyles.badge}`}
        >
          {statusLabels[task.status]}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-xs md:text-sm mb-3 md:mb-4 line-clamp-3 leading-relaxed">{task.description}</p>

      {/* Footer with difficulty and XP */}
      <div className="flex justify-between items-center pt-3 md:pt-4 border-t border-gray-700">
        <div className="flex flex-col gap-0.5 md:gap-1">
          <span className="text-[10px] md:text-xs text-gray-500">Difficulty</span>
          {renderDifficultyStars()}
        </div>
        <div className="flex items-center gap-1 text-xs md:text-sm font-semibold text-green-400">
          <span>+{task.xpReward || 100} XP</span>
        </div>
      </div>

      {/* Due date (if available) */}
      {task.dueDate && (
        <div className="flex items-center gap-1 text-[10px] md:text-xs text-gray-500 mt-2">
          <Clock className="w-3 h-3" />
          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
};

export default TaskPanel;