# Plan 2: Fix Dead Deal System

## Problem
0 deals occur across 20+ simulated games. The deal system infrastructure exists (propose, accept, fulfill, break, trust tracking) but:
- AI never calls deal functions during normal play
- Deals are purely honor-based with no enforcement
- No VP incentive to make or fulfill deals
- Deal types are overwhelming (60+ in flat dropdown)

## Approach

### 2.1 Make Deals Mechanically Binding (Soft Enforcement)
**File:** `engine.js`, deal system functions
**Change:** When a deal is accepted:
- Track the promised action as `deal.deadline = state.round + 1` (must fulfill within 1 round)
- If deadline passes without fulfillment: auto-break deal, -2 VP penalty for breaker, +1 VP sympathy for victim
- Add `checkDealDeadlines()` call in `endRound()` (line 2598)

> **Note:** `expireOldDeals()` (line 657) already auto-breaks deals older than 1 round via `breakDeal()`, which applies trust penalties but **no VP penalty**. The proposed `checkDealDeadlines()` should either replace or wrap this existing logic to avoid double-breaking. Consider adding the -2 VP / +1 VP logic inside `expireOldDeals()` instead of creating a separate function.

### 2.2 Add Deal Fulfillment VP Bonus
**File:** `engine.js`, `fulfillDeal()` function (line 607)
**Change:** Both parties earn +1 VP when a deal is fulfilled. Currently `fulfillDeal()` only adjusts trust (+1.5 for the fulfiller's reputation, +1 for the requester). Add VP grants after line 615:
```js
state[deal.from].vp += 1;
state[deal.to].vp += 1;
```
This makes deal-making intrinsically rewarding.

### 2.3 Fix AI Deal-Making
**File:** `ai.js`, `getAIDecision()` function (line 470)
**Change:** Before choosing an action, call `getAIDealProposal()` (line 576 in ai.js) with 30% probability. If a deal proposal is generated, propose it as a free action before taking the main action.

> **⚠️ Implementation detail:** `getAIDecision()` returns a single action decision. To support a free deal + a main action, the return value format must change (e.g., return `{ deal: {...}, action: {...} }`), and the caller of `getAIDecision()` must be updated to handle this two-step flow. Alternatively, trigger the deal proposal in the game loop before calling `getAIDecision()`, using `Engine.proposeDeal()` directly (deals are already free actions in `executeAction()`, line 3083-3091).
>
> **Also note:** `getAIDealProposal()` (line 576) takes parameters `(aiRole, playerRole, state)` — it needs a target role. The plan should specify how the AI selects the target player (e.g., highest-trust player, random, or the player whose action the AI wants).

### 2.4 Add Deal Notification Queue
**File:** `engine.js` + `ui.js`
**Change:** When a deal is proposed to a human player, show a modal notification that requires response before continuing.

### 2.5 Simplify Deal UI Categories
**File:** `ui.js`, `renderDealsPanel()`
**Change:** Group the 60+ deal types into categories using `<optgroup>` HTML elements.

## Expected Outcome
- AI should make 2-5 deals per game on average
- Human players see clear deal notifications
- Fulfilled deals reward both parties (+1 VP each)
- Broken deals have real consequences (-2 VP + trust loss)

## Verification
Run 20-game simulation and verify average deal count > 0.

## Audit Notes
**Accuracy issues found:**
1. **§2.1 — Existing mechanism not acknowledged:** `expireOldDeals()` (line 657) already enforces deal expiration by calling `breakDeal()` after 1 round. The plan should modify this existing function rather than creating a parallel `checkDealDeadlines()`, which would cause double-breaking of expired deals.
2. **§2.3 — Missing integration details:** `getAIDecision()` returns a single action. Returning a deal proposal + main action requires either changing the return format or calling the deal separately in the game loop. The function signature of `getAIDealProposal(aiRole, playerRole, state)` also requires specifying a target role, which the plan doesn't address.

**Completeness:**
- §2.2 is well-specified and straightforward to implement.
- §2.4 and §2.5 reference `ui.js` which was not audited but appear reasonable.
- **Missing step:** The `DEAL_TYPES` object (line 465-538) contains 37 deal types, not "60+" as stated in the problem description. The UI simplification in §2.5 may be less critical than described.

**Side effects:**
- §2.1's VP penalty for broken deals stacks with existing trust penalties from `breakDeal()` (line 620-637). Combined with the -2 VP penalty, deal-breaking becomes very punishing (-2 VP, -2 trust from target, -0.5 trust from observers). This may make the AI too conservative about accepting deals.
- §2.2's +1 VP per fulfilled deal could inflate VP totals by 4-10 VP per game if the deal rate target of "2-5 deals per game" is achieved, affecting balance across all plans.

**Cross-plan interactions:**
- **With Plan 3 (Comeback Mechanics):** Plan 3 proposes a "Diplomat (+3 VP)" end-game bonus for most deals fulfilled. Combined with §2.2's per-deal VP, deal-heavy strategies become very strong. Tune together.
- **With Plan 1:** No direct conflicts.

**Implementation order:** This plan is independent. Implement after Plan 1 so that House VP nerfs are baselined before adding new VP sources from deals.
