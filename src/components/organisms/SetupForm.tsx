// #index
// - //#imports: third-party and app modules
// - //#state-derived: used colors/avatars from store
// - //#local-state: color/avatar/seed (nicknames default to Player N on add)
// - //#effects: keep selections valid
// - //#handlers: add player and start game
// - //#render: form layout and combined players/turn order list

import React, { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addPlayer, removePlayer, reorderPlayers, type PlayerLite, setRacePotOptIn, adjustPlayerMoney, setPlayerNickname } from '@/features/players/playersSlice';
import { setSeed } from '@/features/cards/cardsSlice';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '@/app/store';
import { AVATARS } from '@/data/avatars';
import ColorSwatchPicker from '@/components/molecules/ColorSwatchPicker';
import AvatarPicker from '@/components/molecules/AvatarPicker';
import TurnOrderList from '@/components/molecules/TurnOrderList';
import { initializeRacePot } from '@/features/session/sessionSlice';
import { supabaseAuthService, supabaseLobbyService } from '@/services/supabase';

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#06b6d4', '#f97316'];
const SHOW_CARD_SEED = false; // MVP: decks are managed IRL; hide seed input
const RACE_POT_ENTRY = 100;

export default function SetupForm(): JSX.Element {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const players = useSelector((s: RootState) => s.players.players);

  // //#state-derived
  const usedColors = useMemo(() => new Set(players.map((p) => p.color)), [players]);
  const usedAvatars = useMemo(() => new Set(players.map((p) => p.avatarKey)), [players]);

  const firstAvailableColor = useMemo(() => COLORS.find((c) => !usedColors.has(c)) ?? COLORS[0], [usedColors]);
  const firstAvailableAvatar = useMemo(() => AVATARS.find((a) => !usedAvatars.has(a.key))?.key ?? AVATARS[0].key, [usedAvatars]);

  // //#local-state
  const [color, setColor] = useState(firstAvailableColor);
  const [avatarKey, setAvatarKey] = useState<string>(firstAvailableAvatar);
  const [colorPickerOpen, setColorPickerOpen] = useState<boolean>(false);
  const [seed, setSeedInput] = useState<string>('monopoly');
  const [isCreatingLobby, setIsCreatingLobby] = useState<boolean>(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  // //#effects
  React.useEffect(() => {
    if (usedColors.has(color)) setColor(firstAvailableColor);
    if (usedAvatars.has(avatarKey)) setAvatarKey(firstAvailableAvatar);
  }, [usedColors, usedAvatars, color, avatarKey, firstAvailableColor, firstAvailableAvatar]);

  useEffect(() => {
    if (!colorPickerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest('[data-qa="color-popover"]')) return;
      if (el.closest('[data-qa="avatar-selected"]')) return;
      setColorPickerOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [colorPickerOpen]);

  const selectionInvalid = usedColors.has(color) || usedAvatars.has(avatarKey);

  // //#handlers
  const onAdd = (): void => {
    if (selectionInvalid) return;
    // Default display name: next ordinal = current roster size + 1.
    // Edge cases:
    // - After removing someone, length+1 can collide with an existing "Player N" (e.g. only
    //   "Player 2" remains, next add is "Player 2" again). GM can rename in the turn list.
    // - Renamed players keep custom names; new adds still use length+1 only (no scan of gaps).
    const nickname = `Player ${players.length + 1}`;
    const p: Omit<PlayerLite, 'positionIndex'> = {
      id: crypto.randomUUID(),
      nickname,
      color,
      avatarKey,
      money: 1500,
      properties: [],
    };
    dispatch(addPlayer(p));
    setColorPickerOpen(false);
    const nextColor = COLORS.find((c) => !usedColors.has(c) && c !== color) ?? firstAvailableColor;
    const nextAvatar = AVATARS.find((a) => !usedAvatars.has(a.key) && a.key !== avatarKey)?.key ?? firstAvailableAvatar;
    setColor(nextColor);
    setAvatarKey(nextAvatar);
  };

  const onStart = (): void => {
    sessionStorage.setItem('mt_active_role', 'host');
    sessionStorage.removeItem('mt_active_invite');
    if (SHOW_CARD_SEED) dispatch(setSeed(seed));
    // Initialize race pot and deduct if 2+ opted in
    const participants = players.filter((p) => p.racePotOptIn).map((p) => p.id);
    if (participants.length >= 2) {
      dispatch(initializeRacePot({ participants, amountPerPlayer: RACE_POT_ENTRY }));
      for (const pid of participants) {
        dispatch(adjustPlayerMoney({ id: pid, delta: -RACE_POT_ENTRY }));
      }
    }
    navigate('/play');
  };

  const onCreateOnlineLobby = async (): Promise<void> => {
    setLobbyError(null);
    setIsCreatingLobby(true);
    try {
      const profile = await supabaseAuthService.getProfile();
      if (!profile) throw new Error('Profile not loaded.');
      const game = await supabaseLobbyService.createGame({ hostProfileId: profile.id });
      await supabaseLobbyService.joinGame({ inviteCode: game.inviteCode, profileId: profile.id });
      sessionStorage.setItem('mt_active_role', 'host');
      sessionStorage.setItem('mt_active_invite', game.inviteCode);
      navigate(`/lobby/${game.inviteCode}`);
    } catch (err) {
      setLobbyError(err instanceof Error ? err.message : 'Unable to create lobby.');
    } finally {
      setIsCreatingLobby(false);
    }
  };

  const turnPlayers = players.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    color: p.color,
    avatarKey: p.avatarKey,
    emoji: AVATARS.find((a) => a.key === p.avatarKey)?.emoji,
    racePotOptIn: p.racePotOptIn,
  }));

  // //#render
  return (
    <div data-cmp="o/SetupForm" className="w-full max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Monopoly Tracker — Setup</h1>

      {/* Roster first — then add controls below feel like “next row” */}
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Players: Turn order (drag to reorder)</h2>
        {players.length === 0 && <p className="text-sm text-muted">No players yet. Choose avatar and color below, then add.</p>}
        <TurnOrderList
          players={turnPlayers}
          onReorder={(ids) => dispatch(reorderPlayers(ids))}
          onRemove={(id) => dispatch(removePlayer(id))}
          onOptInChange={(id, optIn) => dispatch(setRacePotOptIn({ id, optIn }))}
          onNicknameChange={(id, nickname) => dispatch(setPlayerNickname({ id, nickname }))}
        />
      </div>

      <section
        data-qa="new-player-section"
        className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3"
      >
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">New player</div>
        <div className="mt-2 space-y-3">
          <div data-qa="avatar-section">
            <AvatarPicker
              options={AVATARS}
              used={usedAvatars}
              value={avatarKey}
              selectedColor={color}
              colorPopoverOpen={colorPickerOpen}
              onSelectedClick={() => setColorPickerOpen((v) => !v)}
              onChange={(key) => {
                setAvatarKey(key);
                setColorPickerOpen(false);
              }}
              colorPopoverContent={
                <div className="space-y-2">
                  <div className="text-xs font-semibold">Pick a color</div>
                  <ColorSwatchPicker
                    colors={COLORS}
                    usedColors={usedColors}
                    value={color}
                    onChange={(c) => {
                      setColor(c);
                      setColorPickerOpen(false);
                    }}
                  />
                </div>
              }
            />
          </div>

          {SHOW_CARD_SEED && (
            <div data-qa="seed-section" className="space-y-2">
              <label className="block text-sm font-medium">Card Shuffle Seed</label>
              <input
                value={seed}
                onChange={(e) => setSeedInput(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700"
              />
            </div>
          )}

          <div className="flex items-end justify-end">
            <button
              data-qa="btn-add-player"
              onClick={onAdd}
              disabled={selectionInvalid}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-blue-600 text-white font-semibold shadow hover:enabled:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Add Player
            </button>
          </div>
        </div>
      </section>

      <div className="flex justify-center gap-3">
        <button
          data-qa="btn-create-online-lobby"
          onClick={onCreateOnlineLobby}
          disabled={isCreatingLobby}
          className="inline-flex min-w-48 items-center justify-center rounded-md px-4 py-2 border border-surface-strong bg-surface-1 text-fg font-semibold shadow hover:bg-surface-2 disabled:opacity-50"
        >
          {isCreatingLobby ? 'Creating Lobby...' : 'Create Online Lobby'}
        </button>
        {players.length >= 2 && (
          <button
            data-qa="btn-start-game"
            onClick={onStart}
            className="inline-flex min-w-48 items-center justify-center rounded-md px-4 py-2 bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            Start Game
          </button>
        )}
      </div>
      {lobbyError ? <p className="text-center text-sm text-red-600">{lobbyError}</p> : null}
    </div>
  );
}
