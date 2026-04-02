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

// Track which events have been submitted this session
const submittedKeys = new Set<string>();

async function init() {
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

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const onBmi = tab?.url?.includes('ols.bmi.com');

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

  // Ask the content script what step the form is on
  let currentStep = 1;
  try {
    const stepResponse = await chrome.tabs.sendMessage(tab.id!, { type: 'GET_CURRENT_STEP' });
    if (stepResponse?.step) {
      currentStep = stepResponse.step;
    }
  } catch {
    // Fallback to URL detection
    const tabUrl = tab?.url || '';
    if (tabUrl.includes('step=2') || tabUrl.includes('step2') || tabUrl.includes('setlist')) {
      currentStep = 2;
    } else if (tabUrl.includes('step=3') || tabUrl.includes('step3') || tabUrl.includes('summary')) {
      currentStep = 3;
    }
  }

  renderEvents(events, tab.id!, currentStep);
}

function getStepLabel(step: number): string {
  if (step === 1) return 'Auto-Fill Details';
  if (step === 2) return 'Auto-Fill Setlist';
  return 'Mark as Submitted';
}

function getStepHint(step: number): string {
  if (step === 1) return 'Pick a performance below — it will fill in the event info, date, time, and venue.';
  if (step === 2) return 'Pick a performance — it will add your songs to the setlist.';
  return 'Review the summary above, then mark as submitted.';
}

function renderEvents(events: EventData[], tabId: number, currentStep: number) {
  const stepLabel = getStepLabel(currentStep);
  const stepHint = getStepHint(currentStep);
  const remaining = events.filter((e) => !submittedKeys.has(e.eventKey));
  const total = events.length;

  const listHtml = events
    .map((event, i) => {
      const isSubmitted = submittedKeys.has(event.eventKey);
      return `
    <div class="event-card ${isSubmitted ? 'submitted' : ''}" data-index="${i}">
      <div class="event-card-header">
        ${isSubmitted
          ? '<span class="event-submitted-badge">Submitted</span>'
          : `<span class="event-number">${i + 1} of ${total}</span>`
        }
      </div>
      <div class="event-name">${escapeHtml(event.eventName || event.artistName)}</div>
      <div class="event-artist">${event.eventName ? escapeHtml(event.artistName) : ''}</div>
      <div class="event-details">
        <span class="event-detail-item">${escapeHtml(event.eventDateFormatted)}</span>
        ${event.venueName ? `<span class="event-detail-item">${escapeHtml(event.venueName)}</span>` : ''}
        ${event.venueCity && event.venueState ? `<span class="event-detail-item">${escapeHtml(event.venueCity)}, ${escapeHtml(event.venueState)}</span>` : event.venueCity ? `<span class="event-detail-item">${escapeHtml(event.venueCity)}</span>` : ''}
      </div>
      <div class="event-songs">
        ${event.songs.length} song${event.songs.length !== 1 ? 's' : ''}:
        ${event.songs.map((s) => escapeHtml(s.title)).join(', ')}
      </div>
      ${isSubmitted
        ? ''
        : `<div class="event-actions">
            <button class="btn btn-primary" data-action="auto-fill" data-index="${i}">
              ${stepLabel}
            </button>
          </div>`
      }
    </div>
  `;
    })
    .join('');

  content.innerHTML = `
    <div class="step-hint">${stepHint}</div>
    <div class="event-list">${listHtml}</div>
    <div class="footer">
      <a href="#" id="open-options">Settings</a>
      <span class="count">${remaining.length} of ${total} event${total !== 1 ? 's' : ''} to submit</span>
    </div>
  `;

  content.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('button[data-action]') as HTMLElement | null;
    if (!btn) return;

    const index = parseInt(btn.dataset.index!, 10);
    const event = events[index];

    // Highlight the selected card
    content.querySelectorAll('.event-card').forEach((card) => card.classList.remove('selected'));
    btn.closest('.event-card')?.classList.add('selected');

    if (currentStep === 1) {
      chrome.tabs.sendMessage(tabId, { type: 'FILL_DETAILS', event });
    } else if (currentStep === 2) {
      chrome.tabs.sendMessage(tabId, { type: 'FILL_SETLIST', event });
    } else {
      // Step 3: Mark as submitted directly from popup
      btn.textContent = 'Submitting...';
      btn.setAttribute('disabled', 'true');

      try {
        const performanceIds = event.songs.map((s) => s.performanceId);
        const response = await chrome.runtime.sendMessage({
          type: 'MARK_SUBMITTED',
          performanceIds,
        });

        if (response?.success) {
          submittedKeys.add(event.eventKey);
          // Re-render to update the UI
          renderEvents(events, tabId, currentStep);
        } else {
          btn.textContent = 'Failed — Retry';
          btn.removeAttribute('disabled');
        }
      } catch {
        btn.textContent = 'Error — Retry';
        btn.removeAttribute('disabled');
      }
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
