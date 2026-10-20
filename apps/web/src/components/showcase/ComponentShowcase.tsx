import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sun,
  Moon,
  Smartphone,
  Tablet,
  Monitor,
  Coffee,
  Train,
  BookOpen,
  Utensils,
  Plus,
} from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { Chip } from '../ui/Chip.js';
import { MetricCard } from '../ui/MetricCard.js';
import { LedgerCard } from '../ui/LedgerCard.js';
import { ExpenseRow } from '../ui/ExpenseRow.js';
import { Avatar } from '../ui/Avatar.js';
import { NumericKeypad } from '../ui/NumericKeypad.js';
import { BottomSheet } from '../ui/BottomSheet.js';
import { Toast, OfflineBanner } from '../ui/Toast.js';
import { EmptyState } from '../ui/EmptyState.js';
import { LanguageSwitcher } from '../ui/LanguageSwitcher.js';
import { BottomNav, NavTab } from '../ui/Navigation.js';
import { formatMoney } from '@hisaab/shared';

export const ComponentShowcase: React.FC = () => {
  const { t } = useTranslation();
  const [isDark, setIsDark] = useState(false);
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [amountStr, setAmountStr] = useState('500');
  const [showToast, setShowToast] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleDigit = (digit: string) => {
    if (digit === '.' && amountStr.includes('.')) return;
    if (amountStr === '0' && digit !== '.') {
      setAmountStr(digit);
    } else {
      setAmountStr(amountStr + digit);
    }
  };

  const handleBackspace = () => {
    if (amountStr.length <= 1) {
      setAmountStr('0');
    } else {
      setAmountStr(amountStr.slice(0, -1));
    }
  };

  const viewportContainerStyles = {
    mobile: 'max-w-[390px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-[1280px]',
  };

  return (
    <div className={`min-h-screen bg-canvas text-text-primary ${isDark ? 'dark' : ''} transition-colors duration-200`}>
      {/* Top Showcase Toolbar */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border-rule px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-action-primary flex items-center justify-center text-white dark:text-[#102622] font-bold text-lg shadow-xs">
            H
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-text-primary">
              hisaab <span className="text-xs font-normal text-text-secondary">/ design system</span>
            </h1>
          </div>
        </div>

        {/* Viewport & Controls */}
        <div className="flex items-center gap-2">
          {/* Viewport switchers */}
          <div className="hidden sm:inline-flex p-1 bg-canvas border border-border-rule rounded-control">
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded text-xs font-medium ${viewport === 'mobile' ? 'bg-surface shadow-xs text-action-primary' : 'text-text-secondary'}`}
              title="Mobile (390px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded text-xs font-medium ${viewport === 'tablet' ? 'bg-surface shadow-xs text-action-primary' : 'text-text-secondary'}`}
              title="Tablet (768px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded text-xs font-medium ${viewport === 'desktop' ? 'bg-surface shadow-xs text-action-primary' : 'text-text-secondary'}`}
              title="Desktop (1440px)"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          <LanguageSwitcher />

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-full border border-border-rule bg-surface hover:bg-canvas text-text-primary cursor-pointer transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="p-4 sm:p-8 flex justify-center pb-24">
        <div className={`w-full ${viewportContainerStyles[viewport]} flex flex-col gap-8 transition-all duration-300`}>
          
          {/* Hero Branding Card */}
          <section className="bg-surface p-6 rounded-card border border-border-rule shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-action-primary">
                {isDark ? 'After-hours ink (Dark)' : 'Daylight paper (Light)'}
              </span>
              <span className="text-xs text-text-secondary">CAMPUS EDITION</span>
            </div>
            <h2 className="text-3xl font-medium tracking-tight text-text-primary mb-2">
              {t('tagline')}
            </h2>
            <p className="text-xs text-text-secondary">
              A campus notebook, not a banking app. Warm paper, deep-teal ink, and room to breathe.
            </p>
          </section>

          {/* Cards & Stats Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label={t('spent_today')}
              amount={formatMoney(21000)}
              subtext={t('subtexts.personal_split_count', { personalCount: 3, splitCount: 1 })}
            />
            <LedgerCard
              type="owed_to_me"
              title={t('people_owe_you')}
              amount={formatMoney(145000)}
              subtext={t('subtexts.friends_pending', { friendCount: 3, pendingCount: 2 })}
              onClick={() => {}}
            />
            <LedgerCard
              type="i_owe"
              title={t('you_owe')}
              amount={formatMoney(32000)}
              subtext={t('subtexts.owing_to_friends', { friends: 'Priya & Amit' })}
              onClick={() => {}}
            />
          </section>

          {/* Interactive Add Expense Keypad Flow */}
          <section className="bg-surface p-6 rounded-card border border-border-rule shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary">
                {t('add_expense')}
              </h3>
              <span className="text-xs text-text-secondary font-mono bg-canvas px-2.5 py-1 rounded-full border border-border-rule">
                Live Keypad
              </span>
            </div>

            <div className="text-center py-4 bg-canvas/60 rounded-control border border-border-rule mb-5">
              <span className="text-xs uppercase tracking-wider text-text-secondary block mb-1">
                Amount (INR)
              </span>
              <span className="text-4xl font-semibold tracking-tight text-text-primary">
                ₹{amountStr}
              </span>
              <p className="text-xs text-balance-owed mt-1">
                {t('split_preview', { name: 'Rahul', amount: `₹${Math.round(parseInt(amountStr || '0', 10) / 2)}` })}
              </p>
            </div>

            <NumericKeypad
              onDigit={handleDigit}
              onBackspace={handleBackspace}
            />

            <div className="mt-5 flex gap-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setIsSheetOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>{t('save_expense')}</span>
              </Button>
            </div>
          </section>

          {/* Recent Expenses List */}
          <section className="bg-surface p-6 rounded-card border border-border-rule shadow-soft">
            <h3 className="text-base font-semibold text-text-primary mb-4">
              Recent Transactions
            </h3>
            <div className="flex flex-col gap-2.5">
              <ExpenseRow
                icon={<Coffee className="w-5 h-5" />}
                iconBgColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                title="Chai & Samosa"
                subtitle="Canteen · Cash"
                amount={formatMoney(4500)}
              />
              <ExpenseRow
                icon={<Train className="w-5 h-5" />}
                iconBgColor="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                title="Metro recharge"
                subtitle="Transport · UPI"
                amount={formatMoney(20000)}
              />
              <ExpenseRow
                icon={<Utensils className="w-5 h-5" />}
                iconBgColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                title="Dinner at Dhaba"
                subtitle="Split with Rahul & Amit"
                amount={formatMoney(25000)}
              />
              <ExpenseRow
                icon={<BookOpen className="w-5 h-5" />}
                iconBgColor="bg-purple-500/10 text-purple-600 dark:text-purple-400"
                title="Engineering Mechanics Book"
                subtitle="Study · Card"
                amount={formatMoney(65000)}
              />
            </div>
          </section>

          {/* Friends & Avatars Row */}
          <section className="bg-surface p-6 rounded-card border border-border-rule shadow-soft">
            <h3 className="text-base font-semibold text-text-primary mb-3">
              Campus Ledger Friends
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 p-1.5 pr-3 bg-canvas rounded-full border border-border-rule">
                <Avatar name="Rahul Sharma" size="sm" />
                <span className="text-xs font-medium">Rahul</span>
                <span className="text-[10px] text-balance-owed font-bold">+₹250</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 pr-3 bg-canvas rounded-full border border-border-rule">
                <Avatar name="Priya Patel" size="sm" />
                <span className="text-xs font-medium">Priya</span>
                <span className="text-[10px] text-balance-iowe font-bold">-₹120</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 pr-3 bg-canvas rounded-full border border-border-rule">
                <Avatar name="Amit Verma" size="sm" />
                <span className="text-xs font-medium">Amit</span>
                <span className="text-[10px] text-text-secondary font-bold">₹0</span>
              </div>
            </div>
          </section>

          {/* Form Inputs Showcase */}
          <section className="bg-surface p-6 rounded-card border border-border-rule shadow-soft">
            <h3 className="text-base font-semibold text-text-primary mb-4">
              Inputs & Validation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Note (Optional)"
                placeholder="e.g. Midnight maggi with roommates"
                defaultValue="Campus stationery supplies"
              />
              <Input
                label="Split Amount"
                defaultValue="₹650"
                error="Split shares must equal total transaction amount"
              />
            </div>
          </section>

          {/* Empty State Showcase */}
          <EmptyState
            title={t('fresh_page_title')}
            subtitle={t('fresh_page_subtitle')}
            actionLabel={t('add_expense')}
            onAction={() => setIsSheetOpen(true)}
          />

          {/* Toast Notification Showcase */}
          {showToast ? (
            <div className="flex justify-center">
              <Toast
                type="success"
                message={t('expense_added')}
                onUndo={() => setShowToast(false)}
                undoLabel={t('undo')}
              />
            </div>
          ) : null}

          {/* Offline Banner Preview */}
          <OfflineBanner isOffline={true} />

        </div>
      </main>

      {/* Interactive Bottom Sheet Preview */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={t('add_expense')}
      >
        <div className="flex flex-col gap-4">
          <div className="text-center py-4 bg-canvas/60 rounded-control border border-border-rule">
            <span className="text-3xl font-bold">₹{amountStr}</span>
            <span className="text-xs text-text-secondary block mt-1">Today at Campus Canteen</span>
          </div>

          <div className="flex gap-2 justify-center">
            <Chip selected>{t('categories.food')}</Chip>
            <Chip>{t('categories.chai')}</Chip>
            <Chip>{t('categories.transport')}</Chip>
          </div>

          <Button
            variant="primary"
            className="w-full mt-2"
            onClick={() => setIsSheetOpen(false)}
          >
            {t('save_expense')}
          </Button>
        </div>
      </BottomSheet>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddClick={() => setIsSheetOpen(true)}
      />
    </div>
  );
};
