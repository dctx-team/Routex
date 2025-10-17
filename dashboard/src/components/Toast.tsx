import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

export function Toast({ message, type }: ToastProps) {
  return (
    <div
      className={`fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white font-medium z-50 animate-slideInRight ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      {message}
    </div>
  );
}
