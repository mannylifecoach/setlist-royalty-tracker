export function DataDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="card p-3">
        <p className="text-[11px] text-text-muted leading-[1.6]">
          <span className="text-text-secondary font-medium">data accuracy notice:</span>{' '}
          performance data is sourced from setlist.fm, a crowdsourced database maintained by volunteers.
          setlists may contain errors, omissions, or incorrect song attributions. you are responsible for
          reviewing all matches before submitting to your pro. setlist royalty tracker is not affiliated
          with or endorsed by bmi, ascap, or any performing rights organization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      <h3 className="text-[14px] font-medium tracking-[-0.3px] text-center">data accuracy</h3>
      <div className="card p-5 space-y-3 text-[12px] text-text-muted leading-[1.7]">
        <p>
          setlist royalty tracker helps you discover and organize live performance data — but
          the data comes from <strong className="text-text-secondary">crowdsourced databases</strong> maintained
          by volunteers, not official sources. setlist.fm setlists, musicbrainz metadata, and venue
          information may contain errors, omissions, or incorrect attributions.
        </p>
        <p>
          <strong className="text-text-secondary">you are responsible for reviewing all matched performances
          before submitting them to your performing rights organization.</strong> we provide tools to make
          this easier (auto-fill, csv export, missing field warnings), but the final submission is
          yours — verify dates, venues, song titles, and work ids before filing.
        </p>
        <p>
          setlist royalty tracker is an independent tool. we are not affiliated with, endorsed by, or
          partnered with bmi, ascap, sesac, gmr, or any other performing rights organization.
        </p>
      </div>
    </div>
  );
}
