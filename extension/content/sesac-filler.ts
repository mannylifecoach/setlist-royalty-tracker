// SESAC "Live Performance Registration" filler — affiliates.sesac.com.
// Two fillable steps; Review & Submit is user-handoff (mandatory legal
// attestation + "Submit to SESAC" are NEVER auto-actioned).
//
//   Step 1 /performance  → fillSesacPerformanceDetails(event)
//     Cascading reveal: Country → venue block → pick venue → address block.
//   Step 2 /set-list     → fillSesacSongSelection(event)
//     Per song: type in Song Search → select the catalog tile → move it right
//     (arrow_right) → name + Save As New Set List.
//
// Source: Projects/SRT Beta - SESAC DOM Inspection Results.md (2026-06-01).

import {
  STEP1_FIELDS,
  STEP2_FIELDS,
  SESAC_SELECTORS,
  findSesacField,
  setSesacInputValue,
  setSesacSelectValue,
  clickMatRadioByLabel,
  setMatCheckboxByLabel,
  findButtonByText,
  findMatIconButton,
} from './sesac-selectors';

export interface SesacEventSong {
  performanceId: string;
  title: string;
}

export interface SesacEventInput {
  artistName: string;
  eventDate: string; // YYYY-MM-DD
  eventDateFormatted?: string; // MM/DD/YYYY (derived if absent)
  isHeadliner?: boolean; // defaults to Headline Act
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueState: string | null;
  venueCountry: string | null;
  venueCapacity: string | null;
  attendance: number | null;
  attendanceRange?: string;
  ticketCharge?: string | null; // "Yes"/"No"/null
  ticketFee?: boolean;
  songs: SesacEventSong[];
}

export interface SesacFillResult {
  step: string;
  ok: boolean;
  detail?: string;
}

// ---------- Pure helpers (exported for tests) ----------

// YYYY-MM-DD → MM/DD/YYYY (SESAC's Kendo datepicker format, confirmed 2026-06-01).
export function formatSesacDate(eventDate: string): string {
  const m = eventDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return eventDate;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

// SESAC Venue Capacity + Number of Attendees share these exact range buckets.
// Maps a raw count to the matching option label.
export const SESAC_RANGES: Array<[number, number, string]> = [
  [1, 100, '1-100'],
  [101, 200, '101-200'],
  [201, 300, '201-300'],
  [301, 400, '301-400'],
  [401, 500, '401-500'],
  [501, 600, '501-600'],
  [601, 750, '601-750'],
  [751, 999, '751-999'],
  [1000, 2999, '1,000-2,999'],
  [3000, 5999, '3,000-5,999'],
  [6000, 9999, '6,000-9,999'],
  [10000, 19999, '10,000-19,000'],
  [20000, Infinity, 'Over 20,000'],
];

export function sesacAttendanceBucket(count: number | null | undefined): string | null {
  if (count === null || count === undefined || count <= 0) return null;
  for (const [lo, hi, label] of SESAC_RANGES) {
    if (count >= lo && count <= hi) return label;
  }
  return 'Over 20,000';
}

// Setlist naming convention — "<artist> - <YYYY-MM-DD>".
export function setlistNameFor(event: Pick<SesacEventInput, 'artistName' | 'eventDate'>): string {
  return `${event.artistName} - ${event.eventDate}`;
}

export function normalizeSongTitle(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toUpperCase();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Wait until `fn()` returns a truthy element (a cascade reveal completed).
async function waitFor<T>(fn: () => T | null, timeoutMs: number): Promise<T | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = fn();
    if (v) return v;
    await sleep(120);
  }
  return fn();
}

// ---------- Material autocomplete ----------

