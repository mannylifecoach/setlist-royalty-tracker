// BMI Live selector regression — validates every entry in FIELD_MAP against the
// captured DOM fixtures from the 2026-04-24 inspection sessions. Acts as Piece 2
// of the BMI health monitoring strategy: catches us breaking our own selectors
// (refactors, typos, regressions) before they ship to the Chrome extension.
//
// Does NOT catch BMI changing their wizard — the fixtures are frozen by
// definition. That requires Piece 3 (manual snapshot refresh) to surface drift.
//
// Fixture format (flat JSON array, one entry per element):
//   { t: 'INPUT', tp: 'text', id: '...', n: '...', cls: '...', p: '...',
//     lb: ['Label text'], opts: [...], al: '...', ar: '...', dti: '...' }
//
// Matcher mirrors findField()'s priority: id > name > label > placeholder >
// tag+type+index. Pure function over the fixture array — no JSDOM, no DOM
// emulation. Same simplicity as ascap-selectors.test.ts.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_MAP, type FieldSelector } from './bmi-selectors';

interface FixtureEl {
  t: string;
  tp?: string;
  id?: string;
  n?: string;
  cls?: string;
  p?: string;
  al?: string;
  ar?: string;
  dti?: string;
  href?: string;
  txt?: string;
  lb?: string[];
  opts?: Array<{ v: string; t: string }>;
}

function loadFixture(name: string): FixtureEl[] {
  // Fixtures live in extension/__fixtures__/ inside the SRT repo so CI can
  // find them. Originals are captured into the user's Obsidian vault during
  // beta-test inspection sessions; the runbook (Projects/SRT - DOM Snapshot
  // Refresh Runbook.md) walks through copying them in here.
  const path = join(
    process.cwd(),
    'extension',
    '__fixtures__',
    `.bmi_${name}_dom_2026-04-24.json`
  );
  return JSON.parse(readFileSync(path, 'utf8')) as FixtureEl[];
}

function loadModalFixture(): FixtureEl[] {
  // The Create-New-Venue modal sidecar uses a different naming convention.
  const path = join(
    process.cwd(),
    'extension',
    '__fixtures__',
    `.bmi_create_new_venue_modal_dom.json`
  );
  return JSON.parse(readFileSync(path, 'utf8')) as FixtureEl[];
}

// Mirrors extension/content/bmi-selectors.ts findField() priority order, but
// operates on the captured fixture array instead of a live DOM. Same fall-
// through chain — if the implementation changes priorities, change this too.
function resolveFieldInFixture(
  field: FieldSelector,
  fixture: FixtureEl[]
): FixtureEl | null {
  // 1. ID (with optional index for repeated IDs like _time / _ampm)
  if (field.id) {
    const matches = fixture.filter((el) => el.id === field.id);
    if (field.index !== undefined) return matches[field.index] ?? null;
    if (matches.length > 0) return matches[0];
  }

  // 2. Name attribute, scoped by tag
  if (field.name) {
    const match = fixture.find((el) => el.t === field.tag && el.n === field.name);
    if (match) return match;
  }

  // 3. Label text — fixture captures labels via `lb` array
  if (field.label) {
    const match = fixture.find(
      (el) => el.t === field.tag && el.lb?.includes(field.label!)
    );
    if (match) return match;
  }

  // 4. Placeholder, scoped by tag
  if (field.placeholder) {
    const match = fixture.find(
      (el) => el.t === field.tag && el.p === field.placeholder
    );
    if (match) return match;
  }

  // 5. Tag + type + index fallback
  if (field.type !== undefined && field.index !== undefined) {
    const matches = fixture.filter(
      (el) => el.t === field.tag && el.tp === field.type
    );
    if (matches[field.index]) return matches[field.index];
  }

  return null;
}

// Each FIELD_MAP key maps to which step's fixture should contain it.
// Step 1 covers Details + Venue (both render together as one wizard screen).
// Step 2 covers Setlist (song search input + recents toggle).
// The wizard is progressive — Step 2 inherits Step 1 elements — so we resolve
// against the field's primary step but accept either if the test infra detects
// inheritance later. For now: strict per-step assertion catches the most
// regressions with the clearest failure messages.
const FIELD_TO_STEP: Record<keyof typeof FIELD_MAP, 'step1' | 'step2'> = {
  // Step 1 — Details
  bandPerformer: 'step1',
  eventName: 'step1',
  eventType: 'step1',
  startDate: 'step1',
  startTime: 'step1',
  startAmPm: 'step1',
  endDate: 'step1',
  endTime: 'step1',
  endAmPm: 'step1',
  eventPromoter: 'step1',
  attendance: 'step1',
  ticketCharge: 'step1',
  // Step 1 — Venue (same wizard screen)
  previousVenues: 'step1',
  venueState: 'step1',
  venueCity: 'step1',
  venueName: 'step1',
  // Step 2 — Setlist
  songSearch: 'step2',
  showRecents: 'step2',
};

