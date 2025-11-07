import React, { useState } from 'react';
import { RefreshCw, Briefcase, Filter, ArrowUpDown } from 'lucide-react';
import { JobListing, JobLevel, JobType } from '../types';
import JobCard from './JobCard';
import Button from './shared/Button';
import ResetButton from './shared/ResetButton';
import AgentFallback from './AgentFallback';
import { SessionExpiredError, AgentError } from '../services/backendApiService';

interface JobListingsViewProps {
  listings: JobListing[];
  onSelectJob: (jobId: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  playerLevel?: number;
  isEmployed?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onReset?: () => void;
}

// Skeleton card for loading state
const SkeletonCard: React.FC = () => (
  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 animate-pulse">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-12 h-12 bg-gray-700 rounded-lg" />
      <div className="flex-1">
        <div className="h-6 bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-700 rounded w-1/2" />
      </div>
      <div className="h-6 w-16 bg-gray-700 rounded-full" />
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-gray-700 rounded w-2/3" />
      <div className="h-4 bg-gray-700 rounded w-1/2" />
      <div className="h-4 bg-gray-700 rounded w-1/3" />
    </div>
    <div className="mb-4">
      <div className="h-3 bg-gray-700 rounded w-1/4 mb-2" />
      <div className="flex gap-2">
        <div className="h-6 w-20 bg-gray-700 rounded" />
        <div className="h-6 w-24 bg-gray-700 rounded" />
        <div className="h-6 w-16 bg-gray-700 rounded" />
      </div>
    </div>
    <div className="h-10 bg-gray-700 rounded" />
  </div>
);

const JobListingsView: React.FC<JobListingsViewProps> = ({
  listings,
  onSelectJob,
  onRefresh,
  isLoading,
  playerLevel = 1,
  isEmployed = false,
  error = null,
  onRetry,
  onReset,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    level: JobLevel | 'all';
    jobType: JobType | 'all';
    minSalary: number;
  }>({
    level: 'all',
    jobType: 'all',
    minSalary: 0,
  });
  const [sortBy, setSortBy] = useState<'salary' | 'posted' | 'relevance'>('relevance');

  // Filter listings
  const filteredListings = listings.filter((job) => {
    if (filters.level !== 'all' && job.level !== filters.level) return false;
    if (filters.jobType !== 'all' && job.jobType !== filters.jobType) return false;
    if (job.salaryRange.min < filters.minSalary) return false;
    return true;
  });

  // Sort listings
  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case 'salary':
        return b.salaryRange.max - a.salaryRange.max;
      case 'posted':
        return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
      case 'relevance':
      default:
        // Sort by level match to player level
        const levelScore = { entry: 1, mid: 2, senior: 3 };
        const playerLevelCategory: JobLevel =
          playerLevel <= 3 ? 'entry' : playerLevel <= 7 ? 'mid' : 'senior';
        const aScore = Math.abs(levelScore[a.level] - levelScore[playerLevelCategory]);
        const bScore = Math.abs(levelScore[b.level] - levelScore[playerLevelCategory]);
        return aScore - bScore;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Job Market
            </h1>
            <p className="text-gray-400">
              {isLoading ? 'Loading opportunities...' : `${sortedListings.length} positions available`}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Listings
            </Button>
            {onReset && <ResetButton onReset={onReset} />}
          </div>
        </div>

        {/* Filter and Sort Controls */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filters.level !== 'all' || filters.jobType !== 'all' || filters.minSalary > 0) && (
                <span className="ml-1 px-2 py-0.5 bg-indigo-500 text-xs rounded-full">
                  Active
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="relevance">Sort by Relevance</option>
                <option value="salary">Sort by Salary</option>
                <option value="posted">Sort by Date Posted</option>
              </select>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Level</label>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value as JobLevel | 'all' })}
                  className="w-full px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Levels</option>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Job Type</label>
                <select
                  value={filters.jobType}
                  onChange={(e) => setFilters({ ...filters, jobType: e.target.value as JobType | 'all' })}
                  className="w-full px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Types</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Min Salary: ${filters.minSalary.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="0"
                  max="200000"
                  step="10000"
                  value={filters.minSalary}
                  onChange={(e) => setFilters({ ...filters, minSalary: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Job Listings Grid */}
      <div className="max-w-7xl mx-auto">
        {error ? (
          <div className="py-8">
            <AgentFallback
              agentName="Job Market Generator"
              error={error instanceof AgentError ? error.message : 
                     error instanceof SessionExpiredError ? 'Your session has expired. Please start a new game.' :
                     'Failed to load job listings. Please try again.'}
              onRetry={onRetry || onRefresh}
              onCancel={error instanceof SessionExpiredError ? () => window.location.href = '/' : undefined}
            />
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : sortedListings.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No jobs found</h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your filters or refresh to see new listings
            </p>
            <Button onClick={onRefresh}>Refresh Listings</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedListings.map((job) => (
              <JobCard key={job.id} job={job} onViewDetails={onSelectJob} isEmployed={isEmployed} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobListingsView;
