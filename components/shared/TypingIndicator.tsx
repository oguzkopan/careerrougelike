import React from 'react';
import '../meetings.css';

interface TypingIndicatorProps {
  participantName?: string;
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  participantName,
  className = '',
}) => {
  return (
    <div className={`bg-gray-700/50 border border-gray-600/50 rounded-lg p-3 ${className}`}>
      {participantName && (
        <p className="text-xs font-semibold text-gray-300 mb-2">
          {participantName} is typing...
        </p>
      )}
      <div className="typing-indicator">
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
      </div>
    </div>
  );
};

export default TypingIndicator;
