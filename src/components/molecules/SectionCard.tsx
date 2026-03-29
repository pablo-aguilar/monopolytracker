import React from 'react';

export interface SectionCardProps {
  children: React.ReactNode;
  /** Full custom header (used when not using title/status/headerTrailing). */
  header?: React.ReactNode;
  /** Primary label in the structured header row (e.g. deck name). */
  title?: React.ReactNode;
  /** Shown inline after title with a small gutter (e.g. “Drawn”). */
  status?: React.ReactNode;
  /** Right side of structured header (e.g. undo control). */
  headerTrailing?: React.ReactNode;
  className?: string;
  /**
   * Fill the flex cross-axis (equal height in a row) and vertically center `children`
   * below the header. Use with a stretching flex parent (e.g. `items-stretch`) and
   * `flex-1 min-w-0` on the card when pairing cards side by side.
   */
  fillHeight?: boolean;
}

/**
 * Bordered surface panel used in play flow and similar UIs.
 * Shell: `rounded-lg border border-surface bg-surface-2`. Add padding via `className` (e.g. `p-3`) when needed.
 *
 * Structured header (`title` / `status` / `headerTrailing`) renders a title row with optional trailing control.
 */
export default function SectionCard({ children, header, title, status, headerTrailing, className, fillHeight }: SectionCardProps): JSX.Element {
  const structured =
    title != null || status != null || headerTrailing != null ? (
      <div className="flex shrink-0 items-center justify-between gap-2  px-3 pt-3 pb-2">
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1 text-xs">
          {title != null && (
            <span className="font-semibold uppercase tracking-wide text-subtle">{title}</span>
          )}
          {status != null && <span className="font-semibold text-subtle">{status}</span>}
        </div>
        {headerTrailing}
      </div>
    ) : null;

  const shellClass = fillHeight
    ? 'rounded-lg relative w-full border border-surface bg-surface-2 flex min-h-0 flex-col self-stretch'
    : 'rounded-lg relative h-fit w-full border border-surface bg-surface-2';

  const body =
    fillHeight ? (
      <div className="flex min-h-0 flex-1 flex-col justify-center">{children}</div>
    ) : (
      children
    );

  return (
    <div data-cmp="m/SectionCard" className={`${shellClass} ${className ?? ''}`}>
      {structured ?? header}
      {body}
    </div>
  );
}
