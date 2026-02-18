import React from 'react';
import StatPill from '@/components/atoms/StatPill';

export interface HudBarProps {
  housesRemaining: number;
  hotelsRemaining: number;
  skyscrapersRemaining?: number;
  depotsLeft: number;
  freeParkingPot: number;
  bankUnownedCount: number;
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
  bankUnownedCount,
  chanceLeft,
  communityLeft,
  busLeft,
  className,
}: HudBarProps): JSX.Element {
  return (
    <div data-qa="hud-bank" className={`flex flex-wrap items-center gap-3 text-sm ${className ?? ''}`}>
      
      <StatPill label={
         <img
         src="/icons/freeparking.webp"
         alt="Free Parking"
         className="h-7 w-7 inline-block align-middle"
         loading="lazy"
         decoding="async"
       />
        } value={`$${freeParkingPot}`} />
      <StatPill label={
       <img
       src="/icons/bus.webp"
       alt="Bus"
       className="h-7 w-7 inline-block align-middle"
       loading="lazy"
       decoding="async"
     />        } value={busLeft} />
      <StatPill
        label={
          <img
            src="/icons/house.webp"
            alt="Houses"
            className="h-7 w-7 inline-block align-middle"
            loading="lazy"
            decoding="async"
          />
        }
        value={housesRemaining}
      />
      <StatPill label={
        <img
            src="/icons/hotel.webp"
            alt="Hotels"
            className="h-7 w-7 inline-block align-middle"
            loading="lazy"
            decoding="async"
          />
        } value={hotelsRemaining} />
      <StatPill label={
          <img
          src="/icons/depot2.webp"
          alt="Train Depots"
          className="h-7 w-7 inline-block align-middle"
          loading="lazy"
          decoding="async"
          />        
        } value={depotsLeft} />
      <StatPill label={
        <img
          src="/icons/skyscraper.webp"
          alt="Skyscrapers"
          className="h-7 w-7 inline-block align-middle"
          loading="lazy"
          decoding="async"
        />
      } value={skyscrapersRemaining} />
      <StatPill label={
        <img
         src="/icons/bankowned.webp"
         alt="Bank Owned"
         className="h-7 w-7 inline-block align-middle"
         loading="lazy"
         decoding="async"
       />
        } value={bankUnownedCount} />

      <StatPill label={
        <img
        src="/icons/chance.webp"
        alt="Chance cards"
        className="h-7 w-7 inline-block align-middle"
        loading="lazy"
        decoding="async"
      />
        } value={chanceLeft} />
      <StatPill label={
        <img
        src="/icons/community.webp"
        alt="Community cards"
        className="h-7 w-7 inline-block align-middle"
        loading="lazy"
        decoding="async"
      />
        } value={communityLeft} />

    </div>
  );
}


