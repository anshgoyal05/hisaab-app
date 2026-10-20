import argon2 from 'argon2';

// Embedded set of common/breached passwords (offline, zero external requests)
const COMMON_BREACHED_PASSWORDS = new Set([
  '123456',
  'password',
  '123456789',
  '12345678',
  '12345',
  '111111',
  '1234567',
  'sunshine',
  'qwerty',
  'iloveyou',
  'princess',
  'admin',
  'welcome',
  'monkey',
  'football',
  'login',
  'pass123',
  'hisaab123',
  'college123',
  'student123',
  'campus123',
]);

/**
 * Hashes a plaintext password using Argon2id with OWASP-recommended parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3, // 3 iterations
    parallelism: 1,
  });
}

/**
 * Verifies a password against an Argon2id hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Performs an offline check to see if a password is a known breached/trivial password.
 * Zero external network requests are made, protecting user privacy.
 */
export function isPasswordBreached(password: string): boolean {
  const normalized = password.toLowerCase().trim();
  return COMMON_BREACHED_PASSWORDS.has(normalized);
}
