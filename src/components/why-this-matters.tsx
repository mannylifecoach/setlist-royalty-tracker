const stats = [
  {
    value: '$2.5B+',
    label: 'in royalties go uncollected yearly',
    detail: 'source: digital music news',
  },
  {
    value: '$120M',
    label: 'in dj royalties unclaimed annually',
    detail: 'source: association for electronic music',
  },
  {
    value: '300',
    label: 'tours auto-tracked per quarter',
    detail: 'every other show is self-reported',
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
          over 2.4 million songwriters are registered with us pros, but only
          ~2,500 acts per year get paid for live performances automatically.
          add another $120m/year in unclaimed dj royalties, and the gap is
          obvious. the data to fix this already exists — it just isn&apos;t
          connected to royalty collection.
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
        sources: bmi.com · ascap.com · digital music news · setlist.fm · pollstar
      </p>
    </section>
  );
}
