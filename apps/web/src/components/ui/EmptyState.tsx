import React from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from './Button.js';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'A fresh page for today.',
  subtitle = 'Nothing logged yet. Start a clean slate for the day.',
  actionLabel = 'Add expense',
  onAction,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'w-full py-12 px-6 flex flex-col items-center justify-center text-center bg-surface border border-border-rule rounded-card shadow-soft',
          className
        )
      )}
    >
      <div className="w-14 h-14 mb-4 rounded-full bg-action-primary/10 text-action-primary flex items-center justify-center">
        <BookOpen className="w-7 h-7" />
      </div>

      <h4 className="text-base font-semibold text-text-primary mb-1">
        {title}
      </h4>

      <p className="text-xs text-text-secondary max-w-xs mb-5 font-normal">
        {subtitle}
      </p>

      {onAction ? (
        <Button onClick={onAction} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          <span>{actionLabel}</span>
        </Button>
      ) : null}
    </div>
  );
};
