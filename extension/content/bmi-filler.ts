import { FIELD_MAP, findField } from './selectors';

interface EventData {
  eventKey: string;
  artistName: string;
  eventDate: string;
  eventDateFormatted: string;
  eventName: string | null;
  eventType: string | null;
  startTimeHour: string | null;
  startTimeAmPm: string | null;
  endTimeHour: string | null;
  endTimeAmPm: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueState: string | null;
  venueZip: string | null;
  venuePhone: string | null;
  venueType: string | null;
  venueCapacity: string | null;
  attendance: number | null;
  attendanceRange: string;
  ticketCharge: string | null;
  songs: { performanceId: string; title: string; bmiWorkId: string | null }[];
}

interface FillResult {
  field: string;
  status: 'filled' | 'not_found' | 'skipped';
}

// Set value on an input/select and dispatch events so Syncfusion picks it up
function setInputValue(el: HTMLElement, value: string): boolean {
  if (el instanceof HTMLInputElement) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;
    if (nativeSetter) nativeSetter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }
  if (el instanceof HTMLSelectElement) {
    const option = Array.from(el.options).find(
      (o) =>
        o.value === value ||
        o.textContent?.trim().toLowerCase() === value.toLowerCase()
    );
    if (option) {
      el.value = option.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    // Partial match for attendance ranges like "0 - 250"
    const partial = Array.from(el.options).find(
      (o) => o.textContent?.toLowerCase().includes(value.toLowerCase())
    );
    if (partial) {
      el.value = partial.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }
  return false;
}

// Toggle a checkbox (Syncfusion uses aria-label="switch" for toggles)
function setCheckbox(el: HTMLElement, checked: boolean): boolean {
  if (el instanceof HTMLInputElement && el.type === 'checkbox') {
    if (el.checked !== checked) {
      el.click();
    }
    return true;
  }
  return false;
}

// Try to fill a single field using the FIELD_MAP
function fillField(fieldName: string, value: string | null): FillResult {
  if (!value) return { field: fieldName, status: 'skipped' };

  const spec = FIELD_MAP[fieldName];
  if (!spec) return { field: fieldName, status: 'not_found' };

  const el = findField(spec);
  if (!el) return { field: fieldName, status: 'not_found' };

  if (spec.type === 'checkbox') {
    const ok = setCheckbox(el, value === 'true' || value === 'yes' || value === '1');
    return { field: fieldName, status: ok ? 'filled' : 'not_found' };
  }

  const ok = setInputValue(el, value);
  return { field: fieldName, status: ok ? 'filled' : 'not_found' };
}

// Fill Step 1 — Details + Venue
// BMI's date inputs are `<input type="date">` which require YYYY-MM-DD. The
// API's eventDateFormatted is MM/DD/YYYY (for display) so we use the raw
// eventDate field for filling.
async function fillDetails(event: EventData): Promise<FillResult[]> {
  const results: FillResult[] = [];

  // Details fields (sync)
  results.push(fillField('bandPerformer', event.artistName));
  results.push(fillField('eventName', event.eventName));
  results.push(fillField('eventType', event.eventType));
  results.push(fillField('startDate', event.eventDate));
  results.push(fillField('startTime', event.startTimeHour));
  results.push(fillField('startAmPm', event.startTimeAmPm));
  results.push(fillField('endDate', event.eventDate));
  results.push(fillField('endTime', event.endTimeHour));
  results.push(fillField('endAmPm', event.endTimeAmPm));
  results.push(fillField('attendance', event.attendanceRange));
  results.push(fillField('ticketCharge', event.ticketCharge));

  // Venue — async flow: try previously-performed → search → create new
  results.push(...(await fillVenue(event)));

  return results;
}

// Fill the venue section. Strategy:
// 1. If venue appears in "Previously performed venues" dropdown, pick it.
// 2. Otherwise fill State+City+VenueName, click Search, wait for results.
// 3. If search finds a match in the inline results list, click its Select button.
// 4. If "no match," click "Create a new venue" and fill the modal (user saves).
async function fillVenue(event: EventData): Promise<FillResult[]> {
  const results: FillResult[] = [];
  if (!event.venueName) return results;

  // 1. Previously performed venues dropdown
  const prevEl = findField(FIELD_MAP.previousVenues);
  if (prevEl instanceof HTMLSelectElement) {
    const matched = Array.from(prevEl.options).find((o) =>
      o.textContent?.toLowerCase().includes(event.venueName!.toLowerCase())
    );
    if (matched) {
      prevEl.value = matched.value;
      prevEl.dispatchEvent(new Event('change', { bubbles: true }));
      results.push({ field: 'venue', status: 'filled' });
      return results;
    }
  }

  // 2. Fill search criteria (State → wait for City options to populate → City → VenueName)
  results.push(fillField('venueState', event.venueState));
  await sleep(700); // allow Syncfusion City cascade to populate options
  results.push(fillField('venueCity', event.venueCity));
  results.push(fillField('venueName', event.venueName));

  // 3. Click the Search button inside the venue panel
  const searchBtn = findVenueSearchButton();
  if (!searchBtn) {
    results.push({ field: 'venue.search_button', status: 'not_found' });
    return results;
  }
  searchBtn.click();
  await sleep(1500); // wait for search results / no-match message

  // 4. Check inline results (.venue-results .list--item) for a matching venue
  const items = document.querySelectorAll<HTMLElement>('.venue-results .list--item');
  const nameLower = event.venueName.toLowerCase();
  for (const item of items) {
    const label = item.querySelector('.list--item--title h6')?.textContent?.trim().toLowerCase() || '';
    if (label && label === nameLower) {
      const selectBtn = item.querySelector<HTMLElement>('button.selectVenue');
      if (selectBtn) {
        selectBtn.click();
        results.push({ field: 'venue.search_match', status: 'filled' });
        return results;
      }
    }
  }

  // 5. No match — open Create a new venue modal
  const createBtn = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent?.trim() === 'Create a new venue'
  );
  if (!createBtn) {
    results.push({ field: 'venue.create_button', status: 'not_found' });
    return results;
  }
  createBtn.click();
  await sleep(800); // modal opens

  results.push(...fillCreateNewVenueModal(event));
  return results;
}

