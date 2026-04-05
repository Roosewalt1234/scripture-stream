'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/settings`,
    });
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  if (sent) return (
    <div className="bg-white rounded-xl shadow p-8 text-center">
      <p className="text-stone-600">Password reset link sent to <strong>{email}</strong>.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow p-8">
      <h2 className="text-xl font-semibold text-stone-800 mb-6">Reset password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          placeholder="you@example.com" required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="w-full bg-amber-600 text-white font-semibold py-2.5 rounded-lg">
          Send reset link
        </button>
      </form>
      <p className="text-center text-sm text-stone-500 mt-4">
        <Link href="/signin" className="text-amber-600 hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
