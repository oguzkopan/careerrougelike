import React, { useState } from 'react';
import { Profession } from '../types';
import { 
  Briefcase, BarChart2, PenTool, TrendingUp, Zap, 
  Code, Server, Settings, Megaphone, ClipboardList, 
  Brain, Shield, FileText 
} from 'lucide-react';
import LoadingSpinner from './shared/LoadingSpinner';
import Button from './shared/Button';

interface ProfessionSelectorProps {
  professions: Profession[];
  onSelectProfession: (profession: Profession, seed?: string) => void;
  isLoading: boolean;
}

const iconMap: { [key: string]: React.ReactNode } = {
  ios_engineer: <Briefcase className="w-8 h-8 text-indigo-400" />,
  data_analyst: <BarChart2 className="w-8 h-8 text-indigo-400" />,
  product_designer: <PenTool className="w-8 h-8 text-indigo-400" />,
  sales_associate: <TrendingUp className="w-8 h-8 text-indigo-400" />,
  frontend_developer: <Code className="w-8 h-8 text-indigo-400" />,
  backend_engineer: <Server className="w-8 h-8 text-indigo-400" />,
  devops_engineer: <Settings className="w-8 h-8 text-indigo-400" />,
  marketing_manager: <Megaphone className="w-8 h-8 text-indigo-400" />,
  project_manager: <ClipboardList className="w-8 h-8 text-indigo-400" />,
  data_scientist: <Brain className="w-8 h-8 text-indigo-400" />,
  cybersecurity_analyst: <Shield className="w-8 h-8 text-indigo-400" />,
  content_writer: <FileText className="w-8 h-8 text-indigo-400" />,
};

const difficultyColorMap = {
  Easy: 'bg-green-500/20 text-green-300',
  Medium: 'bg-yellow-500/20 text-yellow-300',
  Hard: 'bg-red-500/20 text-red-300',
};

const ProfessionCard: React.FC<{ profession: Profession, onSelect: () => void }> = ({ profession, onSelect }) => (
  <div 
    onClick={onSelect}
    className="bg-gray-800/50 hover:bg-gray-700/60 border border-gray-700 rounded-lg p-6 flex flex-col items-start cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10"
  >
    <div className="flex items-center justify-between w-full mb-4">
      <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
        {iconMap[profession.id] || <Zap className="w-8 h-8 text-indigo-400" />}
      </div>
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${difficultyColorMap[profession.difficulty]}`}>
        {profession.difficulty}
      </span>
    </div>
    <h3 className="text-xl font-bold text-white mb-2">{profession.name}</h3>
    <p className="text-gray-400 text-sm flex-grow">{profession.description}</p>
  </div>
);

const ProfessionSelector: React.FC<ProfessionSelectorProps> = ({ professions, onSelectProfession, isLoading }) => {
  const [customProfession, setCustomProfession] = useState('');
  const [seed, setSeed] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = customProfession.trim();
    if (trimmedName) {
        const customProf: Profession = {
            id: trimmedName.toLowerCase().replace(/\s+/g, '_'),
            name: trimmedName,
            description: `A custom career path for a ${trimmedName}. The challenges will be dynamically generated.`,
            difficulty: 'Hard',
        };
        onSelectProfession(customProf, seed);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {isLoading ? (
        <div className="flex flex-col items-center">
          <LoadingSpinner />
          <p className="mt-4 text-lg text-gray-300">Initializing your career path...</p>
        </div>
      ) : (
        <>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-center">Career<span className="text-indigo-400">Roguelike</span></h1>
          <p className="text-lg text-gray-400 mb-12 text-center max-w-2xl">Choose your profession. Face realistic challenges. Level up your career. Can you reach L10?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
            {professions.map(p => (
              <ProfessionCard key={p.id} profession={p} onSelect={() => onSelectProfession(p, seed)} />
            ))}
          </div>

          <div className="w-full max-w-7xl mt-12 pt-8 border-t border-gray-700/50">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Advanced Options</h2>
            <div className="max-w-xl mx-auto grid grid-cols-1 gap-8 items-start">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Forge Your Own Path</h3>
                    <p className="text-gray-400 mb-4 text-sm">Can't find your dream job? Type it below to start a custom career.</p>
                    <form onSubmit={handleCustomSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={customProfession}
                        onChange={(e) => setCustomProfession(e.target.value)}
                        placeholder="e.g., AI Prompt Engineer"
                        className="flex-grow bg-gray-800 border border-gray-600 rounded-md text-white px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out placeholder-gray-500"
                        aria-label="Custom profession name"
                      />
                      <Button type="submit" disabled={!customProfession.trim() || isLoading}>
                        Start
                      </Button>
                    </form>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Deterministic Seed</h3>
                    <p className="text-gray-400 mb-4 text-sm">Enter a seed to get the same challenges every time you play.</p>
                    <input
                        id="seed"
                        type="text"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        placeholder="e.g., 'lucky-day-123'"
                        className="w-full bg-gray-800 border border-gray-600 rounded-md text-white px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out placeholder-gray-500"
                        aria-label="Deterministic seed for reproducible run"
                    />
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfessionSelector;