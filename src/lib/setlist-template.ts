import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Returns candidate song IDs for a new performance: either the IDs the caller
 * provided (when non-empty), or the user's default setlist template if
 * configured. Empty array means "no input, no template" — the caller decides
 * how to respond (400 for the manual entry path, skip for Bandsintown imports).
 *
 * The caller MUST still run an IDOR check on the returned IDs before writing
 * any rows — songs may have been deleted since the template was saved.
 */
export async function resolveCandidateSongIds(
  userId: string,
  provided: string[] | undefined
): Promise<string[]> {
  if (provided && provided.length > 0) return provided;

  const [user] = await db
    .select({ defaultSetlistSongIds: users.defaultSetlistSongIds })
    .from(users)
    .where(eq(users.id, userId));
  return user?.defaultSetlistSongIds ?? [];
}
