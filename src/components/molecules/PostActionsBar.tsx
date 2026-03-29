import React from 'react';
import TogglePillButton from '@/components/atoms/TogglePillButton';

export interface PostActionsBarProps {
  children?: React.ReactNode;
  rentLabel?: React.ReactNode;
  rentSelected?: boolean;
  onToggleRent?: () => void;
  rentShake?: boolean;
  taxLabel?: string | null;
  taxSelected?: boolean;
  onToggleTax?: () => void;
  taxShake?: boolean;
  busVisible?: boolean;
  busActive?: boolean;
  onDrawBus?: () => void;
  busShake?: boolean;
  chanceVisible?: boolean;
  chanceActive?: boolean;
  onToggleChance?: () => void;
  communityVisible?: boolean;
  communityActive?: boolean;
  onToggleCommunity?: () => void;
  auctionVisible?: boolean;
  auctionActive?: boolean;
  onAuction?: () => void;
}

export default function PostActionsBar({ children, rentLabel, rentSelected, onToggleRent, rentShake, taxLabel, taxSelected, onToggleTax, taxShake, busVisible, busActive, onDrawBus, busShake, chanceVisible, chanceActive, onToggleChance, communityVisible, communityActive, onToggleCommunity, auctionVisible, auctionActive, onAuction }: PostActionsBarProps): JSX.Element {
  return (
    <div data-cmp="m/PostActionsBar" className="flex flex-wrap gap-2 pt-1">
      {children}
      {rentLabel && onToggleRent && (
        <TogglePillButton label={rentLabel} active={!!rentSelected} onToggle={onToggleRent} variant="rose" shake={!!rentShake} />
      )}
      {taxLabel && onToggleTax && (
        <TogglePillButton label={taxLabel} active={!!taxSelected} onToggle={onToggleTax} variant="orange" shake={!!taxShake} />
      )}
      {busVisible && onDrawBus && !busActive && (
        <TogglePillButton label="Draw Bus" active={false} onToggle={onDrawBus} variant="bus" shake={!!busShake} />
      )}
      {auctionVisible && onAuction && (
        <TogglePillButton label={auctionActive ? 'Auction done' : 'Auction'} active={!!auctionActive} onToggle={onAuction} variant="emerald" />
      )}
      {chanceVisible && onToggleChance && !chanceActive && (
        <TogglePillButton label="Draw Chance" active={false} onToggle={onToggleChance} variant="slate" />
      )}
      {communityVisible && onToggleCommunity && !communityActive && (
        <TogglePillButton label="Draw Community" active={false} onToggle={onToggleCommunity} variant="slate" />
      )}
    </div>
  );
}


