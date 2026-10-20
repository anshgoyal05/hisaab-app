import { describe, expect, it } from 'vitest';
import { calculatePersonalSpending } from '../src/money/spending.js';

describe('calculatePersonalSpending - Campus Ledger Spending Rules', () => {
  it('RULE: "I paid for someone" => my personal spend is ₹0 and entire amount is receivable', () => {
    // User pays ₹250 for Rahul's book
    const transactions = [
      {
        id: 'tx-1',
        type: 'i_paid_for_someone' as const,
        payerId: 'me',
        categoryId: 'study',
        occurredOn: '2026-10-20',
        totalMinor: 25000,
        splits: [{ participantId: 'rahul', shareMinor: 25000 }],
      },
    ];

    const result = calculatePersonalSpending(transactions, [], 'me');
    expect(result.myPersonalSpendMinor).toBe(0); // My spend is 0
    expect(result.receivablesCreatedMinor).toBe(25000); // 25000 receivable
    expect(result.byCategoryMinor['study']).toBeUndefined(); // Nothing consumed from study budget
  });

  it('RULE: "Someone paid for me" => my share on that date counts as my personal spend', () => {
    // Rahul pays ₹400 for lunch, user share is ₹200
    const transactions = [
      {
        id: 'tx-2',
        type: 'someone_paid_for_me' as const,
        payerId: 'rahul',
        categoryId: 'food',
        occurredOn: '2026-10-20',
        totalMinor: 40000,
        splits: [
          { participantId: 'me', shareMinor: 20000 },
          { participantId: 'rahul', shareMinor: 20000 },
        ],
      },
    ];

    const result = calculatePersonalSpending(transactions, [], 'me');
    expect(result.myPersonalSpendMinor).toBe(20000); // ₹200
    expect(result.receivablesCreatedMinor).toBe(0);
    expect(result.byCategoryMinor['food']).toBe(20000);
    expect(result.byDateMinor['2026-10-20']).toBe(20000);
  });

  it('RULE: In a split dinner, user spending is ONLY their own share (e.g. ₹1000 of ₹4000 dinner)', () => {
    // User paid ₹4000 for dinner split 4 ways (₹1000 each with Rahul, Priya, Amit)
    const transactions = [
      {
        id: 'tx-3',
        type: 'split' as const,
        payerId: 'me',
        categoryId: 'food',
        occurredOn: '2026-10-20',
        totalMinor: 400000,
        splits: [
          { participantId: 'me', shareMinor: 100000 },
          { participantId: 'rahul', shareMinor: 100000 },
          { participantId: 'priya', shareMinor: 100000 },
          { participantId: 'amit', shareMinor: 100000 },
        ],
      },
    ];

    const result = calculatePersonalSpending(transactions, [], 'me');
    expect(result.myPersonalSpendMinor).toBe(100000); // ₹1000 personal spend
    expect(result.receivablesCreatedMinor).toBe(300000); // ₹3000 pass-through receivable
    expect(result.byCategoryMinor['food']).toBe(100000);
  });

  it('RULE: Settlements are NEVER counted as personal spending or budget consumption', () => {
    const transactions = [
      {
        id: 'tx-4',
        type: 'personal' as const,
        payerId: 'me',
        categoryId: 'food',
        occurredOn: '2026-10-20',
        totalMinor: 15000,
        splits: [{ participantId: 'me', shareMinor: 15000 }],
      },
    ];

    const settlements = [
      // User settles ₹500 debt to friend
      {
        id: 's-1',
        amountMinor: 50000,
        settledOn: '2026-10-20',
      },
      // Friend settles ₹300 debt to user
      {
        id: 's-2',
        amountMinor: 30000,
        settledOn: '2026-10-20',
      },
    ];

    const result = calculatePersonalSpending(transactions, settlements, 'me');
    // Only the ₹150 personal expense counts as spending!
    expect(result.myPersonalSpendMinor).toBe(15000);
  });
});
