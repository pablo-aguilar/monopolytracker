import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabaseAuthService } from '@/services/supabase/supabase-auth-service';

export default function RequireOnboarding({ children }: { children: JSX.Element }): JSX.Element {
  const location = useLocation();
  const [isLoading, setIsLoading] = React.useState(true);
  const [needsWelcome, setNeedsWelcome] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    supabaseAuthService
      .getProfile()
      .then((p) => {
        if (!mounted) return;
        setNeedsWelcome(!p || !p.onboardingCompleted);
      })
      .catch(() => {
        if (!mounted) return;
        setNeedsWelcome(true);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [location.pathname, location.search]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-0 text-fg">
        <div className="text-sm text-muted">Loading profile...</div>
      </div>
    );
  }

  if (needsWelcome) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/welcome?redirect=${redirect}`} replace />;
  }

  return children;
}
