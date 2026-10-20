import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RLS_TABLES = [
  'transactions',
  'people',
  'settlements',
  'budgets',
  'audit_log',
  'user_settings',
];

async function main() {
  console.log('Enabling Row-Level Security (RLS) on PostgreSQL tables...');

  for (const table of RLS_TABLES) {
    console.log(`Setting RLS on table "${table}"...`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${table}_isolation_policy" ON "${table}";`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "${table}_isolation_policy" ON "${table}"
        FOR ALL
        USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
    `);
  }

  console.log('Row-Level Security (RLS) successfully configured on all user data tables!');
}

main()
  .catch((e) => {
    console.error('Error enabling RLS:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
