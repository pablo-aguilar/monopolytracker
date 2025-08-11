export type AvatarKey =
  | 'hat'
  | 'car'
  | 'dog'
  | 'ship'
  | 'iron'
  | 'horse';

export const AVATARS: { key: AvatarKey; label: string; emoji: string }[] = [
  { key: 'hat', label: 'Top Hat', emoji: '🎩' },
  { key: 'car', label: 'Car', emoji: '🚗' },
  { key: 'dog', label: 'Dog', emoji: '🐶' },
  { key: 'ship', label: 'Ship', emoji: '🚢' },
  { key: 'iron', label: 'Iron', emoji: '🧺' },
  { key: 'horse', label: 'Horse', emoji: '🐴' },
];
