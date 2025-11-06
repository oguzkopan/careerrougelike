import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, DollarSign, Clock } from 'lucide-react';
import { JobListing } from '../types';
import Button from './shared/Button';
import CompanyLogo from './shared/CompanyLogo';

interface JobCardProps {
  job: JobListing;
  onViewDetails: (jobId: string) => void;
  isEmployed?: boolean;
}

const JobCard: React.FC<JobCardProps> = ({ job, onViewDetails, isEmployed = false }) => {
  // Color coding by level
  const levelColors = {
    entry: {
      border: 'border-green-500/50',
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      badge: 'bg-green-500/20 text-green-300',
    },
    mid: {
      border: 'border-blue-500/50',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      badge: 'bg-blue-500/20 text-blue-300',
    },
    senior: {
      border: 'border-purple-500/50',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      badge: 'bg-purple-500/20 text-purple-300',
    },
  };

  // Normalize level to ensure it's valid, default to 'entry' if undefined
  const normalizedLevel = (job.level?.toLowerCase() || 'entry') as 'entry' | 'mid' | 'senior';
  const validLevel = ['entry', 'mid', 'senior'].includes(normalizedLevel) ? normalizedLevel : 'entry';
  const colors = levelColors[validLevel];

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`bg-gray-800/50 backdrop-blur-sm border ${colors.border} rounded-lg p-6 hover:shadow-lg hover:shadow-${job.level === 'entry' ? 'green' : job.level === 'mid' ? 'blue' : 'purple'}-500/20 transition-shadow duration-300 cursor-pointer`}
      onClick={() => onViewDetails(job.id)}
    >
      {/* Company Logo */}
      <div className="flex items-start gap-4 mb-4">
        <CompanyLogo companyName={job.companyName} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-white mb-1 truncate">{job.position}</h3>
          <p className="text-gray-400 text-sm truncate">{job.companyName}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge} whitespace-nowrap`}>
          {validLevel.charAt(0).toUpperCase() + validLevel.slice(1)}
        </span>
      </div>

      {/* Job Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <MapPin className="w-4 h-4" />
          <span>{job.location}</span>
          <span className="text-gray-600">•</span>
          <span className="capitalize">{job.jobType}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <DollarSign className="w-4 h-4" />
          <span>
            {job.salaryRange ? (
              `$${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()}`
            ) : (
              'Salary not specified'
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{job.postedDate}</span>
        </div>
      </div>

      {/* Key Requirements */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Key Requirements</p>
        <div className="flex flex-wrap gap-2">
          {job.requirements.slice(0, 3).map((req, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded border border-gray-600"
            >
              {req}
            </span>
          ))}
          {job.requirements.length > 3 && (
            <span className="px-2 py-1 text-gray-500 text-xs">
              +{job.requirements.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* View Details Button */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails(job.id);
        }}
        fullWidth
        className="text-sm"
      >
        {isEmployed ? 'Apply' : 'View Details'}
      </Button>
    </motion.div>
  );
};

export default JobCard;
