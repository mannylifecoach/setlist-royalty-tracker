import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
});

const sora = Sora({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-marker',
});

export const metadata: Metadata = {
  title: 'setlist royalty tracker',
  description: 'bmi and ascap only auto-track the highest-grossing tours. we find unreported live performances using 9.6m+ crowdsourced setlists — so creators get paid.',
  metadataBase: new URL('https://setlistroyalty.com'),
  openGraph: {
    title: 'stop leaving royalties on the table',
    description: 'bmi and ascap only auto-track the the highest-grossing tours. we find the rest using 9.6m+ crowdsourced setlists.',
    url: 'https://setlistroyalty.com',
    siteName: 'setlist royalty tracker',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'setlist royalty tracker' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'stop leaving royalties on the table',
    description: 'bmi and ascap only auto-track the the highest-grossing tours. we find the rest using 9.6m+ crowdsourced setlists.',
    images: ['/og-image.png'],
  },
  // iOS standalone-mode chrome + home-screen title. Pairs with the web app
  // manifest (app/manifest.ts) and the apple-icon.png file-convention.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SRT',
  },
};

// Next.js 16 moved themeColor + colorScheme out of metadata into a separate
// viewport export. The black theme matches the app's dark UI so the iOS
// status bar + Android nav blend in when running standalone.
export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
