const stats = [
  {
    value: 'billions',
    label: 'in royalties go uncollected yearly',
    detail: 'across all royalty types · industry estimates',
  },
  {
    value: '$120M',
    label: 'in dj royalties unclaimed annually',
    detail: 'source: afem (association for electronic music)',
  },
  {
    value: 'top tours',
    label: 'are the only ones auto-tracked',
    detail: 'everyone else must self-report',
  },
  {
    value: '9.9M+',
    label: 'setlists on setlist.fm',
    detail: '445K+ artists · 423K+ venues',
  },
];

export function WhyThisMatters() {
  return (
    <section className="space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-[11px] text-text-muted tracking-[2px] uppercase">
          why this matters
        </h2>
        <p className="text-[15px] text-text-secondary leading-[1.5] max-w-[520px] mx-auto">
          millions of creators are registered with us pros, but only the
          highest-grossing tours get tracked automatically. everyone else must
          self-report every show to collect. add the electronic music royalty
          gap, and the scale of unclaimed money is massive. the data to fix
          this already exists — it just isn&apos;t connected to royalty collection.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.value}
            className="border border-border-subtle p-5 text-center space-y-2"
          >
            <div className="text-[28px] sm:text-[32px] font-normal tracking-[-1px]">
              {stat.value}
            </div>
            <div className="text-[12px] text-text-secondary leading-[1.4]">
              {stat.label}
            </div>
            <div className="text-[10px] text-text-disabled">
              {stat.detail}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-disabled text-center leading-[1.6]">
        sources: bmi.com · ascap.com · afem · setlist.fm
      </p>
    </section>
  );
}
