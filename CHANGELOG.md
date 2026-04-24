# Changelog — Branches of Power

All notable changes to Branches of Power are documented in this file.
Uses [Semantic Versioning](https://semver.org/).

---

## [2.0.0] — 2025-07-14

### Added
- **President Loses Election penalty** for 5 critical severity-3 events:
  - Impeachment Scandal, Hostage Crisis, Election Interference, Assassination Attempt, Pandemic Response Failure
  - `presidentLosesNextElection` flag set on drastic failure — president automatically loses the next presidential election
- Comprehensive project documentation:
  - `CHANGELOG.md` covering full development history
  - `VERSION` file for version tracking
  - `development/aiassist.md` — AI assistant onboarding guide (500+ lines)
- Updated `Config.js VERSION` to `'2.0.0'`

---

## [1.4.0] — Balance Updates

### Changed
- Drastic event failure seat shifts now transfer from **majority to minority** faction (not random)
- Seat shift magnitudes increased by **50%** for more impactful consequences:
  - House shifts: 30–68 seats (up from 20–45)
  - Senate shifts: 12–23 seats (up from 8–15)
- Improved balance across event severity levels

---

## [1.3.0] — Event Deal Negotiation

### Added
- **7 new event-related deal types**:
  - `resolveEvent` — promise to help resolve the active event
  - `commitToEvent` — commit actions toward event resolution
  - `dontResolveEvent` — request someone NOT resolve the event
  - `eventSpecialAction` — promise a specific event-related action
  - `proposeUnitySummit` — deal to propose a National Unity Summit
  - `agreeUnitySummit` — deal to agree to a proposed summit
  - `rejectUnitySummit` — deal to reject a proposed summit
- AI event deal intelligence:
  - AI evaluates event deals based on stability level, role relevance, and personality traits
  - AI proposes event-related deals when stability is low
  - AI responds to event deals considering trust, cooperation trait, and event severity

---

## [1.2.0] — National Unity Summit

### Added
- **National Unity Summit** co-action available to all roles when stability < 8
- Any role can propose a summit (costs 2 actions + 2 VP)
- Other roles can agree to join (costs 1 action + 1 VP each)
- Resolution thresholds:
  - 3 of 4 roles agree: **+2 stability**
  - 4 of 4 roles agree: **+3 stability** + bonus VP for all participants
- AI summit decision-making based on cooperation trait and current stability
- Summit proposal and response UI modals

---

## [1.1.0] — Drastic Event Failure Effects

### Added
- **15 severity-3 events** now have drastic failure effects that trigger on failed resolution:
  - `houseShift` — seats shift between factions (30–68 seats affected)
  - `senateShift` — seats shift between factions (12–23 seats affected)
  - `justiceEffect` — a justice may resign or switch partisanship
  - `presidentLosesElection` — president automatically loses the next election
- Drastic failure UI notifications and state tracking
- AI awareness of drastic failure risks when evaluating event resolution priority

---

## [1.0.0] — Full Feature Release

### Added
- **AI event resolution** — AI roles now actively participate in resolving events:
  - AI prioritizes events when stability is low based on `riskTolerance` trait
  - AI contributes to cooperative resolutions tracking `agreedRoles[]`
  - AI evaluates event severity and stability impact before committing actions
- **House bill naming** — bills initiated by the House are named "HB: [Name]" from `BILL_NAMES` array in `config.js`
- **Bill-specific deals** — 22 deal types flagged `billRelated: true` now show a bill selector dropdown
  - Deals reference specific bills by `billId`
  - Deal fulfillment checks validate against the correct bill
- Polished UI for all new features
- Comprehensive action descriptions and tooltips

### Fixed
- Various edge cases in deal fulfillment validation
- Bill reference consistency across deal lifecycle

---

## [0.9.0] — Event UI

### Added
- **Stability gauge** — visual indicator showing current stability (0–10) with color coding:
  - Green (8–10), Yellow (5–7), Orange (3–4), Red (0–2)
- **Event banner** — prominent notification when an event is active, showing:
  - Event name, category, severity, description
  - Resolution requirements and current progress
  - Countdown to failure deadline
- **Stability collapse game over** — when stability reaches 0:
  - Game immediately ends
  - All players lose (no winner)
  - Special game-over screen explaining the collapse
- Event resolution success/failure animations

---

## [0.8.0] — Events & Stability System

### Added
- **50 events** across 6 categories:
  - Domestic, Foreign, Constitutional, Economic, Security, Social
- **Stability system** (0–10 scale, starts at 5):
  - Events can raise or lower stability based on resolution
  - Failed events apply `failPenalty` to stability (note: field is `failPenalty`, NOT `failure`)
  - Stability affects available actions and game tension
- Event trigger mechanics:
  - 40% chance per round (15% if an event is already active)
  - First event always triggers on round 2
- **Cooperative event resolutions**:
  - Some events require multiple roles to resolve
  - `agreedRoles[]` tracks which roles have committed
  - Resolution triggers when enough roles agree
- Event severity levels (1–3) determining impact and difficulty
- Event deadline system — unresolved events fail after a set number of rounds

---

## [0.7.0] — Passed Laws Viewer

### Added
- **Passed Laws viewer UI** — accessible from the main game screen
  - Lists all bills that have been signed into law
  - Shows bill name, sponsor, vote tallies, and round passed
  - Scrollable list with filtering options
- Visual distinction between House bills and Executive Orders

---

## [0.6.0] — Expanded Deal Types

### Added
- **60+ deal types** covering all actions for every role
- Deals are **role-filtered** — only valid deal types appear based on the proposer's and target's roles
- Deal type categories:
  - Bill-related deals (pass, amend, support, attack, veto, sign)
  - Justice-related deals (nominate, confirm, block)
  - Political deals (lobby, filibuster, override)
  - Strategic deals (executive orders, reviews, precedents)
- Deal action filtering ensures players can only propose deals they can actually fulfill

---

## [0.5.0] — Multi-Bill Floor System

### Added
- **Multi-bill floor** — multiple bills can exist on the floor simultaneously
  - `state.bills` holds an array of bill objects, each with a unique `id` from `state.billIdCounter`
  - `state.activeBillId` tracks which bill is currently targeted by actions
- Bill management helpers:
  - `getActiveBill()` — returns the currently active bill object
  - `addBillToFloor(bill)` — adds a new bill with auto-assigned ID
  - `removeBillFromFloor(billId)` — removes a bill by ID
  - `getBillById(id)` — retrieves any bill by its ID
- `setActiveBill` action (free action — does not consume actions or advance turn)
- Bills cleared at end of round except stalled bills that carry over
- UI updates showing all bills on the floor with active bill highlighting

---

## [0.4.0] — Trust & Deal Negotiation System

### Added
- **Trust system** — per-role-pair trust values (0–10 scale):
  - All trust starts at 5
  - Trust regresses toward 5 each round (gradual normalization)
  - Trust affects deal acceptance probability and AI behavior
- **Deal negotiation lifecycle**:
  - Deal states: `pending` → `accepted` / `rejected` → `fulfilled` / `broken`
  - Deal actions are **free** (don't consume actions or advance turn):
    - `proposeDeal`, `respondDeal`, `fulfillDeal`, `breakDeal`
  - Breaking deals reduces trust; fulfilling deals increases trust
- Deal proposal and response UI modals
- AI deal evaluation based on trust, personality traits, and game state

---

## [0.3.0] — Bug Fixes

### Fixed
- **Start game** — resolved issues preventing game initialization in certain configurations
- **AI turns** — fixed AI getting stuck and not completing their turn
- **AI invalid actions** — AI no longer attempts actions that are unavailable or invalid for the current game state
  - Added fallback logic: if an action fails, AI tries other available actions; if all fail, remaining actions are skipped
- Turn advancement reliability improvements

---

## [0.2.0] — AI System

### Added
- **GameAI module** with comprehensive AI opponent system
- **32 AI personality archetypes** — 8 unique personalities per role:
  - Each personality has distinct traits: `aggressiveness`, `cooperation`, `negotiationRate`, `riskTolerance`, `baseLieRate`
  - Personalities influence action selection, deal behavior, and event responses
- AI auto-play with **3-second delay** per action for readable pacing
- AI action selection logic considering:
  - Available actions and their prerequisites
  - Current game state (bills, stability, events)
  - Personality-driven priorities
- AI deal proposal and response system

---

## [0.1.0] — Initial Game Implementation

### Added
- **Core game engine** (`engine.js`) — full game state management
- **4 playable roles**: President, House of Representatives, Senate, Supreme Court
- **Role-specific actions**:
  - President: Sign Bill, Veto, Executive Order, Nominate Justice, Lobby Congress, State of the Union, Address Nation, Power of the Purse, Propose Amendment
  - House: Pass Bill, Amend Bill, Support/Attack Bill, Initiate Legislation, Subpoena Power, Override Momentum, Committee Leverage, Caucus Meeting, Legislative Blitz, Floor Leader
  - Senate: Pass Bill, Amend Bill, Filibuster, Kill Bill, Confirm Justice, Block Justice, Nuclear Option, Override Veto, Senate Inaction (penalty)
  - Supreme Court: Constitutional Review, Judicial Precedent, Advisory Opinion, Court Calendar, Certiorari, Oral Arguments, Injunction, Clerks Research, Court Unity Bonus, Landmark Ruling, Recusal, Remand
- **Bill system** — create, amend, vote on, sign/veto legislation
- **Election system**:
  - House elections every 2 rounds
  - Senate elections every 2 rounds
  - Presidential elections every 4 rounds
  - President limited to 2 terms
- **Victory Points (VP)** — each role earns VP through their actions; highest VP at game end wins
- **Turn system** — round-robin per action with `advanceTurn()` decrementing actions AND advancing to next role
- **Game length options**: Short (6 rounds), Standard (10 rounds), Extended (24 rounds)
- **Faction system** — political faction alignment affecting votes and legislation
- **HTML5 UI** (`ui.js`) — full browser-based game interface
- **WebRTC multiplayer** (`network.js`) via PeerJS:
  - Host-authoritative architecture
  - 6-character alphanumeric room codes
  - PeerJS peer ID format: `bop-{CODE}`
  - Local play support with `roomCode = 'LOCAL'`
- **Configuration module** (`config.js`) — all constants, roles, factions, voting ranges
- **Entry point** (`main.js`) — event delegation, error handling, initialization
- CSS styling (`style.css`) for complete game UI
