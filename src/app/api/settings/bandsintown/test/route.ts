import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withHandler, parseBody } from '@/lib/api-utils';
import { bandsintownTestSchema } from '@/lib/schemas';
import { fetchArtist } from '@/lib/bandsintown';

// POST /api/settings/bandsintown/test — verifies a Bandsintown API key + artist
// slug combo before the user saves it. Pure verify call: no persistence, no
// rate-limit log; just round-trips to Bandsintown and reports what came back.

export const POST = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = await parseBody(request, bandsintownTestSchema);
  if ('error' in parsed) return parsed.error;
  const { apiKey, artistSlug } = parsed.data;

  const result = await fetchArtist(apiKey, artistSlug);
  if (!result.ok) {
    // Don't leak the key in any error — fetchArtist already wraps the URL/body
    // before bubbling, but be defensive about the message we emit.
    return NextResponse.json(
      {
        ok: false,
        status: result.status,
        error:
          result.status === 401 || result.status === 403
            ? 'invalid api key, or key not authorized for this artist'
            : result.status === 404
              ? 'artist not found — check the slug'
              : result.status === 0
                ? 'could not reach bandsintown — try again in a minute'
                : 'bandsintown rejected the request',
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    ok: true,
    artistName: result.data.name,
    artistId: result.data.id,
    url: result.data.url,
  });
});
