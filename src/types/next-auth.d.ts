// Module augmentation: add SRT-specific fields to the Auth.js Session shape.
// Lets `session.user.onboardingComplete` be read directly without a separate
// DB query in (app)/layout.tsx — the value comes through the session
// callback in src/lib/auth.ts (DrizzleAdapter loads the full user row, we
// just have to expose the relevant column on the session).

import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      onboardingComplete: boolean;
    } & DefaultSession['user'];
  }
}

