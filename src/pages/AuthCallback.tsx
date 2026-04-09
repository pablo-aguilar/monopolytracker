import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase';
import { supabaseAuthService } from '@/services/supabase/supabase-auth-service';

export default function AuthCallback(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/setup';
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    async function completeSignIn(): Promise<void> {
      try {
        const code = new URL(window.location.href).searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }
        await supabaseAuthService.ensureProfile({
          displayName: 'Player',
          avatarKey: 'hat',
        });
        if (mounted) navigate(redirect, { replace: true });
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    }

    completeSignIn();
    return () => {
      mounted = false;
    };
  }, [navigate, redirect]);

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-0 text-fg px-4">
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Sign-in failed: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-surface-0 text-fg">
      <div className="text-sm text-muted">Finishing sign-in...</div>
    </div>
  );
}
