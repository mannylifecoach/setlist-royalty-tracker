// ASCAP OnStage filler — handles two routes:
//   1. #onstage/performance/add — fillAscapPerformance(event)
//      Venue search → match-or-create → fill perf details → pick setlist from dropdown.
//   2. #onstage/setlist/add — fillAscapSetlist(event)
//      Set setlist name + open Add Works (user picks each song from ASCAP catalog).
//
// Both flows are user-handoff at reCAPTCHA + Submit. We do everything we can up
// to that wall.

import {
  PERF_ADD_FIELDS,
  VENUE_RESULTS_FIELDS,
  VENUE_DETAIL_FIELDS,
  SETLIST_ADD_FIELDS,
  WORKS_CATALOG_SEARCH_FIELDS,
  setInputValueAscap,
  setBootstrapSelectValue,
  setCheckbox,
  findAscapField,
} from './ascap-selectors';

export interface AscapEventSong {
  performanceId: string;
  title: string;
  ascapWorkId: string | null;
  durationSeconds: number | null;
}

export interface AscapEventInput {
  artistName: string;
  eventDate: string; // YYYY-MM-DD
  eventDateFormatted?: string; // MM/DD/YYYY (we'll derive if absent)
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueState: string | null;
  venueCountry: string | null;
  venueZip: string | null;
  startTimeHour: string | null;
  startTimeAmPm: string | null;
  perfType?: string | null;
  liveStreamViews?: number | null;
  ticketFee?: boolean;
  advanceTickets?: boolean;
  songs: AscapEventSong[];
}

export interface AscapFillResult {
  step: string;
  ok: boolean;
  detail?: string;
}

// ---------- Pure helpers (exported for tests) ----------

// ASCAP's perfStartHours dropdown is 0-23 (24-hour clock). SRT stores hours
// as a 12-hour string like '8:00' plus a separate 'AM' / 'PM'.
export function convertHourTo24(
  hour: string | null | undefined,
  ampm: string | null | undefined
): number | null {
  if (!hour) return null;
  const h = parseInt(hour.split(':')[0], 10);
  if (isNaN(h)) return null;
  if (h < 0 || h > 23) return null;
  if (!ampm) return h;
  const upper = ampm.toUpperCase();
  if (upper === 'PM' && h !== 12) return h + 12;
  if (upper === 'AM' && h === 12) return 0;
  return h;
}

export function formatPerfDate(eventDate: string): string {
  // YYYY-MM-DD → MM/DD/YYYY (ASCAP datepicker format).
  const m = eventDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return eventDate;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

// Total set duration in minutes from per-song seconds. ASCAP's duration field
// is integer minutes for the whole set. Defaults to 60 when no songs carry
// duration data — better to over-claim a typical set than enter blank.
export function calculateSetDurationMinutes(songs: AscapEventSong[]): number {
  const total = songs.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  if (total <= 0) return 60;
  return Math.max(1, Math.round(total / 60));
}

// Convention: setlists named "<artist> - <YYYY-MM-DD>" so the Performance
// page's setlist dropdown picker can find them by string match. The Setlist
// Add filler uses the same name when creating.
export function setlistNameFor(event: Pick<AscapEventInput, 'artistName' | 'eventDate'>): string {
  return `${event.artistName} - ${event.eventDate}`;
}

// ---------- Performance Add flow ----------

const SHORT_WAIT_MS = 200;
const VENUE_RESULTS_TIMEOUT_MS = 2500;

export async function fillAscapPerformance(
  event: AscapEventInput,
  onResult?: (result: AscapFillResult) => void
): Promise<AscapFillResult[]> {
  const results: AscapFillResult[] = [];
  const push = (r: AscapFillResult) => {
    results.push(r);
    onResult?.(r);
  };

  // 1. Venue search.
  if (event.venueName && event.venueState) {
    push(await fillVenueSearch(event));
  } else {
    push({
      step: 'venue-search',
      ok: false,
      detail: 'Performance has no venue name + state — skipped venue search',
    });
  }

  // 2. Performance details (artist, type, date, duration, start time, fee/advance).
  fillPerfDetails(event).forEach(push);

  // 3. Setlist dropdown — try to pick existing setlist by name. If none, surface
  // a clear message; the user can click the page's Create Setlist button.
  push(pickSetlistFromDropdown(event));

  return results;
}

async function fillVenueSearch(event: AscapEventInput): Promise<AscapFillResult> {
  const searchInput = findAscapField<HTMLInputElement>(PERF_ADD_FIELDS.searchVenueName);
  const stateSelect = findAscapField<HTMLSelectElement>(PERF_ADD_FIELDS.searchVenueState);
  const searchBtn = findAscapField<HTMLButtonElement>(PERF_ADD_FIELDS.venueSearchButton);

  if (!searchInput || !stateSelect || !searchBtn) {
    return { step: 'venue-search', ok: false, detail: 'Search controls not found' };
  }

  setInputValueAscap(searchInput, event.venueName!);
  setBootstrapSelectValue(stateSelect, event.venueState!);
  await wait(SHORT_WAIT_MS);
  searchBtn.click();

  const matched = await pollForVenueMatch(event.venueName!, VENUE_RESULTS_TIMEOUT_MS);
  if (matched) {
    return { step: 'venue-search', ok: true, detail: `Selected matching venue "${event.venueName}"` };
  }

  // No match — fall back to "Add New Venue" + populate address fields.
  const addNewBtn = findAscapField<HTMLButtonElement>(VENUE_RESULTS_FIELDS.addNewVenueButton);
  if (!addNewBtn) {
    return {
      step: 'venue-search',
      ok: false,
      detail: 'No matching venue found and Add New Venue button not present',
    };
  }
  addNewBtn.click();
  await wait(SHORT_WAIT_MS);
  fillVenueAddress(event);
  return {
    step: 'venue-search',
    ok: true,
    detail: 'No match — filled new-venue form. Review the address before submitting.',
  };
}

async function pollForVenueMatch(venueName: string, timeoutMs: number): Promise<boolean> {
  const target = venueName.trim().toLowerCase();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const container = document.querySelector(VENUE_RESULTS_FIELDS.resultsContainer);
    if (container) {
      const rows = Array.from(container.querySelectorAll(VENUE_RESULTS_FIELDS.resultRow));
      for (const row of rows) {
        const nameEl = row.querySelector(VENUE_RESULTS_FIELDS.resultVenueName);
        const text = nameEl?.textContent?.trim().toLowerCase() ?? '';
        if (text === target) {
          const selectBtn = row.querySelector<HTMLButtonElement>(
            VENUE_RESULTS_FIELDS.selectVenueButton
          );
          if (selectBtn) {
            selectBtn.click();
            return true;
          }
        }
      }
      // Container rendered but no exact match — return so we can fall back.
      if (rows.length > 0) return false;
      // Empty-state container with the Add New Venue button → also done waiting.
      if (container.querySelector(VENUE_RESULTS_FIELDS.addNewVenueButton)) return false;
    }
    await wait(100);
  }
  return false;
}

