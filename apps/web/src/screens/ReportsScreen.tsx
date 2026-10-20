import React, { useEffect, useState } from 'react';
import { Download, Info } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { apiRequest } from '../lib/api.js';
import { formatMoney } from '@hisaab/shared';

export const ReportsScreen: React.FC = () => {
  const [range, setRange] = useState<'today' | 'week' | 'month'>('month');
  const [report, setReport] = useState<any>(null);
  const [, setIsLoading] = useState(false);

  const fetchReport = (selectedRange: string) => {
    setIsLoading(true);
    apiRequest(`/reports/summary?range=${selectedRange}`)
      .then(setReport)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchReport(range);
  }, [range]);

  const handleExportCsv = async () => {
    try {
      const csvData = await apiRequest('/reports/export');
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hisaab-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const categories = report?.byCategory ? Object.entries(report.byCategory) : [];
  const maxCategorySpend = categories.reduce((max, [_, amt]) => Math.max(max, amt as number), 0);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Reports & Analytics
          </h2>
          <p className="text-xs text-text-secondary">
            Clear visibility into your actual campus expenditures and receivables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex p-1 bg-surface border border-border-rule rounded-control">
            {(['today', 'week', 'month'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-medium rounded-control capitalize transition-colors ${
                  range === r
                    ? 'bg-action-primary text-white dark:text-[#102622] shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {r === 'month' ? 'This Month' : r === 'week' ? 'This Week' : 'Today'}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={handleExportCsv}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Spend vs Receivable Clarification Banner */}
      <div className="p-4 bg-action-primary/10 border border-action-primary/20 rounded-card flex items-start gap-3">
        <Info className="w-5 h-5 text-action-primary shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-text-primary">
          <span className="font-semibold block mb-0.5">
            How Hisaab counts your spending:
          </span>
          Personal spend counts <span className="font-semibold">only your share</span> of a split.
          For instance, if you paid ₹4,000 for dinner split 4 ways, your personal spend is ₹1,000,
          and ₹3,000 is tracked as a receivable owed to you.
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Personal Spend */}
        <div className="p-5 bg-surface border border-border-rule rounded-card shadow-soft flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            My Actual Spend ({range.toUpperCase()})
          </span>
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary my-2">
            {formatMoney(report?.myPersonalSpendMinor || 0)}
          </span>
          <span className="text-xs text-text-secondary">
            Across {report?.transactionCount || 0} logged campus transactions
          </span>
        </div>

        {/* Receivables Created */}
        <div className="p-5 bg-surface border border-border-rule rounded-card shadow-soft flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-balance-owed">
            Receivables Paid for Friends
          </span>
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-balance-owed my-2">
            {formatMoney(report?.receivablesCreatedMinor || 0)}
          </span>
          <span className="text-xs text-text-secondary">
            Temporary advances pending repayment
          </span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="p-5 bg-surface border border-border-rule rounded-card shadow-soft">
        <h3 className="text-base font-semibold text-text-primary mb-4">
          Spending by Category
        </h3>

        {categories.length === 0 ? (
          <div className="text-center py-6 text-xs text-text-secondary">
            No categorized expenses in this period.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {categories.map(([catName, amount]) => {
              const amtNumber = amount as number;
              const percentOfMax = maxCategorySpend > 0 ? (amtNumber / maxCategorySpend) * 100 : 0;

              return (
                <div key={catName} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary">{catName}</span>
                    <span className="font-bold text-text-primary">{formatMoney(amtNumber)}</span>
                  </div>
                  <div className="w-full h-2 bg-canvas rounded-full overflow-hidden">
                    <div
                      className="h-full bg-action-primary rounded-full transition-all duration-300"
                      style={{ width: `${percentOfMax}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top 5 Expenses */}
      <div className="p-5 bg-surface border border-border-rule rounded-card shadow-soft">
        <h3 className="text-base font-semibold text-text-primary mb-3">
          Top Expenses ({range.toUpperCase()})
        </h3>

        {report?.topExpenses?.length === 0 ? (
          <div className="text-center py-6 text-xs text-text-secondary">
            No expenses recorded yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {report?.topExpenses?.map((tItem: any, idx: number) => (
              <div
                key={tItem.id}
                className="p-3 bg-canvas/60 rounded-card border border-border-rule flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-action-primary/10 text-action-primary font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-text-primary block">
                      {tItem.category}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {tItem.occurredOn?.split('T')[0]}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-text-primary block">
                    {formatMoney(tItem.myShareMinor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
