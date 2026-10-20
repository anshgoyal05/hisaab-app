import { SpendingSummary } from './types.js';

export interface TransactionForSpendingCalculation {
  id: string;
  type: 'personal' | 'split' | 'i_paid_for_someone' | 'someone_paid_for_me';
  payerId: string;
  categoryId: string;
  occurredOn: string; // YYYY-MM-DD
  totalMinor: number;
  splits: Array<{
    participantId: string;
    shareMinor: number;
  }>;
  deletedAt?: Date | string | null;
}

export interface SettlementForSpendingCalculation {
  id: string;
  amountMinor: number;
  settledOn: string;
  deletedAt?: Date | string | null;
}

/**
 * Calculates a user's genuine personal spending and receivables.
 *
 * Strict Rules:
 * 1. "Personal": entire total is personal spend.
 * 2. "Split": ONLY the user's ('me') share counts as personal spend; the remainder is receivables.
 * 3. "I paid for someone": personal spend is exactly ₹0; entire total is receivables.
 * 4. "Someone paid for me": user's share on that date counts as personal spend; receivables is ₹0.
 * 5. Settlements: NEVER count as spending (they are balance reconciliation transfers).
 */
export function calculatePersonalSpending(
  transactions: TransactionForSpendingCalculation[],
  settlements: SettlementForSpendingCalculation[],
  currentUserId: string = 'me'
): SpendingSummary {
  let myPersonalSpendMinor = 0;
  let receivablesCreatedMinor = 0;
  const byCategoryMinor: Record<string, number> = {};
  const byDateMinor: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.deletedAt) continue;

    const dateKey = tx.occurredOn;
    const categoryKey = tx.categoryId;

    // Find the current user's share in this transaction
    const mySplit = tx.splits.find((s) => s.participantId === currentUserId);
    const myShare = mySplit ? mySplit.shareMinor : 0;

    // Calculate others' share
    const othersShare = tx.splits
      .filter((s) => s.participantId !== currentUserId)
      .reduce((sum, s) => sum + s.shareMinor, 0);

    let txPersonalSpend = 0;

    if (tx.type === 'personal') {
      txPersonalSpend = tx.totalMinor;
    } else if (tx.type === 'i_paid_for_someone') {
      // Rule: "I paid for someone" = my spend is ₹0
      txPersonalSpend = 0;
      receivablesCreatedMinor += tx.totalMinor;
    } else if (tx.type === 'someone_paid_for_me') {
      // Rule: "Someone paid for me" = my share on the expense date
      txPersonalSpend = myShare;
    } else if (tx.type === 'split') {
      // Rule: In a split, only my own share counts as my personal spend
      txPersonalSpend = myShare;
      if (tx.payerId === currentUserId) {
        // User paid the bill, so others' share is receivable
        receivablesCreatedMinor += othersShare;
      }
    }

    myPersonalSpendMinor += txPersonalSpend;

    if (txPersonalSpend > 0) {
      byCategoryMinor[categoryKey] =
        (byCategoryMinor[categoryKey] ?? 0) + txPersonalSpend;
      byDateMinor[dateKey] = (byDateMinor[dateKey] ?? 0) + txPersonalSpend;
    }
  }

  // Rule 5: Settlements are NEVER spending. (Verified: settlements do not mutate myPersonalSpendMinor).

  return {
    myPersonalSpendMinor,
    receivablesCreatedMinor,
    byCategoryMinor,
    byDateMinor,
  };
}
