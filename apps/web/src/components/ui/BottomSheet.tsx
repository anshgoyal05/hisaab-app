import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Dialog Container */}
      <div
        className={twMerge(
          clsx(
            'relative z-10 w-full sm:max-w-lg bg-surface border border-border-rule rounded-t-card sm:rounded-card shadow-modal overflow-hidden flex flex-col max-h-[90vh]',
            'animate-in slide-in-from-bottom-6 sm:fade-in-0 duration-200',
            className
          )
        )}
      >
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-border-rule rounded-full" />
        </div>

        {/* Header */}
        {title ? (
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-rule">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary p-1 rounded-full focus:outline-none"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : null}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
