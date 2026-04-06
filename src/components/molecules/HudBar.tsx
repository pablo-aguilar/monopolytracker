import React from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import StatPill from '@/components/atoms/StatPill';
import { FaChevronDown } from 'react-icons/fa';
import { PiBuildingsBold, PiCardsThree } from 'react-icons/pi';
import { LuLandPlot } from 'react-icons/lu';
import type { ColorGroup } from '@/data/board';
import { formatAbbreviatedDollars } from '@/utils/moneyFormat';

export interface HudBarProps {
  housesRemaining: number;
  hotelsRemaining: number;
  skyscrapersRemaining?: number;
  depotsLeft: number;
  freeParkingPot: number;
  bankUnownedLots: Array<{
    id: string;
    name: string;
    group: ColorGroup;
  }>;
  chanceLeft: number;
  communityLeft: number;
  busLeft: number;
  className?: string;
}

export default function HudBar({
  housesRemaining,
  hotelsRemaining,
  skyscrapersRemaining = 12,
  depotsLeft,
  freeParkingPot,
  bankUnownedLots,
  chanceLeft,
  communityLeft,
  busLeft,
  className,
}: HudBarProps): JSX.Element {
  const COLOR_GROUP_ORDER: ColorGroup[] = ['brown', 'lightBlue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkBlue'];
  const COLOR_GROUP_LABEL: Record<ColorGroup, string> = {
    brown: 'Brown',
    lightBlue: 'Light Blue',
    pink: 'Pink',
    orange: 'Orange',
    red: 'Red',
    yellow: 'Yellow',
    green: 'Green',
    darkBlue: 'Dark Blue',
  };
  const COLOR_GROUP_DOT_CLASS: Record<ColorGroup, string> = {
    brown: 'bg-amber-800',
    lightBlue: 'bg-sky-300',
    pink: 'bg-pink-400',
    orange: 'bg-orange-400',
    red: 'bg-red-600',
    yellow: 'bg-yellow-400',
    green: 'bg-green-600',
    darkBlue: 'bg-blue-900',
  };
  const lotsByGroup = React.useMemo(() => {
    const grouped = new Map<ColorGroup, Array<{ id: string; name: string; group: ColorGroup }>>();
    for (const lot of bankUnownedLots) {
      const current = grouped.get(lot.group) ?? [];
      current.push(lot);
      grouped.set(lot.group, current);
    }
    return grouped;
  }, [bankUnownedLots]);

  const freeParkingShort = formatAbbreviatedDollars(freeParkingPot);
  const freeParkingFull = `$${freeParkingPot}`;
  const freeParkingTooltip = freeParkingShort !== freeParkingFull ? freeParkingFull : undefined;

  const unownedLotsCount = bankUnownedLots.length;
  const lotsCountBadge = (
    <span className="rounded-full bg-surface-1 px-1 py-px text-xs font-semibold text-muted">{unownedLotsCount}</span>
  );

  const StatRow = ({ iconSrc, alt, label, value }: { iconSrc: string; alt: string; label: string; value: number }): JSX.Element => (
    <div className="flex items-center justify-between gap-3 rounded-md bg-surface-1 px-2 py-1 text-xs">
      <span className="inline-flex items-center gap-1.5">
        <img src={iconSrc} alt={alt} className="h-4 w-4 inline-block align-middle" loading="lazy" decoding="async" />
        <span>{label}</span>
      </span>
      <strong>{value}</strong>
    </div>
  );

  const GroupPanel = ({
    icon,
    label,
    mobileLabel,
    ariaLabel,
    children,
  }: {
    icon: React.ReactNode;
    label: React.ReactNode;
    /** Shown below `sm` when set; default hides the label on small screens. */
    mobileLabel?: React.ReactNode;
    ariaLabel: string;
    children: React.ReactNode;
  }): JSX.Element => {
    const [open, setOpen] = React.useState(false);

    const { refs, floatingStyles, context } = useFloating({
      open,
      onOpenChange: setOpen,
      placement: 'bottom-end',
      middleware: [
        offset(8),
        flip({ padding: 8 }),
        shift({ padding: 8 }),
        size({
          padding: 8,
          apply({ availableHeight, elements }) {
            Object.assign(elements.floating.style, {
              maxHeight: `${Math.max(0, availableHeight)}px`,
              overflowY: 'auto',
            });
          },
        }),
      ],
      whileElementsMounted: autoUpdate,
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: 'menu' });

    const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

    return (
      <div className="relative">
        <button
          type="button"
          ref={refs.setReference}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={ariaLabel}
          className="inline-flex items-center gap-1 rounded-[18px] border border-surface bg-surface-0 pl-2 pr-1.5 py-1.5 text-sm font-normal text-fg sm:pl-3"
          {...getReferenceProps()}
        >
          <span className="inline-flex shrink-0 text-fg [&>svg]:h-4 [&>svg]:w-4" aria-hidden>
            {icon}
          </span>
          {mobileLabel != null ? (
            <>
              <span className="inline-flex min-w-0 items-center gap-1.5 sm:hidden">{mobileLabel}</span>
              <span className="hidden min-w-0 items-center gap-1.5 sm:inline-flex">{label}</span>
            </>
          ) : (
            <span className="hidden min-w-0 items-center gap-1.5 sm:inline-flex">{label}</span>
          )}
          <FaChevronDown className={`h-3 w-3 shrink-0 transition-transform text-faint ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {open ? (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-[100] min-w-[min(220px,calc(100vw-16px))] space-y-1 rounded-[14px] border border-surface bg-surface-0 p-2 shadow-lg outline-none"
              {...getFloatingProps()}
            >
              {children}
            </div>
          </FloatingPortal>
        ) : null}
      </div>
    );
  };

  return (
    <div data-qa="hud-bank" data-cmp="m/HudBar" className={`contents ${className ?? ''}`}>
      <StatPill
        label={
          <img
            src="/icons/freeparking.webp"
            alt="Free Parking"
            className="h-5 w-5 inline-block align-middle"
            loading="lazy"
            decoding="async"
          />
        }
        value={freeParkingShort}
        valueTooltip={freeParkingTooltip}
      />

      <GroupPanel
        icon={<PiCardsThree />}
        label="Cards"
        ariaLabel="Cards"
      >
        <StatRow iconSrc="/icons/bus.webp" alt="Bus" label="Bus" value={busLeft} />
        <StatRow iconSrc="/icons/chance.webp" alt="Chance cards" label="Chance" value={chanceLeft} />
        <StatRow iconSrc="/icons/community.webp" alt="Community cards" label="Community Chest" value={communityLeft} />
      </GroupPanel>

      <GroupPanel
        icon={<PiBuildingsBold />}
        label="Buildings"
        ariaLabel="Buildings"
      >
        <StatRow iconSrc="/icons/house.webp" alt="House" label="House" value={housesRemaining} />
        <StatRow iconSrc="/icons/hotel.webp" alt="Hotel" label="Hotel" value={hotelsRemaining} />
        <StatRow iconSrc="/icons/skyscraper.webp" alt="Skyscraper" label="Skyscraper" value={skyscrapersRemaining} />
        <StatRow iconSrc="/icons/depot2.webp" alt="Train depot" label="Depot" value={depotsLeft} />
      </GroupPanel>

      <GroupPanel
        icon={<LuLandPlot />}
        mobileLabel={lotsCountBadge}
        label={(
          <>
            <span>Lots</span>
            {lotsCountBadge}
          </>
        )}
        ariaLabel={`Lots, ${unownedLotsCount} unowned`}
      >
        {COLOR_GROUP_ORDER.map((group) => {
          const lots = lotsByGroup.get(group) ?? [];
          if (lots.length === 0) return null;
          return (
            <div key={group} className="space-y-1">
              <div className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {COLOR_GROUP_LABEL[group]}
              </div>
              {lots.map((lot) => (
                <div key={lot.id} className="flex items-center gap-2 rounded-md bg-surface-1 px-2 py-1 text-xs">
                  <span className={`inline-block h-[6px] w-[6px] rounded-full ${COLOR_GROUP_DOT_CLASS[group]}`} aria-hidden />
                  <span>{lot.name}</span>
                </div>
              ))}
            </div>
          );
        })}
      </GroupPanel>

    </div>
  );
}


