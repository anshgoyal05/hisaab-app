import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface LedgerCardProps {
  type: 'owed_to_me' | 'i_owe';
  title: string;
  amount: string;
  subtext?: string;
  onClick?: () => void;
  className?: string;
}

export const LedgerCard: React.FC<LedgerCardProps> = ({
  type,
  title,
  amount,
  subtext,
  onClick,
  className,
}) => {
  const isOwedToMe = type === 'owed_to_me';

  const containerStyles = isOwedToMe
    ? 'bg-balance-owed-surface border border-balance-owed/20'
    : 'bg-balance-iowe-surface border border-balance-iowe/20';

  const textStyles = isOwedToMe ? 'text-balance-owed' : 'text-balance-iowe';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={twMerge(
        clsx(
          'w-full p-4 rounded-card shadow-soft flex flex-col justify-between transition-transform select-none',
          onClick ? 'cursor-pointer active:scale-[0.99]' : '',
          containerStyles,
          className
        )
      )}
    >
      <div className="flex items-center justify-between">
        <span className={clsx('text-xs font-medium uppercase tracking-wider', textStyles)}>
          {title}
        </span>
        <div className={clsx('p-1 rounded-full bg-white/40 dark:bg-black/20', textStyles)}>
          {isOwedToMe ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownLeft className="w-3.5 h-3.5" />
          )}
        </div>
      </div>

      <div className="my-2">
        <span className={clsx('text-2xl sm:text-3xl font-medium tracking-tight', textStyles)}>
          {amount}
        </span>
      </div>

      {subtext ? (
        <span className="text-xs text-text-secondary font-normal truncate">{subtext}</span>
      ) : null}
    </div>
  );
};
