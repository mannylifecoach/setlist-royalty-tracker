// Shared selector-health validator used by both the cron route and tests.
//
// Mirrors extension/content/bmi-selectors.ts findField() priority order
// (id > name > label > placeholder > tag+type+index) but operates on the
// captured fixture array (flat JSON) instead of a live DOM. Pure function,
// no JSDOM dependency.
//
// "Healthy" means: every entry in FIELD_MAP resolves to at least one element
// in the captured fixture for its assigned wizard step. If anything fails,
// either we (the SRT team) broke our own selectors with a refactor, or the
// fixtures themselves are stale because BMI changed their wizard. The cron
// surfaces failures via Resend; the runbook (Projects/SRT - DOM Snapshot
// Refresh Runbook.md) covers re-capture when BMI changes are suspected.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_MAP, type FieldSelector } from '../../extension/content/bmi-selectors';

export interface FixtureEl {
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

const FIXTURE_DIR = join(process.cwd(), 'extension', '__fixtures__');

export function loadBmiStepFixture(step: 'step1' | 'step2' | 'step3'): FixtureEl[] {
  const stepNum = step.replace('step', '');
  const path = join(
    FIXTURE_DIR,
    `.bmi_add_performance_step${stepNum}_dom_2026-04-24.json`
  );
  return JSON.parse(readFileSync(path, 'utf8')) as FixtureEl[];
}

export function resolveFieldInFixture(
  field: FieldSelector,
  fixture: FixtureEl[]
): FixtureEl | null {
  if (field.id) {
    const matches = fixture.filter((el) => el.id === field.id);
    if (field.index !== undefined) return matches[field.index] ?? null;
    if (matches.length > 0) return matches[0];
  }
  if (field.name) {
    const match = fixture.find((el) => el.t === field.tag && el.n === field.name);
    if (match) return match;
  }
  if (field.label) {
    const match = fixture.find(
      (el) => el.t === field.tag && el.lb?.includes(field.label!)
    );
    if (match) return match;
  }
  if (field.placeholder) {
    const match = fixture.find(
      (el) => el.t === field.tag && el.p === field.placeholder
    );
    if (match) return match;
  }
  if (field.type !== undefined && field.index !== undefined) {
    const matches = fixture.filter(
      (el) => el.t === field.tag && el.tp === field.type
    );
    if (matches[field.index]) return matches[field.index];
  }
  return null;
}

// Step assignment per FIELD_MAP key. Step 1 covers Details + Venue (same wizard
// screen). Step 2 covers Setlist (search input + recents toggle).
const FIELD_TO_STEP: Record<keyof typeof FIELD_MAP, 'step1' | 'step2'> = {
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
  previousVenues: 'step1',
  venueState: 'step1',
  venueCity: 'step1',
  venueName: 'step1',
  songSearch: 'step2',
  showRecents: 'step2',
};

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  totalFields: number;
  resolvedFields: number;
  failures: Array<{ key: string; step: string; selector: FieldSelector }>;
  fixtureCapturedDate: string;
  checkedAt: string;
}

export function runBmiSelectorHealthCheck(): HealthCheckResult {
  const step1 = loadBmiStepFixture('step1');
  const step2 = loadBmiStepFixture('step2');

  const failures: HealthCheckResult['failures'] = [];
  let resolvedFields = 0;

  for (const [key, field] of Object.entries(FIELD_MAP)) {
    const step = FIELD_TO_STEP[key as keyof typeof FIELD_MAP];
    const fixture = step === 'step1' ? step1 : step2;
    const resolved = resolveFieldInFixture(field, fixture);
    if (resolved) {
      resolvedFields++;
    } else {
      failures.push({ key, step, selector: field });
    }
  }

  return {
    status: failures.length === 0 ? 'healthy' : 'unhealthy',
    totalFields: Object.keys(FIELD_MAP).length,
    resolvedFields,
    failures,
    fixtureCapturedDate: '2026-04-24',
    checkedAt: new Date().toISOString(),
  };
}