function fillVenueAddress(event: AscapEventInput): void {
  const venueName = findAscapField<HTMLInputElement>(VENUE_DETAIL_FIELDS.venueName);
  if (venueName && event.venueName) setInputValueAscap(venueName, event.venueName);

  const addressLine1 = findAscapField<HTMLInputElement>(VENUE_DETAIL_FIELDS.addressLine1);
  if (addressLine1 && event.venueAddress) setInputValueAscap(addressLine1, event.venueAddress);

  const city = findAscapField<HTMLInputElement>(VENUE_DETAIL_FIELDS.city);
  if (city && event.venueCity) setInputValueAscap(city, event.venueCity);

  const state = findAscapField<HTMLSelectElement>(VENUE_DETAIL_FIELDS.stateCde);
  if (state && event.venueState) setBootstrapSelectValue(state, event.venueState);

  const zip = findAscapField<HTMLInputElement>(VENUE_DETAIL_FIELDS.postalCode);
  if (zip && event.venueZip) setInputValueAscap(zip, event.venueZip);

  const country = findAscapField<HTMLSelectElement>(VENUE_DETAIL_FIELDS.country);
  if (country) setBootstrapSelectValue(country, event.venueCountry || 'US');
}

function fillPerfDetails(event: AscapEventInput): AscapFillResult[] {
  const out: AscapFillResult[] = [];

  const perfArtist = findAscapField<HTMLInputElement>(PERF_ADD_FIELDS.perfArtistName);
  if (perfArtist && event.artistName) {
    setInputValueAscap(perfArtist, event.artistName);
    out.push({ step: 'artist-name', ok: true });
  }

  const perfType = findAscapField<HTMLSelectElement>(PERF_ADD_FIELDS.perfTypeCode);
  if (perfType) {
    const filled = setBootstrapSelectValue(perfType, event.perfType || 'CNCRT');
    out.push({ step: 'perf-type', ok: filled, detail: filled ? undefined : 'Type code not in dropdown' });
  }

  const perfDate = findAscapField<HTMLInputElement>(PERF_ADD_FIELDS.perfDate);
  if (perfDate) {
    setInputValueAscap(perfDate, event.eventDateFormatted || formatPerfDate(event.eventDate));
    out.push({ step: 'perf-date', ok: true });
  }

  const duration = findAscapField<HTMLInputElement>(PERF_ADD_FIELDS.duration);
  if (duration) {
    const minutes = calculateSetDurationMinutes(event.songs);
    setInputValueAscap(duration, String(minutes));
    out.push({ step: 'duration', ok: true, detail: `${minutes} minutes` });
  }

  const startHours = findAscapField<HTMLSelectElement>(PERF_ADD_FIELDS.perfStartHours);
  if (startHours) {
    const h24 = convertHourTo24(event.startTimeHour, event.startTimeAmPm);
    if (h24 !== null) {
      const filled = setBootstrapSelectValue(startHours, String(h24));
      out.push({ step: 'start-hours', ok: filled });
    }
  }

  const startMinutes = findAscapField<HTMLSelectElement>(PERF_ADD_FIELDS.perfStartMinutes);
  if (startMinutes) {
    // SRT stores hours like '8:00' but no minute granularity beyond that, so
    // default to '0'. User can edit on form if needed.
    setBootstrapSelectValue(startMinutes, '0');
  }

  const fee = findAscapField<HTMLInputElement>(PERF_ADD_FIELDS.feeChargedCheckbox);
  if (fee) setCheckbox(fee, !!event.ticketFee);

  const advance = findAscapField<HTMLInputElement>(PERF_ADD_FIELDS.advanceTicketsCheckbox);
  if (advance) setCheckbox(advance, !!event.advanceTickets);

  // Live-stream views only relevant for LISTM (live streaming) perf type.
  if (event.perfType === 'LISTM') {
    const views = findAscapField<HTMLInputElement>(PERF_ADD_FIELDS.numPerfViews);
    if (views && event.liveStreamViews != null) {
      setInputValueAscap(views, String(event.liveStreamViews));
      out.push({ step: 'live-stream-views', ok: true });
    }
  }

  return out;
}

