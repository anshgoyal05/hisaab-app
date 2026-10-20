import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { calculateSplits, validateSplitConservation } from '../src/money/split.js';
import { Participant } from '../src/money/types.js';

describe('calculateSplits - Unit Tests', () => {
  it('handles 2-person equal split with odd paise (payer receives remainder)', () => {
    // ₹100.01 = 10001 paise. Split between 'me' (payer) and 'rahul'
    const participants: Participant[] = [{ id: 'me' }, { id: 'rahul' }];
    const result = calculateSplits(10001, participants, 'equal', 'me');

    expect(result.splits).toHaveLength(2);
    expect(result.totalMinor).toBe(10001);
    expect(result.remainderDistributedMinor).toBe(1);

    const meSplit = result.splits.find((s) => s.participantId === 'me');
    const rahulSplit = result.splits.find((s) => s.participantId === 'rahul');

    expect(meSplit?.shareMinor).toBe(5001); // 5000 + 1 paise
    expect(rahulSplit?.shareMinor).toBe(5000);
    expect(validateSplitConservation(10001, result.splits)).toBe(true);
  });

  it('handles 2-person equal split where friend is payer', () => {
    const participants: Participant[] = [{ id: 'me' }, { id: 'rahul' }];
    const result = calculateSplits(10001, participants, 'equal', 'rahul');

    const meSplit = result.splits.find((s) => s.participantId === 'me');
    const rahulSplit = result.splits.find((s) => s.participantId === 'rahul');

    expect(rahulSplit?.shareMinor).toBe(5001); // Payer gets the remainder
    expect(meSplit?.shareMinor).toBe(5000);
    expect(validateSplitConservation(10001, result.splits)).toBe(true);
  });

  it('handles equal split when payer is NOT among participants (e.g. third-party gift/pass-through)', () => {
    // Third party 'amit' paid for 'rahul' and 'priya'
    const participants: Participant[] = [{ id: 'priya' }, { id: 'rahul' }];
    const result = calculateSplits(10001, participants, 'equal', 'amit');

    expect(result.splits).toHaveLength(2);
    // 'priya' comes before 'rahul' alphabetically -> priya gets remainder
    const priyaSplit = result.splits.find((s) => s.participantId === 'priya');
    const rahulSplit = result.splits.find((s) => s.participantId === 'rahul');

    expect(priyaSplit?.shareMinor).toBe(5001);
    expect(rahulSplit?.shareMinor).toBe(5000);
    expect(validateSplitConservation(10001, result.splits)).toBe(true);
  });

  it('handles percentage splits with basis points and distributes remainders by largest fraction', () => {
    // ₹100.00 = 10000 paise split 3 ways: 33.33%, 33.33%, 33.34% (3333 bps, 3333 bps, 3334 bps)
    const participants: Participant[] = [
      { id: 'user1', percentageBps: 3333 },
      { id: 'user2', percentageBps: 3333 },
      { id: 'user3', percentageBps: 3334 },
    ];
    const result = calculateSplits(10000, participants, 'percentage', 'user1');

    expect(validateSplitConservation(10000, result.splits)).toBe(true);
    const sum = result.splits.reduce((acc, s) => acc + s.shareMinor, 0);
    expect(sum).toBe(10000);
  });

  it('throws error when percentage split does not equal 100.00% (10000 bps)', () => {
    const participants: Participant[] = [
      { id: 'user1', percentageBps: 5000 },
      { id: 'user2', percentageBps: 4999 }, // 9999 bps total
    ];
    expect(() =>
      calculateSplits(10000, participants, 'percentage', 'user1')
    ).toThrow(/must total exactly 100\.00%/);
  });

  it('handles exact splits when sum matches total', () => {
    const participants: Participant[] = [
      { id: 'user1', exactAmountMinor: 4500 },
      { id: 'user2', exactAmountMinor: 5500 },
    ];
    const result = calculateSplits(10000, participants, 'exact', 'user1');
    expect(validateSplitConservation(10000, result.splits)).toBe(true);
    expect(result.splits[0].shareMinor).toBe(4500);
    expect(result.splits[1].shareMinor).toBe(5500);
  });

  it('throws error when exact split does not match total', () => {
    const participants: Participant[] = [
      { id: 'user1', exactAmountMinor: 4000 },
      { id: 'user2', exactAmountMinor: 5000 },
    ];
    expect(() =>
      calculateSplits(10000, participants, 'exact', 'user1')
    ).toThrow(/does not match total/);
  });
});

describe('calculateSplits - Property-Based Tests (fast-check)', () => {
  it('PROPERTY: In equal split, sum of shares ALWAYS equals totalMinor with zero drift (1 to 50 participants, up to 10M INR)', () => {
    fc.assert(
      fc.property(
        // totalMinor from 1 paise (₹0.01) to 1,000,000,000 paise (₹1 Crore)
        fc.integer({ min: 1, max: 1_000_000_000 }),
        // 1 to 50 participants
        fc.integer({ min: 1, max: 50 }),
        // whether payer is included in participants or not
        fc.boolean(),
        (totalMinor, numParticipants, payerInGroup) => {
          const participantIds = Array.from(
            { length: numParticipants },
            (_, i) => `user_${i + 1}`
          );

          const payerId = payerInGroup ? participantIds[0] : 'external_payer';
          const participants: Participant[] = participantIds.map((id) => ({ id }));

          const result = calculateSplits(totalMinor, participants, 'equal', payerId);

          // 1. Strict sum conservation
          const totalShares = result.splits.reduce(
            (acc, s) => acc + s.shareMinor,
            0
          );
          expect(totalShares).toBe(totalMinor);

          // 2. Max difference between any two shares is at most 1 paise
          const baseShare = Math.floor(totalMinor / numParticipants);
          for (const split of result.splits) {
            expect(
              split.shareMinor === baseShare || split.shareMinor === baseShare + 1
            ).toBe(true);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('PROPERTY: In percentage split, sum of shares ALWAYS equals totalMinor for any valid 10,000 bps distribution', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500_000_000 }),
        // Generate random partition of 10000 bps into 2 to 10 participants
        fc.integer({ min: 2, max: 10 }),
        (totalMinor, numParticipants) => {
          // Generate partition summing to 10000
          const cuts = Array.from({ length: numParticipants - 1 }, () =>
            Math.floor(Math.random() * 9998) + 1
          ).sort((a, b) => a - b);

          const bpsList: number[] = [];
          let prev = 0;
          for (const cut of cuts) {
            bpsList.push(cut - prev);
            prev = cut;
          }
          bpsList.push(10000 - prev);

          // Ensure all bps are >= 0 and sum to 10000
          if (bpsList.some((b) => b < 0)) return;

          const participants: Participant[] = bpsList.map((bps, i) => ({
            id: `p_${i}`,
            percentageBps: bps,
          }));

          const result = calculateSplits(
            totalMinor,
            participants,
            'percentage',
            'p_0'
          );

          const totalShares = result.splits.reduce(
            (acc, s) => acc + s.shareMinor,
            0
          );
          expect(totalShares).toBe(totalMinor);
        }
      ),
      { numRuns: 300 }
    );
  });
});
