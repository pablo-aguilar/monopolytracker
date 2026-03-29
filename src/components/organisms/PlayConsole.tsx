// #index
// - //#imports: libraries and app modules
// - //#local-state: GM inputs and UI selections
// - //#derived: last drawn cards for quick reference
// - //#handlers: core GM actions (evaluate, move, buy, money adjust, rent/tax, mortgage, build/sell, draw)
// - //#render: layout with HUD, player turn cards, inputs/actions, cards preview, advisories, and event log

// //#imports
import React, { useMemo, useState, useRef } from 'react';
import type { SpecialDieFace, GameEvent } from '@/types/monopoly-schema';
import EventLog from '@/components/molecules/EventLog';
import GameStatsPanel from '@/components/molecules/GameStatsPanel';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { appendEvent } from '@/features/events/eventsSlice';
import { addPendingMortgageCredit, addToFreeParking, consumePendingMortgageCredit, resetFreeParking } from '@/features/session/sessionSlice';
import { BOARD_TILES, BOARD_SIZE, FREE_PARKING_INDEX, GO_TO_JAIL_INDEX, getTileByIndex, getForwardDistance, passedGo, wrapIndex, JAIL_INDEX, type ColorGroup } from '@/data/board';
import { CHANCE, COMMUNITY_CHEST, getBusCardShortTitle } from '@/data/cards';
import { assignOwner, transferOwnerPreserveState, setMortgaged, buyHouse, sellHouse, setDepotInstalled } from '@/features/properties/propertiesSlice';
import { drawCard, putCardOnBottom, setSeed as setCardsSeed, reshuffleIfEmpty, drawBusCardByType, selectLastDrawnCard } from '@/features/cards/cardsSlice';
import { adjustPlayerMoney, setPlayerPosition, grantBusTicket, clearAllBusTickets, grantGetOutOfJail, assignProperty, unassignProperty, consumeGetOutOfJail, removePlayer, transferPlayerSpecialAssets } from '@/features/players/playersSlice';
import { consumeBusTicket } from '@/features/players/playersSlice';
import { persistor, type AppDispatch, type RootState } from '@/app/store';
import { computeRent } from '@/features/selectors/rent';
import AvatarToken from '@/components/atoms/AvatarToken';
import AnimatedNumber from '@/components/atoms/AnimatedNumber';
import HudBadge from '@/components/atoms/HudBadge';
import Tooltip from '@/components/atoms/Tooltip';
import { AVATARS } from '@/data/avatars';
import DrawnUndoButton from '@/components/atoms/DrawnUndoButton';
import TogglePillButton from '@/components/atoms/TogglePillButton';
import StatPill from '@/components/atoms/StatPill';
import HudBar from '@/components/molecules/HudBar';
import RacePotBadge from '@/components/molecules/RacePotBadge';
import BuyButton from '@/components/atoms/BuyButton';
import IconLabelButton from '@/components/atoms/IconLabelButton';
import { AnimatePresence, motion } from 'framer-motion';
import { advanceTurn, setRacePotWinner, setTurnIndex } from '@/features/session/sessionSlice';
import DiceSelector from '@/components/molecules/DiceSelector';
import StepNavigator from '@/components/molecules/StepNavigator';
import TurnRibbon, { type TurnSegment } from '@/components/molecules/TurnRibbon';
import JailAttemptRibbon from '@/components/molecules/JailAttemptRibbon';
import PostActionsBar from '@/components/molecules/PostActionsBar';
import PurchaseActionsRow from '@/components/molecules/PurchaseActionsRow';
import BuildSellOverlay from '@/components/molecules/BuildSellOverlay';
import OverlayHeader from '@/components/molecules/OverlayHeader';
import BoardPickerOverlay from '@/components/molecules/BoardPickerOverlay';
import AuctionOverlay from '@/components/molecules/AuctionOverlay';
import TradeModal, { type TradeModalConfirmPayload } from '@/components/molecules/TradeModal';
import VictoryModal from '@/components/molecules/VictoryModal';
import PlayerTurnCards from '@/components/molecules/PlayerTurnCards';
import SectionCard from '@/components/molecules/SectionCard';
import SettingsGear from '@/components/molecules/SettingsGear';
import { BsDice1Fill, BsDice2Fill, BsDice3Fill, BsDice4Fill, BsDice5Fill, BsDice6Fill } from 'react-icons/bs';
import { FaBusAlt, FaHandshake } from 'react-icons/fa';
import { GiDiceFire, GiTeleport } from 'react-icons/gi';
import { IoClose } from 'react-icons/io5';
import { MdReceiptLong } from 'react-icons/md';
import { consumeTradePass, grantTradePass, setTradePasses, type TradePassEntry, type TradePassScopeType } from '@/features/tradePasses/tradePassesSlice';
import { restoreToEventId } from '@/features/timeline/timelineThunks';

function abbreviateAvenueInTileName(name: string): string {
  return name.replace(/\bAvenue\b/g, 'Ave');
}

export type PlayConsoleProps = {
  onTimelineRestored?: () => void;
};

/** Staged bus deck picks in chronological order (Regular = +1; Big = clear all players then +1 to drawer). */
type StagedBusPick = 'regular' | 'big';

