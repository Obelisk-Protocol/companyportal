import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'hr' | 'employee' | 'accountant';
  employeeId?: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate an access token (short-lived)
 */
export async function generateAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Generate a refresh token (long-lived)
 */
export async function generateRefreshToken(): Promise<{ token: string; expiresAt: Date }> {
  const token = nanoid(64);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  return { token, expiresAt };
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Generate an invitation token
 */
export function generateInvitationToken(): string {
  return nanoid(32);
}

/**
 * Get expiry date for invitation (7 days from now)
 */
export function getInvitationExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
}
