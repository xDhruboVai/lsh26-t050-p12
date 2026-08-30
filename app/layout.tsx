import type { Metadata, Viewport } from 'next';
import './globals.css';
import TabBar from '../components/TabBar';
import CaseBar from '../components/CaseBar';

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
    <html lang="en">
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
