import type { ErrorEvent } from '@sentry/nextjs';

const TOKEN_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9_\-.]+/g,
  /srt_[A-Za-z0-9]+/g,
];

function redact(value: string): string {
  let out = value;
  for (const pattern of TOKEN_PATTERNS) {
    out = out.replace(pattern, (match) => (match.startsWith('Bearer') ? 'Bearer [REDACTED]' : '[REDACTED]'));
  }
  return out;
}

export function scrubSensitive(event: ErrorEvent): ErrorEvent {
  // Authorization header is the highest-leakage surface — kill it case-insensitively.
  if (event.request?.headers && typeof event.request.headers === 'object') {
    const headers = event.request.headers as Record<string, string>;
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'authorization') {
        delete headers[key];
      }
    }
  }

  if (typeof event.request?.url === 'string') {
    event.request.url = redact(event.request.url);
  }

  if (Array.isArray(event.breadcrumbs)) {
    for (const bc of event.breadcrumbs) {
      if (typeof bc.message === 'string') bc.message = redact(bc.message);
      if (bc.data && typeof bc.data === 'object') {
        for (const [k, v] of Object.entries(bc.data)) {
          if (typeof v === 'string') (bc.data as Record<string, unknown>)[k] = redact(v);
        }
      }
    }
  }

  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (typeof ex.value === 'string') ex.value = redact(ex.value);
    }
  }

  return event;
}
