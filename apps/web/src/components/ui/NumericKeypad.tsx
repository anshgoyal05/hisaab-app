import React from 'react';
import { Delete } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface NumericKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  className?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onDigit,
  onBackspace,
  className,
}) => {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace'],
  ];

  return (
    <div
      className={twMerge(
        clsx('w-full max-w-sm mx-auto grid grid-cols-3 gap-2 p-1 select-none', className)
      )}
    >
      {keys.flat().map((key) => {
        const isBackspace = key === 'backspace';

        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (isBackspace) {
                onBackspace();
              } else {
                onDigit(key);
              }
            }}
            className={clsx(
              'h-14 min-h-[52px] rounded-control bg-surface border border-border-rule text-text-primary text-xl font-medium',
              'flex items-center justify-center transition-all duration-100 active:scale-[0.95] active:bg-canvas hover:border-action-primary/40 focus:outline-none'
            )}
            aria-label={isBackspace ? 'Backspace' : key}
          >
            {isBackspace ? (
              <Delete className="w-5 h-5 text-action-primary" />
            ) : (
              key
            )}
          </button>
        );
      })}
    </div>
  );
};
