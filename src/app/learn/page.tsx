import type { Metadata } from 'next';
import Link from 'next/link';
import { MorphingText } from '@/components/ui/morphing-text';

export const metadata: Metadata = {
  title: 'what are performance royalties? — setlist royalty tracker',
  description: 'a plain-language guide to live performance royalties: where the money comes from, how to start collecting, deadlines, and why most creators miss out.',
};

export default function LearnPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-[2vw] py-[1.5vw] border-b border-border-subtle">
        <Link href="/" className="flex flex-col items-start hover:opacity-70 transition-opacity">
          <MorphingText className="text-[28px]" />
          <span className="text-[14px] tracking-[-0.3px]">setlist royalty tracker</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/about" className="btn text-[11px]">
            about
          </Link>
          <Link href="/login" className="btn text-[11px]">
            sign in
          </Link>
        </div>
      </nav>

      <main className="flex-1 px-[4vw] py-[6vw]">
        <div className="max-w-[640px] mx-auto space-y-14">

          {/* Hero */}
          <div className="text-center space-y-4">
            <h1 className="text-[28px] font-normal tracking-[-0.5px] leading-[1.2]">
              performance royalties, explained
            </h1>
            <p className="text-text-muted text-[13px] leading-[1.6] max-w-[480px] mx-auto">
              if you write, co-write, or produce original music, there&apos;s money owed
              to you every time your songs are performed live — whether you&apos;re on stage
              or not. most creators never collect it. here&apos;s how it works.
            </p>
          </div>

          {/* Who earns — upfront */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">who earns performance royalties?</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              performance royalties go to the <strong className="text-text">songwriter or composer</strong> —
              the person who created the music. many performers are also songwriters, and they
              absolutely earn royalties for their own songs. but the royalty is tied to
              the <strong className="text-text">composition</strong>, not the act of performing. if you wrote
              the song, you&apos;re owed money every time it&apos;s performed publicly — by
              you or by anyone else.
            </p>
            <div className="card p-4 space-y-3 text-[12px] leading-[1.7]">
              <div className="flex gap-3">
                <span className="text-status-confirmed shrink-0">yes</span>
                <span className="text-text-secondary">an artist performing their own original songs at a show</span>
              </div>
              <div className="flex gap-3">
                <span className="text-status-confirmed shrink-0">yes</span>
                <span className="text-text-secondary">a songwriter whose song is covered by another artist at a concert</span>
              </div>
              <div className="flex gap-3">
                <span className="text-status-confirmed shrink-0">yes</span>
                <span className="text-text-secondary">a producer whose original track is played in a dj set</span>
              </div>
              <div className="flex gap-3">
                <span className="text-status-confirmed shrink-0">yes</span>
                <span className="text-text-secondary">an opening act performing their own songs — openers qualify too</span>
              </div>
              <div className="flex gap-3">
                <span className="text-status-expired shrink-0">no</span>
                <span className="text-text-secondary">a wedding dj playing other artists&apos; songs — the songwriters earn, not the dj</span>
              </div>
              <div className="flex gap-3">
                <span className="text-status-expired shrink-0">no</span>
                <span className="text-text-secondary">a cover band — the original songwriters earn, not the performers</span>
              </div>
            </div>
            <p className="text-[13px] text-text-muted leading-[1.7]">
              the key question is: <strong className="text-text">did you write or co-write the song?</strong>{' '}
              if yes, you&apos;re owed royalties when it&apos;s performed live — whether
              you&apos;re at the show or not.
            </p>
          </section>

          {/* Where the money comes from */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">where does the money come from?</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              every venue that hosts live music — bars, clubs, concert halls, festivals — pays
              an annual <strong className="text-text">blanket license fee</strong> to performing rights
              organizations (pros) like bmi and ascap. these fees range from a few hundred
              dollars for small bars to tens of thousands for large venues, depending on
              capacity and revenue.
            </p>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              that license gives the venue the legal right to host performances of any song
              in the pro&apos;s catalog. the pro pools all the fees together and distributes
              them to songwriters and publishers based on reported performances.
            </p>
            <div className="card p-4 text-[12px] text-text-muted leading-[1.7]">
              <p className="text-text-secondary font-medium mb-2">the money flow:</p>
              <p>venue pays license fee → pro collects and pools fees → pro distributes to songwriters based on reported performances</p>
            </div>
          </section>

          {/* History of PROs */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">how did this system start?</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              in the early 1900s, songwriters had no practical way to get paid when venues
              played their music. the copyright act of 1897 technically granted public
              performance rights, but no one enforced them.
            </p>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              in <strong className="text-text">1914</strong>, composer victor herbert and a group of
              songwriters including irving berlin founded <strong className="text-text">ascap</strong> —
              the first performing rights organization in the u.s. their idea: pool
              songwriters&apos; rights together and negotiate with venues collectively
              through a single annual license.
            </p>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              in <strong className="text-text">1917</strong>, the supreme court validated this model
              in <em>herbert v. shanley co.</em>, ruling that a restaurant playing music for
              diners constitutes a public performance requiring a license. this decision
              became the legal foundation for performance royalties as we know them.
            </p>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              <strong className="text-text">bmi</strong> was founded in <strong className="text-text">1939</strong>{' '}
              by radio broadcasters who wanted an alternative to ascap&apos;s rate increases.{' '}
              <strong className="text-text">sesac</strong> was founded in <strong className="text-text">1930</strong>{' '}
              to serve european composers underrepresented by ascap.{' '}
              <strong className="text-text">gmr</strong> launched in <strong className="text-text">2013</strong>,{' '}
              founded by music industry executive irving azoff with a boutique roster of
              high-value songwriters.
            </p>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              in <strong className="text-text">1941</strong>, both ascap and bmi entered{' '}
              <strong className="text-text">consent decrees</strong> with the u.s. department of justice
              after antitrust concerns. these decrees require the pros to license any venue
              that asks and send rate disputes to a federal judge. the consent decrees are{' '}
              <strong className="text-text">still in effect today</strong>.
            </p>
          </section>

          {/* What are PROs today */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">the four u.s. pros today</h2>
            <div className="space-y-2">
              <div className="card p-3">
                <span className="text-[13px] text-text font-medium">bmi</span>
                <span className="text-[11px] text-text-muted ml-2">founded 1939 · ~1.4 million affiliates · free to join</span>
                <p className="text-[11px] text-text-muted mt-1">acquired by new mountain capital (private equity) in 2023 for ~$1.7 billion. now a for-profit private entity.</p>
              </div>
              <div className="card p-3">
                <span className="text-[13px] text-text font-medium">ascap</span>
                <span className="text-[11px] text-text-muted ml-2">founded 1914 · ~920,000 members · $50 one-time fee</span>
                <p className="text-[11px] text-text-muted mt-1">operates on a non-profit basis as an unincorporated membership association. distributes fees to members after administrative costs.</p>
              </div>
              <div className="card p-3">
                <span className="text-[13px] text-text font-medium">sesac</span>
                <span className="text-[11px] text-text-muted ml-2">founded 1930 · invitation only</span>
                <p className="text-[11px] text-text-muted mt-1">for-profit, acquired by blackstone group in 2017. no consent decree.</p>
              </div>
              <div className="card p-3">
                <span className="text-[13px] text-text font-medium">gmr</span>
                <span className="text-[11px] text-text-muted ml-2">founded 2013 · invitation only · boutique roster</span>
                <p className="text-[11px] text-text-muted mt-1">for-profit, represents high-value catalogs (pharrell, drake, bruno mars). no consent decree — can negotiate higher rates.</p>
              </div>
            </div>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              international equivalents include prs (uk), socan (canada), gema (germany),
              sacem (france), apra (australia), and buma (netherlands). pros have reciprocal
              agreements — if your song is performed in another country, that country&apos;s
              pro collects and sends payment to your home pro, though international payments
              can take 9–24 months.
            </p>
          </section>

          {/* Live vs other royalties */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">live royalties vs. streaming and radio</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              for radio and streaming, pros use automated detection — audio fingerprinting,
              station logs, and digital service reports. it happens automatically.
            </p>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              <strong className="text-text">live performance royalties are different.</strong>{' '}there&apos;s
              no microphone in every bar listening to what&apos;s being played. pros survey
              the highest-grossing concert tours each quarter using pollstar data, but
              everyone else — the vast majority of working creators —
              must <strong className="text-text">self-report</strong> through programs like bmi live
              and ascap onstage.
            </p>
            <p className="text-[13px] text-text-muted leading-[1.7]">
              if you don&apos;t report, your pro doesn&apos;t know the performance happened,
              and you don&apos;t get paid.
            </p>
          </section>

          {/* How much */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">how are live performance royalties calculated?</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              there is no fixed per-song rate. each quarter, the total pool of collected license
              fees is divided among all reported performances using a weighting system. factors include:
            </p>
            <ul className="space-y-2 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>how much the specific venue pays in license fees</span>
              </li>
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>total number of performances reported that quarter</span>
              </li>
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>venue capacity and market size</span>
              </li>
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>whether the song was a full performance or part of a medley (bmi pays medleys at 50%)</span>
              </li>
            </ul>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              because the pool size and number of reported performances change every quarter,
              the per-performance payout fluctuates. pros do not publish fixed rates. however,
              the more performances you report, the more you collect — and unreported
              performances earn you nothing.
            </p>
          </section>

          {/* Deadlines */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">deadlines: use it or lose it</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              you can&apos;t report performances forever. each pro has submission windows:
            </p>
            <div className="card p-4 space-y-3">
              <div>
                <p className="text-[12px] text-text font-medium mb-1">bmi live</p>
                <p className="text-[12px] text-text-muted leading-[1.7]">
                  rolling 6-month windows with a broader <strong className="text-status-expiring">9-month
                  eligibility window</strong>. miss it and you can&apos;t claim that performance.
                </p>
              </div>
              <div>
                <p className="text-[12px] text-text font-medium mb-1">ascap onstage</p>
                <p className="text-[12px] text-text-muted leading-[1.7]">
                  quarterly deadlines with a <strong className="text-status-expiring">3-month grace
                  period</strong>. tighter windows than bmi.
                </p>
              </div>
              <div>
                <p className="text-[12px] text-text font-medium mb-1">prs for music (uk)</p>
                <p className="text-[12px] text-text-muted leading-[1.7]">
                  within <strong className="text-text">2 years</strong> for domestic uk performances.
                  may 31 deadline for u.s. performances from the preceding year.
                </p>
              </div>
            </div>
            <p className="text-[13px] text-text-muted leading-[1.7]">
              when you miss a deadline, the money doesn&apos;t disappear — it gets redistributed
              to other writers in the pool. you simply lose your claim to it.
            </p>
          </section>

          {/* Why most miss out */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">why most creators never collect</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              billions of dollars in music royalties go unclaimed every year across all
              royalty types. for live performance specifically, the gap is massive because
              of how the system works.
            </p>
            <div className="space-y-2">
              <div className="card p-3">
                <p className="text-[12px] text-text font-medium">&quot;i didn&apos;t know self-reporting existed&quot;</p>
                <p className="text-[11px] text-text-muted mt-1">most creators have never heard of bmi live or ascap onstage. pros don&apos;t heavily promote these programs.</p>
              </div>
              <div className="card p-3">
                <p className="text-[12px] text-text font-medium">&quot;my label handles that&quot;</p>
                <p className="text-[11px] text-text-muted mt-1">labels collect mechanical and master royalties. performance royalties go through pros directly to songwriters. your label is not involved.</p>
              </div>
              <div className="card p-3">
                <p className="text-[12px] text-text font-medium">&quot;my pro tracks everything automatically&quot;</p>
                <p className="text-[11px] text-text-muted mt-1">pros auto-track the highest-grossing concert tours. if you&apos;re not on a top-grossing tour, nobody is tracking your shows for you.</p>
              </div>
              <div className="card p-3">
                <p className="text-[12px] text-text font-medium">&quot;it&apos;s not worth the effort&quot;</p>
                <p className="text-[11px] text-text-muted mt-1">every unreported show is money left on the table. over the course of a year, it adds up — especially for creators who perform regularly or have songs covered by other artists.</p>
              </div>
              <div className="card p-3">
                <p className="text-[12px] text-text font-medium">&quot;i need to be at the show&quot;</p>
                <p className="text-[11px] text-text-muted mt-1">no. if another artist covers your song at their show, you earn royalties — as long as the performance is reported and your song is registered with your pro.</p>
              </div>
            </div>
          </section>

          {/* DJ/Producer section — simplified */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">if you&apos;re a dj who also produces original music</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              if you produce original tracks, you are a songwriter — and you&apos;re owed
              performance royalties when your music is played live. this applies whether
              you&apos;re the one playing it or another dj drops your track at a club or
              festival.
            </p>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              the problem is that most djs don&apos;t report their setlists. when a dj plays
              your track and doesn&apos;t report it, your pro never finds out the performance
              happened, and you don&apos;t get paid.
            </p>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              the association for electronic music (afem) has reported that a significant
              portion of performance royalties in electronic music go uncollected or are
              distributed to the wrong songwriters — largely because setlist reporting
              at clubs and festivals is rare.
            </p>

            <div className="card p-4 space-y-3">
              <p className="text-[12px] text-text font-medium">if you produce original music:</p>
              <p className="text-[12px] text-text-muted leading-[1.7]">
                srt helps you find when other djs play your tracks at clubs and festivals
                so you can report those performances and claim your royalties. you don&apos;t
                need to be at the show — if your song was played, you&apos;re owed money.
              </p>
            </div>

            <div className="card p-4 space-y-3">
              <p className="text-[12px] text-text font-medium">if you dj but don&apos;t produce original music:</p>
              <p className="text-[12px] text-text-muted leading-[1.7]">
                you don&apos;t earn performance royalties from the songs you play — those
                royalties belong to the songwriters who created the music. srt isn&apos;t
                built for this use case. however, when you report your setlists, you help
                the producers whose music you play get paid. that matters — most dj sets
                go unreported, and producers lose money because of it.
              </p>
            </div>

            <div className="card p-4 space-y-3">
              <p className="text-[12px] text-text font-medium">can djs legally play other artists&apos; music?</p>
              <p className="text-[12px] text-text-muted leading-[1.7]">
                yes — as long as the venue has a blanket pro license, which most do. the
                venue&apos;s license covers any music performed there, whether live or
                pre-recorded. the dj is not personally liable for copyright when performing
                at a licensed venue.
              </p>
            </div>
          </section>

          {/* How to start */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">how to start collecting — step by step</h2>
            <div className="card p-4 space-y-4">
              <div className="border-b border-border-subtle pb-4">
                <p className="text-[11px] text-text-muted font-medium mb-1">step 1</p>
                <p className="text-[13px] text-text font-medium">register with a pro</p>
                <p className="text-[12px] text-text-muted mt-1">
                  join bmi (free) or ascap ($50 one-time). sesac and gmr are invitation-only.
                  set up direct deposit — it&apos;s required for live royalty payments.
                </p>
              </div>
              <div className="border-b border-border-subtle pb-4">
                <p className="text-[11px] text-text-muted font-medium mb-1">step 2</p>
                <p className="text-[13px] text-text font-medium">register your songs</p>
                <p className="text-[12px] text-text-muted mt-1">
                  every composition must be individually registered with your pro — title,
                  writers, and ownership splits. unregistered songs can&apos;t earn royalties
                  even if the performance is reported.
                </p>
              </div>
              <div className="border-b border-border-subtle pb-4">
                <p className="text-[11px] text-text-muted font-medium mb-1">step 3</p>
                <p className="text-[13px] text-text font-medium">report your performances</p>
                <p className="text-[12px] text-text-muted mt-1">
                  after every show, submit your setlist to bmi live or ascap onstage.
                  include the date, venue name and location, and every song performed.
                  both headliners and opening acts can report.
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted font-medium mb-1">step 4</p>
                <p className="text-[13px] text-text font-medium">submit before the deadline</p>
                <p className="text-[12px] text-text-muted mt-1">
                  bmi: within 9 months. ascap: within 3 months of quarter end.
                  miss the window and the money gets redistributed to other writers.
                </p>
              </div>
            </div>
          </section>

          {/* SRT CTA */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">this is what srt automates</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              setlist royalty tracker scans 9.6 million+ crowdsourced setlists to find shows
              where your songs were performed — whether someone covered your song at a concert
              or a dj played your track at a club. we auto-fill the bmi live submission form
              so you don&apos;t have to manually enter venue details, dates, and setlists for
              every show. and we track the deadlines so you never miss them.
            </p>
            <div className="text-center pt-4 space-y-3">
              <Link href="/login" className="btn btn-primary inline-block px-10 py-3 text-[13px]">
                start collecting
              </Link>
              <p className="text-[11px] text-text-disabled">
                free · magic link login · no password required
              </p>
            </div>
          </section>

          {/* Sources */}
          <section className="space-y-3 pt-4 border-t border-border-subtle">
            <h3 className="text-[12px] text-text-muted font-medium">sources and references</h3>
            <div className="text-[11px] text-text-muted leading-[1.8] space-y-1">
              <p>· bmi — live concert royalties: bmi.com/creators/royalty/live_concert_royalties</p>
              <p>· ascap — onstage program: ascap.com/music-creators/ascap-onstage</p>
              <p>· ascap — royalty calculation and payment: ascap.com/help/royalties-and-payment</p>
              <p>· prs for music — live performance reporting: prsformusic.com/royalties/report-live-performances</p>
              <p>· afem — get played get paid initiative: associationforelectronicmusic.org/initiatives/get-played-get-paid-cmo-relations</p>
              <p>· herbert v. shanley co. (1917) — supreme court, 242 u.s. 591</p>
              <p>· bmi v. cbs (1979) — supreme court, 441 u.s. 1 (blanket licensing upheld)</p>
              <p>· u.s. copyright act of 1976, section 106(4) — public performance rights</p>
              <p>· doj consent decrees — ascap (1941, amended 2001) and bmi (1941, amended 1994)</p>
            </div>
            <p className="text-[10px] text-text-disabled leading-[1.6] mt-2">
              pro membership numbers and fee structures are from official pro websites as of 2025.
              royalty payout amounts are not published by pros and vary by quarter — no specific
              dollar-per-performance figures are cited here because they cannot be independently verified.
            </p>
          </section>
        </div>
      </main>

      <footer className="px-[2vw] py-[1.5vw] border-t border-border-subtle text-center text-[11px] text-text-disabled">
        setlist royalty tracker · powered by setlist.fm api ·{' '}
        <a href="mailto:support@setlistroyalty.com" className="hover:text-text-muted transition-colors">
          support@setlistroyalty.com
        </a>
        {' '}·{' '}
        <a href="/privacy" className="hover:text-text-muted transition-colors">privacy</a>
      </footer>
    </div>
  );
}
