/**
 * JobDetailView Component Usage Example
 * 
 * This example shows how to integrate the JobDetailView component
 * into your application flow.
 */

import React, { useState } from 'react';
import JobDetailView from './JobDetailView';
import { JobListing } from '../types';

const JobDetailExample: React.FC = () => {
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  // Example job data (would come from API in real app)
  const exampleJob: JobListing = {
    id: 'job-123',
    companyName: 'TechCorp Inc.',
    companyLogo: undefined,
    position: 'Senior Software Engineer',
    location: 'San Francisco, CA',
    jobType: 'remote',
    salaryRange: { min: 120000, max: 180000 },
    level: 'senior',
    requirements: [
      '5+ years of software development experience',
      'Expert knowledge of React and TypeScript',
      'Experience with cloud platforms (AWS/GCP)',
      'Strong problem-solving skills',
    ],
    postedDate: '2 days ago',
    description: `We're looking for a talented Senior Software Engineer to join our growing team. 
You'll work on cutting-edge projects that impact millions of users worldwide. 
This role offers the opportunity to lead technical initiatives and mentor junior developers.`,
    responsibilities: [
      'Design and implement scalable backend services',
      'Lead code reviews and maintain code quality standards',
      'Mentor junior developers and contribute to team growth',
      'Collaborate with product managers and designers',
      'Participate in architectural decisions',
    ],
    benefits: [
      'Competitive salary and equity package',
      'Comprehensive health, dental, and vision insurance',
      '401(k) matching up to 6%',
      'Unlimited PTO policy',
      'Remote work flexibility',
      'Professional development budget',
    ],
    qualifications: [
      "Bachelor's degree in Computer Science or related field",
      'Strong communication and collaboration skills',
      'Experience with agile development methodologies',
      'Passion for clean code and best practices',
    ],
  };

  const handleBack = () => {
    setSelectedJob(null);
    // Navigate back to job listings
  };

  const handleStartInterview = () => {
    console.log('Starting interview for job:', selectedJob?.id);
    // Navigate to interview view
  };

  if (!selectedJob) {
    return (
      <div className="p-8">
        <button
          onClick={() => setSelectedJob(exampleJob)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          View Job Details
        </button>
      </div>
    );
  }

  return (
    <JobDetailView
      job={selectedJob}
      onBack={handleBack}
      onStartInterview={handleStartInterview}
      isEmployed={false}
      matchScore={85} // Optional: pass undefined to hide
    />
  );
};

export default JobDetailExample;
