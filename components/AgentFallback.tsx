import React from 'react';
import { Bot, RefreshCw, AlertCircle } from 'lucide-react';
import Button from './shared/Button';

interface AgentFallbackProps {
  agentName?: string;
  error?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

/**
 * Fallback UI component for when AI agents fail
 */
const AgentFallback: React.FC<AgentFallbackProps> = ({
  agentName = 'AI Agent',
  error,
  onRetry,
  onCancel,
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-yellow-500/50 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Bot className="w-6 h-6 text-yellow-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold text-white">
              {agentName} Temporarily Unavailable
            </h3>
          </div>
          <p className="text-gray-300 mb-4">
            {error || 'We\'re having trouble connecting to our AI service. This is usually temporary.'}
          </p>
          
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-400">
              <strong className="text-white">What you can do:</strong>
            </p>
            <ul className="text-sm text-gray-400 mt-2 space-y-1 list-disc list-inside">
              <li>Wait a moment and try again</li>
              <li>Check your internet connection</li>
              <li>Refresh the page if the problem persists</li>
            </ul>
          </div>

          <div className="flex gap-3">
            {onRetry && (
              <Button
                onClick={onRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            )}
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="secondary"
              >
                Go Back
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentFallback;
