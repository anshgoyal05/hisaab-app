/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--color-canvas)',
          light: '#F7F6EF',
          dark: '#102622',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          light: '#FFFEFA',
          dark: '#1C3630',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
        },
        action: {
          primary: 'var(--color-action-primary)',
          'primary-hover': 'var(--color-action-primary-hover)',
        },
        balance: {
          owed: 'var(--color-balance-owed-to-me)',
          'owed-surface': 'var(--color-balance-owed-surface)',
          iowe: 'var(--color-balance-i-owe)',
          'iowe-surface': 'var(--color-balance-i-owe-surface)',
        },
        border: {
          rule: 'var(--color-border-rule)',
        },
      },
      borderRadius: {
        'card': '16px',
        'control': '12px',
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(32, 61, 55, 0.05), 0 1px 3px rgba(32, 61, 55, 0.08)',
        modal: '0 8px 32px -4px rgba(16, 38, 34, 0.15)',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'sans-serif'],
        display: ['Inter', 'Noto Sans Devanagari', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
};
