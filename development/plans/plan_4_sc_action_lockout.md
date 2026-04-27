# Plan 4: Fix SC Action Lockout

## Problem
Supreme Court gets trapped in justice nomination loops, runs out of meaningful actions by action 3, and fills remaining turns with low-value filler. SC wins only 16-20% of games.

## Approach

### 4.1 Cap Justice Nominations Per Game
**File:** `engine.js`, `presidentAssignJustice()` function (line 826)
**Change:** Limit total justice nominations to 4 per game. Add `state.president.totalNominations` to `createInitialState()` (around line 57, in the `president` object — note: this field does NOT currently exist). Add a check in `presidentAssignJustice()` after the per-round check on line 830. Also update `getAvailableActions()` (line 2842) to hide the action when the cap is reached.

> **Note:** This limits the President, not the SC directly. The SC nomination loop occurs because `presidentAssignJustice()` creates nominations → Senate rejects → President re-nominates. Capping President nominations addresses the root cause. Consider also adding the cap to `Config.PER_GAME_LIMITS` (line 115) for consistency with other game-wide limits.

### 4.2 Give SC More Repeatable VP Actions
**File:** `engine.js`
**Changes:**
- `courtClerksResearch()` (line 1948) also grants +1 VP (currently only +2 JP — confirmed at line 1952). Add `state.supremeCourt.vp += 1` and update the log message.
- Allow `courtInvestigateBill()` (line 1705) twice per round — **⚠️ CORRECTION: `investigateBill` has NO per-round flag in the code. It is already unlimited per round** (see `getAvailableActions()` line 2997-2998, which only checks for an active bill and that it's not Pack Courts). If the intent is to ADD a limit of 2 per round, create `state.supremeCourt.investigateBillUsedThisRound` as a counter, check it in `courtInvestigateBill()`, increment it there, and reset it in `endRound()` (after line 2704). If the intent was to loosen an existing restriction, no change is needed — it's already unrestricted.
- Add new action: **"Write Opinion"** — +2 VP, +1 JP, once per round. This requires:
  1. A new function `courtWriteOpinion()` in engine.js
  2. A new flag `state.supremeCourt.writeOpinionUsedThisRound` in `createInitialState()` (after line 128)
  3. Reset the flag in `endRound()` (after line 2704)
  4. Add the action to `getAvailableActions()` in the `supremeCourt` case (after line 2988)
  5. Add a case for `'writeOpinion'` in `executeAction()` switch (after line 3168)
  6. Update AI in `supremeCourtAI()` (ai.js line 296) to consider the new action

### 4.3 SC Minimum Actions Floor
**File:** `engine.js`, `endRound()` round reset logic (line 2653)
**Change:** SC always has at least 3 actions per round regardless of vacancies.

> **⚠️ CORRECTION: SC actions are NOT currently reduced by vacancies.** The SC gets `state.supremeCourt.baseActionsPerRound` (initialized to 4, line 127) every round at line 2653, plus a potential +1 from Court Calendar (line 2668-2671). Vacancies do not reduce this count anywhere in the code. The only thing that reduces SC actions is the Crisis Penalty at stability ≤ 2 (line 2764-2767), which affects ALL roles equally. If this step is meant to protect SC from the Crisis Penalty specifically, add a `Math.max(3, ...)` floor after line 2653. Otherwise, this step may be unnecessary — verify what scenario actually causes SC to run out of actions.

### 4.4 Reset Per-Round Flags for SC
**File:** `engine.js`, round reset logic in `endRound()` (lines 2693-2704)
**Change:** Ensure all per-round SC flags reset properly.

> **Audit result:** All existing SC per-round flags ARE properly reset in `endRound()`:
> - `investigateEOUsedThisRound` ✓ (line 2693)
> - `generalCourtUsedThisRound` ✓ (line 2694)
> - `advisoryUsedThisRound` ✓ (line 2695)
> - `suggestJusticeUsedThisRound` ✓ (line 2696)
> - `internalInquiryUsedThisRound` ✓ (line 2697)
> - `partisanRulingUsedThisRound` ✓ (line 2698)
> - `billReviewUsedThisRound` ✓ (line 2699)
> - `amicusBriefUsedThisRound` ✓ (line 2700)
> - `oralArgumentsUsedThisRound` ✓ (line 2701)
> - `clerksResearchUsedThisRound` ✓ (line 2702)
> - `recusedJusticeIndex` ✓ (line 2703)
> - `recusalUsedThisRound` ✓ (line 2704)
>
> **No missing resets found.** However, if §4.2 adds `writeOpinionUsedThisRound` and/or `investigateBillUsedThisRound`, those new flags MUST be added to the reset block here.

## Expected Outcome
- SC always has 3+ meaningful actions
- Justice nomination loops capped
- SC win rate increases to ~22-28%

## Verification
Run 50-game simulation and verify SC performance improves.

## Audit Notes
**Accuracy issues found:**
1. **§4.2 — `investigateBill` is NOT limited to once per round.** The plan states "currently once" but `courtInvestigateBill()` (line 1705) has no per-round flag and `getAvailableActions()` (line 2997) always shows it when a bill exists. It is already unlimited. The plan should either be corrected to note this, or clarify that the intent is to ADD a cap of 2 per round (which would actually be a nerf, not a buff).
2. **§4.3 — Vacancies do NOT reduce SC actions.** `baseActionsPerRound` is always 4 (line 127) and is set unconditionally in `endRound()` (line 2653). No code path reduces SC actions due to vacancies. This step may be solving a non-existent problem.
3. **§4.4 — No missing resets found.** All 12 SC per-round flags are properly reset in `endRound()` lines 2693-2704.

**Completeness:**
- §4.1 is well-targeted but needs: new state field, check in function, check in `getAvailableActions()`, and ideally a `Config.PER_GAME_LIMITS` entry.
- §4.2's "Write Opinion" action is significantly underspecified — needs a new function, state flag, entries in `getAvailableActions()`, `executeAction()`, round reset, and AI logic (6 code locations).

**Side effects:**
- §4.1 capping nominations may leave justice vacancies permanently unfilled if the cap is hit early. Consider what happens to `state.pendingJustice` — it remains truthy, which may lock the President into repeatedly seeing "Assign Justice" in their available actions even when capped, unless `getAvailableActions` is updated.
- §4.2 adding VP to Clerks Research makes it comparable to General Court (+2 VP, line 1772). Having two similar +2 VP actions (one giving +2 JP as well) may make Clerks Research strictly superior to General Court.

**Cross-plan interactions:**
- **With Plan 3:** Plan 3's "Constitutional Guardian" end-game bonus (+5 VP for SC striking down 2+ bills) directly synergizes with this plan's goal of boosting SC. Combined, SC may swing from underpowered to overpowered.
- **With Plan 1:** No conflicts.
- **With Plan 2:** No conflicts.

**Implementation order:** Independent of Plans 1 and 2. Implement before Plan 3 so the comeback mechanic tuning accounts for the buffed SC.

**Recommended overall implementation order:** Plan 1 → Plan 4 → Plan 2 → Plan 3
