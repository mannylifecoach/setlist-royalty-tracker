'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExportWizard } from '@/components/export-wizard';
import { DataDisclaimer } from '@/components/data-disclaimer';
import { ProSubmissionWalkthrough, useProWalkthrough } from '@/components/pro-submission-walkthrough';

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
  const [hasDefaultTimes, setHasDefaultTimes] = useState(true);
  const [userPro, setUserPro] = useState<'bmi' | 'ascap'>('bmi');
  const { shouldShow, dismiss, showAgain } = useProWalkthrough();

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/performances?status=confirmed');
      if (res.ok) setData(await res.json());
    }
    async function loadSettings() {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const settings = await res.json();
        setHasDefaultTimes(!!settings.defaultStartTimeHour && !!settings.defaultEndTimeHour);
        if (settings.pro === 'bmi' || settings.pro === 'ascap') {
          setUserPro(settings.pro);
        }
      }
    }
    load();
    loadSettings();
  }, []);

  return (
    <div className="space-y-6 max-w-[700px] mx-auto">
      {shouldShow && data.length > 0 && (
        <ProSubmissionWalkthrough pro={userPro} onClose={dismiss} />
      )}

      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[22px] font-light tracking-[-0.5px]">submit</h1>
          <button
            onClick={showAgain}
            className="text-[11px] text-status-discovered hover:underline mt-2 shrink-0"
          >
            how it works →
          </button>
        </div>
        <p className="text-[13px] text-text-muted mt-2 leading-[1.5]">
          use the chrome extension to auto-fill bmi live forms directly (requires google chrome), or
          download a csv as a backup. only confirmed performances are shown.
        </p>
        <div className="card p-3 mt-3 space-y-3">
          <p className="text-[11px] text-text-secondary">
            <span className="text-status-confirmed">recommended:</span> use the{' '}
            <a href="/help/chrome-extension" className="text-status-discovered hover:underline">
              chrome extension
            </a>{' '}
            to auto-fill bmi live forms directly — no csv needed. generate an
            api key in settings to get started. <span className="text-text-disabled">requires google chrome.</span>
          </p>
        </div>
      </div>

      {!hasDefaultTimes && data.length > 0 && (
        <div className="card p-4 space-y-2 border-status-expiring/30">
          <p className="text-[12px] text-text-secondary">
            <span className="text-status-expiring font-medium">missing default times:</span>{' '}
            bmi live requires start and end times for each performance. set your defaults
            in settings to auto-fill these across all performances.
          </p>
          <Link href="/settings" className="btn text-[11px] inline-block">
            set default times in settings
          </Link>
        </div>
      )}

      <DataDisclaimer compact />

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
