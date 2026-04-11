import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AvatarPicker from '@/components/molecules/AvatarPicker';
import { AVATARS } from '@/data/avatars';
import { supabaseAuthService } from '@/services/supabase/supabase-auth-service';

export default function WelcomeProfile(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/setup';

  const [displayName, setDisplayName] = React.useState('');
  const [avatarKey, setAvatarKey] = React.useState<string>(AVATARS[0]?.key ?? 'hat');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    supabaseAuthService.getProfile().then((p) => {
      if (!mounted) return;
      if (p?.onboardingCompleted) {
        navigate(redirectTo, { replace: true });
      }
    }).finally(() => {
      if (mounted) setIsChecking(false);
    });
    return () => {
      mounted = false;
    };
  }, [navigate, redirectTo]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const name = displayName.trim();
    if (!name) {
      setError('Please enter a display name.');
      return;
    }
    setIsSubmitting(true);
    try {
      await supabaseAuthService.completeOnboarding({ displayName: name, avatarKey });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save profile.';
      console.error('completeOnboarding failed', err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-0 text-fg">
        <div className="text-sm text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div data-qa="welcome-profile-page" className="min-h-dvh flex items-center justify-center bg-surface-0 px-4 py-10 text-fg">
      <div className="w-full max-w-lg rounded-2xl border border-surface-strong bg-surface-1 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-2 text-sm text-muted">
          Choose the name and avatar other players will see in the game.
        </p>
        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Display name</span>
            <input
              type="text"
              required
              maxLength={48}
              autoComplete="nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jamie"
              className="w-full rounded-lg border border-surface-strong bg-surface-0 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              data-qa="welcome-display-name"
            />
          </label>
          <div>
            <div className="mb-2 text-sm font-medium">Avatar</div>
            <AvatarPicker
              options={AVATARS}
              used={new Set()}
              value={avatarKey}
              onChange={setAvatarKey}
              selectedColor="#22c55e"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            data-qa="welcome-continue"
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
