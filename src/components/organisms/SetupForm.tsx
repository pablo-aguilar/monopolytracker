// #index
// - //#imports: third-party and app modules
// - //#state-derived: used colors/avatars from store
// - //#local-state: inputs for nickname/color/avatar/seed
// - //#effects: keep selections valid
// - //#handlers: add player and start game
// - //#render: form layout and players list

import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addPlayer, removePlayer, type PlayerLite } from '@/features/players/playersSlice';
import { setSeed } from '@/features/cards/cardsSlice';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '@/app/store';
import { AVATARS } from '@/data/avatars';
import ColorSwatchPicker from '@/components/molecules/ColorSwatchPicker';
import AvatarPicker from '@/components/molecules/AvatarPicker';
import PlayerCard from '@/components/molecules/PlayerCard';

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#06b6d4', '#f97316'];

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
  const [nickname, setNickname] = useState('');
  const [color, setColor] = useState(firstAvailableColor);
  const [avatarKey, setAvatarKey] = useState<string>(firstAvailableAvatar);
  const [seed, setSeedInput] = useState<string>('monopoly');

  // //#effects
  React.useEffect(() => {
    if (usedColors.has(color)) setColor(firstAvailableColor);
    if (usedAvatars.has(avatarKey)) setAvatarKey(firstAvailableAvatar);
  }, [usedColors, usedAvatars, color, avatarKey, firstAvailableColor, firstAvailableAvatar]);

  const selectionInvalid = usedColors.has(color) || usedAvatars.has(avatarKey);

  // //#handlers
  const onAdd = (): void => {
    if (!nickname.trim() || selectionInvalid) return;
    const p: PlayerLite = {
      id: crypto.randomUUID(),
      nickname: nickname.trim(),
      color,
      avatarKey,
      money: 1500,
      properties: [],
    };
    dispatch(addPlayer(p));
    setNickname('');
    const nextColor = COLORS.find((c) => !usedColors.has(c) && c !== color) ?? firstAvailableColor;
    const nextAvatar = AVATARS.find((a) => !usedAvatars.has(a.key) && a.key !== avatarKey)?.key ?? firstAvailableAvatar;
    setColor(nextColor);
    setAvatarKey(nextAvatar);
  };

  const onStart = (): void => {
    dispatch(setSeed(seed));
    navigate('/play');
  };

  // //#render
  return (
    <div className="w-full max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Monopoly Tracker — Setup</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div data-qa="player-nickname" className="space-y-2 md:col-span-3">
          <label className="block text-sm font-medium">Nickname</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Player name" className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700" />
        </div>

        <div data-qa="color-section" className="space-y-2 md:col-span-3">
          <label className="block text-sm font-medium">Color</label>
          <ColorSwatchPicker colors={COLORS} usedColors={usedColors} value={color} onChange={setColor} />
        </div>

        <div data-qa="avatar-section" className="space-y-2 md:col-span-3">
          <label className="block text-sm font-medium">Avatar</label>
          <AvatarPicker options={AVATARS} used={usedAvatars} value={avatarKey} onChange={(key) => setAvatarKey(key)} />
        </div>

        <div data-qa="seed-section" className="space-y-2 md:col-span-2">
          <label className="block text-sm font-medium">Card Shuffle Seed</label>
          <input value={seed} onChange={(e) => setSeedInput(e.target.value)} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700" />
        </div>
        <div className="flex items-end">
          <button data-qa="btn-add-player" onClick={onAdd} disabled={!nickname.trim() || selectionInvalid} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-blue-600 disabled:bg-blue-300 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
            Add Player
          </button>
        </div>
      </div>

      <div data-qa="players-list" className="space-y-2">
        <h2 className="text-lg font-medium">Players</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {players.map((p) => (
            <PlayerCard key={p.id} id={p.id} nickname={p.nickname} color={p.color} avatarKey={p.avatarKey} onRemove={(id) => dispatch(removePlayer(id))} />
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button data-qa="btn-start-game" onClick={onStart} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" disabled={players.length === 0}>
          Start Game
        </button>
      </div>
    </div>
  );
}
