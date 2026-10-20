import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-action-primary/30 disabled:opacity-50 disabled:pointer-events-none rounded-control cursor-pointer select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 h-9',
    md: 'text-sm px-4 h-11 min-h-[44px]',
    lg: 'text-base px-6 h-13 min-h-[48px]',
  };

  const variantStyles = {
    primary:
      'bg-action-primary text-white dark:text-[#102622] hover:bg-action-primary-hover shadow-sm',
    secondary:
      'bg-surface border border-border-rule text-text-primary hover:bg-canvas',
    ghost:
      'bg-transparent text-text-primary hover:bg-canvas',
    destructive:
      'bg-balance-iowe text-white hover:opacity-90',
  };

  return (
    <button
      className={twMerge(
        clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};
