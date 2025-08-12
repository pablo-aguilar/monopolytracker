// #index
// - //#component: grid of avatars with uniqueness enforcement

import React from 'react';
import AvatarToken from '@/components/atoms/AvatarToken';

export type AvatarOption = { key: string; label: string; emoji: string };

export type AvatarPickerProps = {
  options: AvatarOption[];
  used: Set<string>;
  value: string; // selected key
  onChange: (key: string) => void;
};

export default function AvatarPicker({ options, used, value, onChange }: AvatarPickerProps): JSX.Element {
  // //#component
  return (
    <div className="grid grid-cols-6 gap-2">
      {options.map((a) => {
        const taken = used.has(a.key);
        const selected = value === a.key;
        return (
          <button
            key={a.key}
            type="button"
            data-qa={`avatar-${a.key}`}
            disabled={taken && !selected}
            onClick={() => onChange(a.key)}
            className={`rounded-md border px-3 py-2 flex items-center justify-center ${selected ? 'border-teal-500 ring-2 ring-teal-300' : 'border-neutral-300 dark:border-neutral-700'} ${taken && !selected ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'}`}
            aria-pressed={selected}
            aria-label={`${a.label}${taken && !selected ? ' (taken)' : ''}`}
            title={a.label}
          >
            <AvatarToken emoji={a.emoji} borderColorClass={selected ? 'border-teal-500' : 'border-neutral-300 dark:border-neutral-700'} size={40} ring={false} />
          </button>
        );
      })}
    </div>
  );
}
