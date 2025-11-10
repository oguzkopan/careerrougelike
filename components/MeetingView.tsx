import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageCircle, CheckCircle2, Loader2, Mic, X, Target, Lightbulb, AlertTriangle } from 'lucide-react';
import Button from './shared/Button';
import VoiceRecorder from './shared/VoiceRecorder';
import { useToast } from './shared/Toast';
import { leaveMeeting } from '../services/backendApiService';
import './meetings.css';

interface Participant {
  id: string;
  name: string;
  role: string;
  personality: string;
  avatar_color?: string;
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
}

interface AIResponse {
  participant_name: string;
  response: string;
  sentiment: string;
}

interface Message {
  type: 'topic' | 'player' | 'ai';
  content: string;
  participant?: string;
  sentiment?: string;
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
  onLeaveMeeting?: (summary: any) => void;
}

const MeetingView: React.FC<MeetingViewProps> = ({
  meetingData,
  sessionId,
  onRespond,
  onEndMeeting,
  onLeaveMeeting,
}) => {
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [playerResponse, setPlayerResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meetingComplete, setMeetingComplete] = useState(false);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { showToast } = useToast();

  const currentTopic = meetingData.topics[currentTopicIndex];
  const progress = ((currentTopicIndex + 1) / meetingData.topics.length) * 100;
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Initialize meeting state from backend data
  useEffect(() => {
    if (isInitialized) return;

    console.log('[MeetingView] Initializing meeting view with data:', {
      hasConversationHistory: !!(meetingData as any).conversation_history,
      historyLength: ((meetingData as any).conversation_history || []).length,
      currentTopicIndex: (meetingData as any).current_topic_index,
      isPlayerTurn: (meetingData as any).is_player_turn,
      topicsCount: meetingData.topics.length
    });

    // Set topic index from backend
    const backendTopicIndex = (meetingData as any).current_topic_index;
    if (typeof backendTopicIndex === 'number' && backendTopicIndex >= 0) {
      setCurrentTopicIndex(backendTopicIndex);
      console.log('[MeetingView] Set topic index to:', backendTopicIndex);
    }

    // Load conversation history from backend
    const backendHistory = (meetingData as any).conversation_history || [];
    
    if (backendHistory.length > 0) {
      console.log('[MeetingView] Loading', backendHistory.length, 'messages from backend');
      
      // Convert backend message format to frontend format
      const convertedHistory: Message[] = backendHistory
        .map((msg: any) => {
          if (msg.type === 'topic_intro') {
            return {
              type: 'topic' as const,
              content: msg.content
            };
          } else if (msg.type === 'ai_response') {
            return {
              type: 'ai' as const,
              content: msg.content,
              participant: msg.participant_name,
              sentiment: msg.sentiment
            };
          } else if (msg.type === 'player_response') {
            return {
              type: 'player' as const,
              content: msg.content
            };
          }
          return null;
        })
        .filter((msg: any) => msg !== null);
      
      setConversationHistory(convertedHistory);
      console.log('[MeetingView] Loaded', convertedHistory.length, 'messages');
      
      // Set player turn from backend
      const backendPlayerTurn = (meetingData as any).is_player_turn;
      if (typeof backendPlayerTurn === 'boolean') {
        setIsPlayerTurn(backendPlayerTurn);
        console.log('[MeetingView] Player turn:', backendPlayerTurn);
      } else {
        // Default: enable player turn if there are messages
        setIsPlayerTurn(true);
        console.log('[MeetingView] Defaulting player turn to true');
      }
    } else {
      // No backend history - initialize with topic question and enable player turn
      console.log('[MeetingView] No backend history - initializing with topic question');
      
      const topic = meetingData.topics[backendTopicIndex || 0];
      if (topic) {
        setConversationHistory([{
          type: 'topic',
          content: topic.question,
        }]);
        
        // Enable player turn after a brief delay
        setTimeout(() => {
          setIsPlayerTurn(true);
          console.log('[MeetingView] Player turn enabled after delay');
        }, 1000);
      } else {
        console.error('[MeetingView] No topic found at index', backendTopicIndex || 0);
      }
    }
    
    setIsInitialized(true);
  }, [meetingData, isInitialized]);

  // Auto-scroll to latest message
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Add AI messages one by one with realistic delays
  const addAIMessagesSequentially = async (aiResponses: AIResponse[]) => {
    setIsAISpeaking(true);
    setIsPlayerTurn(false);

    for (let i = 0; i < aiResponses.length; i++) {
      const response = aiResponses[i];
      
      // Wait before showing next message (1.5-2.5 seconds)
      const delay = 1500 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Add message to conversation
      setConversationHistory(prev => [...prev, {
        type: 'ai',
        content: response.response,
        participant: response.participant_name,
        sentiment: response.sentiment,
      }]);
    }

    setIsAISpeaking(false);
    
    // After all AI messages, enable player turn
    setTimeout(() => {
      setIsPlayerTurn(true);
    }, 800);
  };

  const handleVoiceRecordingComplete = (audioBlob: Blob, audioUrl: string) => {
    setPlayerResponse('[Voice response recorded]');
    setShowVoiceRecorder(false);
    showToast('Voice response recorded. Click Submit to continue.', 'success');
    console.log('Audio recorded:', { audioBlob, audioUrl });
  };

  const handleSubmitResponse = async () => {
    if (!playerResponse.trim() || isSubmitting || !isPlayerTurn || !currentTopic) return;

    setIsSubmitting(true);
    setIsPlayerTurn(false);

    try {
      // Add player response to conversation
      setConversationHistory(prev => [...prev, {
        type: 'player',
        content: playerResponse,
      }]);

      const responseToSubmit = playerResponse;
      setPlayerResponse('');

      // Submit response to backend
      const result = await onRespond(currentTopic.id, responseToSubmit);

      // Check if meeting is complete
      if (result.meeting_complete) {
        setMeetingComplete(true);
        showToast('Meeting complete! Great job.', 'success');
      } else {
        // Move to next topic
        const nextIndex = result.next_topic_index ?? currentTopicIndex + 1;
        
        // Add AI responses one by one
        if (result.ai_responses && result.ai_responses.length > 0) {
          await addAIMessagesSequentially(result.ai_responses);
        }
        
        // Check if we're moving to a new topic
        if (nextIndex !== currentTopicIndex && nextIndex < meetingData.topics.length) {
          // Wait a bit before showing new topic
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Update topic index
          setCurrentTopicIndex(nextIndex);
          
          // Start the new topic on backend and get AI discussion
          try {
            const { startMeetingTopic } = await import('../services/backendApiService');
            const topicResult = await startMeetingTopic(sessionId, meetingData.id, nextIndex);
            
            // Add all messages from the topic start (topic intro + AI discussion)
            for (const msg of topicResult.messages) {
              if (msg.type === 'topic_intro') {
                setConversationHistory(prev => [...prev, {
                  type: 'topic',
                  content: msg.content,
                }]);
                await new Promise(resolve => setTimeout(resolve, 800));
              } else if (msg.type === 'ai_response') {
                setConversationHistory(prev => [...prev, {
                  type: 'ai',
                  content: msg.content,
                  participant: msg.participant_name,
                  sentiment: msg.sentiment,
                }]);
                await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
              }
            }
            
            // Enable player turn after all messages
            setIsPlayerTurn(true);
          } catch (error) {
            console.log('Start topic endpoint not available (404) - backend needs redeployment');
            
            // Fallback: just show the topic without AI discussion
            // This works until backend is redeployed with the new endpoint
            const newTopic = meetingData.topics[nextIndex];
            setConversationHistory(prev => [...prev, {
              type: 'topic',
              content: newTopic.question,
            }]);
            setIsPlayerTurn(true);
            
            // Don't show error toast - fallback works fine
          }
        }
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
      showToast('Failed to submit response. Please try again.', 'error');
      setIsPlayerTurn(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveMeetingClick = () => {
    setShowLeaveConfirmation(true);
  };

  const handleConfirmLeave = async () => {
    setIsLeaving(true);
    setShowLeaveConfirmation(false);

    try {
      const summary = await leaveMeeting(sessionId, meetingData.id);
      showToast('You left the meeting early. Partial XP awarded.', 'info');
      
      if (onLeaveMeeting) {
        onLeaveMeeting(summary);
      } else {
        onEndMeeting();
      }
    } catch (error) {
      console.error('Failed to leave meeting:', error);
      showToast('Failed to leave meeting. Please try again.', 'error');
      setIsLeaving(false);
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirmation(false);
  };

  const getParticipantAvatar = (name: string, avatarColor?: string) => {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    const defaultColors = ['#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#6366F1'];
    const colorIndex = name.charCodeAt(0) % defaultColors.length;
    const bgColor = avatarColor || defaultColors[colorIndex];
    
    return (
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>
    );
  };

  const isInputDisabled = isSubmitting || meetingComplete || !isPlayerTurn || isAISpeaking;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="meeting-header-gradient border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/50">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{meetingData.title}</h1>
                <p className="text-sm text-gray-400">{meetingData.meeting_type.replace('_', ' ').toUpperCase()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">
                  Topic {currentTopicIndex + 1} of {meetingData.topics.length}
                </p>
                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden mt-1">
                  <div
                    className="meeting-progress-bar h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <Button
                onClick={handleLeaveMeetingClick}
                variant="secondary"
                className="flex items-center gap-2"
                disabled={isSubmitting || isLeaving || meetingComplete}
              >
                {isLeaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Leaving...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Leave Meeting
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
          {/* Left Sidebar - Participants */}
          <div className="col-span-3">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 h-full overflow-y-auto">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
                <Users className="w-4 h-4 text-purple-400" />
                Participants
              </h3>
              <div className="space-y-3">
                {meetingData.participants.map((participant) => (
                  <div key={participant.id} className="participant-list-item flex items-start gap-3">
                    {getParticipantAvatar(participant.name, participant.avatar_color)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{participant.name}</p>
                      <p className="text-xs text-gray-400 truncate">{participant.role}</p>
                      <p className="text-xs text-purple-400 mt-1 capitalize">{participant.personality}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-3 border-t border-gray-700 pt-3 mt-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
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

          {/* Center - Conversation Area */}
          <div className="col-span-6 flex flex-col">
            {/* Conversation History */}
            <div className="flex-1 meeting-view-backdrop bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 overflow-y-auto mb-4 conversation-scroll">
              <div className="space-y-4">
                {conversationHistory.map((message, index) => (
                  <div key={index}>
                    {message.type === 'topic' && (
                      <div className="topic-intro-animation bg-purple-500/10 border border-purple-500/50 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <MessageCircle className="w-5 h-5 text-purple-400" />
                          <p className="text-sm font-semibold text-purple-400 uppercase tracking-wide">
                            Discussion Topic
                          </p>
                        </div>
                        <p className="text-white font-medium">{message.content}</p>
                      </div>
                    )}

                    {message.type === 'player' && (
                      <div className="message-bubble-player flex items-start gap-3 justify-end">
                        <div className="bg-indigo-500/20 border border-indigo-500/50 rounded-lg p-3 max-w-[85%]">
                          <p className="text-xs font-semibold text-indigo-400 mb-1">You</p>
                          <p className="text-white text-sm">{message.content}</p>
                        </div>
                        <div className="participant-avatar w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          YOU
                        </div>
                      </div>
                    )}

                    {message.type === 'ai' && (
                      <div className="message-bubble-ai flex items-start gap-3">
                        <div className="participant-avatar">
                          {getParticipantAvatar(message.participant || 'AI')}
                        </div>
                        <div className="bg-gray-700/50 border border-gray-600/50 rounded-lg p-3 max-w-[85%]">
                          <p className="text-xs font-semibold text-gray-300 mb-1">
                            {message.participant}
                          </p>
                          <p className="text-white text-sm">{message.content}</p>
                          {message.sentiment && (
                            <span className={`sentiment-badge inline-block mt-2 px-2 py-0.5 rounded text-xs ${
                              message.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                              message.sentiment === 'constructive' ? 'bg-yellow-500/20 text-yellow-400' :
                              message.sentiment === 'challenging' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {message.sentiment}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* AI Speaking Indicator */}
                {isAISpeaking && (
                  <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-3 text-center">
                    <p className="text-gray-400 font-medium text-sm flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Others are speaking...
                    </p>
                  </div>
                )}

                {/* Your Turn Indicator - Only show when it's actually player's turn */}
                {!meetingComplete && isPlayerTurn && !isAISpeaking && conversationHistory.length > 0 && (
                  <div className="your-turn-indicator bg-indigo-500/10 border border-indigo-500/50 rounded-lg p-3 text-center">
                    <p className="text-indigo-400 font-medium text-sm">⏳ Your turn to speak</p>
                  </div>
                )}

                <div ref={conversationEndRef} />
              </div>
            </div>

            {/* Response Input */}
            {!meetingComplete && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Your Response
                    </label>
                    {!showVoiceRecorder && (
                      <Button
                        onClick={() => setShowVoiceRecorder(true)}
                        variant="secondary"
                        className="flex items-center gap-2 text-xs px-3 py-1.5"
                        disabled={isInputDisabled}
                      >
                        <Mic className="w-3 h-3" />
                        Voice
                      </Button>
                    )}
                  </div>

                  {showVoiceRecorder && (
                    <VoiceRecorder
                      onRecordingComplete={handleVoiceRecordingComplete}
                      onCancel={() => setShowVoiceRecorder(false)}
                      disabled={isInputDisabled}
                    />
                  )}

                  {!showVoiceRecorder && (
                    <>
                      <textarea
                        value={playerResponse}
                        onChange={(e) => setPlayerResponse(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && playerResponse.trim() && !isInputDisabled) {
                            handleSubmitResponse();
                          }
                        }}
                        placeholder={isInputDisabled ? "Please wait for your turn..." : "Type your response to the discussion topic..."}
                        className="w-full h-24 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isInputDisabled}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {playerResponse.length} characters
                          {!isInputDisabled && (
                            <span className="ml-2 text-gray-600">• Ctrl+Enter to submit</span>
                          )}
                        </span>
                        <Button
                          onClick={handleSubmitResponse}
                          disabled={!playerResponse.trim() || isInputDisabled}
                          className="px-4 py-2 text-sm"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
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
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Meeting Complete!</h3>
                <p className="text-gray-300 text-sm mb-4">
                  You've successfully participated in all discussion topics.
                </p>
                <Button onClick={onEndMeeting} className="px-6 py-2">
                  View Summary
                </Button>
              </div>
            )}
          </div>

          {/* Right Sidebar - Context */}
          <div className="col-span-3">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 h-full overflow-y-auto">
              {/* Meeting Objective */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <Target className="w-4 h-4 text-purple-400" />
                  Objective
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {meetingData.objective}
                </p>
              </div>

              {/* Meeting Context */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <MessageCircle className="w-4 h-4 text-purple-400" />
                  Context
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {meetingData.context}
                </p>
              </div>

              {/* Current Topic Details */}
              {currentTopic && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2 uppercase tracking-wide">
                    <Lightbulb className="w-4 h-4 text-purple-400" />
                    Key Points
                  </h3>
                  <ul className="space-y-2">
                    {currentTopic.expected_points.map((point, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Topics Progress */}
              <div>
                <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wide">
                  Topics
                </h3>
                <div className="space-y-2">
                  {meetingData.topics.map((topic, index) => (
                    <div
                      key={topic.id}
                      className={`text-xs p-2 rounded ${
                        index === currentTopicIndex
                          ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                          : index < currentTopicIndex
                          ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                          : 'bg-gray-700/30 border border-gray-600/30 text-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {index < currentTopicIndex && <CheckCircle2 className="w-3 h-3" />}
                        {index === currentTopicIndex && <MessageCircle className="w-3 h-3" />}
                        <span className="font-medium">Topic {index + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Meeting Confirmation Dialog */}
      {showLeaveConfirmation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Leave Meeting Early?</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Are you sure you want to leave this meeting? You'll receive only 50% of the potential XP, 
                  and no follow-up tasks will be generated.
                </p>
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Partial XP:</span>
                <span className="text-yellow-400 font-semibold">~50% of full meeting XP</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-400">Follow-up tasks:</span>
                <span className="text-red-400 font-semibold">None</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCancelLeave}
                variant="secondary"
                className="flex-1"
                disabled={isLeaving}
              >
                Stay in Meeting
              </Button>
              <Button
                onClick={handleConfirmLeave}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Leaving...
                  </>
                ) : (
                  'Leave Early'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingView;
