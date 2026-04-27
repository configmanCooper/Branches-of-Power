# Branches of Power — Development Plan

## 1. Game Overview

**Branches of Power** is a 4-player online multiplayer HTML5 strategy board game simulating the U.S. government's three branches. Each player controls one branch — **President**, **House of Representatives**, **Senate**, or **Supreme Court** — competing for Victory Points (VP) through legislation, political maneuvering, and constitutional conflict. The game focuses on *branch vs. branch*, not party vs. party — alliances shift constantly.

**Target Platform:** Browser-based HTML5, hostable on GitHub Pages  
**Multiplayer:** 4-player online via WebRTC peer-to-peer (no server needed for GitHub Pages hosting)  
**Tech Stack:** Vanilla JavaScript (IIFE modules), HTML5, CSS3, WebRTC via PeerJS  

---

## 2. Architecture

### 2.1 Project Structure

```
game/
├── index.html              # Entry point - lobby + game
├── css/
│   └── style.css           # All styles
├── js/
│   ├── main.js             # Entry point, game init, version, lobby management
│   ├── config.js            # ALL constants, rules, bill templates, voting ranges
│   ├── engine.js            # Core game engine: state, rounds, bills, elections, dice
│   ├── network.js           # WebRTC networking via PeerJS - host/join/sync
│   ├── player.js            # Per-player state, actions, VP/PC/Popularity tracking
│   ├── ui.js                # All UI rendering, panels, modals, action buttons
│   └── simulation.js        # AI simulation mode for testing (not used in multiplayer)
└── assets/
    └── (dice sounds, icons if needed)
```

### 2.2 Module Pattern

Each file uses IIFE pattern per html5gameassist guidance:

```javascript
var Engine = (function() {
    // Private state
    var state = { ... };
    // Public API
    return { init: ..., getState: ..., ... };
})();
```

### 2.3 Networking Architecture (WebRTC via PeerJS)

- **Host** creates a PeerJS peer and shares a room code (6-char alphanumeric)
- **Joiners** connect to host's peer ID using the room code
- **Host is authoritative** — all game state lives on host; clients send action requests, host validates and broadcasts state updates
- **Message protocol:** JSON messages with `{ type, payload, from, seq }` format
- **State sync:** After every action, host broadcasts full game state snapshot to all peers
- **Reconnection:** Peers can rejoin using same room code; host sends full state on reconnect
- **No server needed** — PeerJS uses free public signaling servers; actual data goes P2P

### 2.4 State Management

Single authoritative game state object on host:

```javascript
var gameState = {
    version: '1.0.0',
    round: 1,
    maxRounds: 10,
    phase: 'action',          // 'setup', 'action', 'election', 'gameOver'
    turnOrder: ['president', 'house', 'senate', 'supremeCourt'],
    currentTurnIndex: 0,
    currentActionInTurn: 0,   // 0-3 (4 actions per round per player)
    
    president: { party, popularity, vp, actionsUsed, executiveOrdersThisRound, ... },
    house:     { majorityParty, composition: { extremeDem, dem, rep, extremeRep }, pc, vp, actionsUsed, ... },
    senate:    { majorityParty, composition: { dem, modDem, modRep, rep }, pc, vp, actionsUsed, ... },
    supremeCourt: { justices: [ { leaning: 'conservative'|'moderate'|'liberal' } ], vp, actionsUsed, ... },
    
    currentBill: { partisanship, popularity, legality, name, type, ... } | null,
    passedBills: [],
    billPassedThisRound: false,
    billPassedByHouse: false,
    billPassedBySenate: false,
    
    perGameLimits: { witchhunts: 0, govShutdowns: 0, impeachments: 0, packCourts: false, ... },
    perRoundLimits: { ... },
    
    log: [],                  // Action log for display
    diceHistory: [],          // All dice rolls for transparency
};
```

---

## 3. Core Game Systems

### 3.1 Bill System

- Bills have three stats: **Partisanship** (1-20), **Popularity** (1-20), **Legality** (1-20)
- New bill generated each round (random or from "People's Bill" deck in config)
- Special bills: Tax Cuts, Impeachment, Pack the Courts — created by specific actions
- Bills track: who passed them, when, any markers ('E' for executive order, 'R' for repeal, 'C' for constitutional)

