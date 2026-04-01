const steps = [
  {
    number: '01',
    title: 'register your songs',
    description: 'add your compositions — titles, writers, PRO registration',
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
    number: '02',
    title: 'track your artists',
    description: 'tell us who performs your music and we\'ll watch their tours',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'we scan concerts',
    description: 'we automatically check 9.6m+ setlists on setlist.fm for matches',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'get notified',
    description: 'email alerts when your songs are played live — review in one click',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    number: '05',
    title: 'submit & get paid',
    description: 'auto-fill bmi live via chrome extension or export csv — before the 9-month deadline',
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
        <span className="text-[11px] text-text-muted tracking-[2px]">
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
              <p className="text-[11px] text-text-muted leading-[1.5] max-w-[160px]">
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

      {/* Mobile: vertical flow */}
      <div className="md:hidden space-y-0">
        {steps.map((step, i) => (
          <div key={step.number} className="flex">
            <div className="flex flex-col items-center mr-4">
              <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-[12px] text-text-muted shrink-0">
                {step.number}
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 w-px bg-border-subtle my-1" />
              )}
            </div>
            <div className="pb-8 pt-1">
              <div className="text-text-muted mb-2">
                {step.icon}
              </div>
              <div className="text-[12px] text-text-secondary mb-1">
                {step.title}
              </div>
              <p className="text-[11px] text-text-muted leading-[1.5]">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
