export function TrustBadges() {
  return (
    <section className="space-y-4">
      <div className="text-center">
        <span className="text-[11px] text-text-muted tracking-[2px]">
          built on industry infrastructure
        </span>
      </div>

      <div className="flex items-center justify-center gap-8 flex-wrap">
        <a
          href="https://www.setlist.fm"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-2 opacity-40 hover:opacity-70 transition-opacity"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <span className="text-[10px] text-text-muted">setlist.fm</span>
        </a>

        <a
          href="https://musicbrainz.org"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-2 opacity-40 hover:opacity-70 transition-opacity"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
          <span className="text-[10px] text-text-muted">musicbrainz</span>
        </a>

        <div className="flex flex-col items-center gap-2 opacity-40">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span className="text-[10px] text-text-muted">bmi live</span>
        </div>

        <div className="flex flex-col items-center gap-2 opacity-40">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <span className="text-[10px] text-text-muted">ascap onstage</span>
        </div>
      </div>

      <p className="text-[10px] text-text-disabled text-center">
        not affiliated with or endorsed by any pro · we automate your existing workflow
      </p>
    </section>
  );
}