### 3.2 Voting System

- **Senate:** 100 senators across 4 factions (Dem, ModDem, ModRep, Rep) with defined voting ranges
- **House:** 435 representatives across 4 factions (ExtDem, Dem, Rep, ExtRep) with defined voting ranges
- Voting is deterministic based on composition + bill partisanship + PC modifiers
- Pass thresholds: Senate 60 (or 51 with 1 PC), House 218, special bills need 2/3

### 3.3 Election System

Elections happen at round boundaries:
- **Supreme Court:** Every round — d20 roll for death/retirement
- **House:** Every 2 rounds — multiple d20 rolls based on president popularity
- **Senate:** Every 2 rounds — d20 + 2d6 senators shift based on president popularity  
- **President:** Every 4 rounds — d20 vs popularity for reelection

### 3.4 Action System

Each player gets 4 action points per round. Actions are taken in turn order (President → House → Senate → Supreme Court), one action at a time, cycling through until all actions are used.

Actions are defined in config.js as data:
```javascript
ACTIONS: {
    president: {
        executiveOrder: { cost: 1, label: 'Executive Order', ... },
        advocateLegislation: { cost: 1, ... },
        veto: { cost: 1, condition: 'billPassedThisRound', ... },
        ...
    },
    ...
}
```

### 3.5 Dice System

All dice rolls happen on the host with results broadcast to all players. Transparent dice log visible to all.

---

## 4. Multiplayer Implementation

### 4.1 Lobby Flow

1. **Main Menu:** Host Game / Join Game
2. **Host:** Creates room, gets 6-char room code, sees lobby with connected players
3. **Join:** Enter room code, select available role (President/House/Senate/Supreme Court)
4. **Ready Up:** All 4 players must be connected and ready to start
5. **Game Start:** Host triggers game setup (initial rolls), broadcasts starting state

### 4.2 Message Types

```
HOST_STATE_UPDATE   - Full state sync (host → all)
PLAYER_ACTION       - Action request (client → host)  
ACTION_RESULT       - Action result with dice rolls (host → all)
CHAT_MESSAGE        - In-game chat (any → all via host)
PLAYER_READY        - Ready toggle in lobby
ROLE_SELECT         - Role selection in lobby
VOTE_REQUEST        - 3/4 vote requests (host → all)
VOTE_RESPONSE       - Vote response (client → host)
RECONNECT           - Rejoin request (client → host)
ELECTION_RESULT     - Election results broadcast (host → all)
```

### 4.3 Turn Enforcement

- Only the current player's action buttons are enabled
- Host validates all actions before applying
- If a player disconnects during their turn, 30-second timeout then skip
- Action timer: optional 2-minute sand timer (configurable)

### 4.4 Consensus Votes (3/4 Agreement)

Several rules require 3/4 player agreement (turn order change, bill staying on floor, etc.). Implementation:
- Host broadcasts vote request with description
- Each player votes yes/no via modal
- Host tallies and applies result
- 30-second timeout auto-votes "no"

---

## 5. UI Design

### 5.1 Layout

