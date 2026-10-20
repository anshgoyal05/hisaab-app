import {
  OverallBalances,
  PersonBalance,
  SettlementForLedger,
  TransactionForLedger,
} from './types.js';

/**
 * Calculates net balances for each person from ledger transactions and settlements.
 *
 * Balance convention relative to current user ('me'):
 * - netBalance > 0: Person owes me (Receivable - Green)
 * - netBalance < 0: I owe person (Payable - Coral)
 * - netBalance === 0: Settled (Muted)
 */
export function calculateNetBalances(
  transactions: TransactionForLedger[],
  settlements: SettlementForLedger[],
  currentUserId: string = 'me'
): Map<string, PersonBalance> {
  const balanceMap = new Map<
    string,
    { theyOweMe: number; iOweThem: number }
  >();

  const getOrCreate = (personId: string) => {
    if (!balanceMap.has(personId)) {
      balanceMap.set(personId, { theyOweMe: 0, iOweThem: 0 });
    }
    return balanceMap.get(personId)!;
  };

  // 1. Process transactions
  for (const tx of transactions) {
    if (tx.deletedAt) continue;

    const payer = tx.payerId;

    if (payer === currentUserId) {
      // Current user paid: anyone who is NOT current user owes current user their share
      for (const split of tx.splits) {
        if (split.participantId !== currentUserId) {
          const entry = getOrCreate(split.participantId);
          entry.theyOweMe += split.shareMinor;
        }
      }
    } else {
      // Someone else paid: find current user's share. If current user was a participant, current user owes payer
      for (const split of tx.splits) {
        if (split.participantId === currentUserId) {
          const entry = getOrCreate(payer);
          entry.iOweThem += split.shareMinor;
        }
      }
    }
  }

  // 2. Process settlements
  for (const s of settlements) {
    if (s.deletedAt) continue;

    if (s.toPersonId === currentUserId && s.fromPersonId !== currentUserId) {
      // Friend paid me: reduces what they owe me
      const entry = getOrCreate(s.fromPersonId);
      entry.theyOweMe -= s.amountMinor;
    } else if (
      s.fromPersonId === currentUserId &&
      s.toPersonId !== currentUserId
    ) {
      // I paid friend: reduces what I owe them
      const entry = getOrCreate(s.toPersonId);
      entry.iOweThem -= s.amountMinor;
    }
  }

  // 3. Compile final balances
  const results = new Map<string, PersonBalance>();

  for (const [personId, entry] of balanceMap.entries()) {
    const net = entry.theyOweMe - entry.iOweThem;
    let status: 'owes_me' | 'i_owe' | 'settled' = 'settled';

    if (net > 0) {
      status = 'owes_me';
    } else if (net < 0) {
      status = 'i_owe';
    }

    results.set(personId, {
      personId,
      netBalanceMinor: net,
      theyOweMeMinor: Math.max(0, net),
      iOweThemMinor: Math.max(0, -net),
      status,
    });
  }

  return results;
}

/**
 * Computes overall totals across all friends for the Home dashboard.
 */
export function calculateOverallBalances(
  balances: Map<string, PersonBalance>
): OverallBalances {
  let peopleOweYouMinor = 0;
  let youOweMinor = 0;

  for (const b of balances.values()) {
    if (b.netBalanceMinor > 0) {
      peopleOweYouMinor += b.netBalanceMinor;
    } else if (b.netBalanceMinor < 0) {
      youOweMinor += Math.abs(b.netBalanceMinor);
    }
  }

  return {
    peopleOweYouMinor,
    youOweMinor,
    netTotalMinor: peopleOweYouMinor - youOweMinor,
  };
}

/**
 * Pairwise full matrix ledger balance calculator used in property-based testing
 * to prove that across any arbitrary group and set of transactions/settlements,
 * the sum of all net balances across all participants is identically zero.
 */
export function calculateGroupNetMatrix(
  participantIds: string[],
  transactions: TransactionForLedger[],
  settlements: SettlementForLedger[]
): Map<string, number> {
  const netByPerson = new Map<string, number>();
  for (const id of participantIds) {
    netByPerson.set(id, 0);
  }

  // Transactions: Payer is credited (+total), participants are debited (-share)
  for (const tx of transactions) {
    if (tx.deletedAt) continue;

    const currentPayerCredit = netByPerson.get(tx.payerId) ?? 0;
    netByPerson.set(tx.payerId, currentPayerCredit + tx.totalMinor);

    for (const split of tx.splits) {
      const currentParticipantDebit =
        netByPerson.get(split.participantId) ?? 0;
      netByPerson.set(
        split.participantId,
        currentParticipantDebit - split.shareMinor
      );
    }
  }

  // Settlements: Payer (from) is credited (+amount), Payee (to) is debited (-amount)
  for (const s of settlements) {
    if (s.deletedAt) continue;

    const fromCredit = netByPerson.get(s.fromPersonId) ?? 0;
    netByPerson.set(s.fromPersonId, fromCredit + s.amountMinor);

    const toDebit = netByPerson.get(s.toPersonId) ?? 0;
    netByPerson.set(s.toPersonId, toDebit - s.amountMinor);
  }

  return netByPerson;
}
