'use client';

import { useEffect, useState } from 'react';
import { ExportWizard } from '@/components/export-wizard';

export default function ExportPage() {
  const [data, setData] = useState<
    Array<{
      performance: {
        id: string;
        eventDate: string;
        venueName: string | null;
        venueCity: string | null;
        venueState: string | null;
        venueCountry: string | null;
        venueAddress: string | null;
        venuePhone: string | null;
        attendance: number | null;
        status: 'discovered' | 'confirmed' | 'submitted' | 'expired' | 'ineligible';
      };
      song: {
        id: string;
        title: string;
        bmiWorkId: string | null;
        ascapWorkId: string | null;
      };
      artist: { id: string; artistName: string };
    }>
  >([]);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/performances?status=confirmed');
      if (res.ok) setData(await res.json());
    }
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-[700px]">
      <div>
        <h1 className="text-[18px] font-light tracking-[-0.3px]">export</h1>
        <p className="text-[12px] text-text-muted mt-1">
          download a csv formatted for your pro. only confirmed performances are
          shown.
        </p>
      </div>

      {data.length > 0 ? (
        <ExportWizard data={data} />
      ) : (
        <div className="text-center py-12 text-text-muted text-[13px]">
          no confirmed performances to export — confirm performances first
        </div>
      )}
    </div>
  );
}
