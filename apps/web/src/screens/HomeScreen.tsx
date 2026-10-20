import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Moon, 
  WifiOff, 
  Calendar,
  Sparkles,
  ChevronRight,
  Users,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { formatMoney } from '@hisaab/shared';
import { MetricCard } from '../components/ui/MetricCard.js';
import { LedgerCard } from '../components/ui/LedgerCard.js';
import { Avatar } from '../components/ui/Avatar.js';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.js';
import { getPendingMutationCount } from '../lib/offlineSync.js';

interface HomeScreenProps {
  onAddExpense: () => void;
  onSettleUp: () => void;
  onOpenNightReview: () => void;
  onNavigateTab: (tab: 'people' | 'history' | 'reports' | 'budgets' | 'settings', filter?: string) => void;
  userName?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onAddExpense,
  onSettleUp,
  onOpenNightReview,
  onNavigateTab,
  userName = 'Student',
}) => {
  const { t } = useTranslation();
  const [, setLoading] = useState(true);
  const [spentTodayPaise, setSpentTodayPaise] = useState(0);
  const [todayTxCount, setTodayTxCount] = useState(0);
  const [weekSpentPaise, setWeekSpentPaise] = useState(0);
  const [owedToMePaise, setOwedToMePaise] = useState(0);
  const [iOwePaise, setIOwePaise] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  // Load dashboard data
  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Check offline queue
      const pending = await getPendingMutationCount();
      setPendingCount(pending);

      // Fetch balances summary
      const balancesData = await apiRequest('/balances').catch(() => null);
      if (balancesData?.overall) {
        setOwedToMePaise(balancesData.overall.totalOwedToMeMinor || 0);
        setIOwePaise(balancesData.overall.totalIOweMinor || 0);
      } else if (balancesData?.summary) {
        setOwedToMePaise(balancesData.summary.totalOwedToMePaise || 0);
        setIOwePaise(balancesData.summary.totalIOwePaise || 0);
      }

      // Fetch recent transactions
      const txData = await apiRequest('/transactions?limit=6').catch(() => null);
      if (txData?.transactions) {
        setRecentTransactions(txData.transactions);
      }

      // Fetch today and week reports for accurate personal spending context
      const todayReport = await apiRequest('/reports/summary?range=today').catch(() => null);
      if (todayReport?.myPersonalSpendMinor !== undefined) {
        setSpentTodayPaise(todayReport.myPersonalSpendMinor);
        setTodayTxCount(todayReport.transactionCount || 0);
      }

      const weekData = await apiRequest('/reports/summary?range=week').catch(() => null);
      if (weekData?.myPersonalSpendMinor !== undefined) {
        setWeekSpentPaise(weekData.myPersonalSpendMinor);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const currentHour = new Date().getHours();
  const isNightReviewTime = currentHour >= 20 || currentHour < 2; // 8 PM to 2 AM

  return (
    <div className="space-y-6 pb-24 sm:pb-12">
      {/* Mobile Top Bar */}
      <div className="flex sm:hidden items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <Avatar name={userName} size="md" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-action-primary">
              Campus Hisaab
            </div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">
              {currentHour < 12 
                ? 'Good Morning' 
                : currentHour < 17 
                ? 'Good Afternoon' 
                : 'Good Evening'}, {userName.split(' ')[0]}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isNightReviewTime && (
            <button
              type="button"
              onClick={onOpenNightReview}
              className="p-2 rounded-xl bg-action-primary/10 text-action-primary hover:bg-action-primary/20 transition-colors"
              title="Nightly Review"
              aria-label="Night Review"
            >
              <Moon className="w-5 h-5" />
            </button>
          )}
          <LanguageSwitcher />
        </div>
      </div>

      {/* Offline Status Banner */}
      {isOffline && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              {t('offline_banner') || 'Offline mode active. Expenses are saved locally and sync automatically when connected.'}
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
              {pendingCount} queued
            </span>
          )}
        </div>
      )}

      {/* Night Review Card (if evening/night) */}
      {isNightReviewTime && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-action-primary/15 via-action-primary/5 to-transparent border border-action-primary/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-action-primary text-white dark:text-[#102622] flex items-center justify-center shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {t('night_review_title') || 'Nightly Review'} (9:30 PM)
                </h3>
                <p className="text-xs text-text-secondary">
                  {t('night_review_subtitle') || "Wrap up today's spending in 30 seconds."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenNightReview}
              className="px-3.5 py-1.5 rounded-xl bg-action-primary text-white dark:text-[#102622] text-xs font-semibold shadow-sm hover:bg-action-hover active:scale-95 transition-all"
            >
              {t('review_btn') || 'Review'}
            </button>
          </div>
        </div>
      )}

      {/* Hero Metric & Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Spent Today Metric */}
        <div className="md:col-span-1">
          <MetricCard
            label={t('spent_today') || 'Spent Today'}
            amount={formatMoney(spentTodayPaise)}
            subtext={
              todayTxCount > 0
                ? `${todayTxCount} entries today • Week: ${formatMoney(weekSpentPaise)}`
                : `Week total: ${formatMoney(weekSpentPaise)}`
            }
          />
        </div>

        {/* People Owe You */}
        <div 
          onClick={() => onNavigateTab('people', 'owes_me')} 
          className="cursor-pointer transition-transform active:scale-98"
        >
          <LedgerCard
            type="owed_to_me"
            amount={formatMoney(owedToMePaise)}
            title={t('people_owe_you') || 'People owe you'}
            subtext={owedToMePaise > 0 ? 'Click to see who owes you' : 'All friend dues settled!'}
          />
        </div>

        {/* You Owe */}
        <div 
          onClick={() => onNavigateTab('people', 'i_owe')} 
          className="cursor-pointer transition-transform active:scale-98"
        >
          <LedgerCard
            type="i_owe"
            amount={formatMoney(iOwePaise)}
            title={t('you_owe') || 'You owe'}
            subtext={iOwePaise > 0 ? 'Click to settle your debts' : 'Clean slate! You owe nothing.'}
          />
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAddExpense}
          className="flex-1 py-3 px-4 rounded-2xl bg-action-primary text-white dark:text-[#102622] font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-action-hover active:scale-98 transition-all"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{t('add_expense') || 'Add Expense'}</span>
        </button>

        <button
          type="button"
          onClick={onSettleUp}
          className="flex-1 py-3 px-4 rounded-2xl bg-surface border border-border-rule text-text-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-canvas active:scale-98 transition-all"
        >
          <CheckCircle2 className="w-5 h-5 text-action-primary" />
          <span>{t('settle_up') || 'Settle Up'}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('budgets')}
          className="py-3 px-4 rounded-2xl bg-surface border border-border-rule text-text-secondary hover:text-text-primary font-medium text-sm flex items-center justify-center gap-1.5 shadow-sm hover:bg-canvas active:scale-98 transition-all"
          title="Campus Budgets"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="hidden sm:inline">Budgets</span>
        </button>
      </div>

      {/* Recent Ledger Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span>{t('recent_activity') || 'Recent Activity'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-border-rule/50 text-text-muted font-normal">
              {recentTransactions.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => onNavigateTab('history')}
            className="text-xs font-semibold text-action-primary hover:text-action-hover flex items-center gap-1"
          >
            <span>{t('view_all') || 'View all'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface border border-border-rule text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-canvas text-action-primary mx-auto flex items-center justify-center">
              <Calendar className="w-6 h-6 text-action-primary/70" />
            </div>
            <div>
              <p className="font-semibold text-text-primary text-sm">
                {t('no_expenses_today') || 'No expenses recorded yet today'}
              </p>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                Chai at the canteen? Xerox copies? Samosa break? Keep your ledger neat in 10 seconds.
              </p>
            </div>
            <button
              type="button"
              onClick={onAddExpense}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-action-primary text-white dark:text-[#102622] text-xs font-semibold shadow-sm hover:bg-action-hover"
            >
              <Plus className="w-4 h-4" />
              <span>Log First Expense</span>
            </button>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border-rule divide-y divide-border-rule overflow-hidden shadow-sm">
            {recentTransactions.map((tx) => {
              const isShared = tx.type !== 'personal';
              const totalAmount = tx.totalMinor ?? tx.amountPaise ?? 0;
              const mySplit = tx.splits?.find((s: any) => s.participantType === 'me');
              const myShare = mySplit ? mySplit.shareMinor : (tx.mySharePaise ?? totalAmount);
              const rawDate = tx.occurredOn || tx.date || tx.createdAt;
              const dateDisplay = rawDate && !isNaN(new Date(rawDate).getTime())
                ? new Date(rawDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : 'Today';

              return (
                <div
                  key={tx.id}
                  onClick={() => onNavigateTab('history')}
                  className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-canvas/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-canvas border border-border-rule/60 flex items-center justify-center text-action-primary font-bold text-sm shrink-0">
                      {tx.category?.icon || '₹'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">
                          {tx.note || tx.category?.name || 'Expense'}
                        </span>
                        {isShared && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-action-primary/10 text-action-primary font-medium flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>Shared</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                        <span>{tx.category?.name || 'General'}</span>
                        <span>•</span>
                        <span className="capitalize">{tx.paymentMethod}</span>
                        <span>•</span>
                        <span>{dateDisplay}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-text-primary tracking-tight">
                      {formatMoney(myShare)}
                    </div>
                    {isShared && totalAmount !== myShare && (
                      <div className="text-[11px] text-text-muted">
                        Total {formatMoney(totalAmount)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
