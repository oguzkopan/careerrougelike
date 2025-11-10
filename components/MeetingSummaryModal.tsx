import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  TrendingUp, 
  MessageSquare, 
  Sparkles,
  ArrowRight,
  Award,
  Target,
  ListTodo,
  ThumbsUp,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import Button from './shared/Button';
import { celebrateSuccess } from './shared/confetti';
import { MeetingSummary } from '../types';
import './meetings.css';

interface MeetingSummaryModalProps {
  summary: MeetingSummary;
  meetingTitle?: string;
  onClose: () => void;
}

const MeetingSummaryModal: React.FC<MeetingSummaryModalProps> = ({
  summary,
  meetingTitle,
  onClose,
}) => {
  const [animateScore, setAnimateScore] = React.useState(false);

  // Extract values with fallbacks for both snake_case and camelCase
  const participationScore = summary.participationScore ?? (summary as any).participation_score ?? summary.overallScore ?? (summary as any).overall_score ?? 0;
  const xpEarned = summary.xpGained ?? summary.xp_earned ?? 0;
  const feedback = summary.feedback || { strengths: [], improvements: [] };
  const generatedTasks = summary.generatedTasks ?? summary.generated_tasks ?? [];
  const keyDecisions = summary.keyDecisions ?? summary.key_decisions ?? [];
  const actionItems = summary.actionItems ?? summary.action_items ?? [];
  const earlyDeparture = summary.earlyDeparture ?? summary.early_departure ?? false;

  useEffect(() => {
    // Only trigger confetti if not early departure
    if (!earlyDeparture) {
      celebrateSuccess();
    }
    
    // Animate score after a short delay
    setTimeout(() => setAnimateScore(true), 300);
  }, [earlyDeparture]);

  // Determine score color and message
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 80) return 'Excellent participation!';
    if (score >= 60) return 'Good contribution!';
    return 'Room for improvement';
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className={`bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-700 ${
          !earlyDeparture ? 'meeting-complete-celebration' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`border-b border-gray-700 p-4 md:p-6 ${
          earlyDeparture 
            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' 
            : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20'
        }`}>
          <div className="text-center">
            {/* Success/Warning Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className={`inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full mb-3 md:mb-4 ${
                earlyDeparture ? 'bg-yellow-500/20' : 'bg-green-500/20'
              }`}
            >
              {earlyDeparture ? (
                <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 text-yellow-400" />
              ) : (
                <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-green-400" />
              )}
            </motion.div>

            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2">
              {earlyDeparture ? 'Left Meeting Early' : 'Meeting Complete!'}
            </h2>
            <p className="text-base md:text-lg text-gray-300 truncate px-4">{meetingTitle || 'Meeting Summary'}</p>
            {earlyDeparture && (
              <p className="text-sm text-yellow-400 mt-2">
                Partial XP awarded • No follow-up tasks generated
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-250px)] p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Score and XP Section */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {/* Participation Score */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 md:p-5 text-center">
              <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 mb-2">
                <TrendingUp className={`w-4 h-4 md:w-5 md:h-5 ${getScoreColor(participationScore)}`} />
                <span className="text-[10px] md:text-sm text-gray-400 uppercase tracking-wide">Score</span>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: animateScore ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
                className={`text-3xl md:text-4xl lg:text-5xl font-bold ${getScoreColor(participationScore)} mb-1`}
              >
                {participationScore}
              </motion.div>
              <p className="text-[10px] md:text-xs text-gray-400 line-clamp-2">{getScoreMessage(participationScore)}</p>
            </div>

            {/* XP Earned */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 md:p-5 text-center">
              <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 mb-2">
                <Award className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                <span className="text-[10px] md:text-sm text-gray-400 uppercase tracking-wide">XP</span>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: animateScore ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.5 }}
                className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-1 ${earlyDeparture ? 'text-yellow-400' : 'text-green-400'}`}
              >
                +{xpEarned}
              </motion.div>
              <p className="text-[10px] md:text-xs text-gray-400">Points</p>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 md:p-5">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
              <h3 className="text-base md:text-lg font-bold text-white">Feedback</h3>
            </div>

            <div className="space-y-4">
              {/* Strengths */}
              {feedback.strengths && feedback.strengths.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
                    <h4 className="text-xs md:text-sm font-semibold text-green-400 uppercase tracking-wide">Strengths</h4>
                  </div>
                  <ul className="space-y-2">
                    {feedback.strengths.map((strength, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        className="flex items-start gap-2 text-gray-300 text-xs md:text-sm"
                      >
                        <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{strength}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {feedback.improvements && feedback.improvements.length > 0 && (
                <div className="pt-3 border-t border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" />
                    <h4 className="text-xs md:text-sm font-semibold text-yellow-400 uppercase tracking-wide">Areas for Improvement</h4>
                  </div>
                  <ul className="space-y-2">
                    {feedback.improvements.map((improvement, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className="flex items-start gap-2 text-gray-300 text-xs md:text-sm"
                      >
                        <span className="text-yellow-400 mt-0.5">•</span>
                        <span>{improvement}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Early Departure Notice */}
          {earlyDeparture && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 md:p-5">
              <div className="flex items-start gap-2 md:gap-3">
                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base md:text-lg font-bold text-white mb-2">Early Departure</h3>
                  <p className="text-xs md:text-sm text-gray-300">
                    You left the meeting before completion. You received 50% of the potential XP, 
                    and no follow-up tasks were generated from this meeting.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Generated Tasks Section */}
          {!earlyDeparture && generatedTasks && generatedTasks.length > 0 && (
            <div className="bg-indigo-500/10 border border-indigo-500/50 rounded-lg p-3 md:p-5">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <ListTodo className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
                <h3 className="text-base md:text-lg font-bold text-white">New Tasks Generated</h3>
              </div>
              <p className="text-xs md:text-sm text-gray-300 mb-3">
                Based on the meeting discussion, the following tasks have been added to your work queue:
              </p>
              <ul className="space-y-2">
                {generatedTasks.map((task, index) => {
                  const taskId = task.taskId ?? task.task_id ?? `task-${index}`;
                  return (
                    <motion.li
                      key={taskId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 + index * 0.1 }}
                      className="bg-gray-900/50 border border-gray-700 rounded-lg p-2 md:p-3 flex items-center justify-between hover:border-indigo-500/50 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-400 font-bold text-xs md:text-sm">{index + 1}</span>
                        </div>
                        <span className="text-white font-medium text-xs md:text-sm truncate">{task.title}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Key Decisions Section */}
          {keyDecisions && keyDecisions.length > 0 && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                <h3 className="text-base md:text-lg font-bold text-white">Key Decisions</h3>
              </div>
              <ul className="space-y-2">
                {keyDecisions.map((decision, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.3 + index * 0.1 }}
                    className="flex items-start gap-2 text-gray-300 text-xs md:text-sm"
                  >
                    <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>{decision}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items Section */}
          {actionItems && actionItems.length > 0 && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <ListTodo className="w-4 h-4 md:w-5 md:h-5 text-pink-400" />
                <h3 className="text-base md:text-lg font-bold text-white">Action Items</h3>
              </div>
              <ul className="space-y-2">
                {actionItems.map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.5 + index * 0.1 }}
                    className="flex items-start gap-2 text-gray-300 text-xs md:text-sm"
                  >
                    <span className="text-pink-400 mt-0.5">→</span>
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 md:p-6 bg-gray-900/50">
          <Button
            onClick={onClose}
            fullWidth
            className="text-base md:text-lg py-3 md:py-4 flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            <span className="truncate">Return to Dashboard</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default MeetingSummaryModal;
