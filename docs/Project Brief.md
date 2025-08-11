# Monopoly Tracker – Project Brief

## 🎯 Goal
A web app to track Mega Monopoly games with custom house rules, including:
- Player rolls
- Positions
- Purchases
- Payments
- Cards drawn
- Winner
- Custom dice & betting rules

---

## 🏠 House Rules
- $1,000 in Free Parking at game start
- All taxes and fees go into Free Parking pot
- $100 bet per participating player for “first around the board” pot
- Special dice: 2 standard d6 + 1 custom die with faces:
  ```
  1, 2, 3, +1 (Monopoly Man), -1 (Monopoly Man), Bus
  ```
- Bus: Player chooses any unvisited property in current or next set
- +1/-1: Adds or subtracts one step from total movement

---

## 📋 MVP Features
1. **Game Setup**
   - Create a new game with players, colors, bet opt-in
   - Set house rules
   - Seed Free Parking and Bet Pot automatically

2. **Round & Turn Tracking**
   - Round counter (full cycle of all players)
   - Dice input → auto-move player on board
   - Undo last action

3. **Position & Actions**
   - Auto-update position from dice
   - Mark “Passed GO” and payout
   - Track purchases, rent, taxes
   - Add to Free Parking pot
   - Resolve Bet Pot win

4. **Cards & Specials**
   - Log Chance / Community Chest draws
   - Bus pass use
   - Monopoly Man triggers

5. **Game Completion**
   - Declare winner
   - Show timeline summary

---

## 🗄 Data Model
See `/src/types/monopoly-schema.ts` for detailed interfaces.

Key entities:
- **Game**: overall session data
- **Player**: name, money, position, properties
- **Turn**: rolls, movement, actions
- **Action**: purchase, rent, card, etc.
- **BoardTile**: board metadata
- **GameSettings**: house rule configuration

---

## 🖥 Suggested Stack
- React + TypeScript
- Zustand for state management
- Vite for build
- TailwindCSS (optional)

---

## 🔜 Future Features
- Visual board UI
- Stats dashboard
- Multiplayer sync
- Save/load games
