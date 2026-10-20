import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { apiRequest } from '../../lib/api.js';
import { formatMoney, rupeesToPaise } from '@hisaab/shared';

export interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  person?: {
    id: string;
    name: string;
    netBalanceMinor: number;
    status?: string;
  } | null;
  onSettled: () => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  person: initialPerson,
  onSettled,
}) => {
  const [selectedPerson, setSelectedPerson] = useState<any>(initialPerson || null);
  const [peopleList, setPeopleList] = useState<any[]>([]);
  const [direction, setDirection] = useState<'they_paid_me' | 'i_paid_them'>('they_paid_me');
  const [amountStr, setAmountStr] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash' | 'card' | 'transfer'>('upi');
  const [settledOn, setSettledOn] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (initialPerson) {
      setSelectedPerson(initialPerson);
      const isTheyOweMe = initialPerson.netBalanceMinor > 0;
      setDirection(isTheyOweMe ? 'they_paid_me' : 'i_paid_them');
      setAmountStr(String(Math.abs(initialPerson.netBalanceMinor) / 100 || '0'));
    } else if (isOpen) {
      // Fetch friends for settlement selection
      apiRequest('/balances').then((res) => {
        if (res && res.balances) {
          const list = res.balances.map((b: any) => ({
            id: b.personId,
            name: b.personName,
            netBalanceMinor: b.netBalancePaise,
            status: b.netBalancePaise > 0 ? 'owes_me' : b.netBalancePaise < 0 ? 'i_owe' : 'settled',
          }));
          setPeopleList(list);
          if (list.length > 0) {
            const first = list[0];
            setSelectedPerson(first);
            setDirection(first.netBalanceMinor > 0 ? 'they_paid_me' : 'i_paid_them');
            setAmountStr(String(Math.abs(first.netBalanceMinor) / 100 || '0'));
          }
        }
      }).catch(() => {});
    }
  }, [initialPerson, isOpen]);

  if (!isOpen) return null;

  const currentPerson = selectedPerson || {
    id: '',
    name: 'Friend',
    netBalanceMinor: 0,
    status: 'settled',
  };

  const absBalanceRupees = Math.abs(currentPerson.netBalanceMinor) / 100;
  const amountPaise = rupeesToPaise(amountStr || '0');

  // Compute updated balance after settlement
  let updatedBalanceMinor = currentPerson.netBalanceMinor;
  if (direction === 'they_paid_me') {
    updatedBalanceMinor -= amountPaise;
  } else {
    updatedBalanceMinor += amountPaise;
  }

  const handlePersonChange = (personId: string) => {
    const found = peopleList.find((p) => p.id === personId);
    if (found) {
      setSelectedPerson(found);
      setDirection(found.netBalanceMinor > 0 ? 'they_paid_me' : 'i_paid_them');
      setAmountStr(String(Math.abs(found.netBalanceMinor) / 100 || '0'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPerson.id) {
      setError('Please select a friend to settle with');
      return;
    }

    if (amountPaise <= 0) {
      setError('Please enter a settlement amount greater than ₹0');
      return;
    }

    setIsLoading(true);

    try {
      await apiRequest('/settlements', {
        method: 'POST',
        body: JSON.stringify({
          clientId: crypto.randomUUID(),
          personId: currentPerson.id,
          direction,
          amountMinor: amountPaise,
          paymentMethod,
          settledOn,
          note: note.trim() || null,
        }),
      });

      setIsSuccess(true);
      onSettled();
    } catch (err: any) {
      setError(err.message || 'Settlement failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div className="relative z-10 w-full sm:max-w-md bg-surface border border-border-rule rounded-t-card sm:rounded-card shadow-modal flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-rule">
          <h3 className="text-base font-semibold text-text-primary">
            Settle up {currentPerson.name ? `with ${currentPerson.name}` : ''}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-text-secondary hover:text-text-primary"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-balance-owed-surface text-balance-owed flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-semibold text-text-primary mb-1">
              Settlement Recorded!
            </h4>
            <p className="text-xs text-text-secondary mb-6">
              Balance with {currentPerson.name} is now{' '}
              <span className="font-bold">
                {updatedBalanceMinor === 0 ? '₹0 (Settled)' : formatMoney(updatedBalanceMinor)}
              </span>
            </p>
            <Button variant="primary" className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
            {error ? (
              <div className="p-3 bg-balance-iowe-surface border border-balance-iowe text-balance-iowe text-xs rounded-control">
                {error}
              </div>
            ) : null}

            {/* Friend Selection if opened generically */}
            {!initialPerson && peopleList.length > 0 && (
              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-1">
                  Friend
                </label>
                <select
                  value={currentPerson.id}
                  onChange={(e) => handlePersonChange(e.target.value)}
                  className="w-full px-3 py-2 bg-surface text-text-primary border border-border-rule rounded-control text-xs font-medium focus:outline-none"
                >
                  {peopleList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.netBalanceMinor > 0 ? `owes you ${formatMoney(p.netBalanceMinor)}` : p.netBalanceMinor < 0 ? `you owe ${formatMoney(Math.abs(p.netBalanceMinor))}` : 'Settled'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Direction Toggle */}
            <div>
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-1.5">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-canvas border border-border-rule rounded-control">
                <button
                  type="button"
                  onClick={() => setDirection('they_paid_me')}
                  className={`py-2 px-3 text-xs font-semibold rounded-control transition-all ${
                    direction === 'they_paid_me'
                      ? 'bg-balance-owed-surface text-balance-owed border border-balance-owed/30 shadow-xs'
                      : 'text-text-secondary'
                  }`}
                >
                  {currentPerson.name} paid me
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('i_paid_them')}
                  className={`py-2 px-3 text-xs font-semibold rounded-control transition-all ${
                    direction === 'i_paid_them'
                      ? 'bg-balance-iowe-surface text-balance-iowe border border-balance-iowe/30 shadow-xs'
                      : 'text-text-secondary'
                  }`}
                >
                  I paid {currentPerson.name}
                </button>
              </div>
            </div>

            {/* Quick Amount Chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Amount (INR)
                </label>
                {absBalanceRupees > 0 && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAmountStr(String(absBalanceRupees))}
                      className="text-[11px] font-semibold text-action-primary hover:underline"
                    >
                      Full (₹{absBalanceRupees})
                    </button>
                    <span className="text-text-secondary/40">·</span>
                    <button
                      type="button"
                      onClick={() => setAmountStr(String(Math.round(absBalanceRupees / 2)))}
                      className="text-[11px] font-semibold text-action-primary hover:underline"
                    >
                      Half (₹{Math.round(absBalanceRupees / 2)})
                    </button>
                  </div>
                )}
              </div>
              <Input
                type="number"
                step="any"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                required
              />
            </div>

            {/* Live Balance Update Preview */}
            <div className="p-3 bg-canvas/70 border border-border-rule rounded-control flex items-center justify-between text-xs">
              <span className="text-text-secondary">Current Balance:</span>
              <span className="font-semibold text-text-primary">
                {formatMoney(currentPerson.netBalanceMinor)}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-text-secondary">New Balance:</span>
              <span
                className={`font-bold ${
                  updatedBalanceMinor > 0
                    ? 'text-balance-owed'
                    : updatedBalanceMinor < 0
                    ? 'text-balance-iowe'
                    : 'text-text-secondary'
                }`}
              >
                {updatedBalanceMinor === 0 ? '₹0.00' : formatMoney(updatedBalanceMinor)}
              </span>
            </div>

            {/* Payment Method & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-1">
                  Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-surface text-text-primary border border-border-rule rounded-control text-xs font-medium focus:outline-none"
                >
                  <option value="upi">UPI / GPay / Paytm</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={settledOn}
                  onChange={(e) => setSettledOn(e.target.value)}
                  className="w-full px-3 py-2 bg-surface text-text-primary border border-border-rule rounded-control text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            <Input
              label="Note (Optional)"
              placeholder="e.g. GPay screenshot reference"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Confirm Settlement
            </Button>
          </form>
        )}

      </div>
    </div>
  );
};
