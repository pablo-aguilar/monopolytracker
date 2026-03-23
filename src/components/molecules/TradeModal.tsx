import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AvatarToken from '@/components/atoms/AvatarToken';
import MoneyInput from '@/components/atoms/MoneyInput';
import { AVATARS } from '@/data/avatars';
import { BOARD_TILES, getTileById, getTileHeaderBgClass, getTileHeaderTextClass, type ColorGroup } from '@/data/board';
import type { TradePassEntry, TradePassScopeType } from '@/features/tradePasses/tradePassesSlice';
import { FaChevronDown } from 'react-icons/fa';
import OverlayHeader from '@/components/molecules/OverlayHeader';

type TradeableProperty = {
  id: string;
  name: string;
  type: 'property' | 'railroad' | 'utility';
};

type PlayerTradeInventory = {
  properties: TradeableProperty[];
  maxCash: number;
  gojfChance: number;
  gojfCommunity: number;
  busTickets: number;
};

export type TradeOfferPayload = {
  propertyIds: string[];
  cash: number;
  gojfChanceCount: number;
  gojfCommunityCount: number;
  busTicketsCount: number;
  passScopes: Array<{ scopeType: TradePassScopeType; scopeKey: string; amount: 1 | 2 }>;
};

export type TradeModalConfirmPayload = {
  fromPlayerId: string;
  toPlayerId: string;
  fromOffer: TradeOfferPayload;
  toOffer: TradeOfferPayload;
};

export interface TradeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: TradeModalConfirmPayload) => void;
  title?: string;
  initiatorPlayerId: string | null;
  players: Array<{ id: string; nickname: string; money: number }>;
  boardPlayers: Array<{ id: string; avatarKey: string; positionIndex: number; color?: string }>;
  tradeInventoryByPlayerId: Record<string, PlayerTradeInventory | undefined>;
  ownershipByTileId: Record<string, string | null>;
  mortgagedByTileId: Record<string, boolean>;
  existingPasses: TradePassEntry[];
}

