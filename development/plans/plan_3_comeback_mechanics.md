# Plan 3: Add Comeback Mechanics

## Problem
Once a player takes the lead, there's no way for trailing players to catch up. Leader's VP advantage compounds. No VP decay, equalization, or rubber band mechanics.

## Approach

### 3.1 Underdog Bonus
**File:** `engine.js`, `endRound()` function (line 2598)
**Change:** At end of each round, player(s) in last place get +2 VP, 3rd place gets +1 VP.
> **Insert location:** Add after the existing passive VP checks (around line 2625) and before `state.round++` (line 2634). Use `Config.ROLES` to iterate and sort by VP to determine placement.

### 3.2 Leader Tax (Soft)
**File:** `engine.js`, VP-granting actions
**Change:** When a player is 15+ VP ahead of the lowest player, their VP gains from non-bill actions are reduced by 1 (minimum 1 VP).

> **⚠️ Completeness concern:** This requires modifying every function that grants VP. Affected functions include (non-exhaustive): `presidentExecutiveOrder()`, `presidentBullyPulpit()`, `presidentStateDinner()`, `presidentCampaign()`, `houseHostHearing()`, `houseEarmark()`, `houseSubpoena()`, `courtGeneralCourt()`, `courtAdvisoryRole()`, `courtBillReview()`, `courtOralArguments()`, `courtAmicusBrief()`, `senateNominations()`, and more. A centralized `grantVP(role, amount)` helper function would be a better approach than touching 15+ functions individually. Bill-related VP in `housePassBill()`, `senatePassBill()`, `presidentSignBill()`, and `completeBillPassage()` should be excluded per the plan.

### 3.3 End-Game Scoring Bonuses
**File:** `engine.js`, game end logic in `endRound()` (lines 2636-2644)
**Change:** At game end (after `state.round > state.maxRounds` check, before `state.phase = 'gameOver'`), award bonus VP for achievements:
- **Legislative Legacy** (+5 VP): Most bills passed
- **Constitutional Guardian** (+5 VP): SC struck down 2+ bills
- **Diplomat** (+3 VP): Most deals fulfilled
- **Crisis Manager** (+3 VP): Most events resolved
- **Stability Champion** (+3 VP): All Unity Summit participants if stability ≥ 8

> **⚠️ Missing data tracking — several bonuses require data that isn't currently tracked:**
> - **Legislative Legacy:** `state.house.billsPassedTotal` exists (line 84), but there is no equivalent for Senate. `senatePassBill()` (line 1458) doesn't track a `billsPassedTotal` counter. You must add `state.senate.billsPassedTotal` to initial state and increment it in `senatePassBill()`.
> - **Constitutional Guardian:** Can use `state.unconstitutionalBills.length` (line 136) — this IS tracked. ✓
> - **Diplomat:** Must count fulfilled deals from `state.deals` array by filtering `status === 'fulfilled'` per role. Feasible with existing data. ✓
> - **Crisis Manager:** `state.eventHistory` (line 171) tracks resolved event IDs, but does NOT record which role resolved them. You must add a `resolvedBy` field when events are resolved (in `executeAction`, around line 3221).
> - **Stability Champion:** Requires tracking Unity Summit participants. `resolveUnitySummit()` (line 2216) has this data during resolution but doesn't persist it. Add a `state.unitySummitParticipants` array.

### 3.4 Catch-Up Events
**File:** `events.js`
**Change:** Add 3-5 events that help trailing players when VP gap > 20.

## Expected Outcome
- Games remain competitive through final rounds
- Multiple paths to victory (direct VP + end-game bonuses)
- Average VP gap between 1st and 4th < 30

## Verification
Run 50-game simulation and verify VP spread narrows.

## Audit Notes
**Accuracy issues found:**
1. **§3.2 — Severely underspecified:** "VP-granting actions" covers 15+ functions across all roles. Each would need individual modification. A centralized `grantVP()` wrapper is strongly recommended to avoid missing functions and to keep future VP-granting actions automatically subject to the leader tax.
2. **§3.3 — Missing data tracking for 3 of 5 bonuses:** Legislative Legacy needs a Senate bill counter (doesn't exist), Crisis Manager needs per-role event resolution tracking (events only log the event ID, not the resolver), and Stability Champion needs persistent Unity Summit participant data. These are prerequisite changes.

**Completeness:**
- §3.1 is straightforward but needs tie-breaking logic (what if multiple players share last place?).
- §3.4 (Catch-Up Events) is too vague — no specific events, trigger conditions, or effects described.
- **Missing step for §3.3:** The game-end bonus code must be inserted BEFORE line 2643 (`state.phase = 'gameOver'`) in `endRound()`, otherwise VP changes won't be visible. Also needs to update `getWinner()` (line 3299), which currently just checks raw VP — confirm the winner calculation happens after bonuses are applied.

**Side effects:**
- §3.1 (Underdog Bonus) gives +2 VP/round to last place. Over a 10-round standard game, that's up to +20 VP for a consistently trailing player. This is very aggressive and may create a "kingmaker" dynamic where last place is strategically advantageous.
- §3.2 interacts with Plan 1's fatigue mechanic (both reduce VP gains), potentially over-nerfing leading players.
- The +5 VP end-game bonuses in §3.3 are very large — comparable to signing a bill (+4 VP for President). Could cause VP swings that feel arbitrary.

**Cross-plan interactions:**
- **With Plan 1:** Nerfing House (Plan 1) may push House into last place frequently, triggering the underdog bonus and partially undoing the nerf. The two plans must be calibrated together.
- **With Plan 2:** The "Diplomat" end-game bonus (+3 VP for most deals) stacks with Plan 2's per-deal +1 VP, making deal-heavy strategies disproportionately rewarding.
- **With Plan 4:** "Constitutional Guardian" bonus specifically benefits SC, aligning with Plan 4's goal of boosting SC win rate. No conflict.

**Implementation order:** This plan MUST be implemented LAST. It depends on the final VP economy established by Plans 1, 2, and 4. The underdog thresholds and end-game bonus values should be tuned only after the other changes are in place and re-simulated.
