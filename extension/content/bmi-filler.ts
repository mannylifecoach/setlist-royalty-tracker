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
function fillDetails(event: EventData): FillResult[] {
  const results: FillResult[] = [];

  // Details fields
  results.push(fillField('bandPerformer', event.artistName));
  results.push(fillField('eventName', event.eventName));
  results.push(fillField('eventType', event.eventType));
  results.push(fillField('startDate', event.eventDateFormatted));
  results.push(fillField('startTime', event.startTimeHour));
  results.push(fillField('startAmPm', event.startTimeAmPm));
  results.push(fillField('endDate', event.eventDateFormatted));
  results.push(fillField('endTime', event.endTimeHour));
  results.push(fillField('endAmPm', event.endTimeAmPm));
  results.push(fillField('attendance', event.attendanceRange));
  results.push(fillField('ticketCharge', event.ticketCharge));

  // Venue — try previously performed venues dropdown first
  if (event.venueName) {
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
    // Fall back to manual venue fields
    results.push(fillField('venueState', event.venueState));
    results.push(fillField('venueCity', event.venueCity));
    results.push(fillField('venueName', event.venueName));
  }

  return results;
}

// Fill Step 2 — Setlist
function fillSetlist(
  songs: EventData['songs']
): { matched: string[]; notFound: string[] } {
  const matched: string[] = [];
  const notFound: string[] = [];

  // Type each song into the search box and look for matches
  const searchEl = findField(FIELD_MAP.songSearch);

  for (const song of songs) {
    let found = false;

    // Try searching by BMI work ID first, then title
    const searchTerm = song.bmiWorkId || song.title;
    if (searchEl) {
      setInputValue(searchEl, searchTerm);
      // Wait briefly for Syncfusion to filter — we use a synchronous check
      // since the filter should be near-instant on the client side
    }

    // Look for song rows in the catalog — Syncfusion grid uses e-row class
    const rows = document.querySelectorAll<HTMLElement>(
      'tr.e-row, .e-gridcontent tr, [class*="song-row"], .song-list-item'
    );

    for (const row of rows) {
      const titleText = row.textContent?.trim().toLowerCase() || '';
      if (
        titleText.includes(song.title.toLowerCase()) ||
        (song.bmiWorkId && titleText.includes(song.bmiWorkId.toLowerCase()))
      ) {
        // Find the add/+ button in this row
        const addBtn = row.querySelector<HTMLElement>(
          'button.e-btn, button[class*="add"], button'
        );
        if (addBtn) {
          addBtn.click();
          matched.push(song.title);
          found = true;
          break;
        }
      }
    }

    if (!found) {
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
