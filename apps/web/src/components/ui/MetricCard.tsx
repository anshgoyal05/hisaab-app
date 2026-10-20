import React from 'react';
import { Info } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface MetricCardProps {
  label: string;
  amount: string;
  subtext?: string;
  onInfoClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  amount,
  subtext,
  onInfoClick,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'w-full p-4 bg-surface border border-border-rule rounded-card shadow-soft flex flex-col justify-between transition-colors',
          className
        )
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </span>
        {onInfoClick ? (
          <button
            type="button"
            onClick={onInfoClick}
            className="text-text-secondary hover:text-text-primary p-0.5 rounded focus:outline-none"
            aria-label="Info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Info className="w-3.5 h-3.5 text-text-secondary/50" />
        )}
      </div>

      <div className="my-2">
        <span className="text-3xl font-medium tracking-tight text-text-primary">
          {amount}
        </span>
      </div>

      {subtext ? (
        <span className="text-xs text-text-secondary font-normal">{subtext}</span>
      ) : null}
    </div>
  );
};
