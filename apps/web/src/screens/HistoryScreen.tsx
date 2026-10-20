import React, { useEffect, useState } from 'react';
import { Search, Trash2, Calendar } from 'lucide-react';
import { Input } from '../components/ui/Input.js';
import { Toast } from '../components/ui/Toast.js';
import { apiRequest } from '../lib/api.js';
import { formatMoney } from '@hisaab/shared';

export const HistoryScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [deletedTx, setDeletedTx] = useState<any | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  const fetchTransactions = () => {
    apiRequest('/transactions?limit=100')
      .then((res) => setTransactions(res.transactions || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDelete = async (tx: any) => {
    try {
      await apiRequest(`/transactions/${tx.id}`, { method: 'DELETE' });
      setDeletedTx(tx);
      setShowUndoToast(true);
      fetchTransactions();
      setTimeout(() => setShowUndoToast(false), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  // Group transactions by date
  const filtered = transactions.filter((t) => {
    const matchesSearch =
      (t.category?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.note || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedType !== 'all' && t.type !== selectedType) return false;
    return true;
  });

  const groupedByDate: Record<string, any[]> = {};
  for (const tx of filtered) {
    const date = tx.occurredOn ? tx.occurredOn.split('T')[0] : 'Earlier';
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(tx);
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
          Transaction History
        </h2>
        <p className="text-xs text-text-secondary">
          Auditable chronological ledger of all your campus expenses and splits.
        </p>
      </div>

      {/* Search & Type Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions by category or note..."
            className="pl-9 py-2 text-xs"
          />
        </div>

        <div className="flex p-1 bg-surface border border-border-rule rounded-control gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'personal', label: 'Personal' },
            { id: 'split', label: 'Split' },
            { id: 'i_paid_for_someone', label: 'Paid for friend' },
            { id: 'someone_paid_for_me', label: 'Paid for me' },
          ].map((typeItem) => (
            <button
              key={typeItem.id}
              type="button"
              onClick={() => setSelectedType(typeItem.id)}
              className={`px-3 py-1.5 rounded-control text-xs font-medium whitespace-nowrap transition-colors ${
                selectedType === typeItem.id
                  ? 'bg-action-primary text-white dark:text-[#102622] shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {typeItem.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Day Feeds */}
      {Object.keys(groupedByDate).length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border-rule rounded-card">
          <Calendar className="w-8 h-8 text-text-secondary/50 mx-auto mb-2" />
          <span className="text-sm font-semibold text-text-primary block">
            No transactions found
          </span>
          <span className="text-xs text-text-secondary">
            Try adjusting your search filters or add a new expense.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groupedByDate).map(([date, items]) => {
            const dayTotal = items.reduce((sum, t) => {
              const mySplit = t.splits?.find((s: any) => s.participantType === 'me');
              return sum + (mySplit ? mySplit.shareMinor : t.totalMinor);
            }, 0);

            return (
              <div key={date} className="flex flex-col gap-2">
                {/* Date Header with Daily Subtotal */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {date}
                  </span>
                  <span className="text-xs font-medium text-text-secondary">
                    Total: <span className="font-bold text-text-primary">{formatMoney(dayTotal)}</span>
                  </span>
                </div>

                {/* Day's Transactions List */}
                <div className="flex flex-col gap-2">
                  {items.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 bg-surface border border-border-rule rounded-card flex items-center justify-between group hover:border-action-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-action-primary/10 text-action-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {tx.category?.name?.[0] || '₹'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text-primary">
                              {tx.category?.name || 'Expense'}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-canvas border border-border-rule text-text-secondary">
                              {tx.type}
                            </span>
                          </div>
                          <span className="text-xs text-text-secondary block">
                            {tx.note || 'No note'} · {tx.paymentMethod?.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-bold text-text-primary block">
                            {formatMoney(tx.totalMinor)}
                          </span>
                          {tx.type === 'split' ? (
                            <span className="text-[11px] text-text-secondary">
                              Your share: {formatMoney(tx.splits?.find((s: any) => s.participantType === 'me')?.shareMinor || 0)}
                            </span>
                          ) : null}
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(tx)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-text-secondary hover:text-balance-iowe rounded transition-opacity"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Undo Toast */}
      {showUndoToast && deletedTx ? (
        <div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50">
          <Toast
            type="success"
            message={`Deleted ${deletedTx.category?.name || 'expense'}`}
            onUndo={() => {
              // Re-post transaction
              apiRequest('/transactions', {
                method: 'POST',
                body: JSON.stringify({
                  ...deletedTx,
                  clientId: crypto.randomUUID(),
                  categoryId: deletedTx.category?.id || 'food',
                }),
              }).then(fetchTransactions);
              setShowUndoToast(false);
            }}
            undoLabel="Undo"
          />
        </div>
      ) : null}
    </div>
  );
};
