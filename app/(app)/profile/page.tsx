import { redirect } from 'next/navigation';
import { currentUser } from '../../../lib/auth';
import { signOut } from '../../actions/auth';
import ProfileForm from '../../../components/ProfileForm';

export const metadata = { title: 'Profile — Ledger' };

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect('/login');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Profile</h1>
        <p className="text-[13px] text-ink2">{user.email}</p>
      </div>

      <ProfileForm
        displayName={user.displayName}
        email={user.email}
        salaryPaisa={user.salaryPaisa}
        dpsRatePct={user.dpsRatePct}
      />

      <form action={signOut}>
        <button type="submit" className="btn btn-ghost w-full">
          Sign out
        </button>
      </form>
    </div>
  );
}
