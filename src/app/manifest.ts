import type { MetadataRoute } from 'next';

// Web App Manifest — drives the "Add to Home Screen" / installable PWA
// experience on iOS Safari + Android Chrome. The actual extension-based
// BMI/ASCAP filing path stays desktop-only (see project notes on
// chrome.debugger CDP requirement); this manifest just makes the review +
// triage + settings half of the app feel native on mobile.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Setlist Royalty Tracker',
    short_name: 'SRT',
    description:
      'find unreported live performances and claim the royalties you are owed.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
