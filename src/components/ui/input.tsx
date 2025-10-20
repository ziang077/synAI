import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`
        block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm 
        bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 
        focus:border-indigo-500 sm:text-sm transition-colors duration-200
        ${className}
      `}
      {...props}
    />
  );
}
