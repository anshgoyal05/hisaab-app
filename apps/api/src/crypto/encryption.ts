import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // 96 bits recommended for GCM
const TAG_LENGTH_BYTES = 16; // 128-bit authentication tag

export interface WrappedKey {
  version: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

/**
 * Generates a cryptographically secure 256-bit Data Encryption Key (DEK).
 */
export function generateUserDek(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Parses and validates a 256-bit hex master key (KEK).
 */
export function parseMasterKey(masterKeyHex: string): Buffer {
  const cleaned = masterKeyHex.trim();
  if (cleaned.length !== 64) {
    throw new Error(
      `Master key must be a 64-character hex string (32 bytes), received length ${cleaned.length}`
    );
  }
  return Buffer.from(cleaned, 'hex');
}

/**
 * Wraps (encrypts) a user DEK using the server Master Key (KEK).
 * Format: "v1:ivHex:tagHex:cipherHex"
 */
export function wrapDek(dek: Buffer, masterKeyHex: string): string {
  const masterKey = parseMasterKey(masterKeyHex);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: TAG_LENGTH_BYTES,
  });

  const ciphertext = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Unwraps (decrypts) an encrypted DEK using the server Master Key.
 */
export function unwrapDek(wrappedDekString: string, masterKeyHex: string): Buffer {
  const parts = wrappedDekString.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid wrapped DEK format. Expected v1:iv:tag:ciphertext');
  }

  const masterKey = parseMasterKey(masterKeyHex);
  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const ciphertext = Buffer.from(parts[3], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: TAG_LENGTH_BYTES,
  });
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Encrypts a sensitive string (note, friend name, phone) using the user's DEK.
 * Format: "v1:ivHex:tagHex:cipherHex"
 */
export function encryptField(plaintext: string, dek: Buffer): string {
  if (dek.length !== 32) {
    throw new Error('DEK must be exactly 32 bytes for AES-256');
  }

  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv, {
    authTagLength: TAG_LENGTH_BYTES,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypts an encrypted field string using the user's DEK.
 * Throws an error if ciphertext or tag has been tampered with.
 */
export function decryptField(encryptedString: string, dek: Buffer): string {
  if (dek.length !== 32) {
    throw new Error('DEK must be exactly 32 bytes for AES-256');
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid encrypted field format. Expected v1:iv:tag:ciphertext');
  }

  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const ciphertext = Buffer.from(parts[3], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv, {
    authTagLength: TAG_LENGTH_BYTES,
  });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Rotates a user's wrapped DEK from an old master key to a new master key.
 * This operation re-wraps the DEK without requiring re-encryption of all individual records.
 */
export function rotateMasterKeyOnDek(
  wrappedDekString: string,
  oldMasterKeyHex: string,
  newMasterKeyHex: string
): string {
  const unwrappedDek = unwrapDek(wrappedDekString, oldMasterKeyHex);
  return wrapDek(unwrappedDek, newMasterKeyHex);
}
