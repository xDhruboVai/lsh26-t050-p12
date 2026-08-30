import { redirect } from 'next/navigation';
import { currentUser } from '../../lib/auth';
import { loadLedger } from '../../lib/repo';
import TabBar from '../../components/TabBar';
import TopBar from '../../components/TopBar';
import LedgerProvider from '../../components/LedgerProvider';

/**
 * The gate. Every page inside this group is behind it, and the route group
 * name is in parentheses so the URLs are unchanged.
 *
 * The ledger is loaded once here on the server and handed down, so no page
 * flashes empty while it fetches.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const ledger = await loadLedger(user);

  return (
    <LedgerProvider initial={ledger}>
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
        <TopBar name={user.displayName || user.email} />
        <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
        <TabBar />
      </div>
    </LedgerProvider>
  );
}
