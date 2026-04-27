# Branches of Power — AI Assistant Guide

> **Purpose**: This document gives any AI assistant everything it needs to understand, modify, and extend the Branches of Power game. Read this first before making any changes.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [File Structure](#2-file-structure)
3. [Architecture](#3-architecture)
4. [Module API Reference](#4-module-api-reference)
5. [State Object Structure](#5-state-object-structure)
6. [How to Add New Features](#6-how-to-add-new-features)
7. [How to Modify Balance](#7-how-to-modify-balance)
8. [Common Pitfalls](#8-common-pitfalls)
9. [Testing & Simulation](#9-testing--simulation)
10. [Multiplayer](#10-multiplayer)
11. [UI Patterns](#11-ui-patterns)
12. [Constraints & Rules](#12-constraints--rules)

---

## 1. Project Overview

### What Is This?
Branches of Power is a **4-player HTML5 political strategy board game** simulating the three branches of the U.S. government. It runs entirely in the browser and can be hosted on GitHub Pages.

### How Is It Played?
- **4 roles**: President, House of Representatives, Senate, Supreme Court
- Players take turns performing **role-specific actions** (signing bills, passing legislation, reviewing constitutionality, etc.)
- Each action may earn **Victory Points (VP)**
- **Events** occur randomly, threatening national **stability** (0–10 scale)
- Players can **negotiate deals** and build/break **trust**
- The game ends after a configurable number of rounds; **highest VP wins**
- If stability reaches 0, **everyone loses** (stability collapse)

### Multiplayer
- **Online**: WebRTC peer-to-peer via PeerJS CDN, host-authoritative
- **Local**: AI opponents fill empty seats, using 32 distinct personality archetypes

### Repository
- GitHub: `https://github.com/configmanCooper/Branches-of-Power.git`
- Only the `game/` folder is tracked in git
- Branch: `main`
- Hostable on GitHub Pages directly from the `game/` folder

---

## 2. File Structure

```
C:\Users\rocma\CLI\Branches of Power\
│
├── game\                              ← GIT-TRACKED (this is the deployed game)
│   ├── index.html                     ← Entry point, loads PeerJS CDN + all scripts
│   ├── VERSION                        ← Current version string (e.g., "2.0.0")
│   ├── CHANGELOG.md                   ← Full version history
│   ├── README.md                      ← Player-facing readme
│   ├── css\
│   │   └── style.css                  ← All game styles (single file)
│   ├── js\
│   │   ├── config.js    (159 lines)   ← Constants, game lengths, roles, factions, voting ranges, bill names
│   │   ├── ai.js        (681 lines)   ← GameAI module, 32 personalities (8 per role), deal AI
│   │   ├── events.js    (2652 lines)  ← 50 events, stability system, event resolutions, drastic failures
│   │   ├── engine.js    (3352 lines)  ← Core engine: state, rounds, bills, elections, actions, deals, trust
│   │   ├── network.js   (465 lines)   ← WebRTC/PeerJS multiplayer, room codes, host-authoritative
│   │   ├── ui.js        (1487 lines)  ← All UI rendering, modals, event banner, stability gauge
│   │   └── main.js      (63 lines)    ← Entry point, event delegation, error handling
│   └── assets\                        ← Images and icons
│
├── development\                       ← NOT IN GIT (dev tools, simulations, plans)
│   ├── BranchesOfPowerDevelopmentPlan.md  ← Master development plan
│   ├── eventsplan.md                  ← Event system design document
│   ├── rulesandbalanceaudit.md        ← Balance analysis and audit notes
│   ├── aiassist.md                    ← THIS FILE — AI assistant onboarding guide
│   ├── simulation.js                  ← Single-game simulation runner
│   ├── batch_simulation.js            ← Batch simulation (multiple games, statistics)
│   ├── personality_test.js            ← AI personality behavior testing
│   └── (various results .txt files)   ← Simulation output logs
│
├── Branches of Power.txt              ← Original game rules (reference)
└── Branches of Power_ Rulebook.txt    ← Detailed rulebook (reference)
```

### Dependency Chain (Load Order)
Scripts must load in this exact order in `index.html`:
```
config.js → ai.js → events.js → engine.js → network.js → ui.js → main.js
```
Each module depends on all prior modules being defined. Reordering will break the game.

---

## 3. Architecture

### Module Pattern
Every JS file uses the **IIFE (Immediately Invoked Function Expression) module pattern**:

```javascript
var ModuleName = (function() {
    'use strict';
    // private variables and functions
    
    return {
        // public API
        publicFunction: function() { ... },
        anotherFunction: function() { ... }
    };
})();
```

This creates a closure, keeping internals private while exposing a public API on the global `window` object.

### Module Dependency Graph
```
Config          ← No dependencies (pure constants)
  ↓
GameAI          ← Reads Config for roles, traits
  ↓
GameEvents      ← Reads Config; defines event data
  ↓
Engine          ← Reads Config, GameAI, GameEvents; core game logic
  ↓
Network         ← Reads Engine; sends/receives state
  ↓
UI              ← Reads Engine, Config, GameEvents; renders everything
  ↓
main.js         ← Orchestrates Engine, Network, UI; sets up event listeners
```

### Key Design Decisions
- **No build step**: Raw JS files, no bundler, no transpiler. Just open `index.html`.
- **No frameworks**: Vanilla JS, manual DOM manipulation.
- **Host-authoritative multiplayer**: The host runs the game engine; clients send actions, receive state updates.
- **Single state object**: All game state lives in `Engine.getState()` — one source of truth.

---

## 4. Module API Reference

### Config (config.js)
Constants only. No state, no side effects.

| Export | Type | Description |
|--------|------|-------------|
| `VERSION` | `string` | Current game version (e.g., `'2.0.0'`) |
| `GAME_LENGTHS` | `object` | `{ short, standard, extended }` with `rounds` and `label` |
| `ROLES` | `array` | `['president', 'house', 'senate', 'supremeCourt']` |
| `FACTIONS` | `object` | Political faction definitions |
| `VOTING_RANGES` | `object` | Min/max voting thresholds per action |
| `BILL_NAMES` | `array` | Array of strings for naming House bills ("HB: [Name]") |
| `ACTIONS` | `object` | Action definitions per role with VP values, costs, descriptions |

### GameAI (ai.js)
AI opponent logic.

| Export | Type | Description |
|--------|------|-------------|
| `getPersonalities()` | `function` | Returns all 32 personality archetypes |
| `getPersonalityForRole(role)` | `function` | Returns the 8 personalities available for a role |
| `selectAction(role, state, personality)` | `function` | AI chooses next action based on state + personality |
| `evaluateDeal(deal, role, state, personality)` | `function` | AI decides whether to accept/reject a deal |
| `proposeDeal(role, state, personality)` | `function` | AI proposes a deal to another role |
| `selectEventAction(role, state, personality)` | `function` | AI decides how to respond to active events |

**Personality Traits** (each 0.0–1.0):
- `aggressiveness` — preference for confrontational actions
- `cooperation` — willingness to work with others
- `negotiationRate` — how often AI proposes deals
- `riskTolerance` — willingness to take risky actions
- `baseLieRate` — probability of breaking deals

### GameEvents (events.js)
Event definitions and stability logic.

| Export | Type | Description |
|--------|------|-------------|
| `EVENTS` | `array` | All 50 event objects |
| `getEventsByCategory(category)` | `function` | Filter events by category |
| `getEventsBySeverity(severity)` | `function` | Filter events by severity (1–3) |
| `checkEventTrigger(state)` | `function` | Determines if an event should fire this round |
| `resolveEvent(eventId, state, role)` | `function` | Process a role's contribution to event resolution |
| `applyFailPenalty(event, state)` | `function` | Apply failure effects including drastic failures |
| `getStabilityModifier(stability)` | `function` | Returns modifier based on current stability |

**Event Object Structure**:
```javascript
{
    id: 'impeachment_scandal',
    name: 'Impeachment Scandal',
    category: 'Domestic',        // Domestic|Foreign|Constitutional|Economic|Security|Social
    severity: 3,                  // 1 (minor), 2 (moderate), 3 (severe)
    description: '...',
    stabilityImpact: -2,          // Applied when event triggers
    failPenalty: -3,              // Applied on failed resolution (NOT "failure"!)
    resolutionRequirement: { ... },
    cooperativeResolution: true,  // Requires multiple roles
    drasticFailure: {             // Only on 15 severity-3 events
        type: 'houseShift',       // houseShift|senateShift|justiceEffect|presidentLosesElection
        magnitude: [30, 68]       // Range for shifts
    }
}
```

### Engine (engine.js)
Core game logic. The largest and most critical module.

| Export | Type | Description |
|--------|------|-------------|
| `getState()` | `function` | Returns the full game state object |
| `initGame(config)` | `function` | Initialize a new game with given configuration |
| `performAction(role, actionType, params)` | `function` | Execute a game action |
| `advanceTurn()` | `function` | Decrements actions AND advances to next role |
| `getAvailableActions(role)` | `function` | Returns array of valid actions for a role |
| `getActiveBill()` | `function` | Returns the currently targeted bill object |
| `addBillToFloor(bill)` | `function` | Adds a bill with auto-assigned ID |
| `removeBillFromFloor(billId)` | `function` | Removes a bill by ID |
| `getBillById(id)` | `function` | Retrieves a bill by its ID |
| `proposeDeal(deal)` | `function` | Create a new deal proposal |
| `respondDeal(dealId, accept)` | `function` | Accept or reject a pending deal |
| `fulfillDeal(dealId)` | `function` | Mark a deal as fulfilled |
| `breakDeal(dealId)` | `function` | Mark a deal as broken |
| `getTrust(role1, role2)` | `function` | Get trust value between two roles |
| `modifyTrust(role1, role2, delta)` | `function` | Change trust between two roles |
| `checkElections()` | `function` | Process elections if due this round |
| `proposeUnitySummit(role)` | `function` | Initiate a National Unity Summit |
| `respondUnitySummit(role, agree)` | `function` | Respond to a summit proposal |
| `onStateChange(callback)` | `function` | Register a state change listener |

**Critical**: `advanceTurn()` does TWO things — decrements the current role's remaining actions AND moves to the next role in round-robin order. This is per-action, not per-round.

### Network (network.js)
WebRTC multiplayer via PeerJS.

| Export | Type | Description |
|--------|------|-------------|
| `createRoom()` | `function` | Host creates a room, returns room code |
| `joinRoom(code)` | `function` | Client joins using 6-char room code |
| `sendAction(action)` | `function` | Client sends action to host |
| `broadcastState(state)` | `function` | Host sends updated state to all clients |
| `onConnection(callback)` | `function` | Register connection event handler |
| `onDisconnection(callback)` | `function` | Register disconnection handler |
| `isHost()` | `function` | Returns true if this player is the host |
| `getRoomCode()` | `function` | Returns current room code |

### UI (ui.js)
All rendering and user interaction.

| Export | Type | Description |
|--------|------|-------------|
| `render(state)` | `function` | Full UI render from state |
| `showModal(config)` | `function` | Display a modal dialog |
| `hideModal()` | `function` | Close the current modal |
| `showToast(message, type)` | `function` | Show a temporary notification |
| `updateStabilityGauge(value)` | `function` | Update the stability visual |
| `showEventBanner(event)` | `function` | Display the active event banner |
| `hideEventBanner()` | `function` | Remove the event banner |
| `renderBillsPanel(bills, activeBillId)` | `function` | Render the multi-bill floor |
| `renderDealsPanel(deals, role)` | `function` | Render deal proposals/responses |
| `renderPassedLaws(laws)` | `function` | Render the passed laws viewer |
| `showGameOver(results)` | `function` | Display end-game screen |

---

## 5. State Object Structure

The entire game state lives in a single object returned by `Engine.getState()`. Here is its full structure:

```javascript
state = {
    // --- Game Configuration ---
    gameLength: 'standard',          // 'short' | 'standard' | 'extended'
    maxRounds: 10,                   // Total rounds in the game
    currentRound: 1,                 // Current round number
    currentRole: 'president',        // Whose turn it is (one of ROLES)
    actionsRemaining: 3,             // Actions left for current role this round
    phase: 'action',                 // 'setup' | 'action' | 'election' | 'event' | 'end'
    roomCode: 'LOCAL',               // 6-char code or 'LOCAL' for local play

    // --- Bill System ---
    bills: [],                       // Array of bill objects on the floor
    activeBillId: null,              // ID of the currently targeted bill
    billIdCounter: 0,                // Auto-incrementing bill ID
    passedLaws: [],                  // Array of bills that became law

    // Bill object structure:
    // {
    //     id: 1,                    // Unique ID from billIdCounter
    //     name: 'HB: Infrastructure', // Display name
    //     sponsor: 'house',         // Role that initiated
    //     support: 55,              // Support percentage
    //     amendments: [],           // Applied amendments
    //     stalled: false,           // Carries over to next round if true
    //     vetoed: false,            // President vetoed this bill
    //     category: 'Economic'     // Bill category
    // }

    // --- Role State ---
    president: {
        player: null,                // Player name/ID or null for AI
        personality: null,           // AI personality object (null for humans)
        vp: 0,                       // Victory Points
        faction: 'moderate',         // Political faction
        termsServed: 0,              // 0, 1, or 2 (max 2)
        executiveOrders: [],         // Issued executive orders
        presidentLosesNextElection: false  // Forced loss flag from drastic events
    },

    house: {
        player: null,
        personality: null,
        vp: 0,
        faction: 'moderate',
        seats: {                     // Seat composition
            progressive: 100,
            moderate: 118,
            conservative: 100,
            independent: 117
        },
        majority: 'moderate'         // Which faction holds majority
    },

    senate: {
        player: null,
        personality: null,
        vp: 0,
        faction: 'moderate',
        seats: {
            progressive: 25,
            moderate: 25,
            conservative: 25,
            independent: 25
        },
        majority: 'moderate'
    },

    supremeCourt: {
        player: null,
        personality: null,
        vp: 0,
        justices: [                  // Array of 9 justice objects
            { id: 1, partisanship: 'progressive', active: true },
            // ... 9 total
        ],
        precedents: []               // Established precedents
    },

    // --- Trust System ---
    trust: {
        // Per-role-pair trust values (0–10, starts at 5)
        'president-house': 5,
        'president-senate': 5,
        'president-supremeCourt': 5,
        'house-senate': 5,
        'house-supremeCourt': 5,
        'senate-supremeCourt': 5
    },

    // --- Deal System ---
    deals: [],                       // Array of deal objects
    // Deal object structure:
    // {
    //     id: 'deal_1',
    //     type: 'signBill',         // One of 60+ deal types
    //     proposer: 'house',
    //     target: 'president',
    //     billId: 3,                // For billRelated deals
    //     status: 'pending',        // pending|accepted|rejected|fulfilled|broken
    //     terms: '...',
    //     round: 4                  // When proposed
    // }

    // --- Events & Stability ---
    stability: 5,                    // 0–10, starts at 5. 0 = game over
    activeEvent: null,               // Current event object or null
    eventHistory: [],                // Past events
    eventTriggeredThisGame: false,   // Has any event fired yet?
    firstEventForced: false,         // Ensures first event fires on round 2

    // Active event extended fields:
    // activeEvent.agreedRoles = []  // Roles that have contributed to resolution
    // activeEvent.roundsRemaining  // Turns until auto-failure

    // --- Unity Summit ---
    unitySummit: null,               // null or summit object
    // {
    //     proposer: 'president',
    //     agreedRoles: ['president', 'house'],
    //     status: 'pending'         // pending|resolved|failed
    // }

    // --- Elections ---
    lastHouseElection: 0,            // Round of last House election
    lastSenateElection: 0,           // Round of last Senate election
    lastPresidentialElection: 0,     // Round of last Presidential election
    presidentLosesNextElection: false // Drastic event flag
}
```

---

## 6. How to Add New Features

### 6.1 Adding a New Action to a Role

**Files to modify**: `config.js`, `engine.js`, `ai.js`, `ui.js`

**Step-by-step**:

1. **Define the action in `config.js`**:
   Add to the appropriate role's action definitions in the `ACTIONS` object:
   ```javascript
   myNewAction: {
       name: 'My New Action',
       description: 'What this action does',
       vp: 2,           // VP earned
       actionCost: 1,    // Actions consumed
       available: true   // Whether it's enabled
   }
   ```

2. **Add the action logic in `engine.js`**:
   Find the `performAction()` function. Inside the role's case block, add a new case:
   ```javascript
   case 'myNewAction':
       // Validate prerequisites
       if (!someCondition) {
           return { success: false, message: 'Cannot perform this action because...' };
       }
       // Apply effects to state
       state.someValue += 5;
       // Award VP
       state[role].vp += Config.ACTIONS[role].myNewAction.vp;
       // Return result
       return { success: true, message: 'Action completed successfully' };
   ```

3. **Add to `getAvailableActions()` in `engine.js`**:
   Find the role's case in `getAvailableActions()`. Add logic determining when the action is available:
   ```javascript
   if (someConditionMet && state.currentRound > 1) {
       actions.push('myNewAction');
   }
   ```
   ⚠️ **PITFALL**: When editing `case 'senate':` in `getAvailableActions`, be extremely careful not to accidentally remove closing braces. The switch cases are long and brace-dense.

4. **Add AI handling in `ai.js`**:
   Update `selectAction()` to include the new action in the AI's decision-making:
   ```javascript
   if (availableActions.includes('myNewAction') && personality.aggressiveness > 0.5) {
       candidates.push({ action: 'myNewAction', priority: 0.7 });
   }
   ```

5. **Add UI rendering in `ui.js`**:
   Add a button or UI element for the action in the role's action panel rendering. Ensure it shows/hides based on `getAvailableActions()` results.

6. **Test**: Run a simulation to verify the action works as expected.

---

### 6.2 Adding a New Event

**Files to modify**: `events.js` (primary), potentially `engine.js` for new resolution mechanics

**Step-by-step**:

1. **Add the event object to the `EVENTS` array in `events.js`**:
   ```javascript
   {
       id: 'my_new_event',
       name: 'My New Event',
       category: 'Domestic',         // Domestic|Foreign|Constitutional|Economic|Security|Social
       severity: 2,                   // 1, 2, or 3
       description: 'A description of what happened...',
       stabilityImpact: -1,           // Applied when event triggers
       failPenalty: -2,               // Applied if resolution fails (NOT "failure"!)
       resolutionRequirement: {
           roles: ['president', 'house'],  // Which roles can help resolve
           actionsNeeded: 2                // How many total contributions needed
       },
       cooperativeResolution: true,    // Requires multiple roles?
       roundsToResolve: 3,             // Deadline in rounds
       // Optional: drastic failure for severity 3
       drasticFailure: {
           type: 'houseShift',         // houseShift|senateShift|justiceEffect|presidentLosesElection
           magnitude: [30, 50]
       }
   }
   ```

2. **If adding a new drastic failure type**, update `applyFailPenalty()` in `events.js` with a new case handling the failure type.

3. **If the event needs special resolution logic**, add it to `resolveEvent()` in `events.js`.

4. **Test**: Use simulation tools to verify the event triggers, resolves, and fails correctly.

⚠️ **CRITICAL**: The failure penalty field is called `failPenalty`, NOT `failure`. Using `evt.failure` will silently return `undefined` and the penalty won't apply.

---

### 6.3 Adding a New Deal Type

**Files to modify**: `engine.js` (deal definitions), `ai.js` (AI deal logic), `ui.js` (deal UI)

**Step-by-step**:

1. **Add the deal type to the deal definitions in `engine.js`**:
   ```javascript
   {
       type: 'myNewDeal',
       name: 'My New Deal',
       description: 'Promise to do X in exchange for Y',
       proposerRoles: ['president', 'house'],  // Who can propose this deal
       targetRoles: ['senate', 'supremeCourt'], // Who can receive this deal
       billRelated: false,                       // If true, shows bill selector dropdown
       eventRelated: false                       // If true, only available during active events
   }
   ```
   If `billRelated: true`, the deal will automatically include a bill selector in the UI and store `billId` on the deal object.

2. **Add fulfillment logic** — in the deal fulfillment checking code, add validation that the deal was actually fulfilled (e.g., the promised bill was signed):
   ```javascript
   case 'myNewDeal':
       return state.someCondition === true;
   ```

3. **Update AI in `ai.js`**:
   - In `evaluateDeal()`, add logic for how AI evaluates this deal type
   - In `proposeDeal()`, add logic for when AI proposes this deal type

4. **Update UI in `ui.js`**:
   - Ensure the new deal type renders correctly in the deals panel
   - If special UI is needed (beyond the standard deal modal), add it

5. **Remember**: Deal actions (`proposeDeal`, `respondDeal`, `fulfillDeal`, `breakDeal`) are FREE — they don't consume actions or advance the turn.

---

### 6.4 Adding a New AI Personality

**Files to modify**: `ai.js`

**Step-by-step**:

1. **Add the personality to the appropriate role's personality array in `ai.js`**:
   ```javascript
   {
       name: 'The Maverick',
       role: 'senate',
       description: 'Unpredictable, willing to cross party lines',
       traits: {
           aggressiveness: 0.6,
           cooperation: 0.4,
           negotiationRate: 0.7,
           riskTolerance: 0.9,
           baseLieRate: 0.3
       }
   }
   ```

2. **Trait effects** (understand these before setting values):
   - `aggressiveness` (0–1): Higher = prefers confrontational actions (veto, filibuster, attack)
   - `cooperation` (0–1): Higher = more likely to accept deals, contribute to events, join summits
   - `negotiationRate` (0–1): Higher = proposes deals more often
   - `riskTolerance` (0–1): Higher = takes risky actions, less concerned about stability
   - `baseLieRate` (0–1): Higher = more likely to break deals (reduces trust over time)

3. **Test**: Run `personality_test.js` in the development folder to analyze the personality's behavior patterns.

4. **Currently there are 8 personalities per role** (32 total). You can add more, but the AI selection will randomly pick from the available set.

---

### 6.5 Modifying Election Mechanics

**Files to modify**: `engine.js` (primary), possibly `config.js`

**Key locations in `engine.js`**:
- `checkElections()` — determines when elections occur
- Election frequency constants:
  - House: every 2 rounds
  - Senate: every 2 rounds
  - Presidential: every 4 rounds
- `state.president.termsServed` — max 2 terms
- `state.presidentLosesNextElection` — forced loss flag from drastic event failures
- `state.lastHouseElection`, `state.lastSenateElection`, `state.lastPresidentialElection` — tracking

**To change election frequency**: Modify the round-check conditions in `checkElections()`.

**To change term limits**: Modify the term check in presidential election logic.

**To add a new election type**: Follow the pattern of existing elections — check timing, run election logic, update state, trigger UI.

---

### 6.6 Adding a New Co-Action (Like Unity Summit)

**Files to modify**: `engine.js`, `ui.js`, `ai.js`, `config.js`

The National Unity Summit is the model for co-actions. Follow its pattern:

1. **Add state tracking** in the state object (engine.js):
   ```javascript
   state.myCoAction = null;
   // When active:
   // { proposer: 'role', agreedRoles: [], status: 'pending' }
   ```

2. **Add propose/respond functions** in engine.js:
   ```javascript
   function proposeMyCoAction(role) {
       // Cost: N actions + N VP
       state.myCoAction = { proposer: role, agreedRoles: [role], status: 'pending' };
   }
   function respondMyCoAction(role, agree) {
       if (agree) state.myCoAction.agreedRoles.push(role);
       // Check if enough roles have agreed
       if (state.myCoAction.agreedRoles.length >= threshold) {
           resolveMyCoAction();
       }
   }
   ```

3. **Add availability conditions**: In `getAvailableActions()`, add the co-action when conditions are met (e.g., stability below a threshold).

4. **Add AI logic**: In `ai.js`, add decision-making for proposing and responding to the co-action.

5. **Add UI**: Proposal button, response modal, result display.

6. **Add deal types** if needed: You may want deal types for "promise to agree" or "promise to propose".

---

## 7. How to Modify Balance

### VP Values
- **Location**: `config.js` → `ACTIONS` object
- Each action has a `vp` field determining how many Victory Points it awards
- Higher VP = more rewarding but may need higher costs to compensate

### Action Costs
- **Location**: `config.js` → `ACTIONS` object
- `actionCost` determines how many of a role's limited actions are consumed
- Standard is 1; powerful actions may cost 2+

### Stability Thresholds
- **Location**: `events.js`
- `stabilityImpact` — how much stability changes when an event triggers
- `failPenalty` — stability cost of failing to resolve an event
- **Location**: `engine.js`
- Stability range: 0–10, starting at 5
- Stability 0 = game over (everyone loses)
- Unity Summit availability requires stability < 8

### Event Trigger Rates
- **Location**: `events.js` → `checkEventTrigger()`
- 40% chance per round normally
- 15% if an event is already active
- First event forced on round 2

### Drastic Failure Magnitudes
- **Location**: `events.js` → event objects' `drasticFailure.magnitude`
- House shifts: currently 30–68 seats
- Senate shifts: currently 12–23 seats
- Shifts transfer from majority to minority faction

### Trust Mechanics
- **Location**: `engine.js`
- Trust range: 0–10, starts at 5
- Trust regresses toward 5 each round
- Deal fulfillment: +trust; deal breaking: −trust
- Modify regression speed or trust change amounts to affect deal dynamics

### Election Timing
- **Location**: `engine.js` → `checkElections()`
- House/Senate: every 2 rounds
- Presidential: every 4 rounds
- Change these to make elections more or less frequent

### AI Behavior Tuning
- **Location**: `ai.js`
- Personality trait values (0–1) control all AI decision-making
- Adjust `riskTolerance` to change how AI handles events
- Adjust `cooperation` to change deal/summit acceptance rates
- Adjust `baseLieRate` to change deal-breaking frequency

---

## 8. Common Pitfalls

### Critical Bugs to Avoid

1. **`evt.failure` does not exist** — The correct field is `evt.failPenalty`. Using `evt.failure` returns `undefined` silently and the penalty will never apply. Always use `failPenalty`.

2. **`advanceTurn()` does two things** — It decrements `actionsRemaining` AND advances `currentRole` to the next role. Don't call it expecting only one behavior.

3. **Deal actions are FREE** — `proposeDeal`, `respondDeal`, `fulfillDeal`, `breakDeal`, and `setActiveBill` bypass the turn system. They don't consume actions and don't advance the turn. Don't add `advanceTurn()` calls to deal logic.

4. **Accidental brace removal in `getAvailableActions()`** — The switch cases for each role are very long. When editing `case 'senate':` (or any role), be extremely careful not to accidentally delete closing braces `}` that belong to outer blocks. Always verify brace matching after edits.

5. **Windows line endings in simulation scripts** — Template extraction in `batch_simulation.js` can fail due to `\r\n` line endings on Windows. If simulations produce garbled output, check for CRLF issues.

6. **Config.js VERSION** — Must be kept in sync with the `VERSION` file in the game root. Currently both should read `'2.0.0'`.

### Architecture Pitfalls

7. **Script load order matters** — If you add a new JS file, it must be added to `index.html` in the correct position relative to its dependencies. See the dependency chain in Section 3.

8. **State is the single source of truth** — Never store game-relevant data outside `Engine.getState()`. The multiplayer system broadcasts the state object; anything not in it won't sync.

9. **Host-authoritative multiplayer** — Only the host runs game logic. Clients send action requests; the host validates and applies them. Never let client code modify state directly.

10. **Bill IDs are unique and auto-incrementing** — Always use `addBillToFloor()` to add bills (it assigns IDs from `billIdCounter`). Never manually set bill IDs.

11. **Trust regresses toward 5** — Trust naturally moves toward 5 each round. This means both high trust (earned through cooperation) and low trust (earned through betrayal) will fade. Design features with this in mind.

### UI Pitfalls

12. **Event delegation in main.js** — The UI uses event delegation (listeners on parent elements). When adding new interactive elements, ensure they work with the delegation pattern or add specific listeners in the appropriate place.

13. **Rendering is state-driven** — Call `UI.render(state)` after state changes. Don't manipulate DOM directly outside of `ui.js`.

---

## 9. Testing & Simulation

### Development Tools (in `development/` folder — NOT in git)

#### `simulation.js` — Single Game Simulation
- Runs one complete game with AI players
- Useful for testing specific scenarios
- Run with Node.js: `node simulation.js`
- Outputs play-by-play log

#### `batch_simulation.js` — Batch Simulation
- Runs many games and collects statistics
- Tests game balance, win rates, average stability, event frequency
- Run with Node.js: `node batch_simulation.js`
- ⚠️ Template extraction can fail on Windows due to `\r\n` — if output is garbled, convert to LF

#### `personality_test.js` — AI Personality Analysis
- Tests specific AI personalities for behavior patterns
- Validates that personality traits produce expected action distributions
- Useful when adding or modifying personalities

### How to Run Simulations

```bash
cd "C:\Users\rocma\CLI\Branches of Power\development"
node simulation.js          # Single game
node batch_simulation.js    # Batch (statistics)
node personality_test.js    # Personality analysis
```

Results are written to `.txt` files in the `development/` folder.

### Manual Testing
- Open `game/index.html` in a browser
- Start a local game (all AI opponents)
- Watch AI play through the game
- Use browser DevTools console to inspect `Engine.getState()`
- Test specific actions by playing as a role while AI handles others

---

## 10. Multiplayer

### Technology
- **WebRTC** for peer-to-peer communication
- **PeerJS** library (loaded via CDN in `index.html`) for WebRTC abstraction
- No server needed beyond PeerJS's free signaling server

### Room Codes
- **Format**: 6-character alphanumeric string (e.g., `A3F9K2`)
- **PeerJS Peer ID**: `bop-{CODE}` (e.g., `bop-A3F9K2`)
- The host's peer ID IS the room code (prefixed with `bop-`)

### Host vs Client

**Host (creates the room)**:
- Runs the full game engine
- Validates all actions
- Broadcasts state to all clients after each change
- Manages AI players for unfilled seats

**Client (joins the room)**:
- Sends action requests to the host
- Receives state updates and renders them
- Cannot modify state directly
- If disconnected, their role can be taken over by AI

### Local Play
- `roomCode = 'LOCAL'`
- No network connections
- All non-human roles are AI-controlled
- Everything runs in a single browser tab

### Network Message Flow
```
Client                          Host
  |                               |
  |-- sendAction(action) ------->|
  |                               |-- Engine.performAction()
  |                               |-- validate & apply
  |<--- broadcastState(state) ---|
  |                               |
  |-- UI.render(state)            |
```

### Adding Network-Aware Features
When adding features that affect multiplayer:
1. All state changes must go through the Engine on the host
2. Clients must only send action requests via `Network.sendAction()`
3. The host broadcasts the full state after each change
4. Never assume client-side state is authoritative

---

## 11. UI Patterns

### Rendering Model
- **State-driven**: All UI renders from the state object via `UI.render(state)`
- **Full re-render**: Each `render()` call rebuilds the relevant DOM sections
- **No virtual DOM**: Direct DOM manipulation (vanilla JS)

### Event Delegation
- `main.js` sets up event listeners on parent containers
- Click events bubble up and are handled based on `data-*` attributes or element classes
- This avoids needing to re-attach listeners after re-renders

### Modals
- `UI.showModal(config)` displays a modal overlay
- `config` includes title, content (HTML string), and button callbacks
- Only one modal at a time; `UI.hideModal()` closes it
- Used for: deal proposals, deal responses, summit proposals, action confirmations, game setup

### Toasts
- `UI.showToast(message, type)` shows a temporary notification
- Types: `'success'`, `'error'`, `'info'`, `'warning'`
- Auto-dismiss after a few seconds
- Used for: action results, trust changes, event triggers

### Stability Gauge
- Visual meter showing stability 0–10
- Color-coded: Green (8–10), Yellow (5–7), Orange (3–4), Red (0–2)
- Updates via `UI.updateStabilityGauge(value)`
- Prominent placement so players always see stability

### Event Banner
- Persistent banner when an event is active
- Shows: event name, category, severity, description, resolution progress, deadline
- `UI.showEventBanner(event)` / `UI.hideEventBanner()`

### Bills Panel
- Shows all bills currently on the floor
- Active bill is highlighted
- Click to set active bill (free action)
- `UI.renderBillsPanel(bills, activeBillId)`

### Deals Panel
- Shows incoming deals (pending), active deals (accepted), and deal history
- Action buttons for accept/reject/fulfill/break
- Bill selector dropdown appears for `billRelated` deal types
- `UI.renderDealsPanel(deals, role)`

### Game Over Screen
- Triggered by either: max rounds reached OR stability collapse
- Shows VP totals, winner (if any), and game summary
- Stability collapse = special "everyone loses" message
- `UI.showGameOver(results)`

---

## 12. Constraints & Rules

### File Boundaries
- **`game/` folder**: Git-tracked, deployed to GitHub Pages. All game code lives here.
- **`development/` folder**: NOT in git. Dev tools, simulations, plans, this document.
- **NEVER mix these**: Don't reference development files from game code or vice versa.

### Git & Deployment
- Only push when the user explicitly says to push
- Only the `game/` folder is committed to git
- Branch: `main`
- GitHub Pages serves from `game/` folder

### What NOT to Touch
- **NEVER** write to any Merchant Realms files — there is another project in the parent directory; do not touch it
- **NEVER** modify files outside `C:\Users\rocma\CLI\Branches of Power\` unless explicitly instructed
- **NEVER** push to git unless the user explicitly requests it

### Code Style
- IIFE module pattern for all game JS files
- `'use strict';` at the top of every IIFE
- `var` for variable declarations (not `let`/`const` — maintaining consistency with existing codebase)
- No build tools, no transpiler, no bundler
- No external frameworks or libraries (except PeerJS CDN)
- Single CSS file for all styles

### Version Management
- `game/VERSION` file contains the version string
- `config.js` → `Config.VERSION` must match the VERSION file
- `CHANGELOG.md` documents all version changes
- Use semantic versioning: MAJOR.MINOR.PATCH

### AI Assistant Behavior
- Read this document first before making changes
- Understand the module dependency chain before adding or modifying code
- Always test changes with simulations when possible
- When in doubt about game mechanics, refer to:
  - `Branches of Power.txt` (original rules)
  - `Branches of Power_ Rulebook.txt` (detailed rulebook)
  - `development/BranchesOfPowerDevelopmentPlan.md` (development plan)
- Keep `CHANGELOG.md` updated when adding features
- Update `VERSION` and `Config.VERSION` when releasing new versions

---

## Quick Reference Card

| Need to... | Look in... |
|------------|-----------|
| Change a constant | `config.js` |
| Add/modify an action | `engine.js` → `performAction()` + `getAvailableActions()` |
| Add/modify an event | `events.js` → `EVENTS` array |
| Change AI behavior | `ai.js` → personality traits or `selectAction()` |
| Add a deal type | `engine.js` → deal definitions |
| Change UI rendering | `ui.js` → relevant `render*()` function |
| Fix multiplayer | `network.js` |
| Change game setup | `main.js` + `engine.js` → `initGame()` |
| Run simulations | `development/simulation.js` or `batch_simulation.js` |
| Check version | `game/VERSION` or `Config.VERSION` |
| Read full rules | `Branches of Power_ Rulebook.txt` |

---

*Last updated: v2.0.0*
*This document lives at: `development/aiassist.md`*
*It is NOT tracked in git — it's a development-only resource.*
