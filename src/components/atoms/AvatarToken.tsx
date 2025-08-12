// #index
// - //#component: circular avatar badge with color border

import React from 'react';

export type AvatarTokenProps = {
  emoji: string;
  color: string; // border color
  size?: number; // px size (default 64)
  qa?: string;
};

export default function AvatarToken({ emoji, color, size = 64, qa }: AvatarTokenProps): JSX.Element {
  const borderWidth = 4;
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderColor: color,
    borderWidth,
  };
  return (
    <div
      data-qa={qa}
      className="rounded-full border flex items-center justify-center text-3xl bg-white dark:bg-neutral-800"
      style={style}
    >
      <span>{emoji}</span>
    </div>
  );
}
