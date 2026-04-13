export function ProExplainer() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <span className="text-[12px] text-text-muted tracking-[2px]">
          how pro live reporting works
        </span>
      </div>

      <div className="max-w-[540px] mx-auto space-y-6">
        <div className="border border-border-subtle p-5 space-y-3">
          <div className="text-[13px] text-text font-medium">
            the problem
          </div>
          <p className="text-[13px] text-text-secondary leading-[1.7]">
            when your song is performed live at a concert, festival, or event,
            you&apos;re owed performance royalties through your pro (performing
            rights organization). but bmi and ascap only automatically survey
            the highest-grossing tours. if you&apos;re not on that list, the
            only way to collect is to manually report each performance yourself.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border-subtle p-5 space-y-3 text-left">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span className="text-[13px] text-text font-medium">bmi live</span>
            </div>
            <ul className="space-y-2 text-[12px] text-text-secondary leading-[1.6]">
              <li className="flex gap-2">
                <span className="text-text-disabled shrink-0">—</span>
                report via ols.bmi.com
              </li>
              <li className="flex gap-2">
                <span className="text-text-disabled shrink-0">—</span>
                3-step wizard: event details, venue, setlist
              </li>
              <li className="flex gap-2">
                <span className="text-text-disabled shrink-0">—</span>
                9-month deadline from event date
              </li>
              <li className="flex gap-2">
                <span className="text-text-disabled shrink-0">—</span>
                requires venue name, address, attendance, dates
              </li>
              <li className="flex gap-2">
                <span className="text-text-disabled shrink-0">—</span>
                ~5 minutes of data entry per show
              </li>
            </ul>
          </div>

          <div className="border border-border-subtle p-5 space-y-3 text-left">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                <path d="M18 20V10" />
                <path d="M12 20V4" />
                <path d="M6 20v-6" />
              </svg>
              <span className="text-[13px] text-text font-medium">ascap onstage</span>
            </div>
            <ul className="space-y-2 text-[12px] text-text-secondary leading-[1.6]">
              <li className="flex gap-2">
                <span className="text-text-disabled shrink-0">—</span>
                report via members.ascap.com
              </li>
              <li className="flex gap-2">
                <span className="text-text-disabled shrink-0">—</span>
                onstage portal for live performances
              </li>
              <li className="flex gap-2">
                <span className="text-text-disabled shrink-0">—</span>
                similar reporting window
              </li>
              <li className="flex gap-2">
                <span className="text-text-disabled shrink-0">—</span>
                requires venue, date, songs performed
              </li>
              <li className="flex gap-2">
                <span className="text-text-disabled shrink-0">—</span>
                csv upload or manual entry
              </li>
            </ul>
          </div>
        </div>

        <div className="border border-status-confirmed/20 p-5 space-y-3 text-left">
          <div className="text-[12px] text-status-confirmed">
            where we help
          </div>
          <p className="text-[13px] text-text-secondary leading-[1.7]">
            setlist royalty tracker automates the discovery and data-gathering
            steps. instead of manually searching for concerts, copying venue
            details, and typing setlists into bmi or ascap forms — we find the
            performances, organize the data, and let you submit in seconds via
            our chrome extension that auto-fills the pro forms, or a csv export.
          </p>
        </div>
      </div>
    </section>
  );
}
