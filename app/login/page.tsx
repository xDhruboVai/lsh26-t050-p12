import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthForm from '../../components/AuthForm';
import { signIn } from '../actions/auth';
import { currentUser } from '../../lib/auth';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../../lib/demo';

export const metadata: Metadata = { title: 'Sign in — Ledger' };

export default async function LoginPage() {
  if (await currentUser()) redirect('/');
  return (
    <AuthForm mode="signin" action={signIn} demo={{ email: DEMO_EMAIL, password: DEMO_PASSWORD }} />
  );
}
