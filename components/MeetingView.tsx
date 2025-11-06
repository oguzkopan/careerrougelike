import React, { useState, useEffect } from 'react';
import { Users, MessageCircle, CheckCircle2, Loader2, Mic, X } from 'lucide-react';
import Button from './shared/Button';
import VoiceRecorder from './shared/VoiceRecorder';
import { useToast } from './shared/Toast';

interface Participant {
  id: string;
  name: string;
  role: string;
  personality: string;
}

interface Topic {
  id: string;
  question: string;
  context: string;
  expected_points: string[];
}

interface MeetingData {
  id: string;
  meeting_type: string;
  title: string;
  context: string;
  participants: Participant[];
  topics: Topic[];
  objective: string;
  duration_minutes: number;
  current_topic_index?: number;
  responses?: any[];
}

interface AIResponse {
  participant_name: string;
  response: string;
  sentiment: string;
}

interface MeetingViewProps {
  meetingData: MeetingData;
  sessionId: string;
  onRespond: (topicId: string, response: string) => Promise<{
    ai_responses: AIResponse[];
    evaluation: any;
    next_topic_index: number;
    meeting_complete: boolean;
  }>;
  onEndMeeting: () => void;
  isProcessing: boolean;
}

const MeetingView: React.FC<MeetingViewProps> = ({
  meetingData,
  sessionId,
  onRespond,
  onEndMeeting,
  isProcessing,
}) => {
  const [currentTopicIndex, setCurrentTopicIndex] = useState(meetingData.current_topic_index || 0);
  const [playerResponse, setPlayerResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'topic' | 'player' | 'ai';
    content: string;
    participant?: string;
    sentiment?: string;
  }>>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meetingComplete, setMeetingComplete] = useState(false);
  const { showToast } = useToast();

  const currentTopic = meetingData.topics[currentTopicIndex];
  const progress = ((currentTopicIndex + 1) / meetingData.topics.length) * 100;

  // Initialize conversation with first topic
  useEffect(() => {
    if (conversationHistory.length === 0 && currentTopic) {
      setConversationHistory([
        {
          type: 'topic',
          content: currentTopic.question,
        },
      ]);
    }
  }, [currentTopic, conversationHistory.length]);

  const handleVoiceRecordingComplete = (blob: Blob, url: string) => {
    setPlayerResponse('[Voice response recorded]');
    setShowVoiceRecorder(false);
    showToast('Voice response recorded. Click Submit to continue.', 'success');
  };

  const handleSubmitResponse = async () => {
    if (!playerResponse.trim() || isSubmitting || !currentTopic) return;

    setIsSubmitting(true);

    try {
      // Add player response to conversation
      setConversationHistory(prev => [
        ...prev,
        {
          type: 'player',
          content: playerResponse,
        },
      ]);

      // Submit response and get AI responses
      const result = await onRespond(currentTopic.id, playerResponse);

      // Add AI responses to conversation
      const aiMessages = result.ai_responses.map(aiResp => ({
        type: 'ai' as const,
        content: aiResp.response,
        participant: aiResp.participant_name,
        sentiment: aiResp.sentiment,
      }));

      setConversationHistory(prev => [...prev, ...aiMessages]);

      // Clear input
      setPlayerResponse('');

      // Check if meeting is complete
      if (result.meeting_complete) {
        setMeetingComplete(true);
        showToast('Meeting complete! Great job.', 'success');
      } else {
        // Move to next topic
        setCurrentTopicIndex(result.next_topic_index);
        const nextTopic = meetingData.topics[result.next_topic_index];
        if (nextTopic) {
          setConversationHistory(prev => [
            ...prev,
            {
              type: 'topic',
              content: nextTopic.question,
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
      showToast('Failed to submit response. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getParticipantAvatar = (name: string) => {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
    ];
    
    const colorIndex = name.charCodeAt(0) % colors.length;
    
    return (
      <div className={`w-10 h-10 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-bold text-sm`}>
        {initials}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-500/20 to-transparent border-b border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/50">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{meetingData.title}</h1>
                <p className="text-lg text-gray-300">{meetingData.meeting_type.replace('_', ' ').toUpperCase()}</p>
              </div>
            </div>
            <Button
              onClick={onEndMeeting}
              variant="secondary"
              className="flex items-center gap-2"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
              End Meeting
            </Button>
          </div>

          {/* Meeting Context */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 mb-4">
            <p className="text-gray-300">{meetingData.context}</p>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Topic {currentTopicIndex + 1} of {meetingData.topics.length}
              </span>
              <span className="text-purple-400 font-semibold">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Participants Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 sticky top-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Participants
              </h3>
              <div className="space-y-3">
                {meetingData.participants.map(participant => (
                  <div key={participant.id} className="flex items-center gap-3">
                    {getParticipantAvatar(participant.name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {participant.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {participant.role}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 border-t border-gray-700 pt-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                    YOU
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">You</p>
                    <p className="text-xs text-gray-400">Participant</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Conversation History */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
              <div className="space-y-4">
                {conversationHistory.map((message, index) => (
                  <div key={index}>
                    {message.type === 'topic' && (
                      <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <MessageCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                          <div>
                            <p className="text-sm font-semibold text-purple-400 mb-1">
                              Discussion Topic
                            </p>
                            <p className="text-white">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {message.type === 'player' && (
                      <div className="flex items-start gap-3 justify-end">
                        <div className="bg-indigo-500/20 border border-indigo-500/50 rounded-lg p-4 max-w-[80%]">
                          <p className="text-sm font-semibold text-indigo-400 mb-1">You</p>
                          <p className="text-white">{message.content}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          YOU
                        </div>
                      </div>
                    )}

                    {message.type === 'ai' && (
                      <div className="flex items-start gap-3">
                        {getParticipantAvatar(message.participant || 'AI')}
                        <div className="bg-gray-700/50 border border-gray-600/50 rounded-lg p-4 max-w-[80%]">
                          <p className="text-sm font-semibold text-gray-300 mb-1">
                            {message.participant}
                          </p>
                          <p className="text-white">{message.content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isSubmitting && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing response...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Response Input */}
            {!meetingComplete && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-400">
                      Your Response
                    </label>
                    {!showVoiceRecorder && (
                      <Button
                        onClick={() => setShowVoiceRecorder(true)}
                        variant="secondary"
                        className="flex items-center gap-2 text-sm"
                        disabled={isSubmitting}
                      >
                        <Mic className="w-4 h-4" />
                        Use Voice
                      </Button>
                    )}
                  </div>

                  {/* Voice Recorder */}
                  {showVoiceRecorder && (
                    <VoiceRecorder
                      onRecordingComplete={handleVoiceRecordingComplete}
                      onCancel={() => setShowVoiceRecorder(false)}
                      disabled={isSubmitting}
                    />
                  )}

                  {/* Text Input */}
                  {!showVoiceRecorder && (
                    <>
                      <textarea
                        value={playerResponse}
                        onChange={(e) => setPlayerResponse(e.target.value)}
                        placeholder="Type your response to the discussion topic..."
                        className="w-full h-32 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        disabled={isSubmitting}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          {playerResponse.length} characters
                        </span>
                        <Button
                          onClick={handleSubmitResponse}
                          disabled={!playerResponse.trim() || isSubmitting}
                          className="min-w-[150px]"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin mr-2" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5 mr-2" />
                              Submit Response
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Meeting Complete */}
            {meetingComplete && (
              <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-6 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Meeting Complete!</h3>
                <p className="text-gray-300 mb-6">
                  You've successfully participated in all discussion topics.
                </p>
                <Button onClick={onEndMeeting} className="min-w-[200px]">
                  End Meeting
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingView;
