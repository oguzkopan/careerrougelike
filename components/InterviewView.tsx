import React, { useState, useEffect } from 'react';
import { Briefcase, Building2, CheckCircle2, Loader2, Mic } from 'lucide-react';
import { InterviewQuestion } from '../types';
import Button from './shared/Button';
import VoiceRecorder from './shared/VoiceRecorder';
import { useToast } from './shared/Toast';

interface InterviewViewProps {
  jobTitle: string;
  companyName: string;
  questions: InterviewQuestion[];
  onSubmitAnswers: (answers: Record<string, string>) => void;
  isSubmitting: boolean;
  sessionId?: string; // Optional: for voice submissions
}

const InterviewView: React.FC<InterviewViewProps> = ({
  jobTitle,
  companyName,
  questions,
  onSubmitAnswers,
  isSubmitting,
  sessionId,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState<string | null>(null);
  const [voiceAnswers, setVoiceAnswers] = useState<Record<string, { blob: Blob; url: string }>>({});
  const { showToast } = useToast();

  // Initialize answers object
  useEffect(() => {
    const initialAnswers: Record<string, string> = {};
    questions.forEach(q => {
      initialAnswers[q.id] = '';
    });
    setAnswers(initialAnswers);
  }, [questions]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleVoiceRecordingComplete = (questionId: string, blob: Blob, url: string) => {
    setVoiceAnswers(prev => ({
      ...prev,
      [questionId]: { blob, url },
    }));
    setAnswers(prev => ({
      ...prev,
      [questionId]: '[Voice Answer Recorded]',
    }));
    setShowVoiceRecorder(null);
  };

  const handleRemoveVoiceAnswer = (questionId: string) => {
    setVoiceAnswers(prev => {
      const newVoiceAnswers = { ...prev };
      delete newVoiceAnswers[questionId];
      return newVoiceAnswers;
    });
    setAnswers(prev => ({
      ...prev,
      [questionId]: '',
    }));
  };

  const allAnswered = questions.every(q => answers[q.id]?.trim().length > 0);

  const handleSubmit = async () => {
    if (!allAnswered || isSubmitting) return;
    
    // Check if there are any voice answers
    const hasVoiceAnswers = Object.keys(voiceAnswers).length > 0;
    
    if (hasVoiceAnswers && sessionId) {
      // Process voice answers first to get transcriptions
      showToast('Processing voice answers...', 'info');
      
      const processedAnswers = { ...answers };
      let allVoiceProcessed = true;
      
      try {
        // Import the voice submission function
        const { submitInterviewVoiceAnswer } = await import('../services/backendApiService');
        
        // Process each voice answer sequentially
        for (const [questionId, voiceData] of Object.entries(voiceAnswers)) {
          const questionIndex = questions.findIndex(q => q.id === questionId);
          const questionNum = questionIndex + 1;
          
          try {
            showToast(`Transcribing voice answer ${questionNum}/${questions.length}...`, 'info');
            
            const result = await submitInterviewVoiceAnswer(
              sessionId,
              questionId,
              voiceData.blob
            );
            
            // Replace the placeholder with the actual transcription
            // The voice endpoint returns transcription even though it also grades
            if (result.transcription && result.transcription.trim()) {
              processedAnswers[questionId] = result.transcription;
            } else {
              // Fallback if transcription is empty
              processedAnswers[questionId] = '[Voice answer could not be transcribed]';
              allVoiceProcessed = false;
            }
            
          } catch (error) {
            console.error(`Failed to process voice answer for ${questionId}:`, error);
            showToast(`Failed to transcribe voice answer ${questionNum}`, 'error');
            // Use a fallback text if transcription fails
            processedAnswers[questionId] = '[Voice answer - transcription failed]';
            allVoiceProcessed = false;
          }
        }
        
        if (allVoiceProcessed) {
          showToast('All voice answers transcribed successfully!', 'success');
        } else {
          showToast('Some voice answers could not be transcribed', 'warning');
        }
        
        // Small delay to show the success message
        await new Promise(resolve => setTimeout(resolve, 500));
        
        showToast('Submitting interview...', 'info');
        onSubmitAnswers(processedAnswers);
      } catch (error) {
        showToast('Failed to process voice answers', 'error');
        console.error('Voice processing error:', error);
      }
    } else {
      // No voice answers, submit normally
      onSubmitAnswers(answers);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-indigo-500/20 to-transparent border-b border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/50">
              <Building2 className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{jobTitle}</h1>
              <p className="text-lg text-gray-300">{companyName}</p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-indigo-400 font-semibold">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Question Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`flex-shrink-0 w-10 h-10 rounded-lg font-semibold transition-all ${
                index === currentQuestionIndex
                  ? 'bg-indigo-500 text-white scale-110'
                  : answers[q.id]?.trim().length > 0
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-gray-700/50 text-gray-400 border border-gray-600'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* Current Question */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-8 mb-6">
          <div className="flex items-start gap-3 mb-6">
            <Briefcase className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-2">
                Question {currentQuestionIndex + 1}
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>
          </div>

          {/* Answer Input Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-400">
                Your Answer
              </label>
              {!voiceAnswers[currentQuestion.id] && showVoiceRecorder !== currentQuestion.id && (
                <Button
                  onClick={() => setShowVoiceRecorder(currentQuestion.id)}
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
            {showVoiceRecorder === currentQuestion.id && (
              <VoiceRecorder
                onRecordingComplete={(blob, url) => handleVoiceRecordingComplete(currentQuestion.id, blob, url)}
                onCancel={() => setShowVoiceRecorder(null)}
                disabled={isSubmitting}
              />
            )}

            {/* Voice Answer Display */}
            {voiceAnswers[currentQuestion.id] && (
              <div className="bg-indigo-500/10 border border-indigo-500/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-400 font-semibold flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Voice Answer Recorded
                  </span>
                  <Button
                    onClick={() => handleRemoveVoiceAnswer(currentQuestion.id)}
                    variant="secondary"
                    className="text-sm"
                    disabled={isSubmitting}
                  >
                    Remove
                  </Button>
                </div>
                <audio
                  src={voiceAnswers[currentQuestion.id].url}
                  controls
                  className="w-full"
                  style={{
                    filter: 'invert(1) hue-rotate(180deg)',
                  }}
                />
              </div>
            )}

            {/* Text Answer Textarea */}
            {!voiceAnswers[currentQuestion.id] && showVoiceRecorder !== currentQuestion.id && (
              <>
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full h-48 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  disabled={isSubmitting}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className={`${
                    answers[currentQuestion.id]?.trim().length > 0
                      ? 'text-green-400'
                      : 'text-gray-500'
                  }`}>
                    {answers[currentQuestion.id]?.length || 0} characters
                  </span>
                  {answers[currentQuestion.id]?.trim().length > 0 && (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Answered
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            variant="secondary"
            disabled={currentQuestionIndex === 0 || isSubmitting}
          >
            Previous
          </Button>
          <Button
            onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
            variant="secondary"
            disabled={currentQuestionIndex === questions.length - 1 || isSubmitting}
          >
            Next
          </Button>
        </div>

        {/* Submit Button */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Ready to Submit?</h3>
              <p className="text-sm text-gray-400">
                {allAnswered
                  ? 'All questions answered. Good luck!'
                  : `${questions.filter(q => answers[q.id]?.trim().length > 0).length} of ${questions.length} questions answered`}
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
              className="min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Grading...
                </>
              ) : (
                'Submit Answers'
              )}
            </Button>
          </div>
          {!allAnswered && (
            <p className="text-sm text-yellow-400">
              Please answer all questions before submitting.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewView;
