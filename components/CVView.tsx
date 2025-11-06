import React from 'react';
import Button from './shared/Button';
import LoadingSpinner from './shared/LoadingSpinner';
import { 
  X, 
  Briefcase, 
  Award, 
  TrendingUp, 
  Calendar,
  Download,
  Star,
  CheckCircle
} from 'lucide-react';
import { usePlayerState } from '../services/backendApiService';

interface CVViewProps {
  sessionId: string;
  onClose: () => void;
}

const CVView: React.FC<CVViewProps> = ({ sessionId, onClose }) => {
  const { data: playerState, isLoading } = usePlayerState(sessionId);

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    console.log('Export to PDF - Feature coming soon!');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!playerState) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md">
          <p className="text-gray-300 text-center">Unable to load CV data</p>
          <Button onClick={onClose} className="mt-4 w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

  const cvData = playerState.cv_data || { experience: [], skills: [], accomplishments: [] };
  const stats = playerState.stats || {
    tasksCompleted: 0,
    interviewsPassed: 0,
    jobsHeld: 0,
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen py-8 px-4 flex items-center justify-center">
        <div 
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg shadow-2xl max-w-4xl w-full border border-gray-700 animate-fadeIn"
          style={{
            animation: 'fadeIn 0.3s ease-in-out'
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-lg relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              aria-label="Close CV"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-full p-4">
                <Briefcase className="w-12 h-12 text-white" />
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Professional Resume
                </h1>
                <div className="flex flex-wrap gap-4 text-white/90">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span className="font-semibold">Level {playerState.level}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <span className="font-semibold">{playerState.xp} XP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Career Stats Section */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-indigo-400" />
                Career Statistics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Tasks Completed</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {stats.tasksCompleted}
                      </p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-400 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Interviews Passed</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {stats.interviewsPassed}
                      </p>
                    </div>
                    <Award className="w-10 h-10 text-blue-400 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Jobs Held</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {stats.jobsHeld}
                      </p>
                    </div>
                    <Briefcase className="w-10 h-10 text-purple-400 opacity-50" />
                  </div>
                </div>
              </div>
            </section>

            {/* Experience Section */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-indigo-400" />
                Professional Experience
              </h2>
              
              {cvData.experience && cvData.experience.length > 0 ? (
                <div className="space-y-6">
                  {cvData.experience.map((job: any, index: number) => (
                    <div
                      key={index}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-indigo-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            {job.position}
                          </h3>
                          <p className="text-indigo-400 font-semibold">
                            {job.company_name || job.companyName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDate(job.start_date || job.startDate)}
                            {job.end_date || job.endDate ? (
                              <> - {formatDate(job.end_date || job.endDate)}</>
                            ) : (
                              <> - Present</>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      {job.accomplishments && job.accomplishments.length > 0 && (
                        <div className="mt-4">
                          <p className="text-gray-400 text-sm font-semibold mb-2">
                            Key Accomplishments:
                          </p>
                          <ul className="space-y-2">
                            {job.accomplishments.map((accomplishment: string, idx: number) => (
                              <li
                                key={idx}
                                className="text-gray-300 text-sm flex items-start gap-2"
                              >
                                <span className="text-indigo-400 mt-1">•</span>
                                <span>{accomplishment}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
                  <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">
                    No work experience yet. Start your career by finding your first job!
                  </p>
                </div>
              )}
            </section>

            {/* Skills Section */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Star className="w-6 h-6 text-indigo-400" />
                Skills & Expertise
              </h2>
              
              {cvData.skills && cvData.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {cvData.skills.map((skill: string, index: number) => (
                    <span
                      key={index}
                      className="bg-indigo-600/20 border border-indigo-500/50 text-indigo-300 px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-600/30 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
                  <Star className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">
                    No skills listed yet. Complete tasks to develop your skillset!
                  </p>
                </div>
              )}
            </section>

            {/* Additional Accomplishments Section */}
            {cvData.accomplishments && cvData.accomplishments.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-indigo-400" />
                  Notable Achievements
                </h2>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                  <ul className="space-y-3">
                    {cvData.accomplishments.map((accomplishment: string, index: number) => (
                      <li
                        key={index}
                        className="text-gray-300 flex items-start gap-3"
                      >
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{accomplishment}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-800/50 border-t border-gray-700 p-6 rounded-b-lg flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleExportPDF}
              variant="secondary"
              className="flex items-center justify-center gap-2 flex-1"
            >
              <Download className="w-4 h-4" />
              Export to PDF
            </Button>
            <Button
              onClick={onClose}
              variant="primary"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

// Helper function to format dates
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  } catch {
    return dateString;
  }
};

export default CVView;
