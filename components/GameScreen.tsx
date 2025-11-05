
import React from 'react';
import { GameState } from '../types';
import StorylinePanel from './StorylinePanel';
import TaskPanel from './TaskPanel';
import StatsPanel from './StatsPanel';
import LoadingSpinner from './shared/LoadingSpinner';
import { Cpu } from 'lucide-react';
import Button from './shared/Button';

interface GameScreenProps {
  gameState: GameState;
  onSubmitAnswer: (answer: string) => void;
  onSubmitEventChoice: (choice: string) => void;
  onNavigateToAgents: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ gameState, onSubmitAnswer, onSubmitEventChoice, onNavigateToAgents }) => {
  const { storyEvents, currentTask, playerProfile, isLoading, error } = gameState;

  return (
    <div className="h-full bg-gray-900 text-white font-sans flex flex-col">
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Career<span className="text-indigo-400">Roguelike</span></h1>
        <div className="flex items-center gap-4">
          {playerProfile && (
             <div className="text-right">
                <div className="font-semibold text-white">{playerProfile.name}</div>
                <div className="text-sm text-indigo-400">{playerProfile.profession.name} - L{playerProfile.level}</div>
             </div>
          )}
          <button
            onClick={onNavigateToAgents}
            className="flex items-center px-4 py-2 bg-gray-700/50 text-white font-semibold rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-colors duration-200"
            aria-label="View AI Agents"
          >
            <Cpu className="w-5 h-5 mr-2" />
            AI Agents
          </button>
        </div>
      </header>
      
      {error && <div className="bg-red-500/20 text-red-300 p-4 text-center">{error}</div>}

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 min-h-0">
        <div className="lg:col-span-3 bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
          <StorylinePanel events={storyEvents} />
        </div>
        
        <div className="lg:col-span-6 bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden flex flex-col relative">
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900/70 flex flex-col items-center justify-center z-10">
              <LoadingSpinner />
              <p className="mt-4 text-lg text-gray-300">Evaluating your submission...</p>
            </div>
          )}
          {currentTask ? (
            <TaskPanel task={currentTask} onSubmit={onSubmitAnswer} onSubmitEventChoice={onSubmitEventChoice} isLoading={isLoading} />
          ) : (
            <div className="flex-grow flex items-center justify-center p-6">
              <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Run Complete!</h2>
                  <p className="text-gray-400">Check your final stats and CV on the right.</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="lg:col-span-3 bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
          {playerProfile && <StatsPanel profile={playerProfile} />}
        </div>
      </main>
    </div>
  );
};

export default GameScreen;