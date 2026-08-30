import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import TabBar from '../components/TabBar';
import CaseBar from '../components/CaseBar';

// Downloaded and self-hosted at build time: no runtime request, no FOUT.
const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-instrument',
  display: 'swap',
});

// Money needs tabular figures. Plex Mono has the best ones on Google Fonts.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ledger — Personal Ledger Manager',
  description:
    'Record spending with almost no typing, see where the month went, forecast the rest of it, and put a real date on every savings goal.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0e7c5a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrument.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh">
        <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
          <CaseBar />
          <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}
