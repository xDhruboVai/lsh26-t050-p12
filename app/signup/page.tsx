import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthForm from '../../components/AuthForm';
import { signUp } from '../actions/auth';
import { currentUser } from '../../lib/auth';

export const metadata: Metadata = { title: 'Create your ledger — Ledger' };

export default async function SignupPage() {
  if (await currentUser()) redirect('/');
  return <AuthForm mode="signup" action={signUp} />;
}
