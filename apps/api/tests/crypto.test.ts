import { describe, expect, it } from 'vitest';
import {
  decryptField,
  encryptField,
  generateUserDek,
  rotateMasterKeyOnDek,
  unwrapDek,
  wrapDek,
} from '../src/crypto/encryption.js';

describe('Envelope Encryption (AES-256-GCM)', () => {
  const masterKey1 =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const masterKey2 =
    'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

  it('generates a 32-byte DEK and wraps/unwraps it with master key', () => {
    const dek = generateUserDek();
    expect(dek.length).toBe(32);

    const wrapped = wrapDek(dek, masterKey1);
    expect(wrapped.startsWith('v1:')).toBe(true);

    const unwrapped = unwrapDek(wrapped, masterKey1);
    expect(unwrapped.equals(dek)).toBe(true);
  });

  it('fails to unwrap DEK when master key is incorrect or tampered with', () => {
    const dek = generateUserDek();
    const wrapped = wrapDek(dek, masterKey1);

    expect(() => unwrapDek(wrapped, masterKey2)).toThrow();
  });

  it('encrypts and decrypts sensitive string fields with DEK', () => {
    const dek = generateUserDek();
    const note = 'Dinner at Canteen with Rahul and Amit, paid via UPI';

    const encrypted = encryptField(note, dek);
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted).not.toContain(note);

    const decrypted = decryptField(encrypted, dek);
    expect(decrypted).toBe(note);
  });

  it('supports Hindi Devanagari text in encryption/decryption without corruption', () => {
    const dek = generateUserDek();
    const hindiNote = 'कैंपस कैंटीन में समोसा और चाय का खर्च राहुल के साथ';

    const encrypted = encryptField(hindiNote, dek);
    const decrypted = decryptField(encrypted, dek);
    expect(decrypted).toBe(hindiNote);
  });

  it('detects tampering and throws error on altered ciphertext or tag', () => {
    const dek = generateUserDek();
    const encrypted = encryptField('Confidential friend phone number', dek);

    const parts = encrypted.split(':');
    // Tamper with ciphertext by flipping last character
    const tamperedCipher =
      parts[3].slice(0, -1) + (parts[3].slice(-1) === 'a' ? 'b' : 'a');
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedCipher}`;

    expect(() => decryptField(tampered, dek)).toThrow();
  });

  it('rotates master key on wrapped DEK without decrypting individual field data', () => {
    const dek = generateUserDek();
    const originalWrapped = wrapDek(dek, masterKey1);

    // Rotate from masterKey1 to masterKey2
    const rotatedWrapped = rotateMasterKeyOnDek(
      originalWrapped,
      masterKey1,
      masterKey2
    );

    // Old key fails
    expect(() => unwrapDek(rotatedWrapped, masterKey1)).toThrow();

    // New key succeeds and retrieves identical DEK
    const unwrappedWithNewKey = unwrapDek(rotatedWrapped, masterKey2);
    expect(unwrappedWithNewKey.equals(dek)).toBe(true);
  });
});
