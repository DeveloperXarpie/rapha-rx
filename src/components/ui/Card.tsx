import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function Card({ children, className = '', onClick, selected }: CardProps) {
  const interactive = onClick
    ? 'cursor-pointer hover:bg-hover-state active:scale-[0.98] transition-all duration-150'
    : '';
  const selectedClass = selected ? 'ring-2 ring-primary-blue border-primary-blue' : 'border-transparent';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`bg-card-bg rounded-3xl shadow-sm p-6 border-2 ${selectedClass} ${interactive} ${className}`}
    >
      {children}
    </div>
  );
}
