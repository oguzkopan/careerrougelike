import React from 'react';
import { Briefcase, Building2, Rocket, Zap, Star, TrendingUp } from 'lucide-react';

interface CompanyLogoProps {
  companyName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({ companyName, size = 'md', className = '' }) => {
  // Generate a consistent color based on company name
  const getColorFromName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      { bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: 'text-blue-400' },
      { bg: 'bg-green-500/20', border: 'border-green-500/50', icon: 'text-green-400' },
      { bg: 'bg-purple-500/20', border: 'border-purple-500/50', icon: 'text-purple-400' },
      { bg: 'bg-pink-500/20', border: 'border-pink-500/50', icon: 'text-pink-400' },
      { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', icon: 'text-yellow-400' },
      { bg: 'bg-indigo-500/20', border: 'border-indigo-500/50', icon: 'text-indigo-400' },
      { bg: 'bg-red-500/20', border: 'border-red-500/50', icon: 'text-red-400' },
      { bg: 'bg-teal-500/20', border: 'border-teal-500/50', icon: 'text-teal-400' },
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Generate a consistent icon based on company name
  const getIconFromName = (name: string) => {
    const icons = [Building2, Briefcase, Rocket, Zap, Star, TrendingUp];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return icons[Math.abs(hash) % icons.length];
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colors = getColorFromName(companyName);
  const Icon = getIconFromName(companyName);

  return (
    <div
      className={`${sizeClasses[size]} ${colors.bg} ${colors.border} border rounded-lg flex items-center justify-center flex-shrink-0 ${className}`}
    >
      <Icon className={`${iconSizes[size]} ${colors.icon}`} />
    </div>
  );
};

export default CompanyLogo;
