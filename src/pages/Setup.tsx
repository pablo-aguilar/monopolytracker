import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addPlayer, removePlayer, type PlayerLite } from '@/features/players/playersSlice';
import { setSeed } from '@/features/cards/cardsSlice';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '@/app/store';
import { AVATARS } from '@/data/avatars';

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#06b6d4', '#f97316'];

export default function Setup(): JSX.Element {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const players = useSelector((s: RootState) => s.players.players);

  const [nickname, setNickname] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [avatarKey, setAvatarKey] = useState(AVATARS[0].key);
  const [seed, setSeedInput] = useState<string>('monopoly');

  const onAdd = (): void => {
    if (!nickname.trim()) return;
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
  };

  const onStart = (): void => {
    dispatch(setSeed(seed));
    navigate('/play');
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold">Monopoly Tracker — Setup</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium">Nickname</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Player name" className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Color</label>
            <select value={color} onChange={(e) => setColor(e.target.value)} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-3">
            <label className="block text-sm font-medium">Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAvatarKey(a.key)}
                  className={`rounded-md border px-3 py-2 text-2xl ${avatarKey === a.key ? 'border-blue-500 ring-2 ring-blue-300' : 'border-neutral-300 dark:border-neutral-700'}`}
                >
                  <span title={a.label}>{a.emoji}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium">Card Shuffle Seed</label>
            <input value={seed} onChange={(e) => setSeedInput(e.target.value)} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700" />
          </div>
          <div className="flex items-end">
            <button onClick={onAdd} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
              Add Player
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-medium">Players</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {players.map((p) => (
              <div key={p.id} className="rounded-md border border-neutral-300 dark:border-neutral-700 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl" style={{ color: p.color }}>
                    ●
                  </div>
                  <div>
                    <div className="font-semibold">{p.nickname}</div>
                    <div className="text-xs opacity-70">${p.money}</div>
                  </div>
                </div>
                <button onClick={() => dispatch(removePlayer(p.id))} className="inline-flex items-center justify-center rounded-md px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onStart} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" disabled={players.length === 0}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
} 