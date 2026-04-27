# Plan 1: Fix House VP Farming

## Problem
House wins 39-48% of games (should be ~25%). Root causes:
- `initiateLegislation` is a FREE action (no action cost)
- `housePassBill` yields 5+ VP with near-guaranteed passage
- `hostHearing` gainVP option gives +3 VP unconditionally
- No diminishing returns on repeated bill passage

## Approach

### 1.1 Make Initiate Legislation Cost 1 Action
**File:** `engine.js`, `houseInitiateLegislation()` function (line 1231)
**Change:** Remove `freeAction: true` from the return object (line 1261) AND add an `advanceTurn()` call before the return statement (currently absent because it's a free action — see comment on line 1260). Also update `getAvailableActions()` (line 2912-2913) to change the listed cost from `'Free'` to `1`.
**Impact:** House can no longer create+pass a bill in the same turn for free. Forces choice between creating new bills or doing other actions.
> **⚠️ Note:** The `executeAction()` function (line 3085) has special-case handling that allows `initiateLegislation` to bypass turn-order checks. This should be removed if it's no longer a free action. Also, line 3282 explicitly excludes `initiateLegislation` from Speaker's Gavel tracking — decide whether costed legislation should now count toward the 4-unique-actions bonus.

### 1.2 Add Congressional Fatigue (Diminishing Returns on Bill Passage)
**File:** `engine.js`, `housePassBill()` function (line 1082)
**Change:** Use the existing counter `state.house.billsPassedTotal` (initialized at line 84, incremented at line 1124). Apply fatigue reduction to `housePassVP` (the actual variable name; **not** `baseVP` as shown below — that name doesn't exist in the code). Each subsequent bill passed gives -1 VP (minimum 1 VP from passage).
- 1st bill: full VP
- 2nd bill: -1 VP from base
- 3rd bill: -2 VP from base
- etc.

> **⚠️ CONFLICT: "Legislative Blitz" bonus (lines 1123-1129)** — The existing code awards +2 bonus VP for the 3rd and every subsequent bill passed. This directly contradicts the fatigue mechanic. You MUST either remove/disable Legislative Blitz or adjust the fatigue values to account for it. Otherwise, fatigue (-2 on 3rd bill) and Blitz (+2 on 3rd bill) cancel out, making the change pointless.

**Implementation:**
```js
// In housePassBill, after calculating housePassVP (line 1106):
var fatigue = Math.min(state.house.billsPassedTotal || 0, 4); // cap at -4
var fatigueReduction = fatigue;
housePassVP = Math.max(1, housePassVP - fatigueReduction);
```
> **Note:** The fatigue uses `billsPassedTotal` before the increment on line 1124, so 1st bill has 0 fatigue (correct).

### 1.3 Nerf Host Hearing gainVP Option
**File:** `engine.js`, `houseHostHearing()` function (line 1011)
**Change:** Reduce `gainVP` option from +3 VP to +2 VP at line 1024 (`state.house.vp += 3` → `+= 2`). Also update the log message on line 1025. This brings it in line with other unconditional VP actions (e.g., General Court gives SC +2 VP).

### 1.4 Nerf State Dinner (President)
**File:** `engine.js`, `presidentStateDinner()` function (line 903)
**Change:** Reduce from +3 VP/+2 Pop to +2 VP/+1 Pop at lines 914-915. Also update the log message (line 917) and the return message (line 919). Update `getAvailableActions()` description at line 2855 (currently reads `'+3 VP, +2 Pop, target +1 VP'`).
> **Note:** This is the best *unconditional* VP action for the President. Bully Pulpit (+5 VP, line 886) is stronger but requires popularity > 15 and costs 2 Pop.

## Expected Outcome
- House win rate should drop from 39-48% to ~25-30%
- President VP generation becomes more balanced
- Players forced to diversify House strategy beyond bill farming
- Other House actions (Caucus, Subpoena, Hearing) become relatively more attractive

## Verification
Run 50-game simulation and verify House win rate is between 20-30%.

## Audit Notes
**Accuracy issues found:**
1. **§1.1 — Missing steps:** Removing `freeAction: true` alone is insufficient. The function doesn't call `advanceTurn()` (it was omitted intentionally for free actions). Without adding that call, the turn won't advance and the game will softlock. The `getAvailableActions()` label and `executeAction()` turn-bypass logic also need updates.
2. **§1.2 — Wrong variable name:** The code sample uses `baseVP` but the actual variable in `housePassBill()` is `housePassVP` (line 1106).
3. **§1.2 — Undocumented conflict:** The existing "Legislative Blitz" mechanic (lines 1123-1129) gives +2 VP for every bill after the 2nd, which directly counteracts fatigue. Must be addressed or the fix is ineffective.

**Completeness:** §1.3 and §1.4 should also update log messages and `getAvailableActions()` descriptions to reflect new values.

**Side effects:** Nerfing `initiateLegislation` to cost 1 action significantly impacts AI House players (especially "Legislator" personality with `legislativeFocus: 0.9` in ai.js) — they may need retuning.

**Cross-plan interactions:**
- **With Plan 3 (Comeback Mechanics):** If House gets heavily nerfed, the underdog bonus (+2 VP/round for last place) may partially undo the nerf by feeding the House free VP. Calibrate together.
- **With Plan 4 (SC Lockout):** No direct conflicts.

**Implementation order:** This plan is independent and can be implemented first. Recommend implementing before Plan 3 so the comeback tuning accounts for the nerfed House.
