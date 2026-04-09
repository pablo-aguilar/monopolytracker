import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase';

export default function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const location = useLocation();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthed, setIsAuthed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Missing auth configuration.');
      setIsLoading(false);
      return () => undefined;
    }
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(Boolean(data.session));
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthed(Boolean(session));
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-0 text-fg">
        <div className="text-sm text-muted">Checking session...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-0 text-fg px-4">
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return children;
}
