import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabaseAuthService, supabaseLobbyService } from '@/services/supabase';
import type { GameSummary, LobbyParticipant, PlayerProfile } from '@/services/contracts';
import { AVATARS } from '@/data/avatars';

export default function Lobby(): JSX.Element {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = React.useState<PlayerProfile | null>(null);
  const [game, setGame] = React.useState<GameSummary | null>(null);
  const [participants, setParticipants] = React.useState<LobbyParticipant[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);

  const myParticipant = React.useMemo(
    () => participants.find((p) => p.profileId === profile?.id) ?? null,
    [participants, profile?.id],
  );
  const isHost = Boolean(game && profile && game.hostProfileId === profile.id);
  const everyoneReady = participants.length >= 2 && participants.every((p) => p.isReady);

  const refreshLobby = React.useCallback(async () => {
    if (!inviteCode) return;
    setError(null);
    try {
      const ensured = await supabaseAuthService.ensureProfile({ displayName: 'Player', avatarKey: 'hat' });
      setProfile(ensured);
      const loadedGame = await supabaseLobbyService.getGameByInviteCode(inviteCode);
      if (!loadedGame) throw new Error('Lobby not found.');
      setGame(loadedGame);
      let roster = await supabaseLobbyService.listParticipants(loadedGame.id);
      if (!roster.some((p) => p.profileId === ensured.id)) {
        await supabaseLobbyService.joinGame({ inviteCode, profileId: ensured.id });
        roster = await supabaseLobbyService.listParticipants(loadedGame.id);
      }
      setParticipants(roster);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lobby.');
    } finally {
      setIsLoading(false);
    }
  }, [inviteCode]);

  React.useEffect(() => {
    refreshLobby();
  }, [refreshLobby]);

  React.useEffect(() => {
    if (!inviteCode) return;
    const id = window.setInterval(() => {
      refreshLobby();
    }, 3000);
    return () => window.clearInterval(id);
  }, [inviteCode, refreshLobby]);

  React.useEffect(() => {
    if (!game || !inviteCode) return;
    if (game.status !== 'in_progress') return;
    if (isHost) {
      sessionStorage.setItem('mt_active_role', 'host');
      sessionStorage.setItem('mt_active_invite', inviteCode);
      navigate('/play', { replace: true });
      return;
    }
    sessionStorage.setItem('mt_active_role', 'spectator');
    sessionStorage.setItem('mt_active_invite', inviteCode);
    navigate(`/g/${inviteCode}`, { replace: true });
  }, [game, inviteCode, isHost, navigate]);

  async function onToggleReady(): Promise<void> {
    if (!game || !myParticipant) return;
    setIsBusy(true);
    setError(null);
    try {
      await supabaseLobbyService.setReady(game.id, myParticipant.participantId, !myParticipant.isReady);
      setParticipants(await supabaseLobbyService.listParticipants(game.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ready state.');
    } finally {
      setIsBusy(false);
    }
  }

  async function onStartGame(): Promise<void> {
    if (!game || !isHost || !everyoneReady) return;
    setIsBusy(true);
    setError(null);
    try {
      await supabaseLobbyService.startGame(game.id);
      sessionStorage.setItem('mt_active_role', 'host');
      sessionStorage.setItem('mt_active_invite', game.inviteCode);
      navigate('/play');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game.');
    } finally {
      setIsBusy(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-dvh flex items-center justify-center text-muted">Loading lobby...</div>;
  }

  return (
    <div className="min-h-dvh bg-surface-0 text-fg p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Game Lobby</h1>
          <div className="text-sm text-muted">Invite: {inviteCode}</div>
        </div>
        {error ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <div className="rounded-xl border border-surface-strong bg-surface-1 p-4">
          <div className="mb-3 text-sm font-medium text-muted">Players ({participants.length})</div>
          <div className="space-y-2">
            {participants.map((p) => {
              const avatar = AVATARS.find((a) => a.key === p.guestAvatarKey || a.key === 'hat');
              const name = p.profileId === profile?.id ? 'You' : p.guestName ?? 'Player';
              return (
                <div key={p.participantId} className="flex items-center justify-between rounded-lg border border-surface-strong px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span>{avatar?.emoji ?? '🎲'}</span>
                    <span className="text-sm">{name}</span>
                  </div>
                  <span className={`text-xs font-semibold ${p.isReady ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {p.isReady ? 'READY' : 'WAITING'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {myParticipant ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={onToggleReady}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {myParticipant.isReady ? 'Mark Not Ready' : 'Ready Up'}
              </button>
            ) : null}
            {isHost ? (
              <button
                type="button"
                disabled={!everyoneReady || isBusy}
                onClick={onStartGame}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Start Game
              </button>
            ) : null}
            <button type="button" onClick={refreshLobby} className="rounded-md border border-surface-strong px-3 py-2 text-sm">
              Refresh
            </button>
            {game ? <Link to={`/g/${game.inviteCode}`} className="rounded-md border border-surface-strong px-3 py-2 text-sm">Spectator View</Link> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
