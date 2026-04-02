import React from 'react';
import TogglePillButton from '@/components/atoms/TogglePillButton';
import Tooltip from '@/components/atoms/Tooltip';
import IconLabelButton from '@/components/atoms/IconLabelButton';
import { FaLock } from 'react-icons/fa';

type Variant = 'rose' | 'orange' | 'emerald' | 'blue' | 'slate';

export interface PurchaseActionsRowProps {
  tileName: string;
  price: number;
  firstRoundLocked: boolean;
  isUnownedBuyable: boolean;
  isAuctionTile: boolean;
  groupVariant: Variant;
  // Buy
  buySelected: boolean;
  onToggleBuy: () => void;
  canAffordBuy: boolean;
  // Auction-it
  auctionItSelected: boolean;
  onToggleAuctionIt: () => void;
}

export default function PurchaseActionsRow({ tileName, price, firstRoundLocked, isUnownedBuyable, isAuctionTile, groupVariant, buySelected, onToggleBuy, canAffordBuy, auctionItSelected, onToggleAuctionIt }: PurchaseActionsRowProps): JSX.Element | null {
  // This row is for resolving purchase decisions on an unowned buyable tile.
  // Auction tiles are handled elsewhere.
  if (!isUnownedBuyable) return null;
  const lockedTip = 'First Round Locked';
  // Hide the alternative action once one is selected.
  // When locked, show both options (both locked) so the DM can see available actions.
  const showBuy = firstRoundLocked || !auctionItSelected;
  const showAuction = firstRoundLocked || !buySelected;
  return (
    <div data-cmp="m/PurchaseActionsRow" className="flex flex-col space-y-1">
      <div className="flex flex-col items-center gap-2">
        {showBuy && (
          firstRoundLocked ? (
            <Tooltip content={lockedTip}>
              <IconLabelButton
                icon={<FaLock className="h-4 w-4 text-current" />}
                label={
                  <span className="inline-flex items-center gap-2">
                    <span>Buy {tileName}</span>
                    <span className="opacity-80">${price}</span>
                  </span>
                }
                className="border border-neutral-300 text-neutral-500 bg-neutral-100 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 cursor-not-allowed"
                onClick={(e) => e.preventDefault()}
              />
            </Tooltip>
          ) : (
            <TogglePillButton
              label={<span className="inline-flex items-center gap-2"><span>Buy {tileName}</span><span className="opacity-80">${price}</span></span>}
              active={buySelected}
              onToggle={onToggleBuy}
              disabled={!canAffordBuy}
              variant={groupVariant}
            />
          )
        )}
        {showBuy && showAuction && (
          <span className="font-bold text-sm text-subtle">OR</span>
        ) }

        {showAuction && (
          firstRoundLocked ? (
            <Tooltip content={lockedTip}>
              <IconLabelButton
                icon={<FaLock className="h-4 w-4 text-current" />}
                label="Auction"
                className="border border-neutral-300 text-neutral-500 bg-neutral-100 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 cursor-not-allowed"
                onClick={(e) => e.preventDefault()}
              />
            </Tooltip>
          ) : (
            <TogglePillButton
              label="Auction"
              active={auctionItSelected}
              onToggle={onToggleAuctionIt}
              disabled={false}
              variant="orange"
            />
          )
        )}
      </div>
    </div>
  );
}


