import React from 'react';
import { 
  ArrowLeft, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  Building2,
  CheckCircle2,
  Target,
  Gift,
  GraduationCap,
  TrendingUp
} from 'lucide-react';
import { JobListing } from '../types';
import Button from './shared/Button';

interface JobDetailViewProps {
  job: JobListing;
  onBack: () => void;
  onStartInterview: () => void;
  isEmployed?: boolean;
  matchScore?: number;
}

const JobDetailView: React.FC<JobDetailViewProps> = ({
  job,
  onBack,
  onStartInterview,
  isEmployed = false,
  matchScore,
}) => {
  // Color coding by level
  const levelColors = {
    entry: {
      border: 'border-green-500/50',
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      badge: 'bg-green-500/20 text-green-300',
      gradient: 'from-green-500/20 to-transparent',
    },
    mid: {
      border: 'border-blue-500/50',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      badge: 'bg-blue-500/20 text-blue-300',
      gradient: 'from-blue-500/20 to-transparent',
    },
    senior: {
      border: 'border-purple-500/50',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      badge: 'bg-purple-500/20 text-purple-300',
      gradient: 'from-purple-500/20 to-transparent',
    },
  };

  const colors = levelColors[job.level];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header with gradient */}
      <div className={`bg-gradient-to-b ${colors.gradient} border-b border-gray-700/50`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Listings</span>
          </button>

          {/* Company and Position Header */}
          <div className="flex items-start gap-6">
            <div className={`w-20 h-20 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0 border ${colors.border}`}>
              <Building2 className={`w-10 h-10 ${colors.text}`} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                    {job.position}
                  </h1>
                  <p className="text-xl text-gray-300">{job.companyName}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${colors.badge} whitespace-nowrap`}>
                  {job.level.charAt(0).toUpperCase() + job.level.slice(1)} Level
                </span>
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Briefcase className="w-4 h-4" />
                  <span className="capitalize">{job.jobType}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-semibold text-white">
                    {job.salaryRange ? (
                      `$${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()}`
                    ) : (
                      'Salary not specified'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Posted {job.postedDate}</span>
                </div>
              </div>

              {/* Match Score (optional) */}
              {matchScore !== undefined && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/50 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm">
                    <span className="font-semibold text-indigo-300">{matchScore}% Match</span>
                    <span className="text-gray-400 ml-2">based on your CV</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Job Description */}
            {job.description && (
              <section className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-indigo-400" />
                  About the Role
                </h2>
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                  {job.description}
                </p>
              </section>
            )}

            {/* Responsibilities */}
            {job.responsibilities && job.responsibilities.length > 0 && (
              <section className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-indigo-400" />
                  Key Responsibilities
                </h2>
                <ul className="space-y-3">
                  {job.responsibilities.map((responsibility, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
                      <span className="text-gray-300">{responsibility}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <section className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Gift className="w-6 h-6 text-indigo-400" />
                  Benefits & Perks
                </h2>
                <ul className="space-y-3">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Right Column - Requirements & Actions */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 sticky top-6">
              <Button
                onClick={onStartInterview}
                fullWidth
                className="mb-3 text-lg py-4"
              >
                {isEmployed ? 'Apply for Position' : 'Start Interview'}
              </Button>
              <Button
                onClick={onBack}
                variant="secondary"
                fullWidth
              >
                Back to Listings
              </Button>
            </div>

            {/* Requirements */}
            <section className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                Requirements
              </h2>
              <div className="space-y-2">
                {job.requirements.map((requirement, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-gray-700/50 text-gray-300 text-sm rounded border border-gray-600 hover:border-gray-500 transition-colors"
                  >
                    {requirement}
                  </div>
                ))}
              </div>
            </section>

            {/* Qualifications */}
            {job.qualifications && job.qualifications.length > 0 && (
              <section className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  Qualifications
                </h2>
                <ul className="space-y-2">
                  {job.qualifications.map((qualification, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className={`${colors.text} mt-1`}>•</span>
                      <span>{qualification}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Company Info */}
            <section className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Company Info
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Company:</span>
                  <p className="text-white font-semibold">{job.companyName}</p>
                </div>
                <div>
                  <span className="text-gray-400">Location:</span>
                  <p className="text-white">{job.location}</p>
                </div>
                <div>
                  <span className="text-gray-400">Work Type:</span>
                  <p className="text-white capitalize">{job.jobType}</p>
                </div>
                <div>
                  <span className="text-gray-400">Salary Range:</span>
                  <p className="text-white font-semibold">
                    {job.salaryRange ? (
                      `$${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()}`
                    ) : (
                      'Not specified'
                    )}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailView;
