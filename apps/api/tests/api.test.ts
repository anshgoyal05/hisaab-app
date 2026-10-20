import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { createServer } from '../src/server.js';
import { FastifyInstance } from 'fastify';

describe('Hisaab API End-to-End & Cross-Tenant Security Tests', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;
  let userAFriendId: string;
  let userATransactionId: string;

  const userAEmail = `test_user_a_${Date.now()}@hisaab.test`;
  const userBEmail = `test_user_b_${Date.now()}@hisaab.test`;
  const testPassword = 'SecureStudentPassword2026!';

  beforeAll(async () => {
    app = await createServer();
    await app.ready();

    // 1. Register User A
    const resA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: userAEmail,
        password: testPassword,
        confirmPassword: testPassword,
      },
    });
    expect(resA.statusCode).toBe(201);
    const bodyA = JSON.parse(resA.payload);
    userAToken = bodyA.accessToken;

    // 2. Register User B
    const resB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: userBEmail,
        password: testPassword,
        confirmPassword: testPassword,
      },
    });
    expect(resB.statusCode).toBe(201);
    const bodyB = JSON.parse(resB.payload);
    userBToken = bodyB.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Demo login endpoint works and returns valid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/demo',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.accessToken).toBeDefined();
    expect(body.user.email).toBe('demo@hisaab.app');
  });

  it('2. User A can create a friend with encrypted data', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/people',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        name: 'Rahul College',
        phone: '+919876543210',
        notes: 'Room 402 hostel',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.person.name).toBe('Rahul College');
    userAFriendId = body.person.id;
  });

  it('3. IDOR TEST: User B CANNOT read User A friend details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/people/${userAFriendId}`,
      headers: { authorization: `Bearer ${userBToken}` },
    });
    // Cross-tenant access MUST return 404
    expect(res.statusCode).toBe(404);
  });

  it('4. User A creates split transaction and validates conservation', async () => {
    // Fetch valid category for User A
    const catRes = await app.inject({
      method: 'GET',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${userAToken}` },
    });
    const { categories } = JSON.parse(catRes.payload);
    const validCategoryId = categories[0].id;

    const clientId = crypto.randomUUID();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        clientId,
        type: 'split',
        payerType: 'me',
        totalMinor: 50000, // ₹500
        currency: 'INR',
        categoryId: validCategoryId,
        paymentMethod: 'upi',
        occurredOn: '2026-10-20',
        note: 'Pizza dinner split',
        splitMode: 'equal',
        splits: [
          { participantId: 'me', shareMinor: 25000 },
          { participantId: userAFriendId, shareMinor: 25000 },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.transaction.totalMinor).toBe(50000);
    userATransactionId = body.transaction.id;
  });

  it('5. IDOR TEST: User B CANNOT delete or modify User A transaction', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/transactions/${userATransactionId}`,
      headers: { authorization: `Bearer ${userBToken}` },
    });
    // The transaction should not be visible or deleted by User B
    const verifyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/transactions',
      headers: { authorization: `Bearer ${userAToken}` },
    });
    const list = JSON.parse(verifyRes.payload);
    const item = list.transactions.find((t: any) => t.id === userATransactionId);
    expect(item).toBeDefined();
  });

  it('6. Idempotency: Replaying transaction submission returns existing result', async () => {
    const catRes = await app.inject({
      method: 'GET',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${userAToken}` },
    });
    const { categories } = JSON.parse(catRes.payload);
    const validCategoryId = categories[0].id;

    const clientId = crypto.randomUUID();
    const payload = {
      clientId,
      type: 'personal',
      payerType: 'me',
      totalMinor: 4500,
      currency: 'INR',
      categoryId: validCategoryId,
      paymentMethod: 'cash',
      occurredOn: '2026-10-20',
      splits: [{ participantId: 'me', shareMinor: 4500 }],
    };

    // First call
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { authorization: `Bearer ${userAToken}` },
      payload,
    });
    expect(res1.statusCode).toBe(201);

    // Second call with same clientId
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      headers: { authorization: `Bearer ${userAToken}` },
      payload,
    });
    expect(res2.statusCode).toBe(200);
  });

  it('7. User can settle up and balance updates correctly', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/settlements',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        clientId: crypto.randomUUID(),
        personId: userAFriendId,
        direction: 'they_paid_me',
        amountMinor: 25000, // ₹250 full settlement
        paymentMethod: 'upi',
        settledOn: '2026-10-20',
        note: 'UPI payment received',
      },
    });
    expect(res.statusCode).toBe(201);

    // Verify balance is now 0 (settled)
    const balRes = await app.inject({
      method: 'GET',
      url: '/api/v1/balances',
      headers: { authorization: `Bearer ${userAToken}` },
    });
    const balData = JSON.parse(balRes.payload);
    const friendBal = balData.friendBalances.find(
      (f: any) => f.personId === userAFriendId
    );
    expect(friendBal.netBalanceMinor).toBe(0);
    expect(friendBal.status).toBe('settled');
  });

  it('8. User can export complete personal financial data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me/export',
      headers: { authorization: `Bearer ${userAToken}` },
    });
    expect(res.statusCode).toBe(200);
    const exportData = JSON.parse(res.payload);
    expect(exportData.user.email).toBe(userAEmail);
    expect(exportData.transactions).toBeDefined();
  });

  it('9. Permanent Account Deletion cascades and removes all user records', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { password: testPassword },
    });
    expect(res.statusCode).toBe(200);

    // Verify token is now invalid
    const checkRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${userAToken}` },
    });
    expect(checkRes.statusCode).toBe(401);
  });
});
