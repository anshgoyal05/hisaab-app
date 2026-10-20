import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ChipProps extends React.HTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  selected = false,
  icon,
  className,
  ...props
}) => {
  return (
    <button
      type="button"
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer select-none',
          selected
            ? 'bg-action-primary text-white dark:text-[#102622] shadow-sm'
            : 'bg-surface text-text-primary border border-border-rule hover:bg-canvas',
          className
        )
      )}
      {...props}
    >
      {icon ? <span className="w-3.5 h-3.5 flex items-center justify-center">{icon}</span> : null}
      {children}
    </button>
  );
};
