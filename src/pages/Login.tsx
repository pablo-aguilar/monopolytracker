import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseAuthService } from '@/services/supabase/supabase-auth-service';

export default function Login(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/setup';
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabaseAuthService.getSession().then((session) => {
      if (session) navigate(redirect, { replace: true });
    }).catch(() => {
      // ignore; user can still sign in manually
    });
  }, [navigate, redirect]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`;
      await supabaseAuthService.signInWithMagicLink(email.trim(), callbackUrl);
      setMessage('Check your email for a magic sign-in link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send sign-in link.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-surface-0 px-4 text-fg">
      <div className="w-full max-w-md rounded-2xl border border-surface-strong bg-surface-1 p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in to Monopoly Tracker</h1>
        <p className="mt-2 text-sm text-muted">Use your email to continue to your game lobby.</p>
        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-surface-strong bg-surface-0 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500"
              placeholder="you@example.com"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isSubmitting ? 'Sending...' : 'Send magic link'}
          </button>
        </form>
        {message ? <p className="mt-3 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
