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

  // v1.3.3 — chrome.debugger CDP path for ASCAP's saveOnFocus-classed inputs.
  // ASCAP's jQuery framework rejects programmatic values on Submit because
  // synthetic events have `isTrusted: false`. We attach the Chrome DevTools
  // Protocol debugger, focus the target field, dispatch real keyboard events
  // (which the framework accepts as user input), then detach immediately.
  // The "DevTools is debugging this tab" banner flashes for ~300ms during fill.
  if (message.type === 'CDP_TYPE_INTO_FIELD') {
    const selector: string = message.selector;
    const value: string = message.value;
    if (!selector || typeof value !== 'string') {
      sendResponse({ success: false, error: 'CDP_TYPE_INTO_FIELD missing selector/value' });
      return false;
    }
    // Resolve target tab in order: explicit message.tabId → _sender.tab.id →
    // active tab query. The fallback chain handles edge cases where the
    // content-script sender info is missing (some MV3 service-worker quirks).
    resolveCdpTargetTab(_sender, message.tabId)
      .then((tabId) => typeIntoFieldViaCDP(tabId, selector, value))
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
        // Surface to SW console so we can diagnose without re-shipping.
        console.error('[SRT] CDP_TYPE_INTO_FIELD failed:', err, {
          senderTabId: _sender.tab?.id,
          senderUrl: _sender.tab?.url,
          messageTabId: message.tabId,
          selector,
          valueLength: value.length,
        });
        sendResponse({ success: false, error: String(err?.message ?? err) });
      });
    return true;
  }
});

// Determine which tab the CDP attach should target. Tries explicit messageTabId,
// then content-script sender tab, then the currently-active tab in the focused
// window. Throws a descriptive error if none works — we'd rather fail loudly
// than silently attach to the wrong tab.
async function resolveCdpTargetTab(
  sender: chrome.runtime.MessageSender,
  messageTabId: number | undefined
): Promise<number> {
  const candidate = messageTabId ?? sender.tab?.id;
  if (candidate) return candidate;
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.id) return active.id;
  throw new Error('Could not resolve CDP target tab (no sender tab, no active tab)');
}

// Type `value` character-by-character into the element matching `selector`
// on the given tab, using Chrome DevTools Protocol's Input.dispatchKeyEvent
// (which produces `isTrusted: true` events — indistinguishable from real
// keystrokes, so ASCAP's jQuery saveOnFocus binding actually commits the
// value into its form-state engine). Detach in try/finally so the banner
// never persists past the fill window.
async function typeIntoFieldViaCDP(
  tabId: number,
  selector: string,
  value: string
): Promise<void> {
  // Verify the target tab is a real http(s) page before attaching — Chrome
  // rejects debugger.attach on chrome:// / chrome-extension:// URLs with a
  // confusing "different extension" error. Surface a clearer message.
  let tabInfo: chrome.tabs.Tab;
  try {
    tabInfo = await chrome.tabs.get(tabId);
  } catch (e) {
    throw new Error(`Tab ${tabId} not found: ${String(e)}`);
  }
  const targetUrl = tabInfo.url || '';
  if (!/^https?:\/\//.test(targetUrl)) {
    throw new Error(
      `Cannot attach debugger to tab ${tabId} — URL is "${targetUrl}" (must be http/https)`
    );
  }

  const target: chrome.debugger.Debuggee = { tabId };
  let attached = false;
  try {
    await chrome.debugger.attach(target, '1.3');
    attached = true;

    // Focus the field via Runtime.evaluate. JSON.stringify guards against
    // selectors containing quotes or backslashes.
    const focusExpr = `(function(){var el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;el.focus();return document.activeElement===el;})()`;
    const focusRes = (await chrome.debugger.sendCommand(target, 'Runtime.evaluate', {
      expression: focusExpr,
      returnByValue: true,
    })) as { result?: { value?: boolean } };
    if (!focusRes?.result?.value) {
      throw new Error(`Could not focus selector ${selector}`);
    }

    // Dispatch each character as keyDown → char → keyUp. The `char` event
    // is what actually inserts the visible text in Chrome's CDP; keyDown
    // alone doesn't produce a character.
    for (const ch of value) {
      await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', {
        type: 'keyDown',
        text: ch,
        unmodifiedText: ch,
        key: ch,
      });
      await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', {
        type: 'char',
        text: ch,
        unmodifiedText: ch,
        key: ch,
      });
      await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', {
        type: 'keyUp',
        text: ch,
        unmodifiedText: ch,
        key: ch,
      });
    }

    // Blur to commit. ASCAP's saveOnFocus may also commit on focus-out.
    await chrome.debugger.sendCommand(target, 'Runtime.evaluate', {
      expression: `(function(){var el=document.querySelector(${JSON.stringify(selector)});if(el)el.blur();})()`,
    });
  } finally {
    if (attached) {
      try {
        await chrome.debugger.detach(target);
      } catch {
        // Ignore — tab may have closed or already detached.
      }
    }
  }
}
