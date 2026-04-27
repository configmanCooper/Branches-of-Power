# Plan 7: Refactor engine.js Monolith

## Problem
`engine.js` is 3,038 lines — a monolith containing all game logic. Hard to navigate, test, or extend.

> ⚠️ **AUDIT: Line count corrected.** Original plan stated 3,357 lines; actual count is 3,038 lines.

## Approach (NOT IMPLEMENTING YET)

### 7.1 Split into Logical Modules
- `engine-state.js` (~200 lines): State management
- `engine-bills.js` (~400 lines): Bill lifecycle
- `engine-voting.js` (~300 lines): Voting calculations
- `engine-actions-president.js` (~400 lines): President actions
- `engine-actions-house.js` (~500 lines): House actions
- `engine-actions-senate.js` (~400 lines): Senate actions
- `engine-actions-sc.js` (~400 lines): SC actions
- `engine-deals.js` (~300 lines): Deal system
- `engine-rounds.js` (~300 lines): Round lifecycle
- `engine-core.js` (~200 lines): Dispatcher and shared helpers

### 7.2 Maintain API Compatibility
Public `Engine` API remains identical.

### 7.3 Testing Strategy
Snapshot test before/after split to verify identical outputs.

## NOT IMPLEMENTING - Plan only for future reference

## Audit Notes

**Accuracy issues:**
1. **Line count was wrong** — corrected from 3,357 to 3,038 lines above.
2. **Module size estimates are inflated.** The proposed modules sum to ~3,500 lines (200+400+300+400+500+400+400+300+300+200), which exceeds the actual file size by ~460 lines. Estimates should be revised downward after the split is scoped.

**Missing implementation details:**
1. **Script loading order.** `index.html` loads scripts in dependency order: `config.js` → `ai.js` → `events.js` → `engine.js` → `network.js` → `ui.js` (lines 34–39). Splitting `engine.js` into 10 modules requires either (a) adding 10 `<script>` tags in the correct order, or (b) introducing a module bundler (e.g., rollup, webpack). Neither is mentioned in the plan.
2. **Cross-module references.** The IIFE `var Engine = (function() { ... })()` pattern means internal helper functions are closure-scoped. Splitting into modules requires making shared helpers explicitly exported/imported, which changes the module boundary design.
3. **`ai.js` and `network.js` depend on Engine's public API** (`Engine.getState()`, `Engine.getCurrentRole()`, `Engine.executeAction()`, `Engine.getAvailableActions()`, `Engine.getPendingDealsForRole()`, etc.). Section 7.2 covers this but should enumerate the full public API surface to verify nothing is missed.

**Cross-plan interactions:**
- Plan 5 (Host Migration) would add `Engine.setState()` to the public API — this must be included in the refactored module API contract.
- Plan 8 (XSS) does not affect engine.js directly.

**Recommended implementation order:** This should be the last plan implemented, after Plans 5, 6, and 8 are stable, to avoid merge conflicts and API churn.
