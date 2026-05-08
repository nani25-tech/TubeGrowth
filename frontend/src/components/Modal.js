import React from 'react';
import { Button } from './Button';

export const Modal = ({
  isOpen,
  title,
  children,
  onClose,
  footer,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative glass ${sizeStyles[size]} w-full rounded-lg shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-glass px-6 py-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-glass px-6 py-4 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
