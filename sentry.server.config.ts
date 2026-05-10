import * as Sentry from '@sentry/nextjs';
import { scrubSensitive } from './src/lib/sentry-scrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend: scrubSensitive,
});
