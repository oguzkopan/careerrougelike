import React, { useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

interface ResetButtonProps {
  onReset: () => void;
  className?: string;
}

const ResetButton: React.FC<ResetButtonProps> = ({ onReset, className = '' }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    setShowConfirm(false);
    onReset();
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowConfirm(true)}
        className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors ${className}`}
        aria-label="Start Over"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Start Over</span>
      </motion.button>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gray-800 border-2 border-gray-700 rounded-lg shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="bg-yellow-900/30 border-2 border-yellow-600/50 rounded-full p-3">
                  <AlertTriangle className="w-8 h-8 text-yellow-400" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-white text-center mb-3">
                Start Over?
              </h3>

              {/* Message */}
              <p className="text-gray-300 text-center mb-6 leading-relaxed">
                This will reset your progress and start a new game. All your current progress, including your job, tasks, and CV will be lost.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowConfirm(false)}
                  variant="secondary"
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  variant="danger"
                  fullWidth
                >
                  Reset Game
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ResetButton;
