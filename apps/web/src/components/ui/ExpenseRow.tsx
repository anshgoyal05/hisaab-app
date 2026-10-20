import React from 'react';
import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ExpenseRowProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  title: string;
  subtitle: string;
  amount: string;
  isNegative?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ExpenseRow: React.FC<ExpenseRowProps> = ({
  icon,
  iconBgColor = 'bg-action-primary/10 text-action-primary',
  title,
  subtitle,
  amount,
  isNegative = false,
  onClick,
  className,
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={twMerge(
        clsx(
          'w-full flex items-center justify-between p-3.5 bg-surface border border-border-rule rounded-card transition-colors select-none',
          onClick ? 'cursor-pointer hover:bg-canvas active:scale-[0.99]' : '',
          className
        )
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            iconBgColor
          )}
        >
          {icon}
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-sm font-medium text-text-primary truncate">
            {title}
          </span>
          <span className="text-xs text-text-secondary truncate">
            {subtitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={clsx(
            'text-sm font-semibold tracking-tight',
            isNegative ? 'text-balance-iowe' : 'text-text-primary'
          )}
        >
          {amount}
        </span>
        {onClick ? <ChevronRight className="w-4 h-4 text-text-secondary/50" /> : null}
      </div>
    </div>
  );
};