export default function PlayConsole({ onTimelineRestored }: PlayConsoleProps = {}): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const players = useSelector((s: RootState) => s.players.players);
  const cardsState = useSelector((s: RootState) => s.cards);
  const propsState = useSelector((s: RootState) => s.properties);
  const tradePassEntries = useSelector((s: RootState) => ((s as any).tradePasses?.entries ?? []) as TradePassEntry[]);
  const racePot = useSelector((s: RootState) => s.session.racePot);
  const freeParkingPot = useSelector((s: RootState) => (s as any).session?.freeParkingPot ?? 0);
  const turnIndexRaw = useSelector((s: RootState) => (s as any).session?.turnIndex);
  const turnIndex: number = typeof turnIndexRaw === 'number' && turnIndexRaw >= 0 ? turnIndexRaw : 0;
  const timelineSnapshots = useSelector((s: RootState) => s.timeline.snapshots);
  const restorableEventIds = useMemo(
    () => new Set(timelineSnapshots.map((sn) => sn.afterEventId)),
    [timelineSnapshots]
  );

  // //#local-state
  type MoveSource =
    | 'dice'
    | 'teleport_bus'
    | 'teleport_triple'
    | 'card_chance'
    | 'card_community'
    | 'jail_three_doubles'
    | 'jail_go_to_jail_tile'
    | 'jail_card'
    | 'jail_triple_ones_near_jail';

  type MoveDirection = 'forward' | 'backward';

  type QueuedMovement =
    | {
        kind: 'move';
        to: number;
        source: Exclude<MoveSource, 'jail_three_doubles' | 'jail_go_to_jail_tile' | 'jail_card'>;
        direction: MoveDirection;
        card?: { deck: 'chance' | 'community'; cardId: string; effectType: 'moveTo' | 'moveSteps'; rawSteps?: number; awardGoIfPassed?: boolean };
      }
    | {
        kind: 'goToJail';
        source: 'jail_card';
        card: { deck: 'chance' | 'community'; cardId: string; effectType: 'goToJail' };
      };

  type ApplyMoveMeta = {
    source: MoveSource;
    direction: MoveDirection;
    rawSteps?: number;
    card?: { deck: 'chance' | 'community'; cardId: string; effectType: string; rawSteps?: number; awardGoIfPassed?: boolean };
  };

  type PendingLiquidationPlan = {
    payerId: string;
    payeeId: string;
    tileId: string;
    rentDue: number;
    targets: Record<string, number>;
    desiredMortgaged: Record<string, boolean>;
    desiredDepotInstalled: Record<string, boolean>;
    projectedNetNow: number;
    projectedCashAfter: number;
  };

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [d6A, setD6A] = useState<number | null>(null);
  const [d6B, setD6B] = useState<number | null>(null);
  const [special, setSpecial] = useState<SpecialDieFace | null>(null);
  const [rollConfirmed, setRollConfirmed] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0); // 0=pre,1=roll,2=post
  const [moneyDelta, setMoneyDelta] = useState<number>(0);
  const [moneyPlayerId, setMoneyPlayerId] = useState<string>('');
  const [preActions, setPreActions] = useState<string[]>([]);
  const [postAction, setPostAction] = useState<string>('None');
  const [highestStep, setHighestStep] = useState<0 | 1 | 2>(0);
  const [predictedTo, setPredictedTo] = useState<number | null>(null);
  const [buySelected, setBuySelected] = useState<boolean>(false);
  const [rentSelected, setRentSelected] = useState<boolean>(false);
  const [useRentPassSelected, setUseRentPassSelected] = useState<boolean>(false);
  const [taxSelected, setTaxSelected] = useState<boolean>(false);
  const [diceBusSelectedCardId, setDiceBusSelectedCardId] = useState<string | null>(null);
  const [tileBusSelectedCardId, setTileBusSelectedCardId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<{ deck: 'chance' | 'community' | 'bus' | null; busSlot?: 'dice' | 'tile' }>(() => ({
    deck: null,
  }));
  const [cardSearch, setCardSearch] = useState<string>('');
  const [centerOverlay, setCenterOverlay] = useState<{ type: 'busTeleport' | 'tripleTeleport' | null }>(() => ({ type: null }));
  const [busTeleportTo, setBusTeleportTo] = useState<number | null>(null);
  const [tripleTeleportTo, setTripleTeleportTo] = useState<number | null>(null);
  const [busTicketsAvailableThisTurn, setBusTicketsAvailableThisTurn] = useState<number>(0);
  const [shakeRent, setShakeRent] = useState<boolean>(false);
  const [shakeTax, setShakeTax] = useState<boolean>(false);
  const [shakeBus, setShakeBus] = useState<boolean>(false);
  const [buildOverlayOpen, setBuildOverlayOpen] = useState<boolean>(false);
  const [buildOverlayMode, setBuildOverlayMode] = useState<'manage' | 'liquidate_for_rent'>('manage');
  const [liquidationContext, setLiquidationContext] = useState<{ payerId: string; payeeId: string; tileId: string; rentDue: number } | null>(null);
  const [pendingLiquidation, setPendingLiquidation] = useState<PendingLiquidationPlan | null>(null);
  const [resolvedRentKey, setResolvedRentKey] = useState<string | null>(null);
  const [liquidationBanner, setLiquidationBanner] = useState<string | null>(null);
  const [boardOverlayOpen, setBoardOverlayOpen] = useState<boolean>(false);
  const [auctionOpen, setAuctionOpen] = useState<boolean>(false);
  const [tradeModalOpen, setTradeModalOpen] = useState<boolean>(false);
  const [auctionCompleted, setAuctionCompleted] = useState<boolean>(false);
  const [auctionItSelected, setAuctionItSelected] = useState<boolean>(false);
  const [stagedAuction, setStagedAuction] = useState<{ tileId: string; winnerId: string; amount: number } | null>(null);
  // jailChoice declared once
  const [jailChoice, setJailChoice] = useState<'pay' | 'gojf' | 'roll' | null>(null);
  const [stagedChanceCardId, setStagedChanceCardId] = useState<string | null>(null);
  const [stagedCommunityCardId, setStagedCommunityCardId] = useState<string | null>(null);
  // Staging for Bus flow and Summary overlay (order matters: Regular vs Big Bus)
  const [stagedBusPicks, setStagedBusPicks] = useState<StagedBusPick[]>([]);
  const [summaryOpen, setSummaryOpen] = useState<boolean>(false);
  const [eventLogOpen, setEventLogOpen] = useState<boolean>(false);
  const [eventLogPanelTab, setEventLogPanelTab] = useState<'log' | 'stats'>('log');
  const [restoreConfirmEventId, setRestoreConfirmEventId] = useState<string | null>(null);
  const [restorePending, setRestorePending] = useState<boolean>(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [gmToolsOpen, setGmToolsOpen] = useState<boolean>(false);
  const [newGameConfirmOpen, setNewGameConfirmOpen] = useState<boolean>(false);
  const [victoryModalOpen, setVictoryModalOpen] = useState<boolean>(false);
  const [victoryWinnerId, setVictoryWinnerId] = useState<string | null>(null);
  const [rollCount, setRollCount] = useState<number>(1);
  const [turnSegments, setTurnSegments] = useState<TurnSegment[]>([]);
  // Post-action queue for chained movements from Chance/Community cards
  const [postActionQueue, setPostActionQueue] = useState<QueuedMovement[]>([]);
  const [queuedPostPending, setQueuedPostPending] = useState<boolean>(false);
  const [queuedPostActive, setQueuedPostActive] = useState<QueuedMovement | null>(null);
  const events = useSelector((s: RootState) => s.events.events);

  const closeBuildOverlay = React.useCallback(() => {
    setBuildOverlayOpen(false);
    setBuildOverlayMode('manage');
    setLiquidationContext(null);
  }, []);

  const makeRentSettlementKey = React.useCallback((payerId: string, tileId: string, payeeId: string) => `${payerId}:${tileId}:${payeeId}`, []);
  const applyPendingLiquidationPlan = React.useCallback((plan: PendingLiquidationPlan): boolean => {
    const getLiveByTile = () => (store.getState() as RootState).properties.byTileId;
    let totalCostAll = 0;
    let totalRefundAll = 0;
    let immediateMortgageCredit = 0;

    const managedPropertyTiles = BOARD_TILES.filter((t) => t.type === 'property' && plan.targets[t.id] != null);

    // Apply sells first in passes so even-sell rules are respected.
    for (let pass = 0; pass < 64; pass += 1) {
      let progressed = false;
      for (const t of managedPropertyTiles) {
        const cur = getLiveByTile()[t.id]?.improvements ?? 0;
        const tar = plan.targets[t.id];
        if (cur <= tar) continue;
        dispatch(sellHouse({ tileId: t.id }));
        const next = getLiveByTile()[t.id]?.improvements ?? cur;
        if (next < cur) {
          progressed = true;
          totalRefundAll += (t.property?.houseCost ?? 0) / 2;
        }
      }
      if (!progressed) break;
    }

    // Apply mortgage/unmortgage after sells.
    for (const t of BOARD_TILES) {
      if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) continue;
      const curMort = getLiveByTile()[t.id]?.mortgaged === true;
      const desMort = plan.desiredMortgaged[t.id] === true;
      if (curMort === desMort) continue;
      const mv = t.property?.mortgageValue ?? t.railroad?.mortgageValue ?? t.utility?.mortgageValue ?? 0;
      dispatch(setMortgaged({ tileId: t.id, mortgaged: desMort }));
      const nextMort = getLiveByTile()[t.id]?.mortgaged === true;
      if (nextMort !== desMort) continue;
      if (desMort) immediateMortgageCredit += mv;
      else totalCostAll += mv;
    }

    const moneyDelta = totalRefundAll + immediateMortgageCredit - totalCostAll;
    if (moneyDelta !== 0) {
      dispatch(adjustPlayerMoney({ id: plan.payerId, delta: moneyDelta }));
    }
    if (totalCostAll > 0 || totalRefundAll > 0 || immediateMortgageCredit > 0) {
      const netAll = Math.max(0, totalCostAll - totalRefundAll);
      const msg = `Liquidation staged: cost $${totalCostAll}, refund $${totalRefundAll}, mortgage credit $${immediateMortgageCredit}, net now $${netAll}`;
      dispatch(
        appendEvent({
          id: crypto.randomUUID(),
          gameId: 'local',
          type: 'MONEY_ADJUST',
          actorPlayerId: plan.payerId,
          payload: { playerId: plan.payerId, message: msg },
          moneyDelta,
          createdAt: new Date().toISOString(),
        })
      );
    }

    const payerMoneyAfter = (store.getState() as RootState).players.players.find((p) => p.id === plan.payerId)?.money ?? 0;
    if (payerMoneyAfter < plan.rentDue) return false;

    dispatch(adjustPlayerMoney({ id: plan.payerId, delta: -plan.rentDue }));
    dispatch(adjustPlayerMoney({ id: plan.payeeId, delta: +plan.rentDue }));
    dispatch(
      appendEvent({
        id: crypto.randomUUID(),
        gameId: 'local',
        type: 'RENT',
        actorPlayerId: plan.payerId,
        payload: {
          tileId: plan.tileId,
          from: plan.payerId,
          to: plan.payeeId,
          amount: plan.rentDue,
          message: `Rent ${plan.rentDue} (liquidate & pay)`,
        },
        moneyDelta: -plan.rentDue,
        createdAt: new Date().toISOString(),
      })
    );
    return true;
  }, [dispatch, store]);
  const showLiquidationBanner = React.useCallback((message: string) => {
    setLiquidationBanner(message);
    if (liquidationBannerTimerRef.current) window.clearTimeout(liquidationBannerTimerRef.current);
    liquidationBannerTimerRef.current = window.setTimeout(() => {
      setLiquidationBanner(null);
      liquidationBannerTimerRef.current = null;
    }, 2600);
  }, []);

  const postDebugLog = React.useCallback((payload: Record<string, unknown>) => {
    const url = '/__agent_debug/ingest/524dbb2d-2218-47b5-b464-246b740724e2';
    const body = JSON.stringify(payload);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e6c2a6' },
      body,
    }).catch(() => {});
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    }
  }, []);

  React.useEffect(() => {
    setCardSearch('');
  }, [overlay.deck]);
  React.useEffect(() => {
    // #region agent log
    postDebugLog({sessionId:'e6c2a6',runId:'insolvency-debug-1',hypothesisId:'H0',location:'PlayConsole.tsx:mount',message:'play console mounted',data:{turnIndex,playersCount:players.length},timestamp:Date.now()});
    // #endregion
  }, [turnIndex, players.length, postDebugLog]);
  React.useEffect(() => () => {
    if (liquidationBannerTimerRef.current) window.clearTimeout(liquidationBannerTimerRef.current);
  }, []);

  const addPreAction = React.useCallback((label: string) => {
    setPreActions((prev) => (prev.includes(label) ? prev : [...prev, label]));
  }, []);

  const cancelBusTeleportSelection = React.useCallback(() => {
    if (busTeleportTo == null) return;
    const pid = players[turnIndex]?.id || players[0]?.id;
    if (pid) dispatch(grantBusTicket({ id: pid, count: 1 }));
    setBusTicketsAvailableThisTurn((n) => n + 1);
    setBusTeleportTo(null);
    setPredictedTo(null);
  }, [busTeleportTo, players, turnIndex, dispatch]);

  const filteredOverlayCards = useMemo(() => {
    if (!overlay.deck || overlay.deck === 'bus') return [];
    const query = cardSearch.trim().toLowerCase();
    const drawPile = cardsState.decks[overlay.deck].drawPile;
    if (!query) return drawPile;
    const queryTokens = query.split(/\s+/).filter(Boolean);
    const isTokenPrefixMatch = (text: string): boolean => {
      const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
      if (queryTokens.length > words.length) return false;
      let wi = 0;
      for (const token of queryTokens) {
        let found = false;
        while (wi < words.length) {
          if (words[wi].startsWith(token)) {
            found = true;
            wi += 1;
            break;
          }
          wi += 1;
        }
        if (!found) return false;
      }
      return true;
    };
    return drawPile.filter(
      (card) => card.id.toLowerCase().includes(query) || card.text.toLowerCase().includes(query) || isTokenPrefixMatch(card.text)
    );
  }, [overlay.deck, cardSearch, cardsState.decks]);

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

  const passScopeForTile = React.useCallback((tileId: string): { scopeType: TradePassScopeType; scopeKey: string } | null => {
    const tile = BOARD_TILES.find((t) => t.id === tileId);
    if (!tile) return null;
    if (tile.type === 'railroad') return { scopeType: 'railroad', scopeKey: 'railroad' };
    if (tile.type === 'utility') return { scopeType: 'utility', scopeKey: 'utility' };
    if (tile.type === 'property' && tile.group) return { scopeType: 'color', scopeKey: tile.group };
    return null;
  }, []);

  const isIssuerEligibleForScope = React.useCallback(
    (issuerPlayerId: string, scopeType: TradePassScopeType, scopeKey: string, ownerByTileId = propsState.byTileId): boolean => {
      if (scopeType === 'railroad') {
        let count = 0;
        for (const t of BOARD_TILES) {
          if (t.type !== 'railroad') continue;
          if (ownerByTileId[t.id]?.ownerId === issuerPlayerId) count += 1;
        }
        return count >= 2;
      }
      if (scopeType === 'utility') {
        let count = 0;
        for (const t of BOARD_TILES) {
          if (t.type !== 'utility') continue;
          if (ownerByTileId[t.id]?.ownerId === issuerPlayerId) count += 1;
        }
        return count >= 2;
      }
      const groupTiles = BOARD_TILES.filter((t) => t.type === 'property' && t.group === (scopeKey as ColorGroup));
      if (groupTiles.length <= 0) return false;
      const ownedEligibleCount = groupTiles.filter((t) => {
        const ps = ownerByTileId[t.id];
        return ps?.ownerId === issuerPlayerId && ps?.mortgaged !== true;
      }).length;
      const needed = BUILD_ELIGIBLE_GROUP_OWNERSHIP_MIN[scopeKey as ColorGroup] ?? groupTiles.length;
      return ownedEligibleCount >= needed;
    },
    [propsState.byTileId]
  );

  const findUsablePass = React.useCallback(
    (holderPlayerId: string, issuerPlayerId: string, tileId: string): TradePassEntry | null => {
      const scope = passScopeForTile(tileId);
      if (!scope) return null;
      return (
        tradePassEntries.find(
          (e) =>
            e.holderPlayerId === holderPlayerId &&
            e.issuerPlayerId === issuerPlayerId &&
            e.scopeType === scope.scopeType &&
            e.scopeKey === scope.scopeKey &&
            e.remaining > 0 &&
            isIssuerEligibleForScope(e.issuerPlayerId, e.scopeType, e.scopeKey)
        ) ?? null
      );
    },
    [passScopeForTile, tradePassEntries, isIssuerEligibleForScope]
  );

  React.useEffect(() => {
    const valid = tradePassEntries.filter(
      (e) => e.remaining > 0 && isIssuerEligibleForScope(e.issuerPlayerId, e.scopeType, e.scopeKey)
    );
    const key = (arr: TradePassEntry[]) =>
      arr
        .map((e) => `${e.holderPlayerId}:${e.issuerPlayerId}:${e.scopeType}:${e.scopeKey}:${e.remaining}`)
        .sort()
        .join('|');
    if (key(valid) !== key(tradePassEntries)) {
      dispatch(setTradePasses(valid));
    }
  }, [tradePassEntries, isIssuerEligibleForScope, dispatch]);

  // Backfill decks if persisted state is empty
  const didInitDecksRef = useRef(false);
  React.useEffect(() => {
    if (didInitDecksRef.current) return;
    const ch = cardsState.decks.chance;
    const cm = cardsState.decks.community;
    const bs = cardsState.decks.bus;
    const total = (d: typeof ch) => d.drawPile.length + d.discardPile.length;
    const needsInit = (d: typeof ch, required: number) => total(d) < required;
    if (needsInit(ch, 16) || needsInit(cm, 16) || needsInit(bs, 16)) {
      dispatch(setCardsSeed(cardsState.seed || 'monopoly'));
    }
    didInitDecksRef.current = true;
  }, [dispatch, cardsState.seed, cardsState.decks]);

  // hold-to-confirm for End Turn
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const liquidationBannerTimerRef = useRef<number | null>(null);

  // Sync and reset only on turn change; avoid resetting when drawing Bus updates state
  const activePlayer = players[turnIndex] ?? players[0];
  const activePos = activePlayer?.positionIndex ?? 0;
  React.useEffect(() => {
    // reset roll selections for new active player
    setD6A(null);
    setD6B(null);
    setSpecial(null);
    setRollConfirmed(false);
    setActiveStep(0);
    setHoldProgress(0);
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
    setPreActions([]);
    setPostAction('None');
    setHighestStep(0);
    setPredictedTo(null);
    setBusTeleportTo(null);
    setTripleTeleportTo(null);
    setBuySelected(false);
    setRentSelected(false);
    setResolvedRentKey(null);
    setPendingLiquidation(null);
    setUseRentPassSelected(false);
    setTaxSelected(false);
    setDiceBusSelectedCardId(null);
    setTileBusSelectedCardId(null);
    setAuctionCompleted(false);
    setAuctionItSelected(false);
    setStagedAuction(null);
    setJailChoice(null);
    setStagedChanceCardId(null);
    setStagedCommunityCardId(null);
    // Release deferred mortgage credit at start of this player's turn.
    const pid = (players[turnIndex] ?? players[0])?.id;
    const pendingCredit = pid ? ((store.getState() as any).session?.pendingMortgageCreditByPlayerId?.[pid] ?? 0) : 0;
    if (pid && pendingCredit > 0) {
      dispatch(adjustPlayerMoney({ id: pid, delta: pendingCredit }));
      dispatch(consumePendingMortgageCredit({ playerId: pid }));
      dispatch(
        appendEvent({
          id: crypto.randomUUID(),
          gameId: 'local',
          type: 'MONEY_ADJUST',
          actorPlayerId: pid,
          payload: { playerId: pid, amount: pendingCredit, message: `Released $${pendingCredit} mortgage credit` },
          moneyDelta: pendingCredit,
          createdAt: new Date().toISOString(),
        })
      );
    }
    // snapshot bus tickets available at start of turn
    const startCount = pid ? (players.find((x) => x.id === pid)?.busTickets ?? 0) : 0;
    setBusTicketsAvailableThisTurn(startCount);
    // reset staging
    setStagedBusPicks([]);
    setSummaryOpen(false);
    setRollCount(1);
    setTurnSegments([]);
    setPostActionQueue([]);
    setQueuedPostPending(false);
    setQueuedPostActive(null);
  }, [turnIndex]);
  React.useEffect(() => {
    setCurrentIndex(activePos);
  }, [activePos]);

  // helper: events within a segment window, focusing on purchases and cards
  const getSegmentEvents = (segIndex: number): GameEvent[] => {
    const seg = turnSegments[segIndex];
    if (!seg) return [];
    const start = new Date(seg.at).getTime();
    const end = segIndex + 1 < turnSegments.length ? new Date(turnSegments[segIndex + 1].at).getTime() : Number.POSITIVE_INFINITY;
    return (events as GameEvent[]).filter((ev: GameEvent) => {
      const t = new Date(ev.createdAt).getTime();
      if (Number.isNaN(t)) return false;
      if (t < start || t >= end) return false;
      return ev.type === 'PURCHASE' || ev.type === 'CARD';
    });
  };

  // Reset confirmation if any die changes
  React.useEffect(() => {
    setRollConfirmed(false);
    setTripleTeleportTo(null);
  }, [d6A, d6B, special]);

  // //#derived
  const specialNumeric: number = useMemo(() => {
    if (special === '+1') return 1;
    if (special === '-1') return -1;
    if (special === '-2') return -2;
    if (typeof special === 'number') return special;
    // Treat Bus (string) as 0 steps
    return 0;
  }, [special]);

  const hasRoll = d6A !== null && d6B !== null; 
  const hasFullNumericRoll = d6A !== null && d6B !== null && typeof special === 'number';
  /** True when dice/teleport state matches a completed Roll step (aligns Summary / Next with `canGoNext(1)`). */
  const postStepRollComplete =
    rollConfirmed &&
    (busTeleportTo != null ||
      tripleTeleportTo != null ||
      (d6A !== null && d6B !== null));
  /** Alias for `postStepRollComplete` — keeps `hasRollWithSpecialSelected` defined for stale bundles or partial edits. */
  const hasRollWithSpecialSelected = postStepRollComplete;
  const requiresBusCard = special === 'Bus';
  const rollTotal = (d6A ?? 0) + (d6B ?? 0) + specialNumeric;
  const isTriple = d6A !== null && d6B !== null && d6A === d6B && typeof special === 'number' && special === d6A;
  const isTripleOnes = isTriple && d6A === 1;

  const bankUnownedLots = useMemo(() => {
    return BOARD_TILES.filter((tile) => tile.type === 'property' && tile.group != null && propsState.byTileId[tile.id]?.ownerId === null).map((tile) => ({
      id: tile.id,
      name: tile.name,
      group: tile.group as ColorGroup,
    }));
  }, [propsState.byTileId]);

  const depotsInstalled = useMemo(() => {
    return BOARD_TILES.filter((t) => t.type === 'railroad').reduce((acc, t) => (propsState.byTileId[t.id]?.depotInstalled ? acc + 1 : acc), 0);
  }, [propsState.byTileId]);
  const DEPOT_MAX = 4;
  const depotsLeft = Math.max(0, DEPOT_MAX - depotsInstalled);

  const chanceLeft = cardsState.decks.chance.drawPile.length;
  const communityLeft = cardsState.decks.community.drawPile.length;
  const busLeft = cardsState.decks.bus.drawPile.length;
  const liquidationPotentialByPlayerId = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const p of players) totals[p.id] = 0;

    for (const t of BOARD_TILES) {
      if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) continue;
      const ps = propsState.byTileId[t.id];
      const ownerId = ps?.ownerId;
      if (!ownerId) continue;

      let tileLiquidation = 0;

      if (t.type === 'property') {
        const level = ps?.improvements ?? 0;
        const unitCost = t.property?.houseCost ?? 0;
        tileLiquidation += level * (unitCost / 2);
      }

      // After improvements are sold down, the tile can be mortgaged if not already mortgaged.
      if (ps?.mortgaged !== true) {
        tileLiquidation += t.property?.mortgageValue ?? t.railroad?.mortgageValue ?? t.utility?.mortgageValue ?? 0;
      }

      totals[ownerId] = (totals[ownerId] ?? 0) + tileLiquidation;
    }

    return totals;
  }, [players, propsState.byTileId]);
  const turnCardPlayers = useMemo(
    () =>
      players.map((p) => ({
        ...p,
        liquidationPotential: liquidationPotentialByPlayerId[p.id] ?? 0,
      })),
    [players, liquidationPotentialByPlayerId]
  );

  // //#handlers
  const onApplyMove = (playerId?: string, toIndexOverride?: number, advanceAfterMove: boolean = true, meta?: ApplyMoveMeta): void => {
    if (!hasRoll && toIndexOverride == null) return;
    const pid = playerId ?? (players[turnIndex]?.id || players[0]?.id);
    if (!pid) return;
    const fromIndex = players.find((p) => p.id === pid)?.positionIndex ?? 0;
    const moveSteps = (d6A as number) + (d6B as number) + specialNumeric;
    const toIndex = toIndexOverride != null ? toIndexOverride : ((fromIndex + moveSteps) % BOARD_TILES.length);
    const tile = getTileByIndex(toIndex);

    const resolvedMeta: ApplyMoveMeta = meta ?? { source: 'dice', direction: 'forward' };

    const isTeleportMove = resolvedMeta.source === 'teleport_bus' || resolvedMeta.source === 'teleport_triple';

    const computePassedGo = (): boolean => {
      const fromWrapped = wrapIndex(fromIndex);
      const toWrapped = wrapIndex(toIndex);
      if (isTeleportMove && toWrapped === fromWrapped) return true; // house rule: teleport to same tile counts as a lap
      return passedGo(fromWrapped, toWrapped);
    };

    const computeDistance = (): number => {
      const fromWrapped = wrapIndex(fromIndex);
      const toWrapped = wrapIndex(toIndex);
      if (resolvedMeta.direction === 'backward') {
        if (typeof resolvedMeta.rawSteps === 'number') return Math.abs(resolvedMeta.rawSteps);
        // fallback: distance going backward from from→to
        return wrapIndex(fromWrapped - toWrapped);
      }
      // forward
      if (isTeleportMove && toWrapped === fromWrapped) return BOARD_SIZE;
      return getForwardDistance(fromWrapped, toWrapped);
    };

    // Handle Go To Jail tile immediately per classic rules
    if (tile.type === 'goToJail') {
      const pid2 = pid;
      const dist = getForwardDistance(wrapIndex(fromIndex), wrapIndex(JAIL_INDEX));
      // Move to Jail, mark inJail, reset attempts, end turn
      dispatch(setPlayerPosition({ id: pid2, index: JAIL_INDEX }));
      (dispatch as any)({ type: 'players/setInJail', payload: { id: pid2, value: true } });
      (dispatch as any)({ type: 'players/setJailAttempts', payload: { id: pid2, attempts: 0 } });
      dispatch(
        appendEvent({
          id: crypto.randomUUID(),
          gameId: 'local',
          type: 'JAIL',
          actorPlayerId: pid2,
          payload: { playerId: pid2, reason: 'GO_TO_JAIL_TILE', from: fromIndex, to: JAIL_INDEX, message: 'Go to Jail' },
          createdAt: new Date().toISOString(),
        })
      );
      // Also record movement for stats (no passing GO payout from jail moves)
      dispatch(
        appendEvent({
          id: crypto.randomUUID(),
          gameId: 'local',
          type: 'MOVE',
          actorPlayerId: pid2,
          payload: { playerId: pid2, from: fromIndex, to: JAIL_INDEX, steps: 0, distance: dist, direction: 'forward', source: 'jail_go_to_jail_tile', message: 'Moved to Jail' },
          createdAt: new Date().toISOString(),
        })
      );
      dispatch(advanceTurn({ playerCount: players.length }));
      return;
    }
    const ev: GameEvent = {
      id: crypto.randomUUID(),
      gameId: 'local',
      type: 'MOVE',
      actorPlayerId: pid,
      payload: {
        playerId: pid,
        from: fromIndex,
        to: toIndex,
        steps: toIndexOverride != null ? 0 : moveSteps,
        distance: computeDistance(),
        direction: resolvedMeta.direction,
        source: resolvedMeta.source,
        rawSteps: resolvedMeta.rawSteps,
        card: resolvedMeta.card,
        message: `Moved to ${tile.name}`,
      },
      createdAt: new Date().toISOString(),
    };
    dispatch(appendEvent(ev));

    const passed = computePassedGo();
    if (passed) {
      dispatch(
        appendEvent({
          id: crypto.randomUUID(),
          gameId: 'local',
          type: 'PASSED_GO',
          actorPlayerId: pid,
          payload: { playerId: pid, amount: 200, message: '+$200 for passing GO' },
          moneyDelta: +200,
          createdAt: new Date().toISOString(),
        })
      );
      dispatch(adjustPlayerMoney({ id: pid, delta: +200 }));

      // Race pot auto-award if applicable
      if (racePot.active && !racePot.winnerId && racePot.participants.includes(pid)) {
        dispatch(setRacePotWinner(pid));
        if (racePot.amount > 0) {
          dispatch(adjustPlayerMoney({ id: pid, delta: racePot.amount }));
          dispatch(
            appendEvent({
              id: crypto.randomUUID(),
              gameId: 'local',
              type: 'MONEY_ADJUST',
              actorPlayerId: pid,
              payload: { playerId: pid, amount: racePot.amount, message: 'Race pot winner' },
              moneyDelta: racePot.amount,
              createdAt: new Date().toISOString(),
            })
          );
        }
      }
    }

    dispatch(setPlayerPosition({ id: pid, index: toIndex }));

    // Free Parking pot: award only when landing via dice roll,
    // or via the special 1-1-1 case when exactly 3 spaces away and choosing Free Parking.
    if (tile.type === 'freeParking') {
      const fromW = wrapIndex(fromIndex);
      const toW = wrapIndex(toIndex);
      const isOnFreeParking = toW === wrapIndex(FREE_PARKING_INDEX);
      const distanceToFreeParking = getForwardDistance(fromW, wrapIndex(FREE_PARKING_INDEX));
      const isSpecial111TeleportToFreeParking =
        resolvedMeta.source === 'teleport_triple' &&
        isTripleOnes &&
        isOnFreeParking &&
        distanceToFreeParking === 3;
      const shouldAwardPot = (resolvedMeta.source === 'dice') || isSpecial111TeleportToFreeParking;
      if (shouldAwardPot && freeParkingPot > 0) {
        dispatch(adjustPlayerMoney({ id: pid, delta: freeParkingPot }));
        dispatch(
          appendEvent({
            id: crypto.randomUUID(),
            gameId: 'local',
            type: 'FREE_PARKING_WIN',
            actorPlayerId: pid,
            payload: { playerId: pid, amount: freeParkingPot, message: `Free Parking pot $${freeParkingPot}` },
            moneyDelta: freeParkingPot,
            createdAt: new Date().toISOString(),
          })
        );
        dispatch(resetFreeParking());
      }
    }

    // Mark player as having passed GO at least once for first-round lock
    try {
      // passed was computed above
      if (passed) {
        (dispatch as any)({ type: 'players/setHasPassedGo', payload: { id: pid, value: true } });
      }
    } catch {}
    setCurrentIndex(toIndex);
    setRollConfirmed(false);

    // Advance turn after applying move (can be disabled for doubles multi-roll flow)
    if (advanceAfterMove) {
      dispatch(advanceTurn({ playerCount: players.length }));
    }
  };

  // Finalize turn now (used by hold expiry and Summary overlay)
  const appendUniqueTurnSegment = (seg: TurnSegment): void => {
    setTurnSegments((arr) => {
      if (arr.some((s) => s.roll === seg.roll)) return arr;
      return [...arr, seg];
    });
  };

  const finalizeTurn = (pid: string): void => {
    // #region agent log
    postDebugLog({sessionId:'e6c2a6',runId:'insolvency-debug-1',hypothesisId:'H2',location:'PlayConsole.tsx:finalizeTurn:entry',message:'finalizeTurn called',data:{pid,turnIndex,activeStep,currentIndex,predictedTo,summaryOpen,playersCount:players.length},timestamp:Date.now()});
    // #endregion
    const isDoubles = d6A !== null && d6B !== null && d6A === d6B;
    const thirdDoubles = (rollCount >= 3) && isDoubles && (busTeleportTo == null) && (tripleTeleportTo == null);
    let resolvedQueuedThisCall = false;
    // Record this segment into the ribbon before applying stateful movement
    try {
      const fromIndexSeg = players.find((p) => p.id === pid)?.positionIndex ?? 0;
      const moveStepsSeg = (d6A ?? 0) + (d6B ?? 0) + specialNumeric;
      let toIndexSeg = fromIndexSeg;
      if (thirdDoubles) {
        toIndexSeg = JAIL_INDEX;
      } else if (busTeleportTo != null) {
        toIndexSeg = busTeleportTo;
      } else if (d6A != null && d6B != null) {
        toIndexSeg = (fromIndexSeg + moveStepsSeg) % BOARD_TILES.length;
      } else if (predictedTo != null) {
        toIndexSeg = predictedTo;
      }
      const seg: TurnSegment = {
        roll: rollCount,
        d6A: d6A as number | null,
        d6B: d6B as number | null,
        special: special as any,
        busUsed: busTeleportTo != null,
        from: fromIndexSeg,
        to: toIndexSeg,
        tileName: getTileByIndex(toIndexSeg).name,
        at: new Date().toISOString(),
      };
      appendUniqueTurnSegment(seg);
      if (d6A != null && d6B != null) {
        const totalRoll = d6A + d6B + specialNumeric;
        const isDoubleRoll = d6A === d6B;
        const isTripleRoll = d6A === d6B && typeof special === 'number' && special === d6A;
        const isTripleOnesRoll = isTripleRoll && d6A === 1;
        dispatch(
          appendEvent({
            id: crypto.randomUUID(),
            gameId: 'local',
            type: 'ROLL',
            actorPlayerId: pid,
            payload: {
              d6A,
              d6B,
              special: special as SpecialDieFace | null,
              total: totalRoll,
              isDouble: isDoubleRoll,
              isTriple: isTripleRoll,
              isTripleOnes: isTripleOnesRoll,
              rollIndex: rollCount,
              message: `Rolled ${totalRoll}`,
            },
            createdAt: new Date().toISOString(),
          })
        );
      }
    } catch {}
    // Commit staged Bus effects now (skip if third doubles sends to jail)
    if (!thirdDoubles && stagedBusPicks.length > 0) {
      for (const pick of stagedBusPicks) {
        if (pick === 'regular') {
          dispatch(grantBusTicket({ id: pid, count: 1 }));
        } else {
          dispatch(clearAllBusTickets());
          dispatch(grantBusTicket({ id: pid, count: 1 }));
          dispatch(
            appendEvent({
              id: crypto.randomUUID(),
              gameId: 'local',
              type: 'CARD',
              actorPlayerId: pid,
              payload: {
                deck: 'bus',
                cardId: 'bb-*',
                message: "Big Bus: all players' bus tickets cleared; drawer gains 1",
              },
              createdAt: new Date().toISOString(),
            })
          );
        }
      }
      setStagedBusPicks([]);
    }

    // If Buy was toggled, execute purchase before movement effects (skip on third doubles)
    if (!thirdDoubles && buySelected && predictedTo != null) {
      const t = getTileByIndex(predictedTo);
      const price = t.property?.purchasePrice ?? t.railroad?.purchasePrice ?? t.utility?.purchasePrice ?? 0;
      const currentMoney = players.find((x) => x.id === pid)?.money ?? 0;
      const pendingJackpot = isTripleOnes && tripleTeleportTo != null ? 1000 : 0;
      if (currentMoney + pendingJackpot < price) {
        setBuySelected(false);
      } else {
      dispatch(assignOwner({ tileId: t.id, ownerId: pid }));
      if (price > 0) dispatch(adjustPlayerMoney({ id: pid, delta: -price }));
      dispatch(
        appendEvent({
          id: crypto.randomUUID(),
          gameId: 'local',
          type: 'PURCHASE',
          actorPlayerId: pid,
          payload: { tileId: t.id, ownerId: pid, amount: price, message: `Purchased ${t.name}` },
          moneyDelta: -price,
          createdAt: new Date().toISOString(),
        })
      );
      }
    }
    // If Auction (property-tied or tile) was staged and confirmed, apply before movement
    if (stagedAuction) {
      const t = BOARD_TILES.find((x) => x.id === stagedAuction.tileId)!;
      dispatch(assignOwner({ tileId: t.id, ownerId: stagedAuction.winnerId }));
      if (stagedAuction.amount > 0) dispatch(adjustPlayerMoney({ id: stagedAuction.winnerId, delta: -stagedAuction.amount }));
      dispatch(appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'AUCTION', actorPlayerId: stagedAuction.winnerId, payload: { tileId: t.id, ownerId: stagedAuction.winnerId, amount: stagedAuction.amount, message: `Auction: ${t.name} sold for $${stagedAuction.amount}` }, moneyDelta: -stagedAuction.amount, createdAt: new Date().toISOString() }));
      setStagedAuction(null);
      setAuctionCompleted(false);
      setAuctionItSelected(false);
    }

    // Apply staged Chance/Community effects and mutate decks now
    const applyStagedCard = (deck: 'chance' | 'community', cardId: string) => {
      // Move chosen card to top of discard by simulating: put all cards before it to bottom, then draw
      const draw = cardsState.decks[deck].drawPile;
      const idx = draw.findIndex((c) => c.id === cardId);
      if (idx > 0) {
        for (let i = 0; i < idx; i++) {
          const id = draw[i].id;
          dispatch(putCardOnBottom({ deck, cardId: id }));
        }
      }
      dispatch(drawCard(deck));
      dispatch(appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'CARD', actorPlayerId: pid, payload: { deck, cardId, message: `Drew ${deck}` }, createdAt: new Date().toISOString() }));
      // Apply effects based on the known definition for the selected card id
      const def = (deck === 'chance' ? CHANCE : COMMUNITY_CHEST).find((c) => c.id === cardId);
      const effect = def?.effect as { type: string; amount?: number; amountPerPlayer?: number; steps?: number; tileId?: string; awardGoIfPassed?: boolean } | undefined;
      if (effect && pid) {
        if (effect.type === 'payBank' && typeof effect.amount === 'number' && effect.amount > 0) {
          dispatch(adjustPlayerMoney({ id: pid, delta: -effect.amount }));
          dispatch(addToFreeParking(effect.amount));
        } else if (effect.type === 'receiveBank' && typeof effect.amount === 'number' && effect.amount > 0) {
          dispatch(adjustPlayerMoney({ id: pid, delta: +effect.amount }));
        } else if (effect.type === 'getOutOfJail') {
          // Award GOJF card to the active player; deck determines which counter
          dispatch(grantGetOutOfJail({ id: pid, deck }));
        } else if (effect.type === 'payEachPlayer' && typeof effect.amountPerPlayer === 'number' && effect.amountPerPlayer > 0) {
          const others = players.filter((pl) => pl.id !== pid);
          const total = effect.amountPerPlayer * others.length;
          if (total > 0) {
            dispatch(adjustPlayerMoney({ id: pid, delta: -total }));
            others.forEach((pl) => dispatch(adjustPlayerMoney({ id: pl.id, delta: +effect.amountPerPlayer! })));
          }
        } else if (effect.type === 'receiveFromPlayers' && typeof effect.amountPerPlayer === 'number' && effect.amountPerPlayer > 0) {
          const others = players.filter((pl) => pl.id !== pid);
          const total = effect.amountPerPlayer * others.length;
          if (total > 0) {
            others.forEach((pl) => dispatch(adjustPlayerMoney({ id: pl.id, delta: -effect.amountPerPlayer! })));
            dispatch(adjustPlayerMoney({ id: pid, delta: +total }));
          }
        } else if (effect.type === 'moveTo') {
          const dest = BOARD_TILES.find((t) => t.id === effect.tileId)?.index;
          if (typeof dest === 'number') {
            setPostActionQueue((q) => [
              ...q,
              {
                kind: 'move',
                to: dest,
                source: deck === 'chance' ? 'card_chance' : 'card_community',
                direction: 'forward',
                card: { deck, cardId, effectType: 'moveTo', awardGoIfPassed: effect.awardGoIfPassed },
              },
            ]);
          }
        } else if (effect.type === 'moveSteps') {
          const from = players.find((x) => x.id === pid)?.positionIndex ?? 0;
          const steps = typeof effect.steps === 'number' ? effect.steps : 0;
          const len = BOARD_TILES.length;
          const dest = ((from + steps) % len + len) % len;
          setPostActionQueue((q) => [
            ...q,
            {
              kind: 'move',
              to: dest,
              source: deck === 'chance' ? 'card_chance' : 'card_community',
              direction: steps < 0 ? 'backward' : 'forward',
              card: { deck, cardId, effectType: 'moveSteps', rawSteps: steps, awardGoIfPassed: effect.awardGoIfPassed },
            },
          ]);
        } else if (effect.type === 'goToJail') {
          setPostActionQueue((q) => [
            ...q,
            {
              kind: 'goToJail',
              source: 'jail_card',
              card: { deck, cardId, effectType: 'goToJail' },
            },
          ]);
        }
      }
    };

    if (!thirdDoubles) {
      if (stagedChanceCardId) {
        applyStagedCard('chance', stagedChanceCardId);
        setStagedChanceCardId(null);
      }
      if (stagedCommunityCardId) {
        applyStagedCard('community', stagedCommunityCardId);
        setStagedCommunityCardId(null);
      }
    }

    // If a queued Post destination exists and we haven't opened it yet this cycle, open it now and stop.
    if (!queuedPostPending && postActionQueue.length > 0) {
      const nextMove = postActionQueue[0];
      setPostActionQueue((q) => q.slice(1));
      if (nextMove.kind === 'move') {
        setPredictedTo(nextMove.to);
      } else {
        setPredictedTo(JAIL_INDEX);
      }
      setQueuedPostActive(nextMove);
      setActiveStep(2);
      setHighestStep(2);
      setQueuedPostPending(true);
      // Clear current selections for the new Post segment
      setPostAction('None');
      setBuySelected(false);
      setRentSelected(false);
      setResolvedRentKey(null);
      setPendingLiquidation(null);
      setUseRentPassSelected(false);
      setTaxSelected(false);
      setSummaryOpen(false);
      return;
    }

    // Resolve strict insolvency before any normal rent selection/settlement flow.
    if (!thirdDoubles) {
      const insolvencyCtx = getActiveRentContext();
      // #region agent log
      postDebugLog({sessionId:'e6c2a6',runId:'insolvency-debug-1',hypothesisId:'H1',location:'PlayConsole.tsx:finalizeTurn:insolvency-check',message:'insolvency context before branch',data:{pid,insolvencyCtx},timestamp:Date.now()});
      // #endregion
      if (insolvencyCtx && insolvencyCtx.payerId === pid && insolvencyCtx.isInsolvent) {
        const loserId = insolvencyCtx.payerId;
        const creditorId = insolvencyCtx.payeeId;
        // #region agent log
        postDebugLog({sessionId:'e6c2a6',runId:'insolvency-debug-1',hypothesisId:'H1',location:'PlayConsole.tsx:finalizeTurn:insolvency-branch-enter',message:'entered insolvency settlement branch',data:{loserId,creditorId,turnIndex,playersCountBefore:players.length},timestamp:Date.now()});
        // #endregion
        const loserName = players.find((p) => p.id === loserId)?.nickname ?? loserId;
        const creditorName = players.find((p) => p.id === creditorId)?.nickname ?? creditorId;
        const getLiveByTile = () => (store.getState() as RootState).properties.byTileId;
        const loserPropertyTiles = BOARD_TILES.filter((t) => t.type === 'property' && propsState.byTileId[t.id]?.ownerId === loserId);
        let liquidationRefund = 0;

        for (let pass = 0; pass < 64; pass += 1) {
          let progressed = false;
          for (const t of loserPropertyTiles) {
            const before = getLiveByTile()[t.id]?.improvements ?? 0;
            if (before <= 0) continue;
            dispatch(sellHouse({ tileId: t.id }));
            const after = getLiveByTile()[t.id]?.improvements ?? before;
            if (after < before) {
              progressed = true;
              liquidationRefund += (t.property?.houseCost ?? 0) / 2;
            }
          }
          if (!progressed) break;
        }

        if (liquidationRefund > 0) {
          dispatch(adjustPlayerMoney({ id: loserId, delta: liquidationRefund }));
        }

        const transferableTileIds = BOARD_TILES
          .filter((t) => t.type === 'property' || t.type === 'railroad' || t.type === 'utility')
          .map((t) => t.id)
          .filter((tileId) => getLiveByTile()[tileId]?.ownerId === loserId);

        for (const tileId of transferableTileIds) {
          dispatch(transferOwnerPreserveState({ tileId, ownerId: creditorId }));
          dispatch(unassignProperty({ id: loserId, tileId }));
          dispatch(assignProperty({ id: creditorId, tileId }));
        }

        dispatch(transferPlayerSpecialAssets({ fromId: loserId, toId: creditorId }));

        const loserRemainingCash = (store.getState() as RootState).players.players.find((p) => p.id === loserId)?.money ?? 0;
        if (loserRemainingCash > 0) {
          dispatch(adjustPlayerMoney({ id: loserId, delta: -loserRemainingCash }));
          dispatch(adjustPlayerMoney({ id: creditorId, delta: +loserRemainingCash }));
        }

        dispatch(
          appendEvent({
            id: crypto.randomUUID(),
            gameId: 'local',
            type: 'MONEY_ADJUST',
            actorPlayerId: loserId,
            payload: {
              playerId: loserId,
              message: `${loserName} is insolvent and lost to ${creditorName}. Transferred ${transferableTileIds.length} properties, $${loserRemainingCash} cash, and all bus/GOJF cards.`,
            },
            moneyDelta: -loserRemainingCash,
            createdAt: new Date().toISOString(),
          })
        );

        dispatch(consumePendingMortgageCredit({ playerId: loserId }));
        dispatch(removePlayer(loserId));

        const nextPlayerCount = Math.max(0, players.length - 1);
        const nextIndex = nextPlayerCount > 0 ? Math.min(turnIndex, nextPlayerCount - 1) : 0;
        dispatch(setTurnIndex(nextIndex));
        const playersAfterRemoval = (store.getState() as RootState).players.players.map((p) => p.id);
        // #region agent log
        postDebugLog({sessionId:'e6c2a6',runId:'insolvency-debug-1',hypothesisId:'H3',location:'PlayConsole.tsx:finalizeTurn:after-remove',message:'post-removal state snapshot',data:{loserId,nextIndex,nextPlayerCount,playersAfterRemoval},timestamp:Date.now()});
        // #endregion

        if (playersAfterRemoval.length === 1) {
          setVictoryWinnerId(playersAfterRemoval[0]!);
          setVictoryModalOpen(true);
        }

        setPostAction('Insolvency');
        setPendingLiquidation(null);
        setResolvedRentKey(null);
        setRentSelected(false);
        setUseRentPassSelected(false);
        setTaxSelected(false);
        setPredictedTo(null);
        setTripleTeleportTo(null);
        setBusTeleportTo(null);
        setPostActionQueue([]);
        setQueuedPostPending(false);
        setQueuedPostActive(null);
        setSummaryOpen(false);
        // #region agent log
        postDebugLog({sessionId:'e6c2a6',runId:'insolvency-debug-1',hypothesisId:'H4',location:'PlayConsole.tsx:finalizeTurn:before-return',message:'insolvency branch completed and modal close requested',data:{summaryOpenRequested:false},timestamp:Date.now()});
        // #endregion
        return;
      }
    }

    // Apply deferred liquidation settlement for the current rent context.
    if (!thirdDoubles && pendingLiquidation) {
      const idxL = predictedTo ?? currentIndex;
      const tL = getTileByIndex(idxL);
      const psL = propsState.byTileId[tL.id];
      const ownerIdL = psL?.ownerId as string | null;
      const pendingKey = makeRentSettlementKey(pendingLiquidation.payerId, pendingLiquidation.tileId, pendingLiquidation.payeeId);
      const currentKey = ownerIdL ? makeRentSettlementKey(pid, tL.id, ownerIdL) : '';
      if (pendingKey === currentKey) {
        const settled = applyPendingLiquidationPlan(pendingLiquidation);
        if (!settled) return;
        setResolvedRentKey(currentKey);
        setPendingLiquidation(null);
        setRentSelected(false);
        setUseRentPassSelected(false);
        setPostAction('Rent');
        showLiquidationBanner(`Rent paid via liquidation: $${pendingLiquidation.rentDue}`);
      }
    }

    // If rent or pass was selected, resolve payment before moving (skip on third doubles)
    if (!thirdDoubles && (rentSelected || useRentPassSelected)) {
      const idx2 = predictedTo ?? currentIndex;
      const t2 = getTileByIndex(idx2);
      if (t2 && (t2.type === 'property' || t2.type === 'railroad' || t2.type === 'utility')) {
        const ps2 = propsState.byTileId[t2.id];
        const ownerIdForTile2 = ps2?.ownerId as string | null;
        const mortgaged2 = ps2?.mortgaged === true;
        const pendingForThisRent = !!(
          ownerIdForTile2 &&
          pendingLiquidation &&
          makeRentSettlementKey(pendingLiquidation.payerId, pendingLiquidation.tileId, pendingLiquidation.payeeId) === makeRentSettlementKey(pid, t2.id, ownerIdForTile2)
        );
        const alreadySettled = !!(ownerIdForTile2 && resolvedRentKey === makeRentSettlementKey(pid, t2.id, ownerIdForTile2));
        if (alreadySettled) {
          setResolvedRentKey(null);
          setRentSelected(false);
          setUseRentPassSelected(false);
        }
        if (ownerIdForTile2 && ownerIdForTile2 !== pid && !mortgaged2 && !alreadySettled && !pendingForThisRent) {
          const diceTotal2 = (d6A ?? 0) + (d6B ?? 0) + specialNumeric;
          const state2 = (window as any).__store__?.getState?.() as RootState | undefined;
          const rent2 = computeRent({ ...(state2 as any), properties: propsState } as RootState, t2.id, diceTotal2);
          if (rent2 > 0) {
            const usablePass = findUsablePass(pid, ownerIdForTile2, t2.id);
            if (useRentPassSelected && usablePass) {
              const passLabel =
                usablePass.scopeType === 'color'
                  ? `${usablePass.scopeKey} pass`
                  : usablePass.scopeType === 'railroad'
                    ? 'Railroad pass'
                    : 'Utility pass';
              dispatch(
                consumeTradePass({
                  holderPlayerId: usablePass.holderPlayerId,
                  issuerPlayerId: usablePass.issuerPlayerId,
                  scopeType: usablePass.scopeType,
                  scopeKey: usablePass.scopeKey,
                })
              );
              dispatch(
                appendEvent({
                  id: crypto.randomUUID(),
                  gameId: 'local',
                  type: 'RENT_PASS_USED',
                  actorPlayerId: pid,
                  payload: {
                    holderPlayerId: pid,
                    issuerPlayerId: ownerIdForTile2,
                    tileId: t2.id,
                    scopeType: usablePass.scopeType,
                    scopeKey: usablePass.scopeKey,
                    preventedRent: rent2,
                    message: `${passLabel} used to skip rent`,
                  },
                  createdAt: new Date().toISOString(),
                })
              );
              // Pass consumed; skip rent transfer but continue turn finalization.
            }
            if (!(useRentPassSelected && usablePass)) {
              const payerMoney = players.find((p) => p.id === pid)?.money ?? 0;
              if (payerMoney < rent2) return;
              dispatch(adjustPlayerMoney({ id: pid, delta: -rent2 }));
              dispatch(adjustPlayerMoney({ id: ownerIdForTile2, delta: +rent2 }));
              dispatch(
                appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'RENT', actorPlayerId: pid, payload: { tileId: t2.id, from: pid, to: ownerIdForTile2, amount: rent2, message: `Rent ${rent2}` }, moneyDelta: -rent2, createdAt: new Date().toISOString() })
              );
            }
          }
        }
      }
    }

    // If Tax was toggled, apply to Free Parking and log (skip on third doubles)
    if (!thirdDoubles && taxSelected) {
      const idx3 = predictedTo ?? currentIndex;
      const t3 = getTileByIndex(idx3);
      if (t3 && t3.type === 'tax' && t3.taxAmount) {
        dispatch(adjustPlayerMoney({ id: pid, delta: -t3.taxAmount }));
        dispatch(addToFreeParking(t3.taxAmount));
        dispatch(
          appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'FEE', actorPlayerId: pid, payload: { tileId: t3.id, from: pid, amount: t3.taxAmount, message: `Tax ${t3.taxAmount}` }, moneyDelta: -t3.taxAmount, createdAt: new Date().toISOString() })
        );
      }
    }

    // If we are resolving a queued Post (predictedTo set from queue), apply now but do not advance turn.
    if (queuedPostPending && queuedPostActive && predictedTo != null) {
      const fromIdx = players.find((p) => p.id === pid)?.positionIndex ?? 0;
      if (queuedPostActive.kind === 'goToJail') {
        // Card jail: move to Jail, mark inJail, reset attempts, end turn
        dispatch(setPlayerPosition({ id: pid, index: JAIL_INDEX }));
        (dispatch as any)({ type: 'players/setInJail', payload: { id: pid, value: true } });
        (dispatch as any)({ type: 'players/setJailAttempts', payload: { id: pid, attempts: 0 } });
        dispatch(
          appendEvent({
            id: crypto.randomUUID(),
            gameId: 'local',
            type: 'JAIL',
            actorPlayerId: pid,
            payload: { playerId: pid, reason: 'CARD', from: fromIdx, to: JAIL_INDEX, message: 'Go to Jail' },
            createdAt: new Date().toISOString(),
          })
        );
        // Record movement for stats
        dispatch(
          appendEvent({
            id: crypto.randomUUID(),
            gameId: 'local',
            type: 'MOVE',
            actorPlayerId: pid,
            payload: {
              playerId: pid,
              from: fromIdx,
              to: JAIL_INDEX,
              steps: 0,
              distance: getForwardDistance(wrapIndex(fromIdx), wrapIndex(JAIL_INDEX)),
              direction: 'forward',
              source: 'jail_card',
              card: queuedPostActive.card,
              message: 'Moved to Jail',
            },
            createdAt: new Date().toISOString(),
          })
        );
        dispatch(advanceTurn({ playerCount: players.length }));
        setPredictedTo(null);
        setQueuedPostPending(false);
        setQueuedPostActive(null);
        setPostActionQueue([]);
        return;
      }

      onApplyMove(pid, predictedTo, false, {
        source: queuedPostActive.source,
        direction: queuedPostActive.direction,
        rawSteps: queuedPostActive.card?.rawSteps,
        card: queuedPostActive.card,
      });
      setPredictedTo(null);
      setQueuedPostPending(false);
      setQueuedPostActive(null);
      resolvedQueuedThisCall = true;
      // If more queued items remain, immediately open the next and stop here
      if (postActionQueue.length > 0) {
        const nextMove2 = postActionQueue[0];
        setPostActionQueue((q) => q.slice(1));
        if (nextMove2.kind === 'move') setPredictedTo(nextMove2.to);
        else setPredictedTo(JAIL_INDEX);
        setQueuedPostActive(nextMove2);
        setActiveStep(2);
        setHighestStep(2);
        setQueuedPostPending(true);
        setPostAction('None');
        setBuySelected(false);
        setRentSelected(false);
        setResolvedRentKey(null);
        setPendingLiquidation(null);
        setUseRentPassSelected(false);
        setTaxSelected(false);
        setSummaryOpen(false);
        return;
      }
      // No more queued posts; continue to normal end-of-turn handling below
    }

    if (resolvedQueuedThisCall) {
      // We just resolved a queued movement into its Post segment; do not apply any additional roll/doubles logic now.
      return;
    }

    if (thirdDoubles) {
      // Go directly to Jail on third doubles
      const fromIdx = players.find((p) => p.id === pid)?.positionIndex ?? currentIndex;
      dispatch(setPlayerPosition({ id: pid, index: JAIL_INDEX }));
      (dispatch as any)({ type: 'players/setInJail', payload: { id: pid, value: true } });
      (dispatch as any)({ type: 'players/setJailAttempts', payload: { id: pid, attempts: 0 } });
      dispatch(
        appendEvent({
          id: crypto.randomUUID(),
          gameId: 'local',
          type: 'JAIL',
          actorPlayerId: pid,
          payload: { playerId: pid, reason: 'THREE_DOUBLES', from: fromIdx, to: JAIL_INDEX, message: 'Go to Jail (3rd doubles)' },
          createdAt: new Date().toISOString(),
        })
      );
      dispatch(
        appendEvent({
          id: crypto.randomUUID(),
          gameId: 'local',
          type: 'MOVE',
          actorPlayerId: pid,
          payload: {
            playerId: pid,
            from: fromIdx,
            to: JAIL_INDEX,
            steps: 0,
            distance: getForwardDistance(wrapIndex(fromIdx), wrapIndex(JAIL_INDEX)),
            direction: 'forward',
            source: 'jail_three_doubles',
            message: 'Moved to Jail (3rd doubles)',
          },
          createdAt: new Date().toISOString(),
        })
      );
      dispatch(advanceTurn({ playerCount: players.length }));
    } else if (busTeleportTo != null) {
      // Teleport move ignores doubles chaining; advance immediately
      onApplyMove(pid, busTeleportTo, true, { source: 'teleport_bus', direction: 'forward' });
    } else if (tripleTeleportTo != null) {
      // Triple teleport ignores doubles chaining; advance immediately
      const fromIdx = players.find((p) => p.id === pid)?.positionIndex ?? currentIndex;
      const nearGoToJail111 = isTripleOnes && (getForwardDistance(wrapIndex(fromIdx), wrapIndex(GO_TO_JAIL_INDEX)) === 3);
      if (nearGoToJail111) {
        // House rule: if 1-1-1 while 3 spaces from Go To Jail, go directly to Jail (no teleport, no +$1000).
        dispatch(setPlayerPosition({ id: pid, index: JAIL_INDEX }));
        (dispatch as any)({ type: 'players/setInJail', payload: { id: pid, value: true } });
        (dispatch as any)({ type: 'players/setJailAttempts', payload: { id: pid, attempts: 0 } });
        dispatch(
          appendEvent({
            id: crypto.randomUUID(),
            gameId: 'local',
            type: 'JAIL',
            actorPlayerId: pid,
            payload: { playerId: pid, reason: 'TRIPLE_ONES_NEAR_JAIL', from: fromIdx, to: JAIL_INDEX, message: 'Go to Jail (1-1-1 near Go To Jail)' },
            createdAt: new Date().toISOString(),
          })
        );
        dispatch(
          appendEvent({
            id: crypto.randomUUID(),
            gameId: 'local',
            type: 'MOVE',
            actorPlayerId: pid,
            payload: {
              playerId: pid,
              from: fromIdx,
              to: JAIL_INDEX,
              steps: 0,
              distance: getForwardDistance(wrapIndex(fromIdx), wrapIndex(JAIL_INDEX)),
              direction: 'forward',
              source: 'jail_triple_ones_near_jail',
              message: 'Moved to Jail (1-1-1 near Go To Jail)',
            },
            createdAt: new Date().toISOString(),
          })
        );
        dispatch(advanceTurn({ playerCount: players.length }));
        return;
      }

      dispatch(
        appendEvent({
          id: crypto.randomUUID(),
          gameId: 'local',
          type: 'TELEPORT',
          actorPlayerId: pid,
          payload: { playerId: pid, from: currentIndex, to: tripleTeleportTo, message: `Teleported to ${getTileByIndex(tripleTeleportTo).name}` },
          createdAt: new Date().toISOString(),
        })
      );
      if (isTripleOnes) {
        dispatch(adjustPlayerMoney({ id: pid, delta: +1000 }));
        dispatch(
          appendEvent({
            id: crypto.randomUUID(),
            gameId: 'local',
            type: 'JACKPOT_111',
            actorPlayerId: pid,
            payload: { playerId: pid, amount: 1000, message: '+$1000 jackpot (1-1-1)' },
            moneyDelta: +1000,
            createdAt: new Date().toISOString(),
          })
        );
      }
      onApplyMove(pid, tripleTeleportTo, true, { source: 'teleport_triple', direction: 'forward' });
    } else if (isDoubles) {
      // Record this roll segment now (doubles can create multiple rolls per turn)
      try {
        const fromIndexSeg = players.find((p) => p.id === pid)?.positionIndex ?? 0;
        const moveStepsSeg = (d6A ?? 0) + (d6B ?? 0) + specialNumeric;
        const toIndexSeg = (fromIndexSeg + moveStepsSeg) % BOARD_TILES.length;
        appendUniqueTurnSegment({
          roll: rollCount,
          d6A: d6A as number | null,
          d6B: d6B as number | null,
          special: special as any,
          busUsed: false,
          from: fromIndexSeg,
          to: toIndexSeg,
          tileName: getTileByIndex(toIndexSeg).name,
          at: new Date().toISOString(),
        });
      } catch {}
      // Apply move but do NOT advance; prepare for next roll in the same turn
      onApplyMove(pid, undefined, false, { source: 'dice', direction: 'forward', rawSteps: (d6A as number) + (d6B as number) + specialNumeric });
      setRollCount((n) => n + 1);
      // Reset flow for next roll
      setActiveStep(1);
      setHighestStep(1);
      setD6A(null);
      setD6B(null);
      setSpecial(null);
      setDiceBusSelectedCardId(null);
      setTileBusSelectedCardId(null);
      setRollConfirmed(false);
      setPredictedTo(null);
      setTripleTeleportTo(null);
      setPostAction('None');
      setBuySelected(false);
      setRentSelected(false);
      setResolvedRentKey(null);
      setPendingLiquidation(null);
      setUseRentPassSelected(false);
      setTaxSelected(false);
      setSummaryOpen(false);
    } else {
      // Apply movement normally and advance turn (only if no queued post is pending)
      onApplyMove(pid, undefined, true, { source: 'dice', direction: 'forward', rawSteps: (d6A as number) + (d6B as number) + specialNumeric });
    }
  };

  const onEndTurnHoldStart = (pid: string): void => {
    // Require confirmation; allow either a numeric roll or a bus teleport
    if (!rollConfirmed) return;
    if (!hasRoll && busTeleportTo == null && tripleTeleportTo == null) return;
    // Block hold if rent is required but not selected
    if (rentRequiredButNotSelected()) return;
    // Block hold if tax is required but not selected
    if (taxRequiredButNotSelected()) return;
    // Block hold if a mandatory draw hasn't been selected yet
    if (cardDrawRequiredButNotSelected()) return;
    setHoldProgress(0);
    const start = Date.now();
    const duration = 3000;
    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setHoldProgress(progress);
    }, 50) as unknown as number;
    holdTimerRef.current = window.setTimeout(() => {
      // Confirmed
      if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
      setHoldProgress(100);

      finalizeTurn(pid);
    }, duration) as unknown as number;
  };

  const onEndTurnHoldCancel = (): void => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
    setHoldProgress(0);
  };

  const onAdjustMoney = (): void => {
    if (!moneyPlayerId || !Number.isFinite(moneyDelta) || moneyDelta === 0) return;
    dispatch(adjustPlayerMoney({ id: moneyPlayerId, delta: moneyDelta }));
    dispatch(
      appendEvent({
        id: crypto.randomUUID(),
        gameId: 'local',
        type: 'MONEY_ADJUST',
        actorPlayerId: moneyPlayerId,
        payload: { playerId: moneyPlayerId, amount: moneyDelta, message: `${moneyDelta > 0 ? '+' : ''}${moneyDelta}` },
        moneyDelta,
        createdAt: new Date().toISOString(),
      })
    );
    setMoneyDelta(0);
  };

  const onDrawCard = (deck: 'chance' | 'community' | 'bus'): void => {
    if (deck === 'bus') {
      const idx = predictedTo ?? currentIndex;
      const t = getTileByIndex(idx);
      const slot: 'dice' | 'tile' =
        requiresBusCard && !diceBusSelectedCardId ? 'dice' : t.type === 'busStop' && !tileBusSelectedCardId ? 'tile' : 'dice';
      setOverlay({ deck: 'bus', busSlot: slot });
    } else {
      setOverlay({ deck });
    }
  };

  const onPayRent = (): void => {
    const tile = getTileByIndex(currentIndex);
    const state = (window as any).__store__?.getState?.() as RootState | undefined;
    const diceTotal = (d6A ?? 0) + (d6B ?? 0) + specialNumeric;
    const rent = computeRent({ ...(state as any), properties: propsState } as RootState, tile.id, diceTotal);
    const ps = propsState.byTileId[tile.id];
    const ownerIdForTile = ps?.ownerId as string | null;
    const mortgaged = ps?.mortgaged === true;
    if (!moneyPlayerId || !ownerIdForTile || ownerIdForTile === moneyPlayerId || mortgaged || rent <= 0) return;
    const payerMoney = players.find((p) => p.id === moneyPlayerId)?.money ?? 0;
    if (payerMoney < rent) return;
    const usablePass = findUsablePass(moneyPlayerId, ownerIdForTile, tile.id);
    if (usablePass) {
      const passLabel =
        usablePass.scopeType === 'color'
          ? `${usablePass.scopeKey} pass`
          : usablePass.scopeType === 'railroad'
            ? 'Railroad pass'
            : 'Utility pass';
      const usePass = window.confirm(`Use ${passLabel} to skip $${rent} rent?`);
      if (usePass) {
        dispatch(
          consumeTradePass({
            holderPlayerId: usablePass.holderPlayerId,
            issuerPlayerId: usablePass.issuerPlayerId,
            scopeType: usablePass.scopeType,
            scopeKey: usablePass.scopeKey,
          })
        );
        dispatch(
          appendEvent({
            id: crypto.randomUUID(),
            gameId: 'local',
            type: 'RENT_PASS_USED',
            actorPlayerId: moneyPlayerId,
            payload: {
              holderPlayerId: moneyPlayerId,
              issuerPlayerId: ownerIdForTile,
              tileId: tile.id,
              scopeType: usablePass.scopeType,
              scopeKey: usablePass.scopeKey,
              preventedRent: rent,
              message: `${passLabel} used to skip rent`,
            },
            createdAt: new Date().toISOString(),
          })
        );
        return;
      }
    }
    dispatch(adjustPlayerMoney({ id: moneyPlayerId, delta: -rent }));
    dispatch(adjustPlayerMoney({ id: ownerIdForTile, delta: +rent }));
    dispatch(
      appendEvent({
        id: crypto.randomUUID(),
        gameId: 'local',
        type: 'RENT',
        actorPlayerId: moneyPlayerId,
        payload: { tileId: tile.id, from: moneyPlayerId, to: ownerIdForTile, amount: rent, message: `Rent ${rent}` },
        moneyDelta: -rent,
        createdAt: new Date().toISOString(),
      })
    );
  };

  const onPayTax = (): void => {
    const tile = getTileByIndex(currentIndex);
    if (tile.type !== 'tax' || !tile.taxAmount || !moneyPlayerId) return;
    dispatch(adjustPlayerMoney({ id: moneyPlayerId, delta: -tile.taxAmount }));
    dispatch(
      appendEvent({
        id: crypto.randomUUID(),
        gameId: 'local',
        type: 'FEE',
        actorPlayerId: moneyPlayerId,
        payload: { tileId: tile.id, from: moneyPlayerId, amount: tile.taxAmount, message: `Tax ${tile.taxAmount}` },
        moneyDelta: -tile.taxAmount,
        createdAt: new Date().toISOString(),
      })
    );
    dispatch(addToFreeParking(tile.taxAmount));
  };

  const onConfirmNewGame = async (): Promise<void> => {
    setNewGameConfirmOpen(false);
    try {
      await persistor.purge();
    } finally {
      // `purge()` clears persisted storage but does not reset in-memory Redux state.
      window.location.assign('/setup');
    }
  };

  const onMortgageToggle = (mortgaged: boolean): void => {
    const tile = getTileByIndex(currentIndex);
    if (!(tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility')) return;
    dispatch(setMortgaged({ tileId: tile.id, mortgaged }));
    const tileOwner = propsState.byTileId[tile.id]?.ownerId as string | null;
    const pid = players[turnIndex]?.id || players[0]?.id;
    dispatch(appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'MONEY_ADJUST', actorPlayerId: tileOwner ?? pid, payload: { tileId: tile.id, mortgaged }, createdAt: new Date().toISOString() }));
  };

  const onBuild = (): void => {
    const tile = getTileByIndex(currentIndex);
    if (tile.type !== 'property') return;
    const tileOwner = propsState.byTileId[tile.id]?.ownerId as string | undefined;
    if (!tileOwner) return;
    dispatch(buyHouse({ tileId: tile.id, ownerId: tileOwner }));
    dispatch(appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'MONEY_ADJUST', actorPlayerId: tileOwner, payload: { tileId: tile.id, message: 'Build' }, createdAt: new Date().toISOString() }));
  };

  const onSell = (): void => {
    const tile = getTileByIndex(currentIndex);
    if (tile.type !== 'property') return;
    const tileOwner = propsState.byTileId[tile.id]?.ownerId as string | undefined;
    if (!tileOwner) return;
    dispatch(sellHouse({ tileId: tile.id }));
    dispatch(appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'MONEY_ADJUST', actorPlayerId: tileOwner, payload: { tileId: tile.id, message: 'Sell' }, createdAt: new Date().toISOString() }));
  };

  const currentTileName = getTileByIndex(currentIndex)?.name ?? '—';

  const getToggleBtnClass = (selected: boolean): string =>
    `${selected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-neutral-800 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700'} inline-flex items-center justify-center rounded-md border px-2 py-1 text-sm font-medium shadow-sm`;

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const rollDiceIconCls = 'inline-block align-middle size-[1.1em] shrink-0 text-fg';
  const rollDiceNegCls = 'inline-block align-middle size-[1.1em] shrink-0 text-red-600 dark:text-red-400';
  const rollDiceIcons = [BsDice1Fill, BsDice2Fill, BsDice3Fill, BsDice4Fill, BsDice5Fill, BsDice6Fill] as const;
  const rollFace = (n: number, cls: string): JSX.Element => {
    const Icon = rollDiceIcons[n - 1];
    return Icon ? <Icon className={cls} aria-hidden /> : <span className={cls}>{n}</span>;
  };
  const rollSpecialThird = (sp: Exclude<SpecialDieFace, 'Bus'>): React.ReactNode => {
    if (sp === '-1') return rollFace(1, rollDiceNegCls);
    if (sp === '-2') return rollFace(2, rollDiceNegCls);
    if (typeof sp === 'number') return rollFace(sp, rollDiceIconCls);
    if (sp === '+1') {
      return (
        <>
          <span aria-hidden>+</span>
          {rollFace(1, rollDiceIconCls)}
        </>
      );
    }
    return String(sp);
  };
  const rollSummaryRow = (a: number, b: number, sp: SpecialDieFace | null, total: number): JSX.Element => (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-0.5 gap-y-0.5 text-center">
      {rollFace(a, rollDiceIconCls)}
      {rollFace(b, rollDiceIconCls)}
      {sp != null && (
        <>
          {sp === 'Bus' ? (
            <FaBusAlt className="inline-block align-middle mb-0.5 h-[14px] w-[14px] shrink-0 text-fg" aria-hidden />
          ) : (
            rollSpecialThird(sp)
          )}
        </>
      )}
      <span aria-hidden>{` = ${total}`}</span>
    </span>
  );

  const rollSummary: React.ReactNode =
    busTeleportTo != null
      ? `Bus → ${abbreviateAvenueInTileName(getTileByIndex(busTeleportTo).name)}`
      : tripleTeleportTo != null
        ? (
            <span
              className="inline text-center"
              title={`Teleport → ${getTileByIndex(tripleTeleportTo).name}${isTripleOnes ? ' +1k' : ''}`}
            >
              <GiTeleport className="inline-block align-middle mr-1 size-[1.1em] shrink-0" aria-hidden />
              {abbreviateAvenueInTileName(getTileByIndex(tripleTeleportTo).name)}
            </span>
          )
        : hasRoll && d6A != null && d6B != null
          ? rollSummaryRow(d6A, d6B, special, rollTotal)
            : d6A !== null && d6B === null
            ? (
                <span className="inline-flex flex-wrap items-center justify-center gap-x-0.5 text-center">
                  {rollFace(d6A, rollDiceIconCls)}
                  <span aria-hidden>…</span>
                </span>
              )
            : d6A === null && d6B !== null
              ? (
                  <span className="inline-flex flex-wrap items-center justify-center gap-x-0.5 text-center">
                    <span aria-hidden>…</span>
                    {rollFace(d6B, rollDiceIconCls)}
                  </span>
                )
              : highestStep === 0
                ? ''
                : '...';

  const canGoNext = (step: 0 | 1 | 2): boolean => {
    if (step === 0) return true;
    if (step === 1) {
      const pid = players[turnIndex]?.id || players[0]?.id;
      const pl = players.find((x) => x.id === pid);
      // In jail: allow proceeding with just D6 dice when "Try Doubles" is chosen
      if (pl?.inJail && jailChoice === 'roll') {
        return d6A !== null && d6B !== null;
      }
      // Triples require choosing a teleport destination before continuing.
      if (isTriple) {
        return tripleTeleportTo != null;
      }
      return (busTeleportTo != null) || (tripleTeleportTo != null) || (d6A !== null && d6B !== null && special !== null);
    }
    return false;
  };

  const goNext = (): void => {
    if (activeStep === 0) {
      // If in jail, require a choice first
      const pid = players[turnIndex]?.id || players[0]?.id;
      const pl = players.find((x) => x.id === pid);
      if (pl?.inJail) {
        if (!jailChoice) return;
        if (jailChoice === 'pay') {
          if ((pl.money ?? 0) < 50) return;
          dispatch(adjustPlayerMoney({ id: pid!, delta: -50 }));
          (dispatch as any)({ type: 'players/setInJail', payload: { id: pid, value: false } });
          (dispatch as any)({ type: 'players/setJailAttempts', payload: { id: pid, attempts: 0 } });
        } else if (jailChoice === 'gojf') {
          if ((pl.gojfChance ?? 0) > 0) (dispatch as any)({ type: 'players/consumeGetOutOfJail', payload: { id: pid, deck: 'chance', count: 1 } });
          else if ((pl.gojfCommunity ?? 0) > 0) (dispatch as any)({ type: 'players/consumeGetOutOfJail', payload: { id: pid, deck: 'community', count: 1 } });
          else return;
          (dispatch as any)({ type: 'players/setInJail', payload: { id: pid, value: false } });
          (dispatch as any)({ type: 'players/setJailAttempts', payload: { id: pid, attempts: 0 } });
        }
      }
      setActiveStep(1);
      setHighestStep(1);
    } else if (activeStep === 1 && canGoNext(1)) {
      // Confirm roll or bus teleport and prepare post actions
      setRollConfirmed(true);
      const pid = players[turnIndex]?.id || players[0]?.id;
      const fromIndex = players.find((p) => p.id === pid)?.positionIndex ?? currentIndex;
      // Jail attempt resolution
      const pl = players.find((x) => x.id === pid);
      if (pl?.inJail && jailChoice === 'roll') {
        const isDbl = (d6A !== null && d6B !== null && d6A === d6B);
        if (isDbl) {
          // Exit jail and move by this roll immediately
          (dispatch as any)({ type: 'players/setInJail', payload: { id: pid, value: false } });
          (dispatch as any)({ type: 'players/setJailAttempts', payload: { id: pid, attempts: 0 } });
          const toIndex = (fromIndex + ((d6A as number) + (d6B as number))) % BOARD_TILES.length;
          setPredictedTo(toIndex);
        } else {
          const nextAtt = (pl.jailAttempts ?? 0) + 1;
          if (nextAtt >= 3) {
            // Auto pay $50 and move by this third roll
            dispatch(adjustPlayerMoney({ id: pid!, delta: -50 }));
            (dispatch as any)({ type: 'players/setInJail', payload: { id: pid, value: false } });
            (dispatch as any)({ type: 'players/setJailAttempts', payload: { id: pid, attempts: 0 } });
            const toIndex = (fromIndex + ((d6A as number) + (d6B as number))) % BOARD_TILES.length;
            setPredictedTo(toIndex);
          } else {
            // Stay in jail; record attempt and end turn without moving
            (dispatch as any)({ type: 'players/setJailAttempts', payload: { id: pid, attempts: nextAtt } });
            setPredictedTo(fromIndex);
            // Advance turn now; skip post-actions for failed attempt
            dispatch(advanceTurn({ playerCount: players.length }));
            return;
          }
        }
      }
      // Always compute landing tile from dice (or teleport). When Bus is rolled, player still moves by dice
      // and must complete tile action (tax, rent, etc.) AND draw bus.
      const teleportTo = busTeleportTo ?? tripleTeleportTo;
      const toIndex = teleportTo != null ? teleportTo : ((fromIndex + ((d6A as number) + (d6B as number) + specialNumeric)) % BOARD_TILES.length);
      const t = getTileByIndex(toIndex);
      let suggested: string = 'None';
      if (t.type === 'property' || t.type === 'railroad' || t.type === 'utility') {
        const owner = propsState.byTileId[t.id]?.ownerId as string | null;
        if (owner && owner !== pid) suggested = 'Pay Rent';
        else if (!owner) suggested = 'Buy Property';
      } else if (t.type === 'tax') {
        suggested = 'Pay Tax';
      } else if (t.type === 'chance' || t.type === 'community') {
        suggested = 'Draw Card';
      }
      setPredictedTo(toIndex);
      setPostAction(suggested);
      setBuySelected(false);
      setAuctionCompleted(false);
      setAuctionItSelected(false);
      setStagedAuction(null);
      setActiveStep(2);
      setHighestStep(2);
      // Removed auto-open for Bus; overlay opens only when user taps Draw Bus
    }
  };

  // helper for nav button styles
  const nextBtnDisabled = (): boolean => {
    if (activeStep >= 2) return true;
    if (activeStep === 1) {
      const pid = players[turnIndex]?.id || players[0]?.id;
      const pl = players.find((x) => x.id === pid);
      if (pl?.inJail && jailChoice === 'roll') {
        return !(d6A !== null && d6B !== null);
      }
      if (isTriple) {
        return tripleTeleportTo == null;
      }
      // Only require a valid roll or teleport selection during Roll step
      const hasRollOrTeleport = (busTeleportTo != null) || (tripleTeleportTo != null) || (d6A !== null && d6B !== null && special !== null);
      return !hasRollOrTeleport;
    }
    return false;
  };
  // Require purchase or auction resolution when applicable
  const purchaseOrAuctionRequiredButNotResolved = (): boolean => {
    const idx = predictedTo ?? currentIndex;
    const t = getTileByIndex(idx);
    const pid = players[turnIndex]?.id || players[0]?.id;
    if (!pid) return false;
    if (t.type === 'auction') {
      return !auctionCompleted;
    }
    const isBuyable = (t.type === 'property' || t.type === 'railroad' || t.type === 'utility');
    if (!isBuyable) return false;
    const owner = propsState.byTileId[t.id]?.ownerId as string | null;
    const unowned = !owner;
    if (!unowned) return false;
    const fromPos = players.find((x) => x.id === pid)?.positionIndex ?? 0;
    const willPassGoThisMove = (() => {
      if (predictedTo == null) return false;
      const fromW = wrapIndex(fromPos);
      const toW = wrapIndex(predictedTo);
      const isTeleportPreview = (busTeleportTo != null) || (tripleTeleportTo != null);
      if (isTeleportPreview && toW === fromW) return true; // teleport-to-same counts as lap
      return passedGo(fromW, toW);
    })();
    const pl = players.find((x) => x.id === pid);
    const firstRoundLocked = !(pl?.hasPassedGo || willPassGoThisMove);
    if (firstRoundLocked) return false;
    // require either Buy toggle OR a staged/confirmed auction-it for this tile
    const auctionResolved = stagedAuction && stagedAuction.tileId === t.id;
    return !(buySelected || auctionResolved);
  };

  // Map board tile to buy button style with good contrast
  function getBuyStyle(tile: ReturnType<typeof getTileByIndex>): { bgClass: string; textClass: string; borderClass: string; textStrongClass: string } {
    if (tile.type === 'utility') return { bgClass: 'bg-zinc-200', textClass: 'text-neutral-900', borderClass: 'border-zinc-300', textStrongClass: 'text-neutral-900' };
    if (tile.type === 'property') {
      switch (tile.group) {
        case 'brown':
          return { bgClass: 'bg-amber-800', textClass: 'text-white', borderClass: 'border-amber-800', textStrongClass: 'text-amber-800' };
        case 'lightBlue':
          return { bgClass: 'bg-sky-300', textClass: 'text-neutral-900', borderClass: 'border-sky-300', textStrongClass: 'text-sky-400' };
        case 'pink':
          return { bgClass: 'bg-pink-400', textClass: 'text-neutral-900', borderClass: 'border-pink-400', textStrongClass: 'text-pink-400' };
        case 'orange':
          return { bgClass: 'bg-orange-400', textClass: 'text-neutral-900', borderClass: 'border-orange-400', textStrongClass: 'text-orange-400' };
        case 'red':
          return { bgClass: 'bg-red-600', textClass: 'text-white', borderClass: 'border-red-600', textStrongClass: 'text-red-600' };
        case 'yellow':
          return { bgClass: 'bg-yellow-400', textClass: 'text-neutral-900', borderClass: 'border-yellow-400', textStrongClass: 'text-yellow-400' };
        case 'green':
          return { bgClass: 'bg-green-600', textClass: 'text-white', borderClass: 'border-green-600', textStrongClass: 'text-green-600' };
        case 'darkBlue':
          return { bgClass: 'bg-blue-900', textClass: 'text-white', borderClass: 'border-blue-900', textStrongClass: 'text-blue-900' };
        default:
          return { bgClass: 'bg-amber-600', textClass: 'text-white', borderClass: 'border-amber-600', textStrongClass: 'text-amber-600' };
      }
    }
    if (tile.type === 'railroad') return { bgClass: 'bg-stone-300', textClass: 'text-neutral-900', borderClass: 'border-stone-400', textStrongClass: 'text-stone-600' };
    return { bgClass: 'bg-amber-600', textClass: 'text-white', borderClass: 'border-amber-600', textStrongClass: 'text-amber-600' };
  }

  function getTileHeaderBg(tile: ReturnType<typeof getTileByIndex>): string {
    if (tile.type === 'property') {
      switch (tile.group) {
        case 'brown':
          return 'bg-amber-800';
        case 'lightBlue':
          return 'bg-sky-300';
        case 'pink':
          return 'bg-pink-400';
        case 'orange':
          return 'bg-orange-400';
        case 'red':
          return 'bg-red-600';
        case 'yellow':
          return 'bg-yellow-400';
        case 'green':
          return 'bg-green-600';
        case 'darkBlue':
          return 'bg-blue-900';
      }
    }
    if (tile.type === 'railroad') return 'bg-stone-300';
    if (tile.type === 'utility') return 'bg-zinc-200';
    return 'bg-neutral-200';
  }

  function getGroupBorderClass(group: ColorGroup): string {
    switch (group) {
      case 'brown':
        return 'border-amber-800';
      case 'lightBlue':
        return 'border-sky-300';
      case 'pink':
        return 'border-pink-400';
      case 'orange':
        return 'border-orange-400';
      case 'red':
        return 'border-red-600';
      case 'yellow':
        return 'border-yellow-400';
      case 'green':
        return 'border-green-600';
      case 'darkBlue':
        return 'border-blue-900';
      default:
        return 'border-neutral-400';
    }
  }

  function renderImprovementIcons(imp: number): React.ReactNode {
    if (imp <= 0) return null;
    if (imp >= 6) {
      return <img src="/icons/skyscraper.webp" alt="Skyscraper" className="h-4 w-4 shrink-0 inline-block align-middle" loading="lazy" decoding="async" />;
    }
    if (imp === 5) {
      return <img src="/icons/hotel.webp" alt="Hotel" className="h-4 w-4 shrink-0 inline-block align-middle" loading="lazy" decoding="async" />;
    }
    return Array.from({ length: imp }).map((_, idx) => (
      <img key={idx} src="/icons/house.webp" alt="House" className="h-4 w-4 shrink-0 inline-block align-middle" loading="lazy" decoding="async" />
    ));
  }

  function abbreviateTooltipPropertyName(name: string): string {
    return name.replace(/\bAvenue\b/g, 'Ave');
  }

  function groupTooltipForPlayer(playerId: string, group: ColorGroup): React.ReactNode {
    const tiles = BOARD_TILES.filter((t) => t.type === 'property' && t.group === group);
    const rows: React.ReactNode[] = [];
    const state = store.getState();
    for (const t of tiles) {
      const ps = propsState.byTileId[t.id];
      const owned = ps?.ownerId === playerId;
      if (!owned) continue;
      const imp = ps?.improvements ?? 0;
      const rent = computeRent(state, t.id, 0);
      rows.push(
        <div key={t.id} className="flex items-center gap-1 whitespace-nowrap">
          <span>{abbreviateTooltipPropertyName(t.name)}</span>
          {imp > 0 && (
            <>
              <span className="inline-flex items-center gap-0.5">{renderImprovementIcons(imp)}</span>
            </>
          )}
          {rent > 0 && <span> Rent ${rent}</span>}
        </div>,
      );
    }
    if (rows.length === 0) return '';
    return <div className="space-y-0.5">{rows}</div>;
  }

  function railroadTooltipForPlayer(playerId: string): string {
    const tiles = BOARD_TILES.filter((t) => t.type === 'railroad');
    const lines: string[] = [];
    const state = store.getState();
    for (const t of tiles) {
      const ps = propsState.byTileId[t.id];
      const owned = ps?.ownerId === playerId;
      if (!owned) continue;
      const depot = ps?.depotInstalled === true;
      const rent = computeRent(state, t.id, 0);
      const rentText = rent > 0 ? ` — Rent $${rent}` : '';
      lines.push(`${t.name}${depot ? ' — Depot' : ''}${rentText}`);
    }
    if (lines.length === 0) return '';
    return lines.join('\n');
  }

  function utilitiesTooltipForPlayer(playerId: string): string {
    const tiles = BOARD_TILES.filter((t) => t.type === 'utility');
    const lines: string[] = [];
    const state = store.getState();
    const diceTotalForExample = (d6A ?? 0) + (d6B ?? 0) + specialNumeric;
    for (const t of tiles) {
      const ps = propsState.byTileId[t.id];
      const owned = ps?.ownerId === playerId;
      if (!owned) continue;
      const u = t.utility;
      const mult1 = u?.rentMultiplier1 ?? 0;
      const mult2 = u?.rentMultiplier2 ?? 0;
      const mult3 = (u as any)?.rentMultiplier3 ?? 0;
      const formula = mult3 ? ` — Rent = roll × ${mult1}/${mult2}/${mult3}` : ` — Rent = roll × ${mult1}/${mult2}`;
      const exampleRent = diceTotalForExample > 0 ? computeRent(state, t.id, diceTotalForExample) : 0;
      const example = exampleRent > 0 ? ` (e.g. ${diceTotalForExample} → $${exampleRent})` : '';
      lines.push(`${t.name}${formula}${example}`);
    }
    if (lines.length === 0) return '';
    return lines.join('\n');
  }

  function tradePassBadgesForPlayer(playerId: string): Array<{ key: string; count: number; borderClassName: string; tooltip: string }> {
    const entries = tradePassEntries.filter((e) => e.holderPlayerId === playerId && e.remaining > 0);
    const grouped = new Map<
      string,
      {
        scopeType: TradePassScopeType;
        scopeKey: string;
        count: number;
        lines: string[];
      }
    >();
    for (const e of entries) {
      const key = `${e.scopeType}:${e.scopeKey}`;
      const issuer = players.find((p) => p.id === e.issuerPlayerId)?.nickname ?? e.issuerPlayerId;
      const scopeLabel = e.scopeType === 'color' ? `${e.scopeKey}` : e.scopeType === 'railroad' ? 'Railroad' : 'Utility';
      const line = `${scopeLabel} from ${issuer} — ${e.remaining} left`;
      const cur = grouped.get(key);
      if (cur) {
        cur.count += e.remaining;
        cur.lines.push(line);
      } else {
        grouped.set(key, {
          scopeType: e.scopeType,
          scopeKey: e.scopeKey,
          count: e.remaining,
          lines: [line],
        });
      }
    }
    const borderForScope = (scopeType: TradePassScopeType, scopeKey: string): string => {
      if (scopeType === 'color') return getGroupBorderClass(scopeKey as ColorGroup);
      if (scopeType === 'railroad') return 'border-white';
      return 'border-cyan-400';
    };
    return Array.from(grouped.entries()).map(([key, g]) => ({
      key,
      count: g.count,
      borderClassName: borderForScope(g.scopeType, g.scopeKey),
      tooltip: g.lines.join('\n'),
    }));
  }

  const tileFooterIcon = (tileId: string): JSX.Element | null => {
    const t = BOARD_TILES.find((x) => x.id === tileId)!;
    if (t.type === 'property') {
      const imp = propsState.byTileId[tileId]?.improvements ?? 0;
      if (imp === 0) return null;
      if (imp >= 5) return <span title="Hotel">🏨</span>;
      return (
        <span title={`${imp} house${imp > 1 ? 's' : ''}`}> {'🏠'.repeat(Math.min(4, imp))}</span>
      );
    }
    if (t.type === 'railroad') {
      const owned = propsState.byTileId[tileId]?.ownerId;
      return owned ? <span title="Depot">🚉</span> : null;
    }
    if (t.type === 'utility') {
      const owned = propsState.byTileId[tileId]?.ownerId;
      return owned ? <span title="Utility">⚡</span> : null;
    }
    return null;
  };

  const preDesc =
    preActions.length > 0
      ? abbreviateAvenueInTileName(preActions.join(', '))
      : highestStep === 0
        ? ''
        : 'None';
  const postDescRaw =
    highestStep < 2 ? '' : postAction === 'Buy Property' ? 'Buy' : postAction;
  const postDesc = postDescRaw === '' ? '' : abbreviateAvenueInTileName(postDescRaw);
  const stepItems = [
    { id: 0 as const, title: 'Pre', desc: preDesc },
    { id: 1 as const, title: 'Roll', desc: rollSummary },
    { id: 2 as const, title: 'Post', desc: postDesc },
  ];

  const getActiveRentContext = React.useCallback(() => {
    const payerId = players[turnIndex]?.id || players[0]?.id;
    if (!payerId) return null;
    const idx = predictedTo ?? currentIndex;
    const t = getTileByIndex(idx);
    if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) return null;
    const ps = propsState.byTileId[t.id];
    const payeeId = ps?.ownerId as string | null;
    const mortgaged = ps?.mortgaged === true;
    if (!payeeId || payeeId === payerId || mortgaged) return null;
    const diceTotal = (d6A ?? 0) + (d6B ?? 0) + specialNumeric;
    const state = (window as any).__store__?.getState?.() as RootState | undefined;
    const rentDue = computeRent({ ...(state as any), properties: propsState } as RootState, t.id, diceTotal);
    if (rentDue <= 0) return null;
    const payerCash = players.find((p) => p.id === payerId)?.money ?? 0;
    const shortfall = Math.max(0, rentDue - payerCash);
    const liquidationPotential = liquidationPotentialByPlayerId[payerId] ?? 0;
    const canLiquidate = shortfall > 0 && liquidationPotential >= shortfall;
    const isInsolvent = shortfall > 0 && liquidationPotential < shortfall;
    return {
      payerId,
      payeeId,
      tileId: t.id,
      rentDue,
      shortfall,
      liquidationPotential,
      canLiquidate,
      isInsolvent,
    };
  }, [players, turnIndex, predictedTo, currentIndex, propsState, d6A, d6B, specialNumeric, liquidationPotentialByPlayerId]);

  const usablePassForPost = (() => {
    const idx = predictedTo ?? currentIndex;
    const t = getTileByIndex(idx);
    if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) return null;
    const ps = propsState.byTileId[t.id];
    const owner = ps?.ownerId as string | null;
    const mortgaged = ps?.mortgaged === true;
    const pid = players[turnIndex]?.id || players[0]?.id;
    if (!owner || owner === pid || mortgaged || !pid) return null;
    return findUsablePass(pid, owner, t.id);
  })();

  const rentRequiredButNotSelected = (): boolean => {
    const rentCtx = getActiveRentContext();
    if (!rentCtx) return false;
    if (rentCtx.isInsolvent) return false;
    const pendingForThisRent = !!(
      rentCtx.payerId &&
      rentCtx.payeeId &&
      pendingLiquidation &&
      makeRentSettlementKey(pendingLiquidation.payerId, pendingLiquidation.tileId, pendingLiquidation.payeeId) === makeRentSettlementKey(rentCtx.payerId, rentCtx.tileId, rentCtx.payeeId)
    );
    if (pendingForThisRent) return false;
    if (resolvedRentKey === makeRentSettlementKey(rentCtx.payerId, rentCtx.tileId, rentCtx.payeeId)) return false;
    return !(rentSelected || (useRentPassSelected && !!usablePassForPost));
  };

  const taxRequiredButNotSelected = (): boolean => {
    const idx = predictedTo ?? currentIndex;
    const t = getTileByIndex(idx);
    if (t.type !== 'tax') return false;
    return !taxSelected;
  };

  const cardDrawRequiredButNotSelected = (): boolean => {
    const idx = predictedTo ?? currentIndex;
    const t = getTileByIndex(idx);
    const chanceRequired = t.type === 'chance';
    const communityRequired = t.type === 'community';
    if (chanceRequired && !stagedChanceCardId) return true;
    if (communityRequired && !stagedCommunityCardId) return true;
    if (requiresBusCard && !diceBusSelectedCardId) return true;
    if (t.type === 'busStop' && !tileBusSelectedCardId) return true;
    return false;
  };

  const doQuickBuy = (pid: string): void => {
    const idx = predictedTo ?? currentIndex;
    const t = getTileByIndex(idx);
    if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) return;
    const ps = propsState.byTileId[t.id];
    if (ps?.ownerId) return;
    dispatch(assignOwner({ tileId: t.id, ownerId: pid }));
    dispatch(
      appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'PURCHASE', actorPlayerId: pid, payload: { tileId: t.id, ownerId: pid, message: `Purchased ${t.name}` }, createdAt: new Date().toISOString() })
    );
  };

  const doQuickPayRent = (pid: string): void => {
    const idx = predictedTo ?? currentIndex;
    const t = getTileByIndex(idx);
    if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) return;
    const ownerIdForTile = propsState.byTileId[t.id]?.ownerId as string | null;
    const mortgaged = propsState.byTileId[t.id]?.mortgaged === true;
    if (!ownerIdForTile || ownerIdForTile === pid || mortgaged) return;
    const diceTotal = (d6A ?? 0) + (d6B ?? 0) + specialNumeric;
    const state = (window as any).__store__?.getState?.() as RootState | undefined;
    const rent = computeRent({ ...(state as any), properties: propsState } as RootState, t.id, diceTotal);
    if (rent <= 0) return;
    const payerMoney = players.find((p) => p.id === pid)?.money ?? 0;
    if (payerMoney < rent) return;
    dispatch(adjustPlayerMoney({ id: pid, delta: -rent }));
    dispatch(adjustPlayerMoney({ id: ownerIdForTile, delta: +rent }));
    dispatch(
      appendEvent({
        id: crypto.randomUUID(),
        gameId: 'local',
        type: 'RENT',
        actorPlayerId: pid,
        payload: { tileId: t.id, from: pid, to: ownerIdForTile, amount: rent, message: `Rent ${rent}` },
        moneyDelta: -rent,
        createdAt: new Date().toISOString(),
      })
    );
  };

  const doQuickPayTax = (pid: string): void => {
    const idx = predictedTo ?? currentIndex;
    const t = getTileByIndex(idx);
    if (t.type !== 'tax' || !t.taxAmount) return;
    dispatch(adjustPlayerMoney({ id: pid, delta: -t.taxAmount }));
    dispatch(
      appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'FEE', actorPlayerId: pid, payload: { tileId: t.id, from: pid, amount: t.taxAmount, message: `Tax ${t.taxAmount}` }, moneyDelta: -t.taxAmount, createdAt: new Date().toISOString() })
    );
    dispatch(addToFreeParking(t.taxAmount));
  };

  // //#render
  return (
    <div data-cmp="o/PlayConsole" className="w-full max-w-5xl space-y-6">
      <AnimatePresence>
        {liquidationBanner && (
          <motion.div
            key="liquidation-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed right-4 top-4 z-[70] rounded-md border border-emerald-500 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 shadow-lg dark:bg-emerald-900/60 dark:text-emerald-200"
            role="status"
            aria-live="polite"
          >
            {liquidationBanner}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <h1 className="text-2xl font-semibold flex flex-wrap items-center gap-3 self-start">
          <button type="button" onClick={() => setBoardOverlayOpen(true)} className="hover:underline">
            GM Console
          </button>
          {racePot.active && (
            <RacePotBadge amount={racePot.amount} participantIds={racePot.participants} players={players} />
          )}
        </h1>
        {/* HUD summary — centered when stacked; end-aligned on wide screens */}
        <div className="flex w-full flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 text-sm lg:w-auto lg:justify-end">
          <HudBar
            housesRemaining={propsState.housesRemaining}
            hotelsRemaining={propsState.hotelsRemaining}
            skyscrapersRemaining={propsState.skyscrapersRemaining}
            depotsLeft={depotsLeft}
            freeParkingPot={freeParkingPot}
            bankUnownedLots={bankUnownedLots}
            chanceLeft={chanceLeft}
            communityLeft={communityLeft}
            busLeft={busLeft}
          />
          <button
            type="button"
            aria-label="Logs"
            onClick={() => setEventLogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 px-2 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 sm:px-3"
          >
            <MdReceiptLong className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Logs</span>
          </button>
          <SettingsGear
            className="shrink-0"
            modalContent={(
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => setGmToolsOpen((o) => !o)}
                  className="flex items-center justify-between w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <span className="text-sm font-semibold">GM Tools</span>
                  <span className="text-xs text-neutral-500">Manual actions and corrections</span>
                  <span className="text-neutral-400">{gmToolsOpen ? '▼' : '▶'}</span>
                </button>
                {gmToolsOpen && (
                  <div className="mt-3 space-y-4">
                    {/* Context */}
                    <div data-qa="gm-context" className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Context</h3>
                        {(() => {
                          const p = players[turnIndex] ?? players[0];
                          if (!p) return null;
                          const emoji = AVATARS.find((a) => a.key === p.avatarKey)?.emoji ?? '🙂';
                          return (
                            <div className="flex items-center gap-2" style={{ ['--player-color' as string]: p.color } as React.CSSProperties}>
                              <AvatarToken emoji={emoji} borderColorClass="border-[color:var(--player-color)]" ring ringColorClass="ring-[color:var(--player-color)]" size={24} />
                              <span className="text-sm font-medium">{p.nickname}</span>
                            </div>
                          );
                        })()}
                      </div>
                      <label className="block text-sm font-medium mb-1">Current Tile (for manual actions)</label>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Actions below apply to this tile. Use 0-39 for board index.</p>
                      <input data-qa="current-index" type="number" min={0} max={39} value={currentIndex} onChange={(e) => setCurrentIndex(parseInt(e.target.value || '0', 10))} className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      <p className="mt-1 text-xs opacity-80">{currentTileName} (index {currentIndex})</p>
                    </div>

                    {/* Movement */}
                    <div data-qa="gm-movement" className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
                      <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">Movement</h3>
                      <div className="flex flex-wrap gap-2">
                        <button data-qa="btn-apply-move" onClick={() => onApplyMove()} disabled={!hasRoll} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow hover:enabled:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" title={hasRoll ? 'Move by dice' : 'Select D6 A and D6 B first'}>Apply Move (dice)</button>
                        <button data-qa="btn-move-to-tile" onClick={() => onApplyMove(undefined, currentIndex)} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-emerald-600 text-white font-semibold text-sm shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" title="Move current player to Current Tile above">Move to Current Tile</button>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-2">Use dice from Roll step, or move directly to Current Tile.</p>
                    </div>

                    {/* Money & Payments */}
                    <div data-qa="gm-money" className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
                      <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">Money & Payments</h3>
                      <div className="flex flex-wrap items-end gap-2 mb-3">
                        <div>
                          <label className="block text-[11px] text-neutral-500 mb-0.5">Player</label>
                          <select data-qa="money-player" value={moneyPlayerId} onChange={(e) => setMoneyPlayerId(e.target.value)} className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300">
                            <option value="">Select player</option>
                            {players.map((p) => (
                              <option value={p.id} key={p.id}>{p.nickname}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-500 mb-0.5">Amount (+/-)</label>
                          <input data-qa="money-delta" type="number" value={moneyDelta} onChange={(e) => setMoneyDelta(parseInt(e.target.value || '0', 10))} placeholder="+200 or -50" className="w-28 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </div>
                        <button data-qa="btn-apply-money" onClick={onAdjustMoney} className="rounded-md px-3 py-2 bg-slate-700 text-white font-semibold text-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400">Apply Money</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button data-qa="btn-pay-rent" onClick={onPayRent} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400">Pay Rent</button>
                        <button data-qa="btn-pay-tax" onClick={onPayTax} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-orange-600 text-white font-semibold text-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400">Pay Tax</button>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-2">Uses current tile + selected player</p>
                    </div>

                    {/* Property */}
                    <div data-qa="gm-property" className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
                      <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">Property (for current tile)</h3>
                      <div className="flex flex-wrap gap-2">
                        <button data-qa="btn-mortgage" onClick={() => onMortgageToggle(true)} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-zinc-600 text-white font-semibold text-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400">Mortgage</button>
                        <button data-qa="btn-unmortgage" onClick={() => onMortgageToggle(false)} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-zinc-500 text-white font-semibold text-sm hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-300">Unmortgage</button>
                        <button data-qa="btn-build" onClick={onBuild} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-green-700 text-white font-semibold text-sm hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500">Build</button>
                        <button data-qa="btn-sell" onClick={onSell} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-yellow-700 text-white font-semibold text-sm hover:bg-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500">Sell</button>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-2">Owner inferred from tile</p>
                    </div>

                    {/* Draw Cards */}
                    <div data-qa="gm-cards" className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
                      <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">Draw Cards</h3>
                      <div className="flex flex-wrap gap-2">
                        <button data-qa="btn-draw-chance" onClick={() => onDrawCard('chance')} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400">Chance</button>
                        <button data-qa="btn-draw-community" onClick={() => onDrawCard('community')} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-fuchsia-600 text-white font-semibold text-sm hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-400">Community Chest</button>
                        {((special === 'Bus') || (predictedTo != null && getTileByIndex(predictedTo).type === 'busStop')) && (
                          <button data-qa="btn-draw-bus" onClick={() => onDrawCard('bus')} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-cyan-600 text-white font-semibold text-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400">Bus</button>
                        )}
                      </div>
                    </div>

                    {/* Game */}
                    <div data-qa="gm-game" className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
                      <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">Game</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">Start over from Setup and clear the saved game state on this device.</p>
                      <div className="flex items-center justify-end">
                        <button
                          data-qa="btn-new-game"
                          type="button"
                          onClick={() => setNewGameConfirmOpen(true)}
                          className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-rose-600 text-white font-semibold text-sm shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
                        >
                          New Game
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* Player turn cards */}
      <PlayerTurnCards
        players={turnCardPlayers}
        activePlayerIndex={turnIndex}
        getTileByIndex={getTileByIndex}
        propsByTileId={propsState.byTileId}
        railroadTooltipForPlayer={railroadTooltipForPlayer}
        utilitiesTooltipForPlayer={utilitiesTooltipForPlayer}
        groupTooltipForPlayer={groupTooltipForPlayer}
        getGroupBorderClass={getGroupBorderClass}
        tradePassBadgesForPlayer={tradePassBadgesForPlayer}
        renderActivePanel={(p) => (
          <>
            {/* Turn ribbon across the whole turn (show only when multi-roll is relevant) */}
            {((rollCount > 1) || (turnSegments.length > 1)) && (
              <TurnRibbon
                segments={turnSegments}
                currentDraft={{ roll: rollCount, d6A, d6B, special, busUsed: busTeleportTo != null, from: players[turnIndex]?.positionIndex ?? 0, to: predictedTo ?? (players[turnIndex]?.positionIndex ?? 0), tileName: (predictedTo != null ? getTileByIndex(predictedTo).name : getTileByIndex(players[turnIndex]?.positionIndex ?? 0).name) }}
              />
            )}
            {/* Jail attempts ribbon (only when in jail) */}
            {(() => {
              const pid = players[turnIndex]?.id || players[0]?.id;
              const pl = players.find((x) => x.id === pid);
              if (!pl?.inJail) return null;
              return <JailAttemptRibbon attemptsCompleted={pl.jailAttempts ?? 0} />;
            })()}

            {/* Stepper navigation */}
            <StepNavigator items={stepItems} activeStep={activeStep} highestStep={highestStep} onSelect={(s) => setActiveStep(s)} />

            {/* Build/sell & trade quick access (pre-roll only) */}
            {(() => {
              if (activeStep !== 0) return null;
              const pid = players[turnIndex]?.id || players[0]?.id;
              if (!pid) return null;
              const pl = players.find((x) => x.id === pid);
              const showManage =
                !pl?.inJail &&
                BOARD_TILES.some((t) => {
                  if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) return false;
                  return propsState.byTileId[t.id]?.ownerId === pid;
                });
              const showTrade = (players?.length ?? 0) >= 2;
              if (!showManage && !showTrade) return null;
              return (
                <div className="flex items-stretch gap-2 px-4 pb-4">
                  {showManage && (
                    <SectionCard fillHeight className="min-w-0 flex-1 p-0 overflow-hidden" title="Build & Sell">
                      <div className="px-2 pt-2 pb-2">
                        <IconLabelButton
                          iconSrc="/icons/house.webp"
                          iconClassName="h-[30px] w-[30px] object-contain"
                          label="Manage"
                          className="w-full border border-sky-500 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30"
                          onClick={() => {
                            setBuildOverlayMode('manage');
                            setLiquidationContext(null);
                            setBuildOverlayOpen(true);
                          }}
                        />
                      </div>
                    </SectionCard>
                  )}
                  {showTrade && (
                    <SectionCard fillHeight className="min-w-0 flex-1 p-0 overflow-hidden" title="Trade with a players">
                      <div className="px-2 pt-2 pb-2">
                        <IconLabelButton
                          icon={<FaHandshake className="h-[30px] w-[30px]" aria-hidden />}
                          iconClassName="inline-flex items-center justify-center text-current"
                          label="Trade"
                          className="border flex w-full border-indigo-500 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          onClick={() => setTradeModalOpen(true)}
                        />
                      </div>
                    </SectionCard>
                  )}
                </div>
              );
            })()}

            <AnimatePresence mode="wait">
              {activeStep === 0 && (
                <motion.div key="pre" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="space-y-2">
                  {(() => {
                    // Jail choices when in jail
                    const pid = players[turnIndex]?.id || players[0]?.id;
                    const pl = players.find((x) => x.id === pid);
                    if (!pl?.inJail) return null;
                    const gojfTotal = (pl.gojfChance ?? 0) + (pl.gojfCommunity ?? 0);
                    return (
                      <div className="flex flex-wrap gap-2 p-4 pt-1">
                        <TogglePillButton label={<span>Pay $50</span>} active={jailChoice === 'pay'} onToggle={() => setJailChoice(jailChoice === 'pay' ? null : 'pay')} variant="rose" />
                        {gojfTotal > 0 && (
                          <TogglePillButton label={<span>Use GOJF ({gojfTotal})</span>} active={jailChoice === 'gojf'} onToggle={() => setJailChoice(jailChoice === 'gojf' ? null : 'gojf')} variant="blue" />
                        )}
                        <TogglePillButton label={<span>Try Doubles</span>} active={jailChoice === 'roll'} onToggle={() => setJailChoice(jailChoice === 'roll' ? null : 'roll')} variant="emerald" />
                      </div>
                    );
                  })()}

                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div key="roll" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="space-y-2">

                  {(() => {
                    const pid = players[turnIndex]?.id || players[0]?.id;
                    const pl = players.find((x) => x.id === pid);
                    const inJailRolling = pl?.inJail && jailChoice === 'roll';
                    const busChosen = busTeleportTo != null;
                    const diceChosen = inJailRolling ? (d6A !== null && d6B !== null) : (d6A !== null && d6B !== null && special !== null);

                    /** Roll step only: use bus instead of dice when tickets are available or teleport is staged (not in jail). */
                    const showBusTicketSection =
                      !pl?.inJail && (busTicketsAvailableThisTurn > 0 || busTeleportTo != null);

                    const onSelectD6A = (v: number) => {
                      if (busTeleportTo != null) cancelBusTeleportSelection();
                      setD6A(v);
                    };
                    const onSelectD6B = (v: number) => {
                      if (busTeleportTo != null) cancelBusTeleportSelection();
                      setD6B(v);
                    };
                    const onSelectSpecial = (v: unknown) => {
                      if (busTeleportTo != null) cancelBusTeleportSelection();
                      setSpecial(v as SpecialDieFace);
                    };

                    const rollBannerDoubles =
                      !isTriple && d6A !== null && d6B !== null && d6A === d6B;
                    const rollBannerCenterLabel = isTripleOnes ? '🐍🐍🐍' : isTriple ? 'Triples' : rollBannerDoubles ? 'Doubles' : '';
                    const rollBannerClass = isTripleOnes
                      ? 'bg-amber-300 text-neutral-900 dark:bg-amber-400 dark:text-neutral-950'
                      : isTriple
                        ? 'bg-indigo-600 text-white'
                        : rollBannerDoubles
                          ? 'bg-emerald-600 text-white'
                          : 'bg-surface-1 text-subtle';

                    return (
                      <div data-ql="roll-container" className="px-4 pb-2">
                        <SectionCard
                          className={busChosen ? 'opacity-50 pointer-events-none' : ''}
                          header={
                            <div
                              className={`rounded-t-lg grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 text-sm font-semibold uppercase tracking-wide ${rollBannerClass}`}
                              aria-label={
                                rollBannerCenterLabel
                                  ? `Roll: ${rollBannerCenterLabel === '🐍🐍🐍' ? 'triple ones' : rollBannerCenterLabel}`
                                  : 'Roll'
                              }
                            >
                              <span className="justify-self-start">Roll</span>
                              <span className="justify-self-center text-center text-xs font-bold tracking-wide sm:text-sm">
                                {rollBannerCenterLabel}
                              </span>
                              <span className="justify-self-end" aria-hidden />
                            </div>
                          }
                        >
                          <div className="mt-2 px-3 pb-3">
                            {/* Render D6 selector; hide Special row if in-jail trying doubles */}
                            <DiceSelector
                              d6A={d6A}
                              d6B={d6B}
                              special={inJailRolling ? null : (special as any)}
                              onSelectA={onSelectD6A}
                              onSelectB={onSelectD6B}
                              onSelectSpecial={onSelectSpecial as any}
                              showSpecial={!inJailRolling}
                            />
                            {isTriple && (
                              tripleTeleportTo != null ? (
                                <button
                                  type="button"
                                  aria-label="Clear teleport selection"
                                  className={`mt-3 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-1 rounded-full border px-3 py-2 text-sm ${
                                    isTripleOnes
                                      ? 'border-amber-500 text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                                      : 'border-indigo-500 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                                  }`}
                                  onClick={() => {
                                    setTripleTeleportTo(null);
                                    setPredictedTo(null);
                                  }}
                                >
                                  <span aria-hidden className="min-w-0" />
                                  <span className="flex min-w-0 items-center justify-center gap-2">
                                    <GiTeleport className="shrink-0 text-lg" aria-hidden />
                                    <span className="text-center">
                                      to {abbreviateAvenueInTileName(getTileByIndex(tripleTeleportTo).name)}
                                      {isTripleOnes ? ' +1k' : ''}
                                    </span>
                                  </span>
                                  <span className="flex justify-end text-current" aria-hidden>
                                    <IoClose className="h-5 w-5 shrink-0 opacity-90" />
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busTeleportTo != null}
                                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-md px-3 py-1.5 text-base font-bold border disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isTripleOnes
                                      ? 'border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                                      : 'border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                                  }`}
                                  onClick={() => {
                                    setBusTeleportTo(null);
                                    setCenterOverlay({ type: 'tripleTeleport' });
                                  }}
                                >
                                  <GiTeleport className="shrink-0 text-2xl" aria-hidden />
                                  Teleport
                                </button>
                              )
                            )}
                          </div>

                        </SectionCard>

                        {showBusTicketSection && (
                          <SectionCard
                            className={`mt-3 p-0 overflow-hidden ${diceChosen ? 'opacity-50 pointer-events-none' : ''}`}
                            title="Ticket"
                            status={busTeleportTo != null ? 'Ticket Used' : undefined}
                            headerTrailing={
                              busTeleportTo != null ? (
                                <DrawnUndoButton
                                  aria-label="Undo bus destination; return ticket and show Use Ticket"
                                  onClick={cancelBusTeleportSelection}
                                />
                              ) : undefined
                            }
                          >
                            <div className="p-3 pt-1">
                              {busTeleportTo != null ? (
                                <p className="text-sm text-fg flex flex-wrap items-center gap-1.5">
                                  <FaBusAlt className="h-4 w-4 shrink-0 text-fg" aria-hidden />
                                  <span className="text-muted">to</span>
                                  <span className="font-medium text-fg">
                                    {abbreviateAvenueInTileName(getTileByIndex(busTeleportTo).name)}
                                  </span>
                                </p>
                              ) : (
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold border border-game-bus text-game-bus hover:text-game-bus-muted hover:border-game-bus-muted hover:bg-violet-50 dark:hover:bg-violet-950/30"
                                  onClick={() => {
                                    setD6A(null);
                                    setD6B(null);
                                    setSpecial(null);
                                    setCenterOverlay({ type: 'busTeleport' });
                                  }}
                                >
                                  <FaBusAlt className="h-4 w-4 shrink-0" aria-hidden />
                                  Use Ticket
                                </button>
                              )}
                            </div>
                          </SectionCard>
                        )}
                      </div>
                    );
                  })()}
                  {/* Draw Bus moved to Post-actions */}

                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div key="post" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="space-y-2 p-4 pt-1">
                  {(() => {
                    const pid = players[turnIndex]?.id || players[0]?.id;
                    const t = getTileByIndex(predictedTo ?? currentIndex);
                    const ps = propsState.byTileId[t.id];
                    const owner = ps?.ownerId as string | null;
                    const mortgaged = ps?.mortgaged === true;

                    const isBuyable = (t.type === 'property' || t.type === 'railroad' || t.type === 'utility');
                    const isUnownedBuyable = isBuyable && !owner;
                    const isAuctionTile = t.type === 'auction';
                    const chanceVisible = t.type === 'chance';
                    const communityVisible = t.type === 'community';

                    const maybeRentInfo = (): { ownerId: string; ownerName: string; ownerEmoji: string; ownerColor: string; rentAmount: number; propertyName: string; improvements: number } | null => {
                      if (!pid || !isBuyable || !owner || owner === pid || mortgaged) return null;
                      const ownerPlayer = players.find((pl) => pl.id === owner);
                      const diceTotal = (d6A ?? 0) + (d6B ?? 0) + specialNumeric;
                      const state = (window as any).__store__?.getState?.() as RootState | undefined;
                      const rentAmount = computeRent({ ...(state as any), properties: propsState } as RootState, t.id, diceTotal);
                      const imp = propsState.byTileId[t.id]?.improvements ?? 0;
                      const ownerEmoji = AVATARS.find((a) => a.key === ownerPlayer?.avatarKey)?.emoji ?? '🙂';
                      return {
                        ownerId: owner,
                        ownerName: ownerPlayer?.nickname ?? 'owner',
                        ownerEmoji,
                        ownerColor: ownerPlayer?.color ?? '#71717a',
                        rentAmount,
                        propertyName: t.name,
                        improvements: imp,
                      };
                    };
                    const maybeTaxLabel = (): string | null => (t.type === 'tax' ? `Pay Tax $${t.taxAmount}` : null);
                    const rentInfo = maybeRentInfo();
                    const rentLabel = rentInfo
                      ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span>Pay</span>
                          <span
                            aria-hidden
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                            style={{ backgroundColor: rentInfo.ownerColor }}
                          >
                            {rentInfo.ownerEmoji}
                          </span>
                          <span>{rentInfo.ownerName}</span>
                          <span>${rentInfo.rentAmount}</span>
                        </span>
                      )
                      : null;
                    const rentDueLabel = rentInfo
                      ? (
                        <span>
                          Rent due for <span className="font-semibold">{rentInfo.propertyName}</span>
                          {rentInfo.improvements > 0 && (
                            <>
                              {' '}with{' '}
                              <span className="inline-flex items-center gap-0.5 align-middle">
                                {rentInfo.improvements >= 6
                                  ? <span aria-label="skyscraper">🏙️</span>
                                  : rentInfo.improvements === 5
                                    ? <span aria-label="hotel">🏨</span>
                                    : Array.from({ length: rentInfo.improvements }).map((_, idx) => <span key={idx} aria-label="house">🏠</span>)}
                              </span>
                            </>
                          )}
                        </span>
                      )
                      : null;
                    const taxLabel = maybeTaxLabel();
                    const paymentsHeader = rentDueLabel ?? 'Payments';
                    const currentCash = players.find((x) => x.id === pid)?.money ?? 0;
                    const rentShortfall = rentInfo ? Math.max(0, rentInfo.rentAmount - currentCash) : 0;
                    const liquidationPotential = pid ? (liquidationPotentialByPlayerId[pid] ?? 0) : 0;
                    const pendingForThisRent = !!(
                      pid &&
                      rentInfo &&
                      pendingLiquidation &&
                      makeRentSettlementKey(pendingLiquidation.payerId, pendingLiquidation.tileId, pendingLiquidation.payeeId) === makeRentSettlementKey(pid, t.id, rentInfo.ownerId)
                    );
                    const isInsolventForRent = !!rentInfo && rentShortfall > 0 && liquidationPotential < rentShortfall;
                    const canLiquidateForRent = !!rentInfo && rentShortfall > 0 && liquidationPotential >= rentShortfall;
                    const hidePayRentToggle = canLiquidateForRent || pendingForThisRent || isInsolventForRent;

                    const diceBusNeedsCard = requiresBusCard;
                    const tileBusNeedsCard = t.type === 'busStop';
                    const postLandingLocked = requiresBusCard && !diceBusSelectedCardId;
                    const landingSectionClass = postLandingLocked ? 'opacity-50 pointer-events-none' : '';
                    const hasLandingPostCards =
                      isUnownedBuyable ||
                      !!(rentLabel || taxLabel) ||
                      chanceVisible ||
                      communityVisible ||
                      tileBusNeedsCard ||
                      isAuctionTile;

                    const pl = players.find((x) => x.id === pid);
                    const fromPos = players.find((x) => x.id === pid)?.positionIndex ?? 0;
                    const willPassGoThisMove = (() => {
                      if (predictedTo == null) return false;
                      const fromW = wrapIndex(fromPos);
                      const toW = wrapIndex(predictedTo);
                      const isTeleportPreview = (busTeleportTo != null) || (tripleTeleportTo != null);
                      if (isTeleportPreview && toW === fromW) return true;
                      return passedGo(fromW, toW);
                    })();
                    const firstRoundLocked = !(pl?.hasPassedGo || willPassGoThisMove);
                    const price = t.property?.purchasePrice ?? t.railroad?.purchasePrice ?? t.utility?.purchasePrice ?? 0;
                    const pendingJackpot = isTripleOnes && tripleTeleportTo != null ? 1000 : 0;
                    const effectivePreviewMoney = p.money + pendingJackpot;
                    const groupVariant = t.type === 'property' ? 'emerald' as const : 'slate' as const;

                    return (
                      <div className="space-y-3">
                        {diceBusNeedsCard && (
                          <SectionCard
                            className="p-0 overflow-hidden"
                            title={
                              <span className="inline-flex items-center gap-1.5">
                                <GiDiceFire className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                                <span>Bus</span>
                              </span>
                            }
                            status={diceBusSelectedCardId ? 'Ticket Drawn' : undefined}
                            headerTrailing={
                              diceBusSelectedCardId ? (
                                <DrawnUndoButton
                                  aria-label="Undo dice bus ticket; return card to deck"
                                  onClick={() => {
                                    if (!diceBusSelectedCardId) return;
                                    dispatch(putCardOnBottom({ deck: 'bus', cardId: diceBusSelectedCardId }));
                                    setDiceBusSelectedCardId(null);
                                    setStagedBusPicks((picks) => (picks.length === 0 ? picks : picks.slice(1)));
                                  }}
                                />
                              ) : undefined
                            }
                          >
                            <div className="p-3 pt-1">
                              {diceBusSelectedCardId ? (
                                <p className="text-sm font-medium text-fg">{getBusCardShortTitle(diceBusSelectedCardId)}</p>
                              ) : (
                                <PostActionsBar
                                  busVisible={true}
                                  busActive={false}
                                  onDrawBus={() => setOverlay({ deck: 'bus', busSlot: 'dice' })}
                                  busShake={shakeBus}
                                />
                              )}
                            </div>
                          </SectionCard>
                        )}

                        {diceBusNeedsCard && hasLandingPostCards && (
                          <div className="relative flex items-center gap-2 py-1" role="separator" aria-orientation="horizontal">
                            <div className="h-px flex-1 bg-neutral-300 dark:bg-neutral-600" />
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">Then</span>
                            <div className="h-px flex-1 bg-neutral-300 dark:bg-neutral-600" />
                          </div>
                        )}

                        <div className={landingSectionClass}>
                          <div className="space-y-3">
                        {/* Property (buy/auction it) */}
                        {isUnownedBuyable && (
                          <SectionCard className="p-0 overflow-hidden" title="Property">
                            <div className="p-3 pt-1">
                              <PurchaseActionsRow
                                tileName={t.name}
                                price={price}
                                firstRoundLocked={firstRoundLocked}
                                isUnownedBuyable={true}
                                isAuctionTile={false}
                                groupVariant={groupVariant}
                                buySelected={buySelected}
                                onToggleBuy={() => {
                                  const next = !buySelected;
                                  setBuySelected(next);
                                  if (next) {
                                    setAuctionItSelected(false);
                                    setAuctionOpen(false);
                                    setStagedAuction(null);
                                  }
                                  setPostAction(next ? 'Buy Property' : postAction === 'Buy Property' ? 'None' : postAction);
                                }}
                                canAffordBuy={effectivePreviewMoney >= price}
                                auctionItSelected={auctionItSelected}
                                onToggleAuctionIt={() => {
                                  const next = !auctionItSelected;
                                  if (next) setBuySelected(false);
                                  setAuctionItSelected(next);
                                  if (next) setAuctionOpen(true);
                                  if (!next) {
                                    setAuctionOpen(false);
                                    setStagedAuction(null);
                                  }
                                }}
                              />
                            </div>
                          </SectionCard>
                        )}

                        {/* Payments */}
                        {(rentLabel || taxLabel) && (
                          <SectionCard
                            className="p-0 overflow-hidden"
                            header={
                              <div className="border-b border-surface px-3 pt-3 pb-2">
                                <div
                                  className={
                                    rentDueLabel
                                      ? 'text-xs font-medium text-muted'
                                      : 'text-[11px] font-semibold uppercase tracking-wide text-subtle'
                                  }
                                >
                                  {paymentsHeader}
                                </div>
                              </div>
                            }
                          >
                            <div className="p-3 pt-1">
                              <PostActionsBar
                                rentLabel={hidePayRentToggle ? undefined : rentLabel}
                                rentSelected={rentSelected}
                                onToggleRent={hidePayRentToggle ? undefined : (() => {
                                  setRentSelected((v) => !v);
                                  setResolvedRentKey(null);
                                  setUseRentPassSelected(false);
                                })}
                                rentShake={shakeRent}
                                taxLabel={taxLabel}
                                taxSelected={taxSelected}
                                onToggleTax={() => setTaxSelected((v) => !v)}
                                taxShake={shakeTax}
                              >
                                {usablePassForPost && !isInsolventForRent && (
                                  <TogglePillButton
                                    label={(
                                      <span className="inline-flex items-center gap-1.5 text-[rgb(142,197,255)]">
                                        Use Pass
                                        <span className="rounded-full bg-surface-1 px-1.5 py-0.5 text-sm font-semibold text-[var(--color-blue-300)]">{usablePassForPost.remaining}</span>
                                      </span>
                                    )}
                                    active={useRentPassSelected}
                                    onToggle={() => {
                                      setUseRentPassSelected((v) => !v);
                                      setRentSelected(false);
                                      setResolvedRentKey(null);
                                    }}
                                    variant="blue"
                                  />
                                )}
                              </PostActionsBar>
                              {rentInfo && rentShortfall > 0 && (
                                isInsolventForRent ? (
                                  <div className="mt-2 space-y-1">
                                    <div className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                      Bankrupt
                                    </div>
                                    <div className="text-xs text-rose-600">Not enough liquidation value to fully cover rent.</div>
                                  </div>
                                ) : (
                                  <div className="mt-2 flex items-center gap-2 text-xs">
                                    <button
                                      type="button"
                                      disabled={!canLiquidateForRent}
                                      className={`rounded-md border px-2.5 py-2 text-sm font-semibold ${
                                        canLiquidateForRent
                                          ? 'border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                                          : 'border-neutral-300 text-neutral-400 dark:border-neutral-700 dark:text-neutral-500 cursor-not-allowed'
                                      }`}
                                      onClick={() => {
                                        if (!pid || !canLiquidateForRent || !rentInfo) return;
                                        setBuildOverlayMode('liquidate_for_rent');
                                        setLiquidationContext({
                                          payerId: pid,
                                          payeeId: rentInfo.ownerId,
                                          tileId: t.id,
                                          rentDue: rentInfo.rentAmount,
                                        });
                                        setBuildOverlayOpen(true);
                                      }}
                                    >
                                      {pendingForThisRent ? 'Edit Liquidation' : 'Liquidate & Pay'}
                                    </button>
                                    {pendingForThisRent && pendingLiquidation ? (
                                      <span className="text-amber-700 dark:text-amber-300">
                                        Pending settlement: net ${pendingLiquidation.projectedNetNow} now, cash after rent ${pendingLiquidation.projectedCashAfter}
                                      </span>
                                    ) : (
                                      <span className="text-muted">Need ${rentShortfall} more to pay rent.</span>
                                    )}
                                  </div>
                                )
                              )}
                              {pendingForThisRent && (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs font-semibold text-fg hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                    onClick={() => {
                                      setPendingLiquidation(null);
                                      setResolvedRentKey(null);
                                      setPostAction('None');
                                    }}
                                  >
                                    Cancel Pending Liquidation
                                  </button>
                                </div>
                              )}
                            </div>
                          </SectionCard>
                        )}

                        {/* Draw Chance */}
                        {chanceVisible && (
                          <SectionCard
                            className="p-0 overflow-hidden"
                            title="Chance"
                            status={stagedChanceCardId ? 'Drawn' : undefined}
                            headerTrailing={
                              stagedChanceCardId ? (
                                <DrawnUndoButton
                                  aria-label="Undo Chance card selection; return to draw pile"
                                  onClick={() => setStagedChanceCardId(null)}
                                />
                              ) : undefined
                            }
                          >
                            <div className="p-3 pt-1">
                              {stagedChanceCardId ? (
                                <p className="text-sm text-fg whitespace-pre-wrap">
                                  {CHANCE.find((c) => c.id === stagedChanceCardId)?.text ?? stagedChanceCardId}
                                </p>
                              ) : (
                                <PostActionsBar
                                  chanceVisible={true}
                                  chanceActive={false}
                                  onToggleChance={() => {
                                    setOverlay({ deck: 'chance' });
                                  }}
                                />
                              )}
                            </div>
                          </SectionCard>
                        )}

                        {/* Draw Community */}
                        {communityVisible && (
                          <SectionCard
                            className="p-0 overflow-hidden"
                            title="Community"
                            status={stagedCommunityCardId ? 'Drawn' : undefined}
                            headerTrailing={
                              stagedCommunityCardId ? (
                                <DrawnUndoButton
                                  aria-label="Undo Community Chest card selection; return to draw pile"
                                  onClick={() => setStagedCommunityCardId(null)}
                                />
                              ) : undefined
                            }
                          >
                            <div className="p-3 pt-1">
                              {stagedCommunityCardId ? (
                                <p className="text-sm text-fg whitespace-pre-wrap">
                                  {COMMUNITY_CHEST.find((c) => c.id === stagedCommunityCardId)?.text ?? stagedCommunityCardId}
                                </p>
                              ) : (
                                <PostActionsBar
                                  communityVisible={true}
                                  communityActive={false}
                                  onToggleCommunity={() => {
                                    setOverlay({ deck: 'community' });
                                  }}
                                />
                              )}
                            </div>
                          </SectionCard>
                        )}

                        {/* Draw Bus (tile — bus stop) */}
                        {tileBusNeedsCard && (
                          <SectionCard
                            className="p-0 overflow-hidden"
                            title={
                              <span className="inline-flex items-center gap-1.5">
                                <FaBusAlt className="h-4 w-4 shrink-0 text-game-bus" aria-hidden />
                                <span>Bus</span>
                              </span>
                            }
                            status={tileBusSelectedCardId ? 'Ticket Drawn' : undefined}
                            headerTrailing={
                              tileBusSelectedCardId ? (
                                <DrawnUndoButton
                                  aria-label="Undo bus stop ticket; return card to deck"
                                  onClick={() => {
                                    if (!tileBusSelectedCardId) return;
                                    dispatch(putCardOnBottom({ deck: 'bus', cardId: tileBusSelectedCardId }));
                                    setTileBusSelectedCardId(null);
                                    setStagedBusPicks((picks) => (picks.length === 0 ? picks : picks.slice(0, -1)));
                                  }}
                                />
                              ) : undefined
                            }
                          >
                            <div className="p-3 pt-1">
                              {tileBusSelectedCardId ? (
                                <p className="text-sm font-medium text-fg">{getBusCardShortTitle(tileBusSelectedCardId)}</p>
                              ) : (
                                <PostActionsBar
                                  busVisible={true}
                                  busActive={false}
                                  onDrawBus={() => setOverlay({ deck: 'bus', busSlot: 'tile' })}
                                  busShake={shakeBus}
                                />
                              )}
                            </div>
                          </SectionCard>
                        )}

                        {/* Auction tile */}
                        {isAuctionTile && (
                          <SectionCard className="p-0 overflow-hidden" title="Auction">
                            <div className="p-3 pt-1">
                              <PostActionsBar
                                auctionVisible={true}
                                auctionActive={auctionCompleted}
                                onAuction={() => {
                                  if (auctionCompleted) {
                                    setAuctionCompleted(false);
                                    setStagedAuction(null);
                                  } else {
                                    setAuctionOpen(true);
                                  }
                                }}
                              />
                            </div>
                          </SectionCard>
                        )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div data-qa="play-console-footer" className="flex items-center justify-end gap-0 py-3 px-3 bg-surface-1 rounded-b-3xl">
              {activeStep < 2 ? (
                <button
                  type="button"
                  className={`inline-flex w-full touch-manipulation items-center justify-center rounded-md px-4 py-2 text-lg font-semibold ${
                    nextBtnDisabled()
                      ? 'bg-emerald-600/40 text-white/60 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                  disabled={nextBtnDisabled()}
                  onClick={goNext}
                >
                  Next
                </button>
              ) : (
                (() => {
                  const isQueuedFlowActive = queuedPostPending || postActionQueue.length > 0;
                  const isDoublesNow = d6A !== null && d6B !== null && d6A === d6B;
                  const thirdDoublesNow = rollCount >= 3 && isDoublesNow && (busTeleportTo == null) && (tripleTeleportTo == null);
                  // Triples (e.g. 2-2-2) are also doubles, but should NOT create a doubles chain.
                  const continueRoll = isDoublesNow && !isTriple && !thirdDoublesNow && (busTeleportTo == null) && (tripleTeleportTo == null);
                  const blocked = isQueuedFlowActive
                    ? (cardDrawRequiredButNotSelected() || rentRequiredButNotSelected() || taxRequiredButNotSelected() || purchaseOrAuctionRequiredButNotResolved())
                    : (!hasRollWithSpecialSelected || cardDrawRequiredButNotSelected() || rentRequiredButNotSelected() || taxRequiredButNotSelected() || purchaseOrAuctionRequiredButNotResolved());
                  if (isQueuedFlowActive) {
                    return (
                      <button
                        type="button"
                        className={`inline-flex w-full touch-manipulation items-center justify-center rounded-md px-4 py-2 text-lg font-semibold ${blocked ? 'bg-emerald-600/40 text-white/60 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        disabled={blocked}
                        onClick={() => {
                          if (blocked) return;
                          const pid = players[turnIndex]?.id || players[0]?.id;
                          if (!pid) return;
                          finalizeTurn(pid);
                        }}
                      >
                        Next
                      </button>
                    );
                  }
                  if (continueRoll) {
                    return (
                      <button
                        type="button"
                        className={`inline-flex w-full touch-manipulation items-center justify-center rounded-md px-4 py-2 text-lg font-semibold ${blocked ? 'bg-emerald-600/40 text-white/60 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        disabled={blocked}
                        onClick={() => {
                          if (blocked) return;
                          const pid = players[turnIndex]?.id || players[0]?.id;
                          if (!pid) return;
                          finalizeTurn(pid);
                        }}
                      >
                        Next Roll
                      </button>
                    );
                  }
                  // End-of-turn: show Summary button with hold-to-end
                  return (
                    <motion.button
                      type="button"
                      className={`relative inline-flex touch-manipulation items-center justify-center rounded-md px-4 py-2 text-sm font-semibold shadow select-none ${
                        blocked ? 'bg-emerald-600/40 text-white/60 cursor-not-allowed' : 'bg-emerald-600 text-white'
                      }`}
                      disabled={blocked}
                      onMouseDown={() => {
                        if (blocked) {
                          if (rentRequiredButNotSelected()) {
                            setShakeRent(true);
                            window.setTimeout(() => setShakeRent(false), 400);
                          }
                          if (taxRequiredButNotSelected()) {
                            setShakeTax(true);
                            window.setTimeout(() => setShakeTax(false), 400);
                          }
                          if (
                            (requiresBusCard && !diceBusSelectedCardId) ||
                            (getTileByIndex(predictedTo ?? currentIndex).type === 'busStop' && !tileBusSelectedCardId)
                          ) {
                            setShakeBus(true);
                            window.setTimeout(() => setShakeBus(false), 400);
                          }
                          return;
                        }
                        onEndTurnHoldStart(p.id);
                      }}
                      onClick={() => {
                        if (blocked) return;
                        setSummaryOpen(true);
                      }}
                      onMouseUp={onEndTurnHoldCancel}
                      onMouseLeave={onEndTurnHoldCancel}
                      onTouchStart={() => onEndTurnHoldStart(p.id)}
                      onTouchEnd={onEndTurnHoldCancel}
                      whileTap={{ scale: 0.98 }}
                    >
                      Summary
                      <span className="absolute left-0 top-0 h-full rounded-md bg-emerald-500/40" style={{ width: `${holdProgress}%` }} aria-hidden />
                    </motion.button>
                  );
                })()
              )}
            </div>
          </>
        )}
      />

      {/* Card picker overlay */}
      <AnimatePresence>
        {overlay.deck && (
          <>
          <motion.div
            key="overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 modal-backdrop"
            onMouseDown={() => setOverlay({ deck: null })}
          />
          <motion.div
            key="overlay"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 p-4 shadow-2xl"
          >
            <OverlayHeader
              title={overlay.deck === 'community' ? 'Pick a Community Chest card' : overlay.deck === 'chance' ? 'Pick a Chance card' : 'Pick a Bus Ticket'}
              onClose={() => setOverlay({ deck: null })}
              className="mb-2"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[45vh] overflow-y-auto pr-1">
              {overlay.deck === 'bus' ? (
                (() => {
                  const busDraw = cardsState.decks.bus.drawPile;
                  const regularCount = busDraw.filter((c) => !c.id.startsWith('bb')).length;
                  const bigCount = busDraw.filter((c) => c.id.startsWith('bb')).length;
                  const handleBusPick = (type: 'regular' | 'big') => {
                    dispatch(drawBusCardByType(type));
                    const lastCard = selectLastDrawnCard(store.getState().cards, 'bus');
                    const cardId = lastCard?.id ?? (type === 'regular' ? 'b1' : 'bb1');
                    const pid = players[turnIndex]?.id || players[0]?.id;
                    dispatch(
                      appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'CARD', actorPlayerId: pid, payload: { deck: 'bus', cardId, text: lastCard?.text ?? (type === 'regular' ? 'Bus Ticket' : 'Big Bus'), message: `Drew ${type === 'regular' ? 'Bus' : 'Big Bus'}` }, createdAt: new Date().toISOString() })
                    );
                    const slot = overlay.busSlot ?? 'dice';
                    if (slot === 'dice') {
                      setDiceBusSelectedCardId(cardId);
                    } else {
                      setTileBusSelectedCardId(cardId);
                    }
                    setStagedBusPicks((picks) => [...picks, type === 'regular' ? 'regular' : 'big']);
                    setOverlay({ deck: null });
                  };
                  return (
                    <div className="col-span-full space-y-4">
                      <div className="space-y-3">
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50/50 dark:bg-neutral-800/50">
                          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Little Buss ({regularCount} remaining)</div>
                          <button
                            onClick={() => handleBusPick('regular')}
                            disabled={regularCount === 0}
                            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 shadow-md transition-colors"
                          >
                            Little Buss
                          </button>
                        </div>
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50/50 dark:bg-neutral-800/50">
                          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Big Buss ({bigCount} remaining)</div>
                          <button
                            onClick={() => handleBusPick('big')}
                            disabled={bigCount === 0}
                            className="w-full rounded-lg border-2 border-neutral-400 dark:border-neutral-500 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium px-6 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Big Buss
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <>
                  <div className="col-span-full">
                    <input
                      type="text"
                      value={cardSearch}
                      onChange={(e) => setCardSearch(e.target.value)}
                      placeholder={`Search ${overlay.deck === 'chance' ? 'Chance' : 'Community'} cards...`}
                      className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                    />
                  </div>
                  {cardsState.decks[overlay.deck].drawPile.length === 0 && (overlay.deck === 'chance' || overlay.deck === 'community') && (
                    <div className="rounded-md border border-neutral-300 dark:border-neutral-700 p-3 text-sm flex items-center justify-between">
                      <span>No cards left in {overlay.deck}. Reshuffle to continue.</span>
                      <button
                        className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold border border-blue-500 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        onClick={() => {
                          const heldIds: string[] = [];
                          dispatch(reshuffleIfEmpty({ deck: overlay.deck as any, heldExcludedIds: heldIds }));
                        }}
                      >
                        Reshuffle {overlay.deck === 'chance' ? 'Chance' : 'Community'}
                      </button>
                    </div>
                  )}
                  {cardsState.decks[overlay.deck].drawPile.length > 0 && filteredOverlayCards.length === 0 && (
                    <div className="col-span-full rounded-md border border-neutral-300 dark:border-neutral-700 p-3 text-sm text-subtle">
                      No cards match your search.
                    </div>
                  )}
                  {filteredOverlayCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => {
                        const deck = overlay.deck!;
                        if (deck === 'chance') setStagedChanceCardId(card.id);
                        if (deck === 'community') setStagedCommunityCardId(card.id);
                        setOverlay({ deck: null });
                      }}
                      className={`text-left rounded-md border p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 ${(
                        (overlay.deck === 'chance' && stagedChanceCardId === card.id) ||
                        (overlay.deck === 'community' && stagedCommunityCardId === card.id)
                      ) ? 'border-emerald-500 dark:border-emerald-600' : 'border-neutral-200 dark:border-neutral-700'}`}
                    >
                      <div className="text-[11px] opacity-70 mb-1">#{card.id}</div>
                      <div className="text-xs opacity-90 whitespace-pre-wrap">{card.text}</div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Event log modal */}
      <AnimatePresence>
        {eventLogOpen && (
          <motion.div
            key="event-log-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setEventLogOpen(false);
            }}
          >
            <div className="flex w-full max-w-3xl max-h-[calc(100dvh-2rem)] min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
              <div className="p-2 bg-surface-1 rounded-t-xl">
                <OverlayHeader title="Game log & stats" onClose={() => setEventLogOpen(false)} className="pl-2" />
                <div className="mt-2 flex justify-center px-1 sm:justify-start">
                  <SegmentedControl
                    dense
                    value={eventLogPanelTab}
                    onChange={setEventLogPanelTab}
                    options={[
                      { value: 'log', label: 'Game log' },
                      { value: 'stats', label: 'Game stats' },
                    ]}
                  />
                </div>
              </div>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {eventLogPanelTab === 'log' ? (
                  <EventLog
                    useFlexibleHeight
                    restorableEventIds={restorableEventIds}
                    onRequestRestore={(eventId) => {
                      setRestoreError(null);
                      setRestoreConfirmEventId(eventId);
                    }}
                  />
                ) : (
                  <GameStatsPanel events={events as GameEvent[]} players={players} useFlexibleHeight />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {restoreConfirmEventId && (
          <motion.div
            key="restore-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center modal-backdrop p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !restorePending) {
                setRestoreConfirmEventId(null);
                setRestoreError(null);
              }
            }}
          >
            <div
              className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 p-4 shadow-2xl border border-neutral-200 dark:border-neutral-700"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <OverlayHeader
                title="Restore timeline?"
                onClose={() => {
                  if (!restorePending) {
                    setRestoreConfirmEventId(null);
                    setRestoreError(null);
                  }
                }}
                className="mb-1"
              />
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                Game state will match the moment after this log entry. All later events and snapshots are removed. This cannot be undone except by restoring again from an earlier snapshot, if one still exists.
              </div>
              {restoreError && <div className="mt-2 text-sm text-rose-600 dark:text-rose-400">{restoreError}</div>}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={restorePending}
                  onClick={() => setRestoreConfirmEventId(null)}
                  className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={restorePending}
                  onClick={() => {
                    if (!restoreConfirmEventId) return;
                    const id = restoreConfirmEventId;
                    setRestorePending(true);
                    void dispatch(restoreToEventId(id))
                      .unwrap()
                      .then(() => {
                        setRestoreConfirmEventId(null);
                        setEventLogOpen(false);
                        onTimelineRestored?.();
                      })
                      .catch(() => {
                        setRestoreError(
                          'No snapshot available for this moment (it may have been trimmed). Play a bit longer from an earlier point or pick a more recent log line.'
                        );
                      })
                      .finally(() => setRestorePending(false));
                  }}
                  className="rounded-md bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                >
                  {restorePending ? 'Restoring…' : 'Restore'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary overlay */}
      <AnimatePresence>
        {summaryOpen && (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSummaryOpen(false);
            }}
          >
            <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-neutral-900 p-4 shadow-2xl border border-neutral-200 dark:border-neutral-700">
              <OverlayHeader title="Turn Summary" onClose={() => setSummaryOpen(false)} className="mb-2" />
              <div className="space-y-2 text-sm">
                {/* Completed segments recap */}
                {turnSegments.length > 0 && (
                  <div className="space-y-1">
                    {turnSegments.map((seg, idx) => (
                      <div key={seg.roll} className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                        <div className="flex items-center gap-2 text-xs px-2 py-1">
                          <span className="font-semibold">Roll {seg.roll}</span>
                          <span className="opacity-80">{seg.d6A != null && seg.d6B != null ? `${seg.d6A}+${seg.d6B}${seg.special != null ? `+${String(seg.special)}` : ''}` : '—'}</span>
                          {seg.busUsed && <span title="Bus used">🚌</span>}
                          <span className="opacity-80">→ {seg.tileName}</span>
                          <span className="opacity-50 tabular-nums ml-auto">{new Date(seg.at).toLocaleTimeString()}</span>
                        </div>
                        {(() => {
                          const list = getSegmentEvents(idx);
                          if (!list || list.length === 0) return null;
                          return (
                            <ul className="text-xs px-3 pb-2 space-y-1">
                              {list.map((ev) => (
                                <li key={ev.id} className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] bg-neutral-200 dark:bg-neutral-700">{ev.type === 'CARD' ? 'C' : 'P'}</span>
                                  <span className="opacity-80">{String(ev.payload?.message ?? (ev.type === 'CARD' ? 'Card' : 'Purchase'))}</span>
                                  {typeof ev.moneyDelta === 'number' && ev.moneyDelta !== 0 && (
                                    <span className={`tabular-nums ${ev.moneyDelta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{ev.moneyDelta > 0 ? `+$${ev.moneyDelta}` : `-$${Math.abs(ev.moneyDelta)}`}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
                <div className="opacity-80">Current: {rollSummary}</div>
                {(() => {
                  const insolvencyCtx = getActiveRentContext();
                  if (!insolvencyCtx?.isInsolvent) return null;
                  const loserName = players.find((p) => p.id === insolvencyCtx.payerId)?.nickname ?? insolvencyCtx.payerId;
                  const creditorName = players.find((p) => p.id === insolvencyCtx.payeeId)?.nickname ?? insolvencyCtx.payeeId;
                  return (
                    <div className="rounded-md border border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-900/30 dark:text-rose-200 px-2 py-2">
                      <div className="text-[11px] font-black uppercase tracking-wider">Bankrupt</div>
                      <div className="text-xs">
                        {loserName} lost to {creditorName}. Unable to cover rent even after liquidation.
                      </div>
                    </div>
                  );
                })()}
                {(() => {
                  const isDoubles = d6A !== null && d6B !== null && d6A === d6B;
                  const thirdDoubles = rollCount >= 3 && isDoubles && (busTeleportTo == null) && (tripleTeleportTo == null);
                  if (!thirdDoubles) return null;
                  return (
                    <div className="text-xs inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-1">
                      <span>⚠️ Third doubles: Go to Jail</span>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2 text-xs">
                  {!isTriple && (d6A === d6B) && (
                    <span className="inline-flex items-center rounded-full bg-emerald-600 text-white px-2 py-0.5">Doubles ✓</span>
                  )}
                  {isTriple && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                        isTripleOnes ? 'bg-amber-400 text-neutral-900' : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {isTripleOnes ? '🐍🐍🐍' : 'Triples ✓'}
                    </span>
                  )}
                  {busTeleportTo != null && <span className="inline-flex items-center rounded-full bg-sky-600 text-white px-2 py-0.5">Bus used</span>}
                  {tripleTeleportTo != null && <span className="inline-flex items-center rounded-full bg-indigo-600 text-white px-2 py-0.5">Teleported</span>}
                </div>
                <div className="opacity-80">Tile: {predictedTo != null ? getTileByIndex(predictedTo).name : getTileByIndex(currentIndex).name}</div>
                <div className="opacity-80">Actions: {[
                  buySelected ? 'Buy' : null,
                  rentSelected ? 'Rent' : null,
                  taxSelected ? 'Tax' : null,
                ].filter(Boolean).join(', ') || 'None'}</div>
                {stagedBusPicks.length > 0 && (
                  <div className="opacity-80">
                    Bus draws (order):{' '}
                    {stagedBusPicks.map((p) => (p === 'regular' ? 'Regular' : 'Big Bus')).join(' → ')}
                    {stagedBusPicks.some((p) => p === 'big') && (
                      <span className="block text-[11px] mt-0.5">
                        Big Bus clears every player&apos;s tickets (including yours), then you gain 1.
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={() => setSummaryOpen(false)} className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm">Back</button>
                {(() => {
                  const isQueuedFlowActive = queuedPostPending || postActionQueue.length > 0;
                  const blocked = isQueuedFlowActive
                    ? (cardDrawRequiredButNotSelected() || rentRequiredButNotSelected() || taxRequiredButNotSelected() || purchaseOrAuctionRequiredButNotResolved())
                    : (cardDrawRequiredButNotSelected() || rentRequiredButNotSelected() || taxRequiredButNotSelected());
                  const label = isQueuedFlowActive ? 'Next' : 'End Turn';
                  return (
                    <button
                      className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${ blocked ? 'bg-emerald-600/40 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      disabled={blocked}
                      onClick={() => {
                        // #region agent log
                        postDebugLog({sessionId:'e6c2a6',runId:'insolvency-debug-1',hypothesisId:'H5',location:'PlayConsole.tsx:summary:onConfirmClick',message:'summary confirm clicked',data:{blocked,isQueuedFlowActive,turnIndex,predictedTo,currentIndex},timestamp:Date.now()});
                        // #endregion
                        if (blocked) return;
                        const pid = players[turnIndex]?.id || players[0]?.id;
                        if (!pid) return;
                        finalizeTurn(pid);
                        setSummaryOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(() => {
        const victoryPlayer = victoryWinnerId ? players.find((p) => p.id === victoryWinnerId) : undefined;
        if (!victoryPlayer) return null;
        return (
          <VictoryModal
            open={victoryModalOpen}
            onClose={() => setVictoryModalOpen(false)}
            winnerNickname={victoryPlayer.nickname}
            winnerEmoji={AVATARS.find((a) => a.key === victoryPlayer.avatarKey)?.emoji ?? '🙂'}
            accentColor={victoryPlayer.color}
          />
        );
      })()}

      {/* New Game confirmation */}
      <AnimatePresence>
        {newGameConfirmOpen && (
          <motion.div
            key="new-game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setNewGameConfirmOpen(false);
            }}
          >
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 p-4 shadow-2xl border border-neutral-200 dark:border-neutral-700">
              <OverlayHeader title="Start a new game?" onClose={() => setNewGameConfirmOpen(false)} className="mb-1" />
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                This will clear players, properties, decks, and the event log saved on this device and return you to Setup.
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewGameConfirmOpen(false)}
                  className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmNewGame}
                  className="rounded-md bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  New Game
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Centered board picker for teleports */}
      <AnimatePresence>
        {centerOverlay.type && (
          <motion.div
            key="center-bus"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setCenterOverlay({ type: null });
            }}
          >
            <div className="w-full max-w-3xl rounded-xl bg-surface-2 text-fg shadow-2xl border border-neutral-200 dark:border-neutral-700">
              <OverlayHeader
                title={centerOverlay.type === 'busTeleport' ? 'Select destination (Bus)' : 'Select destination (Teleport)'}
                subtitle="Pick a tile to set your teleport destination."
                onClose={() => setCenterOverlay({ type: null })}
                className="p-1 pl-3 bg-surface-1 rounded-t-xl"
              />
              <div className="grid grid-cols-5 sm:grid-cols-8 sm:gap-2 gap-1  max-h-[70vh] overflow-auto px-2 pt-2 pb-4 sm:px-4">
                {BOARD_TILES.map((t) => {
                  const onTile = players.filter((pl) => pl.positionIndex === t.index);
                  const ownerIdForTile = (propsState.byTileId[t.id]?.ownerId as string | null) || null;
                  const ownerColor = ownerIdForTile ? (players.find((pl) => pl.id === ownerIdForTile)?.color) : undefined;
                  return (
                    <div key={t.id} className="relative pt-2">
                      {onTile.length > 0 && (
                        <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 flex -space-x-2">
                          {onTile.slice(0, 3).map((pl) => {
                            const emoji = AVATARS.find((a) => a.key === pl.avatarKey)?.emoji ?? '🙂';
                            return <span key={pl.id} className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-100 dark:bg-neutral-800 text-xs">{emoji}</span>;
                          })}
                          {onTile.length > 3 && <span className="ml-2 text-[10px] opacity-70">+{onTile.length - 3}</span>}
                        </div>
                      )}
                      {ownerColor && (
                        <div className="pointer-events-none absolute left-0 right-0 top-2 bottom-0 rounded-xl" style={{ outline: `3px solid ${ownerColor}` }} aria-hidden />
                      )}
                      <button
                        onClick={() => {
                          if (centerOverlay.type === 'busTeleport') {
                            setBusTeleportTo(t.index);
                            setTripleTeleportTo(null);
                            setCenterOverlay({ type: null });
                            // Consume one ticket now; actual move happens on End Turn via onApplyMove logic using predictedTo
                            const pid = players[turnIndex]?.id || players[0]?.id;
                            if (pid) {
                              dispatch(consumeBusTicket({ id: pid, count: 1 }));
                              dispatch(
                                appendEvent({
                                  id: crypto.randomUUID(),
                                  gameId: 'local',
                                  type: 'BUS_PASS_USED',
                                  actorPlayerId: pid,
                                  payload: { playerId: pid, message: 'Bus ticket used (teleport)' },
                                  createdAt: new Date().toISOString(),
                                })
                              );
                            }
                            setPredictedTo(t.index);
                            setBusTicketsAvailableThisTurn((n) => Math.max(0, n - 1));
                            return;
                          }
                          // Triple teleport: no ticket consumption
                          setTripleTeleportTo(t.index);
                          setBusTeleportTo(null);
                          setCenterOverlay({ type: null });
                          setPredictedTo(t.index);
                        }}
                        className={`relative rounded-xl border text-[11px] text-left bg-white dark:bg-neutral-900 ${t.index === (players[turnIndex]?.positionIndex ?? 0) ? 'border-emerald-500' : 'border-neutral-200 dark:border-neutral-700'} hover:shadow w-full`}
                        title={t.name}
                      >
                        {/* colored header */}
                        <div className={`h-2 rounded-t-xl ${getTileHeaderBg(t)}`} />
                        <div className="p-2 space-y-1">
                          <div className="font-semibold text-[12px] truncate">{t.name}</div>
                        </div>
                        {/* footer info */}
                        <div className="px-2 pb-2 flex items-center justify-between text-[10px] opacity-80">
                          <div>#{t.index}</div>
                          <div className="flex items-center gap-1">{tileFooterIcon(t.id)}</div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-xs opacity-70">GO is at index 0 (top-right).</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Trade modal */}
      <TradeModal
        open={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        onConfirm={(trade: TradeModalConfirmPayload) => {
          const { fromPlayerId, toPlayerId, fromOffer, toOffer } = trade;
          if (!fromPlayerId || !toPlayerId || fromPlayerId === toPlayerId) return;
          const fromPlayer = players.find((p) => p.id === fromPlayerId);
          const toPlayer = players.find((p) => p.id === toPlayerId);
          if (!fromPlayer || !toPlayer) return;

          const transferableFrom = fromOffer.propertyIds.filter((tileId) => propsState.byTileId[tileId]?.ownerId === fromPlayerId);
          const transferableTo = toOffer.propertyIds.filter((tileId) => propsState.byTileId[tileId]?.ownerId === toPlayerId);

          for (const tileId of transferableFrom) {
            dispatch(assignOwner({ tileId, ownerId: toPlayerId }));
            dispatch(unassignProperty({ id: fromPlayerId, tileId }));
            dispatch(assignProperty({ id: toPlayerId, tileId }));
          }
          for (const tileId of transferableTo) {
            dispatch(assignOwner({ tileId, ownerId: fromPlayerId }));
            dispatch(unassignProperty({ id: toPlayerId, tileId }));
            dispatch(assignProperty({ id: fromPlayerId, tileId }));
          }

          const fromCash = Math.max(0, Math.min(fromOffer.cash, fromPlayer.money));
          const toCash = Math.max(0, Math.min(toOffer.cash, toPlayer.money));
          if (fromCash > 0) {
            dispatch(adjustPlayerMoney({ id: fromPlayerId, delta: -fromCash }));
            dispatch(adjustPlayerMoney({ id: toPlayerId, delta: +fromCash }));
          }
          if (toCash > 0) {
            dispatch(adjustPlayerMoney({ id: toPlayerId, delta: -toCash }));
            dispatch(adjustPlayerMoney({ id: fromPlayerId, delta: +toCash }));
          }

          const transferCards = (
            fromId: string,
            toId: string,
            busCount: number,
            gojfChanceCount: number,
            gojfCommunityCount: number
          ) => {
            for (let i = 0; i < Math.max(0, busCount); i += 1) {
              dispatch(consumeBusTicket({ id: fromId, count: 1 }));
              dispatch(grantBusTicket({ id: toId, count: 1 }));
            }
            for (let i = 0; i < Math.max(0, gojfChanceCount); i += 1) {
              dispatch(consumeGetOutOfJail({ id: fromId, deck: 'chance', count: 1 }));
              dispatch(grantGetOutOfJail({ id: toId, deck: 'chance', count: 1 }));
            }
            for (let i = 0; i < Math.max(0, gojfCommunityCount); i += 1) {
              dispatch(consumeGetOutOfJail({ id: fromId, deck: 'community', count: 1 }));
              dispatch(grantGetOutOfJail({ id: toId, deck: 'community', count: 1 }));
            }
          };

          transferCards(fromPlayerId, toPlayerId, fromOffer.busTicketsCount, fromOffer.gojfChanceCount, fromOffer.gojfCommunityCount);
          transferCards(toPlayerId, fromPlayerId, toOffer.busTicketsCount, toOffer.gojfChanceCount, toOffer.gojfCommunityCount);

          const projectedOwners: Record<string, string | null> = {};
          for (const t of BOARD_TILES) {
            projectedOwners[t.id] = (propsState.byTileId[t.id]?.ownerId ?? null) as string | null;
          }
          for (const tileId of transferableFrom) projectedOwners[tileId] = toPlayerId;
          for (const tileId of transferableTo) projectedOwners[tileId] = fromPlayerId;

          const isEligibleScopeForIssuer = (issuerId: string, scopeType: TradePassScopeType, scopeKey: string): boolean => {
            if (scopeType === 'railroad') {
              let rr = 0;
              for (const t of BOARD_TILES) {
                if (t.type === 'railroad' && projectedOwners[t.id] === issuerId) rr += 1;
              }
              return rr >= 2;
            }
            if (scopeType === 'utility') {
              let ut = 0;
              for (const t of BOARD_TILES) {
                if (t.type === 'utility' && projectedOwners[t.id] === issuerId) ut += 1;
              }
              return ut >= 2;
            }
            if (scopeType !== 'color') return false;
            const group = scopeKey as ColorGroup;
            const groupTiles = BOARD_TILES.filter((t) => t.type === 'property' && t.group === group);
            const ownedEligibleCount = groupTiles.filter((t) => {
              const ps = propsState.byTileId[t.id];
              return projectedOwners[t.id] === issuerId && ps?.mortgaged !== true;
            }).length;
            const needed = BUILD_ELIGIBLE_GROUP_OWNERSHIP_MIN[group] ?? groupTiles.length;
            return groupTiles.length > 0 && ownedEligibleCount >= needed;
          };

          const grantSelectedPasses = (
            issuerId: string,
            holderId: string,
            selected: Array<{ scopeType: TradePassScopeType; scopeKey: string }>
          ) => {
            const dedup = new Set<string>();
            for (const scope of selected) {
              const key = `${scope.scopeType}:${scope.scopeKey}`;
              if (dedup.has(key)) continue;
              dedup.add(key);
              if (!isEligibleScopeForIssuer(issuerId, scope.scopeType, scope.scopeKey)) continue;
              const existing = tradePassEntries.some(
                (e) =>
                  e.holderPlayerId === holderId &&
                  e.issuerPlayerId === issuerId &&
                  e.scopeType === scope.scopeType &&
                  e.scopeKey === scope.scopeKey &&
                  e.remaining > 0
              );
              if (existing) continue;
              dispatch(
                grantTradePass({
                  holderPlayerId: holderId,
                  issuerPlayerId: issuerId,
                  scopeType: scope.scopeType,
                  scopeKey: scope.scopeKey,
                  amount: 2,
                })
              );
              dispatch(
                appendEvent({
                  id: crypto.randomUUID(),
                  gameId: 'local',
                  type: 'RENT_PASS_GRANTED',
                  actorPlayerId: issuerId,
                  payload: {
                    holderPlayerId: holderId,
                    issuerPlayerId: issuerId,
                    scopeType: scope.scopeType,
                    scopeKey: scope.scopeKey,
                    amount: 2,
                    message: `Granted 2 ${scope.scopeKey} passes`,
                  },
                  createdAt: new Date().toISOString(),
                })
              );
            }
          };

          grantSelectedPasses(fromPlayerId, toPlayerId, fromOffer.passScopes);
          grantSelectedPasses(toPlayerId, fromPlayerId, toOffer.passScopes);

          dispatch(
            appendEvent({
              id: crypto.randomUUID(),
              gameId: 'local',
              type: 'TRADE',
              actorPlayerId: fromPlayerId,
              payload: {
                fromPlayerId,
                toPlayerId,
                fromOffer,
                toOffer,
                message: `Trade between ${fromPlayer.nickname} and ${toPlayer.nickname}`,
              },
              createdAt: new Date().toISOString(),
            })
          );
          addPreAction('Trade');
          setTradeModalOpen(false);
        }}
        initiatorPlayerId={players[turnIndex]?.id || players[0]?.id || null}
        players={players.map((pl) => ({ id: pl.id, nickname: pl.nickname, money: pl.money }))}
        boardPlayers={players.map((pl) => ({ id: pl.id, avatarKey: pl.avatarKey, positionIndex: pl.positionIndex, color: pl.color }))}
        tradeInventoryByPlayerId={useMemo(() => {
          const byId: Record<string, {
            properties: Array<{ id: string; name: string; type: 'property' | 'railroad' | 'utility' }>;
            maxCash: number;
            gojfChance: number;
            gojfCommunity: number;
            busTickets: number;
          }> = {};

          for (const pl of players) {
            const properties = BOARD_TILES
              .filter((tile) => tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility')
              .map((t) => {
                const ps = propsState.byTileId[t.id];
                if (!t || !ps) return null;
                if (ps.ownerId !== pl.id) return null;
                if (ps.mortgaged) return null;
                if (ps.improvements > 0) return null;
                if (ps.depotInstalled === true) return null;
                return { id: t.id, name: t.name, type: t.type };
              })
              .filter(Boolean) as Array<{ id: string; name: string; type: 'property' | 'railroad' | 'utility' }>;

            byId[pl.id] = {
              properties,
              maxCash: Math.max(0, pl.money),
              gojfChance: Math.max(0, pl.gojfChance ?? 0),
              gojfCommunity: Math.max(0, pl.gojfCommunity ?? 0),
              busTickets: Math.max(0, pl.busTickets ?? 0),
            };
          }

          return byId;
        }, [players, propsState.byTileId])}
        ownershipByTileId={useMemo(() => {
          const map: Record<string, string | null> = {};
          for (const t of BOARD_TILES) {
            map[t.id] = (propsState.byTileId[t.id]?.ownerId ?? null) as string | null;
          }
          return map;
        }, [propsState.byTileId])}
        mortgagedByTileId={useMemo(() => {
          const map: Record<string, boolean> = {};
          for (const t of BOARD_TILES) {
            map[t.id] = propsState.byTileId[t.id]?.mortgaged === true;
          }
          return map;
        }, [propsState.byTileId])}
        existingPasses={tradePassEntries}
      />
      
      {/* Build & Sell overlay */}
      <BuildSellOverlay
        open={buildOverlayOpen}
        onClose={closeBuildOverlay}
        mode={buildOverlayMode}
        rentDue={buildOverlayMode === 'liquidate_for_rent' ? (liquidationContext?.rentDue ?? 0) : 0}
        playerId={players[turnIndex]?.id || players[0]?.id}
        playerMoney={players[turnIndex]?.money || players[0]?.money || 0}
        tileLevels={useMemo(() => {
          const pid = players[turnIndex]?.id || players[0]?.id;
          const map: Record<string, number> = {};
          if (pid) {
            for (const t of BOARD_TILES) {
              if (t.type !== 'property') continue;
              const ps = propsState.byTileId[t.id];
              if (ps?.ownerId === pid) map[t.id] = ps.improvements ?? 0;
            }
          }
          return map;
        }, [players, turnIndex, propsState.byTileId])}
        tileMortgaged={useMemo(() => {
          const pid = players[turnIndex]?.id || players[0]?.id;
          const map: Record<string, boolean> = {};
          if (pid) {
            for (const t of BOARD_TILES) {
              if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) continue;
              const ps = propsState.byTileId[t.id];
              if (ps?.ownerId === pid) map[t.id] = ps.mortgaged === true;
            }
          }
          return map;
        }, [players, turnIndex, propsState.byTileId])}
        railroadDepotInstalled={useMemo(() => {
          const pid = players[turnIndex]?.id || players[0]?.id;
          const map: Record<string, boolean> = {};
          if (pid) {
            for (const t of BOARD_TILES) {
              if (t.type !== 'railroad') continue;
              const ps = propsState.byTileId[t.id];
              if (ps?.ownerId === pid) map[t.id] = ps.depotInstalled === true;
            }
          }
          return map;
        }, [players, turnIndex, propsState.byTileId])}
        ownedTileIds={useMemo(() => {
          const pid = players[turnIndex]?.id || players[0]?.id;
          const list: string[] = [];
          if (pid) {
            for (const t of BOARD_TILES) {
              if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) continue;
              const ps = propsState.byTileId[t.id];
              if (ps?.ownerId === pid) list.push(t.id);
            }
          }
          return list;
        }, [players, turnIndex, propsState.byTileId])}
        housesRemaining={propsState.housesRemaining}
        hotelsRemaining={propsState.hotelsRemaining}
        onConfirm={({ targets, desiredMortgaged, desiredDepotInstalled }) => {
          const defaultPid = players[turnIndex]?.id || players[0]?.id;
          const pid = buildOverlayMode === 'liquidate_for_rent' ? (liquidationContext?.payerId ?? defaultPid) : defaultPid;
          if (!pid) return;
          const isLiquidationFlow = buildOverlayMode === 'liquidate_for_rent' && liquidationContext?.payerId === pid;

          // House rule: newly mortgaged cash cannot fund same-turn build/manage spend.
          let plannedBuildCost = 0;
          let plannedSellRefund = 0;
          let plannedUnmortgageCost = 0;
          let plannedMortgageCredit = 0;
          let plannedDepotCost = 0;
          for (const t of BOARD_TILES) {
            if (t.type === 'property' && targets[t.id] != null) {
              const cur = propsState.byTileId[t.id]?.improvements ?? 0;
              const tar = targets[t.id];
              const unitCost = t.property?.houseCost ?? 0;
              if (tar > cur) plannedBuildCost += (tar - cur) * unitCost;
              if (tar < cur) plannedSellRefund += (cur - tar) * (unitCost / 2);
            }
            if ((t.type === 'property' || t.type === 'railroad' || t.type === 'utility') && desiredMortgaged) {
              const curMort = propsState.byTileId[t.id]?.mortgaged === true;
              const desMort = desiredMortgaged[t.id] === true;
              if (!curMort && desMort) {
                plannedMortgageCredit += t.property?.mortgageValue ?? t.railroad?.mortgageValue ?? t.utility?.mortgageValue ?? 0;
              }
              if (curMort && !desMort) {
                plannedUnmortgageCost += t.property?.mortgageValue ?? t.railroad?.mortgageValue ?? t.utility?.mortgageValue ?? 0;
              }
            }
            if (!isLiquidationFlow && t.type === 'railroad' && desiredDepotInstalled) {
              const curDepot = propsState.byTileId[t.id]?.depotInstalled === true;
              const desDepot = desiredDepotInstalled[t.id] === true;
              if (!curDepot && desDepot) plannedDepotCost += 100;
            }
          }
          const currentMoney = players.find((p) => p.id === pid)?.money ?? 0;
          const availableNow = currentMoney + plannedSellRefund + (isLiquidationFlow ? plannedMortgageCredit : 0);
          const spendNow = plannedBuildCost + plannedUnmortgageCost + plannedDepotCost;
          if (spendNow > availableNow) return;
          if (isLiquidationFlow && liquidationContext) {
            const projectedNetNow = plannedSellRefund + plannedMortgageCredit - plannedUnmortgageCost;
            const projectedCashAfter = currentMoney + projectedNetNow - liquidationContext.rentDue;
            setPendingLiquidation({
              payerId: liquidationContext.payerId,
              payeeId: liquidationContext.payeeId,
              tileId: liquidationContext.tileId,
              rentDue: liquidationContext.rentDue,
              targets: { ...targets },
              desiredMortgaged: { ...desiredMortgaged },
              desiredDepotInstalled: {},
              projectedNetNow,
              projectedCashAfter,
            });
            setResolvedRentKey(null);
            setRentSelected(false);
            setUseRentPassSelected(false);
            setPostAction('Rent (Pending)');
            closeBuildOverlay();
            return;
          }

          const getLiveByTile = () => (store.getState() as RootState).properties.byTileId;
          let totalCostAll = 0;
          let totalRefundAll = 0;
          let immediateMortgageCredit = 0;
          let deferredMortgageCredit = 0;

          const managedPropertyTiles = BOARD_TILES.filter((t) => t.type === 'property' && targets[t.id] != null);

          // Apply sells first in passes so even-sell rules are respected.
          for (let pass = 0; pass < 64; pass += 1) {
            let progressed = false;
            for (const t of managedPropertyTiles) {
              const cur = getLiveByTile()[t.id]?.improvements ?? 0;
              const tar = targets[t.id];
              if (cur <= tar) continue;
              dispatch(sellHouse({ tileId: t.id }));
              const next = getLiveByTile()[t.id]?.improvements ?? cur;
              if (next < cur) {
                progressed = true;
                totalRefundAll += (t.property?.houseCost ?? 0) / 2;
              }
            }
            if (!progressed) break;
          }

          // Apply mortgage/unmortgage flags and charge/refund only if reducer accepted the change.
          if (desiredMortgaged) {
            for (const t of BOARD_TILES) {
              if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) continue;
              const curMort = getLiveByTile()[t.id]?.mortgaged === true;
              const desMort = desiredMortgaged[t.id] === true;
              if (curMort === desMort) continue;
              const mv = t.property?.mortgageValue ?? t.railroad?.mortgageValue ?? t.utility?.mortgageValue ?? 0;
              dispatch(setMortgaged({ tileId: t.id, mortgaged: desMort }));
              const nextMort = getLiveByTile()[t.id]?.mortgaged === true;
              if (nextMort !== desMort) continue;
              if (desMort) {
                if (isLiquidationFlow) immediateMortgageCredit += mv;
                else deferredMortgageCredit += mv;
              } else {
                totalCostAll += mv;
              }
            }
          }

          // Apply depot install/remove and charge only successful installs.
          if (!isLiquidationFlow && desiredDepotInstalled) {
            for (const t of BOARD_TILES) {
              if (t.type !== 'railroad') continue;
              const cur = getLiveByTile()[t.id]?.depotInstalled === true;
              const des = desiredDepotInstalled[t.id] === true;
              if (cur === des) continue;
              dispatch(setDepotInstalled({ tileId: t.id, installed: des }));
              const next = getLiveByTile()[t.id]?.depotInstalled === true;
              if (next !== des) continue;
              if (des) totalCostAll += 100;
            }
          }

          // Apply builds in round-robin passes so even-build rules are respected.
          if (!isLiquidationFlow) {
            for (let pass = 0; pass < 64; pass += 1) {
              let progressed = false;
              for (const t of managedPropertyTiles) {
                const cur = getLiveByTile()[t.id]?.improvements ?? 0;
                const tar = targets[t.id];
                if (cur >= tar) continue;
                dispatch(buyHouse({ tileId: t.id, ownerId: pid }));
                const next = getLiveByTile()[t.id]?.improvements ?? cur;
                if (next > cur) {
                  progressed = true;
                  totalCostAll += t.property?.houseCost ?? 0;
                }
              }
              if (!progressed) break;
            }
          }

          const moneyDelta = totalRefundAll + immediateMortgageCredit - totalCostAll;
          if (moneyDelta !== 0) {
            dispatch(adjustPlayerMoney({ id: pid, delta: moneyDelta }));
          }
          if (deferredMortgageCredit > 0) {
            dispatch(addPendingMortgageCredit({ playerId: pid, amount: deferredMortgageCredit }));
          }
          if (totalCostAll > 0 || totalRefundAll > 0 || immediateMortgageCredit > 0 || deferredMortgageCredit > 0) {
            const netAll = Math.max(0, totalCostAll - totalRefundAll);
            const msg = `Build/Sell & Mortgage: cost $${totalCostAll}, refund $${totalRefundAll}, immediate mortgage credit $${immediateMortgageCredit}, deferred mortgage credit $${deferredMortgageCredit}, net now $${netAll}`;
            dispatch(
              appendEvent({
                id: crypto.randomUUID(),
                gameId: 'local',
                type: 'MONEY_ADJUST',
                actorPlayerId: pid,
                payload: { playerId: pid, message: msg },
                moneyDelta,
                createdAt: new Date().toISOString(),
              })
            );
          }
          addPreAction('Managed');
          closeBuildOverlay();
        }}
      />

      {/* Auction overlay */}
      <AuctionOverlay
        open={auctionOpen}
        onClose={() => setAuctionOpen(false)}
        bankOwnedByTileId={useMemo(() => {
          const map: Record<string, boolean> = {};
          for (const t of BOARD_TILES) {
            if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) continue;
            const owner = propsState.byTileId[t.id]?.ownerId ?? null;
            map[t.id] = owner == null;
          }
          return map;
        }, [propsState.byTileId])}
        players={players.map((pl) => ({ id: pl.id, nickname: pl.nickname, money: pl.money }))}
        boardPlayers={players.map((pl) => ({ id: pl.id, avatarKey: pl.avatarKey, positionIndex: pl.positionIndex, color: pl.color }))}
        presetTileId={(() => {
          const idx = predictedTo ?? currentIndex;
          const t = getTileByIndex(idx);
          const isBuyable = (t.type === 'property' || t.type === 'railroad' || t.type === 'utility');
          const owner = propsState.byTileId[t.id]?.ownerId as string | null;
          const unowned = isBuyable && !owner;
          return unowned ? t.id : null;
        })()}
        onConfirm={(tileId, winnerId, amount) => {
          if (!tileId) { setAuctionOpen(false); return; }
          if (amount < 0 || (!winnerId && amount > 0)) { setAuctionOpen(false); return; }
          if (amount === 0) {
            // Bank keeps; mark resolved but no staging
            setAuctionCompleted(true);
            setStagedAuction(null);
            setAuctionItSelected(false);
            setAuctionOpen(false);
            return;
          }
          setStagedAuction({ tileId, winnerId: winnerId!, amount });
          setAuctionCompleted(true);
          setAuctionItSelected(true);
          setAuctionOpen(false);
        }}
      />

      {/* Reusable Board Picker overlay (view mode) */}
      <BoardPickerOverlay
        open={boardOverlayOpen}
        title="Board"
        mode="view"
        onClose={() => setBoardOverlayOpen(false)}
        players={players.map((pl) => ({ id: pl.id, avatarKey: pl.avatarKey, positionIndex: pl.positionIndex, color: pl.color }))}
        activePlayerId={players[turnIndex]?.id}
        ownedByTileId={useMemo(() => {
          const map: Record<string, string | null> = {};
          for (const t of BOARD_TILES) {
            const ps = propsState.byTileId[t.id];
            map[t.id] = (ps?.ownerId as string | null) ?? null;
          }
          return map;
        }, [propsState.byTileId])}
        tileFooterIcon={(id) => tileFooterIcon(id)}
      />
    </div>
  );
}
