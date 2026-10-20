import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateGroupNetMatrix,
  calculateNetBalances,
  calculateOverallBalances,
} from '../src/money/balance.js';
import {
  SettlementForLedger,
  TransactionForLedger,
} from '../src/money/types.js';

describe('calculateNetBalances - Unit Tests', () => {
  it('correctly tracks pairwise balances and settlements with friends', () => {
    const transactions: TransactionForLedger[] = [
      // 1. I paid ₹1000 for dinner split with Rahul (500 me, 500 rahul)
      {
        id: 'tx-1',
        payerId: 'me',
        totalMinor: 100000,
        splits: [
          { participantId: 'me', shareMinor: 50000 },
          { participantId: 'rahul', shareMinor: 50000 },
        ],
      },
      // 2. Rahul paid ₹400 for cab split with me (200 me, 200 rahul)
      {
        id: 'tx-2',
        payerId: 'rahul',
        totalMinor: 40000,
        splits: [
          { participantId: 'me', shareMinor: 20000 },
          { participantId: 'rahul', shareMinor: 20000 },
        ],
      },
      // 3. I paid ₹150 for chai entirely for Amit
      {
        id: 'tx-3',
        payerId: 'me',
        totalMinor: 15000,
        splits: [{ participantId: 'amit', shareMinor: 15000 }],
      },
    ];

    const settlements: SettlementForLedger[] = [
      // Rahul settles ₹100 towards his balance
      {
        id: 's-1',
        fromPersonId: 'rahul',
        toPersonId: 'me',
        amountMinor: 10000,
      },
    ];

    const balances = calculateNetBalances(transactions, settlements, 'me');

    // Rahul: owed 500, user owed 200 -> net +300. Settlement of 100 paid to user -> net +200
    const rahulBalance = balances.get('rahul');
    expect(rahulBalance).toBeDefined();
    expect(rahulBalance?.netBalanceMinor).toBe(20000); // Rahul owes me ₹200
    expect(rahulBalance?.status).toBe('owes_me');

    // Amit: owes 150
    const amitBalance = balances.get('amit');
    expect(amitBalance?.netBalanceMinor).toBe(15000);
    expect(amitBalance?.status).toBe('owes_me');

    const overall = calculateOverallBalances(balances);
    expect(overall.peopleOweYouMinor).toBe(35000); // 200 + 150 = ₹350
    expect(overall.youOweMinor).toBe(0);
    expect(overall.netTotalMinor).toBe(35000);
  });

  it('ignores soft-deleted transactions and settlements', () => {
    const transactions: TransactionForLedger[] = [
      {
        id: 'tx-1',
        payerId: 'me',
        totalMinor: 50000,
        splits: [{ participantId: 'rahul', shareMinor: 50000 }],
        deletedAt: new Date().toISOString(), // Soft-deleted
      },
    ];

    const balances = calculateNetBalances(transactions, [], 'me');
    expect(balances.size).toBe(0);
  });
});

describe('calculateNetBalances - Property-Based Tests (fast-check)', () => {
  it('PROPERTY: Balances net to zero across all participants in any closed economy', () => {
    fc.assert(
      fc.property(
        // Group of 3 to 8 participants
        fc.integer({ min: 3, max: 8 }),
        // Number of transactions: 1 to 20
        fc.integer({ min: 1, max: 20 }),
        // Number of settlements: 0 to 10
        fc.integer({ min: 0, max: 10 }),
        (numUsers, numTx, numSettlements) => {
          const userIds = Array.from({ length: numUsers }, (_, i) => `u_${i}`);

          // Generate random transactions
          const transactions: TransactionForLedger[] = [];
          for (let i = 0; i < numTx; i++) {
            const payerId = userIds[Math.floor(Math.random() * userIds.length)];
            const totalMinor = Math.floor(Math.random() * 500000) + 100; // ₹1 to ₹5000

            // Pick 1 to N random participants
            const numParts = Math.floor(Math.random() * userIds.length) + 1;
            const partIndices = [...userIds]
              .sort(() => 0.5 - Math.random())
              .slice(0, numParts);

            // Equal split
            const base = Math.floor(totalMinor / numParts);
            const rem = totalMinor - base * numParts;

            const splits = partIndices.map((id, idx) => ({
              participantId: id,
              shareMinor: base + (idx < rem ? 1 : 0),
            }));

            transactions.push({
              id: `tx_${i}`,
              payerId,
              totalMinor,
              splits,
            });
          }

          // Generate random settlements
          const settlements: SettlementForLedger[] = [];
          for (let i = 0; i < numSettlements; i++) {
            const fromPersonId =
              userIds[Math.floor(Math.random() * userIds.length)];
            let toPersonId = userIds[Math.floor(Math.random() * userIds.length)];
            if (toPersonId === fromPersonId) {
              toPersonId =
                userIds[(userIds.indexOf(fromPersonId) + 1) % userIds.length];
            }

            settlements.push({
              id: `s_${i}`,
              fromPersonId,
              toPersonId,
              amountMinor: Math.floor(Math.random() * 50000) + 10,
            });
          }

          // Verify group net balance matrix
          const netMatrix = calculateGroupNetMatrix(
            userIds,
            transactions,
            settlements
          );

          let grandTotalNet = 0;
          for (const net of netMatrix.values()) {
            grandTotalNet += net;
          }

          // Sum of all net balances across all participants MUST be strictly 0
          expect(grandTotalNet).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});
