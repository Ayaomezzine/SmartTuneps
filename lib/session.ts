import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'smart_tuneps_session';

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? 'smart-tuneps-dev-secret');
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime('14d')
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  const result = await jwtVerify(token, getSecret());
  return {
    userId: result.payload.sub ?? '',
    email: String(result.payload.email ?? ''),
    role: String(result.payload.role ?? 'USER') as SessionPayload['role']
  } satisfies SessionPayload;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 14
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
}

function readCookieValue(request: { cookies?: { get(name: string): { value: string } | undefined }; headers?: { get(name: string): string | null } }) {
  const cookieFromStore = request.cookies?.get(SESSION_COOKIE)?.value;
  if (cookieFromStore) {
    return cookieFromStore;
  }

  const cookieHeader = request.headers?.get('cookie') ?? null;
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((item) => item.trim());
  const match = cookies.find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null;
}

export async function getSessionFromRequest(request: { cookies?: { get(name: string): { value: string } | undefined }; headers?: { get(name: string): string | null } }) {
  const token = readCookieValue(request);
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function getSessionFromCookieStore(cookieStore: { get(name: string): { value: string } | undefined }) {
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}