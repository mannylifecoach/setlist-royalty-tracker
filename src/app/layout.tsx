import type { Metadata } from 'next';
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
  description: 'bmi and ascap only auto-track the the highest-grossing tours. we find unreported live performances using 9.6m+ crowdsourced setlists — so songwriters get paid.',
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
