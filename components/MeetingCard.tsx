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
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onJoin, onViewDetails }) => {
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
      className={`meeting-card meeting-card-distinct p-4 rounded-lg border-2 transition-all duration-200 ${statusStyles.border} ${statusStyles.bg} ${statusStyles.hover} ${
        isCompleted ? 'opacity-75' : ''
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{typeInfo.icon}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-white text-base line-clamp-1">
              {meeting.title}
            </h3>
            <p className="text-sm text-gray-400 mt-1">{typeInfo.label}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusStyles.badge} flex items-center gap-1.5`}>
            <span className={`status-indicator ${
              meeting.status === 'scheduled' ? 'status-indicator-scheduled' :
              meeting.status === 'in_progress' ? 'status-indicator-in-progress' :
              'status-indicator-completed'
            }`}></span>
            {meeting.status === 'in_progress' ? 'In Progress' : meeting.status === 'scheduled' ? 'Scheduled' : 'Completed'}
          </span>
          {meeting.priority !== 'optional' && (
            <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getPriorityStyles()} ${
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
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
          {meeting.context_preview}
        </p>
      )}

      {/* Participants */}
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-gray-500" />
        <div className="flex -space-x-2">
          {meeting.participants.slice(0, 4).map((participant) => (
            <div
              key={participant.id}
              className="participant-avatar w-8 h-8 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: participant.avatar_color }}
              title={`${participant.name} - ${participant.role}`}
            >
              {participant.name.charAt(0)}
            </div>
          ))}
          {meeting.participants.length > 4 && (
            <div className="participant-avatar w-8 h-8 rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-300 cursor-pointer">
              +{meeting.participants.length - 4}
            </div>
          )}
        </div>
        <span className="text-sm text-gray-500 ml-2">
          {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-700">
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{meeting.estimated_duration_minutes} min</span>
        </div>
        
        <div className="flex gap-2">
          {onViewDetails && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              variant="secondary"
              className="text-sm px-3 py-1.5"
            >
              View Details
            </Button>
          )}
          
          {!isCompleted && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onJoin();
              }}
              className="text-sm px-4 py-1.5"
            >
              {meeting.status === 'in_progress' ? 'Rejoin' : 'Join Meeting'}
            </Button>
          )}
          
          {isCompleted && onViewDetails && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              variant="secondary"
              className="text-sm px-4 py-1.5"
            >
              View Summary
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MeetingCard;
