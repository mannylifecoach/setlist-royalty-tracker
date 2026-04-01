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
    <div className="space-y-6 max-w-[700px] mx-auto">
      <div>
        <h1 className="text-[18px] font-light tracking-[-0.3px]">submit</h1>
        <p className="text-[12px] text-text-muted mt-1">
          use the chrome extension to auto-fill bmi live forms directly, or
          download a csv. only confirmed performances are shown.
        </p>
        <div className="card p-3 mt-3 space-y-3">
          <p className="text-[11px] text-text-secondary">
            <span className="text-status-confirmed">recommended:</span> use the{' '}
            <a href="/settings" className="text-status-discovered hover:underline">
              chrome extension
            </a>{' '}
            to auto-fill bmi live forms directly — no csv needed. generate an
            api key in settings to get started.
          </p>
          <div className="flex items-center gap-3 pt-1 border-t border-border-subtle">
            <a
              href="/bmi-mock.html"
              target="_blank"
              className="btn text-[11px] px-3 py-1.5"
            >
              try demo: bmi live auto-fill
            </a>
            <span className="text-[10px] text-text-muted">
              opens a mock bmi form — use with the chrome extension to test auto-fill
            </span>
          </div>
        </div>
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
