import React from 'react';
import '../meetings.css';

interface ParticipantAvatarProps {
  name: string;
  avatarColor?: string;
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
  className?: string;
}

const ParticipantAvatar: React.FC<ParticipantAvatarProps> = ({
  name,
  avatarColor,
  size = 'md',
  isActive = false,
  className = '',
}) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const defaultColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#F59E0B', // amber
    '#6366F1', // indigo
    '#14B8A6', // teal
    '#F97316', // orange
  ];

  const colorIndex = name.charCodeAt(0) % defaultColors.length;
  const bgColor = avatarColor || defaultColors[colorIndex];

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div
      className={`participant-avatar ${
        isActive ? 'participant-avatar-active' : ''
      } ${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      {initials}
    </div>
  );
};

export default ParticipantAvatar;
