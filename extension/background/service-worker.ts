// Service worker handles API calls to Setlist Royalty Tracker

interface StorageConfig {
  apiKey: string;
  apiUrl: string;
}

async function getConfig(): Promise<StorageConfig | null> {
  const result = await chrome.storage.local.get(['apiKey', 'apiUrl']);
  if (!result.apiKey || !result.apiUrl) return null;
  return { apiKey: result.apiKey, apiUrl: result.apiUrl };
}

// One-time migration v1.2.0 → v1.3.0: prior versions stored apiKey/apiUrl in
// chrome.storage.sync, which travels through Google's cloud when the user is
// signed in to Chrome. Move any existing values to chrome.storage.local
// (per-device, never syncs) and clear the sync copy.
chrome.runtime.onInstalled.addListener(async () => {
  const synced = await chrome.storage.sync.get(['apiKey', 'apiUrl']);
  if (!synced.apiKey && !synced.apiUrl) return;

  const local = await chrome.storage.local.get(['apiKey', 'apiUrl']);
  const updates: Record<string, string> = {};
  if (synced.apiKey && !local.apiKey) updates.apiKey = synced.apiKey;
  if (synced.apiUrl && !local.apiUrl) updates.apiUrl = synced.apiUrl;
  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
  await chrome.storage.sync.remove(['apiKey', 'apiUrl']);
});

async function apiFetch(path: string, options: RequestInit = {}) {
  const config = await getConfig();
  if (!config) throw new Error('Extension not configured');

  const url = `${config.apiUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_PERFORMANCES') {
    apiFetch('/api/extension/performances?status=confirmed')
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  if (message.type === 'MARK_SUBMITTED') {
    apiFetch('/api/extension/performances/mark-submitted', {
      method: 'POST',
      body: JSON.stringify({ performanceIds: message.performanceIds }),
    })
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'FETCH_VENUE_ENRICHMENT') {
    const { name, state, city } = message;
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (state) params.set('state', state);
    if (city) params.set('city', city);
    apiFetch(`/api/extension/venue-enrichment?${params.toString()}`)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'FETCH_WORKS_REGISTRATION') {
    apiFetch('/api/extension/works-registration')
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'TEST_CONNECTION') {
    apiFetch('/api/extension/performances?status=confirmed')
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