function findVenueSearchButton(): HTMLButtonElement | null {
  const buttons = document.querySelectorAll<HTMLButtonElement>('button.e-primary');
  for (const b of buttons) {
    if (b.textContent?.trim() === 'Search') return b;
  }
  return null;
}

// Fill the "Create a new venue" modal. DOM mapped 2026-04-24: labels
// preceding-sibling their input groups; State/City/Type/Capacity are selects
// with id prefixes StateCode_/City_/TypeId_/CapacityId_; Zip has placeholder,
// Phone has name="phone". Does NOT click Save — user reviews & submits.
function fillCreateNewVenueModal(event: EventData): FillResult[] {
  const results: FillResult[] = [];
  const dialog = [...document.querySelectorAll<HTMLElement>('.e-dialog')].find(
    (d) => window.getComputedStyle(d).display !== 'none'
  );
  if (!dialog) {
    results.push({ field: 'venue.modal', status: 'not_found' });
    return results;
  }

  const inputByLabel = (text: string): HTMLInputElement | null => {
    const label = [...dialog.querySelectorAll('label')].find(
      (l) => l.textContent?.trim() === text
    );
    return (label?.parentElement?.querySelector<HTMLInputElement>(
      'input.e-textbox, input[type="text"]'
    )) || null;
  };

  if (event.venueName) {
    const el = inputByLabel('Venue Name');
    if (el) { setInputValue(el, event.venueName); results.push({ field: 'modal.venueName', status: 'filled' }); }
  }
  if (event.venueAddress) {
    const el = inputByLabel('Address');
    if (el) { setInputValue(el, event.venueAddress); results.push({ field: 'modal.address', status: 'filled' }); }
  }
  if (event.venueState) {
    const el = dialog.querySelector<HTMLSelectElement>('select[id^="StateCode_"]');
    if (el) { setInputValue(el, event.venueState); results.push({ field: 'modal.state', status: 'filled' }); }
  }
  if (event.venueZip) {
    const el = dialog.querySelector<HTMLInputElement>('input[placeholder="Zip"]');
    if (el) { setInputValue(el, event.venueZip); results.push({ field: 'modal.zip', status: 'filled' }); }
  }
  if (event.venuePhone) {
    const el = dialog.querySelector<HTMLInputElement>('input[name="phone"]');
    if (el) { setInputValue(el, event.venuePhone); results.push({ field: 'modal.phone', status: 'filled' }); }
  }

  // Venue Type — best-effort fuzzy match against SRT-provided venueType
  if (event.venueType) {
    const typeEl = dialog.querySelector<HTMLSelectElement>('select[id^="TypeId_"]');
    if (typeEl) {
      const opt = Array.from(typeEl.options).find((o) =>
        o.textContent?.toLowerCase().includes(event.venueType!.toLowerCase())
      );
      if (opt) {
        typeEl.value = opt.value;
        typeEl.dispatchEvent(new Event('change', { bubbles: true }));
        results.push({ field: 'modal.venueType', status: 'filled' });
      }
    }
  }

  // Venue Capacity — map from attendance range
  if (event.attendanceRange) {
    const capEl = dialog.querySelector<HTMLSelectElement>('select[id^="CapacityId_"]');
    if (capEl) {
      const opt = Array.from(capEl.options).find((o) =>
        o.textContent?.includes(event.attendanceRange)
      );
      if (opt) {
        capEl.value = opt.value;
        capEl.dispatchEvent(new Event('change', { bubbles: true }));
        results.push({ field: 'modal.venueCapacity', status: 'filled' });
      }
    }
  }

  // City — fire after State cascade populates options
  if (event.venueCity) {
    setTimeout(() => {
      const cityEl = dialog.querySelector<HTMLSelectElement>('select[id^="City_"]');
      if (!cityEl) return;
      const opt = Array.from(cityEl.options).find(
        (o) => o.textContent?.trim().toLowerCase() === event.venueCity!.toLowerCase()
      );
      if (opt) {
        cityEl.value = opt.value;
        cityEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 1200);
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ----- Auto-advance (FILL_ALL) orchestration -----

let srtAbortFlag = false;

function isModalOpen(): boolean {
  return [...document.querySelectorAll<HTMLElement>('.e-dialog')].some(
    (d) => window.getComputedStyle(d).display !== 'none'
  );
}

async function waitForModalClose(timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (srtAbortFlag) return false;
    if (!isModalOpen()) return true;
    await sleep(400);
  }
  return false;
}

function hasValidationErrors(): boolean {
  // Narrow: only count Bootstrap's .invalid-feedback (shown when a field actually
  // failed validation) that is visibly rendered and has real error text.
  // Skip .text-danger because BMI uses it for required-field asterisks even when
  // the form is valid, which caused false-positive halts.
  const errorEls = document.querySelectorAll<HTMLElement>('.invalid-feedback');
  for (const e of errorEls) {
    const style = window.getComputedStyle(e);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const txt = (e.textContent || '').trim();
    if (txt.length > 0) return true;
  }
  return false;
}

function findNextButton(): HTMLButtonElement | null {
  const primary = [...document.querySelectorAll<HTMLButtonElement>('button.e-primary')];
  return primary.find((b) => b.textContent?.trim() === 'Next') ?? null;
}

async function clickNextAndWaitFor(selector: string, timeoutMs: number): Promise<boolean> {
  const btn = findNextButton();
  if (!btn) return false;
  btn.click();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (srtAbortFlag) return false;
    if (document.querySelector(selector)) return true;
    await sleep(150);
  }
  return false;
}

function hasWarrantyCheckbox(): boolean {
  return [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].some((cb) => {
    const lbl = cb.closest('label');
    return !!lbl && /warranting|representing/i.test(lbl.textContent || '');
  });
}

async function clickNextAndWaitForStep3(timeoutMs: number): Promise<boolean> {
  const btn = findNextButton();
  if (!btn) return false;
  btn.click();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (srtAbortFlag) return false;
    if (hasWarrantyCheckbox()) return true;
    await sleep(150);
  }
  return false;
}

function escapeText(t: string): string {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

// Run Step 1 → Next → Step 2 → Next → pause on Step 3 for user to submit.
async function fillAll(event: EventData, overlay: HTMLElement): Promise<void> {
  srtAbortFlag = false;
  const startStep = detectWizardStep();
  let step1Results: FillResult[] = [];
  let setlistResult: { matched: string[]; notFound: string[] } = { matched: [], notFound: [] };

  const render = (status: string, note = '', isError = false) =>
    renderProgressOverlay(overlay, status, note, step1Results, setlistResult, isError);

  if (startStep === 1) {
    render('Step 1/3 · Filling details + venue');
    step1Results = await fillDetails(event);
    if (srtAbortFlag) return render('Stopped by user');

    if (isModalOpen()) {
      render(
        'Step 1/3 · Fill remaining venue fields, click Save to continue',
        'Extension auto-filled what SRT had. Fill Address/Zip/Phone/Type manually if blank, then click Save on the modal.'
      );
      // 5-minute wait — real users need time to type the blanks
      const closed = await waitForModalClose(300_000);
      if (!closed || srtAbortFlag) {
        return render(
          'Stopped',
          'Timed out waiting for venue modal to close. After you click Save on the modal, click Auto-Fill Performance again to resume.',
          true
        );
      }
    }

    if (hasValidationErrors()) {
      return render(
        'Step 1/3 · Validation errors',
        'Fix red-flagged fields on the page, then click Next manually.',
        true
      );
    }

    render('Step 1/3 · Advancing to Setlist…');
    const reached = await clickNextAndWaitFor('#tbSongSearch', 5000);
    if (!reached || srtAbortFlag) {
      return render('Stopped', 'Could not reach Step 2 — click Next manually.', true);
    }
  }

  if (startStep === 1 || startStep === 2) {
    render('Step 2/3 · Filling setlist…');
    setlistResult = await fillSetlist(event.songs);
    if (srtAbortFlag) return render('Stopped');

    if (setlistResult.notFound.length > 0) {
      return render(
        'Step 2/3 · Some songs not matched',
        `${setlistResult.notFound.length} not found: ${setlistResult.notFound.join(', ')}. Add manually, then click Next.`,
        true
      );
    }

    render('Step 2/3 · Advancing to Summary…');
    const reached = await clickNextAndWaitForStep3(5000);
    if (!reached || srtAbortFlag) {
      return render('Stopped', 'Could not reach Step 3 — click Next manually.', true);
    }
  }

  showSummaryOverlay(event, overlay);
}

function renderProgressOverlay(
  overlay: HTMLElement,
  status: string,
  note: string,
  step1Results: FillResult[],
  setlistResult: { matched: string[]; notFound: string[] },
  isError: boolean
): void {
  const filled = step1Results.filter((r) => r.status === 'filled').length;
  const skipped = step1Results.filter((r) => r.status === 'skipped').length;
  const notFoundCount = step1Results.filter((r) => r.status === 'not_found').length;
  const matchedSongs = setlistResult.matched.length;
  const unmatchedSongs = setlistResult.notFound.length;

  const statusClass = isError ? 'srt-warning' : 'srt-info';
  const icon = isError ? '&#9888;' : '&#8594;';

  overlay.innerHTML = `
    <div class="srt-overlay-header">
      <span class="srt-overlay-title">Auto-Fill Performance</span>
      <button class="srt-overlay-close" id="srt-close">&times;</button>
    </div>
    <div class="srt-overlay-body">
      <div class="srt-status-group ${statusClass}">
        <span class="srt-icon">${icon}</span>
        <span>${escapeText(status)}</span>
      </div>
      ${note ? `<p class="srt-note">${escapeText(note)}</p>` : ''}
      ${step1Results.length > 0 ? `<div class="srt-status-group srt-success">
        <span class="srt-icon">&#10003;</span>
        <span>Step 1: ${filled} filled${skipped ? `, ${skipped} skipped` : ''}${notFoundCount ? `, ${notFoundCount} not found` : ''}</span>
      </div>` : ''}
      ${(matchedSongs + unmatchedSongs) > 0 ? `<div class="srt-status-group srt-success">
        <span class="srt-icon">&#10003;</span>
        <span>Step 2: ${matchedSongs} songs added${unmatchedSongs ? `, ${unmatchedSongs} not matched` : ''}</span>
      </div>` : ''}
      <button class="srt-btn-stop" id="srt-stop">Stop</button>
    </div>
  `;

  overlay.querySelector('#srt-close')?.addEventListener('click', () => {
    srtAbortFlag = true;
    overlay.remove();
  });
  overlay.querySelector('#srt-stop')?.addEventListener('click', () => {
    srtAbortFlag = true;
  });
}

// Fill Step 2 — Setlist
// BMI renders the catalog as rows: <button.btn-link> (title) + <button.ols-btn-outline-blue> (add) + <input.e-checkbox>.
// Type title into #tbSongSearch, wait for the client-side filter to apply, then click the matching row's add button.
// Titles render in uppercase (CSS text-transform appears to be reflected in textContent) — compare case-insensitive.
async function fillSetlist(
  songs: EventData['songs']
): Promise<{ matched: string[]; notFound: string[] }> {
  // Debug trace — inspect via window.__srt_setlist_dbg after a run
  const dbg: Record<string, unknown>[] = [];
  (window as unknown as { __srt_setlist_dbg: unknown[] }).__srt_setlist_dbg = dbg;
  const log = (step: string, extra: Record<string, unknown> = {}) =>
    dbg.push({ step, ts: Date.now(), ...extra });

  const matched: string[] = [];
  const notFound: string[] = [];
  // Normalize: collapse any whitespace (incl. non-breaking  ) + trim + uppercase
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toUpperCase();

  log('entry', {
    catalogCount: document.querySelectorAll('button.btn-link').length,
    songs: songs.map((s) => s.title),
  });

  // Wait for the song catalog to finish rendering (can lag after step advance)
  for (let i = 0; i < 20; i++) {
    if (document.querySelectorAll('button.btn-link').length > 0) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  log('catalog-ready', { count: document.querySelectorAll('button.btn-link').length });

  for (const song of songs) {
    // Re-resolve each iteration: BMI may replace the DOM node
    const searchEl = findField(FIELD_MAP.songSearch) as HTMLInputElement | null;
    log('song-start', { title: song.title, searchEl: !!searchEl, connected: searchEl?.isConnected });
    if (searchEl) setInputValue(searchEl, song.title);
    log('song-typed', { title: song.title, searchValue: searchEl?.value, catalogNow: document.querySelectorAll('button.btn-link').length });

    const target = normalize(song.title);
    let titleBtn: HTMLButtonElement | null = null;
    const pollStart = Date.now();
    let pollCount = 0;
    while (Date.now() - pollStart < 2500) {
      pollCount++;
      const candidates = [...document.querySelectorAll<HTMLButtonElement>('button.btn-link')];
      titleBtn =
        (candidates.find((b) => normalize(b.textContent || '') === target) as HTMLButtonElement | undefined) ||
        (candidates.find((b) => {
          const t = normalize(b.textContent || '');
          return t.startsWith(target) || target.startsWith(t);
        }) as HTMLButtonElement | undefined) ||
        null;
      if (titleBtn) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    log('song-poll-done', { title: song.title, pollCount, matched: !!titleBtn, catalog: document.querySelectorAll('button.btn-link').length, firstTitles: [...document.querySelectorAll<HTMLButtonElement>('button.btn-link')].slice(0, 5).map((b) => b.textContent?.trim() || '') });

    if (!titleBtn) {
      notFound.push(song.title);
      continue;
    }

    const addBtn =
      titleBtn.parentElement?.querySelector<HTMLElement>('button.ols-btn-outline-blue') ??
      titleBtn
        .closest('[class*="row"], .d-flex, div')
        ?.querySelector<HTMLElement>('button.ols-btn-outline-blue') ??
      null;

    if (addBtn) {
      addBtn.click();
      matched.push(song.title);
      await new Promise((r) => setTimeout(r, 250)); // settle for next iteration
    } else {
      notFound.push(song.title);
    }
  }

  if (searchEl) setInputValue(searchEl, '');
  return { matched, notFound };
}

// Floating overlay UI
function createOverlay(): HTMLElement {
  const existing = document.getElementById('srt-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'srt-overlay';
  overlay.className = 'srt-overlay';
  document.body.appendChild(overlay);
  return overlay;
}

function showFillResults(results: FillResult[], overlay: HTMLElement) {
  const filled = results.filter((r) => r.status === 'filled');
  const notFound = results.filter((r) => r.status === 'not_found');
  const skipped = results.filter((r) => r.status === 'skipped');

  overlay.innerHTML = `
    <div class="srt-overlay-header">
      <span class="srt-overlay-title">BMI Auto-Fill</span>
      <button class="srt-overlay-close" id="srt-close">&times;</button>
    </div>
    <div class="srt-overlay-body">
      ${filled.length > 0
        ? `<div class="srt-status-group srt-success">
            <span class="srt-icon">&#10003;</span> ${filled.length} fields filled
          </div>`
        : ''}
      ${notFound.length > 0
        ? `<div class="srt-status-group srt-warning">
            <span class="srt-icon">&#9888;</span> ${notFound.length} not found: ${notFound.map((r) => r.field).join(', ')}
          </div>`
        : ''}
      ${skipped.length > 0
        ? `<div class="srt-status-group srt-info">
            <span class="srt-icon">&#8212;</span> ${skipped.length} skipped (no data)
          </div>`
        : ''}
    </div>
  `;

  overlay.querySelector('#srt-close')?.addEventListener('click', () => {
    overlay.remove();
  });
}

function showSetlistResults(
  matched: string[],
  notFound: string[],
  overlay: HTMLElement
) {
  overlay.innerHTML = `
    <div class="srt-overlay-header">
      <span class="srt-overlay-title">Setlist Auto-Fill</span>
      <button class="srt-overlay-close" id="srt-close">&times;</button>
    </div>
    <div class="srt-overlay-body">
      ${matched.length > 0
        ? `<div class="srt-status-group srt-success">
            <span class="srt-icon">&#10003;</span> ${matched.length} songs added: ${matched.join(', ')}
          </div>`
        : ''}
      ${notFound.length > 0
        ? `<div class="srt-status-group srt-warning">
            <span class="srt-icon">&#9888;</span> ${notFound.length} not found: ${notFound.join(', ')}
          </div>`
        : ''}
    </div>
  `;

  overlay.querySelector('#srt-close')?.addEventListener('click', () => {
    overlay.remove();
  });
}

function showSummaryOverlay(event: EventData, overlay: HTMLElement) {
  const performanceIds = event.songs.map((s) => s.performanceId);

  overlay.innerHTML = `
    <div class="srt-overlay-header">
      <span class="srt-overlay-title">Review &amp; Submit</span>
      <button class="srt-overlay-close" id="srt-close">&times;</button>
    </div>
    <div class="srt-overlay-body">
      <p>Review the summary above and submit to BMI.</p>
      <p>After BMI confirms, click below to update your tracker.</p>
      <button class="srt-btn-submit" id="srt-mark-submitted">Mark Submitted</button>
      <div id="srt-submit-status"></div>
    </div>
  `;

  overlay.querySelector('#srt-close')?.addEventListener('click', () => {
    overlay.remove();
  });

  overlay.querySelector('#srt-mark-submitted')?.addEventListener('click', async () => {
    const statusEl = overlay.querySelector('#srt-submit-status')!;
    statusEl.textContent = 'Updating...';

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'MARK_SUBMITTED',
        performanceIds,
      });
      if (response?.success) {
        statusEl.innerHTML =
          '<span class="srt-status-group srt-success"><span class="srt-icon">&#10003;</span> Marked as submitted!</span>';
      } else {
        statusEl.innerHTML =
          '<span class="srt-status-group srt-warning"><span class="srt-icon">&#9888;</span> Failed to update</span>';
      }
    } catch {
      statusEl.innerHTML =
        '<span class="srt-status-group srt-warning"><span class="srt-icon">&#9888;</span> Error connecting to extension</span>';
    }
  });
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_CURRENT_STEP') {
    sendResponse({ step: detectWizardStep() });
    return;
  }

  if (message.type === 'FILL_ALL') {
    const overlay = createOverlay();
    (async () => {
      await fillAll(message.event as EventData, overlay);
      sendResponse({ success: true });
    })();
    return true; // keep port open for async sendResponse
  }

  if (message.type === 'FILL_DETAILS') {
    const overlay = createOverlay();
    (async () => {
      const results = await fillDetails(message.event as EventData);
      showFillResults(results, overlay);
      sendResponse({ success: true, results });
    })();
    return true; // keep port open for async sendResponse
  }

  if (message.type === 'FILL_SETLIST') {
    const overlay = createOverlay();
    const event = message.event as EventData;
    (async () => {
      const { matched, notFound } = await fillSetlist(event.songs);
      showSetlistResults(matched, notFound, overlay);
      sendResponse({ success: true, matched, notFound });
    })();
    return true; // keep port open for async sendResponse
  }

  if (message.type === 'SHOW_SUMMARY') {
    const overlay = createOverlay();
    showSummaryOverlay(message.event as EventData, overlay);
    sendResponse({ success: true });
    return;
  }
});

