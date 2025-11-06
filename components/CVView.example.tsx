/**
 * Example usage of CVView component
 * 
 * This demonstrates how to integrate the CVView with the WorkDashboard
 */

import React, { useState } from 'react';
import WorkDashboard from './WorkDashboard';
import CVView from './CVView';

interface WorkDashboardWithCVProps {
  sessionId: string;
  onJobSearch: () => void;
}

const WorkDashboardWithCV: React.FC<WorkDashboardWithCVProps> = ({
  sessionId,
  onJobSearch,
}) => {
  const [showCV, setShowCV] = useState(false);

  const handleViewCV = () => {
    setShowCV(true);
  };

  const handleCloseCV = () => {
    setShowCV(false);
  };

  return (
    <>
      <WorkDashboard
        sessionId={sessionId}
        onJobSearch={onJobSearch}
        onViewCV={handleViewCV}
      />
      
      {showCV && (
        <CVView
          sessionId={sessionId}
          onClose={handleCloseCV}
        />
      )}
    </>
  );
};

export default WorkDashboardWithCV;
