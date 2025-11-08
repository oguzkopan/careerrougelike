import React, { useState } from 'react';
import ParticipantAvatar from './shared/ParticipantAvatar';
import TypingIndicator from './shared/TypingIndicator';
import './meetings.css';

/**
 * Demo component to showcase all meeting-related styles and animations
 * This is for development/testing purposes only
 */
const MeetingStylesDemo: React.FC = () => {
  const [showCelebration, setShowCelebration] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 p-8 space-y-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Meeting Styles Demo</h1>
        <p className="text-gray-400 mb-8">
          Visual showcase of all meeting-related styles and animations
        </p>

        {/* Section Backgrounds */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Section Backgrounds</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="meeting-section-gradient p-6 rounded-lg">
              <p className="text-white font-semibold">meeting-section-gradient</p>
              <p className="text-white/80 text-sm">Full gradient background</p>
            </div>
            <div className="meeting-section-bg p-6 rounded-lg">
              <p className="text-white font-semibold">meeting-section-bg</p>
              <p className="text-white/80 text-sm">Subtle gradient background</p>
            </div>
          </div>
        </section>

        {/* Participant Avatars */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Participant Avatars</h2>
          <div className="bg-gray-800 p-6 rounded-lg space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Sizes</p>
              <div className="flex items-center gap-4">
                <ParticipantAvatar name="John Doe" size="sm" />
                <ParticipantAvatar name="Jane Smith" size="md" />
                <ParticipantAvatar name="Bob Wilson" size="lg" />
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Active (with pulse)</p>
              <div className="flex items-center gap-4">
                <ParticipantAvatar name="Sarah Chen" isActive={true} />
                <ParticipantAvatar name="Mike Rodriguez" isActive={true} />
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Custom Colors</p>
              <div className="flex items-center gap-4">
                <ParticipantAvatar name="Alice" avatarColor="#EC4899" />
                <ParticipantAvatar name="Bob" avatarColor="#10B981" />
                <ParticipantAvatar name="Charlie" avatarColor="#F59E0B" />
              </div>
            </div>
          </div>
        </section>

        {/* Message Bubbles */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Message Bubbles</h2>
          <div className="bg-gray-800 p-6 rounded-lg space-y-4">
            <div className="message-bubble-ai flex items-start gap-3">
              <ParticipantAvatar name="AI" />
              <div className="bg-gray-700/50 rounded-lg p-3 max-w-md">
                <p className="text-xs font-semibold text-gray-300 mb-1">AI Participant</p>
                <p className="text-white text-sm">
                  This is an AI message with slide-in-left animation
                </p>
              </div>
            </div>
            <div className="message-bubble-player flex items-start gap-3 justify-end">
              <div className="bg-indigo-500/20 rounded-lg p-3 max-w-md">
                <p className="text-xs font-semibold text-indigo-400 mb-1">You</p>
                <p className="text-white text-sm">
                  This is a player message with slide-in-right animation
                </p>
              </div>
              <ParticipantAvatar name="You" avatarColor="#6366F1" />
            </div>
            <div className="topic-intro-animation bg-purple-500/10 border border-purple-500/50 rounded-lg p-4 text-center">
              <p className="text-purple-400 font-semibold mb-1">Discussion Topic</p>
              <p className="text-white">This is a topic introduction with scale animation</p>
            </div>
          </div>
        </section>

        {/* Typing Indicator */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Typing Indicator</h2>
          <div className="bg-gray-800 p-6 rounded-lg space-y-4">
            <TypingIndicator participantName="Sarah Chen" />
            <TypingIndicator />
          </div>
        </section>

        {/* Status Indicators */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Status Indicators</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="status-indicator status-indicator-scheduled"></span>
                <span className="text-white text-sm">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="status-indicator status-indicator-in-progress"></span>
                <span className="text-white text-sm">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="status-indicator status-indicator-completed"></span>
                <span className="text-white text-sm">Completed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Priority Badges */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Priority Badges</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="priority-badge-required px-3 py-1 rounded text-sm font-medium bg-red-700 text-red-200">
                Required
              </span>
              <span className="priority-badge-recommended px-3 py-1 rounded text-sm font-medium bg-yellow-700 text-yellow-200">
                Recommended
              </span>
              <span className="px-3 py-1 rounded text-sm font-medium bg-gray-700 text-gray-300">
                Optional
              </span>
            </div>
          </div>
        </section>

        {/* Progress Bar */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Progress Bar</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="meeting-progress-bar h-full" style={{ width: '60%' }}></div>
            </div>
          </div>
        </section>

        {/* Your Turn Indicator */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Your Turn Indicator</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="your-turn-indicator bg-indigo-500/10 border border-indigo-500/50 rounded-lg p-4 text-center">
              <p className="text-indigo-400 font-medium">⏳ Your turn to speak</p>
            </div>
          </div>
        </section>

        {/* Sentiment Badges */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Sentiment Badges</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="sentiment-badge px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                positive
              </span>
              <span className="sentiment-badge px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">
                constructive
              </span>
              <span className="sentiment-badge px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                challenging
              </span>
              <span className="sentiment-badge px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-400">
                neutral
              </span>
            </div>
          </div>
        </section>

        {/* Meeting Card */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Meeting Card</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="meeting-card meeting-card-distinct p-4 rounded-lg border-2 border-purple-600 bg-purple-900/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👥</span>
                  <div>
                    <h3 className="font-semibold text-white">Team Standup</h3>
                    <p className="text-sm text-gray-400">Daily sync meeting</p>
                  </div>
                </div>
                <span className="status-indicator status-indicator-scheduled"></span>
              </div>
              <div className="flex items-center gap-2">
                <ParticipantAvatar name="Sarah" size="sm" />
                <ParticipantAvatar name="Mike" size="sm" />
                <ParticipantAvatar name="Lisa" size="sm" />
              </div>
            </div>
          </div>
        </section>

        {/* Participant List with Stagger */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Participant List (Stagger Animation)</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="space-y-3">
              {['Sarah Chen', 'Mike Rodriguez', 'Lisa Wang', 'Tom Brown'].map((name, index) => (
                <div key={index} className="participant-list-item flex items-center gap-3">
                  <ParticipantAvatar name={name} />
                  <div>
                    <p className="text-white font-semibold">{name}</p>
                    <p className="text-gray-400 text-sm">Engineering Manager</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Meeting Completion Celebration */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Meeting Completion</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <button
              onClick={() => setShowCelebration(!showCelebration)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg mb-4"
            >
              Toggle Celebration
            </button>
            {showCelebration && (
              <div className="meeting-complete-celebration celebration-confetti bg-green-500/10 border border-green-500/50 rounded-lg p-8 text-center relative overflow-hidden">
                <h3 className="text-2xl font-bold text-white mb-2">Meeting Complete! 🎉</h3>
                <p className="text-gray-300">Great job participating in the discussion!</p>
              </div>
            )}
          </div>
        </section>

        {/* Accessibility Note */}
        <section className="mb-12">
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-400 mb-2">♿ Accessibility</h3>
            <p className="text-gray-300 text-sm">
              All animations respect the <code className="bg-gray-700 px-2 py-1 rounded">prefers-reduced-motion</code> media query.
              Users with motion sensitivity will see static versions of these elements.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MeetingStylesDemo;
