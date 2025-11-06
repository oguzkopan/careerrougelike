import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Briefcase, CheckCircle, Trophy } from 'lucide-react';
import { celebrateLevelUp } from './shared/confetti';

interface StatsPanelProps {
  playerStats: {
    level: number;
    xp: number;
    xpToNextLevel: number;
    tasksCompleted: number;
    jobsHeld: number;
    interviewsPassed: number;
  };
}

const StatsPanel: React.FC<StatsPanelProps> = ({ playerStats }) => {
  const [animatedXp, setAnimatedXp] = useState(playerStats.xp);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [prevLevel, setPrevLevel] = useState(playerStats.level);

  // Animate XP changes
  useEffect(() => {
    if (animatedXp !== playerStats.xp) {
      const duration = 500;
      const steps = 20;
      const increment = (playerStats.xp - animatedXp) / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setAnimatedXp(playerStats.xp);
          clearInterval(timer);
        } else {
          setAnimatedXp((prev) => prev + increment);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [playerStats.xp, animatedXp]);

  // Detect level up
  useEffect(() => {
    if (playerStats.level > prevLevel) {
      setShowLevelUp(true);
      celebrateLevelUp();
      setTimeout(() => setShowLevelUp(false), 3000);
      setPrevLevel(playerStats.level);
    }
  }, [playerStats.level, prevLevel]);

  const xpPercentage = (animatedXp / playerStats.xpToNextLevel) * 100;

  return (
    <div className="p-6 space-y-6">
      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 rounded-lg"
          >
            <motion.div
              className="text-center"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-2" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white">Level Up!</h3>
              <p className="text-lg text-yellow-400">Level {playerStats.level}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Badge */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-indigo-300 shadow-lg">
          <span className="text-3xl font-bold text-white">{playerStats.level}</span>
        </div>
        <p className="text-sm text-gray-400 mt-2 font-semibold">Career Level</p>
      </div>

      {/* XP Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-300 font-medium">Experience</span>
          <span className="text-indigo-400 font-semibold">
            {Math.floor(animatedXp)} / {playerStats.xpToNextLevel} XP
          </span>
        </div>
        <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(xpPercentage, 100)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center">
          {Math.max(0, playerStats.xpToNextLevel - playerStats.xp)} XP to next level
        </p>
      </div>

      {/* Career Statistics */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Career Stats
        </h3>
        
        <div className="space-y-2">
          <StatItem
            icon={<CheckCircle className="w-5 h-5 text-green-400" />}
            label="Tasks Completed"
            value={playerStats.tasksCompleted}
          />
          <StatItem
            icon={<Briefcase className="w-5 h-5 text-blue-400" />}
            label="Jobs Held"
            value={playerStats.jobsHeld}
          />
          <StatItem
            icon={<Award className="w-5 h-5 text-yellow-400" />}
            label="Interviews Passed"
            value={playerStats.interviewsPassed}
          />
        </div>
      </div>

      {/* Achievement Badges (Optional) */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Achievements
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {playerStats.tasksCompleted >= 1 && (
            <AchievementBadge
              icon="🎯"
              title="First Task"
              unlocked={true}
            />
          )}
          {playerStats.jobsHeld >= 1 && (
            <AchievementBadge
              icon="💼"
              title="First Job"
              unlocked={true}
            />
          )}
          {playerStats.interviewsPassed >= 1 && (
            <AchievementBadge
              icon="🎤"
              title="Interview Pro"
              unlocked={true}
            />
          )}
          {playerStats.tasksCompleted >= 10 && (
            <AchievementBadge
              icon="⚡"
              title="Task Master"
              unlocked={true}
            />
          )}
          {playerStats.level >= 5 && (
            <AchievementBadge
              icon="🌟"
              title="Rising Star"
              unlocked={true}
            />
          )}
          {playerStats.jobsHeld >= 3 && (
            <AchievementBadge
              icon="🚀"
              title="Job Hopper"
              unlocked={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Stat Item Component
interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm text-gray-300">{label}</span>
      </div>
      <span className="text-lg font-bold text-white">{value}</span>
    </div>
  );
};

// Achievement Badge Component
interface AchievementBadgeProps {
  icon: string;
  title: string;
  unlocked: boolean;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ icon, title, unlocked }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
        unlocked
          ? 'bg-yellow-900/20 border-yellow-600 hover:scale-110'
          : 'bg-gray-800/30 border-gray-700 opacity-40'
      }`}
      title={title}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs text-gray-400 mt-1 text-center leading-tight">{title}</span>
    </div>
  );
};

export default StatsPanel;
