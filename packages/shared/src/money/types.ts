export type SplitMode = 'equal' | 'exact' | 'percentage';

export type TransactionType =
  | 'personal'
  | 'split'
  | 'i_paid_for_someone'
  | 'someone_paid_for_me';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'transfer';

export interface Participant {
  id: string; // 'me' or person UUID
  name?: string;
  exactAmountMinor?: number; // In exact mode (paise)
  percentageBps?: number; // In percentage mode, basis points: 100% = 10000 bps
}

export interface SplitResultItem {
  participantId: string;
  shareMinor: number; // In integer paise
  percentageBps?: number;
}

export interface SplitResult {
  splits: SplitResultItem[];
  totalMinor: number;
  remainderDistributedMinor: number;
}

export interface SplitForLedger {
  participantId: string; // 'me' or person UUID
  shareMinor: number;
}

export interface TransactionForLedger {
  id: string;
  payerId: string; // 'me' or person UUID
  totalMinor: number;
  splits: SplitForLedger[];
  occurredOn?: string;
  deletedAt?: Date | string | null;
}

export interface SettlementForLedger {
  id: string;
  fromPersonId: string; // 'me' or person UUID
  toPersonId: string; // 'me' or person UUID
  amountMinor: number;
  settledOn?: string;
  deletedAt?: Date | string | null;
}

export interface PersonBalance {
  personId: string;
  netBalanceMinor: number; // >0: they owe me, <0: I owe them, ==0: settled
  theyOweMeMinor: number;
  iOweThemMinor: number;
  status: 'owes_me' | 'i_owe' | 'settled';
}

export interface OverallBalances {
  peopleOweYouMinor: number; // Total positive balances owed to me
  youOweMinor: number; // Total negative balances I owe others (as positive absolute)
  netTotalMinor: number; // Overall net (peopleOweYou - youOwe)
}

export interface SpendingSummary {
  myPersonalSpendMinor: number; // Only user's genuine spending
  receivablesCreatedMinor: number; // Amount paid on behalf of others
  byCategoryMinor: Record<string, number>;
  byDateMinor: Record<string, number>;
}
