import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverable = false,
  glass = false,
  ...props
}) => {
  const baseStyles = 'rounded-lg p-6 transition-all duration-300';
  const glassStyles = glass ? 'glass' : 'bg-dark-secondary border border-dark-tertiary';
  const hoverStyles = hoverable ? 'hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1' : '';

  return (
    <div className={`${baseStyles} ${glassStyles} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};
