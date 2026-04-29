# Changelog — Branches of Power

All notable changes to Branches of Power are documented in this file.
Uses [Semantic Versioning](https://semver.org/).

---

## [3.1.0] — 2025-07-24

### New UI Features (16 Improvements)
- **Election Countdown Warning**: Header shows rounds until next presidential election/midterm.
- **VP Change Indicators**: Animated delta badges flash when VP changes (+/-).
- **Turn Order Strip**: Visual indicator showing play order with active player highlighted.
- **Bill Flavor Descriptions**: 30 unique bill descriptions displayed on bill cards.
- **Stat Glossary Tooltips**: ℹ️ icons on VP/Pop/PC/JP with explanations on hover/click.
- **Action VP Preview**: Green hints showing expected VP gains on action buttons.
- **Event Resolution Deadline**: Urgency coloring (red) when event deadline ≤1 round + warning icon.
- **PC Cap Toast**: One-time warning toast when Political Capital is capped.
- **Chat Redesign**: Card-based messages with timestamps replacing horizontal layout.
- **Deal History Tab**: Button + modal showing full deal history with status colors.
- **Enhanced Game Over Scorecard**: Ranked scores with medals, VP breakdown, and game stats grid.
- **Round Summary Toasts**: Brief notification summarizing completed rounds.

### Balance Changes
- **Landmark Ruling Nerf**: Court Authority now lasts 3 rounds (was permanent until next ruling).
- **Role-Specific Win Bonuses**: Popular Leader (President, pop≥12 for 3+ rounds), Legislative Powerhouse (House, 6+ bills), Master Obstructionist (Senate, 4+ blocks), Judicial Authority (SC, 3+ rulings).
- **VP Source Tracking**: All bonus/end-round VP is now tracked by source for scorecard breakdown.
- **Deal History Tracking**: All deals recorded with status, round, and resolution details.
- **Round Summaries**: Snapshot of VP, stability, and events each round.

### Config Additions
- **BILL_DESCRIPTIONS**: 30 bill flavor text entries.
- **GLOSSARY**: 8 game term definitions for stat tooltips.

## [3.0.0] — 2026-04-26

### Major Balance Overhaul
- **Congressional Fatigue**: House bill passage VP reduces by 1 after first bill (caps at -1). Prevents unlimited VP farming.
- **Legislative Blitz removed**: No longer grants +2 VP for 3rd+ bill passed.
- **Host Hearing nerfed**: gainVP option reduced from +3 to +2 VP.
- **Justice Nomination cap**: President limited to 4 nominations per game, preventing nomination loops.
- **Write Opinion (NEW SC action)**: +1 VP, +1 JP, once per round. Gives SC reliable VP generation.

### Comeback Mechanics (NEW)
- **Underdog Bonus**: Last place gets +3 VP/round, 3rd place gets +2 VP/round.
- **Leader Tax**: Player 10+ VP ahead of lowest loses 3 VP/round.
- **End-Game Scoring**: Legislative Legacy (+3 VP most bills), Constitutional Guardian (+3 VP for 2+ struck-down bills), Diplomat (+3 VP most deals fulfilled), Crisis Manager (+3 VP most events resolved), Stability Champion (+3 VP Unity Summit participants if stability ≥ 8).
- **Catch-Up Events**: 3 new events trigger when VP gap > 20 (Public Backlash, Grassroots Movement, Reform Wave).
- **Court Legacy reduced**: From 2 VP to 1 VP per precedent.

### Deal System Overhaul
- **Deal deadlines**: Accepted deals must be fulfilled within 1 round or auto-break with -2 VP penalty.
- **Deal fulfillment VP**: Both parties earn +1 VP when a deal is fulfilled.
- **AI deal-making**: AI now proposes deals (30% chance per turn, targets highest-trust role). Average 12+ deals per game (was 0).

### Host Migration (NEW)
- Game survives host disconnect via automatic host migration.
- Clients store state snapshots; deterministic host election by role order.
- New host creates migrated PeerJS peer; others auto-reconnect.

### Onboarding & Tutorial (NEW)
- **Action Tooltips**: All 63 actions have descriptive title tooltips with VP/cost info.
- **First-Game Tutorial**: 5-step overlay tutorial on first game (skip available, stored in localStorage).
- **Recommended Actions**: 1-2 actions highlighted with gold star based on game state.
- **How-To-Play Modal**: "❓ How to Play" button with game overview, role descriptions, bill lifecycle.
- **Phase Labels**: Round display now shows "Round X/Y • Action Phase".

### Balance Results (200-game simulation)
- Win rates: P=14.5%, H=18%, S=41.5%, SC=26% (was P=16%, H=39-48%, S=19%, SC=27%)
- Avg VP: P=93, H=94, S=99, SC=93 — within 6 VP of each other
- Deal system active: 12+ deals per game average

## [2.2.0] — 2026-04-24

### Fixed
- **CRITICAL: Bill cards invisible on mobile** — overflow:hidden was clipping content. Added overflow:visible, enhanced bill sizing, word-break for long names
- **CRITICAL: Bill tabs too small to tap** — overrode inline max-width:150px; tabs now 44px touch targets
- **CRITICAL: Deal buttons untappable** — all deal buttons now 44px min-height
- **CRITICAL: Passed Laws button too small** — increased to 44px min-height
- **Game stall bug** — skipRemainingActions added to executeAction switch (55% of AI games were freezing)
- **House shift bug** — event failure used wrong hardcoded faction names

### Improved
- Stat labels enlarged (0.6em to 0.7em) for mobile readability
- Log entries enlarged (0.72em to 0.78em)
- Composition numbers word-wrap on narrow screens
- Role switcher buttons enlarged to 44px touch targets
- Event banner text wraps instead of overflowing
- Stability gauge responsive with flex-wrap
- AI setup rows wrap on mobile
- Comprehensive mobile visibility audit (19 findings, all addressed)

---
## [2.1.0] — 2025-07-14

### Added
- **Mobile responsive design** — comprehensive media queries for tablets (≤900px), phones (≤600px), and small phones (≤380px)
- **Accessibility improvements:**
  - ARIA attributes on modal (`role="dialog"`, `aria-modal`, `aria-labelledby`), game content (`role="main"`), and loading state (`aria-live`)
  - `:focus-visible` outlines for keyboard navigation on all interactive elements
  - `prefers-reduced-motion` support — disables all animations for vestibular disorder users
  - Minimum 44px touch targets on touchscreen devices (`pointer: coarse`)
- `theme-color` and `description` meta tags
- `development/mobile_audit.md` — full audit with 15 findings

### Fixed
- iOS Safari auto-zoom on chat input (set 16px minimum font size)
- Game header overflow on narrow viewports
- Modal cut-off on mobile (now 96% width, 92vh height)
- Toast notifications partially off-screen on phones
- Bill tabs not scrollable when multiple bills present
- Justice dots overlapping on small screens

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
