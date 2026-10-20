import crypto from 'node:crypto';
import { prisma } from './client.js';
import { hashPassword } from '../crypto/password.js';
import { generateUserDek, wrapDek, encryptField } from '../crypto/encryption.js';

const MASTER_KEY =
  process.env.APP_MASTER_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

async function seed() {
  console.log('🌱 Seeding Hisaab database with campus demo data...');

  const DEMO_EMAIL = 'demo@hisaab.app';
  const DEMO_PASSWORD = 'CampusHisaab2026!';

  // Clean existing demo user if present
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (existing) {
    console.log('Cleaning up existing demo user...');
    await prisma.user.delete({ where: { id: existing.id } });
  }

  // 1. Create User
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const dek = generateUserDek();
  const dekEncrypted = wrapDek(dek, MASTER_KEY);

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash,
      dekEncrypted,
      isVerified: true,
      settings: {
        create: {
          language: 'en',
          currency: 'INR',
          theme: 'system',
          reminderTime: '21:30',
          reminderEnabled: true,
        },
      },
    },
    include: { settings: true },
  });

  console.log(`Created user: ${user.email} (ID: ${user.id})`);

  // 2. Create Categories
  const categoriesData = [
    { name: 'Food', icon: 'Utensils', color: '#145C53' },
    { name: 'Chai/Coffee', icon: 'Coffee', color: '#D97706' },
    { name: 'Transport', icon: 'Bus', color: '#2563EB' },
    { name: 'Study', icon: 'BookOpen', color: '#7C3AED' },
    { name: 'Shopping', icon: 'ShoppingBag', color: '#DB2777' },
    { name: 'Rent', icon: 'Home', color: '#059669' },
    { name: 'Entertainment', icon: 'Film', color: '#EA580C' },
    { name: 'Other', icon: 'MoreHorizontal', color: '#6B7280' },
  ];

  const categoriesMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const created = await prisma.category.create({
      data: {
        userId: user.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      },
    });
    categoriesMap.set(cat.name, created.id);
  }

  // 3. Create Friends (People)
  const friends = [
    { name: 'Rahul Sharma', phone: '+919876543210', color: '#145C53' },
    { name: 'Priya Patel', phone: '+919812345678', color: '#AA483C' },
    { name: 'Amit Verma', phone: '+919898989898', color: '#2563EB' },
  ];

  const peopleMap = new Map<string, string>();
  for (const f of friends) {
    const created = await prisma.person.create({
      data: {
        userId: user.id,
        nameEnc: encryptField(f.name, dek),
        phoneEnc: encryptField(f.phone, dek),
        notesEnc: encryptField('Hostel roommate', dek),
        avatarColor: f.color,
      },
    });
    peopleMap.set(f.name, created.id);
  }

  const rahulId = peopleMap.get('Rahul Sharma')!;
  const priyaId = peopleMap.get('Priya Patel')!;
  const amitId = peopleMap.get('Amit Verma')!;

  // 4. Create Transactions
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Tx 1: Chai & Samosa (Personal ₹45)
  await prisma.transaction.create({
    data: {
      clientId: crypto.randomUUID(),
      userId: user.id,
      type: 'personal',
      payerType: 'me',
      totalMinor: 4500n, // ₹45.00
      currency: 'INR',
      categoryId: categoriesMap.get('Chai/Coffee')!,
      paymentMethod: 'cash',
      occurredOn: today,
      noteEnc: encryptField('Evening chai at campus stall', dek),
      version: 1,
      splits: {
        create: [{ participantType: 'me', shareMinor: 4500n }],
      },
    },
  });

  // Tx 2: Metro recharge (Personal ₹200)
  await prisma.transaction.create({
    data: {
      clientId: crypto.randomUUID(),
      userId: user.id,
      type: 'personal',
      payerType: 'me',
      totalMinor: 20000n, // ₹200.00
      currency: 'INR',
      categoryId: categoriesMap.get('Transport')!,
      paymentMethod: 'upi',
      occurredOn: today,
      noteEnc: encryptField('Monthly metro card top-up', dek),
      version: 1,
      splits: {
        create: [{ participantType: 'me', shareMinor: 20000n }],
      },
    },
  });

  // Tx 3: Dinner at Dhaba split 3 ways (User paid ₹750 = ₹250 user, ₹250 Rahul, ₹250 Amit)
  await prisma.transaction.create({
    data: {
      clientId: crypto.randomUUID(),
      userId: user.id,
      type: 'split',
      payerType: 'me',
      totalMinor: 75000n, // ₹750.00
      currency: 'INR',
      categoryId: categoriesMap.get('Food')!,
      paymentMethod: 'upi',
      occurredOn: today,
      noteEnc: encryptField('Butter chicken and naan with Rahul and Amit', dek),
      splitMode: 'equal',
      version: 1,
      splits: {
        create: [
          { participantType: 'me', shareMinor: 25000n },
          { participantType: 'person', personId: rahulId, shareMinor: 25000n },
          { participantType: 'person', personId: amitId, shareMinor: 25000n },
        ],
      },
    },
  });

  // Tx 4: Engineering Mechanics book (Personal ₹650)
  await prisma.transaction.create({
    data: {
      clientId: crypto.randomUUID(),
      userId: user.id,
      type: 'personal',
      payerType: 'me',
      totalMinor: 65000n, // ₹650.00
      currency: 'INR',
      categoryId: categoriesMap.get('Study')!,
      paymentMethod: 'card',
      occurredOn: yesterday,
      noteEnc: encryptField('Semester textbook from college bookstore', dek),
      version: 1,
      splits: {
        create: [{ participantType: 'me', shareMinor: 65000n }],
      },
    },
  });

  // Tx 5: Someone paid for me: Priya paid ₹300 for movie tickets, user share is ₹120
  await prisma.transaction.create({
    data: {
      clientId: crypto.randomUUID(),
      userId: user.id,
      type: 'someone_paid_for_me',
      payerType: 'person',
      payerPersonId: priyaId,
      totalMinor: 30000n, // ₹300.00
      currency: 'INR',
      categoryId: categoriesMap.get('Entertainment')!,
      paymentMethod: 'upi',
      occurredOn: yesterday,
      noteEnc: encryptField('Weekend movie with batchmates, Priya booked seats', dek),
      version: 1,
      splits: {
        create: [
          { participantType: 'me', shareMinor: 12000n }, // User owes Priya ₹120
          { participantType: 'person', personId: priyaId, shareMinor: 18000n },
        ],
      },
    },
  });

  // 5. Create Settlement (Rahul partially settled ₹100 towards his ₹250 dinner debt)
  await prisma.settlement.create({
    data: {
      clientId: crypto.randomUUID(),
      userId: user.id,
      personId: rahulId,
      direction: 'they_paid_me',
      amountMinor: 10000n, // ₹100.00
      paymentMethod: 'upi',
      settledOn: today,
      noteEnc: encryptField('GPay from Rahul for dinner', dek),
    },
  });

  // 6. Create Budgets
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Overall monthly budget: ₹8,000
  await prisma.budget.create({
    data: {
      userId: user.id,
      month: currentMonth,
      categoryId: null,
      limitMinor: 800000n,
    },
  });

  // Food budget: ₹3,500
  await prisma.budget.create({
    data: {
      userId: user.id,
      month: currentMonth,
      categoryId: categoriesMap.get('Food')!,
      limitMinor: 350000n,
    },
  });

  // Transport budget: ₹1,000
  await prisma.budget.create({
    data: {
      userId: user.id,
      month: currentMonth,
      categoryId: categoriesMap.get('Transport')!,
      limitMinor: 100000n,
    },
  });

  console.log('✅ Demo seed data successfully populated!');
  console.log('--------------------------------------------------');
  console.log(`Demo Login: ${DEMO_EMAIL}`);
  console.log(`Demo Password: ${DEMO_PASSWORD}`);
  console.log('--------------------------------------------------');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
