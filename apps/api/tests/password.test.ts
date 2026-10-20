import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  isPasswordBreached,
  verifyPassword,
} from '../src/crypto/password.js';

describe('Password Management (Argon2id & Breach Check)', () => {
  it('hashes passwords with Argon2id and verifies correct credentials', async () => {
    const password = 'StrongPassword!2026';
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^\$argon2id\$/);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword('WrongPassword!2026', hash);
    expect(isWrong).toBe(false);
  });

  it('detects common breached or trivial passwords offline', () => {
    expect(isPasswordBreached('password')).toBe(true);
    expect(isPasswordBreached('123456')).toBe(true);
    expect(isPasswordBreached('college123')).toBe(true);
    expect(isPasswordBreached('admin')).toBe(true);

    // Strong custom password is NOT flagged
    expect(isPasswordBreached('c4mpus_P4per_H1saab_Secure!')).toBe(false);
  });
});
