// #index
// - //#component: player card with avatar token and actions

import React from 'react';
import AvatarToken from '@/components/atoms/AvatarToken';
import { AVATARS } from '@/data/avatars';

export type PlayerCardProps = {
  id: string;
  nickname: string;
  color: string;
  avatarKey: string;
  onRemove?: (id: string) => void;
};

export default function PlayerCard({ id, nickname, color, avatarKey, onRemove }: PlayerCardProps): JSX.Element {
  const avatar = AVATARS.find((a) => a.key === avatarKey);
  return (
    <div className="rounded-md border border-neutral-300 dark:border-neutral-700 p-3 flex items-center justify-between">
      <div data-qa="players-list--avatar" className="flex items-center gap-3">
        <div style={{ ['--player-color' as any]: color } as React.CSSProperties}>
          <AvatarToken emoji={avatar?.emoji ?? '🙂'} borderColorClass="border-[color:var(--player-color)]" ring ringColorClass="ring-[color:var(--player-color)]" size={64} />
        </div>
        <div>
          <div className="font-semibold">{nickname}</div>
        </div>
      </div>
      {onRemove && (
        <button data-qa={`btn-remove-${id}`} onClick={() => onRemove(id)} className="inline-flex items-center justify-center rounded-md px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400">
          Remove
        </button>
      )}
    </div>
  );
}
