import React, { useEffect, useState } from 'react';
import { X, Send, CreditCard, Check } from 'lucide-react';
import { Avatar } from '../ui/Avatar.js';
import { Button } from '../ui/Button.js';
import { SettleUpModal } from './SettleUpModal.js';
import { apiRequest } from '../../lib/api.js';
import { formatMoney } from '@hisaab/shared';

export interface PersonDetailModalProps {
  personId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onBalanceUpdated?: () => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  personId,
  isOpen,
  onClose,
  onBalanceUpdated,
}) => {
  const [data, setData] = useState<any>(null);
  const [, setIsLoading] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [copiedRemind, setCopiedRemind] = useState(false);

  const fetchDetail = () => {
    if (!personId) return;
    setIsLoading(true);
    apiRequest(`/people/${personId}`)
      .then((res) => {
        setData(res);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen && personId) {
      fetchDetail();
    }
  }, [isOpen, personId]);

  if (!isOpen || !personId) return null;

  const person = data?.person;
  const netBalance = person?.netBalanceMinor || 0;
  const isOwedToMe = netBalance > 0;
  const isIOwe = netBalance < 0;

  // Generate courteous reminder copy for WhatsApp / SMS
  const generateRemindText = () => {
    if (!person) return '';
    const amountStr = formatMoney(Math.abs(netBalance));
    if (isOwedToMe) {
      return `Hey ${person.name}! Quick friendly reminder: ${amountStr} is pending from our campus expenses on Hisaab. Whenever convenient, please UPI me! Thanks!`;
    }
    return `Hey ${person.name}! Just checking in: I owe you ${amountStr} on Hisaab. Let me know your UPI ID so I can clear it!`;
  };

  const handleCopyRemind = async () => {
    const text = generateRemindText();
    await navigator.clipboard.writeText(text);
    setCopiedRemind(true);
    setTimeout(() => setCopiedRemind(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full sm:max-w-lg bg-surface border border-border-rule rounded-t-card sm:rounded-card shadow-modal flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-rule">
          <div className="flex items-center gap-3">
            <Avatar name={person?.name || 'Friend'} size="md" />
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                {person?.name || 'Loading...'}
              </h3>
              {person?.phone ? (
                <span className="text-xs text-text-secondary">{person.phone}</span>
              ) : null}
            </div>
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-5">
          {/* Hero Net Balance Card */}
          <div
            className={`p-5 rounded-card border flex flex-col items-center text-center ${
              isOwedToMe
                ? 'bg-balance-owed-surface border-balance-owed/30 text-balance-owed'
                : isIOwe
                ? 'bg-balance-iowe-surface border-balance-iowe/30 text-balance-iowe'
                : 'bg-canvas border-border-rule text-text-secondary'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider mb-1">
              {isOwedToMe
                ? `${person?.name} owes you`
                : isIOwe
                ? `You owe ${person?.name}`
                : 'All Settled Up'}
            </span>
            <span className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              {netBalance === 0 ? '₹0.00' : formatMoney(Math.abs(netBalance))}
            </span>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full max-w-xs">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setIsSettleOpen(true)}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Settle Up</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleCopyRemind}
              >
                {copiedRemind ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-balance-owed" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Remind</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Shared Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Shared History
            </h4>

            {data?.transactions?.length === 0 && data?.settlements?.length === 0 ? (
              <div className="text-center py-8 text-xs text-text-secondary">
                No shared transactions recorded yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* List settlements */}
                {data?.settlements?.map((s: any) => (
                  <div
                    key={s.id}
                    className="p-3 bg-canvas/60 rounded-card border border-border-rule flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-balance-owed-surface text-balance-owed flex items-center justify-center font-bold">
                        ✓
                      </div>
                      <div>
                        <span className="font-semibold text-text-primary block">
                          Settlement ({s.paymentMethod.toUpperCase()})
                        </span>
                        <span className="text-[11px] text-text-secondary">
                          {s.direction === 'they_paid_me'
                            ? `${person?.name} paid you`
                            : `You paid ${person?.name}`}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-balance-owed">
                      {formatMoney(s.amountMinor)}
                    </span>
                  </div>
                ))}

                {/* List shared transactions */}
                {data?.transactions?.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3 bg-surface rounded-card border border-border-rule flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-text-primary block">
                        {t.category?.name || 'Expense'}
                      </span>
                      <span className="text-[11px] text-text-secondary">
                        {t.note || t.type} · {t.occurredOn?.split('T')[0]}
                      </span>
                    </div>
                    <span className="font-semibold text-text-primary">
                      {formatMoney(t.totalMinor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Settle Up Nested Modal */}
      {isSettleOpen && person ? (
        <SettleUpModal
          isOpen={isSettleOpen}
          onClose={() => setIsSettleOpen(false)}
          person={{
            id: person.id,
            name: person.name,
            netBalanceMinor: person.netBalanceMinor,
            status: person.status,
          }}
          onSettled={() => {
            fetchDetail();
            onBalanceUpdated?.();
          }}
        />
      ) : null}
    </div>
  );
};
