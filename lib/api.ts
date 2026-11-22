import type { ApiEnvelope } from './types';

/** Every JSON API response uses the ApiEnvelope shape. */
export function ok<T>(data: T, init?: ResponseInit): Response {
  const body: ApiEnvelope<T> = { success: true, data, error: null };
  return Response.json(body, { ...init, headers: { 'Cache-Control': 'no-store', ...init?.headers } });
}

export function fail(error: string, status: number): Response {
  const body: ApiEnvelope<never> = { success: false, data: null, error };
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
