// Robust POST helper that survives iOS Safari PWA standalone-mode fetch
// quirks. fetch() in iOS standalone occasionally throws "TypeError: Load
// failed" even when the server is reachable + responsive (verified via
// curl from the same network at the same instant). The workaround is to
// retry with XMLHttpRequest, which is more reliable in that context per
// WebKit's standalone-mode networking stack.
//
// Use this for ANY pre-auth POST from the PWA (sign-in code verification,
// future similar custom auth flows). Post-auth fetches are less affected
// because the cookie is already established and the request feels less
// "first contact" to iOS's networking layer.
//
// The fetch path runs first because it's the standard + has better DX
// (streaming, AbortController, etc.); XHR only kicks in on a true fetch
// failure (TypeError), not on 4xx/5xx HTTP responses (those flow through
// fetch normally).

export type RobustPostResult<T = unknown> = {
  ok: boolean;
  status: number;
  json: T;
  // Which transport succeeded — useful for analytics/debugging if we want
  // to track how often the XHR fallback fires in production.
  transport: 'fetch' | 'xhr';
};

export async function robustPost<T = unknown>(
  url: string,
  body: unknown
): Promise<RobustPostResult<T>> {
  const payload = JSON.stringify(body);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => ({}))) as T;
    return { ok: res.ok, status: res.status, json, transport: 'fetch' };
  } catch (fetchErr) {
    // fetch threw — this is the iOS PWA "Load failed" case. Try XHR.
    console.warn('robustPost: fetch failed, falling back to XHR', fetchErr);
    return xhrPost<T>(url, payload);
  }
}

function xhrPost<T>(url: string, payload: string): Promise<RobustPostResult<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true; // mirror fetch's credentials: 'same-origin'
    xhr.timeout = 15_000;
    xhr.onload = () => {
      let json: T;
      try {
        json = JSON.parse(xhr.responseText) as T;
      } catch {
        json = {} as T;
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json,
        transport: 'xhr',
      });
    };
    xhr.onerror = () =>
      reject(new Error(`XHR network error (status ${xhr.status})`));
    xhr.ontimeout = () => reject(new Error('XHR timeout after 15s'));
    xhr.send(payload);
  });
}
