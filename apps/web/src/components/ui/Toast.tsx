import React from 'react';
import { CheckCircle2, AlertCircle, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ToastProps {
  type?: 'success' | 'error' | 'info';
  message: string;
  onUndo?: () => void;
  undoLabel?: string;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'success',
  message,
  onUndo,
  undoLabel = 'Undo',
  className,
}) => {
  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center gap-3 px-4 py-2.5 rounded-full shadow-lg select-none text-sm transition-all animate-in fade-in-0 slide-in-from-bottom-2',
          isSuccess
            ? 'bg-[#203D37] text-white dark:bg-[#EDF4EC] dark:text-[#102622]'
            : isError
            ? 'bg-balance-iowe-surface border border-balance-iowe text-balance-iowe'
            : 'bg-surface border border-border-rule text-text-primary',
          className
        )
      )}
      role="status"
    >
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 text-[#A8D8C4] dark:text-[#145C53] shrink-0" />
      ) : isError ? (
        <AlertCircle className="w-4 h-4 text-balance-iowe shrink-0" />
      ) : null}

      <span className="font-medium">{message}</span>

      {onUndo ? (
        <>
          <span className="opacity-40">·</span>
          <button
            type="button"
            onClick={onUndo}
            className="font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer focus:outline-none"
          >
            {undoLabel}
          </button>
        </>
      ) : null}
    </div>
  );
};

export const OfflineBanner: React.FC<{ isOffline: boolean; pendingCount?: number }> = ({
  isOffline,
  pendingCount = 0,
}) => {
  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className="w-full bg-[#FEF7E0] dark:bg-[#3D3316] text-[#B06000] dark:text-[#FEEFC3] text-xs font-medium px-4 py-2 flex items-center justify-center gap-2 border-b border-[#FEEFC3]/40">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        {isOffline
          ? 'You are offline. Changes will sync automatically when reconnected.'
          : `${pendingCount} changes syncing in background...`}
      </span>
    </div>
  );
};
