import type { DieRoll } from '@/types/monopoly-schema';
import { BOARD_TILES, getTileByIndex, passedGo, GO_TO_JAIL_INDEX, JAIL_INDEX } from '@/data/board';

type AdvisoryType =
  | 'MOVE_TO'
  | 'TELEPORT_CHOOSE'
  | 'JAIL'
  | 'CAN_BUY'
  | 'PAY_RENT'
  | 'PAY_TAX'
  | 'DRAW_CARD'
  | 'NOTHING';

export interface Advisory {
  type: AdvisoryType;
  message: string;
  tileIndex?: number;
  tileId?: string;
  passedGo?: boolean;
}

export interface EvaluateContext {
  currentIndex: number;
  isOwned: (tileId: string) => boolean;
  isOwnedByOther: (tileId: string) => boolean;
}

export function evaluateRollAdvisories(roll: DieRoll, ctx: EvaluateContext): Advisory[] {
  const advisories: Advisory[] = [];

  // Simple baseline: no triples/doubles precedence handled here — that will be part of a fuller engine.
  const totalSteps = roll.d6A + roll.d6B + (typeof roll.special === 'number' ? roll.special : 0);
  const targetIndex = (ctx.currentIndex + totalSteps) % BOARD_TILES.length;
  const tile = getTileByIndex(targetIndex);

  // Go to Jail tile
  if (tile.index === GO_TO_JAIL_INDEX) {
    advisories.push({ type: 'JAIL', message: 'Go directly to Jail. Do not pass GO, do not collect $200.' });
    return advisories;
  }

  // Movement
  advisories.push({
    type: 'MOVE_TO',
    message: `Move to ${tile.name}.` + (passedGo(ctx.currentIndex, targetIndex) ? ' Passed GO (+$200).' : ''),
    tileIndex: tile.index,
    tileId: tile.id,
    passedGo: passedGo(ctx.currentIndex, targetIndex),
  });

  // Tile effects
  if (tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility') {
    if (!ctx.isOwned(tile.id)) {
      advisories.push({ type: 'CAN_BUY', message: 'Property is unowned. You may buy it.' });
    } else if (ctx.isOwnedByOther(tile.id)) {
      advisories.push({ type: 'PAY_RENT', message: 'Property owned by another player. Pay rent.' });
    } else {
      advisories.push({ type: 'NOTHING', message: 'You own this property.' });
    }
  } else if (tile.type === 'tax') {
    advisories.push({ type: 'PAY_TAX', message: 'Pay tax.' });
  } else if (tile.type === 'chance' || tile.type === 'community') {
    advisories.push({ type: 'DRAW_CARD', message: `Draw a ${tile.type === 'chance' ? 'Chance' : 'Community Chest'} card.` });
  } else if (tile.type === 'goToJail') {
    advisories.push({ type: 'JAIL', message: 'Go directly to Jail.' });
  } else if (tile.type === 'jail') {
    advisories.push({ type: 'NOTHING', message: 'Just Visiting.' });
  } else {
    advisories.push({ type: 'NOTHING', message: 'No immediate action.' });
  }

  return advisories;
}
