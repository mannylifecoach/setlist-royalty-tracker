import posthog from 'posthog-js';

export const analytics = {
  // Auth
  signupCompleted: () => posthog.capture('signup_completed'),
  onboardingCompleted: (props: { pro: string; role: string }) =>
    posthog.capture('onboarding_completed', props),

  // Core funnel
  artistAdded: (props: { name: string }) =>
    posthog.capture('artist_added', props),
  songAdded: (props: { title: string }) =>
    posthog.capture('song_added', props),
  songLinkedToArtist: () => posthog.capture('song_linked_to_artist'),
  scanStarted: () => posthog.capture('scan_started'),
  scanCompleted: (props: { setlistsScanned: number; performancesFound: number }) =>
    posthog.capture('scan_completed', props),
  performanceConfirmed: (props: { count: number }) =>
    posthog.capture('performance_confirmed', props),
  csvExported: (props: { pro: string; count: number }) =>
    posthog.capture('csv_exported', props),

  // Extension
  extensionApiKeyGenerated: () => posthog.capture('extension_api_key_generated'),

  // Identify user (call after login)
  identify: (userId: string, props?: Record<string, unknown>) =>
    posthog.identify(userId, props),
};
