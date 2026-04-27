# Plan 6: Add Onboarding & Tutorial

## Problem
New players face 15-20+ action buttons with no explanation. No tutorial, tooltips, or guided first game.

## Approach

### 6.1 Action Tooltips
**File:** `ui.js` + `config.js`
**Change:** Add `title` attribute tooltips to every action button with cost, effect, and VP info.

### 6.2 First-Game Tutorial Overlay
**File:** `ui.js`
**Change:** 5-step tutorial overlay on first game: role intro, stats explanation, bill lifecycle, action guide, stability warning. Skip button available. Stored in localStorage.

### 6.3 Recommended Actions Highlighting
**File:** `ui.js`
**Change:** Highlight 1-2 recommended actions with subtle glow based on game state.

### 6.4 How-To-Play Modal
**File:** `ui.js` + `index.html`
**Change:** "How to Play" button opens modal with game overview, role descriptions, bill lifecycle, VP summary.

### 6.5 Phase Labels
**File:** `ui.js`
**Change:** Show "Round X/Y • Action Phase" or "Election Phase" etc.

> ⚠️ **AUDIT:** `renderGame()` already displays `'Round ' + state.round + '/' + state.maxRounds` (ui.js line 606) and the current role's turn with action count (line 607–609). This step should *enhance* the existing header, not create a duplicate. The current display does not show the phase name (e.g., "Action Phase" vs "Election Phase"), so adding phase labels alongside the existing round counter is the correct approach.

## Expected Outcome
- New players can start playing immediately with tooltips
- Tutorial guides first-timers through core mechanics
- Recommended actions reduce analysis paralysis

## Verification
All action buttons have tooltips, tutorial works, How-to-Play modal is accurate.

## Audit Notes

**Accuracy issues:**
- Section 6.5 partially duplicates existing functionality. The round display already exists at ui.js line 606; only the phase label is missing.

**Missing implementation details:**
1. **Section 6.1 (Tooltips):** Action buttons are generated dynamically in `renderActions()` (ui.js line 1088–1121). Currently buttons display `a.label`, `a.description`, and `a.cost` but have no `title` attribute. The tooltip data (VP info, strategic guidance) must come from somewhere — likely `config.js` or the action definitions in `engine.js`. Plan should specify where tooltip text is defined.
2. **Section 6.2 (Tutorial):** The plan mentions `localStorage` for tracking first-game status but doesn't specify the key name or what happens if localStorage is unavailable (e.g., private browsing).
3. **Section 6.3 (Recommended Actions):** This requires game-state analysis logic to determine which actions to recommend. Plan should specify whether this logic lives in `ui.js`, `engine.js`, or a new module, and outline the recommendation heuristics.
4. **Section 6.4 (How-To-Play Modal):** A reusable `showModal(title, bodyHtml, buttons)` function already exists at ui.js line 1385. The "How to Play" button should use this system rather than creating a new modal. The button would need to be added to `renderMainMenu()` (line 454) and possibly the in-game header.

**Side effects:**
- Adding tutorial overlays must not block the game event delegation system set up in `UI.init()` (ui.js line 29). Ensure the overlay has proper z-index and its own dismiss handler.
- Adding tooltip `title` attributes to action buttons may interfere with any future custom tooltip system.

**Cross-plan interactions:**
- Plan 8 (XSS): Any user-visible text added in this plan that originates from game state must use `escapeHtml()`. Tooltip content from config is safe (static), but any dynamic content in the tutorial or recommendations must be escaped.
- Plan 7 (Engine refactor): If action definitions move to separate modules, tooltip data source references may need updating.

**Recommended implementation order:** Implement after Plan 8 (so new UI follows secure innerHTML patterns from the start).
