/**
 * Example usage of Interview Flow components
 * 
 * This demonstrates how to integrate InterviewView and InterviewResultView
 * with the useInterview hook from backendApiService
 */

import React, { useState } from 'react';
import InterviewView from './InterviewView';
import InterviewResultView from './InterviewResultView';
import { useInterview } from '../services/backendApiService';
import { InterviewResult } from '../types';

interface InterviewFlowExampleProps {
  sessionId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  onAcceptOffer: () => void;
  onDeclineOffer: () => void;
  onBackToListings: () => void;
}

const InterviewFlowExample: React.FC<InterviewFlowExampleProps> = ({
  sessionId,
  jobId,
  jobTitle,
  companyName,
  onAcceptOffer,
  onDeclineOffer,
  onBackToListings,
}) => {
  const [interviewResult, setInterviewResult] = useState<InterviewResult | null>(null);
  
  const {
    questions,
    isLoadingQuestions,
    submitAnswersAsync,
    isSubmitting,
    acceptOfferAsync,
  } = useInterview(sessionId, jobId);

  const handleSubmitAnswers = async (answers: Record<string, string>) => {
    try {
      const result = await submitAnswersAsync({ answers });
      setInterviewResult(result);
    } catch (error) {
      console.error('Failed to submit answers:', error);
    }
  };

  const handleAcceptOffer = async () => {
    try {
      await acceptOfferAsync();
      onAcceptOffer();
    } catch (error) {
      console.error('Failed to accept offer:', error);
    }
  };

  // Show loading state
  if (isLoadingQuestions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading interview questions...</p>
        </div>
      </div>
    );
  }

  // Show result view after submission
  if (interviewResult) {
    return (
      <InterviewResultView
        result={interviewResult}
        jobTitle={jobTitle}
        companyName={companyName}
        onAcceptOffer={interviewResult.passed ? handleAcceptOffer : undefined}
        onDeclineOffer={interviewResult.passed ? onDeclineOffer : undefined}
        onBackToListings={onBackToListings}
      />
    );
  }

  // Show interview view
  return (
    <InterviewView
      jobTitle={jobTitle}
      companyName={companyName}
      questions={questions}
      onSubmitAnswers={handleSubmitAnswers}
      isSubmitting={isSubmitting}
    />
  );
};

export default InterviewFlowExample;
