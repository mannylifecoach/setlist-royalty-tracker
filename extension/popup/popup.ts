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
  // ASCAP-side fields (defaults from backend; used by ASCAP fillers, ignored by BMI flow)
  perfType?: string;
  liveStreamViews?: number | null;
  ticketFee?: boolean;
  advanceTickets?: boolean;
  songs: {
    performanceId: string;
    title: string;
    bmiWorkId: string | null;
    ascapWorkId?: string | null;
    isrc?: string | null;
    durationSeconds?: number | null;
    ascapRegisteredAt?: string | null;
    coWriters?: { name: string; ipi: string | null; role: string; sharePercent: number }[];
  }[];
}

interface UserProfile {
  pro: 'bmi' | 'ascap' | string | null;
  ipi: string | null;
  defaultRole: string | null;
  publisherName: string | null;
  publisherIpi: string | null;
  noPublisher: boolean;
}

interface UnregisteredSong {
  id: string;
  title: string;
  alternateTitles: string[] | null;
  isrc: string | null;
  durationSeconds: number | null;
  recordingMbid: string | null;
  workMbid: string | null;
  iswc: string | null;
  writers: { name: string; ipi: string | null; role: string; sharePercent: number }[];
}

import { detectRoute, PRO_DEEP_LINKS } from './popup-route';

// ----- Popup boot -----

const content = document.getElementById('content')!;
const submittedKeys = new Set<string>();

