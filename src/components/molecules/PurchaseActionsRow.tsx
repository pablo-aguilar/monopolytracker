import React from 'react';
import TogglePillButton from '@/components/atoms/TogglePillButton';

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
  if (!isUnownedBuyable && !isAuctionTile) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {isUnownedBuyable && (
          <TogglePillButton
            label={firstRoundLocked ? (
              <span className="inline-flex items-center gap-2"><span>First Round 🔒</span><span className="opacity-80">· ${price}</span></span>
            ) : (
              <span className="inline-flex items-center gap-2"><span>Buy {tileName}</span><span className="opacity-80">· ${price}</span></span>
            )}
            active={buySelected}
            onToggle={onToggleBuy}
            disabled={firstRoundLocked}
            variant={groupVariant}
          />
        )}
        {isUnownedBuyable && (
          <TogglePillButton
            label={firstRoundLocked ? 'First Round 🔒' : 'Auction it'}
            active={auctionItSelected}
            onToggle={onToggleAuctionIt}
            disabled={firstRoundLocked}
            variant="orange"
          />
        )}
      </div>
    </div>
  );
}


