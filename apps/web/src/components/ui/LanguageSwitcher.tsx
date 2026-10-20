import React from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'hinglish', label: 'Hinglish' },
  ];

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex p-1 bg-surface border border-border-rule rounded-full shadow-xs select-none',
          className
        )
      )}
      role="radiogroup"
      aria-label="Language Switcher"
    >
      {languages.map((lang) => {
        const isSelected = currentLang === lang.code;

        return (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={clsx(
              'px-3.5 py-1 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer focus:outline-none min-h-[32px]',
              isSelected
                ? 'bg-action-primary text-white dark:text-[#102622] shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
};