describe('BMI selector regression — FIELD_MAP resolves against captured fixtures', () => {
  const step1 = loadFixture('add_performance_step1');
  const step2 = loadFixture('add_performance_step2');

  it.each(Object.entries(FIELD_MAP))(
    'FIELD_MAP.%s resolves in its step fixture',
    (key, field) => {
      const step = FIELD_TO_STEP[key as keyof typeof FIELD_MAP];
      const fixture = step === 'step1' ? step1 : step2;
      const resolved = resolveFieldInFixture(field, fixture);
      expect(
        resolved,
        `FIELD_MAP.${key} did not resolve in ${step} fixture — selector spec: ${JSON.stringify(field)}`
      ).not.toBeNull();
    }
  );

  it('every FIELD_MAP entry has a step assignment (no missing entries in FIELD_TO_STEP)', () => {
    for (const key of Object.keys(FIELD_MAP)) {
      expect(FIELD_TO_STEP).toHaveProperty(key);
    }
  });

  it('FIELD_MAP is non-empty (sanity)', () => {
    expect(Object.keys(FIELD_MAP).length).toBeGreaterThan(10);
  });
});

describe('BMI selector regression — wizard is progressive (Step 2 includes Step 1 form elements)', () => {
  const step2 = loadFixture('add_performance_step2');

  // Smoke check: a few Step 1 selectors should also resolve against Step 2
  // fixture, confirming the progressive-DOM architecture documented in the
  // 2026-04-24 inspection notes. If Step 2 ever stops containing Step 1
  // elements, the wizard layout changed materially and we need to know.
  it('eventName placeholder resolves in Step 2 fixture (progressive DOM)', () => {
    expect(resolveFieldInFixture(FIELD_MAP.eventName, step2)).not.toBeNull();
  });

  it('previousVenues label resolves in Step 2 fixture (progressive DOM)', () => {
    expect(resolveFieldInFixture(FIELD_MAP.previousVenues, step2)).not.toBeNull();
  });
});

describe('BMI selector regression — Create-New-Venue modal fixture is loadable', () => {
  // The modal selectors live in pro-filler.ts (label-by-text → next-sibling
  // pattern, captured 2026-04-24). We don't validate per-field here yet because
  // those selectors aren't in FIELD_MAP — they're inline in the filler. Loading
  // the fixture proves it stays parseable so a future test can pick it up.
  it('modal fixture loads and contains form elements', () => {
    const modal = loadModalFixture();
    expect(modal.length).toBeGreaterThan(0);
    expect(modal.some((el) => el.t === 'INPUT' || el.t === 'SELECT')).toBe(true);
  });
});

describe('resolveFieldInFixture (test infrastructure)', () => {
  const fixture: FixtureEl[] = [
    { t: 'INPUT', tp: 'text', id: 'tbSongSearch', n: '', cls: '', p: '' },
    { t: 'INPUT', tp: 'text', id: 'foo', n: 'myname', cls: '', p: 'placeholder text' },
    { t: 'SELECT', tp: 'select-one', id: 'sel1', n: '', cls: '', lb: ['Band/Performer'] },
    { t: 'SELECT', tp: 'select-one', id: '_time', n: '', cls: '' },
    { t: 'SELECT', tp: 'select-one', id: '_time', n: '', cls: '' },
    { t: 'INPUT', tp: 'date', id: 'd1', n: '', cls: '' },
    { t: 'INPUT', tp: 'date', id: 'd2', n: '', cls: '' },
  ];

  it('resolves by id', () => {
    const result = resolveFieldInFixture(
      { id: 'tbSongSearch', tag: 'INPUT' },
      fixture
    );
    expect(result?.id).toBe('tbSongSearch');
  });

  it('resolves by id + index when id is repeated', () => {
    const first = resolveFieldInFixture(
      { id: '_time', tag: 'SELECT', index: 0 },
      fixture
    );
    const second = resolveFieldInFixture(
      { id: '_time', tag: 'SELECT', index: 1 },
      fixture
    );
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first).not.toBe(second);
  });

  it('resolves by name when id is absent', () => {
    const result = resolveFieldInFixture(
      { name: 'myname', tag: 'INPUT' },
      fixture
    );
    expect(result?.n).toBe('myname');
  });

  it('resolves by label when present', () => {
    const result = resolveFieldInFixture(
      { label: 'Band/Performer', tag: 'SELECT' },
      fixture
    );
    expect(result?.id).toBe('sel1');
  });

  it('resolves by placeholder + tag', () => {
    const result = resolveFieldInFixture(
      { placeholder: 'placeholder text', tag: 'INPUT' },
      fixture
    );
    expect(result?.id).toBe('foo');
  });

  it('resolves by tag + type + index fallback', () => {
    const first = resolveFieldInFixture(
      { tag: 'INPUT', type: 'date', index: 0 },
      fixture
    );
    const second = resolveFieldInFixture(
      { tag: 'INPUT', type: 'date', index: 1 },
      fixture
    );
    expect(first?.id).toBe('d1');
    expect(second?.id).toBe('d2');
  });

  it('returns null when nothing matches', () => {
    const result = resolveFieldInFixture(
      { label: 'Nonexistent Label', tag: 'SELECT' },
      fixture
    );
    expect(result).toBeNull();
  });

  it('respects tag scoping — name match must also match tag', () => {
    const result = resolveFieldInFixture(
      { name: 'myname', tag: 'SELECT' },
      fixture
    );
    expect(result).toBeNull();
  });
});
