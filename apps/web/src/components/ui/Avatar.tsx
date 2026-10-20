import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PASTEL_PALETTE = [
  'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]',
  'bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]',
  'bg-[#E8F0FE] text-[#1A73E8] border-[#D2E3FC]',
  'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]',
  'bg-[#F3E8FD] text-[#8430CE] border-[#E9D2FD]',
  'bg-[#E0F2F1] text-[#00796B] border-[#B2DFDB]',
];

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPaletteIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % PASTEL_PALETTE.length;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  className,
}) => {
  const initials = getInitials(name);
  const colorClass = PASTEL_PALETTE[getPaletteIndex(name)];

  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base font-semibold',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-full border flex items-center justify-center font-medium select-none shrink-0',
          colorClass,
          sizeStyles[size],
          className
        )
      )}
      title={name}
    >
      {initials}
    </div>
  );
};