function PlayerPickerRow({
  label,
  players,
  bpById,
  selectedId,
  onSelect,
  excludeId,
}: {
  label: string;
  players: Array<{ id: string; nickname: string; money: number }>;
  bpById: Map<string, { id: string; avatarKey: string; positionIndex: number; color?: string }>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  excludeId: string | null;
}) {
  const options = useMemo(
    () => players.filter((p) => p.id !== excludeId),
    [players, excludeId]
  );

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold uppercase tracking-wide text-subtle">{label}</div>
      <div role="group" aria-label={label} className="flex flex-row flex-wrap gap-2">
        {options.map((p) => {
          const bp = bpById.get(p.id);
          const emoji = AVATARS.find((a) => a.key === bp?.avatarKey)?.emoji ?? '🙂';
          const selected = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(selected ? null : p.id)}
              className={`flex items-center gap-2 flex-row rounded-xl border border-surface px-3 py-2 text-left transition-colors ${
                selected
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <div style={{ ['--player-color' as any]: bp?.color ?? '#a1a1aa' } as React.CSSProperties}>
                <AvatarToken
                  emoji={emoji}
                  size={32}
                  borderColorClass="border-[color:var(--player-color)]"
                  ring
                  ringColorClass="ring-[color:var(--player-color)]"
                />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.nickname}</div>
              </div>
              {selected && <div className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">✓</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type TradeOffer = {
  propertyIds: string[];
  cash: number;
  gojfChanceSelected: number[];
  gojfCommunitySelected: number[];
  busTicketsSelected: number[];
  passScopeAmounts: Record<string, 1 | 2>;
};

const EMPTY_OFFER: TradeOffer = {
  propertyIds: [],
  cash: 0,
  gojfChanceSelected: [],
  gojfCommunitySelected: [],
  busTicketsSelected: [],
  passScopeAmounts: {},
};

const BUILD_ELIGIBLE_GROUP_OWNERSHIP_MIN: Record<ColorGroup, number> = {
  brown: 2,
  lightBlue: 3,
  pink: 3,
  orange: 4,
  red: 4,
  yellow: 4,
  green: 4,
  darkBlue: 2,
};

function toggleIndexSelection(current: number[], idx: number): number[] {
  return current.includes(idx)
    ? current.filter((n) => n !== idx)
    : [...current, idx].sort((a, b) => a - b);
}

function scopeSelectionKey(scopeType: TradePassScopeType, scopeKey: string): string {
  return `${scopeType}:${scopeKey}`;
}

function formatPassScopeLabel(scopeType: TradePassScopeType, scopeKey: string): string {
  if (scopeType === 'railroad') return 'Railroad';
  if (scopeType === 'utility') return 'Utility';
  return scopeKey.charAt(0).toUpperCase() + scopeKey.slice(1);
}

function SelectableCardTile({
  label,
  sublabel,
  selected,
  onToggle,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`w-full rounded-lg border p-2 text-left transition-colors ${
        selected
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
          : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          {sublabel && <div className="text-xs opacity-70">{sublabel}</div>}
        </div>
        {selected && <div className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">✓</div>}
      </div>
    </button>
  );
}

function SummaryCardTile({
  label,
  sublabel,
}: {
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2">
      <div className="text-sm font-semibold">{label}</div>
      {sublabel && <div className="text-xs opacity-70">{sublabel}</div>}
    </div>
  );
}

export default function TradeModal({
  open,
  onClose,
  onConfirm,
  title = 'Trade',
  initiatorPlayerId,
  players,
  boardPlayers,
  tradeInventoryByPlayerId,
  ownershipByTileId,
  mortgagedByTileId,
  existingPasses,
}: TradeModalProps): JSX.Element | null {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [player1Id, setPlayer1Id] = React.useState<string | null>(null);
  const [player2Id, setPlayer2Id] = React.useState<string | null>(null);
  const [isTradeWithMenuOpen, setIsTradeWithMenuOpen] = React.useState(false);
  const [offer1, setOffer1] = React.useState<TradeOffer>(EMPTY_OFFER);
  const [offer2, setOffer2] = React.useState<TradeOffer>(EMPTY_OFFER);
  const tradeWithMenuRef = React.useRef<HTMLDivElement | null>(null);

  const bpById = useMemo(() => new Map(boardPlayers.map((bp) => [bp.id, bp] as const)), [boardPlayers]);
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p] as const)), [players]);

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setPlayer1Id(initiatorPlayerId ?? null);
    setPlayer2Id(null);
    setIsTradeWithMenuOpen(false);
    setOffer1(EMPTY_OFFER);
    setOffer2(EMPTY_OFFER);
  }, [open, initiatorPlayerId]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  React.useEffect(() => {
    setOffer1(EMPTY_OFFER);
  }, [player1Id]);

  React.useEffect(() => {
    setOffer2(EMPTY_OFFER);
    setIsTradeWithMenuOpen(false);
  }, [player2Id]);

  React.useEffect(() => {
    if (!isTradeWithMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!tradeWithMenuRef.current) return;
      if (!tradeWithMenuRef.current.contains(e.target as Node)) setIsTradeWithMenuOpen(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [isTradeWithMenuOpen]);

  const canConfirm = player1Id != null && player2Id != null;
  const player1Inventory = player1Id ? tradeInventoryByPlayerId[player1Id] : undefined;
  const player2Inventory = player2Id ? tradeInventoryByPlayerId[player2Id] : undefined;
  const player1Name = player1Id ? (playersById.get(player1Id)?.nickname ?? 'Player 1') : 'Player 1';
  const player2Name = player2Id ? (playersById.get(player2Id)?.nickname ?? 'Player 2') : 'Player 2';
  const player1Board = player1Id ? bpById.get(player1Id) : undefined;
  const player1Emoji = AVATARS.find((a) => a.key === player1Board?.avatarKey)?.emoji ?? '🙂';
  const player2Board = player2Id ? bpById.get(player2Id) : undefined;
  const player2Emoji = AVATARS.find((a) => a.key === player2Board?.avatarKey)?.emoji ?? '🙂';
  const tradeWithOptions = useMemo(() => players.filter((p) => p.id !== player1Id), [players, player1Id]);

  const toggleProperty = (side: 1 | 2, tileId: string) => {
    if (side === 1) {
      setOffer1((prev) => ({
        ...prev,
        propertyIds: prev.propertyIds.includes(tileId)
          ? prev.propertyIds.filter((id) => id !== tileId)
          : [...prev.propertyIds, tileId],
      }));
      return;
    }
    setOffer2((prev) => ({
      ...prev,
      propertyIds: prev.propertyIds.includes(tileId)
        ? prev.propertyIds.filter((id) => id !== tileId)
        : [...prev.propertyIds, tileId],
    }));
  };

  const togglePassScope = (side: 1 | 2, scopeType: TradePassScopeType, scopeKey: string) => {
    const key = scopeSelectionKey(scopeType, scopeKey);
    if (side === 1) {
      setOffer1((prev) => ({
        ...prev,
        passScopeAmounts: prev.passScopeAmounts[key]
          ? (() => {
              const next = { ...prev.passScopeAmounts };
              delete next[key];
              return next;
            })()
          : { ...prev.passScopeAmounts, [key]: 2 },
      }));
      return;
    }
    setOffer2((prev) => ({
      ...prev,
      passScopeAmounts: prev.passScopeAmounts[key]
        ? (() => {
            const next = { ...prev.passScopeAmounts };
            delete next[key];
            return next;
          })()
        : { ...prev.passScopeAmounts, [key]: 2 },
    }));
  };

  const setPassScopeAmount = (side: 1 | 2, scopeType: TradePassScopeType, scopeKey: string, amount: 1 | 2) => {
    const key = scopeSelectionKey(scopeType, scopeKey);
    if (side === 1) {
      setOffer1((prev) => ({ ...prev, passScopeAmounts: { ...prev.passScopeAmounts, [key]: amount } }));
      return;
    }
    setOffer2((prev) => ({ ...prev, passScopeAmounts: { ...prev.passScopeAmounts, [key]: amount } }));
  };

  const projectedOwners = useMemo(() => {
    const map: Record<string, string | null> = { ...ownershipByTileId };
    if (player1Id && player2Id) {
      for (const tileId of offer1.propertyIds) {
        if (map[tileId] === player1Id) map[tileId] = player2Id;
      }
      for (const tileId of offer2.propertyIds) {
        if (map[tileId] === player2Id) map[tileId] = player1Id;
      }
    }
    return map;
  }, [ownershipByTileId, player1Id, player2Id, offer1.propertyIds, offer2.propertyIds]);

  const eligiblePassScopesForIssuer = (issuerId: string): Array<{ scopeType: TradePassScopeType; scopeKey: string }> => {
    const scopes: Array<{ scopeType: TradePassScopeType; scopeKey: string }> = [];
    let rr = 0;
    let ut = 0;
    for (const t of BOARD_TILES) {
      if (t.type === 'railroad' && projectedOwners[t.id] === issuerId) rr += 1;
      if (t.type === 'utility' && projectedOwners[t.id] === issuerId) ut += 1;
    }
    if (rr >= 2) scopes.push({ scopeType: 'railroad', scopeKey: 'railroad' });
    if (ut >= 2) scopes.push({ scopeType: 'utility', scopeKey: 'utility' });
    const groups = new Set<ColorGroup>();
    for (const t of BOARD_TILES) {
      if (t.type === 'property' && t.group) groups.add(t.group);
    }
    for (const group of groups) {
      const groupTiles = BOARD_TILES.filter((t) => t.type === 'property' && t.group === group);
      const ownedEligibleCount = groupTiles.filter(
        (t) => projectedOwners[t.id] === issuerId && mortgagedByTileId[t.id] !== true
      ).length;
      const needed = BUILD_ELIGIBLE_GROUP_OWNERSHIP_MIN[group] ?? groupTiles.length;
      const eligible = groupTiles.length > 0 && ownedEligibleCount >= needed;
      if (eligible) scopes.push({ scopeType: 'color', scopeKey: group });
    }
    return scopes;
  };

  const passOptionsForSide = (
    issuerId: string | null,
    holderId: string | null
  ): Array<{ scopeType: TradePassScopeType; scopeKey: string; label: string; disabled: boolean; disabledReason?: string }> => {
    if (!issuerId || !holderId) return [];
    return eligiblePassScopesForIssuer(issuerId).map((s) => {
      const hasExisting = existingPasses.some(
        (e) =>
          e.holderPlayerId === holderId &&
          e.issuerPlayerId === issuerId &&
          e.scopeType === s.scopeType &&
          e.scopeKey === s.scopeKey &&
          e.remaining > 0
      );
      const label =
        s.scopeType === 'color'
          ? `${s.scopeKey} pass (2 uses)`
          : s.scopeType === 'railroad'
            ? 'Railroad pass (2 uses)'
            : 'Utility pass (2 uses)';
      return {
        scopeType: s.scopeType,
        scopeKey: s.scopeKey,
        label,
        disabled: hasExisting,
        disabledReason: hasExisting ? 'Already active for this issuer/scope' : undefined,
      };
    });
  };

  const side1PassOptions = passOptionsForSide(player1Id, player2Id);
  const side2PassOptions = passOptionsForSide(player2Id, player1Id);

  const parseScopeAmounts = (
    amounts: Record<string, 1 | 2>
  ): Array<{ scopeType: TradePassScopeType; scopeKey: string; amount: 1 | 2 }> =>
    Object.entries(amounts)
      .map(([k, amount]) => {
        const [scopeType, ...rest] = k.split(':');
        const scopeKey = rest.join(':');
        if (!scopeType || !scopeKey) return null;
        if (!(scopeType === 'railroad' || scopeType === 'utility' || scopeType === 'color')) return null;
        return { scopeType, scopeKey, amount } as { scopeType: TradePassScopeType; scopeKey: string; amount: 1 | 2 };
      })
      .filter(Boolean) as Array<{ scopeType: TradePassScopeType; scopeKey: string; amount: 1 | 2 }>;

  const fromPassScopes = parseScopeAmounts(offer1.passScopeAmounts);
  const toPassScopes = parseScopeAmounts(offer2.passScopeAmounts);

  const tradeSummary = useMemo(() => {
    const resolvePropertyCards = (
      selectedIds: string[],
      inventory: PlayerTradeInventory | undefined
    ): Array<{ id: string; name: string; bgClass: string; fgClass: string }> => {
      const map = new Map((inventory?.properties ?? []).map((p) => [p.id, p.name] as const));
      return selectedIds.map((id) => {
        const tile = getTileById(id);
        return {
          id,
          name: map.get(id) ?? tile?.name ?? id,
          bgClass: tile ? getTileHeaderBgClass(tile) : 'bg-surface-1',
          fgClass: tile ? getTileHeaderTextClass(tile) : 'text-fg',
        };
      });
    };
    const passLabels = (scopes: Array<{ scopeType: TradePassScopeType; scopeKey: string; amount: 1 | 2 }>): string[] =>
      scopes.map((s) => `${formatPassScopeLabel(s.scopeType, s.scopeKey)} x${s.amount}`);

    const from = {
      properties: resolvePropertyCards(offer1.propertyIds, player1Inventory),
      cash: offer1.cash,
      busTickets: offer1.busTicketsSelected.length,
      gojfChance: offer1.gojfChanceSelected.length,
      gojfCommunity: offer1.gojfCommunitySelected.length,
      passes: passLabels(fromPassScopes),
    };

    const to = {
      properties: resolvePropertyCards(offer2.propertyIds, player2Inventory),
      cash: offer2.cash,
      busTickets: offer2.busTicketsSelected.length,
      gojfChance: offer2.gojfChanceSelected.length,
      gojfCommunity: offer2.gojfCommunitySelected.length,
      passes: passLabels(toPassScopes),
    };

    const hasAnything =
      from.properties.length > 0 ||
      to.properties.length > 0 ||
      from.cash > 0 ||
      to.cash > 0 ||
      from.busTickets > 0 ||
      to.busTickets > 0 ||
      from.gojfChance > 0 ||
      to.gojfChance > 0 ||
      from.gojfCommunity > 0 ||
      to.gojfCommunity > 0 ||
      from.passes.length > 0 ||
      to.passes.length > 0;

    return { from, to, hasAnything, netCashToPlayer1: to.cash - from.cash };
  }, [offer1, offer2, player1Inventory, player2Inventory, fromPassScopes, toPassScopes]);

  const footerButtonBaseClass =
    'rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors';
  const footerSecondaryButtonClass = `${footerButtonBaseClass} border border-neutral-400 dark:border-neutral-500 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800`;
  const footerPrimaryEnabledButtonClass = `${footerButtonBaseClass} text-white bg-emerald-600 hover:bg-emerald-700`;
  const footerPrimaryDisabledButtonClass = `${footerButtonBaseClass} text-white bg-emerald-600/40 cursor-not-allowed`;

  if (!open) return null;

  const onConfirmTrade = (): void => {
    if (!player1Id || !player2Id) return;
    onConfirm({
      fromPlayerId: player1Id,
      toPlayerId: player2Id,
      fromOffer: {
        propertyIds: offer1.propertyIds,
        cash: offer1.cash,
        gojfChanceCount: offer1.gojfChanceSelected.length,
        gojfCommunityCount: offer1.gojfCommunitySelected.length,
        busTicketsCount: offer1.busTicketsSelected.length,
        passScopes: fromPassScopes,
      },
      toOffer: {
        propertyIds: offer2.propertyIds,
        cash: offer2.cash,
        gojfChanceCount: offer2.gojfChanceSelected.length,
        gojfCommunityCount: offer2.gojfCommunitySelected.length,
        busTicketsCount: offer2.busTicketsSelected.length,
        passScopes: toPassScopes,
      },
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="trade-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-cmp="m/TradeModal"
          className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="w-full max-w-3xl rounded-xl bg-surface-2 text-fg shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <OverlayHeader title={title} onClose={onClose} className="bg-surface-1 px-4 py-1" />

            <div className="p-4">
              <div className="space-y-2">
                {step === 1 && <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-surface bg-surface-1 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div style={{ ['--player-color' as any]: player1Board?.color ?? '#a1a1aa' } as React.CSSProperties}>
                        <AvatarToken
                          emoji={player1Emoji}
                          size={26}
                          borderColorClass="border-[color:var(--player-color)]"
                          ring
                          ringColorClass="ring-[color:var(--player-color)]"
                        />
                      </div>
                      <div className="text-sm font-semibold">You ({player1Name}) offer</div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Properties</div>
                      <div className="mt-2 max-h-44 overflow-auto space-y-1 pr-1">
                        {(player1Inventory?.properties ?? []).length === 0 ? (
                          <div className="text-xs text-subtle">No tradeable properties.</div>
                        ) : (
                          (player1Inventory?.properties ?? []).map((prop) => {
                            const tile = getTileById(prop.id);
                            const selected = offer1.propertyIds.includes(prop.id);
                            const bgClass = tile ? getTileHeaderBgClass(tile) : 'bg-surface-1';
                            const fgClass = tile ? getTileHeaderTextClass(tile) : 'text-fg';
                            return (
                              <button
                                key={prop.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => toggleProperty(1, prop.id)}
                                className={`w-full rounded-md border text-left transition-colors ${selected ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-surface hover:border-neutral-400 dark:hover:border-neutral-500'}`}
                              >
                                <div className={`flex items-center justify-between gap-2 px-2 py-1.5 ${bgClass} ${fgClass}`}>
                                  <span className="truncate text-sm font-semibold">{prop.name}</span>
                                  <span className={`text-sm font-semibold ${selected ? 'opacity-100' : 'opacity-0'}`}>✓</span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Cash</div>
                      <div className="mt-2">
                        <MoneyInput
                          value={offer1.cash}
                          min={0}
                          max={player1Inventory?.maxCash ?? 0}
                          quickSteps={[5, 25, 100]}
                          onChange={(cash) =>
                            setOffer1((prev) => ({
                              ...prev,
                              cash,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Cards</div>
                      <div className="mt-2">
                        {((player1Inventory?.busTickets ?? 0) <= 0 &&
                          (player1Inventory?.gojfChance ?? 0) <= 0 &&
                          (player1Inventory?.gojfCommunity ?? 0) <= 0) ? (
                          <div className="text-xs text-subtle">No tradeable cards.</div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {Array.from({ length: player1Inventory?.busTickets ?? 0 }).map((_, idx) => {
                              const selected = offer1.busTicketsSelected.includes(idx);
                              return (
                                <SelectableCardTile
                                  key={`p1-bus-${idx}`}
                                  label="Bus Ticket"
                                  selected={selected}
                                  onToggle={() =>
                                    setOffer1((prev) => ({
                                      ...prev,
                                      busTicketsSelected: toggleIndexSelection(prev.busTicketsSelected, idx),
                                    }))
                                  }
                                />
                              );
                            })}
                            {Array.from({ length: player1Inventory?.gojfChance ?? 0 }).map((_, idx) => {
                              const selected = offer1.gojfChanceSelected.includes(idx);
                              return (
                                <SelectableCardTile
                                  key={`p1-gojf-chance-${idx}`}
                                  label="Get Out of Jail Free"
                                  sublabel={(player1Inventory?.gojfChance ?? 0) > 1 ? `Chance card ${idx + 1}` : 'Chance'}
                                  selected={selected}
                                  onToggle={() =>
                                    setOffer1((prev) => ({
                                      ...prev,
                                      gojfChanceSelected: toggleIndexSelection(prev.gojfChanceSelected, idx),
                                    }))
                                  }
                                />
                              );
                            })}
                            {Array.from({ length: player1Inventory?.gojfCommunity ?? 0 }).map((_, idx) => {
                              const selected = offer1.gojfCommunitySelected.includes(idx);
                              return (
                                <SelectableCardTile
                                  key={`p1-gojf-community-${idx}`}
                                  label="Get Out of Jail Free"
                                  sublabel={(player1Inventory?.gojfCommunity ?? 0) > 1 ? `Community Chest card ${idx + 1}` : 'Community Chest'}
                                  selected={selected}
                                  onToggle={() =>
                                    setOffer1((prev) => ({
                                      ...prev,
                                      gojfCommunitySelected: toggleIndexSelection(prev.gojfCommunitySelected, idx),
                                    }))
                                  }
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Passes</div>
                      <div className="mt-2">
                        {side1PassOptions.length === 0 ? (
                          <div className="text-xs text-subtle">No eligible passes.</div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {side1PassOptions.map((opt) => {
                              const key = scopeSelectionKey(opt.scopeType, opt.scopeKey);
                              const selected = offer1.passScopeAmounts[key] != null;
                              const selectedAmount = offer1.passScopeAmounts[key] ?? 2;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  disabled={opt.disabled}
                                  aria-pressed={selected}
                                  onClick={() => togglePassScope(1, opt.scopeType, opt.scopeKey)}
                                  className={`w-full rounded-lg border p-2 text-left transition-colors ${
                                    opt.disabled
                                      ? 'opacity-50 cursor-not-allowed border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800'
                                      : selected
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                                        : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-semibold">{opt.label}</div>
                                    {selected && !opt.disabled && <div className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">✓</div>}
                                  </div>
                                  {selected && !opt.disabled && (
                                    <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-surface bg-surface-1 p-1">
                                      <button
                                        type="button"
                                        className={`rounded px-2 py-0.5 text-xs ${selectedAmount === 1 ? 'bg-emerald-600 text-white' : 'bg-surface-2'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPassScopeAmount(1, opt.scopeType, opt.scopeKey, 1);
                                        }}
                                      >
                                        1
                                      </button>
                                      <button
                                        type="button"
                                        className={`rounded px-2 py-0.5 text-xs ${selectedAmount === 2 ? 'bg-emerald-600 text-white' : 'bg-surface-2'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPassScopeAmount(1, opt.scopeType, opt.scopeKey, 2);
                                        }}
                                      >
                                        2
                                      </button>
                                    </div>
                                  )}
                                  {opt.disabledReason && <div className="text-xs opacity-70 mt-1">{opt.disabledReason}</div>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-surface bg-surface-1 p-3 space-y-3">
                    {!player2Id ? (
                      <div className="rounded-lg border border-surface bg-white/70 dark:bg-neutral-900/50 p-2">
                        <PlayerPickerRow
                          label="Trade With"
                          players={players}
                          bpById={bpById}
                          selectedId={player2Id}
                          onSelect={setPlayer2Id}
                          excludeId={player1Id}
                        />
                      </div>
                    ) : (
                      <div className="relative" ref={tradeWithMenuRef}>
                        <button
                          type="button"
                          onClick={() => setIsTradeWithMenuOpen((v) => !v)}
                          aria-haspopup="listbox"
                          aria-expanded={isTradeWithMenuOpen}
                          className="w-full rounded-lg border border-surface bg-white/70 dark:bg-neutral-900/50 p-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div style={{ ['--player-color' as any]: player2Board?.color ?? '#a1a1aa' } as React.CSSProperties}>
                                <AvatarToken
                                  emoji={player2Emoji}
                                  size={26}
                                  borderColorClass="border-[color:var(--player-color)]"
                                  ring
                                  ringColorClass="ring-[color:var(--player-color)]"
                                />
                              </div>
                              <div className="text-sm font-semibold">{player2Name} offers</div>
                            </div>
                            <FaChevronDown className={`text-xs opacity-70 transition-transform ${isTradeWithMenuOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {isTradeWithMenuOpen && (
                          <div role="listbox" className="absolute z-20 mt-2 w-full rounded-lg border border-surface bg-white dark:bg-neutral-900 p-2 shadow-xl max-h-56 overflow-auto">
                            <div className="grid grid-cols-1 gap-2">
                              {tradeWithOptions.map((p) => {
                                const bp = bpById.get(p.id);
                                const emoji = AVATARS.find((a) => a.key === bp?.avatarKey)?.emoji ?? '🙂';
                                const selected = player2Id === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    onClick={() => {
                                      setPlayer2Id(p.id);
                                      setIsTradeWithMenuOpen(false);
                                    }}
                                    className={`flex items-center gap-2 rounded-xl border border-surface px-3 py-2 text-left transition-colors ${
                                      selected
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                    }`}
                                  >
                                    <div style={{ ['--player-color' as any]: bp?.color ?? '#a1a1aa' } as React.CSSProperties}>
                                      <AvatarToken
                                        emoji={emoji}
                                        size={28}
                                        borderColorClass="border-[color:var(--player-color)]"
                                        ring
                                        ringColorClass="ring-[color:var(--player-color)]"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-semibold truncate">{p.nickname}</div>
                                    </div>
                                    {selected && <div className="ml-auto text-emerald-700 dark:text-emerald-300 font-semibold text-sm">✓</div>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {player2Id ? (
                      <>
                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Properties</div>
                          <div className="mt-2 max-h-44 overflow-auto space-y-1 pr-1">
                            {(player2Inventory?.properties ?? []).length === 0 ? (
                              <div className="text-xs text-subtle">No tradeable properties.</div>
                            ) : (
                              (player2Inventory?.properties ?? []).map((prop) => {
                                const tile = getTileById(prop.id);
                                const selected = offer2.propertyIds.includes(prop.id);
                                const bgClass = tile ? getTileHeaderBgClass(tile) : 'bg-surface-1';
                                const fgClass = tile ? getTileHeaderTextClass(tile) : 'text-fg';
                                return (
                                  <button
                                    key={prop.id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => toggleProperty(2, prop.id)}
                                    className={`w-full rounded-md border text-left transition-colors ${selected ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-surface hover:border-neutral-400 dark:hover:border-neutral-500'}`}
                                  >
                                    <div className={`flex items-center justify-between gap-2 px-2 py-1.5 ${bgClass} ${fgClass}`}>
                                      <span className="truncate text-sm font-semibold">{prop.name}</span>
                                      <span className={`text-sm font-semibold ${selected ? 'opacity-100' : 'opacity-0'}`}>✓</span>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Cash</div>
                          <div className="mt-2">
                            <MoneyInput
                              value={offer2.cash}
                              min={0}
                              max={player2Inventory?.maxCash ?? 0}
                              quickSteps={[ 5, 25, 100]}
                              onChange={(cash) =>
                                setOffer2((prev) => ({
                                  ...prev,
                                  cash,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Cards</div>
                          <div className="mt-2">
                            {((player2Inventory?.busTickets ?? 0) <= 0 &&
                              (player2Inventory?.gojfChance ?? 0) <= 0 &&
                              (player2Inventory?.gojfCommunity ?? 0) <= 0) ? (
                              <div className="text-xs text-subtle">No tradeable cards.</div>
                            ) : (
                              <div className="grid grid-cols-1 gap-2">
                                {Array.from({ length: player2Inventory?.busTickets ?? 0 }).map((_, idx) => {
                                  const selected = offer2.busTicketsSelected.includes(idx);
                                  return (
                                    <SelectableCardTile
                                      key={`p2-bus-${idx}`}
                                      label="Bus Ticket"
                                      selected={selected}
                                      onToggle={() =>
                                        setOffer2((prev) => ({
                                          ...prev,
                                          busTicketsSelected: toggleIndexSelection(prev.busTicketsSelected, idx),
                                        }))
                                      }
                                    />
                                  );
                                })}
                                {Array.from({ length: player2Inventory?.gojfChance ?? 0 }).map((_, idx) => {
                                  const selected = offer2.gojfChanceSelected.includes(idx);
                                  return (
                                    <SelectableCardTile
                                      key={`p2-gojf-chance-${idx}`}
                                      label="Get Out of Jail Free"
                                      sublabel={(player2Inventory?.gojfChance ?? 0) > 1 ? `Chance card ${idx + 1}` : 'Chance'}
                                      selected={selected}
                                      onToggle={() =>
                                        setOffer2((prev) => ({
                                          ...prev,
                                          gojfChanceSelected: toggleIndexSelection(prev.gojfChanceSelected, idx),
                                        }))
                                      }
                                    />
                                  );
                                })}
                                {Array.from({ length: player2Inventory?.gojfCommunity ?? 0 }).map((_, idx) => {
                                  const selected = offer2.gojfCommunitySelected.includes(idx);
                                  return (
                                    <SelectableCardTile
                                      key={`p2-gojf-community-${idx}`}
                                      label="Get Out of Jail Free"
                                      sublabel={(player2Inventory?.gojfCommunity ?? 0) > 1 ? `Community Chest card ${idx + 1}` : 'Community Chest'}
                                      selected={selected}
                                      onToggle={() =>
                                        setOffer2((prev) => ({
                                          ...prev,
                                          gojfCommunitySelected: toggleIndexSelection(prev.gojfCommunitySelected, idx),
                                        }))
                                      }
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Passes</div>
                          <div className="mt-2">
                            {side2PassOptions.length === 0 ? (
                              <div className="text-xs text-subtle">No eligible passes.</div>
                            ) : (
                              <div className="grid grid-cols-1 gap-2">
                                {side2PassOptions.map((opt) => {
                                  const key = scopeSelectionKey(opt.scopeType, opt.scopeKey);
                                  const selected = offer2.passScopeAmounts[key] != null;
                                  const selectedAmount = offer2.passScopeAmounts[key] ?? 2;
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      disabled={opt.disabled}
                                      aria-pressed={selected}
                                      onClick={() => togglePassScope(2, opt.scopeType, opt.scopeKey)}
                                      className={`w-full rounded-lg border p-2 text-left transition-colors ${
                                        opt.disabled
                                          ? 'opacity-50 cursor-not-allowed border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800'
                                          : selected
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                                            : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-semibold">{opt.label}</div>
                                        {selected && !opt.disabled && <div className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">✓</div>}
                                      </div>
                                      {selected && !opt.disabled && (
                                        <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-surface bg-surface-1 p-1">
                                          <button
                                            type="button"
                                            className={`rounded px-2 py-0.5 text-xs ${selectedAmount === 1 ? 'bg-emerald-600 text-white' : 'bg-surface-2'}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPassScopeAmount(2, opt.scopeType, opt.scopeKey, 1);
                                            }}
                                          >
                                            1
                                          </button>
                                          <button
                                            type="button"
                                            className={`rounded px-2 py-0.5 text-xs ${selectedAmount === 2 ? 'bg-emerald-600 text-white' : 'bg-surface-2'}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPassScopeAmount(2, opt.scopeType, opt.scopeKey, 2);
                                            }}
                                          >
                                            2
                                          </button>
                                        </div>
                                      )}
                                      {opt.disabledReason && <div className="text-xs opacity-70 mt-1">{opt.disabledReason}</div>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/50 p-3 text-xs text-subtle">
                        Select a player in `Trade With` to configure their offer.
                      </div>
                    )}
                  </div>
                </div>}
                {step === 2 && <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Trade Summary</div>
                  {!tradeSummary.hasAnything ? (
                    <div className="mt-2 text-xs text-subtle">No assets selected yet.</div>
                  ) : (
                    <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-md border border-surface bg-surface-1 p-2">
                        <div className="font-semibold">You gain</div>
                        {(tradeSummary.to.properties.length === 0 &&
                          tradeSummary.to.cash <= 0 &&
                          tradeSummary.to.busTickets <= 0 &&
                          tradeSummary.to.gojfChance <= 0 &&
                          tradeSummary.to.gojfCommunity <= 0 &&
                          tradeSummary.to.passes.length === 0) ? (
                          <div className="mt-1 text-xs text-subtle">No assets gained.</div>
                        ) : (
                          <div className="mt-2 grid grid-cols-1 gap-2">
                            {tradeSummary.to.properties.map((prop) => (
                              <div key={`gain-you-property-${prop.id}`} className="rounded-md border border-surface overflow-hidden">
                                <div className={`px-2 py-1.5 text-sm font-semibold ${prop.bgClass} ${prop.fgClass}`}>{prop.name}</div>
                              </div>
                            ))}
                            {tradeSummary.to.cash > 0 && <SummaryCardTile label={`$${tradeSummary.to.cash}`} sublabel="Cash" />}
                            {tradeSummary.to.busTickets > 0 && <SummaryCardTile label={`Bus Ticket x${tradeSummary.to.busTickets}`} />}
                            {tradeSummary.to.gojfChance > 0 && <SummaryCardTile label={`GOJF Chance x${tradeSummary.to.gojfChance}`} />}
                            {tradeSummary.to.gojfCommunity > 0 && <SummaryCardTile label={`GOJF Community x${tradeSummary.to.gojfCommunity}`} />}
                            {tradeSummary.to.passes.map((pass, idx) => (
                              <SummaryCardTile key={`gain-you-pass-${idx}`} label={pass} sublabel="Pass" />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="rounded-md border border-surface bg-surface-1 p-2">
                        <div className="font-semibold">{player2Name} gains</div>
                        {(tradeSummary.from.properties.length === 0 &&
                          tradeSummary.from.cash <= 0 &&
                          tradeSummary.from.busTickets <= 0 &&
                          tradeSummary.from.gojfChance <= 0 &&
                          tradeSummary.from.gojfCommunity <= 0 &&
                          tradeSummary.from.passes.length === 0) ? (
                          <div className="mt-1 text-xs text-subtle">No assets gained.</div>
                        ) : (
                          <div className="mt-2 grid grid-cols-1 gap-2">
                            {tradeSummary.from.properties.map((prop) => (
                              <div key={`gain-other-property-${prop.id}`} className="rounded-md border border-surface overflow-hidden">
                                <div className={`px-2 py-1.5 text-sm font-semibold ${prop.bgClass} ${prop.fgClass}`}>{prop.name}</div>
                              </div>
                            ))}
                            {tradeSummary.from.cash > 0 && <SummaryCardTile label={`$${tradeSummary.from.cash}`} sublabel="Cash" />}
                            {tradeSummary.from.busTickets > 0 && <SummaryCardTile label={`Bus Ticket x${tradeSummary.from.busTickets}`} />}
                            {tradeSummary.from.gojfChance > 0 && <SummaryCardTile label={`GOJF Chance x${tradeSummary.from.gojfChance}`} />}
                            {tradeSummary.from.gojfCommunity > 0 && <SummaryCardTile label={`GOJF Community x${tradeSummary.from.gojfCommunity}`} />}
                            {tradeSummary.from.passes.map((pass, idx) => (
                              <SummaryCardTile key={`gain-other-pass-${idx}`} label={pass} sublabel="Pass" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {tradeSummary.hasAnything && (
                    <div className="mt-2 text-xs text-subtle">
                      Net cash to {player1Name}: ${tradeSummary.netCashToPlayer1}
                    </div>
                  )}
                </div>}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-surface-1 border-t border-surface">
              {step === 1 ? (
                <>
                  <button
                    type="button"
                    className={footerSecondaryButtonClass}
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!canConfirm}
                    className={canConfirm ? footerPrimaryEnabledButtonClass : footerPrimaryDisabledButtonClass}
                    onClick={() => setStep(2)}
                  >
                    Summary
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={footerSecondaryButtonClass}
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!canConfirm}
                    className={canConfirm ? footerPrimaryEnabledButtonClass : footerPrimaryDisabledButtonClass}
                    onClick={onConfirmTrade}
                  >
                    Confirm Trade
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

