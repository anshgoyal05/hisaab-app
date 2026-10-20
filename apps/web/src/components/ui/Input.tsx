import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1 text-left">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-text-secondary uppercase tracking-wider"
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={twMerge(
              clsx(
                'w-full px-3.5 py-2.5 text-sm bg-surface text-text-primary border rounded-control transition-all duration-150',
                'placeholder:text-text-secondary/50 focus:outline-none focus:ring-2',
                error
                  ? 'border-balance-iowe focus:ring-balance-iowe/20'
                  : 'border-border-rule focus:border-action-primary focus:ring-action-primary/20',
                className
              )
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-balance-iowe mt-0.5">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-text-secondary mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
