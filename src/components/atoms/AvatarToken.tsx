// #index
// - //#component: circular avatar badge with color border (optional ring)

import React from 'react';

export type AvatarTokenProps = {
  emoji: string;
  borderColorClass?: string; // Tailwind classes for border color (e.g., 'border-teal-500')
  size?: number; // px size (default 64)
  qa?: string;
  ring?: boolean;
  ringColorClass?: string; // Tailwind ring color class (e.g., 'ring-teal-500')
};

export default function AvatarToken({
  emoji,
  borderColorClass = 'border-neutral-300 dark:border-neutral-700',
  size = 64,
  qa,
  ring = false,
  ringColorClass = 'ring-transparent',
}: AvatarTokenProps): JSX.Element {
  const style: React.CSSProperties = {
    width: size,
    height: size,
  };
  const borderWidthClass = ring ? 'border-4' : 'border-0';
  return (
    <div
      data-qa={qa}
      className={`rounded-full ${borderWidthClass} ${borderColorClass} flex items-center justify-center text-3xl bg-white dark:bg-neutral-800 ${ring ? `ring-4 ${ringColorClass}` : ''}`}
      style={style}
    >
      <span>{emoji}</span>
    </div>
  );
}
