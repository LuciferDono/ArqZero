import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-in-production');

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
  // 6-digit code
  return String(Math.floor(100000 + Math.random() * 900000));
}
