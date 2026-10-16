import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { requireDisposableTarget } from '../../scripts/target-safety.mjs';

export const apiURL = process.env.API_BASE_URL ??
  'https://virtual-data-room-production.up.railway.app';

export interface Credentials { email: string; password: string }
export interface PageResponse<T> { items: T[]; nextCursor: string | null }
export interface DataRoom { id: string; name: string; createdAt: string }
export interface Folder { id: string; name: string; dataRoomId: string; parentId: string | null }

export function credentials(which: 'owner' | 'viewer'): Credentials | undefined {
  const prefix = which.toUpperCase();
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  return email && password ? { email, password } : undefined;
}

export async function login(request: APIRequestContext, user: Credentials): Promise<string> {
  const response = await request.post(`${apiURL}/auth/login`, { data: user });
  expect(response.ok(), `Login failed (${response.status()}): ${await response.text()}`).toBeTruthy();
  const body = await response.json() as { accessToken?: string };
  expect(body.accessToken).toEqual(expect.any(String));
  return body.accessToken!;
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function json<T>(response: APIResponse): Promise<T> {
  expect(response.ok(), `Unexpected response ${response.status()}: ${await response.text()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

export function requireDisposableEnvironment(): boolean {
  if (process.env.RUN_MUTATION_TESTS !== '1') return false;
  requireDisposableTarget(process.env);
  return true;
}