// Type into a Material autocomplete trigger, wait for the cdk overlay panel to
// render options, click the best match (exact → contains → first). Returns
// false if no option panel appeared — caller reports "typed; pick manually".
async function fillAutocomplete(
  el: HTMLInputElement,
  value: string,
  timeoutMs = 2500
): Promise<boolean> {
  setSesacInputValue(el, value);
  el.dispatchEvent(new Event('focusin', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

  const target = value.trim().toLowerCase();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const options = Array.from(
      document.querySelectorAll<HTMLElement>(SESAC_SELECTORS.autocompleteOption)
    ).filter((o) => o.offsetParent !== null);
    if (options.length > 0) {
      const exact = options.find((o) => (o.textContent || '').trim().toLowerCase() === target);
      const partial = options.find((o) => (o.textContent || '').trim().toLowerCase().includes(target));
      (exact || partial || options[0]).click();
      return true;
    }
    await sleep(100);
  }
  return false;
}

// ---------- Step 1 · Performance Details ----------

export async function fillSesacPerformanceDetails(
  event: SesacEventInput,
  onResult?: (r: SesacFillResult) => void
): Promise<SesacFillResult[]> {
  const results: SesacFillResult[] = [];
  const push = (r: SesacFillResult) => {
    results.push(r);
    onResult?.(r);
  };

  // Artist / performer name.
  const artist = findSesacField<HTMLInputElement>(STEP1_FIELDS.artistName);
  if (artist && event.artistName) {
    setSesacInputValue(artist, event.artistName);
    push({ step: 'artist-name', ok: true });
  } else {
    push({ step: 'artist-name', ok: false, detail: 'Artist/Performer Name field not found' });
  }

  // Billing — default to Headline unless explicitly a supporting act.
  const billingLabel = event.isHeadliner === false ? SESAC_SELECTORS.supportingLabel : SESAC_SELECTORS.headlineLabel;
  push({ step: 'billing', ok: clickMatRadioByLabel(billingLabel), detail: `Set "${billingLabel}"` });

  // Date — Kendo MaskedDateInput. LIVE-VALIDATED 2026-06-01: this field REJECTS
  // every programmatic fill we tried (native value-set + input event garbles it
  // to "MM/DD/0006"; execCommand insertText is ignored; synthetic keydown does
  // nothing) — only genuinely trusted typing works. So rather than corrupt it we
  // focus the field and ask the user to type the one date; everything else on
  // Step 1 auto-fills. (Future: route through the chrome.debugger CDP typing path
  // ASCAP uses for its trusted-input-only fields.)
  const dateStr = event.eventDateFormatted || formatSesacDate(event.eventDate);
  const dateEl = document.querySelector<HTMLInputElement>(SESAC_SELECTORS.datePickerInput);
  if (dateEl) {
    dateEl.focus();
    push({
      step: 'date',
      ok: false,
      detail: `Type the date yourself: ${dateStr} — SESAC's date box only accepts typed input (cursor is in it for you)`,
    });
  } else {
    push({ step: 'date', ok: false, detail: `Enter the date: ${dateStr}` });
  }

  // Country — setting it reveals the venue block.
  const country = findSesacField<HTMLSelectElement>(STEP1_FIELDS.country);
  if (country) {
    const ok = setSesacSelectValue(country, event.venueCountry || 'USA');
    push({ step: 'country', ok, detail: ok ? undefined : 'Country option not found' });
  } else {
    push({ step: 'country', ok: false, detail: 'Country select not found' });
  }

  // Wait for the venue block to render after Country.
  const venueEl = await waitFor(() => findSesacField<HTMLInputElement>(STEP1_FIELDS.venueName), 2500);
  if (!venueEl) {
    push({ step: 'venue', ok: false, detail: 'Venue block did not appear after Country — fill venue manually' });
    return results;
  }

  // Name of Venue (autocomplete) — picking a venue reveals the address block.
  if (event.venueName) {
    const picked = await fillAutocomplete(venueEl, event.venueName);
    push({
      step: 'venue-name',
      ok: picked,
      detail: picked ? `Picked "${event.venueName}"` : `Typed "${event.venueName}" — pick the matching venue from the dropdown`,
    });
  }

  // Address block (revealed after a venue is chosen).
  const addressEl = await waitFor(() => findSesacField<HTMLInputElement>(STEP1_FIELDS.venueAddress), 2000);
  if (addressEl && event.venueAddress && !addressEl.value) {
    const picked = await fillAutocomplete(addressEl, event.venueAddress);
    push({ step: 'venue-address', ok: picked, detail: picked ? undefined : 'Typed address — confirm the match' });
  }

  const cityEl = findSesacField<HTMLInputElement>(STEP1_FIELDS.venueCity);
  if (cityEl && event.venueCity && !cityEl.value) {
    setSesacInputValue(cityEl, event.venueCity);
    push({ step: 'venue-city', ok: true });
  }

  const stateEl = findSesacField<HTMLSelectElement>(STEP1_FIELDS.venueState);
  if (stateEl && event.venueState && !stateEl.value) {
    push({ step: 'venue-state', ok: setSesacSelectValue(stateEl, event.venueState) });
  }

  // Venue Capacity — SRT has no true capacity; fall back to the attendance count.
  const capEl = findSesacField<HTMLSelectElement>(STEP1_FIELDS.venueCapacity);
  if (capEl) {
    const capNum = event.venueCapacity ? parseInt(event.venueCapacity, 10) : event.attendance;
    const bucket = sesacAttendanceBucket(capNum ?? null);
    if (bucket) {
      push({ step: 'venue-capacity', ok: setSesacSelectValue(capEl, bucket), detail: bucket });
    } else {
      push({ step: 'venue-capacity', ok: false, detail: 'No capacity data — pick a range manually' });
    }
  }

  // Number of Attendees — from the attendance count.
  const attEl = findSesacField<HTMLSelectElement>(STEP1_FIELDS.attendees);
  if (attEl) {
    const bucket = sesacAttendanceBucket(event.attendance);
    if (bucket) {
      push({ step: 'attendees', ok: setSesacSelectValue(attEl, bucket), detail: bucket });
    } else {
      push({ step: 'attendees', ok: false, detail: 'No attendance data — pick a range manually' });
    }
  }

  // Admission fee checkbox.
  const feeCharged =
    event.ticketFee === true ||
    (typeof event.ticketCharge === 'string' && /^(yes|true|1)$/i.test(event.ticketCharge.trim()));
  if (feeCharged) {
    push({
      step: 'admission-fee',
      ok: setMatCheckboxByLabel(SESAC_SELECTORS.feeCheckboxLabel, true),
      detail: 'Checked admission fee',
    });
  }

  return results;
}

// ---------- Step 2 · Song Selection ----------

const SONG_FILTER_WAIT_MS = 700;
const TILE_POLL_TIMEOUT_MS = 2500;

async function pollForSongTile(title: string, timeoutMs: number): Promise<HTMLElement | null> {
  const target = normalizeSongTitle(title);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tiles = Array.from(document.querySelectorAll<HTMLElement>(SESAC_SELECTORS.songItem)).filter(
      (t) => t.offsetParent !== null
    );
    const exact = tiles.find((t) => {
      const v = t.querySelector(SESAC_SELECTORS.songItemValue)?.textContent || t.textContent || '';
      return normalizeSongTitle(v) === target;
    });
    const prefix = tiles.find((t) => {
      const v = normalizeSongTitle(
        t.querySelector(SESAC_SELECTORS.songItemValue)?.textContent || t.textContent || ''
      );
      return v.startsWith(target) || target.startsWith(v);
    });
    const hit = exact || prefix;
    if (hit) return hit;
    await sleep(150);
  }
  return null;
}

