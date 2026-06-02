import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  STEP1_FIELDS,
  STEP2_FIELDS,
  ALL_SESAC_FIELD_MAPS,
  setSesacSelectValue,
  setSesacInputValue,
  clickMatRadioByLabel,
  setMatCheckboxByLabel,
  findButtonByText,
  findMatIconButton,
  findSesacField,
  type SesacFieldSelector,
} from './sesac-selectors';
import {
  formatSesacDate,
  sesacAttendanceBucket,
  setlistNameFor,
  normalizeSongTitle,
} from './sesac-filler';

// ----- Fixture validation -----
// Captured 2026-06-01 from a live affiliate session (Projects/SRT Beta - SESAC
// DOM Inspection Results.md). SESAC's Step 1 fields are LABEL-based and Step 2
// search inputs are PLACEHOLDER-based, so the matcher checks the captured `lb`
// (labels) array / `p` (placeholder) — not CSS classes — to mirror how
// findSesacField resolves at runtime.
interface FixtureEl {
  t: string;
  tp?: string;
  id?: string;
  n?: string;
  cls?: string;
  p?: string;
  lb?: string[];
}

function loadFixture(name: string): FixtureEl[] {
  const path = join(process.cwd(), 'extension', '__fixtures__', `.sesac_${name}_dom.json`);
  return JSON.parse(readFileSync(path, 'utf8')) as FixtureEl[];
}

function fieldResolves(field: SesacFieldSelector, fixture: FixtureEl[]): boolean {
  return fixture.some((el) => {
    if (el.t !== field.tag) return false;
    if (field.placeholder) return (el.p || '') === field.placeholder;
    if (field.label) {
      const labels = (el.lb || []).map((l) => l.trim().toLowerCase());
      return labels.includes(field.label.trim().toLowerCase());
    }
    return false;
  });
}

function classResolves(fixture: FixtureEl[], className: string, tag?: string): boolean {
  return fixture.some((el) => {
    if (tag && el.t !== tag) return false;
    return (el.cls || '').split(/\s+/).includes(className);
  });
}

describe('SESAC Step 1 — Performance Details selectors resolve against captured DOM', () => {
  const fixture = loadFixture('step1_performance');

  it.each(Object.entries(STEP1_FIELDS))('STEP1_FIELDS.%s — resolves by label', (_key, field) => {
    expect(fieldResolves(field, fixture)).toBe(true);
  });

  it('Kendo datepicker input (input.k-input) is present', () => {
    expect(classResolves(fixture, 'k-input', 'INPUT')).toBe(true);
  });

  it('Headline/Supporting radios + admission-fee checkbox are present', () => {
    expect(classResolves(fixture, 'mat-radio-input', 'INPUT')).toBe(true);
    expect(classResolves(fixture, 'mat-checkbox-input', 'INPUT')).toBe(true);
  });
});

describe('SESAC Step 2 — Song Selection selectors resolve against captured DOM', () => {
  const fixture = loadFixture('step2_song_selection');

  it.each(Object.entries(STEP2_FIELDS))('STEP2_FIELDS.%s — resolves by placeholder', (_key, field) => {
    expect(fieldResolves(field, fixture)).toBe(true);
  });

  it('catalog song tile (.song-item) + value (.song-item-value) are present', () => {
    expect(classResolves(fixture, 'song-item')).toBe(true);
    expect(classResolves(fixture, 'song-item-value')).toBe(true);
  });
});

describe('Coverage sanity', () => {
  it('exposes selectors for both fillable steps', () => {
    const total = Object.values(ALL_SESAC_FIELD_MAPS).reduce(
      (acc, map) => acc + Object.keys(map).length,
      0
    );
    expect(total).toBeGreaterThanOrEqual(10);
  });
});

// ----- Pure helpers -----

describe('formatSesacDate', () => {
  it('YYYY-MM-DD → MM/DD/YYYY (SESAC datepicker format)', () => {
    expect(formatSesacDate('2026-04-01')).toBe('04/01/2026');
  });
  it('passes through unrecognized input', () => {
    expect(formatSesacDate('04/01/2026')).toBe('04/01/2026');
  });
});

describe('sesacAttendanceBucket', () => {
  it('maps counts to SESAC range buckets', () => {
    expect(sesacAttendanceBucket(50)).toBe('1-100');
    expect(sesacAttendanceBucket(100)).toBe('1-100');
    expect(sesacAttendanceBucket(250)).toBe('201-300');
    expect(sesacAttendanceBucket(900)).toBe('751-999');
    expect(sesacAttendanceBucket(1500)).toBe('1,000-2,999');
    expect(sesacAttendanceBucket(8000)).toBe('6,000-9,999');
    expect(sesacAttendanceBucket(25000)).toBe('Over 20,000');
  });
  it('returns null for missing / non-positive counts', () => {
    expect(sesacAttendanceBucket(null)).toBeNull();
    expect(sesacAttendanceBucket(undefined)).toBeNull();
    expect(sesacAttendanceBucket(0)).toBeNull();
  });
});

describe('setlistNameFor', () => {
  it('formats "<artist> - <YYYY-MM-DD>"', () => {
    expect(setlistNameFor({ artistName: 'The Rose', eventDate: '2026-04-01' })).toBe('The Rose - 2026-04-01');
  });
});

describe('normalizeSongTitle', () => {
  it('collapses whitespace + uppercases', () => {
    expect(normalizeSongTitle('  eclipse ')).toBe('ECLIPSE');
    expect(normalizeSongTitle('el  dorado')).toBe('EL DORADO');
  });
});

// ----- setSesacSelectValue (stub-driven, no DOM) -----

describe('setSesacSelectValue', () => {
  function makeSelect(values: string[]) {
    const options = values.map((v) => ({ value: v, textContent: v }));
    const dispatched: Event[] = [];
    const el = {
      options,
      value: '',
      dispatchEvent: (e: Event) => {
        dispatched.push(e);
        return true;
      },
    } as unknown as HTMLSelectElement;
    return { el, dispatched };
  }

  it('matches a range bucket (with commas) by visible text', () => {
    const { el, dispatched } = makeSelect(['', '1-100', '1,000-2,999', 'Over 20,000']);
    expect(setSesacSelectValue(el, '1,000-2,999')).toBe(true);
    expect(el.value).toBe('1,000-2,999');
    expect(dispatched.some((e) => e.type === 'change')).toBe(true);
  });

  it('matches Country case-insensitively', () => {
    const { el } = makeSelect(['', 'USA', 'CANADA']);
    expect(setSesacSelectValue(el, 'usa')).toBe(true);
    expect(el.value).toBe('USA');
  });

  it('returns false when no option matches', () => {
    const { el } = makeSelect(['USA']);
    expect(setSesacSelectValue(el, 'NOPE')).toBe(false);
  });
});

describe('exported helper shapes', () => {
  it('value/locator helpers are exported as functions with the expected arity', () => {
    expect(typeof setSesacInputValue).toBe('function');
    expect(setSesacInputValue.length).toBe(2); // (el, value)
    expect(typeof clickMatRadioByLabel).toBe('function');
    expect(typeof setMatCheckboxByLabel).toBe('function');
    expect(typeof findButtonByText).toBe('function');
    expect(typeof findMatIconButton).toBe('function');
    expect(typeof findSesacField).toBe('function');
  });
});
