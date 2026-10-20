import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Check,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { NumericKeypad } from '../ui/NumericKeypad.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { Chip } from '../ui/Chip.js';
import { Avatar } from '../ui/Avatar.js';
import { apiRequest } from '../../lib/api.js';
import { enqueueOfflineMutation } from '../../lib/offlineSync.js';
import {
  calculateSplits,
  Participant,
  rupeesToPaise,
  SplitMode,
  TransactionType,
} from '@hisaab/shared';

export interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
  initialFriends?: Array<{ id: string; name: string }>;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseAdded,
  initialFriends = [],
}) => {
  const { t } = useTranslation();
  const [amountStr, setAmountStr] = useState('0');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'transfer'>('upi');
  const [occurredOn, setOccurredOn] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState('');
  const [type, setType] = useState<TransactionType>('personal');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');

  // Friends & Splits
  const [friends, setFriends] = useState<any[]>(initialFriends);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [newFriendName, setNewFriendName] = useState('');
  const [showAddFriendInline, setShowAddFriendInline] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories & friends when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setError(null);
      setAmountStr('0');
      setNote('');
      setSelectedFriendIds([]);
      setType('personal');

      apiRequest('/categories')
        .then((res) => {
          setCategories(res.categories || []);
          if (res.categories?.length > 0) {
            setSelectedCategoryId(res.categories[0].id);
          }
        })
        .catch(() => {});

      apiRequest('/people')
        .then((res) => setFriends(res.people || []))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPaise = rupeesToPaise(amountStr || '0');

  // Keypad Handlers
  const handleDigit = (d: string) => {
    if (d === '.' && amountStr.includes('.')) return;
    if (amountStr === '0' && d !== '.') {
      setAmountStr(d);
    } else {
      setAmountStr(amountStr + d);
    }
  };

  const handleBackspace = () => {
    if (amountStr.length <= 1) {
      setAmountStr('0');
    } else {
      setAmountStr(amountStr.slice(0, -1));
    }
  };

  // Toggle friend selection
  const toggleFriend = (id: string) => {
    if (selectedFriendIds.includes(id)) {
      setSelectedFriendIds(selectedFriendIds.filter((fid) => fid !== id));
    } else {
      setSelectedFriendIds([...selectedFriendIds, id]);
    }
  };

  // Add friend inline
  const handleAddFriendInline = async () => {
    if (!newFriendName.trim()) return;
    try {
      const res = await apiRequest('/people', {
        method: 'POST',
        body: JSON.stringify({ name: newFriendName.trim() }),
      });
      setFriends([...friends, res.person]);
      setSelectedFriendIds([...selectedFriendIds, res.person.id]);
      setNewFriendName('');
      setShowAddFriendInline(false);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Build participants array for split calculation
  const buildParticipants = (): Participant[] => {
    if (type === 'personal') {
      return [{ id: 'me' }];
    }

    if (type === 'i_paid_for_someone') {
      return selectedFriendIds.map((id) => ({ id }));
    }

    if (type === 'someone_paid_for_me') {
      return [{ id: 'me' }];
    }

    // Split with friends (includes 'me' + selected friends)
    const allIds = ['me', ...selectedFriendIds];

    if (splitMode === 'equal') {
      return allIds.map((id) => ({ id }));
    }

    if (splitMode === 'percentage') {
      return allIds.map((id) => ({
        id,
        percentageBps: Math.round(parseFloat(percentages[id] || '0') * 100),
      }));
    }

    if (splitMode === 'exact') {
      return allIds.map((id) => ({
        id,
        exactAmountMinor: rupeesToPaise(exactAmounts[id] || '0'),
      }));
    }

    return allIds.map((id) => ({ id }));
  };

  // Compute live split preview
  let calculatedSplits: any[] = [];
  let splitError: string | null = null;

  if (totalPaise > 0 && (type === 'split' || type === 'i_paid_for_someone' || type === 'someone_paid_for_me')) {
    if (selectedFriendIds.length === 0) {
      splitError = 'Please select at least one friend to split with';
    } else {
      try {
        const parts = buildParticipants();
        const res = calculateSplits(totalPaise, parts, splitMode, 'me');
        calculatedSplits = res.splits;
      } catch (err: any) {
        splitError = err.message;
      }
    }
  }

  // Save Expense Handler
  const handleSave = async (andAddAnother: boolean = false) => {
    setError(null);

    if (totalPaise <= 0) {
      setError('Please enter an amount greater than ₹0');
      return;
    }

    if (!selectedCategoryId) {
      setError('Please select a category');
      return;
    }

    if (splitError) {
      setError(splitError);
      return;
    }

    setIsLoading(true);

    try {
      const clientId = crypto.randomUUID();
      const parts = buildParticipants();
      const res = calculateSplits(totalPaise, parts, splitMode, 'me');

      const payload = {
        clientId,
        type,
        payerType: type === 'someone_paid_for_me' ? 'person' : 'me',
        payerPersonId: type === 'someone_paid_for_me' ? selectedFriendIds[0] : null,
        totalMinor: totalPaise,
        currency: 'INR',
        categoryId: selectedCategoryId,
        paymentMethod,
        occurredOn,
        note: note.trim() || null,
        splitMode: type === 'split' ? splitMode : null,
        splits: res.splits.map((s) => ({
          participantId: s.participantId,
          shareMinor: s.shareMinor,
        })),
      };

      try {
        // Attempt immediate server write
        await apiRequest('/transactions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch (err: any) {
        if (err.code === 'NETWORK_ERROR' || !navigator.onLine) {
          // Offline fallback: Queue in IndexedDB
          await enqueueOfflineMutation('CREATE_TRANSACTION', payload);
        } else {
          throw err;
        }
      }

      onExpenseAdded();

      if (andAddAnother) {
        setAmountStr('0');
        setNote('');
        setIsLoading(false);
      } else {
        setIsLoading(false);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save expense');
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

      {/* Modal / Sheet Container */}
      <div className="relative z-10 w-full sm:max-w-lg bg-surface border border-border-rule rounded-t-card sm:rounded-card shadow-modal flex flex-col max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        
        {/* Top Drag Handle on Mobile */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-border-rule rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-rule">
          <h3 className="text-base font-semibold text-text-primary">
            {t('add_expense')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-text-secondary hover:text-text-primary focus:outline-none"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-5">
          {error ? (
            <div className="p-3 bg-balance-iowe-surface border border-balance-iowe text-balance-iowe text-xs rounded-control flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Large Amount Display */}
          <div className="text-center py-4 bg-canvas/70 border border-border-rule rounded-card">
            <span className="text-xs uppercase tracking-wider text-text-secondary block mb-1">
              Amount (INR)
            </span>
            <div className="flex items-center justify-center">
              <span className="text-4xl sm:text-5xl font-medium tracking-tight text-text-primary">
                ₹{amountStr}
              </span>
            </div>

            {/* Live Split Preview Pill */}
            {calculatedSplits.length > 0 && selectedFriendIds.length > 0 ? (
              <div className="mt-2 text-xs text-balance-owed font-medium flex items-center justify-center gap-1">
                <span>
                  Friend's share: ₹{(totalPaise / (selectedFriendIds.length + 1) / 100).toFixed(0)} each
                </span>
              </div>
            ) : null}
          </div>

          {/* Numeric Keypad */}
          <NumericKeypad onDigit={handleDigit} onBackspace={handleBackspace} />

          {/* Category Selector Chips */}
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Chip
                  key={cat.id}
                  selected={selectedCategoryId === cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  {cat.name}
                </Chip>
              ))}
            </div>
          </div>

          {/* Transaction Type Selector */}
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-2">
              Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-canvas border border-border-rule rounded-control">
              {[
                { id: 'personal', label: 'Personal' },
                { id: 'split', label: 'Split' },
                { id: 'i_paid_for_someone', label: 'Paid for friend' },
                { id: 'someone_paid_for_me', label: 'Paid for me' },
              ].map((tItem) => (
                <button
                  key={tItem.id}
                  type="button"
                  onClick={() => setType(tItem.id as any)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-control transition-all ${
                    type === tItem.id
                      ? 'bg-surface shadow-xs text-action-primary border border-border-rule'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* Friends Selection for Shared Types */}
          {type !== 'personal' ? (
            <div className="p-3 bg-canvas/60 border border-border-rule rounded-card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">
                  {type === 'someone_paid_for_me' ? 'Who paid for you?' : 'Split with Friends'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddFriendInline(!showAddFriendInline)}
                  className="text-xs text-action-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ New Friend</span>
                </button>
              </div>

              {/* Add Friend Inline Form */}
              {showAddFriendInline ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Friend's Name"
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    className="py-1.5 text-xs"
                  />
                  <Button size="sm" onClick={handleAddFriendInline}>
                    Add
                  </Button>
                </div>
              ) : null}

              {/* Friends Chips List */}
              <div className="flex flex-wrap gap-2">
                {friends.map((f) => {
                  const isSelected = selectedFriendIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFriend(f.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors select-none ${
                        isSelected
                          ? 'bg-action-primary text-white dark:text-[#102622] border-action-primary'
                          : 'bg-surface text-text-primary border-border-rule hover:bg-canvas'
                      }`}
                    >
                      <Avatar name={f.name} size="sm" />
                      <span>{f.name}</span>
                      {isSelected ? <Check className="w-3.5 h-3.5 ml-0.5" /> : null}
                    </button>
                  );
                })}
              </div>

              {/* Split Mode Selector (for 'split' type) */}
              {type === 'split' ? (
                <div className="flex items-center gap-2 pt-2 border-t border-border-rule">
                  <span className="text-[11px] text-text-secondary uppercase">Split Mode:</span>
                  {(['equal', 'exact', 'percentage'] as SplitMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSplitMode(mode)}
                      className={`px-2.5 py-1 text-xs rounded-control capitalize font-medium ${
                        splitMode === mode
                          ? 'bg-action-primary text-white dark:text-[#102622]'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Exact Amounts Inputs */}
              {type === 'split' && splitMode === 'exact' && selectedFriendIds.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border-rule">
                  <span className="text-[11px] text-text-secondary font-medium">Friend Shares (₹):</span>
                  {selectedFriendIds.map((id) => {
                    const f = friends.find((x) => x.id === id);
                    return (
                      <div key={id} className="flex items-center justify-between text-xs">
                        <span className="text-text-primary">{f?.name || 'Friend'}</span>
                        <input
                          type="number"
                          step="any"
                          className="w-24 px-2 py-1 bg-surface border border-border-rule rounded text-xs text-right"
                          placeholder="0"
                          value={exactAmounts[id] || ''}
                          onChange={(e) => setExactAmounts({ ...exactAmounts, [id]: e.target.value })}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Percentage Inputs */}
              {type === 'split' && splitMode === 'percentage' && selectedFriendIds.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border-rule">
                  <span className="text-[11px] text-text-secondary font-medium">Friend Shares (%):</span>
                  {selectedFriendIds.map((id) => {
                    const f = friends.find((x) => x.id === id);
                    return (
                      <div key={id} className="flex items-center justify-between text-xs">
                        <span className="text-text-primary">{f?.name || 'Friend'}</span>
                        <input
                          type="number"
                          step="any"
                          className="w-20 px-2 py-1 bg-surface border border-border-rule rounded text-xs text-right"
                          placeholder="0"
                          value={percentages[id] || ''}
                          onChange={(e) => setPercentages({ ...percentages, [id]: e.target.value })}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-surface text-text-primary border border-border-rule rounded-control text-xs font-medium focus:outline-none focus:border-action-primary"
              >
                <option value="upi">UPI / GPay / Paytm</option>
                <option value="cash">Cash</option>
                <option value="card">Card / Debit</option>
                <option value="transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                className="w-full px-3 py-2 bg-surface text-text-primary border border-border-rule rounded-control text-xs font-medium focus:outline-none focus:border-action-primary"
              />
            </div>
          </div>

          {/* Optional Note */}
          <Input
            label="Note (Optional)"
            placeholder="e.g. Dhaba dinner after exam"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border-rule flex items-center gap-3 bg-surface">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            disabled={isLoading}
            onClick={() => handleSave(true)}
          >
            Save & Add Another
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            isLoading={isLoading}
            onClick={() => handleSave(false)}
          >
            {t('save_expense')}
          </Button>
        </div>

      </div>
    </div>
  );
};
