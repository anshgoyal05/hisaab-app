import { PrismaClient } from '@prisma/client';

/**
 * Returns the PostgreSQL SQL statements to enable Row-Level Security (RLS) on a table.
 */
export function getEnableRlsSql(tableName: string, userColumn = 'user_id'): string {
  return `
    ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "${tableName}_isolation_policy" ON "${tableName}";
    CREATE POLICY "${tableName}_isolation_policy" ON "${tableName}"
      FOR ALL
      USING (${userColumn} = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
  `;
}

/**
 * Executes a callback within a database transaction scoped with the authenticated user ID.
 * Sets PostgreSQL session variable `app.current_user_id` using SET LOCAL, which automatically
 * resets when the transaction commits or aborts.
 */
export async function withUserContext<T>(
  prisma: PrismaClient,
  userId: string,
  operation: (tx: any) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Validate UUID format to prevent SQL injection in session setting
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error(`Invalid UUID provided for RLS user context: ${userId}`);
    }

    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_user_id = '${userId}';`
    );

    return operation(tx);
  });
}
