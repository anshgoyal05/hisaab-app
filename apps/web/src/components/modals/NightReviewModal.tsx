import React, { useEffect, useState } from 'react';
import { X, Moon, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { apiRequest } from '../../lib/api.js';
import { formatMoney } from '@hisaab/shared';

export interface NightReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMissedClick: () => void;
}

export const NightReviewModal: React.FC<NightReviewModalProps> = ({
  isOpen,
  onClose,
  onAddMissedClick,
}) => {
  const [data, setData] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      apiRequest('/reminders/night-review')
        .then(setData)
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full sm:max-w-md bg-surface border border-border-rule rounded-t-card sm:rounded-card shadow-modal flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-rule">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-action-primary" />
            <h3 className="text-base font-semibold text-text-primary">
              Nightly Log Review
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-text-secondary hover:text-text-primary"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {isCompleted ? (
            <div className="py-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-balance-owed-surface text-balance-owed flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-semibold text-text-primary mb-1">
                Done for today! ✨
              </h4>
              <p className="text-xs text-text-secondary max-w-xs mb-6">
                Start tomorrow with a clear head and clean ledger.
              </p>
              <Button variant="primary" className="w-full" onClick={onClose}>
                Close Review
              </Button>
            </div>
          ) : (
            <>
              <div className="p-4 bg-canvas/70 border border-border-rule rounded-card text-center">
                <span className="text-xs text-text-secondary uppercase tracking-wider block mb-1">
                  Today's Total Spend
                </span>
                <span className="text-3xl font-bold text-text-primary">
                  {formatMoney(data?.todayTotalSpendMinor || 0)}
                </span>
                <p className="text-xs text-text-secondary mt-1">
                  {data?.transactionCount || 0} expenses recorded today ({data?.date})
                </p>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Today's Entries
                </span>
                {data?.items?.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-secondary bg-canvas/50 rounded-control">
                    Nothing logged yet today. Did you buy chai, metro tickets, or dinner?
                  </div>
                ) : (
                  data?.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 bg-canvas/50 border border-border-rule rounded-control flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-text-primary block">
                          {item.category}
                        </span>
                        <span className="text-[11px] text-text-secondary">
                          {item.note || item.paymentMethod?.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-bold text-text-primary">
                        {formatMoney(item.myShareMinor)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col gap-2.5 pt-2">
                <Button
                  variant="secondary"
                  className="w-full gap-1.5"
                  onClick={() => {
                    onClose();
                    onAddMissedClick();
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Missed Expense</span>
                </Button>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setIsCompleted(true)}
                >
                  Mark Done for Today
                </Button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
