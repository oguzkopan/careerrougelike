import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageCircle, CheckCircle2, Loader2, Mic, X, Target, Lightbulb, AlertTriangle } from 'lucide-react';
import Button from './shared/Button';
import VoiceRecorder from './shared/VoiceRecorder';
import { useToast } from './shared/Toast';
import { getMeetingMessages, leaveMeeting } from '../services/backendApiService';
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
  onLeaveMeeting?: (summary: any) => void;
  isProcessing?: boolean;
}

const MeetingView: React.FC<MeetingViewProps> = ({
  meetingData,
  sessionId,
  onRespond,
  onEndMeeting,
  onLeaveMeeting,
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
  const [isPlayerTurn, setIsPlayerTurn] = useState(false); // Start with false - AI talks first
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false); // Track if messages are being animated
  const [lastMessageId, setLastMessageId] = useState<string | null>(null); // Track last seen message for polling
  const { showToast } = useToast();

  const currentTopic = meetingData.topics[currentTopicIndex];
  const progress = ((currentTopicIndex + 1) / meetingData.topics.length) * 100;
  
  // Determine if input should be disabled
  const isInputDisabled = isSubmitting || (isProcessing ?? false) || meetingComplete || !isPlayerTurn || isLoadingMessages;

  // Initialize conversation with meeting data or first topic - with animated message appearance
  // Requirements: 2.2, 2.3, 2.6, 2.7, 3.1, 3.2, 3.9
  useEffect(() => {
    if (conversationHistory.length === 0) {
      // Check if meeting data has conversation_history from backend
      const backendHistory = (meetingData as any).conversation_history;
      const backendIsPlayerTurn = (meetingData as any).is_player_turn;
      const backendCurrentTopicIndex = (meetingData as any).current_topic_index;
      const backendStatus = (meetingData as any).status;
      
      // Restore current topic index and turn state from backend
      if (backendCurrentTopicIndex !== undefined) {
        setCurrentTopicIndex(backendCurrentTopicIndex);
        console.log('[MeetingView] Restored topic index:', backendCurrentTopicIndex);
      }
      
      // Handle meeting completion state
      if (backendStatus === 'completed') {
        setMeetingComplete(true);
        console.log('[MeetingView] Meeting is already completed');
      }
      
      if (backendHistory && backendHistory.length > 0) {
        setIsLoadingMessages(true);
        setIsPlayerTurn(false);
        
        // Convert backend conversation history to frontend format
        const convertedHistory = backendHistory.map((msg: any) => {
          if (msg.type === 'topic_intro') {
            return {
              type: 'topic' as const,
              content: msg.content,
            };
          } else if (msg.type === 'ai_response') {
            return {
              type: 'ai' as const,
              content: msg.content,
              participant: msg.participant_name,
              sentiment: msg.sentiment,
            };
          } else if (msg.type === 'player_response') {
            return {
              type: 'player' as const,
              content: msg.content,
            };
          }
          return null;
        }).filter(Boolean);
        
        // Load all messages immediately for real-time feel
        const loadMessages = async () => {
          // Add all messages at once for instant display
          setConversationHistory(convertedHistory);
          
          // After all messages are shown, restore player turn state
          setIsLoadingMessages(false);
          
          // If backend says it's player's turn, enable input immediately
          if (backendIsPlayerTurn) {
            setIsPlayerTurn(true);
            console.log('[MeetingView] Restored player turn state: true');
          } else {
            // Otherwise, polling will continue and pick up new messages
            console.log('[MeetingView] All initial messages loaded, polling will continue...');
          }
        };
        
        loadMessages();
        console.log('[MeetingView] Loading', convertedHistory.length, 'messages from backend');
        
        // Set last message ID for polling
        if (backendHistory.length > 0) {
          const lastMsg = backendHistory[backendHistory.length - 1];
          setLastMessageId(lastMsg.id || null);
        }
      } else if (currentTopic) {
        // Fallback: just show the topic
        setConversationHistory([
          {
            type: 'topic',
            content: currentTopic.question,
          },
        ]);
        setIsPlayerTurn(true);
      }
    }
  }, [currentTopic, conversationHistory.length, meetingData]);

  // Poll for new AI messages while meeting is active
  // Requirements: 3.3, 3.4, 3.6, 3.7, 3.9
  useEffect(() => {
    // Stop polling only when meeting is complete
    // Continue polling even during player turn, submission, or loading to catch all messages
    if (meetingComplete) {
      console.log('[MeetingView] Polling stopped - meeting complete');
      return;
    }

    console.log('[MeetingView] 🔄 Starting polling for new messages...');
    console.log('[MeetingView] 📊 Polling config:', {
      sessionId,
      meetingId: meetingData.id,
      lastMessageId,
      pollInterval: '2s'
    });
    
    // Poll every 2 seconds for new messages (faster polling for better UX)
    const pollInterval = setInterval(async () => {
      try {
        console.log('[MeetingView] 🔍 Polling for messages since:', lastMessageId);
        
        // Fetch new messages since last seen message ID
        const newMessages = await getMeetingMessages(sessionId, meetingData.id, lastMessageId);
        
        console.log('[MeetingView] 📨 Poll response:', {
          messageCount: newMessages?.length || 0,
          messages: newMessages
        });
        
        if (newMessages && newMessages.length > 0) {
          console.log('[MeetingView] ✅ Received', newMessages.length, 'new messages');
          
          // Track if we received player_turn signal
          let receivedPlayerTurn = false;
          const messagesToAdd: any[] = [];
          
          // Process all messages first (batch processing to avoid duplicates)
          for (const msg of newMessages) {
            // Update last message ID for all messages
            setLastMessageId(msg.id);
            
            // Handle "player_turn" signal message
            if (msg.type === 'player_turn') {
              receivedPlayerTurn = true;
              console.log('[MeetingView] Player turn signal received');
              continue; // Don't display player_turn messages
            }
            
            // Convert backend message format to frontend format
            let convertedMsg = null;
            
            if (msg.type === 'topic_intro') {
              convertedMsg = {
                type: 'topic' as const,
                content: msg.content,
              };
              // Update current topic index when new topic starts
              const topicIndex = meetingData.topics.findIndex(t => msg.content.includes(t.question));
              if (topicIndex >= 0) {
                setCurrentTopicIndex(topicIndex);
              }
            } else if (msg.type === 'ai_response') {
              convertedMsg = {
                type: 'ai' as const,
                content: msg.content,
                participant: msg.participant_name,
                sentiment: msg.sentiment,
              };
            }
            
            if (convertedMsg) {
              messagesToAdd.push(convertedMsg);
            }
          }
          
          // Add all messages at once, checking for duplicates
          if (messagesToAdd.length > 0) {
            setConversationHistory(prev => {
              // Create a set of existing message keys for duplicate detection
              const existingKeys = new Set(
                prev.map(m => `${m.type}-${m.participant || ''}-${m.content}`)
              );
              
              // Filter out duplicates
              const uniqueMessages = messagesToAdd.filter(m => {
                const key = `${m.type}-${m.participant || ''}-${m.content}`;
                if (existingKeys.has(key)) {
                  console.log('[MeetingView] Skipping duplicate message');
                  return false;
                }
                return true;
              });
              
              if (uniqueMessages.length > 0) {
                console.log('[MeetingView] Adding', uniqueMessages.length, 'unique messages');
              }
              
              return [...prev, ...uniqueMessages];
            });
          }
          
          // Update turn state AFTER all messages are processed
          if (receivedPlayerTurn) {
            setIsPlayerTurn(true);
            setIsLoadingMessages(false);
            console.log('[MeetingView] Player turn enabled');
          }
          
          // If we received messages but no player_turn signal, keep loading state
          if (messagesToAdd.length > 0 && !receivedPlayerTurn) {
            setIsLoadingMessages(false);
          }
        }
      } catch (error) {
        console.error('[MeetingView] ❌ Polling error:', error);
        console.error('[MeetingView] 📊 Error details:', {
          sessionId,
          meetingId: meetingData.id,
          lastMessageId,
          error: error instanceof Error ? error.message : String(error)
        });
        // Silently handle errors - polling will retry on next interval
      }
    }, 2000); // Poll every 2 seconds for faster updates

    return () => {
      console.log('[MeetingView] ⏹️ Stopping polling');
      clearInterval(pollInterval);
    };
  }, [meetingComplete, sessionId, meetingData.id, lastMessageId, meetingData.topics]);

  const handleVoiceRecordingComplete = (audioBlob: Blob, audioUrl: string) => {
    // Store the audio blob for future use (e.g., sending to backend)
    // For now, we'll use a placeholder text
    setPlayerResponse('[Voice response recorded]');
    setShowVoiceRecorder(false);
    showToast('Voice response recorded. Click Submit to continue.', 'success');
    
    // In a real implementation, you would store the audioBlob and audioUrl
    // to send to the backend for transcription/processing
    console.log('Audio recorded:', { audioBlob, audioUrl });
  };

  const handleLeaveMeetingClick = () => {
    setShowLeaveConfirmation(true);
  };

  const handleConfirmLeave = async () => {
    setIsLeaving(true);
    setShowLeaveConfirmation(false);

    try {
      // Call the leave meeting API
      const summary = await leaveMeeting(sessionId, meetingData.id);
      
      showToast('You left the meeting early. Partial XP awarded.', 'info');
      
      // Call the onLeaveMeeting callback with the partial summary
      if (onLeaveMeeting) {
        onLeaveMeeting(summary);
      } else {
        // Fallback to onEndMeeting if onLeaveMeeting is not provided
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

  const handleSubmitResponse = async () => {
    if (!playerResponse.trim() || isInputDisabled || !currentTopic) return;

    setIsSubmitting(true);
    setIsPlayerTurn(false); // Disable input while processing

    try {
      // Add player response to conversation
      const playerMessage = {
        type: 'player' as const,
        content: playerResponse,
      };
      
      setConversationHistory(prev => [...prev, playerMessage]);

      // Clear input immediately after adding to conversation
      const responseToSubmit = playerResponse;
      setPlayerResponse('');

      // Submit response - backend will handle AI reactions and next topic
      const result = await onRespond(currentTopic.id, responseToSubmit);

      console.log('[MeetingView] Response submitted, result:', result);

      // DON'T process result.ai_responses or add them to conversation
      // Polling will fetch all new messages automatically
      // This prevents duplicate messages
      
      // Update meeting completion state
      if (result.meeting_complete) {
        setMeetingComplete(true);
        setIsPlayerTurn(false);
        showToast('Meeting complete! Great job.', 'success');
      } else {
        // Backend has started the next topic and generated AI messages
        // Polling will pick them up automatically
        // Just update the topic index if provided
        if (result.next_topic_index !== undefined) {
          setCurrentTopicIndex(result.next_topic_index);
        }
        
        // Set loading state while waiting for AI messages
        setIsLoadingMessages(true);
        
        // Don't set isPlayerTurn here - let polling handle it via player_turn signal
        console.log('[MeetingView] Waiting for AI discussion via polling...');
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
      showToast('Failed to submit response. Please try again.', 'error');
      // Re-enable player turn on error
      setIsPlayerTurn(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  const getParticipantAvatar = (name: string, avatarColor?: string) => {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    const defaultColors = [
      '#3B82F6',
      '#10B981',
      '#8B5CF6',
      '#EC4899',
      '#F59E0B',
      '#6366F1',
    ];
    
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
              {/* Progress Indicator */}
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
                {meetingData.participants.map((participant, index) => (
                  <div key={participant.id} className="participant-list-item flex items-start gap-3">
                    {getParticipantAvatar(participant.name, participant.avatar_color)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {participant.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {participant.role}
                      </p>
                      <p className="text-xs text-purple-400 mt-1 capitalize">
                        {participant.personality}
                      </p>
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

                {/* Removed typing indicators - messages appear directly via polling */}

                {/* Turn management UI - Requirements: 2.3, 2.7, 3.7 */}
                {/* Display clear indicator when it's player's turn AND not loading messages */}
                {!meetingComplete && isPlayerTurn && !isLoadingMessages && conversationHistory.length > 0 && (
                  <div className="your-turn-indicator bg-indigo-500/10 border border-indigo-500/50 rounded-lg p-3 text-center">
                    <p className="text-indigo-400 font-medium text-sm">⏳ Your turn to speak</p>
                  </div>
                )}
                
                {/* Show "Others are speaking" when messages are being loaded */}
                {!meetingComplete && isLoadingMessages && (
                  <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-3 text-center">
                    <p className="text-gray-400 font-medium text-sm flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Others are speaking...
                    </p>
                  </div>
                )}

                <div ref={conversationEndRef} />
              </div>
            </div>

            {/* Response Input - Only show when it's player's turn */}
            {/* Requirements: 2.3, 2.7, 3.7 - Enable input immediately when player turn signal received */}
            {!meetingComplete && isPlayerTurn && (
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

                  {/* Voice Recorder */}
                  {showVoiceRecorder && (
                    <VoiceRecorder
                      onRecordingComplete={handleVoiceRecordingComplete}
                      onCancel={() => setShowVoiceRecorder(false)}
                      disabled={isInputDisabled}
                    />
                  )}

                  {/* Text Input */}
                  {!showVoiceRecorder && (
                    <>
                      <textarea
                        value={playerResponse}
                        onChange={(e) => setPlayerResponse(e.target.value)}
                        onKeyDown={(e) => {
                          // Allow Ctrl+Enter or Cmd+Enter to submit
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && playerResponse.trim() && !isInputDisabled) {
                            handleSubmitResponse();
                          }
                        }}
                        placeholder={isInputDisabled ? "Please wait..." : "Type your response to the discussion topic..."}
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
            
            {/* Input Disabled Message - Show when not player's turn */}
            {/* Requirements: 2.3, 2.7, 3.7 - Disable input when not player's turn */}
            {!meetingComplete && !isPlayerTurn && (
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Input disabled - waiting for your turn to speak
                  </p>
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
