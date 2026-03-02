import React from 'react';
import TogglePillButton from '@/components/atoms/TogglePillButton';

export interface PostActionsBarProps {
  children?: React.ReactNode;
  rentLabel?: string | null;
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
      {busVisible && onDrawBus && (
        <TogglePillButton label={busActive ? 'Bus ticket added' : 'Draw Bus'} active={!!busActive} onToggle={onDrawBus} variant="blue" shake={!!busShake} />
      )}
      {auctionVisible && onAuction && (
        <TogglePillButton label={auctionActive ? 'Auction done' : 'Auction'} active={!!auctionActive} onToggle={onAuction} variant="emerald" />
      )}
      {chanceVisible && onToggleChance && (
        <TogglePillButton label={chanceActive ? 'Chance drawn' : 'Draw Chance'} active={!!chanceActive} onToggle={onToggleChance} variant="slate" />
      )}
      {communityVisible && onToggleCommunity && (
        <TogglePillButton label={communityActive ? 'Community drawn' : 'Draw Community'} active={!!communityActive} onToggle={onToggleCommunity} variant="slate" />
      )}
    </div>
  );
}


