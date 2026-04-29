# Branches of Power — Human Developer Guide

> **Version:** 3.1.0  
> **Last Updated:** April 2026  
> **Repository:** [github.com/configmanCooper/Branches-of-Power](https://github.com/configmanCooper/Branches-of-Power)

---

## Table of Contents

1. [What Is This Game?](#1-what-is-this-game)
2. [Project Structure](#2-project-structure)
3. [Architecture Overview](#3-architecture-overview)
4. [Module Reference](#4-module-reference)
5. [Game State Object](#5-game-state-object)
6. [Game Flow & Lifecycle](#6-game-flow--lifecycle)
7. [Bill System](#7-bill-system)
8. [Deal System](#8-deal-system)
9. [AI System](#9-ai-system)
10. [Event System](#10-event-system)
11. [Multiplayer Architecture](#11-multiplayer-architecture)
12. [UI System](#12-ui-system)
13. [CSS & Theming](#13-css--theming)
14. [How to Add a New Action](#14-how-to-add-a-new-action)
15. [How to Add a New Event](#15-how-to-add-a-new-event)
16. [How to Add a New AI Personality](#16-how-to-add-a-new-ai-personality)
17. [How to Add a New Deal Type](#17-how-to-add-a-new-deal-type)
18. [How to Change Balance Values](#18-how-to-change-balance-values)
19. [How to Add a New UI Panel or Modal](#19-how-to-add-a-new-ui-panel-or-modal)
20. [Multiplayer Testing](#20-multiplayer-testing)
21. [Hosting on GitHub Pages](#21-hosting-on-github-pages)
22. [Common Pitfalls](#22-common-pitfalls)
23. [Key Balance Constants](#23-key-balance-constants)

---

## 1. What Is This Game?

Branches of Power is a **4-player political strategy board game** built as a single HTML5 page. Players control the four branches of U.S. government:

| Role | Icon | What They Do |
|------|------|-------------|
| **President** | 🏛️ | Signs/vetoes bills, campaigns, executive orders, popularity management |
| **House** | 🏠 | Passes/kills bills, impeaches, packs courts, whips votes |
| **Senate** | 🏛️ | Passes/filibusters bills, confirms justices, government shutdowns |
| **Supreme Court** | ⚖️ | Reviews bills, sets precedents, landmark rulings, judicial power |

Players earn **Victory Points (VP)** through actions, deals, and end-game bonuses. Highest VP at game end wins. Games last 6–24 rounds depending on settings.

The game supports **local play** (1 human + 3 AI) and **online multiplayer** (2–4 humans via WebRTC peer-to-peer, no server required). It is hosted on GitHub Pages.

---

## 2. Project Structure

```
Branches of Power/
├── game/                          ← THE PLAYABLE GAME (deploy this folder)
│   ├── index.html                 ← Single-page app shell
│   ├── css/
│   │   └── style.css              ← All styles (~28KB)
│   ├── js/
│   │   ├── config.js              ← Constants, balance values, roles
│   │   ├── ai.js                  ← AI personalities & decision logic
│   │   ├── events.js              ← 50+ crisis events, resolution/failure
│   │   ├── engine.js              ← Core game engine (state, actions, rounds)
│   │   ├── network.js             ← PeerJS/WebRTC multiplayer
│   │   ├── ui.js                  ← All rendering, modals, input handling
│   │   └── main.js                ← Entry point, wires modules together
│   ├── assets/                    ← (reserved for images/sounds)
│   ├── CHANGELOG.md
│   ├── README.md
│   └── VERSION
├── development/                   ← Dev docs, audits, simulations
│   ├── BranchesOfPowerDevelopmentPlan.md
│   ├── simulation.js              ← Game simulation runner
│   ├── batch_simulation.js        ← Multi-game batch simulator
│   ├── plans/                     ← Implementation plans
│   └── *.md                       ← Various audit documents
├── Branches of Power.txt          ← Original design document
└── Branches of Power_ Rulebook.txt ← Full rules reference
```

### Deployment

The `game/` folder is the entire deployed application. Push it to GitHub and enable GitHub Pages on the root. No build step, no bundler, no npm — just static files.

---

## 3. Architecture Overview

### Module Pattern

Every JS file uses the **IIFE (Immediately Invoked Function Expression)** pattern:

```javascript
var ModuleName = (function() {
    'use strict';
    // private variables and functions
    return {
        // public API
    };
})();
```

All modules are **global variables** — there is no import/export system. They communicate through their public APIs.

### Script Load Order (Critical!)

Scripts are loaded in `index.html` in **strict dependency order**:

```
config.js → ai.js → events.js → engine.js → network.js → ui.js → main.js
```

- `config.js` has no dependencies (must be first)
- `ai.js` depends on `Config`
- `events.js` depends on `Config`
- `engine.js` depends on `Config`, `GameEvents`
- `network.js` depends on `Config`, `Engine`
- `ui.js` depends on `Config`, `Engine`, `Network`, `GameAI`
- `main.js` depends on all of the above

**If you add a new module**, you must add a `<script>` tag in the right position in `index.html`.

### Data Flow

```
User Click → UI (event delegation) → Network.localAction() → Engine.executeAction()
                                                                    ↓
                                                              State mutated
                                                                    ↓
                                                        Network broadcasts state
                                                                    ↓
                                                            UI.renderGame(state)
```

In multiplayer:
```
Client Click → Network.sendAction() → [WebRTC] → Host receives
                                                       ↓
                                          Engine.executeAction() on host
                                                       ↓
                                              Host broadcasts state to all
                                                       ↓
                                              All clients: UI.renderGame()
```

---

## 4. Module Reference

### `Config` (config.js)

The configuration singleton. All game constants live here. **No game logic.**

| Export | Type | Description |
|--------|------|-------------|
| `VERSION` | string | Current game version (e.g., "3.1.0") |
| `GAME_LENGTHS` | object | `{short: {rounds:6}, standard: {rounds:10}, extended: {rounds:24}}` |
| `ROLES` | array | `['president', 'house', 'senate', 'supremeCourt']` |
| `ROLE_LABELS` | object | Human-readable names: `{president: 'President', house: 'House', ...}` |
| `ROLE_ICONS` | object | Emoji icons per role |
| `ROLE_COLORS` | object | CSS colors per role |
| `FACTIONS` | object | Vote probability ranges per faction (extremeDem, democrat, moderate, republican, extremeRep) |
| `JUSTICE_LEANINGS` | object | SC justice vote ranges (liberal, moderate, conservative) |
| `SENATE_TOTAL` | number | 100 senators |
| `SENATE_PASS_THRESHOLD` | number | 60 votes to pass |
| `SENATE_PASS_WITH_PC` | number | 51 votes with PC spent |
| `SENATE_SUPERMAJORITY` | number | 67 for overrides |
| `HOUSE_TOTAL` | number | 435 representatives |
| `HOUSE_PASS_THRESHOLD` | number | 218 to pass |
| `HOUSE_SUPERMAJORITY` | number | 288 for overrides |
| `COURT_DEFAULT_SIZE` | number | 9 justices |
| `COURT_PACKED_SIZE` | number | 13 (after Pack the Courts) |
| `MAX_PC_CARRYOVER` | number | 4 PC max between rounds |
| `BILL_STAT_MIN/MAX` | number | 1–20 range for bill stats |
| `POPULARITY_MIN/MAX/START` | number | 1–20, starts at 10 |
| `BILL_NAMES` | array | 30 bill name strings |
| `BILL_DESCRIPTIONS` | object | Flavor text for each bill name |
| `GLOSSARY` | object | Stat explanations (VP, PC, JP, Pop, etc.) |
| `PER_GAME_LIMITS` | object | Caps on special actions (witchhunts, shutdowns, impeachments, etc.) |
| `ACTION_TOOLTIPS` | object | Detailed text for every action |

### `Engine` (engine.js)

The **core game engine**. Owns all game state and logic. This is the largest file (~3700 lines).

| Export | Signature | Description |
|--------|-----------|-------------|
| `init(gameLength)` | → state | Creates initial state, generates first bill. `gameLength`: 'short'\|'standard'\|'extended' |
| `getState()` | → state | Returns the current state object (by reference) |
| `setState(s)` | void | Replaces state (used for network sync) |
| `getCurrentRole()` | → string | Which role is currently acting |
| `getAvailableActions(role)` | → array | Returns `[{id, label, cost, description}]` for the role |
| `executeAction(role, actionId, params)` | → result | Runs the action. Returns `{success, message}` |
| `skipRemainingActions()` | void | Ends the current player's turn |
| `proposeDeal(from, to, askType, offerType, message, askBillId, offerBillId, askDetail, offerDetail)` | → deal | Creates a pending deal |
| `respondToDeal(dealId, accept)` | → result | Accept or reject a pending deal |
| `counterDeal(dealId, counterAsk, counterOffer, msg, askBillId, offerBillId)` | → result | Reject + counter-propose |
| `fulfillDeal(dealId)` | → result | Mark deal fulfilled (+1 VP both parties) |
| `breakDeal(dealId)` | → result | Break promise (-2 trust, VP penalty) |
| `getActiveDeals()` | → array | All non-resolved deals |
| `getPendingDealsForRole(role)` | → array | Deals waiting for this role to respond |
| `getAcceptedDealsForRole(role)` | → array | Deals this role accepted (promises to fulfill) |
| `adjustTrust(from, to, amount)` | void | Modify trust value (0–10) |
| `getAvailableActions(role)` | → array | Actions the role can take right now |
| `calculateSenateVotes(bill, pcUsed)` | → result | Simulates Senate vote |
| `calculateHouseVotes(bill, pcUsed)` | → result | Simulates House vote |
| `calculateJudicialReview(bill)` | → result | SC review outcome |
| `generateBill()` | → bill | Random bill with name/stats |
| `getActiveBill()` | → bill\|null | Currently active bill on floor |
| `addBillToFloor(bill)` | void | Adds bill to `state.bills` |
| `removeBillFromFloor(billId)` | void | Removes bill |
| `getBillById(id)` | → bill\|null | Lookup bill |
| `setActiveBill(billId)` | void | Change which bill is selected |
| `getSenateMajority()` | → string | 'democrat'\|'republican' |
| `getHouseMajority()` | → string | 'democrat'\|'republican' |
| `getCourtMajority()` | → string | 'liberal'\|'conservative'\|'balanced' |
| `rollD20()` | → number | Random 1–20 |
| `rollD6()` | → number | Random 1–6 |
| `getStability()` | → number | Current stability (0–10) |
| `getActiveEvent()` | → event\|null | Current crisis event |
| `trackVP(role, amount, source)` | void | Record VP source for scorecards |
| `DEAL_TYPES` | object | All deal type definitions |
| `DEAL_DETAILS` | object | Sub-options for deal types (e.g., updateBill directions) |
| `getWinner()` | → {role, vp} | Highest VP player |

**Key internal functions** (not exported, but important to know):
- `advanceTurn()` — cycles to next player; triggers `endRound()` when all players done
- `endRound()` — PC caps, elections, stability checks, event triggers, VP bonuses, round summaries
- `createInitialState(gameLength)` — builds the full state object
- All action handlers: `presidentExecutiveOrder()`, `housePassBill()`, `senateUpdateBill()`, `courtJudicialReview()`, etc.

### `Network` (network.js)

Handles all multiplayer communication via PeerJS/WebRTC.

| Export | Signature | Description |
|--------|-----------|-------------|
| `hostGame(playerName)` | void | Creates a room, generates room code, becomes host |
| `joinGame(code, playerName)` | void | Connects to host's peer ID |
| `selectRole(role)` | void | Claims a role in the lobby |
| `setReady()` | void | Marks player as ready |
| `startGame(gameLength)` | void | Host starts the game |
| `sendAction(actionId, params)` | void | Send action to host for execution |
| `sendChat(message)` | void | Broadcast chat message |
| `respondToVote(approve)` | void | Vote on consensus actions |
| `disconnect()` | void | Leave the game |
| `startLocalGame(gameLength)` | void | Start local game (no networking) |
| `localAction(role, actionId, params)` | result | Execute action locally (used in local games) |
| `isHost()` | → bool | Am I the host? |
| `getMyRole()` | → string | My assigned role |
| `setMyRole(role)` | void | Set my role (local mode) |
| `getRoomCode()` | → string | Current room code |
| `getLobby()` | → object | Lobby state (players, roles, ready status) |
| `onStateUpdate(fn)` | void | Register state sync callback |
| `onLobbyUpdate(fn)` | void | Register lobby update callback |
| `onChatMessage(fn)` | void | Register chat callback |
| `onActionResult(fn)` | void | Register action result callback |
| `onVoteRequest(fn)` | void | Register vote callback |
| `onError(fn)` | void | Register error callback |
| `onConnected(fn)` | void | Register connection callback |

### `GameAI` (ai.js)

AI player decision-making and personality system.

| Export | Signature | Description |
|--------|-----------|-------------|
| `PERSONALITIES` | object | All personality presets by role |
| `getPersonalities(role)` | → array | Available personalities for a role |
| `getRandomPersonality(role)` | → personality | Pick random personality |
| `setAI(role, enabled, personalityName)` | void | Enable AI for a role |
| `isAI(role)` | → bool | Is this role AI-controlled? |
| `getAIConfig(role)` | → config | Get AI settings for role |
| `resetAI()` | void | Clear all AI configurations |
| `getAIDecision(role, state, actions)` | → {id, params} | Choose which action to take |
| `respondToDeal(aiRole, fromRole, askType, offerType, state)` | → bool | Accept or reject deal |
| `generateCounteroffer(aiRole, fromRole, askType, offerType, state)` | → counter\|null | Counter-proposal when rejecting |
| `getAIDealProposal(aiRole, playerRole, state)` | → proposal\|null | AI proactively proposes a deal |

### `GameEvents` (events.js)

Crisis event definitions and resolution logic.

Contains an `EVENT_POOL` of 50+ events, each with:
- `name`, `category`, `severity`, `description`
- `deadline` (rounds to resolve)
- `failPenalty` (VP loss, stability loss, composition shifts, etc.)
- `resolutions` (array of resolution options with costs/rewards)
- `specialActions` (optional special actions available during event)

Plus 3 catch-up events that trigger when VP gap > 20.

### `UI` (ui.js)

All rendering and user input. ~1700 lines.

| Export | Signature | Description |
|--------|-----------|-------------|
| `init()` | void | Sets up event delegation, keyboard shortcuts |
| `renderMainMenu()` | void | Shows the main menu screen |
| `renderLobby()` | void | Shows lobby with role selection |
| `renderGame(state)` | void | Full game board re-render |
| `showToast(msg, type)` | void | Toast notification ('success'\|'error'\|'info') |
| `addChatMessage(msg)` | void | Append to chat log |
| `showVoteModal(description)` | void | Consensus vote dialog |

Key internal renderers: `renderPlayerStats()`, `renderBillsPanel()`, `renderBillCard()`, `renderCompositionBars()`, `renderActions()`, `renderDealsPanel()`, `renderActionLog()`, `renderGameOver()`.

### `Game` (main.js)

Entry point. Wires UI + Network + Engine callbacks. Very small (~60 lines).

```javascript
document.addEventListener('DOMContentLoaded', function() { Game.init(); });
```

---

## 5. Game State Object

The state object (returned by `Engine.getState()`) is the **single source of truth**. Here's its structure:

```javascript
{
    version: "3.1.0",
    round: 1,                    // Current round number
    maxRounds: 10,               // Total rounds in game
    phase: "action",             // Always "action" during gameplay
    turnOrder: ["president", "house", "senate", "supremeCourt"],
    currentTurnIndex: 0,         // Index into turnOrder
    currentActionInTurn: 0,      // Actions taken this turn

    president: {
        party: "democrat",       // "democrat" or "republican" (random at start)
        popularity: 10,          // 1–20
        vp: 0,                   // Victory Points
        actionsRemaining: 4,     // Actions left this turn
        executiveOrdersThisRound: 0,
        executiveOrdersTotal: 0,
        termsServed: 0,
        roundsInCurrentTerm: 0,
        witchhuntsUsed: 0,
        totalNominations: 0,
        executivePrivilegeUsed: false,
        stateDinnerUsedThisRound: false,
        // ...other tracking flags
    },

    house: {
        composition: { extremeDem: N, democrat: N, moderate: N, republican: N, extremeRep: N },
        majorityParty: "democrat",
        pc: 0,                   // Political Capital
        vp: 0,
        actionsRemaining: 4,
        billsPassedTotal: 0,
        // ...usage flags (killBillUsedThisRound, etc.)
    },

    senate: {
        composition: { /* same shape as house */ },
        majorityParty: "republican",
        pc: 0,
        vp: 0,
        actionsRemaining: 4,
        filibustersUsedTotal: 0,
        billsPassedTotal: 0,
        // ...usage flags
    },

    supremeCourt: {
        justices: [{ leaning: "liberal" }, ...],  // 9 justices (or 13 if packed)
        vp: 0,
        jp: 0,                   // Judicial Power (unique to SC)
        actionsRemaining: 4,
        courtSize: 9,
        isPacked: false,
        landmarkRulingUsed: false,
        courtAuthorityRoundsLeft: 0,  // Landmark Ruling duration
        // ...usage flags
    },

    // Bills
    bills: [{ id, name, partisanship, popularity, legality, passedByHouse, passedBySenate, stalled }],
    activeBillId: 1,
    passedBills: [],
    precedents: [],
    unconstitutionalBills: [],

    // Turn flow flags
    billPassedThisRound: false,
    billPassedByHouse: false,
    billPassedBySenate: false,
    billVetoedThisRound: false,
    billKilledThisRound: false,

    // Trust & Deals
    trust: {
        president: { house: 5, senate: 5, supremeCourt: 5 },
        house:     { president: 5, senate: 5, supremeCourt: 5 },
        // ... (all pairs, 0–10 scale, start at 5)
    },
    deals: [],          // Active deals
    dealCounter: 0,
    dealHistory: [],    // All deals ever made

    // Stability & Events
    stability: 5,       // 0–10 (low = crisis)
    stabilityMax: 10,
    activeEvent: null,   // Current event object or null
    queuedEvent: null,
    eventHistory: [],
    eventCooldown: 0,

    // Tracking
    log: [],            // Action log entries
    vpSources: { president: [], house: [], senate: [], supremeCourt: [] },
    roundSummaries: [],
    perGameLimits: { /* caps on special actions */ }
}
```

**IMPORTANT:** The state is **mutated in place** by engine functions. It is NOT immutable. When the host broadcasts state, clients receive a JSON copy and `Engine.setState()` replaces the module-level `state` reference.

---

## 6. Game Flow & Lifecycle

### Startup
```
DOM Ready → Game.init() → UI.init() → Network callbacks wired → UI.renderMainMenu()
```

### Menu → Game
1. **Main Menu**: Player chooses Host/Join/Local
2. **Host/Join**: Network creates/joins PeerJS room → Lobby renders
3. **Lobby**: Players select roles, mark ready. Host clicks Start
4. **Start**: `Engine.init(gameLength)` creates state → `UI.renderGame(state)`

### Turn Cycle
```
Round N begins
  ├── President acts (4 actions, or more with Executive Privilege)
  ├── House acts (4 actions)
  ├── Senate acts (4 actions)
  └── Supreme Court acts (4 actions)
      └── endRound() triggers:
          ├── PC capping (max 4 carryover)
          ├── Popularity bonus VP for president (if pop ≥ 12)
          ├── SC "no bill passed" bonus
          ├── Precedent dividend VP
          ├── Deal expiration
          ├── Event resolution/failure check
          ├── Stability adjustment
          ├── Election check (every 4 rounds)
          ├── New bill generation
          ├── VP source tracking
          └── Round summary snapshot
```

### Elections
- **Presidential election**: Every 4 rounds. If popularity < 10, president loses 3 VP and party may flip.
- **Midterm election**: Round 2 in each term. Can shift chamber compositions.

### Game End
- After `maxRounds` rounds, `endRound()` calculates end-game bonuses:
  - Legislative Legacy (+3 VP for most bills passed)
  - Constitutional Guardian (+3 VP for 2+ struck-down bills)
  - Diplomat (+3 VP for most deals fulfilled)
  - Crisis Manager (+3 VP for most events resolved)
  - Stability Champion (+3 VP for Unity Summit participants if stability ≥ 8)
  - Popular Leader (+3 VP if president maintained pop ≥ 12 for 3+ rounds)
  - Legislative Powerhouse (+3 VP if house passed 6+ bills)
  - Master Obstructionist (+3 VP if senate blocked 4+ bills)
  - Judicial Authority (+3 VP if SC made 3+ rulings)
- `UI.renderGameOver()` shows final scores

---

## 7. Bill System

### Bill Object
```javascript
{
    id: 1,
    name: "Healthcare Access Bill",
    partisanship: 14,    // 1=far right, 10=center, 20=far left
    popularity: 12,      // 1–20
    legality: 8,         // 1–20
    passedByHouse: false,
    passedBySenate: false,
    stalled: false
}
```

### Bill Lifecycle
1. **Generated** by `generateBill()` with random name and stats
2. **On floor** — players can advocate, attack, support, update stats
3. **House votes** — roll d20 per representative, compare to faction thresholds + bill stats
4. **Senate votes** — same mechanic but with 100 senators
5. **Both pass** → bill goes to president
6. **President signs** → bill moves to `passedBills`, +4 VP
7. **President vetoes** → requires 2/3 supermajority to override
8. **President sues** → SC gets to do Judicial Review
9. **SC Judicial Review** → may strike down (→ `unconstitutionalBills`, sets precedent)

### How Votes Work
Each legislator rolls a d20. Their faction defines a range (e.g., Democrats vote yes if roll is between `voteYesMin` and `voteYesMax`). Bill popularity and partisanship shift the range. PC expenditure adds bonus votes.

---

## 8. Deal System

### Deal Object
```javascript
{
    id: 1,
    from: "president",       // Who proposed
    to: "senate",            // Who it's proposed to
    askType: "passBillSenate", // What you want them to do
    offerType: "signBill",    // What you'll do in return
    askBillId: 1,             // Optional: specific bill
    offerBillId: null,
    askBillName: "Healthcare Bill",
    offerBillName: "",
    askDetail: "increase_popularity",  // Optional: specific direction
    offerDetail: null,
    message: "Pass my bill please!",
    round: 1,
    status: "pending",        // pending → accepted/rejected/countered
    isCounteroffer: false,    // true if this was a counter-proposal
    originalDealId: null      // links to original deal if counteroffer
}
```

### Deal Flow
```
Player proposes deal → status: "pending"
  ├── Target accepts → status: "accepted"
  │     ├── Fulfiller fulfills → status: "fulfilled" (+1 VP both, trust++)
  │     └── Fulfiller breaks → status: "broken" (-2 VP, trust--)
  ├── Target rejects → status: "rejected" (trust-)
  └── Target counters → status: "countered" (new reverse deal created)
```

### Deal Types
Defined in `Engine.DEAL_TYPES`. Each has:
- `label`: Display name
- `roles`: Which roles can perform this action
- `billRelated`: (optional) If true, show bill selector in UI

### Deal Details
Some deal types have sub-options in `Engine.DEAL_DETAILS`:
- `updateBill`: increase/decrease popularity, legality, partisanship, center
- `advocate/admonish`: target House, Senate, or both
- `confirmJustice`: confirm or reject
- `reviewBill`: strike down or uphold

---

## 9. AI System

### Personality Traits
Each AI personality has 6 numeric traits (0.0–1.0):

| Trait | Affects |
|-------|---------|
| `riskLevel` | Willingness to take costly actions |
| `legislativeFocus` | Priority on bill-related actions |
| `baseLieRate` | Chance of breaking deals |
| `negotiationRate` | Frequency of deal proposals |
| `aggressiveness` | Preference for hostile actions |
| `cooperation` | Willingness to cooperate and accept deals |

### How AI Decides
1. **Deal proposal** (30% chance): AI picks highest-trust target, generates a role-appropriate proposal
2. **Event resolution**: If stability is low, AI prioritizes resolving events
3. **Unity Summit**: Cooperative AIs agree to summits
4. **Role-specific logic**: Each role has its own priority-weighted action picker:
   - President: Signs bills when possible, vetoes misaligned bills, campaigns when popularity is low
   - House: Passes aligned bills, kills misaligned ones, uses whip/hearing for VP
   - Senate: Passes/filibusters based on alignment, updates bill stats strategically
   - Supreme Court: Reviews misaligned bills, uses landmark rulings, writes opinions

### AI Deal Response
When a human proposes a deal to an AI:
1. AI evaluates accept chance based on cooperation, trust, deal difficulty
2. If accepts → deal accepted
3. If rejects → 40–65% chance of **counteroffer** (generates a reverse proposal with what the AI actually wants)
4. If no counteroffer → flat rejection

---

## 10. Event System

### Event Object Shape
```javascript
{
    id: "govt_shutdown_crisis",
    name: "Government Shutdown Crisis",
    category: "political",     // political, economic, social, military, environmental
    severity: "high",          // low, medium, high, critical
    description: "...",
    deadline: 2,               // Rounds to resolve before failure
    failPenalty: {
        stability: -2,
        vp: { president: -3, house: -2, senate: -2 }
    },
    resolutions: [
        {
            description: "Pass emergency funding",
            requiredRoles: ["house", "senate"],
            cooperative: true,
            cost: { house: { pc: 2 }, senate: { pc: 2 } },
            reward: { stability: 2, vp: { house: 1, senate: 1 } }
        }
    ],
    specialActions: [...]
}
```

### Event Lifecycle
1. Events trigger based on stability level and cooldown timer in `endRound()`
2. Active event renders as a banner in the UI with countdown
3. Players can spend resources/actions to resolve
4. If deadline passes without resolution → `failPenalty` applied
5. Resolved events go to `eventHistory`

---

## 11. Multiplayer Architecture

### Technology
- **PeerJS** (WebRTC wrapper) loaded from CDN
- Peer-to-peer: no game server needed
- STUN servers for NAT traversal (Google + public STUN)

### Room System
- Host generates 6-character alphanumeric room code
- Host's PeerJS peer ID = `bop-{ROOMCODE}` (e.g., `bop-ABC123`)
- Clients connect to this peer ID

### Host Authority
The host is the **authoritative game server**:
1. Only the host runs `Engine.executeAction()`
2. Clients send action requests to host
3. Host validates (checks role matches sender) and executes
4. Host broadcasts updated state to all clients
5. Clients just render whatever state they receive

### Local Mode
- `roomCode = 'LOCAL'`
- `Network.localAction()` directly calls `Engine.executeAction()` and returns the result
- No PeerJS involved

### Host Migration
If the host disconnects:
1. Remaining clients detect the disconnect
2. They elect a new host (first in `Config.ROLES` order)
3. New host creates peer with ID `bop-{ROOMCODE}-m`
4. Other clients reconnect to the migrated host
5. New host restores the last known state

---

## 12. UI System

### Event Delegation
All click handling uses **event delegation** on `document`. Buttons use `data-action` attributes:

```html
<button data-action="executiveOrder">Executive Order</button>
```

The `UI.init()` function has a single click listener that reads `data-action` and routes to the appropriate handler.

### Rendering
The UI is **fully re-rendered** on every state update. There is no virtual DOM or diffing — the entire `#game-content` innerHTML is replaced. This is simple but means:
- No persistent DOM state (scroll positions reset)
- No input state preservation during re-render
- Performance is fine for this game's complexity

### Key UI Components
- **Header**: Round counter, election warning, VP scoreboard with delta indicators, turn order strip
- **Player Panel** (left): Cards for each role showing VP, PC/JP, Pop, trust
- **Center Panel**: Bill cards with stats, composition bars, event banner
- **Right Panel**: Actions grid, deals panel, chat, action log
- **Modals**: Used for deal proposals, bill updates, vote confirmations, game over

### Toast System
```javascript
UI.showToast("Message here", "success"); // green
UI.showToast("Error!", "error");          // red
UI.showToast("Info", "info");             // blue
```
Toasts auto-dismiss after ~3 seconds.

---

## 13. CSS & Theming

### Color Scheme
Dark theme defined in `:root` CSS variables:
- Background: `#0f0f23` (deep navy)
- Panel: `#1a1a2e` (dark blue)
- Accent: `#e94560` (coral red)
- Text: `#eee`

### Role Colors
- President: `#FFD700` (gold)
- House: `#4CAF50` (green)
- Senate: `#2196F3` (blue)
- Supreme Court: `#9C27B0` (purple)

### Responsive Breakpoints
```css
@media (max-width: 900px)  { /* Tablet: stack columns */ }
@media (max-width: 600px)  { /* Mobile: full-width, compact UI */ }
@media (max-width: 380px)  { /* Small phone: minimize padding */ }
@media (pointer: coarse)   { /* Touch devices: larger tap targets */ }
```

---

## 14. How to Add a New Action

**Example:** Adding "Televised Address" for the President (+2 VP, +3 Pop, costs 2 actions)

### Step 1: Add to available actions (engine.js)

Find the `getAvailableActions(role)` function. In the `case 'president':` block, add:

```javascript
if (rs.actionsRemaining >= 2 && !rs.televisedAddressUsedThisRound) {
    actions.push({
        id: 'televisedAddress',
        label: 'Televised Address',
        cost: 2,
        description: '+2 VP, +3 Pop (once/round)'
    });
}
```

### Step 2: Add the handler function (engine.js)

Create the function that executes the action:

```javascript
function presidentTelevisedAddress() {
    if (state.president.televisedAddressUsedThisRound) {
        return { success: false, message: 'Already used this round.' };
    }
    if (state.president.actionsRemaining < 2) {
        return { success: false, message: 'Need 2 actions.' };
    }
    state.president.actionsRemaining -= 2;
    state.president.vp += 2;
    state.president.popularity = clampPopularity(state.president.popularity + 3);
    state.president.televisedAddressUsedThisRound = true;
    addLog('president', 'Televised Address', '+2 VP, +3 Popularity');
    advanceTurn();
    return { success: true, message: 'Televised Address delivered!' };
}
```

### Step 3: Wire up in executeAction (engine.js)

Find the `executeAction()` switch statement and add:

```javascript
case 'televisedAddress': actionResult = presidentTelevisedAddress(); break;
```

### Step 4: Reset per-round flag (engine.js)

In `endRound()`, find where round flags reset and add:

```javascript
state.president.televisedAddressUsedThisRound = false;
```

### Step 5: Initialize the flag (engine.js)

In `createInitialState()`, add to the president object:

```javascript
televisedAddressUsedThisRound: false
```

### Step 6: (Optional) Add tooltip (config.js)

```javascript
televisedAddress: 'Address the nation on TV. Costs 2 actions. +2 VP, +3 Popularity. Once per round.'
```

### Step 7: (Optional) Add deal type (engine.js)

If this should be proposable in deals, add to `DEAL_TYPES`:

```javascript
televisedAddress: { label: 'Give a Televised Address', roles: ['president'] }
```

### Step 8: (Optional) Add AI logic (ai.js)

In `presidentAI()`, add a priority entry:

```javascript
if (ids.indexOf('televisedAddress') !== -1)
    priorities.push({ id: 'televisedAddress', params: {}, weight: 8 + p.cooperation * 3 });
```

---

## 15. How to Add a New Event

Events live in `events.js`. Find the `EVENT_POOL` array and add:

```javascript
{
    id: 'cyber_attack',
    name: 'National Cyber Attack',
    category: 'military',
    severity: 'high',
    description: 'A massive cyber attack targets government systems.',
    deadline: 2,
    failPenalty: {
        stability: -3,
        vp: { president: -2, house: -1, senate: -1, supremeCourt: -1 }
    },
    resolutions: [
        {
            description: 'Emergency cybersecurity funding',
            requiredRoles: ['house', 'senate'],
            cooperative: true,
            cost: { house: { pc: 3 }, senate: { pc: 2 } },
            reward: { stability: 2, vp: { house: 2, senate: 1 } }
        },
        {
            description: 'Presidential executive order on cyber defense',
            requiredRoles: ['president'],
            cost: { president: { popularity: -2 } },
            reward: { stability: 1, vp: { president: 2 } }
        }
    ]
}
```

No other files need changes — the event system automatically picks from the pool.

---

## 16. How to Add a New AI Personality

In `ai.js`, add to the appropriate role's personality array:

```javascript
president: [
    // ... existing personalities
    {
        name: 'Wartime President',
        riskLevel: 0.8,
        legislativeFocus: 0.3,
        baseLieRate: 0.1,
        negotiationRate: 0.4,
        aggressiveness: 0.7,
        cooperation: 0.4
    }
],
```

The AI system will automatically use these traits in decision-making. No other changes needed — the trait values drive all behavior.

---

## 17. How to Add a New Deal Type

### Step 1: Add to DEAL_TYPES (engine.js)

```javascript
terroristNegotiation: { label: 'Negotiate with foreign power', roles: ['president'], billRelated: false }
```

### Step 2: (Optional) Add detail options (engine.js)

If the deal type has sub-choices:

```javascript
// In DEAL_DETAILS:
terroristNegotiation: [
    { value: 'sanctions', label: 'Impose sanctions' },
    { value: 'diplomacy', label: 'Open diplomatic channels' }
]
```

### Step 3: (Optional) Add AI deal proposals (ai.js)

In `getAIDealProposal()`, add to the appropriate role section:

```javascript
if (aiRole === 'president') {
    proposals.push({ ask: 'general', offer: 'terroristNegotiation', msg: 'I\'ll negotiate with our allies.' });
}
```

---

## 18. How to Change Balance Values

### VP Gains/Costs
Search engine.js for the action handler function. VP changes are direct mutations:
```javascript
state.president.vp += 2;  // Change this number
```

### PC Costs
Same pattern — find the handler, look for:
```javascript
if (state.senate.pc < 4) return { success: false, message: 'Need 4 PC.' };
state.senate.pc -= 4;  // Change cost here
```

### Vote Thresholds
In `config.js`, change:
```javascript
var SENATE_PASS_THRESHOLD = 60;  // Make easier: lower this
var HOUSE_PASS_THRESHOLD = 218;  // Make easier: lower this
```

### Actions Per Turn
In `createInitialState()` (engine.js), each role starts with `actionsRemaining: 4`. Change this number.

### Game Length
In `config.js`, change `GAME_LENGTHS`:
```javascript
var GAME_LENGTHS = {
    short: { rounds: 6 },
    standard: { rounds: 10 },
    extended: { rounds: 24 }
};
```

### Per-Game Limits
In `config.js`, change `PER_GAME_LIMITS`:
```javascript
var PER_GAME_LIMITS = {
    witchhunts: 1,
    governmentShutdowns: 2,
    impeachments: 1,
    packCourts: 1,
    constitutionalCrisis: 1
};
```

---

## 19. How to Add a New UI Panel or Modal

### Adding a Modal

```javascript
function showMyNewModal() {
    var html = '<div style="padding:10px">';
    html += '<p>Modal content here</p>';
    html += '</div>';

    showModal('🆕 My Modal Title', html, [
        { label: '✅ Confirm', action: 'myConfirmAction', className: 'btn-green' },
        { label: 'Cancel', action: 'closeModal', className: 'btn-red' }
    ]);
}
```

Then in the event delegation switch (inside `UI.init()`'s click handler):

```javascript
case 'openMyModal':
    showMyNewModal();
    break;
case 'myConfirmAction':
    // Handle the confirmation
    closeModal();
    break;
```

### Adding a Button

Add to any render function:
```javascript
html += '<button class="btn" data-action="openMyModal">🆕 Open My Modal</button>';
```

---

## 20. Multiplayer Testing

### Local Testing
1. Open `index.html` in two browser tabs
2. Tab 1: Click "Host Game" → note the room code
3. Tab 2: Click "Join Game" → enter room code
4. Both select different roles, ready up, start

### Cross-Network Testing
1. Push to GitHub, access via GitHub Pages URL
2. Share URL + room code with another player
3. They join using the room code

### Common Multiplayer Issues
- **"Connection failed"**: PeerJS STUN server may be down. Try refreshing.
- **State desync**: Only the host runs game logic. If you see desync, it's likely a setState issue.
- **Host disconnects**: Host migration should kick in. New host gets `-m` suffix peer ID.

---

## 21. Hosting on GitHub Pages

1. Push the repository to GitHub
2. Go to Settings → Pages
3. Set source to "Deploy from branch" → `master` (or `main`)
4. Set the folder to `/ (root)` or `/game` depending on your repo structure
5. The game will be live at `https://username.github.io/repo-name/game/`

No build step needed — the game is pure static HTML/CSS/JS.

---

## 22. Common Pitfalls

### 1. Forgetting to reset per-round flags
If you add a `usedThisRound` flag, you MUST reset it in `endRound()` or the action will be permanently locked after round 1.

### 2. Not advancing the turn
Action handlers must call `advanceTurn()` at the end (unless they're free actions). Forgetting this will freeze the game.

### 3. Script order in index.html
Adding a new script in the wrong position will cause "X is not defined" errors. Check dependencies.

### 4. State serialization
The state is sent over WebRTC as JSON. Functions, DOM references, and circular references will break serialization. Keep state data-only.

### 5. Mutating state without updating VP tracking
If you add a new VP source, call `trackVP(role, amount, 'Source Name')` so it appears in the game-over scorecard.

### 6. innerHTML XSS
Always use `escapeHtml()` for user-provided text (chat messages, player names, deal messages). The `escapeHtml` function is in `ui.js`.

### 7. CSS brace balance
After editing `style.css`, verify brace balance. An unmatched `}` can silently break all styles below it.

---

## 23. Key Balance Constants

| Constant | Value | Location | Effect |
|----------|-------|----------|--------|
| Actions per turn | 4 | engine.js:59 | Each role gets 4 actions |
| Max PC carryover | 4 | config.js:82 | PC above 4 is lost between rounds |
| Senate pass threshold | 60/100 | config.js:68 | Votes needed to pass in Senate |
| House pass threshold | 218/435 | config.js:74 | Votes needed to pass in House |
| Executive Order | +1 VP, +1 Pop | engine.js | President's basic action |
| State Dinner | +3 VP, +2 Pop | engine.js | Strong president action |
| Host Hearing | +2 VP | engine.js | House VP action |
| Filibuster | -4 PC, +1 VP | engine.js | Senate blocks bill |
| Bill signing | +4 VP, +Pop | engine.js | President signs passed bill |
| Deal fulfill | +1 VP both | engine.js | Both parties get VP |
| Deal break | -2 VP, -2 trust | engine.js | Penalty for breaking promises |
| Starting trust | 5 | engine.js:161 | All pairs start at 5/10 |
| Starting stability | 5 | engine.js:172 | Mid-range stability |
| Starting popularity | 10 | config.js:91 | President starts at 10/20 |
| Court Legacy | 1 VP/precedent | engine.js | Per-precedent end-round VP |
| Congressional Fatigue | -1 VP after 1st bill | engine.js | Diminishing returns on bill VP |
| Landmark Ruling duration | 3 rounds | engine.js | Court Authority expires after 3 rounds |
| Justice nomination cap | 4 per game | engine.js | President limited to 4 total |

---

*This document describes v3.1.0 of Branches of Power. As the game evolves, update this guide to match.*