// Auto-detect which wizard step we're on
// BMI uses Syncfusion tab components — look for active tab/step indicators
function detectWizardStep(): number {
  // Syncfusion tabs use e-active class
  const activeTabs = document.querySelectorAll(
    '.e-tab-header .e-active, .e-toolbar-item.e-active, [class*="step"][class*="active"], .step-tab.active'
  );
  for (const tab of activeTabs) {
    const text = tab.textContent?.toLowerCase() || '';
    if (text.includes('setlist') || text.includes('step 2') || text.includes('2.')) return 2;
    if (text.includes('summary') || text.includes('step 3') || text.includes('3.')) return 3;
  }

  // Check for summary page indicators (read-only review content)
  const warrantyCheckbox = document.querySelector('input[type="checkbox"]');
  const submitBtn = document.querySelector('button[type="submit"]');
  if (warrantyCheckbox && submitBtn) {
    const bodyText = document.body.textContent?.toLowerCase() || '';
    if (bodyText.includes('warranty') || bodyText.includes('i certify')) return 3;
  }

  // Check if song search exists and is visible (Step 2 indicator)
  const songSearch = document.getElementById('tbSongSearch');
  if (songSearch && songSearch.offsetParent !== null) return 2;

  // Fallback to URL
  const url = window.location.href.toLowerCase();
  if (url.includes('setlist') || url.includes('step2') || url.includes('step=2')) return 2;
  if (url.includes('summary') || url.includes('step3') || url.includes('step=3')) return 3;

  return 1;
}

// Inject a small badge to show extension is active
function showActiveBadge() {
  const badge = document.createElement('div');
  badge.className = 'srt-badge';
  badge.textContent = 'SRT';
  badge.title = 'Setlist Royalty Tracker extension is active';
  document.body.appendChild(badge);
}

// Initialize
showActiveBadge();
console.log('[SRT] BMI Live Auto-Fill extension loaded, wizard step:', detectWizardStep());
