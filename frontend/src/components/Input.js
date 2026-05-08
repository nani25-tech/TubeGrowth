import React from 'react';

export const Input = ({
  label,
  error,
  className = '',
  type = 'text',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold mb-2 text-text-primary">
          {label}
        </label>
      )}
      <input
        type={type}
        className={`w-full px-4 py-2 bg-dark-tertiary border border-dark-tertiary rounded-lg text-white placeholder-text-secondary transition-all duration-300 focus:border-primary focus:shadow-md focus:shadow-primary/30 ${
          error ? 'border-danger' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-danger text-sm mt-1">{error}</p>}
    </div>
  );
};
