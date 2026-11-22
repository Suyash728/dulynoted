import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time check of an `Authorization: Bearer <secret>` header.
 * Both sides are hashed first so the comparison length never leaks the secret length.
 */
export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const digest = (v: string) => createHash('sha256').update(v).digest();
  return timingSafeEqual(digest(header.slice(7)), digest(secret));
}
