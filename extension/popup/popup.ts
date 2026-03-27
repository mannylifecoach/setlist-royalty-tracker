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

const content = document.getElementById('content')!;

async function init() {
  // Check if we have config
  const config = await chrome.storage.sync.get(['apiKey', 'apiUrl']);
  if (!config.apiKey || !config.apiUrl) {
    content.innerHTML = `
      <div class="error">
        Extension not configured.<br>
        <a href="#" id="open-options">Open settings</a> to add your API key.
      </div>
    `;
    document.getElementById('open-options')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // Check if we're on BMI
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const onBmi = tab?.url?.includes('ols.bmi.com');

  // Fetch performances
  content.innerHTML = '<div class="loading">loading performances...</div>';

  const response = await chrome.runtime.sendMessage({
    type: 'FETCH_PERFORMANCES',
  });

  if (!response?.success) {
    content.innerHTML = `
      <div class="error">
        Failed to load performances.<br>
        ${response?.error || 'Check your API key and connection.'}
      </div>
    `;
    return;
  }

  const events: EventData[] = response.data.events || [];

  if (events.length === 0) {
    content.innerHTML = `
      <div class="empty">
        No confirmed performances to fill.<br>
        Confirm performances in your tracker first.
      </div>
    `;
    return;
  }

  if (!onBmi) {
    content.innerHTML = `
      <div class="not-on-bmi">
        Navigate to <strong>ols.bmi.com</strong> to use auto-fill.<br><br>
        <span class="count">${events.length} performance${events.length !== 1 ? 's' : ''} ready</span>
      </div>
    `;
    return;
  }

  // Render event list
  renderEvents(events, tab.id!);
}

function renderEvents(events: EventData[], tabId: number) {
  const listHtml = events
    .map(
      (event, i) => `
    <div class="event-card" data-index="${i}">
      <div class="event-artist">${escapeHtml(event.artistName)}</div>
      <div class="event-meta">
        ${escapeHtml(event.eventDateFormatted)}
        ${event.venueName ? ` &middot; ${escapeHtml(event.venueName)}` : ''}
        ${event.venueCity ? `, ${escapeHtml(event.venueCity)}` : ''}
      </div>
      <div class="event-songs">
        ${event.songs.length} song${event.songs.length !== 1 ? 's' : ''}: ${event.songs.map((s) => escapeHtml(s.title)).join(', ')}
      </div>
      <div class="event-actions">
        <button class="btn btn-primary" data-action="fill-details" data-index="${i}">
          Fill Details
        </button>
        <button class="btn btn-setlist" data-action="fill-setlist" data-index="${i}">
          Fill Setlist
        </button>
        <button class="btn" data-action="show-summary" data-index="${i}">
          Summary
        </button>
      </div>
    </div>
  `
    )
    .join('');

  content.innerHTML = `
    <div class="event-list">${listHtml}</div>
    <div class="footer">
      <a href="#" id="open-options">Settings</a>
      <span class="count">${events.length} event${events.length !== 1 ? 's' : ''}</span>
    </div>
  `;

  // Event delegation for buttons
  content.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button[data-action]') as HTMLElement | null;
    if (!btn) return;

    const action = btn.dataset.action;
    const index = parseInt(btn.dataset.index!, 10);
    const event = events[index];

    if (action === 'fill-details') {
      chrome.tabs.sendMessage(tabId, { type: 'FILL_DETAILS', event });
    } else if (action === 'fill-setlist') {
      chrome.tabs.sendMessage(tabId, { type: 'FILL_SETLIST', event });
    } else if (action === 'show-summary') {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW_SUMMARY', event });
    }
  });

  document.getElementById('open-options')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

function escapeHtml(text: string): string {
  const el = document.createElement('span');
  el.textContent = text;
  return el.innerHTML;
}

init();
