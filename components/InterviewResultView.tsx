import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  MessageSquare,
  Sparkles,
  ArrowRight,
  Building2,
  DollarSign
} from 'lucide-react';
import { InterviewResult } from '../types';
import Button from './shared/Button';
import { celebrateSuccess } from './shared/confetti';

interface InterviewResultViewProps {
  result: InterviewResult;
  jobTitle: string;
  companyName: string;
  newJobOffer?: {
    position: string;
    companyName: string;
    salary: number;
    level: string;
  };
  currentJob?: {
    position: string;
    companyName: string;
    salary: number;
  };
  onAcceptOffer?: () => void;
  onDeclineOffer?: () => void;
  onBackToListings: () => void;
  isAcceptingOffer?: boolean;
}

const InterviewResultView: React.FC<InterviewResultViewProps> = ({
  result,
  jobTitle,
  companyName,
  newJobOffer,
  currentJob,
  onAcceptOffer,
  onDeclineOffer,
  onBackToListings,
  isAcceptingOffer = false,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animateScore, setAnimateScore] = useState(false);

  useEffect(() => {
    if (result.passed) {
      setShowConfetti(true);
      celebrateSuccess();
      setTimeout(() => setShowConfetti(false), 3000);
    }
    setTimeout(() => setAnimateScore(true), 300);
  }, [result.passed]);

  const passed = result.passed;
  const score = result.overall_score || result.overallScore || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][
                    Math.floor(Math.random() * 5)
                  ],
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className={`bg-gradient-to-b ${
        passed 
          ? 'from-green-500/20 to-transparent border-green-500/30' 
          : 'from-red-500/20 to-transparent border-red-500/30'
      } border-b`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center border ${
              passed 
                ? 'bg-green-500/20 border-green-500/50' 
                : 'bg-red-500/20 border-red-500/50'
            }`}>
              <Building2 className={`w-8 h-8 ${passed ? 'text-green-400' : 'text-red-400'}`} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{jobTitle}</h1>
              <p className="text-lg text-gray-300">{companyName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Result Card */}
        <div className={`bg-gray-800/50 backdrop-blur-sm border rounded-lg p-8 mb-8 ${
          passed ? 'border-green-500/50' : 'border-red-500/50'
        }`}>
          <div className="text-center mb-8">
            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
              passed 
                ? 'bg-green-500/20 animate-bounce' 
                : 'bg-red-500/20 animate-pulse'
            }`}>
              {passed ? (
                <CheckCircle2 className="w-12 h-12 text-green-400" />
              ) : (
                <XCircle className="w-12 h-12 text-red-400" />
              )}
            </div>

            {/* Title */}
            <h2 className={`text-4xl font-bold mb-2 ${
              passed ? 'text-green-400' : 'text-red-400'
            }`}>
              {passed ? 'Congratulations!' : 'Interview Complete'}
            </h2>
            <p className="text-xl text-gray-300 mb-6">
              {passed 
                ? 'You passed the interview!' 
                : 'Unfortunately, you did not pass this time.'}
            </p>

            {/* Score */}
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-900/50 rounded-lg border border-gray-700">
              <TrendingUp className={`w-6 h-6 ${passed ? 'text-green-400' : 'text-red-400'}`} />
              <div className="text-left">
                <div className="text-sm text-gray-400">Overall Score</div>
                <div className={`text-3xl font-bold transition-all duration-1000 ${
                  animateScore ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                } ${passed ? 'text-green-400' : 'text-red-400'}`}>
                  {score}/100
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xl font-bold text-white">Detailed Feedback</h3>
            </div>

            {result.feedback.map((item, index) => (
              <div
                key={index}
                className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-2">
                      Question {index + 1}
                    </h4>
                    <p className="text-gray-400 text-sm mb-3">{item.question}</p>
                  </div>
                  <div className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-semibold ${
                    item.score >= 70 
                      ? 'bg-green-500/20 text-green-400' 
                      : item.score >= 50
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {item.score}/100
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded p-3 border-l-4 border-indigo-500">
                  <div className="text-xs text-gray-500 mb-1">Your Answer:</div>
                  <p className="text-gray-300 text-sm">{item.answer}</p>
                </div>

                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-1" />
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Feedback:</div>
                    <p className="text-gray-300 text-sm">{item.feedback}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Job Offer Details (when passed) */}
        {passed && (
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-sm border border-indigo-500/50 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Job Offer</h3>
                <p className="text-sm text-gray-400">Congratulations on your success!</p>
              </div>
            </div>

            {/* Job Comparison (when employed) */}
            {currentJob && newJobOffer ? (
              <>
                <p className="text-gray-300 mb-6">
                  Compare your current position with the new offer:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Job */}
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Current Position</div>
                    <h4 className="text-lg font-bold text-white mb-1">{currentJob.position}</h4>
                    <p className="text-gray-300 text-sm mb-3">{currentJob.companyName}</p>
                    <div className="flex items-center gap-2 text-green-400">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold">${currentJob.salary.toLocaleString()}/year</span>
                    </div>
                  </div>

                  {/* New Offer */}
                  <div className="bg-indigo-500/10 border border-indigo-500/50 rounded-lg p-4">
                    <div className="text-sm text-indigo-400 mb-2">New Offer</div>
                    <h4 className="text-lg font-bold text-white mb-1">{newJobOffer.position}</h4>
                    <p className="text-gray-300 text-sm mb-1">{newJobOffer.companyName}</p>
                    <p className="text-xs text-gray-400 mb-3 capitalize">{newJobOffer.level} Level</p>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="font-semibold text-green-400">${newJobOffer.salary.toLocaleString()}/year</span>
                      {newJobOffer.salary > currentJob.salary && (
                        <span className="text-xs text-green-400 ml-2">
                          (+${(newJobOffer.salary - currentJob.salary).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* First Job Offer */
              <div className="space-y-4">
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-2xl font-bold text-white mb-1">{jobTitle}</h4>
                      <p className="text-lg text-gray-300">{companyName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Your Score</div>
                      <div className="text-2xl font-bold text-green-400">{score}/100</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        <span className="text-sm text-gray-400">Annual Salary</span>
                      </div>
                      <div className="text-2xl font-bold text-green-400">
                        ${newJobOffer?.salary?.toLocaleString() || '85,000'}/year
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm text-gray-400">Level</span>
                      </div>
                      <div className="text-2xl font-bold text-white capitalize">
                        {newJobOffer?.level || 'Entry'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">Benefits Package</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm">Health Insurance</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm">401(k) Matching</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm">Unlimited PTO</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm">Remote Options</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-indigo-400">Start Date:</span> Within 2 weeks
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
          {passed ? (
            <>
              <h3 className="text-xl font-bold text-white mb-4">What&apos;s Next?</h3>
              <p className="text-gray-300 mb-6">
                {currentJob 
                  ? "You've successfully passed the interview! Would you like to switch to this new position?"
                  : "You've successfully passed the interview! Would you like to accept this job offer?"}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={onAcceptOffer}
                  className="flex-1 text-lg py-4"
                  disabled={isAcceptingOffer}
                >
                  {isAcceptingOffer ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      {currentJob ? 'Switch Jobs' : 'Accept Offer'}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
                <Button
                  onClick={onDeclineOffer}
                  variant="secondary"
                  className="flex-1"
                  disabled={isAcceptingOffer}
                >
                  Decline Offer
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-white mb-4">Keep Trying!</h3>
              <p className="text-gray-300 mb-6">
                Don't be discouraged. Review the feedback and try applying to other positions.
              </p>
              <Button
                onClick={onBackToListings}
                fullWidth
                className="text-lg py-4"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Back to Job Listings
              </Button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
};

export default InterviewResultView;
