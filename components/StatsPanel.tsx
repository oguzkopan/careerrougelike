
import React from 'react';
import { PlayerProfile } from '../types';
import Button from './shared/Button';
import { Award, FileText, Star } from 'lucide-react';

const StatsPanel: React.FC<{ profile: PlayerProfile }> = ({ profile }) => {
  const latestCvEntry = profile.cv[profile.cv.length - 1];

  const handleExportCv = () => {
    // In a real app, this would generate a PDF.
    alert('CV export functionality is not yet implemented.');
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-semibold p-4 border-b border-gray-700 text-white">Dashboard</h2>
      <div className="flex-grow p-4 overflow-y-auto space-y-6">
        {/* Score & Level */}
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold">Level</span>
            </div>
            <span className="font-bold text-lg">{profile.level}</span>
          </div>
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-green-400" />
              <span className="font-semibold">Score</span>
            </div>
            <span className="font-bold text-lg">{profile.score}</span>
          </div>
        </div>

        {/* CV Snapshot */}
        <div className="space-y-3">
            <h3 className="text-md font-semibold text-gray-200 flex items-center"><FileText className="w-5 h-5 mr-2 text-indigo-400" />CV Snapshot</h3>
            {latestCvEntry ? (
                 <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <p className="font-bold text-white">{latestCvEntry.role}</p>
                    <p className="text-sm text-gray-400">{latestCvEntry.company} | {latestCvEntry.duration}</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                        {latestCvEntry.bulletPoints.slice(0, 2).map((bp, i) => (
                            <li key={i} className="text-sm text-gray-300">{bp}</li>
                        ))}
                    </ul>
                 </div>
            ) : (
                <p className="text-sm text-gray-500">Your CV will be updated as you complete tasks.</p>
            )}
        </div>
      </div>
      <div className="p-4 border-t border-gray-700">
        <Button onClick={handleExportCv} fullWidth>Export Full CV</Button>
      </div>
    </div>
  );
};

export default StatsPanel;
