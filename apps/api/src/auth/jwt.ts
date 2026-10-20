import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'dev_access_jwt_secret_min32chars_hisaab_2026';
const ACCESS_EXPIRES_IN = '15m'; // Short-lived 15 minutes

export interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * Signs a short-lived access token (15 minutes).
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

/**
 * Verifies an access token.
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

/**
 * Generates a cryptographically random refresh token and its SHA-256 hash.
 */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(40).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
}

/**
 * Hashes a refresh token with SHA-256 for safe database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
