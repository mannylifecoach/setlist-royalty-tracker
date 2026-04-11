import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withHandler } from '@/lib/api-utils';
import { seratoImportSchema } from '@/lib/schemas';
import { parseSeratoCsv } from '@/lib/serato-import';
import { importSeratoTracks } from '@/lib/serato-import-orchestrator';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB — plenty for a DJ set history

export const POST = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'expected multipart/form-data body' },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `file too large — max ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  const fields = {
    venueName: formData.get('venueName')?.toString() || '',
    venueCity: formData.get('venueCity')?.toString() || '',
    venueState: formData.get('venueState')?.toString() || null,
    venueCountry: formData.get('venueCountry')?.toString() || null,
    eventDate: formData.get('eventDate')?.toString() || '',
  };

  const parsed = seratoImportSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation error', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parseResult = parseSeratoCsv(buffer);

  if (parseResult.tracks.length === 0) {
    return NextResponse.json(
      {
        error: 'no tracks found in file',
        warnings: parseResult.warnings,
      },
      { status: 400 }
    );
  }

  const result = await importSeratoTracks(
    session.user.id,
    parseResult.tracks,
    {
      name: parsed.data.venueName,
      city: parsed.data.venueCity,
      state: parsed.data.venueState ?? null,
      country: parsed.data.venueCountry ?? null,
      eventDate: parsed.data.eventDate,
    }
  );

  return NextResponse.json({
    ...result,
    warnings: parseResult.warnings,
  });
});
