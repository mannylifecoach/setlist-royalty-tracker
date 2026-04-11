'use client';

import { useState } from 'react';

const faqs = [
  {
    question: 'is this an official bmi or ascap tool?',
    answer:
      'no. setlist royalty tracker is an independent tool that helps you prepare and organize your live performance data. you still submit directly to bmi live or ascap onstage yourself — we just automate the tedious data entry so you don\'t miss the 9-month reporting deadline.',
  },
  {
    question: 'where does the performance data come from?',
    answer:
      'we pull setlist data from setlist.fm, a community of 300,000+ contributors who document concert setlists worldwide. setlist.fm has 9.6 million+ setlists cataloged. for dj-producers, we are adding serato dj history import, resident advisor venue matching, and 1001tracklists data — covering the dj/festival market that setlist.fm misses. we match all sources against the songs you\'ve registered in your account.',
  },
  {
    question: 'do you submit performances on my behalf?',
    answer:
      'never. you maintain full control. when we discover a matching performance, it enters a "discovered" status. you review and confirm it, fill in any missing venue details, then use the chrome extension to submit directly to your pro (requires google chrome), or export a csv as a backup. nothing is sent without your explicit action.',
  },
  {
    question: 'how accurate is the song matching?',
    answer:
      'we use a layered approach: fuzzy title matching catches the obvious cases, and musicbrainz work-relationship matching catches remixes, edits, and renamed versions of your compositions. so "midnight bass (extended mix)" is recognized as the same composition as "midnight bass." you always review matches before confirming — if something doesn\'t look right, you can mark it as ineligible.',
  },
  {
    question: 'i\'m a dj-producer. does this work for my live sets?',
    answer:
      'electronic music has a $120m/year royalty gap (afem estimate) because dj sets at clubs and festivals almost never get reported to bmi or ascap. our dj-producer support is rolling out now: upload your serato dj history, we match the tracks to your registered songs (including remixes via musicbrainz work relationships), and the chrome extension fills the bmi/ascap forms. you don\'t need to have been at the show — if another dj plays your track and uploads their set, you get notified.',
  },
  {
    question: 'do djs get performance royalties even when they\'re paid to perform?',
    answer:
      'yes — they\'re two completely separate revenue streams. the venue pays the dj a performance fee for showing up. bmi and ascap pay the songwriter a performance royalty for the use of their composition. if you wrote the track, you\'re owed performance royalties whether you played it yourself, another dj played it, or you weren\'t at the show at all.',
  },
  {
    question: 'what is the 9-month deadline?',
    answer:
      'bmi requires live performance reports to be submitted within 9 months of the event date. after that window closes, you can no longer claim royalties for that performance. we track this deadline for every discovered performance and warn you as it approaches.',
  },
  {
    question: 'does this work for both songwriters and publishers?',
    answer:
      'yes. if you have compositions registered with bmi or ascap and those songs are performed live by any artist, this tool helps you discover and report those performances — whether you\'re the performer, songwriter, or publisher.',
  },
  {
    question: 'is my data secure?',
    answer:
      'your account uses passwordless magic link authentication — no passwords stored. your song catalog and performance data are private to your account. the chrome extension authenticates via a unique api key that you generate and can regenerate at any time.',
  },
  {
    question: 'do i need google chrome to use this?',
    answer:
      'the auto-fill chrome extension only works in google chrome and other chromium-based browsers (microsoft edge, brave, arc, opera, vivaldi). if you use safari or firefox, you can still use the web app and submit performances via the csv export — the extension just makes it faster.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="space-y-6">
      <div className="text-center">
        <span className="text-[11px] text-text-muted tracking-[2px]">
          frequently asked questions
        </span>
      </div>

      <div className="max-w-[540px] mx-auto">
        {faqs.map((faq, i) => (
          <div key={i} className="border-b border-border-subtle">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between py-4 text-left cursor-pointer"
            >
              <span className="text-[12px] text-text-secondary pr-4">
                {faq.question}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={`text-text-muted shrink-0 transition-transform duration-200 ${
                  openIndex === i ? 'rotate-45' : ''
                }`}
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                openIndex === i ? 'max-h-[300px] pb-4' : 'max-h-0'
              }`}
            >
              <p className="text-[11px] text-text-muted leading-[1.7]">
                {faq.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
