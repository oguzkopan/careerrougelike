import React, { useEffect, useState } from 'react';
import { GraduationCap, Sparkles, Award } from 'lucide-react';
import Button from './shared/Button';
import ResetButton from './shared/ResetButton';

interface GraduationScreenProps {
  onStartJobSearch: () => void;
  onReset?: () => void;
  playerName?: string;
  profession?: string; // profession ID (e.g., 'ios_engineer')
}

// Map profession IDs to degree names
const PROFESSION_DEGREES: Record<string, string> = {
  'ios_engineer': 'iOS Engineering',
  'data_analyst': 'Data Analytics',
  'product_designer': 'Product Design',
  'sales_associate': 'Business and Sales',
  'frontend_developer': 'Frontend Development',
  'backend_engineer': 'Backend Engineering',
  'devops_engineer': 'DevOps Engineering',
  'marketing_manager': 'Marketing Management',
  'project_manager': 'Project Management',
  'data_scientist': 'Data Science',
  'cybersecurity_analyst': 'Cybersecurity',
  'content_writer': 'Content Writing',
};

// Convert profession ID to readable degree name
const getProfessionDegree = (professionId: string): string => {
  // Check if it's in our predefined map
  if (PROFESSION_DEGREES[professionId]) {
    return PROFESSION_DEGREES[professionId];
  }
  
  // For custom professions, convert the ID to a readable name
  // e.g., 'chemical_engineer' -> 'Chemical Engineering'
  return professionId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const GraduationScreen: React.FC<GraduationScreenProps> = ({ 
  onStartJobSearch,
  onReset,
  playerName = 'Graduate',
  profession = 'ios_engineer'
}) => {
  const degree = getProfessionDegree(profession);
  const [showContent, setShowContent] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    // Fade in content
    const timer = setTimeout(() => setShowContent(true), 100);
    
    // Generate confetti particles
    const particles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
    }));
    setConfetti(particles);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900/20 to-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Reset Button */}
      {onReset && (
        <div className="absolute top-4 right-4 z-20">
          <ResetButton onReset={onReset} />
        </div>
      )}
      
      {/* Confetti Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-indigo-400 rounded-full animate-confetti-fall"
            style={{
              left: `${particle.left}%`,
              top: '-10px',
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      {/* Background Glow Effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Main Content */}
      <div 
        className={`relative z-10 max-w-3xl w-full text-center transition-all duration-1000 transform ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Graduation Cap Icon */}
        <div className="flex justify-center mb-8 animate-bounce-slow">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gray-800/80 backdrop-blur-sm border-2 border-indigo-500/50 rounded-full p-8">
              <GraduationCap className="w-24 h-24 text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Congratulations Message */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Congratulations!
            </h1>
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
          
          <p className="text-2xl md:text-3xl font-semibold text-white">
            {playerName}
          </p>
          
          <div className="flex items-center justify-center gap-2 text-lg text-gray-300">
            <Award className="w-5 h-5 text-indigo-400" />
            <p>Bachelor of {degree}</p>
          </div>
        </div>

        {/* Graduation Message */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-8 mb-8 shadow-2xl">
          <p className="text-xl text-gray-300 leading-relaxed mb-4">
            You've successfully completed your {degree} degree!
          </p>
          <p className="text-lg text-gray-400 leading-relaxed">
            Now it's time to embark on your career journey in {degree}. The job market awaits with exciting opportunities, challenging interviews, and rewarding work experiences tailored to your field.
          </p>
        </div>

        {/* Call to Action */}
        <div className="space-y-4">
          <Button
            onClick={onStartJobSearch}
            fullWidth
            className="text-xl py-4 transform hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-indigo-500/50"
          >
            <span className="flex items-center justify-center gap-2">
              Start Job Search
              <Sparkles className="w-5 h-5" />
            </span>
          </Button>
          
          <p className="text-sm text-gray-500">
            Your career adventure begins now!
          </p>
        </div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-indigo-400/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default GraduationScreen;
