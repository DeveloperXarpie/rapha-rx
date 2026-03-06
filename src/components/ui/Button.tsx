import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const sizeClass = size === 'lg' ? 'min-h-[80px] px-8 py-4 text-btn' : 'min-h-[56px] px-6 py-3 text-body-md';
  const widthClass = fullWidth ? 'w-full' : '';

  const variantClass = {
    primary:   'bg-primary-blue text-white hover:bg-blue-700',
    secondary: 'bg-card-bg text-primary-blue border-2 border-primary-blue hover:bg-hover-state',
    ghost:     'text-primary-blue hover:bg-hover-state',
  }[variant];

  return (
    <button
      className={`${base} ${sizeClass} ${widthClass} ${variantClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