function pickSetlistFromDropdown(event: AscapEventInput): AscapFillResult {
  const dropdown = findAscapField<HTMLSelectElement>(PERF_ADD_FIELDS.setlistDropdown);
  if (!dropdown) {
    return { step: 'setlist', ok: false, detail: 'Setlist dropdown not present' };
  }
  const expectedName = setlistNameFor(event);
  const filled = setBootstrapSelectValue(dropdown, expectedName);
  if (filled) {
    return { step: 'setlist', ok: true, detail: `Selected setlist "${expectedName}"` };
  }
  return {
    step: 'setlist',
    ok: false,
    detail: `No setlist named "${expectedName}" — create one first via #onstage/setlist/add`,
  };
}

// ---------- Setlist Add flow ----------

export async function fillAscapSetlist(
  event: AscapEventInput,
  onResult?: (result: AscapFillResult) => void
): Promise<AscapFillResult[]> {
  const results: AscapFillResult[] = [];
  const push = (r: AscapFillResult) => {
    results.push(r);
    onResult?.(r);
  };

  const nameInput = findAscapField<HTMLInputElement>(SETLIST_ADD_FIELDS.setlistName);
  if (nameInput) {
    setInputValueAscap(nameInput, setlistNameFor(event));
    push({ step: 'setlist-name', ok: true });
  } else {
    push({ step: 'setlist-name', ok: false, detail: 'Setlist name input not found' });
  }

  // Open the Add Works catalog. We populate the search field with the song's
  // ASCAP work id (when SRT has it) or fuzzy by title — the user picks the
  // matching result from ASCAP's catalog. We don't auto-click the result row
  // because the catalog modal's row-level Select selector wasn't captured in
  // the inspection pass; rather than guess, we leave the picked-result step
  // for the user. Each song search counts as a partial fill.
  const addWorksBtn = findAscapField<HTMLAnchorElement>(SETLIST_ADD_FIELDS.addWorksButton);
  if (!addWorksBtn) {
    push({ step: 'add-works', ok: false, detail: 'Add Works button not found' });
    return results;
  }
  addWorksBtn.click();
  await wait(SHORT_WAIT_MS);

  for (const song of event.songs) {
    push(await prepareWorkSearch(song));
  }

  return results;
}

async function prepareWorkSearch(song: AscapEventSong): Promise<AscapFillResult> {
  const workIdInput = findAscapField<HTMLInputElement>(WORKS_CATALOG_SEARCH_FIELDS.workId);
  const titleInput = findAscapField<HTMLInputElement>(WORKS_CATALOG_SEARCH_FIELDS.workTitle);
  const searchBtn = findAscapField<HTMLButtonElement>(
    WORKS_CATALOG_SEARCH_FIELDS.searchApplyButton
  );
  if (!searchBtn || (!workIdInput && !titleInput)) {
    return {
      step: `song-search:${song.title}`,
      ok: false,
      detail: 'Catalog search controls not found',
    };
  }

  // Clear both inputs each iteration — leftover values from a previous song's
  // search would otherwise route the next click down the wrong branch.
  if (workIdInput) setInputValueAscap(workIdInput, '');
  if (titleInput) setInputValueAscap(titleInput, '');

  // Prefer Work ID — exact match.
  if (song.ascapWorkId && workIdInput) {
    setInputValueAscap(workIdInput, song.ascapWorkId);
    searchBtn.click();
    await wait(SHORT_WAIT_MS);
    return {
      step: `song-search:${song.title}`,
      ok: true,
      detail: `Searched by work id ${song.ascapWorkId} — pick the result and click Add`,
    };
  }
  // Fallback to title search.
  if (titleInput) {
    setInputValueAscap(titleInput, song.title);
    searchBtn.click();
    await wait(SHORT_WAIT_MS);
    return {
      step: `song-search:${song.title}`,
      ok: true,
      detail: 'Searched by title — pick the result and click Add',
    };
  }
  return {
    step: `song-search:${song.title}`,
    ok: false,
    detail: 'Catalog search controls not found',
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