async function init() {
  const config = await chrome.storage.sync.get(['apiKey', 'apiUrl']);
  if (!config.apiKey || !config.apiUrl) {
    renderUnconfigured();
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const route = detectRoute(tab?.url);

  content.innerHTML = '<div class="loading">loading...</div>';

  // Both ASCAP-OnStage and BMI flows need the performances payload (which now
  // also carries the user profile). Work Registration loads its own queue
  // via FETCH_WORKS_REGISTRATION since the song list is filtered server-side.
  if (route.kind === 'ascap-work-reg') {
    await renderWorkRegistration(tab?.id);
    return;
  }

  const response = await chrome.runtime.sendMessage({ type: 'FETCH_PERFORMANCES' });
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
  const user: UserProfile | undefined = response.data.user;

  if (events.length === 0) {
    renderEmpty(user);
    return;
  }

  switch (route.kind) {
    case 'bmi':
      await renderBmiEvents(events, tab!.id!);
      break;
    case 'ascap-onstage-perf':
    case 'ascap-onstage-setlist':
      renderAscapOnstageEvents(events, tab!.id!, route.kind);
      break;
    case 'ascap-other':
      renderAscapNeutral(events.length);
      break;
    case 'neutral':
    default:
      renderNeutral(events.length, user);
      break;
  }
}

function renderUnconfigured() {
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
}

function renderEmpty(user: UserProfile | undefined) {
  const proHint = user?.pro
    ? `Once you confirm performances in SRT, we'll fill ${user.pro === 'ascap' ? 'ASCAP OnStage' : 'BMI Live'} for you.`
    : `Once you confirm performances in SRT, we'll fill them for you.`;
  content.innerHTML = `
    <div class="empty">
      No confirmed performances to fill.<br><br>
      <span style="font-size:11px;opacity:0.7">${escapeHtml(proHint)}</span>
    </div>
    <div class="footer">
      <a href="#" id="open-options">Settings</a>
    </div>
  `;
  wireFooter();
}

function renderNeutral(eventCount: number, user: UserProfile | undefined) {
  // Neutral state: user opened the popup somewhere that isn't a PRO portal.
  // Default-CTA picks ASCAP if the user's PRO is ASCAP, BMI otherwise (BMI is
  // the historical default + safer fallback when pro is unset).
  const isAscap = user?.pro === 'ascap';
  const primaryCta = isAscap
    ? { url: PRO_DEEP_LINKS.ascapOnstage, label: 'Open ASCAP OnStage' }
    : { url: PRO_DEEP_LINKS.bmi, label: 'Open BMI Live' };
  const secondaryCta = isAscap
    ? { url: PRO_DEEP_LINKS.bmi, label: 'Open BMI Live' }
    : { url: PRO_DEEP_LINKS.ascapOnstage, label: 'Open ASCAP OnStage' };

  content.innerHTML = `
    <div class="not-on-bmi">
      <span class="count">${eventCount} performance${eventCount !== 1 ? 's' : ''} ready</span>
      <br><br>
      <button class="btn btn-primary" data-open-url="${escapeHtml(primaryCta.url)}">
        ${escapeHtml(primaryCta.label)}
      </button>
      <button class="btn" data-open-url="${escapeHtml(secondaryCta.url)}" style="margin-top:6px">
        ${escapeHtml(secondaryCta.label)}
      </button>
    </div>
    <div class="footer">
      <a href="#" id="open-options">Settings</a>
    </div>
  `;
  wireOpenButtons();
  wireFooter();
}

function renderAscapNeutral(eventCount: number) {
  // User is on www.ascap.com but not on a fillable hash route — point them
  // toward the right ASCAP page.
  content.innerHTML = `
    <div class="not-on-bmi">
      <span class="count">${eventCount} performance${eventCount !== 1 ? 's' : ''} ready</span>
      <br><br>
      <button class="btn btn-primary" data-open-url="${escapeHtml(PRO_DEEP_LINKS.ascapOnstage)}">
        Open ASCAP OnStage
      </button>
      <button class="btn" data-open-url="${escapeHtml(PRO_DEEP_LINKS.ascapWorkReg)}" style="margin-top:6px">
        Open Work Registration
      </button>
    </div>
    <div class="footer">
      <a href="#" id="open-options">Settings</a>
    </div>
  `;
  wireOpenButtons();
  wireFooter();
}

async function renderBmiEvents(events: EventData[], tabId: number) {
  let currentStep = 1;
  try {
    const stepResponse = await chrome.tabs.sendMessage(tabId, { type: 'GET_CURRENT_STEP' });
    if (stepResponse?.step) currentStep = stepResponse.step;
  } catch {
    // content script not ready — assume step 1
  }
  renderEventList(events, tabId, {
    primaryLabel: currentStep === 3 ? 'Mark as Submitted' : 'Auto-Fill Performance',
    hint:
      currentStep === 3
        ? 'Review the summary above, then mark as submitted.'
        : 'Pick a performance — SRT fills all 3 steps and pauses on the Summary for you to check warranty + click Submit.',
    onClick: async (event, btn) => {
      if (currentStep === 1 || currentStep === 2) {
        chrome.tabs.sendMessage(tabId, { type: 'FILL_ALL', event });
        btn.textContent = 'Filling… see BMI page';
        btn.setAttribute('disabled', 'true');
      } else {
        await markSubmitted(event, btn);
      }
    },
  });
}

function renderAscapOnstageEvents(
  events: EventData[],
  tabId: number,
  kind: 'ascap-onstage-perf' | 'ascap-onstage-setlist'
) {
  const isPerf = kind === 'ascap-onstage-perf';
  renderEventList(events, tabId, {
    primaryLabel: isPerf ? 'Auto-Fill Performance' : 'Build Setlist',
    hint: isPerf
      ? 'Pick a performance — SRT fills the OnStage form using your saved venue + setlist data.'
      : 'Pick an event — SRT creates the setlist with the matched songs.',
    onClick: (_event, btn) => {
      // Card #19 wires the actual ASCAP fill via the content script. For now
      // the content script no-ops on ASCAP and returns "not yet implemented".
      // This branch intentionally still posts the message so #19 can land
      // without changing the popup contract.
      chrome.tabs.sendMessage(tabId, {
        type: isPerf ? 'FILL_ASCAP_PERFORMANCE' : 'FILL_ASCAP_SETLIST',
        event: _event,
      }).catch(() => undefined);
      btn.textContent = 'ASCAP auto-fill landing soon';
      btn.setAttribute('disabled', 'true');
    },
  });
}

async function renderWorkRegistration(tabId: number | undefined) {
  const response = await chrome.runtime.sendMessage({ type: 'FETCH_WORKS_REGISTRATION' });
  if (!response?.success) {
    content.innerHTML = `
      <div class="error">
        Failed to load works.<br>
        ${response?.error || 'Check your API key and connection.'}
      </div>
    `;
    return;
  }
  const songs: UnregisteredSong[] = response.data.songs || [];

  if (songs.length === 0) {
    content.innerHTML = `
      <div class="empty">
        No songs awaiting ASCAP registration.<br><br>
        <span style="font-size:11px;opacity:0.7">All your registered songs are already on file with ASCAP.</span>
      </div>
      <div class="footer">
        <a href="#" id="open-options">Settings</a>
      </div>
    `;
    wireFooter();
    return;
  }

  const listHtml = songs
    .map(
      (s, i) => `
    <div class="event-card" data-index="${i}">
      <div class="event-card-header">
        <span class="event-number">${i + 1} of ${songs.length}</span>
      </div>
      <div class="event-name">${escapeHtml(s.title)}</div>
      <div class="event-details">
        ${s.isrc ? `<span class="event-detail-item">ISRC: ${escapeHtml(s.isrc)}</span>` : ''}
        ${s.durationSeconds ? `<span class="event-detail-item">${formatDuration(s.durationSeconds)}</span>` : ''}
        <span class="event-detail-item">${s.writers.length} writer${s.writers.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="event-actions">
        <button class="btn btn-primary" data-action="fill-work-reg" data-index="${i}">
          Auto-Fill Work Registration
        </button>
      </div>
    </div>
  `
    )
    .join('');

  content.innerHTML = `
    <div class="step-hint">Pick a song — SRT pre-fills the registration form. You handle reCAPTCHA + Submit.</div>
    <div class="event-list">${listHtml}</div>
    <div class="footer">
      <a href="#" id="open-options">Settings</a>
      <span class="count">${songs.length} unregistered</span>
    </div>
  `;

  content.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button[data-action="fill-work-reg"]') as HTMLElement | null;
    if (!btn) return;
    const idx = parseInt(btn.dataset.index!, 10);
    const song = songs[idx];
    if (tabId !== undefined) {
      chrome.tabs.sendMessage(tabId, { type: 'FILL_ASCAP_WORK_REG', song }).catch(() => undefined);
    }
    btn.textContent = 'ASCAP auto-fill landing soon';
    btn.setAttribute('disabled', 'true');
  });

  wireFooter();
}

