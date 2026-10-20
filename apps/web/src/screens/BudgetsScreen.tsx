import React, { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { apiRequest } from '../lib/api.js';
import { formatMoney, rupeesToPaise } from '@hisaab/shared';

export const BudgetsScreen: React.FC = () => {
  const [budgetData, setBudgetData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string>('overall');
  const [limitInput, setLimitInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchBudgets = () => {
    apiRequest('/budgets')
      .then(setBudgetData)
      .catch(console.error);

    apiRequest('/categories')
      .then((res) => setCategories(res.categories || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeesToPaise(limitInput);
    if (paise <= 0) return;

    setIsLoading(true);
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
      await apiRequest('/budgets', {
        method: 'PUT',
        body: JSON.stringify({
          month,
          categoryId: selectedCatId === 'overall' ? null : selectedCatId,
          limitMinor: paise,
        }),
      });
      setIsModalOpen(false);
      setLimitInput('');
      fetchBudgets();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const overall = budgetData?.overall;
  const overallLimit = overall?.limitMinor || 0;
  const overallSpent = overall?.spentMinor || 0;
  const overallPercent = overallLimit > 0 ? Math.min(100, Math.round((overallSpent / overallLimit) * 100)) : 0;
  const remainingPaise = Math.max(0, overallLimit - overallSpent);

  // Remaining days in month for daily allowance
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, lastDay - now.getDate() + 1);
  const dailyAllowance = Math.round(remainingPaise / remainingDays);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Header & Set Budget */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Monthly Budgets
          </h2>
          <p className="text-xs text-text-secondary">
            Keep campus spending on track with automated alerts at 80% and 100%.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          <span>Set Budget</span>
        </Button>
      </div>

      {/* Overall Monthly Budget Card */}
      <div className="p-6 bg-surface border border-border-rule rounded-card shadow-soft flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Total Monthly Spend ({budgetData?.month || 'Current Month'})
          </span>
          {overall?.isExceeded ? (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-balance-iowe-surface text-balance-iowe flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Budget Exceeded!
            </span>
          ) : overall?.isWarning ? (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FEF7E0] text-[#B06000] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              80% Warning Limit
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-balance-owed-surface text-balance-owed">
              On Track
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
              {formatMoney(overallSpent)}
            </span>
            <span className="text-xs text-text-secondary ml-2 font-medium">
              of {overallLimit > 0 ? formatMoney(overallLimit) : 'No limit set'}
            </span>
          </div>
          <span className="text-base font-bold text-text-primary">
            {overallPercent}%
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-3 bg-canvas rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              overall?.isExceeded
                ? 'bg-balance-iowe'
                : overall?.isWarning
                ? 'bg-amber-500'
                : 'bg-action-primary'
            }`}
            style={{ width: `${overallPercent}%` }}
          />
        </div>

        {/* Daily Allowance Note */}
        {overallLimit > 0 ? (
          <div className="p-3 bg-canvas/60 rounded-control border border-border-rule flex items-center justify-between text-xs">
            <span className="text-text-secondary">
              Remaining Daily Allowance ({remainingDays} days left):
            </span>
            <span className="font-bold text-action-primary">
              {formatMoney(dailyAllowance)} / day
            </span>
          </div>
        ) : null}
      </div>

      {/* Category Budgets Grid */}
      <div>
        <h3 className="text-base font-semibold text-text-primary mb-3">
          Category Budgets
        </h3>

        {budgetData?.categoryBudgets?.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-border-rule rounded-card text-xs text-text-secondary">
            No category budgets created yet. Tap "Set Budget" above to assign limits to food, transit, or books.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {budgetData?.categoryBudgets?.map((catB: any) => (
              <div
                key={catB.id}
                className="p-4 bg-surface border border-border-rule rounded-card shadow-soft flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">
                    {catB.categoryName}
                  </span>
                  <span
                    className={`font-bold ${
                      catB.isExceeded
                        ? 'text-balance-iowe'
                        : catB.isWarning
                        ? 'text-amber-500'
                        : 'text-text-secondary'
                    }`}
                  >
                    {catB.percentage}%
                  </span>
                </div>

                <div className="w-full h-2 bg-canvas rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      catB.isExceeded
                        ? 'bg-balance-iowe'
                        : catB.isWarning
                        ? 'bg-amber-500'
                        : 'bg-action-primary'
                    }`}
                    style={{ width: `${Math.min(100, catB.percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-secondary">
                  <span>Spent: {formatMoney(catB.spentMinor)}</span>
                  <span>Limit: {formatMoney(catB.limitMinor)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Set Budget Modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-surface p-6 rounded-card border border-border-rule shadow-modal">
            <h3 className="text-base font-semibold text-text-primary mb-4">
              Set Monthly Budget
            </h3>
            <form onSubmit={handleSaveBudget} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-1">
                  Budget Target
                </label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface text-text-primary border border-border-rule rounded-control text-xs font-medium focus:outline-none"
                >
                  <option value="overall">Overall Total Monthly Spend</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Monthly Limit (INR)"
                placeholder="e.g. 5000"
                type="number"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" isLoading={isLoading}>
                Save Budget
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
