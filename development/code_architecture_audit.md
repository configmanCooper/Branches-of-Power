# Branches of Power — Code Architecture Audit

**Date:** 2025-07-14  
**Scope:** Full codebase (9 source files, ~8,900 lines)  
**Auditor:** Automated deep-code review  

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Code Quality](#2-code-quality)
3. [Performance](#3-performance)
4. [Maintainability](#4-maintainability)
5. [Bug Risks](#5-bug-risks)
6. [Testing](#6-testing)
7. [Security](#7-security)
8. [Scalability](#8-scalability)
9. [Code Smells](#9-code-smells)
10. [Technical Debt](#10-technical-debt)

---

## 1. Architecture Overview

### Module Structure

| File | Lines | Responsibility |
|------|-------|---------------|
| `config.js` | 159 | Constants, role definitions, game-length presets |
| `main.js` | 63 | Entry point — wires modules together |
| `engine.js` | 3,357 | **Monolith** — state, actions, voting, elections, rounds |
| `events.js` | 2,652 | 50 event definitions (~2,240 lines data) + resolution logic (~410 lines) |
| `ui.js` | 1,487 | All rendering, action handling, modals, chat |
| `ai.js` | 681 | AI personalities and decision engine |
| `network.js` | 465 | WebRTC multiplayer via PeerJS |
| `style.css` | 823 | Dark-theme UI with 4 responsive breakpoints |
| `index.html` | 42 | Shell — loads PeerJS CDN + game scripts in order |

### Module Pattern

All JS modules use the IIFE (Immediately Invoked Function Expression) pattern:

```js
var Module = (function() {
    // private state
    return { /* public API */ };
})();
```

Each file also appends `if (typeof module !== 'undefined') module.exports = Module;` for Node.js compatibility. Modules communicate through globally-scoped variables (`Engine`, `UI`, `Network`, `GameAI`, `Config`, `GameEvents`, `Game`).

### Load-Order Dependency

Scripts are loaded in `index.html` in a strict order:

```
config.js → ai.js → events.js → engine.js → network.js → ui.js → main.js
```

There is no module bundler, transpiler, or build system. Any reordering of `<script>` tags would cause runtime `ReferenceError`s. This is fragile but acceptable for a project of this size.

### Data Flow

```
User Click → UI.handleAction() → Network.localAction() / Network.sendAction()
    → Engine.executeAction() → Engine state mutated → UI.renderGame(state)
```

The host-authoritative model in `network.js` means only the host runs `Engine.executeAction()`. Clients receive the full serialized state via PeerJS and call `UI.renderGame()` directly.

### Assessment: ⚠️ MEDIUM-HIGH RISK

The architecture is simple and functional, but `engine.js` at 3,357 lines is a **monolith** that contains state management, 50+ action functions, voting calculations, elections, bill lifecycle, trust/deal management, and round management. This is the single biggest architectural problem.

---

## 2. Code Quality

### Strengths

- **Consistent module pattern** — every file uses the same IIFE structure
- **Good use of `===`** — no loose equality (`==`) found anywhere
- **Meaningful variable names** — `actionsRemaining`, `partisanship`, `majorityParty` are self-documenting
- **`escapeHtml()` utility exists** in `ui.js` (line 22) and is consistently used for user-generated text in chat
- **Comprehensive game logic** — the engine handles edge cases like supermajority votes, pocket vetoes, impeachment, court packing, constitutional amendments, and national unity summits
- **diceHistory capped at 200** (`engine.js` line 14) — prevents unbounded array growth

### Issues

#### 2.1 — ES5-Only Syntax (LOW)

All files use `var` exclusively. No `let`, `const`, arrow functions, template literals, destructuring, or other ES6+ features. While this maximizes browser compatibility, it creates:

- **No block scoping** — `var` in `for` loops leaks to function scope
- **Verbose string concatenation** — `ui.js` builds massive HTML strings with `+` operators (see `renderGame()` lines 600–793, ~190 lines of string concatenation)
- **No `const` for immutable references** — config values, role arrays, etc. could benefit from `const`

#### 2.2 — Inline Styles in JS (MEDIUM)

`ui.js` embeds extensive inline CSS in JavaScript HTML strings. For example:

```js
// ui.js line 507
html += '<div class="ai-role-setup" style="display:flex;align-items:center;gap:10px;
  margin:8px 0;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;
  border-left:3px solid ' + Config.ROLE_COLORS[role] + '">';
```

This pattern appears in: `renderGame()`, `renderBillCard()`, `renderCompositionBars()`, `renderDealsPanel()`, `renderActionLog()`, event banners, stability gauge, and modals. Inline styles are:

- Impossible to override with CSS specificity
- Duplicated across re-renders
- Not covered by the responsive breakpoints in `style.css`

#### 2.3 — Magic Numbers (HIGH)

Numeric constants are scattered throughout `engine.js` without named references:

| Value | Location | Meaning |
|-------|----------|---------|
| `15` | `engine.js:309` | Popularity threshold for House votes |
| `18` | `engine.js:311` | High-popularity threshold for extra House votes |
| `6` | `engine.js:330, 349` | Political Capital cost for specific actions |
| `20` | `engine.js:247` (etc.) | Max value for bill stats (partisanship, popularity, legality) |
| `0.85` | `engine.js:368` | Vote calculation coefficient |
| `3` | `engine.js:265` | Default stability change |
| `0.6`, `0.7`, `0.8` | `engine.js:2893, 2905` | Action availability probability thresholds |

These should be moved to `config.js` as named constants.

#### 2.4 — Inconsistent Dice Rolling (MEDIUM)

`events.js` line 2429 uses `Math.floor(Math.random() * 20) + 1` directly instead of calling `Engine.rollD20()`. The engine has a centralized dice-rolling function (`engine.js` lines 6–17) that tracks history for debugging. Bypassing it means event resolution rolls are not recorded in `diceHistory`.

---

## 3. Performance

### 3.1 — Full DOM Rebuild on Every State Change (HIGH)

`UI.renderGame()` (ui.js lines 585–828) rebuilds the **entire** game board HTML on every state update. This includes:

- 4 player stat cards
- Bill card with tabs
- Event banners
- Composition bars (Senate, House, Supreme Court)
- Role switcher
- All available actions
- Deals panel with trust display
- Action log (last 30 entries)
- Chat messages

The entire result is assigned to `content.innerHTML`, destroying and recreating all DOM nodes. This causes:

- Loss of scroll position in log/chat panels
- Loss of focus state (partially mitigated by chat input save/restore at lines 789–798)
- Potential layout thrashing
- Unnecessary re-rendering of unchanged sections

**Recommendation:** Implement a virtual DOM diff, use targeted `textContent`/`setAttribute` updates for changed values, or at minimum split rendering into independent panels that update only when their data changes.

### 3.2 — Full State Deep-Copy on Every Action (MEDIUM)

`network.js` performs `JSON.parse(JSON.stringify(state))` at lines 367, 377, 421, and 428 — creating a full deep copy of the entire state object (~130 fields, nested objects, arrays) on every single action. This is O(n) in state size for both serialization and parsing.

Additionally, `ui.js` line 831 deep-copies state again in `playAITurn()`:

```js
var state = JSON.parse(JSON.stringify(Engine.getState()));
```

For a state object of this complexity, this could take 1-5ms per call. With AI turns executing multiple actions rapidly, this compounds.

**Recommendation:** Use a structural sharing library (e.g., Immer) or only deep-copy when transmitting over the network.

### 3.3 — Linear Searches on Arrays (LOW)

`indexOf` is used on arrays throughout the codebase instead of `Set` or `Map` lookups:

- `engine.js:556` — `agreedRoles.indexOf(role)` in event resolution
- `engine.js:2085` — `state.passedBills` search by name
- `ui.js:1248` — `dealTypes[k].roles.indexOf(targetRole)`
- `events.js` — `res.roles.indexOf(role)` in cooperative resolution checks

For the current data sizes (4 roles, ~10 bills, ~50 events) this is negligible, but it indicates a pattern that wouldn't scale.

### 3.4 — No requestAnimationFrame (LOW)

UI updates are synchronous and triggered directly by state changes. There is no batching of renders or use of `requestAnimationFrame`. Multiple rapid state changes (e.g., AI turns executing back-to-back with `setTimeout(fn, 3000)` in `ui.js:814`) could cause redundant renders.

### 3.5 — CSS Performance (LOW — Well Done)

`style.css` uses CSS custom properties (`:root` variables), avoids expensive selectors (no deep nesting, no universal attribute selectors), and uses `transition` instead of continuous animations. The single `@keyframes pulse` animation is simple opacity. Good CSS performance practices.

---

## 4. Maintainability

### 4.1 — engine.js Monolith (CRITICAL)

At 3,357 lines, `engine.js` is the largest and most critical file. It contains **all** of the following:

| Concern | Lines | Size |
|---------|-------|------|
| State initialization | 26–180 | ~155 lines |
| Bill management | 185–300 | ~115 lines |
| Voting calculations | 304–460 | ~155 lines |
| Trust/Deal system | 464–677 | ~215 lines |
| Action functions (50+) | 680–1950 | **~1,270 lines** |
| Stability & elections | 1960–2595 | ~635 lines |
| Round management | 2598–2811 | ~215 lines |
| getAvailableActions() | 2814–3073 | **260 lines** (one switch) |
| executeAction() | 3079–3296 | **220 lines** (one switch) |
| Utility functions | 3297–3357 | ~60 lines |

**Recommended split:**

```
engine/
  state.js           — State initialization, getState/setState
  actions/
    president.js     — Presidential actions (veto, sign, executive order, etc.)
    house.js         — House actions (vote, amend, kill, impeach, etc.)
    senate.js        — Senate actions (filibuster, confirm, repeal, etc.)
    supremeCourt.js  — Court actions (review, landmark, certiorari, etc.)
    shared.js        — Cross-role actions (negotiate, deal, etc.)
  voting.js          — Vote calculation and bill passage
  bills.js           — Bill creation, amendment, lifecycle
  deals.js           — Trust/deal system
  elections.js       — Election and stability management
  rounds.js          — Round lifecycle, turn order
  actions-registry.js — Maps action IDs to handlers (replaces switch)
```

### 4.2 — 260-Line Switch Statement in getAvailableActions() (HIGH)

`engine.js` lines 2814–3073 contain a single `switch` statement with cases for each role, each containing deeply nested conditionals:

```js
switch (role) {
    case 'president':
        // 100+ lines of if-else chains checking flags, state, compositions...
        break;
    case 'house':
        // another 80+ lines...
        break;
    // ...
}
```

This mixes **business rules** (e.g., "can only veto if a bill exists and hasn't been vetoed") with **action availability logic**. Each action's availability check should be colocated with its implementation.

### 4.3 — Bill Object Creation Duplication (HIGH)

Bill objects are created as object literals in **at least 7 different places** with no shared factory:

| Function | Location | Bill Type |
|----------|----------|-----------|
| `generateBill()` | `engine.js:185` | Standard bill |
| `houseChangeBill()` | `engine.js:775` | Amended bill |
| `houseInitiateLegislation()` | `engine.js:832` | House-initiated bill |
| `houseImpeach()` | `engine.js:1062` | Impeachment bill |
| `housePackCourts()` | `engine.js:1108` | Court-packing bill |
| `presidentTaxCuts()` | `engine.js:1309` | Tax cut bill |
| `senateRepealBill()` | `engine.js:1601` | Repeal bill |

Each manually sets `id`, `name`, `partisanship`, `popularity`, `legality`, `passedByHouse`, `passedBySenate`, `signed`, `markers`, etc. If a new field is added to bills, all 7 locations must be updated.

**Recommendation:** Create a `createBill(overrides)` factory function in `engine.js`.

### 4.4 — Manual Flag Reset in endRound() (HIGH)

`engine.js` lines 2648–2810 manually reset 30+ boolean flags at the end of each round:

```js
state.president.hasVetoed = false;
state.president.hasSignedBill = false;
state.president.hasCampaigned = false;
state.president.hasIssuedExecutiveOrder = false;
// ... 25+ more flags
```

If a new action is added with a per-round flag, forgetting to reset it here causes a bug where the action can only be used once per game.

**Recommendation:** Store per-round flags in a nested `roundFlags` object and reset it with a single `state[role].roundFlags = {}`.

### 4.5 — events.js Data-to-Logic Ratio (MEDIUM — Acceptable)

`events.js` is 2,652 lines, but ~2,240 lines (85%) are the `EVENT_POOL` data array — 50 structured event definitions. The actual logic (~410 lines) is well-organized with clear functions: `checkEventTrigger()`, `resolveEvent()`, `applyFailure()`, etc.

This is an acceptable architecture choice. The events are essentially data-driven configuration, and extracting them to JSON would lose the ability to reference `Engine` functions in trigger conditions. However, the file size makes it slow to navigate.

---

## 5. Bug Risks

### 5.1 — Variable Shadowing in Nested Loops (HIGH)

`engine.js` line 630 (`breakDeal` function) reuses `var i` in a nested loop:

```js
for (var i = 0; i < state.deals.length; i++) {
    // ...
    for (var i = 0; i < state.deals.length; i++) {  // shadows outer 'i'
        // ...
    }
}
```

Because `var` is function-scoped, the inner loop modifies the outer loop's counter. This could cause:
- Skipped deals
- Infinite loops
- Incorrect deal processing

### 5.2 — AI Turn Execution Without Guard (MEDIUM)

`ui.js` lines 811–823 schedule AI turns with `setTimeout(..., 3000)`. If the game state changes (e.g., another player acts via network) before the timeout fires, the AI could act on stale state. There is no cancellation mechanism for pending AI timeouts.

```js
if (isLocal && state.phase === 'action') {
    var aiTurnRole = Engine.getCurrentRole();
    if (GameAI.isAI(aiTurnRole)) {
        setTimeout(function() {
            playAITurn(aiTurnRole);  // No guard: state may have changed
        }, 3000);
    }
}
```

Additionally, `renderGame()` is called on every state update, so multiple AI timeouts could be queued simultaneously if state changes rapidly.

### 5.3 — Unchecked Array Access in Deal Fulfillment (MEDIUM)

`engine.js` line 611 (`fulfillDeal`) accesses `state.deals[dealIndex]` without bounds checking. If an invalid `dealId` is passed, `dealIndex` will be `-1` (from `indexOf`), and `state.deals[-1]` returns `undefined`. The code does check `if (!deal)` at line 614, but the `-1` index access itself is a code smell.

### 5.4 — Race Condition in Network State Sync (MEDIUM)

`network.js` line 82 shows clients blindly accepting state from the host:

```js
if (data.type === 'state') {
    Engine.setState(data.state);
    UI.renderGame(data.state);
}
```

If two state updates arrive in quick succession, the second could overwrite the first before UI rendering completes, causing visual glitches or lost state transitions.

### 5.5 — Election Logic Edge Case (LOW)

`engine.js` `holdElection()` (lines 2356–2595) checks `state.president.popularity` and adjusts it based on passed bills. If popularity exactly equals a threshold value (e.g., exactly 15), the threshold check uses `>=` in some places and `>` in others, which could cause inconsistent behavior.

### 5.6 — Stability Collapse Check Timing (LOW)

Stability is checked after each action in `executeAction()`, but the `checkStabilityCollapse()` function (line 1977) sets `state.phase = 'gameOver'` without immediately halting action processing. Subsequent actions in the same AI turn could still execute on a "game over" state.

---

## 6. Testing

### Current State: ❌ No Tests Exist

There are no test files, no test framework configuration, and no CI/CD pipeline. The codebase has zero automated test coverage.

### Testability Assessment

**Strengths for testing:**
- Pure function potential — Many engine functions (`calculateVotes`, `rollD20`, `generateBill`) are close to pure functions
- Node.js exports — Every module has `module.exports`, enabling Node.js-based testing without a browser
- Deterministic logic — Game rules are well-defined and could be expressed as assertions

**Barriers to testing:**
- **Global state mutation** — Engine functions read and write the module-scoped `state` variable directly. Tests would need to call `Engine.initGame()` before each test to reset state.
- **Inter-module coupling** — `Engine` calls `GameEvents.checkEventTrigger()` inside `endTurn()`, making it hard to test engine logic in isolation without mocking the events module
- **Random number generation** — `rollD20()` uses `Math.random()`, making action outcomes non-deterministic. Need to seed or mock `Math.random()` for reproducible tests.
- **UI coupled to DOM** — `ui.js` directly accesses `document.getElementById()` and sets `innerHTML`, requiring jsdom or a real browser for UI tests.

### Recommended Test Strategy

1. **Unit tests for engine.js** — Test each action function in isolation with known state inputs
2. **Integration tests** — Test complete round flows (generate bill → vote → pass/fail → VP calculation)
3. **AI decision tests** — Verify AI personality-weighted decisions produce valid actions
4. **Network protocol tests** — Verify message serialization and role validation
5. **Snapshot tests for UI** — Verify HTML output of render functions matches expectations

**Recommended framework:** Mocha + Chai (works with the existing ES5/CommonJS pattern).

---

## 7. Security

### 7.1 — XSS via innerHTML (CRITICAL)

`ui.js` uses `innerHTML` extensively to render the game UI. While `escapeHtml()` is used for chat messages and player names, **not all dynamic content is escaped**. Specifically:

- **Deal type labels** at `ui.js:1204` — `getDealTypeLabel()` returns unescaped HTML containing `<span>` tags
- **Bill markers** at `ui.js:998` — `bill.markers.join(' ')` is inserted raw
- **Modal body content** at `ui.js:1392` — `modalBody.innerHTML = bodyHtml` accepts raw HTML from callers
- **VP earned display** at `ui.js:1349–1355` — Constructs HTML strings with state-derived values

In a multiplayer game, a malicious player could craft a bill name, deal message, or chat text that includes `<script>` tags or event handlers. The `escapeHtml()` function handles chat, but other vectors exist.

**Recommendation:** Audit every `innerHTML` assignment. Either:
1. Use `textContent` for all text content and `createElement`/`setAttribute` for structure
2. Use a lightweight templating library with auto-escaping
3. At minimum, run `escapeHtml()` on every dynamic value before insertion

### 7.2 — Client-Side State Accessible from Console (HIGH)

The game engine is a global variable. Any player can open the browser console and:

```js
// Read all game state including other players' data
Engine.getState()

// Modify state directly
var s = Engine.getState();
s.president.vp = 999;
Engine.setState(s);

// Execute actions out of turn
Engine.executeAction('president', 'presidentVeto', {});
```

In local mode this is acceptable (single player), but in multiplayer the host can cheat freely. Clients can also call `Engine.setState()` to overwrite their local state.

**Recommendation:**
- In multiplayer, make the engine a non-global module loaded only on the host
- Clients should only have the UI renderer and network layer
- Alternatively, use `Object.freeze()` on the client-side state copy

### 7.3 — Network Role Validation Insufficient (MEDIUM)

`network.js` lines 94–100 validate that the sender's role matches the action's role:

```js
if (senderRole !== data.role) {
    console.warn('Role mismatch');
    return;
}
```

However, role assignment itself (`network.js` line 57–70) is trust-based — a client claims a role and the host stores it without verifying uniqueness or authenticity. A malicious client could claim to be a role already taken by another player.

### 7.4 — PeerJS CDN Dependency (MEDIUM)

`index.html` loads PeerJS from `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js`. This introduces:

- **Supply chain risk** — If the CDN is compromised, malicious code runs with full page access
- **Availability risk** — If unpkg goes down, multiplayer is completely broken
- **No SRI hash** — The `<script>` tag has no `integrity` attribute to verify the file hasn't been tampered with

**Recommendation:** Add Subresource Integrity (SRI) hash and a local fallback copy.

### 7.5 — No Rate Limiting on Actions (LOW)

There is no rate limiting on how quickly a player can send actions. A malicious client could flood the host with action requests, potentially causing denial-of-service or state corruption.

---

## 8. Scalability

### 8.1 — Full State Transmission (HIGH)

Every action triggers a full state broadcast to all clients via `Network.broadcastState()` (`network.js` line 114). The state object includes:

- All 4 role objects with full stats
- All bills (current, passed, unconstitutional)
- All deals (pending, accepted, fulfilled, broken)
- All events (active, queued, used)
- Action log (last 30+ entries)
- Trust matrix (4×4)
- Full composition objects for Senate, House, Supreme Court

This is transmitted as a single JSON blob. For a board game with 4 players, this is acceptable, but it means:

- No support for spectators without modification
- Network usage grows linearly with state complexity
- No partial updates (changing one VP value sends the entire world)

**Recommendation for future:** Implement delta-state sync — send only changed fields. Use a version counter to detect missed updates.

### 8.2 — Hardcoded 4-Player Limit (MEDIUM — By Design)

The game is fundamentally designed for exactly 4 players (President, House, Senate, Supreme Court). `Config.ROLES` is a fixed array of 4 elements. This is not a bug — it's a design decision — but it means:

- No spectator mode
- No 2-3 player quick-play variant (AI fills remaining roles, which works)
- No expandable role system

### 8.3 — Event Pool Exhaustion (LOW)

`GameEvents.EVENT_POOL` contains 50 events. `engine.js` tracks used events in `state.usedEvents` and skips them. In a 12-round game, approximately 6–12 events fire. This is well within the pool size. However, for hypothetical longer games, the pool could exhaust.

### 8.4 — Action Log Growth (LOW — Mitigated)

The action log grows unbounded during the game (`state.log.push(...)` in `engine.js:3304`). However, `renderActionLog()` in `ui.js:1406` only displays the last 30 entries, so UI performance is unaffected. The log is transmitted over the network, though, adding to payload size.

---

## 9. Code Smells

### 9.1 — God Object: Game State (CRITICAL)

The state object initialized in `engine.js` lines 44–174 has **~130 fields** across nested objects:

```js
var state = {
    round: 1,
    maxRounds: 8,
    phase: 'setup',
    turnOrder: [...],
    currentTurnIndex: 0,
    stability: 7,
    bills: [],
    activeBillId: null,
    passedBills: [],
    unconstitutionalBills: [],
    deals: [],
    trust: { /* 4x4 matrix */ },
    usedEvents: [],
    activeEvent: null,
    queuedEvent: null,
    log: [],
    diceHistory: [],
    president: { /* 20+ fields */ },
    house: { /* 20+ fields */ },
    senate: { /* 20+ fields */ },
    supremeCourt: { /* 20+ fields */ },
    // ... and more
};
```

There is no schema validation, no type checking, and no documentation of which fields are required vs. optional. Adding a new field requires searching all 3,357 lines of `engine.js` to ensure consistent initialization and reset.

### 9.2 — Feature Envy: UI Knows Too Much About Engine (HIGH)

`ui.js` directly accesses deep state properties:

```js
state[currentTurnRole].actionsRemaining    // ui.js:609
state.senate.composition.democrat          // ui.js:1041
state.supremeCourt.justices[j].leaning     // ui.js:1073
state.trust[myRole][r]                     // ui.js:1135
```

The UI should call engine accessor methods rather than reaching into the state object structure.

### 9.3 — Primitive Obsession (MEDIUM)

Parties, roles, leanings, and phases are all represented as plain strings:

```js
party: 'democrat'          // or 'republican'
leaning: 'liberal'         // or 'conservative' or 'moderate'
phase: 'setup'             // or 'action' or 'gameOver'
```

No enums, no validation. A typo like `'democrate'` would silently fail.

### 9.4 — Long Parameter Lists (MEDIUM)

Several functions accept many parameters through a `params` object with no documentation of expected shape:

```js
Engine.executeAction(role, actionId, params)
// params might be: { partisanshipChange, popularityChange, legalityChange }
// or: { billIndex }
// or: { dealId }
// or: { resolutionId, actionIndex }
// No documentation of which params each actionId expects
```

### 9.5 — Dead Code Indicators (LOW)

- `engine.js` exports `DEAL_TYPES` as a public property, but it's primarily used internally
- `showVoteModal()` in `ui.js` (line 1456) calls `openModal()` which doesn't exist — it should call `showModal()`. This function appears unused.
- `ui.js` `confirmAmendment` is exported but its implementation relies on modal flow that may not complete properly

### 9.6 — Temporal Coupling (MEDIUM)

Several engine operations must be called in a specific order:

1. `Engine.initGame()` must be called before any other engine function
2. `GameEvents.init(Engine)` must be called before events can fire (done in `main.js:10`)
3. `Network.init()` must be called before game start (done in `main.js:5`)

This ordering is not enforced programmatically and relies on `main.js` getting it right.

---

## 10. Technical Debt

### Debt Inventory

| ID | Priority | Category | Description | Effort |
|----|----------|----------|-------------|--------|
| TD-01 | 🔴 CRITICAL | Architecture | Split `engine.js` into 8-10 focused modules | 3-5 days |
| TD-02 | 🔴 CRITICAL | Security | Audit and fix all `innerHTML` XSS vectors | 1-2 days |
| TD-03 | 🟠 HIGH | Maintainability | Create `createBill()` factory function | 2-4 hours |
| TD-04 | 🟠 HIGH | Maintainability | Replace flag resets with `roundFlags` object pattern | 2-4 hours |
| TD-05 | 🟠 HIGH | Maintainability | Extract getAvailableActions/executeAction switch statements into action registry | 1-2 days |
| TD-06 | 🟠 HIGH | Performance | Implement targeted DOM updates instead of full innerHTML rebuild | 2-3 days |
| TD-07 | 🟠 HIGH | Code Quality | Move magic numbers to `config.js` | 4-6 hours |
| TD-08 | 🟠 HIGH | Bug Risk | Fix variable shadowing in `breakDeal()` nested loops | 30 min |
| TD-09 | 🟡 MEDIUM | Security | Protect global Engine/State from console access in multiplayer | 4-8 hours |
| TD-10 | 🟡 MEDIUM | Performance | Replace full-state deep copies with structural sharing | 1-2 days |
| TD-11 | 🟡 MEDIUM | Scalability | Implement delta-state network sync | 2-3 days |
| TD-12 | 🟡 MEDIUM | Code Quality | Fix events.js to use `Engine.rollD20()` instead of raw `Math.random()` | 30 min |
| TD-13 | 🟡 MEDIUM | UI | Extract inline styles from `ui.js` to `style.css` classes | 1-2 days |
| TD-14 | 🟡 MEDIUM | Bug Risk | Add AI turn timeout cancellation to prevent stale-state execution | 2-4 hours |
| TD-15 | 🟡 MEDIUM | Security | Add SRI hash to PeerJS CDN script tag | 15 min |
| TD-16 | 🟢 LOW | Testing | Set up Mocha + Chai test framework with initial engine tests | 1-2 days |
| TD-17 | 🟢 LOW | Code Quality | Migrate from `var` to `let`/`const` (ES6 modernization) | 1-2 days |
| TD-18 | 🟢 LOW | Code Quality | Add JSDoc comments to all public API functions | 1 day |
| TD-19 | 🟢 LOW | Bug Risk | Fix `showVoteModal()` calling nonexistent `openModal()` | 15 min |
| TD-20 | 🟢 LOW | Performance | Batch AI renders with `requestAnimationFrame` | 2-4 hours |

### Recommended Prioritization

**Phase 1 — Critical Fixes (Week 1):**
- TD-08: Fix variable shadowing bug (30 min, prevents potential game-breaking deal bugs)
- TD-02: XSS audit (1-2 days, security critical)
- TD-12: Fix dice roll inconsistency (30 min)
- TD-15: Add SRI to CDN (15 min)
- TD-19: Fix dead `openModal` reference (15 min)

**Phase 2 — Maintainability Quick Wins (Week 2):**
- TD-03: Bill factory function
- TD-04: roundFlags pattern
- TD-07: Magic numbers to config
- TD-14: AI timeout guards

**Phase 3 — Architecture (Weeks 3-4):**
- TD-01: Split engine.js
- TD-05: Action registry pattern
- TD-06: Targeted DOM updates
- TD-13: Inline style extraction

**Phase 4 — Modernization (Ongoing):**
- TD-16: Test framework
- TD-17: ES6 migration
- TD-10/TD-11: Performance and network optimization

---

## Appendix: File-Level Summary Scores

| File | Quality | Maintainability | Performance | Security | Overall |
|------|---------|-----------------|-------------|----------|---------|
| `config.js` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Excellent |
| `main.js` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Good |
| `ai.js` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Good |
| `network.js` | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | Fair |
| `events.js` | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Fair |
| `ui.js` | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | Needs Work |
| `engine.js` | ⭐⭐ | ⭐ | ⭐⭐⭐ | ⭐⭐ | Needs Work |
| `style.css` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Good |
| `index.html` | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Fair |

---

*End of audit. No game files were modified during this review.*