```
┌────────────────────────────────────────────────────────────────┐
│  BRANCHES OF POWER              Round 3/10    Room: ABC123     │
├───────────────┬────────────────────────────────┬───────────────┤
│               │                                │               │
│  PLAYER INFO  │        MAIN GAME AREA          │  ACTION LOG   │
│  ──────────── │   ┌──────────────────────┐     │  ──────────── │
│  🏛️ President │   │    CURRENT BILL      │     │  R3: Pres...  │
│  VP: 12       │   │  "Education Reform"  │     │  R3: House... │
│  Pop: 14      │   │  Part: 14  Pop: 12   │     │  R2: Senate..│
│  Party: (D)   │   │  Legality: 8         │     │               │
│               │   │  Status: On Floor    │     │               │
│  🏠 House     │   └──────────────────────┘     │               │
│  VP: 8        │                                │               │
│  PC: 3        │   ┌──────────────────────┐     │               │
│  Maj: (D)     │   │  COMPOSITION BARS    │     │               │
│               │   │  Senate: ████░░░░    │     │               │
│  🏛️ Senate    │   │  House:  █████░░░    │     │               │
│  VP: 10       │   │  Court:  ██░█░      │     │               │
│  PC: 2        │   └──────────────────────┘     │               │
│  Maj: (R)     │                                │               │
│               │   YOUR ACTIONS (if your turn)  │               │
│  ⚖️ Court     │   [Executive Order] [Veto]     │               │
│  VP: 6        │   [Advocate] [Sign Bill]       │               │
│               │   [Campaign] [Sue] ...         │               │
├───────────────┴────────────────────────────────┴───────────────┤
│  💬 Chat: ________________________________________________     │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Key UI Principles

1. **Always visible:** All 4 player stats, current bill, round counter, whose turn it is
2. **Action buttons:** Only enabled for current player; greyed out with reason for others
3. **Bill card:** Prominent center display with color-coded partisanship (blue ↔ red gradient)
4. **Composition bars:** Visual representation of Senate/House/Court makeup
5. **Dice rolls:** Animated dice display for transparency — all players see every roll
6. **Action log:** Scrollable history of all actions taken, color-coded by branch
7. **Tooltips:** Every button has a tooltip explaining cost, effect, and conditions
8. **Modals:** For complex actions (voting, bill modification, justice nomination)
9. **Mobile-responsive:** Stack panels vertically on narrow screens

### 5.3 Color Scheme

- **President:** Gold/Yellow (#DAA520)
- **House:** Green (#2E8B57)  
- **Senate:** Blue (#4169E1)
- **Supreme Court:** Purple (#6A0DAD)
- **Democrat:** Blue (#0000CD)
- **Republican:** Red (#CC0000)
- **Moderate:** Gray (#808080)
- **Bills:** Gradient based on partisanship (red 1 ↔ purple 10 ↔ blue 20)

---

## 6. Implementation Phases

### Phase 1: Foundation
- [ ] config.js — All game constants, action definitions, voting ranges, bill templates
- [ ] engine.js — Core state management, round flow, bill generation, dice rolling
- [ ] player.js — Player state tracking for all 4 roles

### Phase 2: Game Logic  
- [ ] All President actions
- [ ] All House actions  
- [ ] All Senate actions
- [ ] All Supreme Court actions
- [ ] Voting/bill passing calculations
- [ ] Election system (all 4 types)
- [ ] Passive actions and end-of-round processing

### Phase 3: UI
- [ ] index.html — Layout structure
- [ ] style.css — Full styling with responsive design
- [ ] ui.js — All rendering, action buttons, modals, bill display, composition bars
- [ ] Lobby UI (host/join/role select)

### Phase 4: Multiplayer
- [ ] network.js — PeerJS integration, host/join, message protocol
- [ ] State synchronization
- [ ] Turn enforcement
- [ ] Consensus voting system
- [ ] Reconnection handling
- [ ] Chat system

### Phase 5: Polish
- [ ] Dice animation
- [ ] Action validation with clear error messages  
- [ ] Tutorial/help overlays
- [ ] Sound effects (optional)
- [ ] Game length selection (6/10/custom rounds)

---

## 7. Key Design Decisions

1. **Host-authoritative:** Prevents cheating, simplifies state management
2. **Full state sync:** After every action, entire state is broadcast — simple, no desync issues
3. **PeerJS for WebRTC:** Free signaling server, no backend needed, works on GitHub Pages
4. **Vanilla JS:** Matches Merchant Realms pattern, no build step, instant deployment
5. **Data-driven actions:** All actions defined in config, engine just processes them
6. **Transparent dice:** Every roll visible to all players with full history

## 8. Lessons Applied from Merchant Realms

- **Centralized config:** Every magic number in config.js
- **IIFE modules:** Clean separation, no global pollution
- **Data-action UI pattern:** Delegated click handlers, not inline onclick
- **Defensive coding:** Always default values, guard against undefined
- **State serialization:** Single state object, JSON-friendly, no Sets
- **node --check after every edit:** Syntax validation
- **Surgical edits:** Never rewrite large sections, make targeted changes
