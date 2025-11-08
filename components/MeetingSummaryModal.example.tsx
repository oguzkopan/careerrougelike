/**
 * Example usage of MeetingSummaryModal component
 * 
 * This file demonstrates how to use the MeetingSummaryModal component
 * to display meeting outcomes after a meeting is completed.
 */

import React, { useState } from 'react';
import MeetingSummaryModal from './MeetingSummaryModal';

const MeetingSummaryModalExample: React.FC = () => {
  const [showModal, setShowModal] = useState(true);

  // Example meeting summary data
  const exampleSummary = {
    meeting_title: 'Sprint Planning Meeting',
    participation_score: 85,
    xp_earned: 45,
    feedback: {
      strengths: [
        'Clear communication of technical constraints',
        'Good suggestions for prioritization',
        'Active participation in all discussion topics'
      ],
      improvements: [
        'Could provide more specific timelines',
        'Consider asking more clarifying questions'
      ]
    },
    generated_tasks: [
      {
        task_id: 'task-abc123',
        title: 'Implement user authentication system',
        source: 'meeting-xyz789'
      },
      {
        task_id: 'task-def456',
        title: 'Review security requirements documentation',
        source: 'meeting-xyz789'
      }
    ],
    key_decisions: [
      'Prioritize authentication feature for next sprint',
      'Defer reporting dashboard to following sprint',
      'Allocate 2 developers to security review'
    ],
    action_items: [
      'You: Implement authentication by Friday',
      'Mike: Review security requirements by Wednesday',
      'Sarah: Schedule follow-up meeting for next week'
    ]
  };

  const handleClose = () => {
    setShowModal(false);
    console.log('Modal closed - returning to dashboard');
  };

  return (
    <div>
      {showModal && (
        <MeetingSummaryModal
          meeting_title={exampleSummary.meeting_title}
          participation_score={exampleSummary.participation_score}
          xp_earned={exampleSummary.xp_earned}
          feedback={exampleSummary.feedback}
          generated_tasks={exampleSummary.generated_tasks}
          key_decisions={exampleSummary.key_decisions}
          action_items={exampleSummary.action_items}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default MeetingSummaryModalExample;

/**
 * Integration Example with MeetingView:
 * 
 * const [showSummary, setShowSummary] = useState(false);
 * const [meetingSummary, setMeetingSummary] = useState<MeetingSummary | null>(null);
 * 
 * const handleMeetingComplete = async (meetingId: string) => {
 *   // Fetch meeting summary from backend
 *   const response = await fetch(`/api/sessions/${sessionId}/meetings/${meetingId}/summary`);
 *   const summary = await response.json();
 *   setMeetingSummary(summary);
 *   setShowSummary(true);
 * };
 * 
 * return (
 *   <>
 *     <MeetingView
 *       meetingData={meetingData}
 *       sessionId={sessionId}
 *       onRespond={handleRespond}
 *       onEndMeeting={handleMeetingComplete}
 *     />
 *     
 *     {showSummary && meetingSummary && (
 *       <MeetingSummaryModal
 *         meeting_title={meetingSummary.meeting_title}
 *         participation_score={meetingSummary.participation_score}
 *         xp_earned={meetingSummary.xp_earned}
 *         feedback={meetingSummary.feedback}
 *         generated_tasks={meetingSummary.generated_tasks}
 *         key_decisions={meetingSummary.key_decisions}
 *         action_items={meetingSummary.action_items}
 *         onClose={() => {
 *           setShowSummary(false);
 *           // Navigate back to dashboard
 *         }}
 *       />
 *     )}
 *   </>
 * );
 */
