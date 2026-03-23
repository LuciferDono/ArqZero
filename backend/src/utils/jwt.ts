import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes, randomInt } from 'node:crypto';

const secret = process.env.JWT_SECRET ?? (process.env.NODE_ENV === 'test' ? 'test-secret-at-least-32-characters-long' : '');
if (!secret || secret.length < 32) {
  throw new Error('JWT_SECRET env var is required (min 32 characters). Set it in your .env file.');
}
const JWT_SECRET = new TextEncoder().encode(secret);

export interface TokenPayload {
  sub: string;      // user ID
  tier: string;     // free | pro | team
  cap: number;      // daily message cap (0 = unlimited)
  email: string;
}

export async function createAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as unknown as TokenPayload;
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateVerificationCode(): string {
  return String(randomInt(100000, 1000000));
}
