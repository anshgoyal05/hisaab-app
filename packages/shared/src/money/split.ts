import {
  Participant,
  SplitMode,
  SplitResult,
  SplitResultItem,
} from './types.js';

/**
 * Calculates exact splits for a transaction, distributing remainders deterministically
 * so that the sum of splits is ALWAYS equal to totalMinor (zero paise drift).
 *
 * Remainder rules:
 * - Equal: If payer is in participants, payer gets first remainder paise, then stable ID sort.
 *          If payer is NOT in participants, sorted deterministically by ID ascending.
 * - Percentage: Basis points (10000 = 100%). Remainder distributed by largest fractional part,
 *               tie-broken deterministically.
 * - Exact: Validates that exact amounts sum precisely to totalMinor.
 */
export function calculateSplits(
  totalMinor: number,
  participants: Participant[],
  mode: SplitMode = 'equal',
  payerId: string = 'me'
): SplitResult {
  if (!Number.isInteger(totalMinor) || totalMinor <= 0) {
    throw new Error(`Total amount must be a positive integer in paise, got: ${totalMinor}`);
  }

  if (!participants || participants.length === 0) {
    throw new Error('At least one participant is required to split');
  }

  const n = participants.length;

  if (mode === 'equal') {
    const baseShare = Math.floor(totalMinor / n);
    const remainder = totalMinor - baseShare * n;

    // Deterministic sort order for distributing remainder:
    // Payer gets first priority if present, then deterministic participant ID order
    const sortedIndices = participants
      .map((p, index) => ({ id: p.id, index }))
      .sort((a, b) => {
        if (a.id === payerId) return -1;
        if (b.id === payerId) return 1;
        return a.id.localeCompare(b.id);
      })
      .map((item) => item.index);

    const extraShares = new Set<number>(sortedIndices.slice(0, remainder));

    const splits: SplitResultItem[] = participants.map((p, index) => ({
      participantId: p.id,
      shareMinor: baseShare + (extraShares.has(index) ? 1 : 0),
    }));

    return {
      splits,
      totalMinor,
      remainderDistributedMinor: remainder,
    };
  }

  if (mode === 'percentage') {
    // Validate basis points: 100% = 10,000 bps
    const totalBps = participants.reduce(
      (sum, p) => sum + (p.percentageBps ?? 0),
      0
    );

    if (totalBps !== 10000) {
      throw new Error(
        `Percentage split must total exactly 100.00% (10000 bps), got: ${totalBps} bps (${totalBps / 100}%)`
      );
    }

    // Calculate base shares and fractional remainders
    const calculated = participants.map((p, index) => {
      const bps = p.percentageBps ?? 0;
      const exactShare = (totalMinor * bps) / 10000;
      const baseShare = Math.floor(exactShare);
      const fraction = exactShare - baseShare;
      return {
        id: p.id,
        index,
        bps,
        baseShare,
        fraction,
      };
    });

    const sumBase = calculated.reduce((acc, c) => acc + c.baseShare, 0);
    const remainder = totalMinor - sumBase;

    // Sort by largest fractional remainder first, then payer priority, then ID
    const sortedIndices = [...calculated]
      .sort((a, b) => {
        if (Math.abs(b.fraction - a.fraction) > 1e-9) {
          return b.fraction - a.fraction;
        }
        if (a.id === payerId) return -1;
        if (b.id === payerId) return 1;
        return a.id.localeCompare(b.id);
      })
      .map((item) => item.index);

    const extraShares = new Set<number>(sortedIndices.slice(0, remainder));

    const splits: SplitResultItem[] = participants.map((p, index) => {
      const c = calculated[index];
      return {
        participantId: p.id,
        shareMinor: c.baseShare + (extraShares.has(index) ? 1 : 0),
        percentageBps: p.percentageBps,
      };
    });

    return {
      splits,
      totalMinor,
      remainderDistributedMinor: remainder,
    };
  }

  if (mode === 'exact') {
    let sumExact = 0;
    const splits: SplitResultItem[] = [];

    for (const p of participants) {
      if (
        p.exactAmountMinor === undefined ||
        !Number.isInteger(p.exactAmountMinor) ||
        p.exactAmountMinor < 0
      ) {
        throw new Error(
          `Invalid exact amount for participant ${p.id}: must be non-negative integer paise`
        );
      }
      sumExact += p.exactAmountMinor;
      splits.push({
        participantId: p.id,
        shareMinor: p.exactAmountMinor,
      });
    }

    if (sumExact !== totalMinor) {
      throw new Error(
        `Exact split amounts sum (${sumExact} paise) does not match total transaction amount (${totalMinor} paise)`
      );
    }

    return {
      splits,
      totalMinor,
      remainderDistributedMinor: 0,
    };
  }

  throw new Error(`Unsupported split mode: ${mode}`);
}

/**
 * Validates that an array of split items sums exactly to totalMinor.
 */
export function validateSplitConservation(
  totalMinor: number,
  splits: SplitResultItem[]
): boolean {
  const sum = splits.reduce((acc, item) => acc + item.shareMinor, 0);
  return sum === totalMinor;
}