interface RenderListOptions {
  primaryLabel: string;
  hint: string;
  onClick: (event: EventData, btn: HTMLButtonElement) => Promise<void> | void;
}

function renderEventList(events: EventData[], tabId: number, opts: RenderListOptions) {
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
              ${opts.primaryLabel}
            </button>
          </div>`
      }
    </div>
  `;
    })
    .join('');

  content.innerHTML = `
    <div class="step-hint">${opts.hint}</div>
    <div class="event-list">${listHtml}</div>
    <div class="footer">
      <a href="#" id="open-options">Settings</a>
      <span class="count">${remaining.length} of ${total} event${total !== 1 ? 's' : ''} to submit</span>
    </div>
  `;

  content.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('button[data-action="auto-fill"]') as HTMLButtonElement | null;
    if (!btn) return;
    const index = parseInt(btn.dataset.index!, 10);
    const event = events[index];

    content.querySelectorAll('.event-card').forEach((card) => card.classList.remove('selected'));
    btn.closest('.event-card')?.classList.add('selected');

    await opts.onClick(event, btn);
  });

  wireFooter();
  // tabId is captured by the closure passed into onClick; this is just a
  // reference to acknowledge it's the correct active tab for the dispatch.
  void tabId;
}

async function markSubmitted(event: EventData, btn: HTMLButtonElement) {
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
      // Re-init from scratch so the rendered list reflects the new submitted state.
      void init();
    } else {
      btn.textContent = 'Failed — Retry';
      btn.removeAttribute('disabled');
    }
  } catch {
    btn.textContent = 'Error — Retry';
    btn.removeAttribute('disabled');
  }
}

function wireOpenButtons() {
  content.querySelectorAll<HTMLElement>('button[data-open-url]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.openUrl!;
      chrome.tabs.create({ url });
    });
  });
}

function wireFooter() {
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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

init();
