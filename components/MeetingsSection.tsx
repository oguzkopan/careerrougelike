import React from 'react';
import { Meeting } from '../types';
import { Calendar, ChevronRight } from 'lucide-react';
import MeetingCard from './MeetingCard';
import './meetings.css';

interface MeetingsSectionProps {
  meetings: Meeting[];
  onJoinMeeting: (meetingId: string) => void;
  onViewMeetingDetails?: (meetingId: string) => void;
  isLoading: boolean;
}

const MeetingsSection: React.FC<MeetingsSectionProps> = ({
  meetings,
  onJoinMeeting,
  onViewMeetingDetails,
  isLoading,
}) => {
  // Filter meetings by status
  const scheduledMeetings = meetings.filter(m => m.status === 'scheduled');
  const inProgressMeetings = meetings.filter(m => m.status === 'in_progress');
  const completedMeetings = meetings.filter(m => m.status === 'completed');

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading meetings...</p>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">No meetings scheduled</p>
        <p className="text-gray-500 text-sm mt-2">
          Complete tasks to unlock meetings with your team!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Stats Header - Horizontal flex layout with smaller cards */}
      <div className="flex gap-1.5 md:gap-2">
        <div className="flex-1 bg-purple-900/20 border border-purple-700/50 rounded-lg p-2 md:p-3 transition-all hover:bg-purple-900/30 hover:border-purple-600 min-w-0">
          <div className="text-purple-400 text-[10px] md:text-xs font-medium truncate">Scheduled</div>
          <div className="text-base md:text-lg lg:text-xl font-bold text-white mt-0.5 md:mt-1">
            {scheduledMeetings.length}
          </div>
        </div>
        <div className="flex-1 bg-blue-900/20 border border-blue-700/50 rounded-lg p-2 md:p-3 transition-all hover:bg-blue-900/30 hover:border-blue-600 min-w-0">
          <div className="text-blue-400 text-[10px] md:text-xs font-medium truncate">Active</div>
          <div className="text-base md:text-lg lg:text-xl font-bold text-white mt-0.5 md:mt-1">
            {inProgressMeetings.length}
          </div>
        </div>
        <div className="flex-1 bg-green-900/20 border border-green-700/50 rounded-lg p-2 md:p-3 transition-all hover:bg-green-900/30 hover:border-green-600 min-w-0">
          <div className="text-green-400 text-[10px] md:text-xs font-medium truncate">Done</div>
          <div className="text-base md:text-lg lg:text-xl font-bold text-white mt-0.5 md:mt-1">
            {completedMeetings.length}
          </div>
        </div>
      </div>

      {/* Meeting Lists Container */}
      <div className="space-y-3 md:space-y-4">
        {/* Active/In Progress Meetings */}
        {inProgressMeetings.length > 0 && (
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2 md:mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Active Meeting
            </h3>
            <div className="space-y-2 md:space-y-3">
              {inProgressMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onJoin={() => onJoinMeeting(meeting.id)}
                  onViewDetails={onViewMeetingDetails ? () => onViewMeetingDetails(meeting.id) : undefined}
                  compact={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Meetings */}
        {scheduledMeetings.length > 0 && (
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-2 md:mb-3">
              Scheduled Meetings
            </h3>
            <div className="space-y-2 md:space-y-3">
              {scheduledMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onJoin={() => onJoinMeeting(meeting.id)}
                  onViewDetails={onViewMeetingDetails ? () => onViewMeetingDetails(meeting.id) : undefined}
                  compact={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Meetings (collapsed by default) */}
        {completedMeetings.length > 0 && (
          <details className="group">
            <summary className="text-base md:text-lg font-semibold text-gray-400 mb-2 md:mb-3 cursor-pointer hover:text-gray-300 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 transition-transform group-open:rotate-90" />
              Completed Meetings ({completedMeetings.length})
            </summary>
            <div className="space-y-2 md:space-y-3 mt-2 md:mt-3">
              {completedMeetings.slice(0, 5).map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onJoin={() => onJoinMeeting(meeting.id)}
                  onViewDetails={onViewMeetingDetails ? () => onViewMeetingDetails(meeting.id) : undefined}
                  compact={true}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default MeetingsSection;
