import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
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
  description: 'stop leaving live performance royalties on the table',
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
      </body>
    </html>
  );
}
