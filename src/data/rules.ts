export type RuleSource = 'mega' | 'home';

export type RuleSection =
  | 'Setup'
  | 'Movement'
  | 'Teleports'
  | 'GO & Money'
  | 'Cards'
  | 'Jail'
  | 'Property';

export type Rule = {
  id: string;
  title: string;
  section: RuleSection;
  source: RuleSource;
  body: string | string[];
};

export const RULES: Rule[] = [
  // --- Setup ---
  {
    id: 'setup-race-pot',
    title: 'Race Pot (optional)',
    section: 'Setup',
    source: 'home',
    body: [
      'Players may opt-in during setup.',
      'If 2+ players opt in, each pays $100 and the first opt-in player to pass GO wins the pot.',
    ],
  },
  {
    id: 'setup-starting-cash',
    title: 'Starting cash',
    section: 'Setup',
    source: 'mega',
    body: 'Each player starts with $2500.',
  },
  {
    id: 'setup-turn-order',
    title: 'Turn order',
    section: 'Setup',
    source: 'mega',
    body: 'To decide turn order, roll only the two standard (white) dice; highest total goes first.',
  },

  // --- Movement / GO ---
  {
    id: 'go-pass-collect',
    title: 'Passing GO',
    section: 'GO & Money',
    source: 'mega',
    body: 'When you land on or pass GO, collect $200.',
  },
  {
    id: 'movement-speed-die',
    title: 'Speed Die (how movement works)',
    section: 'Movement',
    source: 'mega',
    body: [
      'On your turn, roll 3 dice: two standard dice + the Speed Die.',
      'If the Speed Die shows a number, move the total of all 3 dice.',
      'Doubles are determined using the two standard dice only.',
    ],
  },
  {
    id: 'movement-mr-monopoly',
    title: 'Mr. Monopoly (Speed Die)',
    section: 'Movement',
    source: 'mega',
    body: [
      'First move using the two standard dice and resolve that space.',
      'Then make a bonus move to the next unowned property and you may buy it.',
      'If everything is owned, the bonus move takes you to the next rent you must pay (if any).',
    ],
  },
  {
    id: 'home-no-mr-monopoly-plus-minus',
    title: 'Speed Die: +1 / -1 instead of Mr. Monopoly',
    section: 'Movement',
    source: 'home',
    body: [
      'We do not use the Mr. Monopoly “bonus move to the next unowned property” rule.',
      'Instead, those Speed Die faces are treated as +1 or -1 added to your total roll.',
      'These +1/-1 adjustments do not affect doubles or triples (only the two standard dice determine doubles/triples).',
    ],
  },
  {
    id: 'movement-bus-face',
    title: 'Bus (Speed Die)',
    section: 'Movement',
    source: 'mega',
    body: [
      'First move using the two standard dice and resolve that space.',
      'Then choose: take a Bus Ticket for later OR move to the nearest Chance/Community space ahead of you.',
    ],
  },

  {
    id: 'free-parking-pot',
    title: 'Free Parking pot',
    section: 'GO & Money',
    source: 'home',
    body: [
      'Some fees/taxes can be added to the Free Parking pot.',
      'When you land on Free Parking by rolling, you collect the entire pot.',
      'The pot starts at $1000 at the beginning of the game.',
    ],
  },
  {
    id: 'free-parking-official',
    title: 'Free Parking (official)',
    section: 'GO & Money',
    source: 'mega',
    body: 'Officially, landing on Free Parking does not award money or bonuses.',
  },

  // --- Teleports (home rules / Mega variants) ---
  {
    id: 'teleport-forward',
    title: 'Teleport counts as moving forward (2-2-2 & 3-3-3)',
    section: 'Teleports',
    source: 'home',
    body: [
      'Teleporting counts as moving forward around the board.',
      'If your teleport lands on GO or passes GO, you collect $200 just like normal movement.',
    ],
  },
  {
    id: 'teleport-same-tile',
    title: 'Teleporting to the same space',
    section: 'Teleports',
    source: 'home',
    body: 'Teleporting to the same space is allowed and counts as a full lap (collect $200).',
  },
  {
    id: 'triple-111',
    title: 'Triple ones (1-1-1)',
    section: 'Teleports',
    source: 'home',
    body: 'Rolling 1-1-1 awards +$1000, then you may teleport anywhere (and still collect $200 if you pass GO).',
  },
  {
    id: 'mega-triples-123',
    title: 'Triples (1-1-1 / 2-2-2 / 3-3-3)',
    section: 'Teleports',
    source: 'mega',
    body: [
      'If you roll triples of 1, 2, or 3, you may move to any space on the board.',
      'You do not roll again after moving.',
      'This does not send you to Jail even if you previously rolled doubles twice that turn.',
    ],
  },
  {
    id: 'mega-bus-tickets',
    title: 'Bus Tickets',
    section: 'Movement',
    source: 'mega',
    body: [
      'Instead of rolling, you may use a Bus Ticket to move forward to any space on the same side of the board.',
      'After using a ticket, it is turned in (removed from play).',
      'If a Bus Ticket (or Mr. Monopoly bonus move) lands on or passes GO, collect $200 as usual.',
    ],
  },
  {
    id: 'mega-bus-ticket-expire',
    title: 'Bus Tickets can expire',
    section: 'Movement',
    source: 'mega',
    body: 'If an “All Tickets Expire” card is drawn, Bus Tickets held by players are lost back to the bank.',
  },
  {
    id: 'triple-111-free-parking',
    title: 'Triple ones + Free Parking',
    section: 'Teleports',
    source: 'home',
    body: [
      'If you roll 1-1-1 and you are 3 spaces away from Free Parking, you may teleport to Free Parking.',
      'In that case you collect both the +$1000 and the Free Parking pot.',
    ],
  },
  {
    id: 'triple-111-near-go-to-jail',
    title: 'Triple ones near Go To Jail',
    section: 'Jail',
    source: 'home',
    body: 'If you roll 1-1-1 and you are 3 spaces away from Go To Jail, you go directly to Jail (no teleport and no +$1000).',
  },

  // --- Cards ---
  {
    id: 'cards-move',
    title: 'Chance / Community movement cards',
    section: 'Cards',
    source: 'mega',
    body: [
      'Some cards move you to a specific tile (e.g., Advance to GO).',
      'Some cards move you by spaces (e.g., Go back 3).',
      'If a card says “Do not pass GO”, you do not collect $200 from that move.',
    ],
  },
  {
    id: 'cards-jail',
    title: 'Cards that send you to Jail',
    section: 'Cards',
    source: 'mega',
    body: 'If a card sends you to Jail, you go directly to Jail and do not collect $200 for passing GO.',
  },

  // --- Jail ---
  {
    id: 'jail-three-doubles',
    title: 'Three doubles in one turn',
    section: 'Jail',
    source: 'mega',
    body: 'If you roll doubles three times in one turn, go directly to Jail. Do not collect $200 for passing GO.',
  },
  {
    id: 'jail-getting-out',
    title: 'Getting out of Jail',
    section: 'Jail',
    source: 'mega',
    body: [
      'You can get out by: rolling doubles within 3 turns, using a Get Out of Jail Free card, or paying $50.',
      'If you fail to roll doubles by your 3rd turn, you pay $50 and then move by that roll.',
    ],
  },

  // --- Property ---
  {
    id: 'mortgage',
    title: 'Mortgaging property',
    section: 'Property',
    source: 'mega',
    body: [
      'You can mortgage a property you own if it has no improvements.',
      'Mortgaging gives you cash now; unmortgaging costs the mortgage value.',
    ],
  },
  {
    id: 'mega-build-all-but-one',
    title: 'Building in Mega (houses & hotels)',
    section: 'Property',
    source: 'mega',
    body: [
      'You may build houses and hotels once you own all but one property in a color group.',
      'You still build evenly across the group.',
    ],
  },
  {
    id: 'mega-skyscrapers',
    title: 'Skyscrapers',
    section: 'Property',
    source: 'mega',
    body: [
      'If you own all properties in a color group and have hotels on each, you may build Skyscrapers.',
      'Skyscraper cost and rent are shown on the property’s deed.',
    ],
  },
  {
    id: 'mega-triple-rent-unimproved',
    title: 'Triple rent on unimproved properties',
    section: 'Property',
    source: 'mega',
    body: 'When you own an entire color group, any unimproved (no houses/hotel/skyscraper) property in that group charges triple rent.',
  },
  {
    id: 'mega-rail-depots',
    title: 'Train Depots (railroads)',
    section: 'Property',
    source: 'mega',
    body: [
      'You can add a Train Depot to a railroad for $100 to increase its rent (see deed details).',
      'Depots can be sold back to the bank for $50.',
    ],
  },
  {
    id: 'mega-special-spaces',
    title: 'New Mega spaces',
    section: 'Movement',
    source: 'mega',
    body: [
      'Auction: choose an unowned property for the bank to auction.',
      'Birthday Gift: choose $100 from the bank OR take a Bus Ticket (if available).',
      'Bus Ticket space: take a Bus Ticket (if available).',
    ],
  },
  {
    id: 'first-round-buying',
    title: 'First round buying (house rule)',
    section: 'Property',
    source: 'home',
    body: 'Buying is unlocked after you have passed GO at least once (passing by teleport also counts).',
  },
];

