const steps = [
  {
    number: '01',
    title: 'setlist sources',
    description: 'setlist.fm 9.6m+ setlists, plus serato dj history import',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'work-id matching',
    description: 'remixes and edits matched via musicbrainz work relationships',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'your review',
    description: 'you confirm every match',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'pro submit',
    description: 'chrome extension or csv',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    ),
  },
  {
    number: '05',
    title: 'bmi / ascap',
    description: 'you submit directly to your pro',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section className="space-y-10">
      <div className="text-center">
        <span className="text-[12px] text-text-muted tracking-[2px]">
          how it works
        </span>
      </div>

      {/* Desktop: horizontal flow */}
      <div className="hidden md:flex items-start justify-center max-w-[900px] mx-auto">
        {steps.map((step, i) => (
          <div key={step.number} className="flex items-start flex-1">
            <div className="flex flex-col items-center text-center px-2 flex-1">
              <div className="text-text-muted mb-3">
                {step.icon}
              </div>
              <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-[12px] text-text-muted mb-3">
                {step.number}
              </div>
              <div className="text-[12px] text-text-secondary mb-2">
                {step.title}
              </div>
              <p className="text-[12px] text-text-secondary leading-[1.5] max-w-[160px]">
                {step.description}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center pt-[58px] -mx-1">
                <div className="w-8 border-t border-border-subtle" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: simple list */}
      <div className="md:hidden max-w-[320px] mx-auto space-y-6 text-left">
        {steps.map((step) => (
          <div key={step.number} className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-text-muted shrink-0">
              {step.icon}
            </div>
            <div className="pt-1">
              <div className="text-[13px] text-text font-medium">
                {step.title}
              </div>
              <p className="text-[12px] text-text-secondary leading-[1.5] mt-1">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
