/**
 * Transform job data from backend (snake_case) to frontend (camelCase)
 */

import { JobListing } from '../types';

export function transformJob(backendJob: any): JobListing {
  // Normalize level to ensure it's valid
  const rawLevel = (backendJob.level || 'entry').toLowerCase();
  const validLevel = ['entry', 'mid', 'senior'].includes(rawLevel) ? rawLevel : 'entry';
  
  return {
    id: backendJob.id || '',
    companyName: backendJob.company_name || backendJob.companyName || '',
    companyLogo: backendJob.company_logo || backendJob.companyLogo,
    position: backendJob.position || '',
    location: backendJob.location || '',
    jobType: backendJob.job_type || backendJob.jobType || 'remote',
    salaryRange: backendJob.salary_range || backendJob.salaryRange || { min: 50000, max: 80000 },
    level: validLevel as 'entry' | 'mid' | 'senior',
    requirements: backendJob.requirements || [],
    postedDate: backendJob.posted_date || backendJob.postedDate || 'Recently',
    description: backendJob.description,
    responsibilities: backendJob.responsibilities,
    benefits: backendJob.benefits,
    qualifications: backendJob.qualifications,
  };
}

export function transformJobs(backendJobs: any[]): JobListing[] {
  return backendJobs.map(transformJob);
}
