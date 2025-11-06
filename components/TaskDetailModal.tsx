import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkTask } from '../types';
import Button from './shared/Button';
import { X, CheckCircle, Star, Award, Mic, ZoomIn, Loader } from 'lucide-react';
import { celebrateTaskComplete } from './shared/confetti';
import VoiceRecorder from './shared/VoiceRecorder';

interface TaskDetailModalProps {
  task: WorkTask;
  onClose: () => void;
  onSubmit: (solution: string) => void;
  isSubmitting: boolean;
  submitResult?: {
    score: number;
    feedback: string;
    xpGained: number;
    leveledUp: boolean;
    newLevel?: number;
  } | null;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onSubmit,
  isSubmitting,
  submitResult,
}) => {
  // Initialize solution based on task format
  const getInitialSolution = () => {
    if (task.formatType === 'fill_in_blank' && task.blanks) {
      const initialAnswers: Record<string, string> = {};
      task.blanks.forEach(blank => {
        initialAnswers[blank.id] = '';
      });
      return JSON.stringify(initialAnswers);
    }
    if (task.formatType === 'matching' && task.matchingLeft) {
      const initialMatches: Record<string, string> = {};
      task.matchingLeft.forEach(item => {
        initialMatches[item.id] = '';
      });
      return JSON.stringify(initialMatches);
    }
    if (task.formatType === 'prioritization' && task.prioritizationItems) {
      const initialPriority = task.prioritizationItems.map(item => item.id);
      return JSON.stringify(initialPriority);
    }
    return '';
  };
  
  const [solution, setSolution] = useState(getInitialSolution());
  const [showResult, setShowResult] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceAnswer, setVoiceAnswer] = useState<{ blob: Blob; url: string } | null>(null);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (solution.trim()) {
      onSubmit(solution);
      setShowResult(true);
    }
  };

  // Trigger confetti when result is shown
  useEffect(() => {
    if (showResult && submitResult) {
      celebrateTaskComplete();
    }
  }, [showResult, submitResult]);

  const handleClose = () => {
    setSolution('');
    setShowResult(false);
    setShowVoiceRecorder(false);
    setVoiceAnswer(null);
    setShowImageLightbox(false);
    setImageLoading(true);
    onClose();
  };

  const handleVoiceRecordingComplete = (blob: Blob, url: string) => {
    setVoiceAnswer({ blob, url });
    setSolution('[Voice Answer Recorded]');
    setShowVoiceRecorder(false);
  };

  const handleRemoveVoiceAnswer = () => {
    setVoiceAnswer(null);
    setSolution('');
  };

  // Render difficulty stars
  const renderDifficultyStars = () => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i < task.difficulty ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-700 animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-700 bg-gray-900/50">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2>
            <div className="flex items-center gap-4">
              {renderDifficultyStars()}
              <span className="text-sm text-gray-400">•</span>
              <span className="text-sm font-semibold text-green-400">+{task.xpReward} XP</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {!showResult || !submitResult ? (
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{task.description}</p>
              </div>

              {/* AI-Generated Task Image */}
              {task.imageUrl && (
                <div className="relative">
                  <h3 className="text-lg font-semibold text-white mb-2">Task Visualization</h3>
                  <div className="relative rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <Loader className="w-8 h-8 text-indigo-400 animate-spin" />
                      </div>
                    )}
                    <img
                      src={task.imageUrl}
                      alt="Task visualization"
                      className={`w-full h-auto transition-opacity duration-300 ${
                        imageLoading ? 'opacity-0' : 'opacity-100'
                      }`}
                      onLoad={() => setImageLoading(false)}
                      onError={() => setImageLoading(false)}
                    />
                    {!imageLoading && (
                      <button
                        onClick={() => setShowImageLightbox(true)}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg transition-colors backdrop-blur-sm"
                        aria-label="Zoom image"
                      >
                        <ZoomIn className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {task.requirements && task.requirements.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Requirements</h3>
                  <ul className="space-y-2">
                    {task.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <span className="text-indigo-400 mt-1">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Acceptance Criteria */}
              {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Acceptance Criteria</h3>
                  <ul className="space-y-2">
                    {task.acceptanceCriteria.map((criteria, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{criteria}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Solution Input */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="solution" className="block text-lg font-semibold text-white">
                      {task.formatType === 'multiple_choice' ? 'Select Your Answer' : 
                       task.formatType === 'fill_in_blank' ? 'Fill in the Blanks' : 
                       task.formatType === 'matching' ? 'Match the Items' :
                       task.formatType === 'code_review' ? 'Identify Bugs' :
                       task.formatType === 'prioritization' ? 'Prioritize Items' :
                       'Your Solution'}
                    </label>
                    {!voiceAnswer && !showVoiceRecorder && 
                     task.formatType !== 'multiple_choice' && 
                     task.formatType !== 'fill_in_blank' && 
                     task.formatType !== 'matching' &&
                     task.formatType !== 'code_review' &&
                     task.formatType !== 'prioritization' && (
                      <Button
                        type="button"
                        onClick={() => setShowVoiceRecorder(true)}
                        variant="secondary"
                        className="flex items-center gap-2 text-sm"
                        disabled={isSubmitting || task.status === 'completed'}
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
                      disabled={isSubmitting || task.status === 'completed'}
                    />
                  )}

                  {/* Voice Answer Display */}
                  {voiceAnswer && (
                    <div className="bg-indigo-500/10 border border-indigo-500/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-400 font-semibold flex items-center gap-2">
                          <Mic className="w-5 h-5" />
                          Voice Answer Recorded
                        </span>
                        <Button
                          type="button"
                          onClick={handleRemoveVoiceAnswer}
                          variant="secondary"
                          className="text-sm"
                          disabled={isSubmitting || task.status === 'completed'}
                        >
                          Remove
                        </Button>
                      </div>
                      <audio
                        src={voiceAnswer.url}
                        controls
                        className="w-full"
                        style={{
                          filter: 'invert(1) hue-rotate(180deg)',
                        }}
                      />
                    </div>
                  )}

                  {/* Multiple Choice Options */}
                  {task.formatType === 'multiple_choice' && task.options && (
                    <div className="space-y-3">
                      {task.options.map((option) => (
                        <label
                          key={option.id}
                          className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            solution === option.id
                              ? 'border-indigo-500 bg-indigo-500/10'
                              : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                          } ${isSubmitting || task.status === 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="radio"
                            name="multiple-choice"
                            value={option.id}
                            checked={solution === option.id}
                            onChange={(e) => setSolution(e.target.value)}
                            disabled={isSubmitting || task.status === 'completed'}
                            className="mt-1 w-5 h-5 text-indigo-500 focus:ring-indigo-500 focus:ring-2"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-indigo-400 mr-2">{option.id}.</span>
                            <span className="text-white">{option.text}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Prioritization Task */}
                  {task.formatType === 'prioritization' && task.prioritizationItems && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-400">
                        Drag and drop to arrange items in priority order (highest priority at the top)
                      </p>
                      <div className="space-y-2">
                        {(() => {
                          const priority = solution ? JSON.parse(solution || '[]') : task.prioritizationItems.map(item => item.id);
                          const items = priority.map((id: string) => task.prioritizationItems?.find(item => item.id === id)).filter(Boolean);
                          
                          return items.map((item: any, index: number) => (
                            <div
                              key={item.id}
                              className="bg-gray-900 border border-gray-600 rounded-lg p-4 flex items-center gap-4 cursor-move hover:border-indigo-500 transition-colors"
                              draggable={!isSubmitting && task.status !== 'completed'}
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', index.toString());
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                const toIndex = index;
                                
                                if (fromIndex !== toIndex) {
                                  const newPriority = [...priority];
                                  const [movedItem] = newPriority.splice(fromIndex, 1);
                                  newPriority.splice(toIndex, 0, movedItem);
                                  setSolution(JSON.stringify(newPriority));
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-2xl text-gray-500">☰</span>
                                <span className="text-lg font-bold text-indigo-400">#{index + 1}</span>
                              </div>
                              <div className="flex-1 text-white">{item.text}</div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (index > 0) {
                                      const newPriority = [...priority];
                                      [newPriority[index], newPriority[index - 1]] = [newPriority[index - 1], newPriority[index]];
                                      setSolution(JSON.stringify(newPriority));
                                    }
                                  }}
                                  disabled={index === 0 || isSubmitting || task.status === 'completed'}
                                  className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (index < items.length - 1) {
                                      const newPriority = [...priority];
                                      [newPriority[index], newPriority[index + 1]] = [newPriority[index + 1], newPriority[index]];
                                      setSolution(JSON.stringify(newPriority));
                                    }
                                  }}
                                  disabled={index === items.length - 1 || isSubmitting || task.status === 'completed'}
                                  className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Code Review Task */}
                  {task.formatType === 'code_review' && task.code && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-400">
                        Review the code below and identify all bugs. Provide line numbers and explanations.
                      </p>
                      <div className="bg-gray-900 border border-gray-600 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm">
                          {task.code.split('\n').map((line, index) => (
                            <div key={index} className="flex">
                              <span className="text-gray-500 select-none mr-4 text-right" style={{ minWidth: '2em' }}>
                                {index + 1}
                              </span>
                              <code className="text-gray-300">{line}</code>
                            </div>
                          ))}
                        </pre>
                      </div>
                      <textarea
                        rows={8}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg text-white p-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out placeholder-gray-500 font-mono text-sm"
                        placeholder="List the bugs you found with line numbers and explanations...&#10;Example:&#10;Line 5: Missing null check before accessing property&#10;Line 12: Off-by-one error in loop condition"
                        value={solution}
                        onChange={(e) => setSolution(e.target.value)}
                        disabled={isSubmitting || task.status === 'completed'}
                      />
                    </div>
                  )}

                  {/* Matching Task */}
                  {task.formatType === 'matching' && task.matchingLeft && task.matchingRight && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-400">
                        Match each item on the left with the correct item on the right
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Left column */}
                        <div className="space-y-2">
                          {task.matchingLeft.map((leftItem) => {
                            const matches = solution ? JSON.parse(solution || '{}') : {};
                            const selectedRightId = matches[leftItem.id];
                            const selectedRight = task.matchingRight?.find(r => r.id === selectedRightId);
                            
                            return (
                              <div key={leftItem.id} className="bg-gray-900 border border-gray-600 rounded-lg p-3">
                                <div className="text-white font-semibold mb-2">{leftItem.text}</div>
                                <select
                                  value={selectedRightId || ''}
                                  onChange={(e) => {
                                    const matches = solution ? JSON.parse(solution || '{}') : {};
                                    matches[leftItem.id] = e.target.value;
                                    setSolution(JSON.stringify(matches));
                                  }}
                                  disabled={isSubmitting || task.status === 'completed'}
                                  className="w-full bg-gray-800 border border-indigo-500 rounded text-white p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                  <option value="">Select a match...</option>
                                  {task.matchingRight?.map((rightItem) => (
                                    <option key={rightItem.id} value={rightItem.id}>
                                      {rightItem.text}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Right column - reference */}
                        <div className="space-y-2">
                          <div className="text-sm text-gray-400 mb-2">Available options:</div>
                          {task.matchingRight.map((rightItem) => (
                            <div key={rightItem.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                              <div className="text-gray-300 text-sm">{rightItem.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fill in the Blank */}
                  {task.formatType === 'fill_in_blank' && task.blankText && task.blanks && (
                    <div className="space-y-4">
                      <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                        <div className="text-white whitespace-pre-wrap font-mono text-sm">
                          {task.blankText.split(/(\{blank_\d+\})/).map((part, index) => {
                            const blankMatch = part.match(/\{(blank_\d+)\}/);
                            if (blankMatch) {
                              const blankId = blankMatch[1];
                              const blank = task.blanks?.find(b => b.id === blankId);
                              const blankAnswers = solution ? JSON.parse(solution || '{}') : {};
                              
                              return (
                                <input
                                  key={index}
                                  type="text"
                                  placeholder={blank?.placeholder || '___'}
                                  value={blankAnswers[blankId] || ''}
                                  onChange={(e) => {
                                    const answers = solution ? JSON.parse(solution || '{}') : {};
                                    answers[blankId] = e.target.value;
                                    setSolution(JSON.stringify(answers));
                                  }}
                                  disabled={isSubmitting || task.status === 'completed'}
                                  className="inline-block mx-1 px-2 py-1 bg-gray-800 border border-indigo-500 rounded text-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[100px]"
                                />
                              );
                            }
                            return <span key={index}>{part}</span>;
                          })}
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">
                        Fill in all the blanks with appropriate answers
                      </p>
                    </div>
                  )}

                  {/* Text Solution Textarea */}
                  {!voiceAnswer && !showVoiceRecorder && 
                   task.formatType !== 'multiple_choice' && 
                   task.formatType !== 'fill_in_blank' && 
                   task.formatType !== 'matching' &&
                   task.formatType !== 'code_review' &&
                   task.formatType !== 'prioritization' && (
                    <>
                      <textarea
                        id="solution"
                        rows={10}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg text-white p-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out placeholder-gray-500 font-mono text-sm"
                        placeholder="Enter your solution, code, or implementation details here..."
                        value={solution}
                        onChange={(e) => setSolution(e.target.value)}
                        disabled={isSubmitting || task.status === 'completed'}
                      />
                      <p className="text-sm text-gray-500">
                        {solution.length} characters
                      </p>
                    </>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !solution.trim() || task.status === 'completed'}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Solution'}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            // Grading Result View
            <div className="p-6 space-y-6">
              {/* Success Animation */}
              <div className="text-center py-8">
                {submitResult.leveledUp ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <Award className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                    </motion.div>
                    <h3 className="text-3xl font-bold text-white mb-2">Level Up!</h3>
                    <p className="text-xl text-yellow-400 mb-4">
                      You reached Level {submitResult.newLevel}!
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
                    <h3 className="text-3xl font-bold text-white mb-2">Task Completed!</h3>
                  </motion.div>
                )}
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-6 mt-6"
                >
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">Score</p>
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                      className="text-3xl font-bold text-white"
                    >
                      {submitResult.score}/100
                    </motion.p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">XP Gained</p>
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7, type: 'spring' }}
                      className="text-3xl font-bold text-green-400"
                    >
                      +{submitResult.xpGained}
                    </motion.p>
                  </div>
                </motion.div>
              </div>

              {/* Feedback */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Feedback</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{submitResult.feedback}</p>
              </div>

              {/* Close Button */}
              <div className="flex justify-center">
                <Button onClick={handleClose} className="px-8">
                  Continue
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {showImageLightbox && task.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setShowImageLightbox(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-6xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowImageLightbox(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors p-2 rounded-lg bg-black/50 hover:bg-black/70"
                aria-label="Close lightbox"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={task.imageUrl}
                alt="Task visualization (full size)"
                className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskDetailModal;
