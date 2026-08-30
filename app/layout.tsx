import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

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

const DESCRIPTION =
  'Record spending with almost no typing, see where the month went, forecast the rest of it, ' +
  'and put a real date on every savings goal.';

export const metadata: Metadata = {
  // Vercel sets VERCEL_URL on every deployment; the fallback keeps local dev quiet.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  ),
  title: 'Ledger — Personal Ledger Manager',
  description: DESCRIPTION,
  applicationName: 'Ledger',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Ledger', statusBarStyle: 'black-translucent' },
  openGraph: {
    type: 'website',
    siteName: 'Ledger',
    title: 'Ledger — see where the month went',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ledger — see where the month went',
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f4ef" }, { media: "(prefers-color-scheme: dark)", color: "#0d1410" }],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrument.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
