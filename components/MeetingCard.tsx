import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock } from 'lucide-react';
import { Meeting } from '../types';
import Button from './shared/Button';
import './meetings.css';

interface MeetingCardProps {
  meeting: Meeting;
  onJoin: () => void;
  onViewDetails?: () => void;
  compact?: boolean;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onJoin, onViewDetails, compact = false }) => {
  const isCompleted = meeting.status === 'completed';

  // Get status-specific styling
  const getStatusStyles = () => {
    switch (meeting.status) {
      case 'scheduled':
        return {
          border: 'border-purple-600',
          bg: 'bg-purple-900/20',
          badge: 'bg-purple-700 text-purple-200',
          hover: 'hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20',
        };
      case 'in_progress':
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
          hover: 'hover:border-gray-400',
        };
    }
  };

  const statusStyles = getStatusStyles();

  // Get priority badge styling
  const getPriorityStyles = () => {
    switch (meeting.priority) {
      case 'required':
        return 'bg-red-700 text-red-200';
      case 'recommended':
        return 'bg-yellow-700 text-yellow-200';
      case 'optional':
        return 'bg-gray-700 text-gray-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  // Get meeting type icon and label
  const getMeetingTypeInfo = () => {
    const typeMap: Record<string, { icon: string; label: string }> = {
      one_on_one: { icon: '👥', label: '1-on-1' },
      team_standup: { icon: '🏃', label: 'Team Standup' },
      team_meeting: { icon: '👥', label: 'Team Meeting' },
      project_review: { icon: '📊', label: 'Project Review' },
      project_update: { icon: '📈', label: 'Project Update' },
      stakeholder_presentation: { icon: '🎤', label: 'Presentation' },
      performance_review: { icon: '⭐', label: 'Performance Review' },
      feedback_session: { icon: '💬', label: 'Feedback Session' },
    };
    return typeMap[meeting.meeting_type] || { icon: '📅', label: 'Meeting' };
  };

  const typeInfo = getMeetingTypeInfo();

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`meeting-card meeting-card-distinct ${compact ? 'p-2.5 md:p-3' : 'p-4'} rounded-lg border-2 transition-all duration-200 ${statusStyles.border} ${statusStyles.bg} ${statusStyles.hover} ${
        isCompleted ? 'opacity-75' : ''
      }`}
    >
      {/* Header */}
      <div className={`flex justify-between items-start ${compact ? 'mb-2' : 'mb-3'} gap-2`}>
        <div className={`flex items-start ${compact ? 'gap-1.5 md:gap-2' : 'gap-3'} flex-1 min-w-0`}>
          <span className={`${compact ? 'text-lg md:text-xl' : 'text-2xl'} flex-shrink-0`}>{typeInfo.icon}</span>
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className={`font-semibold text-white ${compact ? 'text-xs md:text-sm' : 'text-base'} truncate`}>
              {meeting.title}
            </h3>
            <p className={`${compact ? 'text-[10px] md:text-xs' : 'text-sm'} text-gray-400 mt-0.5 md:mt-1 truncate`}>{typeInfo.label}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1 md:gap-2 items-end flex-shrink-0">
          <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap ${statusStyles.badge} flex items-center gap-1 md:gap-1.5`}>
            <span className={`status-indicator ${
              meeting.status === 'scheduled' ? 'status-indicator-scheduled' :
              meeting.status === 'in_progress' ? 'status-indicator-in-progress' :
              'status-indicator-completed'
            }`}></span>
            <span className="hidden sm:inline">{meeting.status === 'in_progress' ? 'In Progress' : meeting.status === 'scheduled' ? 'Scheduled' : 'Completed'}</span>
            <span className="sm:hidden">{meeting.status === 'in_progress' ? 'Active' : meeting.status === 'scheduled' ? 'Soon' : 'Done'}</span>
          </span>
          {meeting.priority !== 'optional' && (
            <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap ${getPriorityStyles()} ${
              meeting.priority === 'required' ? 'priority-badge-required' :
              meeting.priority === 'recommended' ? 'priority-badge-recommended' : ''
            }`}>
              {meeting.priority === 'required' ? 'Required' : 'Recommended'}
            </span>
          )}
        </div>
      </div>

      {/* Context Preview */}
      {meeting.context_preview && (
        <p className={`text-gray-400 ${compact ? 'text-[10px] md:text-xs mb-2' : 'text-sm mb-3'} line-clamp-2 overflow-hidden`}>
          {meeting.context_preview}
        </p>
      )}

      {/* Participants */}
      <div className={`flex items-center gap-1.5 md:gap-2 ${compact ? 'mb-2' : 'mb-3'} overflow-hidden`}>
        <Users className="w-3 h-3 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
        <div className="flex -space-x-1.5 md:-space-x-2 flex-shrink-0">
          {meeting.participants.slice(0, compact ? 2 : 4).map((participant) => (
            <div
              key={participant.id}
              className={`participant-avatar ${compact ? 'w-5 h-5 md:w-6 md:h-6 text-[10px] md:text-xs' : 'w-8 h-8 text-xs'} rounded-full border-2 border-gray-800 flex items-center justify-center font-semibold cursor-pointer flex-shrink-0`}
              style={{ backgroundColor: participant.avatar_color }}
              title={`${participant.name} - ${participant.role}`}
            >
              {participant.name.charAt(0)}
            </div>
          ))}
          {meeting.participants.length > (compact ? 2 : 4) && (
            <div className={`participant-avatar ${compact ? 'w-5 h-5 md:w-6 md:h-6 text-[10px] md:text-xs' : 'w-8 h-8 text-xs'} rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center font-semibold text-gray-300 cursor-pointer flex-shrink-0`}>
              +{meeting.participants.length - (compact ? 2 : 4)}
            </div>
          )}
        </div>
        <span className={`${compact ? 'text-[10px] md:text-xs' : 'text-sm'} text-gray-500 ml-1 md:ml-2 hidden sm:inline truncate`}>
          {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Footer */}
      <div className={`flex justify-between items-center ${compact ? 'pt-1.5 md:pt-2' : 'pt-3'} border-t border-gray-700 gap-2`}>
        <div className={`flex items-center gap-0.5 md:gap-1 ${compact ? 'text-[10px] md:text-xs' : 'text-sm'} text-gray-400 flex-shrink-0`}>
          <Clock className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{meeting.estimated_duration_minutes} min</span>
        </div>
        
        <div className={`flex ${compact ? 'gap-1' : 'gap-2'} flex-shrink-0`}>
          {onViewDetails && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              variant="secondary"
              className={compact ? 'text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 whitespace-nowrap' : 'text-sm px-3 py-1.5 whitespace-nowrap'}
            >
              <span className="hidden sm:inline">View Details</span>
              <span className="sm:hidden">Details</span>
            </Button>
          )}
          
          {!isCompleted && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onJoin();
              }}
              className={compact ? 'text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 whitespace-nowrap' : 'text-sm px-4 py-1.5 whitespace-nowrap'}
            >
              <span className="hidden sm:inline">{meeting.status === 'in_progress' ? 'Rejoin' : 'Join Meeting'}</span>
              <span className="sm:hidden">Join</span>
            </Button>
          )}
          
          {isCompleted && onViewDetails && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              variant="secondary"
              className={compact ? 'text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 whitespace-nowrap' : 'text-sm px-4 py-1.5 whitespace-nowrap'}
            >
              <span className="hidden sm:inline">View Summary</span>
              <span className="sm:hidden">Summary</span>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MeetingCard;