export async function fillSesacSongSelection(
  event: SesacEventInput,
  onResult?: (r: SesacFillResult) => void
): Promise<SesacFillResult[]> {
  const results: SesacFillResult[] = [];
  const push = (r: SesacFillResult) => {
    results.push(r);
    onResult?.(r);
  };
  const matched: string[] = [];
  const notFound: string[] = [];

  for (const song of event.songs) {
    const search = findSesacField<HTMLInputElement>(STEP2_FIELDS.songSearch);
    if (search) setSesacInputValue(search, song.title);
    await sleep(SONG_FILTER_WAIT_MS);

    const tile = await pollForSongTile(song.title, TILE_POLL_TIMEOUT_MS);
    if (!tile) {
      notFound.push(song.title);
      push({ step: `song:${song.title}`, ok: false, detail: 'No matching catalog tile' });
      if (search) setSesacInputValue(search, '');
      continue;
    }

    // Select the tile, then move it into the set list with arrow_right. Some
    // dual-lists also move on double-click — try that as a fallback.
    tile.click();
    await sleep(150);
    const arrow = findMatIconButton(SESAC_SELECTORS.moveRightIcon);
    if (arrow && !arrow.disabled) {
      arrow.click();
      matched.push(song.title);
      push({ step: `song:${song.title}`, ok: true, detail: 'Added to set list' });
    } else {
      tile.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      matched.push(song.title);
      push({ step: `song:${song.title}`, ok: true, detail: 'Added via double-click (no arrow button found)' });
    }
    await sleep(300);
    if (search) setSesacInputValue(search, '');
  }

  // Name the set list.
  const nameEl = findSesacField<HTMLInputElement>(STEP2_FIELDS.setListName);
  if (nameEl) {
    setSesacInputValue(nameEl, setlistNameFor(event));
    push({ step: 'set-list-name', ok: true, detail: setlistNameFor(event) });
  }

  // Save the set list (only if we actually added songs).
  if (matched.length > 0) {
    const saveBtn = findButtonByText(SESAC_SELECTORS.saveSetListButtonText);
    if (saveBtn) {
      saveBtn.click();
      push({ step: 'save-set-list', ok: true, detail: `Saved with ${matched.length} song(s)` });
    } else {
      push({ step: 'save-set-list', ok: false, detail: 'Click "Save As New Set List" yourself' });
    }
  }

  if (notFound.length > 0) {
    push({
      step: 'songs-summary',
      ok: false,
      detail: `${notFound.length} not matched: ${notFound.join(', ')} — add manually`,
    });
  }

  return results;
}
