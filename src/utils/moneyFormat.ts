/** Compact dollar display for HUD chips: $999 → unchanged; $1000 → $1k; $1234 → $1.2k */
export function formatAbbreviatedDollars(amount: number): string {
  if (!Number.isFinite(amount)) return '$0';
  if (amount < 1000) return `$${Math.round(amount)}`;
  const k = amount / 1000;
  const rounded = Math.round(k * 10) / 10;
  const str = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
  return `$${str}k`;
}
