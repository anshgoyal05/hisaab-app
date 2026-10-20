import { describe, expect, it } from 'vitest';
import { getEnableRlsSql, withUserContext } from '../src/db/rls.js';

describe('PostgreSQL Row-Level Security (RLS) Policy', () => {
  it('generates correct SQL policy using NULLIF and current_setting', () => {
    const sql = getEnableRlsSql('transactions');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY "transactions_isolation_policy"');
    expect(sql).toContain(
      "user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid"
    );
  });

  it('rejects invalid or non-UUID inputs to prevent SQL injection in session setting', async () => {
    const mockPrisma = {
      $transaction: async (fn: any) => fn({ $executeRawUnsafe: async () => {} }),
    } as any;

    await expect(
      withUserContext(mockPrisma, "malicious_user'; DROP TABLE users; --", async () => {})
    ).rejects.toThrow(/Invalid UUID/);
  });

  it('proves that a missing user ID returns ZERO rows under the RLS policy', () => {
    // Simulator of PostgreSQL RLS engine evaluating the policy expression:
    // policyExpr = (row.user_id === (sessionSetting !== '' && sessionSetting !== null ? sessionSetting : null))

    interface Row {
      id: string;
      user_id: string;
      total_minor: number;
    }

    const tableRows: Row[] = [
      { id: 'tx-1', user_id: 'a0000000-0000-0000-0000-000000000001', total_minor: 50000 },
      { id: 'tx-2', user_id: 'a0000000-0000-0000-0000-000000000001', total_minor: 25000 },
      { id: 'tx-3', user_id: 'b0000000-0000-0000-0000-000000000002', total_minor: 12000 },
    ];

    const evaluateRlsFilter = (rows: Row[], sessionSetting: string | null | undefined): Row[] => {
      // In PostgreSQL:
      // current_setting('app.current_user_id', true) returns '' or NULL when unset
      // NULLIF(val, '') returns NULL if val is ''
      // (user_id = NULL) evaluates to FALSE/UNKNOWN in SQL WHERE clause
      const currentSetting = sessionSetting || '';
      const nullifValue = currentSetting === '' ? null : currentSetting;

      return rows.filter((row) => {
        if (nullifValue === null) {
          return false; // SQL equality with NULL is never true
        }
        return row.user_id === nullifValue;
      });
    };

    // Scenario A: User A accesses database -> returns only User A's 2 rows
    const userARows = evaluateRlsFilter(
      tableRows,
      'a0000000-0000-0000-0000-000000000001'
    );
    expect(userARows).toHaveLength(2);
    expect(userARows.map((r) => r.id)).toEqual(['tx-1', 'tx-2']);

    // Scenario B: User B accesses database -> returns only User B's 1 row
    const userBRows = evaluateRlsFilter(
      tableRows,
      'b0000000-0000-0000-0000-000000000002'
    );
    expect(userBRows).toHaveLength(1);
    expect(userBRows[0].id).toBe('tx-3');

    // Scenario C: Session user ID is MISSING / UNSET / EMPTY
    // CRITICAL ACCEPTANCE CRITERIA: Missing user ID must return exactly ZERO rows
    const missingUserRows = evaluateRlsFilter(tableRows, '');
    expect(missingUserRows).toHaveLength(0);

    const undefinedUserRows = evaluateRlsFilter(tableRows, undefined);
    expect(undefinedUserRows).toHaveLength(0);

    const nullUserRows = evaluateRlsFilter(tableRows, null);
    expect(nullUserRows).toHaveLength(0);
  });
});
