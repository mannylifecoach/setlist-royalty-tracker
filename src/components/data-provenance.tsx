const stages = [
  {
    label: 'setlist.fm',
    detail: '9.6m+ crowdsourced setlists',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  {
    label: 'song matching',
    detail: 'compared against your catalog',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    label: 'your review',
    detail: 'you confirm every match',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    label: 'pro export',
    detail: 'csv or chrome extension',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: 'bmi / ascap',
    detail: 'you submit directly to your pro',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export function DataProvenance() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <span className="text-[11px] text-text-muted tracking-[2px]">
          your data, your control
        </span>
      </div>

      {/* Desktop: horizontal pipeline */}
      <div className="hidden md:flex items-center justify-center max-w-[800px] mx-auto">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center">
            <div className="flex flex-col items-center text-center px-3">
              <div className="w-12 h-12 border border-border flex items-center justify-center text-text-muted mb-2">
                {stage.icon}
              </div>
              <div className="text-[11px] text-text-secondary mb-1">
                {stage.label}
              </div>
              <div className="text-[10px] text-text-muted max-w-[110px]">
                {stage.detail}
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex items-center -mx-1 mb-8">
                <svg width="20" height="12" viewBox="0 0 20 12" className="text-text-disabled">
                  <line x1="0" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1" />
                  <polyline points="12,2 16,6 12,10" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical pipeline */}
      <div className="md:hidden max-w-[300px] mx-auto">
        {stages.map((stage, i) => (
          <div key={stage.label}>
            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 border border-border flex items-center justify-center text-text-muted shrink-0">
                {stage.icon}
              </div>
              <div>
                <div className="text-[11px] text-text-secondary">
                  {stage.label}
                </div>
                <div className="text-[10px] text-text-muted">
                  {stage.detail}
                </div>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex justify-center py-1">
                <svg width="12" height="16" viewBox="0 0 12 16" className="text-text-disabled">
                  <line x1="6" y1="0" x2="6" y2="12" stroke="currentColor" strokeWidth="1" />
                  <polyline points="2,10 6,14 10,10" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-disabled text-center max-w-[400px] mx-auto leading-[1.6]">
        we never submit anything on your behalf. every performance passes through
        your review before it reaches bmi live or ascap onstage.
      </p>
    </section>
  );
}
