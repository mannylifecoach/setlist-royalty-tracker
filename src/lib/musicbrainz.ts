import {
  MUSICBRAINZ_BASE_URL,
  MUSICBRAINZ_RATE_LIMIT_MS,
  MUSICBRAINZ_USER_AGENT,
} from './constants';

export interface MusicBrainzSongResult {
  recordingMbid: string;
  workMbid: string | null;
  iswc: string | null;
  title: string;
  artistName: string;
}

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MUSICBRAINZ_RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MUSICBRAINZ_RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: {
      'User-Agent': MUSICBRAINZ_USER_AGENT,
      Accept: 'application/json',
    },
  });
}

function escapeLuceneQuery(str: string): string {
  // MusicBrainz uses Lucene query syntax — escape special chars
  return str.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, '\\$&');
}

/**
 * Search MusicBrainz for a recording matching title + artist.
 * Returns the top match with its Recording MBID.
 */
export async function searchRecording(
  title: string,
  artistName: string
): Promise<{ recordingMbid: string; title: string; artistName: string } | null> {
  const titleQ = escapeLuceneQuery(title);
  const artistQ = escapeLuceneQuery(artistName);
  const query = `recording:"${titleQ}" AND artist:"${artistQ}"`;
  const url = `${MUSICBRAINZ_BASE_URL}/recording?query=${encodeURIComponent(
    query
  )}&fmt=json&limit=5`;

  try {
    const res = await rateLimitedFetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const recordings = data?.recordings;
    if (!recordings || recordings.length === 0) return null;

    const top = recordings[0];
    return {
      recordingMbid: top.id,
      title: top.title,
      artistName: top['artist-credit']?.[0]?.name || artistName,
    };
  } catch {
    return null;
  }
}

/**
 * Look up a Recording by MBID and return its associated Work MBID + ISWC.
 * Returns null if no Work is linked.
 */
export async function getRecordingWork(
  recordingMbid: string
): Promise<{ workMbid: string; iswc: string | null } | null> {
  const url = `${MUSICBRAINZ_BASE_URL}/recording/${recordingMbid}?inc=work-rels&fmt=json`;

  try {
    const res = await rateLimitedFetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const relations = data?.relations || [];
    const workRel = relations.find(
      (r: { type: string; work?: { id: string; iswcs?: string[] } }) =>
        r.type === 'performance' && r.work
    );

    if (!workRel?.work) return null;

    return {
      workMbid: workRel.work.id,
      iswc: workRel.work.iswcs?.[0] || null,
    };
  } catch {
    return null;
  }
}

/**
 * Look up a Work directly by MBID to get its ISWC and metadata.
 */
export async function getWork(
  workMbid: string
): Promise<{ workMbid: string; iswc: string | null; title: string } | null> {
  const url = `${MUSICBRAINZ_BASE_URL}/work/${workMbid}?fmt=json`;

  try {
    const res = await rateLimitedFetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    return {
      workMbid: data.id,
      iswc: data.iswcs?.[0] || null,
      title: data.title,
    };
  } catch {
    return null;
  }
}

/**
 * Full song lookup: search for the recording, then resolve its work.
 * Returns Recording MBID + Work MBID + ISWC in one call.
 */
export async function lookupSongMetadata(
  title: string,
  artistName: string
): Promise<MusicBrainzSongResult | null> {
  const recording = await searchRecording(title, artistName);
  if (!recording) return null;

  const work = await getRecordingWork(recording.recordingMbid);

  return {
    recordingMbid: recording.recordingMbid,
    workMbid: work?.workMbid || null,
    iswc: work?.iswc || null,
    title: recording.title,
    artistName: recording.artistName,
  };
}
