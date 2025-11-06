
import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  fullWidth = false, 
  variant = 'primary',
  className = '',
  ...props 
}) => {
  const widthClass = fullWidth ? 'w-full' : '';
  
  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500',
    secondary: 'bg-gray-600 hover:bg-gray-500 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-500 focus:ring-red-500',
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`px-6 py-2 text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200 ${widthClass} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
