import { SELECTORS } from './selectors';

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

// Utility: find first matching element from a comma-separated selector
function q(selector: string): HTMLElement | null {
  for (const s of selector.split(',')) {
    const el = document.querySelector<HTMLElement>(s.trim());
    if (el) return el;
  }
  return null;
}

// Set value on an input/select and dispatch events so React/Angular picks it up
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
    return false;
  }
  return false;
}

// Click a radio/toggle button matching a value
function clickRadio(selector: string, value: string): boolean {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  for (const el of elements) {
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      if (el.value.toLowerCase() === value.toLowerCase()) {
        el.click();
        return true;
      }
    }
    // For button-style toggles
    if (el.textContent?.trim().toLowerCase() === value.toLowerCase()) {
      el.click();
      return true;
    }
  }
  return false;
}

// Clear all form fields before filling (so switching events works)
function clearFields() {
  const inputSelectors = [
    SELECTORS.eventName, SELECTORS.startDate, SELECTORS.endDate,
    SELECTORS.venueCity, SELECTORS.venueName,
    SELECTORS.newVenueName, SELECTORS.newVenueAddress,
    SELECTORS.newVenueCity, SELECTORS.newVenueZip,
    SELECTORS.newVenueCapacity, SELECTORS.newVenuePhone,
  ];
  for (const sel of inputSelectors) {
    const el = q(sel);
    if (el instanceof HTMLInputElement) {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) nativeSetter.call(el, '');
      else el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  const selectSelectors = [
    SELECTORS.bandPerformer, SELECTORS.eventType,
    SELECTORS.startHour, SELECTORS.startAmPm,
    SELECTORS.endHour, SELECTORS.endAmPm,
    SELECTORS.attendance, SELECTORS.previousVenues,
    SELECTORS.venueState, SELECTORS.newVenueState, SELECTORS.newVenueType,
  ];
  for (const sel of selectSelectors) {
    const el = q(sel);
    if (el instanceof HTMLSelectElement) {
      el.selectedIndex = 0;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // Uncheck radios
  const radios = document.querySelectorAll<HTMLInputElement>('input[name="ticketCharge"]');
  radios.forEach((r) => { r.checked = false; });
}

// Fill Step 1 — Details
function fillDetails(event: EventData): FillResult[] {
  clearFields();
  const results: FillResult[] = [];

  const fieldMap: [string, string, string | null][] = [
    ['bandPerformer', SELECTORS.bandPerformer, event.artistName],
    ['eventName', SELECTORS.eventName, event.eventName],
    ['eventType', SELECTORS.eventType, event.eventType],
    ['startDate', SELECTORS.startDate, event.eventDateFormatted],
    ['startHour', SELECTORS.startHour, event.startTimeHour],
    ['startAmPm', SELECTORS.startAmPm, event.startTimeAmPm],
    ['endDate', SELECTORS.endDate, event.eventDateFormatted],
    ['endHour', SELECTORS.endHour, event.endTimeHour],
    ['endAmPm', SELECTORS.endAmPm, event.endTimeAmPm],
    ['attendance', SELECTORS.attendance, event.attendanceRange],
  ];

  for (const [name, selector, value] of fieldMap) {
    if (!value) {
      results.push({ field: name, status: 'skipped' });
      continue;
    }
    const el = q(selector);
    if (!el) {
      results.push({ field: name, status: 'not_found' });
      continue;
    }
    const ok = setInputValue(el, value);
    results.push({ field: name, status: ok ? 'filled' : 'not_found' });
  }

  // Ticket charge — often a radio/toggle
  if (event.ticketCharge) {
    const ok = clickRadio(SELECTORS.ticketCharge, event.ticketCharge);
    results.push({
      field: 'ticketCharge',
      status: ok ? 'filled' : 'not_found',
    });
  } else {
    results.push({ field: 'ticketCharge', status: 'skipped' });
  }

  // Try previously performed venues dropdown first
  if (event.venueName) {
    const prevVenues = q(SELECTORS.previousVenues);
    if (prevVenues instanceof HTMLSelectElement) {
      const matched = Array.from(prevVenues.options).find((o) =>
        o.textContent?.toLowerCase().includes(event.venueName!.toLowerCase())
      );
      if (matched) {
        prevVenues.value = matched.value;
        prevVenues.dispatchEvent(new Event('change', { bubbles: true }));
        results.push({ field: 'venue', status: 'filled' });
      } else {
        // Fall back to manual venue fields
        fillVenueFields(event, results);
      }
    } else {
      fillVenueFields(event, results);
    }
  }

  return results;
}

function fillVenueFields(event: EventData, results: FillResult[]) {
  const venueFields: [string, string, string | null][] = [
    ['venueState', SELECTORS.venueState, event.venueState],
    ['venueCity', SELECTORS.venueCity, event.venueCity],
    ['venueName', SELECTORS.venueName, event.venueName],
  ];

  for (const [name, selector, value] of venueFields) {
    if (!value) {
      results.push({ field: name, status: 'skipped' });
      continue;
    }
    const el = q(selector);
    if (!el) {
      results.push({ field: name, status: 'not_found' });
      continue;
    }
    const ok = setInputValue(el, value);
    results.push({ field: name, status: ok ? 'filled' : 'not_found' });
  }
}

// Fill Step 2 — Setlist
function fillSetlist(
  songs: EventData['songs']
): { matched: string[]; notFound: string[] } {
  const matched: string[] = [];
  const notFound: string[] = [];

  // Find all song list items in the BMI catalog
  const songItems = document.querySelectorAll<HTMLElement>(
    SELECTORS.songListItems
  );

  for (const song of songs) {
    let found = false;

    for (const item of songItems) {
      const titleEl =
        item.querySelector('[data-song-title]') ||
        item.querySelector('.song-title') ||
        item;
      const titleText = titleEl?.textContent?.trim().toLowerCase();

      if (
        titleText === song.title.toLowerCase() ||
        titleText?.includes(song.title.toLowerCase())
      ) {
        // Click the add/+ button
        const addBtn =
          item.querySelector<HTMLElement>(SELECTORS.songAddButton) ||
          item.querySelector<HTMLElement>('button');
        if (addBtn) {
          addBtn.click();
          matched.push(song.title);
          found = true;
          break;
        }
      }
    }

    if (!found) {
      // Try search input if available
      const searchInput = q(SELECTORS.songSearchInput);
      if (searchInput) {
        setInputValue(searchInput, song.bmiWorkId || song.title);
      }
      notFound.push(song.title);
    }
  }

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

  if (message.type === 'FILL_DETAILS') {
    const overlay = createOverlay();
    const results = fillDetails(message.event as EventData);
    showFillResults(results, overlay);
    sendResponse({ success: true, results });
    return;
  }

  if (message.type === 'FILL_SETLIST') {
    const overlay = createOverlay();
    const event = message.event as EventData;
    const { matched, notFound } = fillSetlist(event.songs);
    showSetlistResults(matched, notFound, overlay);
    sendResponse({ success: true, matched, notFound });
    return;
  }

  if (message.type === 'SHOW_SUMMARY') {
    const overlay = createOverlay();
    showSummaryOverlay(message.event as EventData, overlay);
    sendResponse({ success: true });
    return;
  }
});

// Auto-detect which wizard step we're on
function detectWizardStep(): number {
  // First try DOM: check which step tab is active
  const activeTabs = document.querySelectorAll('.step-tab.active, [class*="step"][class*="active"]');
  for (const tab of activeTabs) {
    const text = tab.textContent?.toLowerCase() || '';
    if (text.includes('setlist') || text.includes('step 2') || text.includes('2.')) return 2;
    if (text.includes('summary') || text.includes('step 3') || text.includes('3.')) return 3;
  }

  // Check which step content is visible
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');
  if (step3 && step3.classList.contains('active')) return 3;
  if (step2 && step2.classList.contains('active')) return 2;

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
