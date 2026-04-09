// #index
// - //#imports: SpectatorDashboard wrapper page with share code header

import React from 'react';
import { useParams } from 'react-router-dom';
import SpectatorDashboard from '@/components/organisms/SpectatorDashboard';
import { supabaseLobbyService } from '@/services/supabase';
import type { GameSummary, LobbyParticipant } from '@/services/contracts';
import { AVATARS } from '@/data/avatars';

export default function Spectate(): JSX.Element {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [game, setGame] = React.useState<GameSummary | null>(null);
  const [participants, setParticipants] = React.useState<LobbyParticipant[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    sessionStorage.setItem('mt_active_role', 'spectator');
    if (shareCode) sessionStorage.setItem('mt_active_invite', shareCode);
  }, [shareCode]);

  React.useEffect(() => {
    if (!shareCode) return;
    const inviteCode = shareCode;
    let mounted = true;
    async function load(): Promise<void> {
      try {
        const foundGame = await supabaseLobbyService.getGameByInviteCode(inviteCode);
        if (!mounted) return;
        setGame(foundGame);
        if (!foundGame) return;
        setParticipants(await supabaseLobbyService.listParticipants(foundGame.id));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load spectator data.');
      }
    }
    load();
    const id = window.setInterval(load, 3000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [shareCode]);

  return (
    <div data-qa="spectate-page" className="min-h-dvh flex items-start justify-center p-6 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Spectator View</h1>
          <div className="text-sm opacity-80">Share code: {shareCode}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Live Lobby Status</div>
            <div className="text-xs uppercase tracking-wide opacity-70">{game?.status ?? 'unknown'}</div>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <div className="mt-3 space-y-2">
            {participants.map((p) => {
              const avatarKey = p.guestAvatarKey ?? 'hat';
              const avatar = AVATARS.find((a) => a.key === avatarKey);
              return (
                <div key={p.participantId} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span>{avatar?.emoji ?? '🎲'}</span>
                    <span>{p.guestName ?? p.profileId ?? 'Player'}</span>
                  </span>
                  <span className={p.isReady ? 'text-emerald-600' : 'text-amber-600'}>
                    {p.isReady ? 'Ready' : 'Waiting'}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs opacity-70">
            Spectator mode is read-only. Gameplay controls are only available to the game host.
          </p>
        </div>
        <SpectatorDashboard />
      </div>
    </div>
  );
} 