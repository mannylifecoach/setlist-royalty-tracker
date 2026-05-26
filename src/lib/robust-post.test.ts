import { describe, it, expect, vi, beforeEach } from 'vitest';
import { robustPost } from './robust-post';

const fetchSpy = vi.fn();

beforeEach(() => {
  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
});

describe('robustPost — fetch happy path', () => {
  it('returns transport=fetch on a successful 200 response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    const res = await robustPost<{ success: boolean }>('/api/x', { foo: 1 });
    expect(res.transport).toBe('fetch');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
  });

  it('passes through a 400 response WITHOUT falling back to XHR (HTTP errors are not fetch errors)', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid code' }),
    });
    const res = await robustPost<{ error: string }>('/api/x', { foo: 1 });
    expect(res.transport).toBe('fetch');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(res.json.error).toBe('invalid code');
  });

  it('passes through a 429 response with the rate-limit body intact', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'too many attempts' }),
    });
    const res = await robustPost<{ error: string }>('/api/x', { foo: 1 });
    expect(res.status).toBe(429);
    expect(res.json.error).toMatch(/too many/);
  });

  it('handles a fetch response with non-JSON body gracefully (json defaults to {})', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });
    const res = await robustPost<Record<string, never>>('/api/x', { foo: 1 });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
    expect(res.json).toEqual({});
  });
});

describe('robustPost — XHR fallback (iOS PWA "Load failed" case)', () => {
  // Minimal XMLHttpRequest mock — captures the most-recent instance so each
  // test can drive it. Mirrors the subset of the XHR API robustPost touches.
  class MockXhr {
    static current: MockXhr;
    method = '';
    url = '';
    headers: Record<string, string> = {};
    body: string | null = null;
    withCredentials = false;
    timeout = 0;
    status = 0;
    responseText = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    ontimeout: (() => void) | null = null;

    constructor() {
      MockXhr.current = this;
    }
    open(method: string, url: string) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(k: string, v: string) {
      this.headers[k] = v;
    }
    send(body: string | null) {
      this.body = body;
      // Caller drives the response by setting status/responseText + calling
      // simulateLoad() / simulateError() / simulateTimeout().
    }
    // Test helpers:
    simulateLoad(status: number, body: string) {
      this.status = status;
      this.responseText = body;
      this.onload?.();
    }
    simulateError() {
      this.onerror?.();
    }
    simulateTimeout() {
      this.ontimeout?.();
    }
  }

  beforeEach(() => {
    vi.stubGlobal('XMLHttpRequest', MockXhr);
  });

  it('falls back to XHR when fetch throws TypeError (iOS PWA "Load failed")', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Load failed'));
    const promise = robustPost<{ ok: true }>('/api/x', { foo: 1 });
    // simulate XHR completing with a 200
    await new Promise((r) => setTimeout(r, 0));
    MockXhr.current.simulateLoad(200, JSON.stringify({ ok: true }));
    const res = await promise;
    expect(res.transport).toBe('xhr');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
  });

  it('falls back to XHR + surfaces a 4xx response from the XHR path', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Load failed'));
    const promise = robustPost<{ error: string }>('/api/x', { foo: 1 });
    await new Promise((r) => setTimeout(r, 0));
    MockXhr.current.simulateLoad(400, JSON.stringify({ error: 'bad code' }));
    const res = await promise;
    expect(res.transport).toBe('xhr');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(res.json.error).toBe('bad code');
  });

  it('XHR passes the same JSON payload + headers fetch would have used', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Load failed'));
    const promise = robustPost('/api/auth/verify-code', {
      email: 'x@y.com',
      code: '123456',
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(MockXhr.current.method).toBe('POST');
    expect(MockXhr.current.url).toBe('/api/auth/verify-code');
    expect(MockXhr.current.headers['Content-Type']).toBe('application/json');
    expect(MockXhr.current.withCredentials).toBe(true);
    expect(JSON.parse(MockXhr.current.body!)).toEqual({
      email: 'x@y.com',
      code: '123456',
    });
    MockXhr.current.simulateLoad(200, '{}');
    await promise;
  });

  it('rejects when BOTH fetch and XHR fail (true offline / catastrophic)', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Load failed'));
    const promise = robustPost('/api/x', { foo: 1 });
    await new Promise((r) => setTimeout(r, 0));
    MockXhr.current.simulateError();
    await expect(promise).rejects.toThrow(/XHR network error/);
  });

  it('rejects when XHR times out (15s threshold)', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Load failed'));
    const promise = robustPost('/api/x', { foo: 1 });
    await new Promise((r) => setTimeout(r, 0));
    MockXhr.current.simulateTimeout();
    await expect(promise).rejects.toThrow(/XHR timeout/);
  });
});
