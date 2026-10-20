import React from 'react';
import { Home, Users, Plus, BarChart3, Settings, History, PiggyBank } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import { Avatar } from './Avatar.js';

export type NavTab = 'home' | 'people' | 'history' | 'reports' | 'budgets' | 'settings';

export interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onAddClick: () => void;
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onAddClick,
  className,
}) => {
  return (
    <nav
      className={twMerge(
        clsx(
          'fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border-rule px-4 py-1.5 flex items-center justify-around sm:hidden select-none',
          className
        )
      )}
      aria-label="Mobile Navigation"
    >
      <button
        type="button"
        onClick={() => onTabChange('home')}
        className={clsx(
          'flex flex-col items-center justify-center gap-0.5 min-w-[54px] min-h-[48px] text-xs font-medium focus:outline-none transition-colors',
          activeTab === 'home'
            ? 'text-action-primary'
            : 'text-text-secondary hover:text-text-primary'
        )}
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('people')}
        className={clsx(
          'flex flex-col items-center justify-center gap-0.5 min-w-[54px] min-h-[48px] text-xs font-medium focus:outline-none transition-colors',
          activeTab === 'people'
            ? 'text-action-primary'
            : 'text-text-secondary hover:text-text-primary'
        )}
      >
        <Users className="w-5 h-5" />
        <span>People</span>
      </button>

      {/* Primary Add Action */}
      <button
        type="button"
        onClick={onAddClick}
        className="w-12 h-12 -mt-5 rounded-full bg-action-primary text-white dark:text-[#102622] flex items-center justify-center shadow-md active:scale-95 transition-transform focus:outline-none hover:bg-action-hover"
        aria-label="Add Expense"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={() => onTabChange('reports')}
        className={clsx(
          'flex flex-col items-center justify-center gap-0.5 min-w-[54px] min-h-[48px] text-xs font-medium focus:outline-none transition-colors',
          activeTab === 'reports'
            ? 'text-action-primary'
            : 'text-text-secondary hover:text-text-primary'
        )}
      >
        <BarChart3 className="w-5 h-5" />
        <span>Reports</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('history')}
        className={clsx(
          'flex flex-col items-center justify-center gap-0.5 min-w-[54px] min-h-[48px] text-xs font-medium focus:outline-none transition-colors',
          activeTab === 'history'
            ? 'text-action-primary'
            : 'text-text-secondary hover:text-text-primary'
        )}
      >
        <History className="w-5 h-5" />
        <span>History</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('settings')}
        className={clsx(
          'flex flex-col items-center justify-center gap-0.5 min-w-[54px] min-h-[48px] text-xs font-medium focus:outline-none transition-colors',
          activeTab === 'settings'
            ? 'text-action-primary'
            : 'text-text-secondary hover:text-text-primary'
        )}
      >
        <Settings className="w-5 h-5" />
        <span>Settings</span>
      </button>
    </nav>
  );
};

export interface DesktopHeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onAddClick: () => void;
  userEmail?: string;
  userName?: string;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  activeTab,
  onTabChange,
  onAddClick,
  userName = 'Student',
}) => {
  const navItems: { tab: NavTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { tab: 'people', label: 'People', icon: <Users className="w-4 h-4" /> },
    { tab: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
    { tab: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { tab: 'budgets', label: 'Budgets', icon: <PiggyBank className="w-4 h-4" /> },
    { tab: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="hidden sm:block sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border-rule px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <div 
            onClick={() => onTabChange('home')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-action-primary text-white dark:text-[#102622] flex items-center justify-center font-bold text-lg shadow-sm">
              ₹
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-text-primary flex items-center gap-1.5">
                <span>Hisaab</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-action-primary/10 text-action-primary">
                  Campus
                </span>
              </div>
              <p className="text-[11px] text-text-muted">Student Ledger</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.tab}
                type="button"
                onClick={() => onTabChange(item.tab)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none',
                  activeTab === item.tab
                    ? 'bg-action-primary/10 text-action-primary font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-canvas'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onAddClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-action-primary text-white dark:text-[#102622] text-sm font-semibold hover:bg-action-hover active:scale-98 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>

          <LanguageSwitcher />

          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className="flex items-center gap-2 pl-2 border-l border-border-rule focus:outline-none"
            title="Account Settings"
          >
            <Avatar name={userName} size="sm" />
          </button>
        </div>
      </div>
    </header>
  );
};
