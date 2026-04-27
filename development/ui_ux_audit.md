# Branches of Power — UI & User Experience Audit

## Date: 2025
## Version Audited: 2.2.0
## Files Reviewed: index.html, css/style.css, js/ui.js, js/config.js, js/engine.js, mobile_audit.md

---

## Executive Summary

Branches of Power is a deep, mechanically rich political strategy game with ~60+ actions across four asymmetric roles. The UI effectively communicates core game state through a well-structured 3-column layout, but the sheer complexity of the game creates significant onboarding and information-clarity challenges. The dark theme is cohesive and the role color system is strong, but several areas of action clarity, bill lifecycle communication, and deal management need improvement. The game's greatest UX risk is overwhelming new players — there is no tutorial, no tooltips, and the action grid can display 15+ buttons simultaneously.

---

## Summary Table

| Priority | Count | Description |
|----------|-------|-------------|
| CRITICAL | 4     | Fundamental UX failures that block understanding or gameplay |
| HIGH     | 10    | Significant friction points affecting most players |
| MEDIUM   | 12    | Moderate issues that degrade but don't block experience |
| LOW      | 6     | Polish and nice-to-have improvements |

---

## 1. Information Architecture

### 1.1 — Game State at a Glance

**Finding: CRITICAL — Action counter shows wrong total**

- **Problem**: The header displays `(Action X/4)` where X is `5 - actionsRemaining`. However, the Supreme Court has a variable `baseActionsPerRound` (not always 4), and Executive Privilege adds +2 actions. The denominator is always hardcoded to 4 in the turn display (ui.js line 609: `'(Action ' + (5 - state[currentTurnRole].actionsRemaining) + '/4)'`), while the player card correctly shows the dynamic max (ui.js line 942). A Supreme Court player with 3 base actions sees "Action 0/4" which is wrong.
- **Impact**: Players get confused about how many actions they actually have, especially for Supreme Court and when Executive Privilege is active.
- **Suggestion**: Compute `maxActions` the same way as the player card and use it in the header display.
- **Implementation**: In `renderGame()` (ui.js ~line 609), replace `'/4)'` with dynamic calculation:
  ```js
  var maxAct = currentTurnRole === 'supremeCourt' ? state[currentTurnRole].baseActionsPerRound : 4;
  // also check for executive privilege boost
  html += ' (Action ' + (maxAct + 1 - state[currentTurnRole].actionsRemaining) + '/' + maxAct + ')</span>';
  ```

---

**Finding: HIGH — VP scoreboard lacks labels**

- **Problem**: The VP scoreboard in the header (ui.js line 613-616) shows only role icons and numbers (e.g., `🏛️ 12`). The President and Senate share the same `🏛️` icon (config.js line 25-26), making them indistinguishable.
- **Impact**: Players can't tell President VP from Senate VP at a glance. The icon duplication defeats the purpose of a quick-read scoreboard.
- **Suggestion**: Either (a) change the Senate icon to something distinct (e.g., `🏢` or `📜`), or (b) add a 1-2 letter label next to each score (P/H/S/SC), or (c) color-code the text which is already done but insufficient when icons duplicate.
- **Implementation**: config.js — change `ROLE_ICONS.senate` to `'🏢'`. Or in ui.js line 615, add role abbreviation: `Config.ROLE_ICONS[vr] + ' ' + state[vr].vp + ' VP'`.

---

**Finding: MEDIUM — Stability gauge buried in header overflow**

- **Problem**: The stability gauge (ui.js lines 619-629) is appended after the VP scoreboard in the header, creating horizontal overflow on screens under ~1200px. It uses inline styles with fixed `width:80px` for the bar. On tablets, it may wrap awkwardly or push elements off-screen.
- **Impact**: Stability is a game-ending mechanic (reaching 0 = collapse, everyone loses) but its visual placement doesn't match its importance.
- **Suggestion**: Move stability to its own prominent row below the header or make it the first item in header-center. Use a full-width bar on mobile.
- **Implementation**: In `renderGame()`, render stability as a separate `<div class="stability-row">` between game-header and game-main. Add CSS for `.stability-row` with full-width layout.

---

**Finding: MEDIUM — No phase indicator**

- **Problem**: The game has phases (action, election, event resolution) but the current phase is not explicitly displayed. Players see either action buttons or a waiting message, but there's no text saying "ACTION PHASE" or "ELECTION PHASE."
- **Impact**: During elections or event resolution, players may not understand why the normal action grid has disappeared.
- **Suggestion**: Add a phase badge next to the round display: `Round 3/10 • Action Phase`.
- **Implementation**: In `renderGame()` after the round display, add: `html += '<span class="phase-badge">' + state.phase + '</span>';` with appropriate CSS styling.

---

### 1.2 — Action Log Usefulness

**Finding: HIGH — Action log shows only last 30 entries, no filtering**

- **Problem**: `renderActionLog()` (ui.js line 1406) renders only the last 30 log entries. There's no way to scroll back further, filter by role, or search. With 4 players each taking 4 actions per round, a 10-round game generates 160+ log entries. The 30-entry limit means you can only see ~2 rounds of history.
- **Impact**: Players who look away for a few turns (or switch tabs in multiplayer) can't catch up on what happened. They lose critical context like "who killed the bill" or "why is my popularity suddenly 3."
- **Suggestion**: (a) Add a "Full Log" button that opens a scrollable modal with all entries, filterable by role. (b) Increase the default display to 50+ entries. (c) Add round separators in the log for scannability.
- **Implementation**: 
  - Change `Math.max(0, logs.length - 30)` to `logs.length - 50` or remove the limit.
  - Add a `<button data-action="showFullLog">View Full Log</button>` that opens a modal with `state.log` fully rendered.
  - Add round headers: when `entry.round !== prevRound`, insert a separator `<div class="log-round-sep">── Round X ──</div>`.

---

**Finding: MEDIUM — Log entries lack detail for other players' actions**

- **Problem**: Log entries show role, action name, and details string, but the details are often terse (e.g., "Whip the House" with no indication of which faction or direction). The log relies on `entry.details` which is set by the engine and varies in informativeness.
- **Impact**: Players can't understand what specifically opponents did, reducing strategic depth. "Senate used Filibuster" doesn't tell you the outcome.
- **Suggestion**: Ensure all engine `addLog()` calls include full detail strings. On the UI side, consider adding outcome data (e.g., "+3 VP" in gold text for VP changes).
- **Implementation**: Engine-side changes to log messages (out of UI scope). On UI side, parse `entry.details` for VP/PC/Pop deltas and color-code them.

---

## 2. Action Clarity

### 2.1 — Action Name Intuitiveness

**Finding: HIGH — Multiple action names are opaque to new players**

- **Problem**: Several action names assume political knowledge:
  - "Whip the House" — political jargon for vote-counting/persuasion
  - "Amicus Brief" — legal term most non-lawyers won't know
  - "Writ of Certiorari" — extremely technical legal term
  - "Filibuster" — widely known but game mechanic (kill bill) differs from real filibuster (delay)
  - "Bully Pulpit" — archaic political term
  - "Earmark" — budget jargon
  - "Recuse Justice" — legal term
- **Impact**: New players spend cognitive load deciphering names instead of strategizing. The description text helps but is shown in tiny 0.7em text.
- **Suggestion**: Add tooltips on hover/long-press that explain the real-world concept AND the game mechanic. Consider renaming the most opaque ones (e.g., "Writ of Certiorari" → "Grant Cert Review" or "Review Passed Law").
- **Implementation**: Add `title` attributes to action buttons: `title="Whip the House: In real politics, 'whipping' means persuading party members to vote a certain way. In game: Convert 20 representatives from one faction to an adjacent one."`. For mobile, implement a press-and-hold tooltip popup.

---

### 2.2 — Action Cost Display

**Finding: HIGH — Cost format is inconsistent and sometimes misleading**

- **Problem**: Action costs are displayed as `Cost: X action(s)` (ui.js line 1115), but the actual `cost` field from `getAvailableActions()` mixes formats:
  - Simple: `1` (integer)
  - Complex: `'1 + 1VP'` (string, Veto)
  - Resource only: `'6PC'` (Earmark, Filibuster)
  - Multi-resource: `'1 + 6PC + 4VP'` (Pack the Courts)
  - Free: `'Free'` (Executive Privilege, Initiate Legislation)
  
  The UI appends " action" or " actions" to ALL costs (line 1115: `a.cost + ' action' + (a.cost !== 1 ? 's' : '')`), so "6PC" becomes "6PC actions" and "Free" becomes "Free actions" — both nonsensical.
- **Impact**: Players misunderstand costs. "6PC actions" implies 6 action points, not 6 Political Capital. This can cause costly mistakes.
- **Suggestion**: Differentiate cost types. If cost is a number, show "Cost: X action(s)". If cost is a string, show it as-is: "Cost: 1 + 6PC + 4VP". If "Free", show "Free Action" with a green badge.
- **Implementation**: In `renderActions()` (ui.js line 1115):
  ```js
  var costText;
  if (a.cost === 'Free') {
      costText = '🆓 Free Action';
  } else if (typeof a.cost === 'number') {
      costText = 'Cost: ' + a.cost + ' action' + (a.cost !== 1 ? 's' : '');
  } else {
      costText = 'Cost: ' + a.cost;
  }
  html += '<span class="action-cost">' + costText + '</span>';
  ```

---

### 2.3 — Hidden Consequences

**Finding: CRITICAL — Several actions have effects not mentioned in descriptions**

- **Problem**: Action descriptions from `getAvailableActions()` are incomplete:
  - `executiveOrder`: Description says "+1 VP, +1 Popularity" but doesn't mention it counts toward the 2-EO threshold that enables "Investigate EO" by the Supreme Court (which costs -2 VP and -2 Pop).
  - `advocate`: Says "+/-2 PC to chambers, -5 Bill Pop" but the actual pop penalty and PC distribution depends on target selection (both/house/senate) — the modal reveals this but the action grid description doesn't hint at the choice.
  - `signBill`: Says "+4 VP, Popularity bonus" but doesn't quantify the popularity bonus or mention that it completes the bill lifecycle.
  - `veto`: Cost shows "1 + 1VP" but the VP loss is a penalty; it's not spending VP like PC. The phrasing conflates resource costs.
  - `killBill`: Says "+1 VP, bill dead this round" — but doesn't mention it prevents ALL bills from passing this round (`billKilledThisRound` flag blocks future pass attempts).
  - `governmentShutdown`: Says "House PC=0, -4 Pres Pop" but doesn't mention it costs 6 PC and also triggers stability -1 in some scenarios.
- **Impact**: Players make suboptimal decisions or feel cheated when unexpected consequences occur. The game punishes players who don't have expert-level knowledge of the hidden effects.
- **Suggestion**: Expand descriptions to include ALL mechanical effects. Use a two-line format: line 1 for primary effect, line 2 for side effects/risks.
- **Implementation**: Update all action descriptions in `getAvailableActions()` (engine.js). For example:
  ```js
  { id: 'executiveOrder', label: 'Executive Order', cost: 1, 
    description: '+1 VP, +1 Popularity. Warning: 2+ EOs/round enables SC investigation (-2 VP, -2 Pop).' }
  ```

---

### 2.4 — Unavailable Actions

**Finding: HIGH — Unavailable actions are hidden entirely rather than greyed out**

- **Problem**: `getAvailableActions()` only returns actions whose preconditions are met. Actions that exist but can't be used (e.g., "Veto" when no bill has passed, "Impeach" when PC < 6) are simply absent from the grid. Players don't know these actions exist until conditions are met.
- **Impact**: Players can't plan ahead. A House player may not know "Impeach President" is even an option until they accumulate 6 PC. This especially hurts new players who don't know what capabilities their role has.
- **Suggestion**: Show all possible actions for the role, but disable unavailable ones with a brief reason tooltip. Use `opacity: 0.4` and `cursor: not-allowed` for disabled actions. Show the precondition that's unmet.
- **Implementation**: 
  1. Add a `getAllActions(role)` function to engine.js that returns every action with an `available` boolean and `reason` string.
  2. In `renderActions()`, render all actions but add `disabled` class and title text to unavailable ones:
     ```js
     html += '<button class="action-btn' + (a.available ? '' : ' disabled') + '" ' +
       (a.available ? 'data-action="gameAction"' : 'title="' + a.reason + '"') + '>';
     ```
  3. CSS: `.action-btn.disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }`

---

### 2.5 — Action Results

**Finding: MEDIUM — Action results only shown as toasts, no persistent feedback**

- **Problem**: When an action is executed, results appear as a toast notification (3-second display, then fades). If a player blinks or is distracted, they miss the outcome. The toast system (ui.js lines 441-451) uses a fixed 3-second timer with no way to review past toasts.
- **Impact**: Players miss critical feedback like "Bill passed 287-148" or "Impeachment failed." The log entries provide some backup but are less detailed.
- **Suggestion**: (a) Increase toast duration to 5 seconds for important outcomes. (b) Add a "last action result" persistent display near the action panel. (c) Make toasts clickable to dismiss rather than auto-dismiss.
- **Implementation**: In `showToast()`, increase timeout from 3000 to 5000ms. Add click-to-dismiss: `el.addEventListener('click', function() { el.remove(); });`. For persistent feedback, add a `<div class="last-result">` that persists until next action.

---

## 3. Bill Visibility & Management

### 3.1 — Bill Tabs and Floor View

**Finding: MEDIUM — No indication of how bills get on the floor**

- **Problem**: Bills appear on the floor but there's no visible mechanism explanation. "Initiate Legislation" is listed as a free action for House, but new players may not understand why there's sometimes 0, 1, or multiple bills. There's no explanation that a new bill auto-generates each round.
- **Impact**: Players confused about bill lifecycle entry point.
- **Suggestion**: Add a small info text above the bill area: "A new bill appears each round. House can add more via 'Initiate Legislation.'"
- **Implementation**: In `renderBillsPanel()`, add an info line when bills exist: `html += '<div class="bills-info" style="font-size:0.75em;color:#888;margin-bottom:4px">📋 Bills on the floor this round:</div>';`

---

### 3.2 — Bill Stats and Voting Outcome Connection

**Finding: CRITICAL — No way to preview vote outcome before calling a vote**

- **Problem**: When a player uses "Pass Bill" (House or Senate), a modal asks how much PC to spend, but doesn't show a vote prediction. The partisanship value determines which factions vote yes, and the current composition determines vote counts, but this information is only available by cross-referencing the bill's partisanship with the composition bars and mentally calculating vote ranges from config.js constants. There is no visual aid connecting these.
- **Impact**: This is the most strategically important decision in the game, and players are flying blind. Even experienced players struggle to mentally calculate whether a bill with partisanship 12 will pass a Senate composed of 28D/22MD/24MR/26R.
- **Suggestion**: Add a vote prediction widget to the Pass Bill modal. Show expected YES/NO counts for each faction based on current partisanship and composition. Show the pass threshold (218 House / 60 Senate) and whether the bill is projected to pass.
- **Implementation**: In `showPassBillModal()` (ui.js line 386), add prediction:
  ```js
  // Calculate vote prediction using faction voting ranges from Config
  var bill = Engine.getActiveBill();
  var factions = chamber === 'house' ? Config.HOUSE_FACTIONS : Config.SENATE_FACTIONS;
  var comp = state[chamber].composition;
  // For each faction, check if bill.partisanship falls in their voteYesMin..voteYesMax
  // Sum up yes/no votes and display a bar
  html += '<div class="vote-prediction">Estimated: YES ' + yesCount + ' / NO ' + noCount + '</div>';
  html += '<div>Need: ' + threshold + ' to pass</div>';
  ```

---

### 3.3 — Bill Lifecycle Clarity

**Finding: MEDIUM — Bill status badges don't explain the full lifecycle**

- **Problem**: Bill cards show `House: ✅ Passed / ⏳ Pending` and `Senate: ✅ Passed / ⏳ Pending`, but the full lifecycle (Introduced → House Vote → Senate Vote → President Sign/Veto → SC Review) isn't visualized. Players don't know what happens after both chambers pass.
- **Impact**: New players don't realize they need the President to sign the bill, or that the Supreme Court can strike it down later.
- **Suggestion**: Add a horizontal pipeline/stepper showing all lifecycle stages with the current stage highlighted.
- **Implementation**: In `renderBillCard()`, add after bill-status:
  ```html
  <div class="bill-pipeline">
    <span class="stage done">📝 Introduced</span> → 
    <span class="stage active">🏠 House</span> → 
    <span class="stage pending">🏛️ Senate</span> → 
    <span class="stage pending">✍️ President</span> → 
    <span class="stage pending">⚖️ Court</span>
  </div>
  ```

---

### 3.4 — Passed Laws Viewer

**Finding: LOW — Passed Laws modal has no summary statistics**

- **Problem**: The Passed Laws modal (ui.js line 1311-1383) lists all laws individually but doesn't summarize patterns — e.g., total laws passed, average partisanship skew, which player benefited most from bill VP.
- **Impact**: Minor. Advanced players want to analyze legislative trends for strategy.
- **Suggestion**: Add a summary section at the top of the modal: "X laws enacted, Y struck down. Average partisanship: Z. VP earned by bills: P=X, H=Y, S=Z, SC=W."
- **Implementation**: Before the law list in `showPassedLawsModal()`, compute and render summary stats.

---

## 4. Deal/Negotiation UI

### 4.1 — Deal Type Overload

**Finding: HIGH — 60+ deal types displayed in a flat dropdown with no categories**

- **Problem**: The deal proposal modal (ui.js lines 1228-1262) renders deal types in `<select>` dropdowns, but there are 60+ deal types (Engine.DEAL_TYPES) listed in a single flat alphabetical list. Players must scroll through dozens of options to find what they want.
- **Impact**: The deal system becomes impractical. Players may avoid making deals entirely because the UI is too cumbersome.
- **Suggestion**: Group deal types by category (VP deals, PC deals, Bill-related deals, Political actions). Use `<optgroup>` elements or a searchable dropdown.
- **Implementation**: Add a `category` field to DEAL_TYPES in engine.js. In `showProposeDealModal()`, group by category:
  ```js
  html += '<optgroup label="VP Deals">';
  // ... filtered deal types
  html += '</optgroup>';
  ```

---

### 4.2 — Deal Outcomes Not Tracked

**Finding: MEDIUM — No history of completed/broken deals**

- **Problem**: Once a deal is fulfilled or broken, it disappears from the UI. There's no deal history panel. Trust numbers change but there's no context for WHY trust went up or down.
- **Impact**: Players can't remember who broke promises. The trust mechanic feels opaque.
- **Suggestion**: Add a "Deal History" section in the deals panel showing last 5 completed/broken deals with icons (✅ fulfilled / 💔 broken).
- **Implementation**: Filter `state.deals` for `status === 'fulfilled'` or `status === 'broken'` and render in `renderDealsPanel()`.

---

### 4.3 — Deal Proposal Doesn't Show What You're Getting

**Finding: MEDIUM — "Ask" and "Offer" phrasing is confusing**

- **Problem**: The deal modal says "What do you ask them to do?" and "What do you offer in return?" but once accepted, the deals panel shows "Promised X: [offer]" and "They will: [ask]." The framing shifts between proposal and commitment views, which is disorienting.
- **Impact**: Players sometimes confuse what they offered vs. what they asked for.
- **Suggestion**: Use consistent framing. In the proposal modal: "I will do: [offer dropdown]" / "They will do: [ask dropdown]". In the deals panel: maintain same "I will" / "They will" structure.
- **Implementation**: Relabel modal headers in `showProposeDealModal()`.

---

## 5. Event System UI

### 5.1 — Event Banner Visibility

**Finding: MEDIUM — Event banner is inline with scrollable content, not sticky**

- **Problem**: The event banner (ui.js lines 651-704) is rendered inline in the center panel between the bill card and the composition bars. If the user scrolls down to the action grid, the event banner scrolls out of view. Events have round countdowns and failure consequences, making them time-critical.
- **Impact**: Players forget about active events while focusing on their action grid. They may miss the deadline.
- **Suggestion**: Make the event banner sticky at the top of the center panel, or add a persistent mini-indicator in the header.
- **Implementation**: Add CSS: `.event-banner { position: sticky; top: 0; z-index: 10; }` or render a compact event reminder in the header when an active event exists.

---

### 5.2 — Resolution Options Lack Cost Information

**Finding: HIGH — Event resolution actions don't show their costs clearly**

- **Problem**: Event resolutions are displayed in the event banner as labeled options with role requirements, but the actual costs are only visible in the action grid (as event-specific action buttons). The banner shows "Bipartisan Response (House + Senate)" but doesn't say "Costs 1 action + 2 PC."
- **Impact**: Players can't evaluate whether resolving an event is worth the cost without scrolling to the action grid.
- **Suggestion**: Include cost information directly in the resolution option display within the event banner.
- **Implementation**: In the event banner rendering (ui.js lines 682-697), include `res.cost` if available:
  ```js
  html += ' <span style="color:#aaa;font-size:0.8em">(Cost: ' + res.cost + ')</span>';
  ```

---

### 5.3 — Failure Consequences Formatting

**Finding: LOW — Failure warnings are listed with pipe separators, hard to scan**

- **Problem**: Failure effects (ui.js lines 667-677) are joined with ` | ` separators in a single line. With multiple effects, this becomes a dense, hard-to-read string: "Stability -2 | Popularity -3 | 🏛️ House composition shift! | ⚖️ Justice resigns!"
- **Impact**: Players may miss individual failure effects in the dense text.
- **Suggestion**: Render each failure effect on its own line as a bulleted list.
- **Implementation**: Replace `failWarnings.join(' | ')` with `'<br>• ' + failWarnings.join('<br>• ')`.

---

## 6. Visual Design

### 6.1 — Color Scheme

**Finding: LOW — Dark blue-on-dark-blue contrast for panel backgrounds**

- **Problem**: The CSS variables define `--bg-dark: #1a1a2e`, `--bg-panel: #16213e`, and `--bg-card: #0f3460`. The difference between bg-dark (#1a1a2e) and bg-panel (#16213e) is very subtle — both are dark navy. Player cards use bg-dark on bg-panel, creating a barely-visible distinction.
- **Impact**: Visual hierarchy between content layers is weak. It's hard to tell where one panel ends and another begins.
- **Suggestion**: Increase the lightness difference between bg-dark and bg-panel. Consider `--bg-panel: #1e2a4a` for more contrast.
- **Implementation**: Update CSS variables in `:root`.

---

### 6.2 — President and Senate Icon Duplication

**Finding: HIGH — President (🏛️) and Senate (🏛️) use identical icons**

- **Problem**: Both President and Senate use the `🏛️` icon (config.js lines 25-26). This causes confusion in the VP scoreboard (header), log entries, event resolution role requirements, and chat messages. Users must rely on color alone to distinguish them.
- **Impact**: Color-blind users and anyone quickly scanning the scoreboard will confuse these roles.
- **Suggestion**: Change one icon. Options:
  - Senate → `🏢` (office building — "Senate building")
  - Senate → `📜` (scroll — "legislation")
  - President → `🦅` (eagle — "executive power")
- **Implementation**: config.js line 28: change `senate: '🏛️'` to `senate: '🏢'`.

---

### 6.3 — Interactive vs Static Elements

**Finding: MEDIUM — Static text and interactive buttons use similar styling**

- **Problem**: The trust display values, composition numbers, and stability text all look similar to clickable elements. Conversely, the "Passed Laws" button (ui.js line 733) is styled to look like a static info bar (subtle background, thin border) rather than a button.
- **Impact**: Players may not realize "Passed Laws" is clickable. They may try to click non-interactive elements.
- **Suggestion**: Give all interactive elements a consistent visual cue — slightly raised appearance, or a hover cursor indicator visible on desktop. Make the Passed Laws button look more like a button with standard .btn styling.
- **Implementation**: Replace inline styles on the Passed Laws button with `class="btn btn-secondary"` and keep the text content.

---

### 6.4 — Visual Hierarchy

**Finding: MEDIUM — Action grid competes with bill card for attention**

- **Problem**: The bill card and the action grid are both in the center panel with similar visual weight. The action grid uses the same bg-panel background as everything else. When a player's turn begins, their eye should be drawn to the action grid first, but the bill card's colored header is more eye-catching.
- **Impact**: Players sometimes stare at the bill card wondering what to do, when the action grid is where they need to focus.
- **Suggestion**: When it's the player's turn, add a subtle highlight/border to the actions panel (e.g., a pulsing glow in the role color). Add a persistent "YOUR TURN" arrow or badge pointing at the action grid.
- **Implementation**: In `renderActions()`, when `isMyAction` is true, add a CSS class: `html += '<div class="actions-panel my-turn">'`. CSS: `.actions-panel.my-turn { border: 2px solid var(--accent-gold); box-shadow: 0 0 12px rgba(218,165,32,0.3); }`

---

## 7. Player Onboarding

### 7.1 — No Tutorial or Help System

**Finding: CRITICAL — Zero onboarding for new players**

- **Problem**: There is no tutorial, help screen, rules reference, glossary, or "How to Play" button anywhere in the game. The main menu offers three options: Host, Join, Local — all assume the player knows the rules. A new player launching the game for the first time is immediately presented with 4 asymmetric roles, 15+ actions per role, bill mechanics, voting systems, and political jargon.
- **Impact**: The game is effectively unplayable for anyone who hasn't read external documentation. Player retention will be severely impacted.
- **Suggestion**: Add at minimum:
  1. A "How to Play" button on the main menu linking to a rules modal
  2. First-time tooltips on key UI elements
  3. A simplified "Tutorial Game" mode with guided steps
  4. Role-specific strategy hints shown when a role is selected
- **Implementation**:
  - Add `<button class="btn btn-secondary btn-large" data-action="showHelp">❓ How to Play</button>` to main menu
  - Create a `showHelpModal()` function with tabbed content: Overview, Roles, Bills, Voting, Events
  - In `renderActions()`, add `title` attributes to each action button with extended descriptions

---

### 7.2 — AI Setup Screen Lacks Guidance

**Finding: MEDIUM — AI personality selection provides no information**

- **Problem**: The AI setup screen (ui.js lines 501-526) shows a dropdown with personality names (e.g., "Aggressive", "Dealmaker") but no description of what each personality does or how it affects AI behavior. The "Random" option gives no hint either.
- **Impact**: Players can't make informed choices about AI opponents, reducing the value of AI customization.
- **Suggestion**: Add a short description next to each personality option, or show a tooltip on hover. Include playstyle hints like "Aggressive: Prioritizes VP gain, rarely makes deals."
- **Implementation**: In `showLocalSetup()`, render personality descriptions below each dropdown, or use `<option title="...">` attributes (though these aren't universally displayed). Better: add a `<small>` description text that updates when the personality dropdown changes.

---

### 7.3 — Action Grid Overwhelm

**Finding: HIGH — Up to 20+ action buttons displayed simultaneously**

- **Problem**: The Supreme Court can see 18+ actions at once (Judicial Review, Inquiry of President, Inquiry of Chamber, Investigate EO, Investigate Bill, Bill Review, Amicus Brief, Disapprove Justice, Suggest Justice, General Court, Advisory Role, Internal Inquiry, Partisan Ruling, Constitutional Crisis, Recusal, Landmark Ruling, Certiorari, Oral Arguments, Injunction, Clerks Research, and event actions). The action grid displays all of these equally.
- **Impact**: Analysis paralysis. New players freeze when confronted with 18 options. Even experienced players need time to scan all options each turn.
- **Suggestion**: Group actions by category with collapsible headers:
  - "⚡ Quick Actions" (General Court, Clerks Research, Advisory)
  - "📋 Bill Actions" (Bill Review, Investigate Bill, Oral Arguments, Amicus Brief)
  - "⚖️ Judicial Actions" (Judicial Review, Certiorari, Injunction)
  - "🏛️ Political Actions" (Inquiry, Investigate EO, Internal Inquiry)
  - "💪 Power Moves" (Partisan Ruling, Constitutional Crisis, Landmark Ruling)
- **Implementation**: Add a `category` field to action objects in `getAvailableActions()`. In `renderActions()`, group actions by category and render category headers.

---

## 8. Multiplayer UX

### 8.1 — Other Players' Actions Not Visible

**Finding: HIGH — In multiplayer, you can't see what other players are doing in real-time**

- **Problem**: In online mode, when it's not your turn, you see `Waiting for [Role] to act...` (ui.js line 1100). The action log updates after each action, but there's no real-time indication of what the active player is considering or doing. You can't see their cursor, their modal choices, or even how many actions they've used.
- **Impact**: Non-active players are bored and disengaged. There's no spectator experience.
- **Suggestion**: (a) Show the active player's action count updating in real-time. (b) Show "Player is considering..." when they open a modal. (c) Animate log entries appearing in real-time as actions are taken.
- **Implementation**: Network messages could broadcast action-start events, and the UI could show a "choosing..." indicator. At minimum, the header's action counter already updates — ensure the re-render happens promptly after each action via network state sync.

---

### 8.2 — Chat System Is Minimal

**Finding: MEDIUM — Chat is a single-line horizontal scroll, easy to miss**

- **Problem**: The chat bar (ui.js lines 777-785) shows messages in a horizontal scroll strip at the bottom of the screen. Only the last ~3 messages are visible without scrolling. There's no notification for new messages, no message persistence, and no way to scroll chat history. Messages are white-space:nowrap (style.css line 396).
- **Impact**: In a negotiation-heavy game, inadequate chat cripples the social strategy layer.
- **Suggestion**: (a) Add a chat notification badge/sound when new messages arrive. (b) Consider a vertical chat panel (collapsible sidebar or modal). (c) Show last message as a floating banner. (d) Highlight messages directed at your role.
- **Implementation**: Replace horizontal chat with a collapsible vertical chat panel. Add `chatUnread` counter and badge.

---

### 8.3 — Room Code / Lobby Clarity

**Finding: LOW — No feedback while waiting for host to create room**

- **Problem**: When clicking "Create Room" in the host flow (ui.js line 471-475), there's no loading indicator while PeerJS establishes the connection. The room code just appears (or doesn't, if it fails). The button has no disabled state during connection.
- **Impact**: Players may click "Create Room" multiple times or think the game is broken.
- **Suggestion**: Add a loading spinner after clicking "Create Room." Disable the button during connection. Show error messages clearly.
- **Implementation**: In `handleAction` case `doHostGame`, disable the button and show "Connecting..." text. Re-enable on callback.

---

### 8.4 — Disconnection Handling

**Finding: MEDIUM — No visible reconnection UI**

- **Problem**: There's no visible indicator in the UI for connection status. If a player disconnects and reconnects, there's no banner saying "Reconnected" or "Player X disconnected." The network.js likely handles this, but the UI has no visual hooks for connection state.
- **Impact**: Players don't know if the game is still connected. Silent failures are the worst UX.
- **Suggestion**: Add a connection status indicator in the header (green dot = connected, red = disconnected). Show a banner when a player disconnects: "⚠️ Senate has disconnected. Waiting for reconnection..."
- **Implementation**: Add a `<span class="connection-status">` in the header. Network.js should call a UI function like `UI.showConnectionStatus('disconnected', role)` that displays a toast or banner.

---

## 9. Desktop vs Mobile

### 9.1 — Desktop-Specific Improvements

**Finding: MEDIUM — 3-column layout wastes space on wide screens**

- **Problem**: The game-main grid is `220px 1fr 260px` (style.css line 173). On a 1920px monitor, the center panel is ~1440px wide, which is far too wide for the content. Bill cards, composition bars, and action grids stretch unnecessarily. The action grid's `minmax(160px, 1fr)` creates tiny cards scattered across a huge space.
- **Impact**: Poor use of screen real estate on desktop. Content feels sparse and disconnected.
- **Suggestion**: Add a max-width to the game-main or center-panel (e.g., `max-width: 1200px; margin: 0 auto`). Or use the extra space for a permanently visible deals panel or expanded log.
- **Implementation**: CSS: `.game-main { max-width: 1400px; margin: 0 auto; }` or widen the left/right panels proportionally on larger screens.

---

**Finding: LOW — No keyboard shortcuts for common actions**

- **Problem**: All interactions require mouse clicks. There are no keyboard shortcuts for common actions like "End Turn," "Pass Bill," or switching between roles in local mode.
- **Impact**: Desktop power users can't navigate efficiently.
- **Suggestion**: Add keyboard shortcuts: number keys 1-9 for action buttons, Tab to cycle roles, Enter to confirm modals, Escape to close modals.
- **Implementation**: Add a `keydown` event listener in `init()`. Map key codes to action buttons by index. Show shortcut hints in action button labels: `"[1] Executive Order"`.

---

### 9.2 — Desktop-Mobile Parity Issues

**Finding: LOW — Composition bar tooltips only work on desktop (hover)**

- **Problem**: Composition bar segments have `title` attributes (ui.js lines 1045-1048) showing faction counts. These are hover-only and invisible on mobile/touch devices.
- **Impact**: Mobile users can't see individual faction counts in the composition bars (they must read the text below).
- **Suggestion**: The text line below already shows the numbers, so this is low impact. For parity, consider making segments tappable to show a popup.
- **Implementation**: Add `data-tooltip` attributes and a tap-to-show-tooltip handler for touch devices.

---

## 10. Accessibility

### 10.1 — Screen Reader Support

**Finding: HIGH — Minimal ARIA attributes and semantic structure**

- **Problem**: The HTML is almost entirely generated via innerHTML in JavaScript (ui.js). The game board uses `<div>` elements for everything — player cards, action buttons, stats. There are no `role`, `aria-label`, or `aria-live` attributes on dynamically generated content. The only ARIA in the codebase is on the static modal overlay (index.html line 19) and the loading div (line 15).
- **Impact**: Screen reader users cannot play this game. All dynamically rendered content is invisible to assistive technology.
- **Suggestion**: This is a large effort but critical for accessibility:
  1. Add `role="button"` and `aria-label` to all action buttons
  2. Add `aria-live="polite"` to the action log and toast container
  3. Add `role="status"` to the turn display
  4. Add `aria-label` descriptions to stat values (e.g., `aria-label="Victory Points: 12"`)
  5. Use semantic HTML where possible (`<button>` instead of `<div>` for clickable elements)
- **Implementation**: Throughout `renderGame()`, `renderActions()`, `renderPlayerStats()`, and `renderBillCard()`, add ARIA attributes to generated HTML strings. The toast container already exists in index.html — add `aria-live="assertive"` to it.

---

### 10.2 — Keyboard Navigation

**Finding: MEDIUM — Partial keyboard support**

- **Problem**: Focus-visible styles exist (style.css lines 815-822) which is good. However, many interactive elements are `<div>` or `<span>` elements without `tabindex`, making them unreachable via Tab key. The action buttons use `<button>` elements (good), but the role cards in the lobby use `<div class="role-card" data-action="selectRole">` — a div acting as a button without `tabindex="0"` or `role="button"`.
- **Impact**: Keyboard-only users can't select roles in the lobby, switch roles in local mode, or interact with composition bars.
- **Suggestion**: Add `tabindex="0"` and `role="button"` to all clickable `<div>` elements. Add `onkeydown` handling for Enter/Space on these elements.
- **Implementation**: In `renderLobby()`, change role cards from `<div>` to `<button>` elements, or add `tabindex="0" role="button"`. The event delegation system (ui.js line 31-42) already handles click events — extend it to handle `keydown` events for Enter/Space on `[data-action]` elements.

---

### 10.3 — Color Blind Considerations

**Finding: HIGH — Red/green used for passed/pending with no secondary indicator**

- **Problem**: Multiple UI elements rely solely on red/green color distinction:
  - Bill status: passed = green (`#4CAF50`), pending = orange (`#FF9800`). This is actually green/orange, which is better, but:
  - Composition bars: Democrat blue vs Republican red — these are fine, but Moderate Democrat (`#6495ED` light blue) vs Moderate Republican (`#F08080` light coral) may be difficult for deuteranopia.
  - Trust display: `>= 7` = green (`#4CAF50`), `>= 4` = orange (`#FF9800`), `< 4` = red (`#f44336`). These rely entirely on color with only emoji differentiation (👍/🤝/👎).
  - Stability gauge: green/blue/orange/red gradient with no pattern or shape difference.
  - Justice dots: Liberal blue, Conservative red, Moderate gray — relies on blue/red distinction.
- **Impact**: ~8% of males with red-green color blindness will struggle to distinguish faction compositions, trust levels, and stability states.
- **Suggestion**: 
  1. Add text labels alongside color indicators (already partially done for trust with emojis — good).
  2. Add patterns or hatching to composition bar segments (stripes for one party, solid for another).
  3. Use shape in addition to color for justice dots (circle = liberal, square = conservative, diamond = moderate).
  4. Ensure all color-coded information has a text fallback.
- **Implementation**: The composition bars already have text labels below them (good). Trust uses emojis (good). Main gaps: stability gauge needs text label (already has one — "Prosperous/Stable/Unstable/Crisis"), justice dots need shape or letter indicators. In `renderCompositionBars()` for court justices, add a letter inside the dot: `L`, `M`, `C` instead of `⚖`.

---

### 10.4 — Font Size and Readability

**Finding: MEDIUM — Several text elements below 12px**

- **Problem**: Multiple elements use font sizes below the recommended 12px minimum:
  - `.stat-label`: 0.65em ≈ 10.4px (style.css line 215)
  - `.action-desc`: 0.7em ≈ 11.2px (style.css line 354)
  - `.action-cost`: 0.7em ≈ 11.2px (style.css line 355)
  - `.comp-numbers`: 0.7em ≈ 11.2px (style.css line 291)
  - `.log-round`: 0.75em ≈ 12px (borderline)
  - AI badge: inline 0.7em (ui.js line 916)
  - Various inline styles with `font-size:0.8em` or smaller
  
  The mobile audit fixed some of these for ≤600px, but they remain issues on desktop/tablet.
- **Impact**: Reduced readability for anyone with impaired vision, older users, or on low-DPI screens.
- **Suggestion**: Set a minimum font size of 12px for all text. Increase `.stat-label` to 0.75em, `.action-desc` and `.action-cost` to 0.8em, `.comp-numbers` to 0.78em.
- **Implementation**: Update the font sizes in style.css for the mentioned selectors. These are non-breaking changes as the layout accommodates slightly larger text.

---

## Prioritized Action Plan

### Immediate (CRITICAL — fix before next release)

| # | Finding | Section | Effort |
|---|---------|---------|--------|
| 1 | Action counter shows wrong total for SC/Executive Privilege | 1.1 | Small |
| 2 | Hidden consequences in action descriptions | 2.3 | Medium |
| 3 | No vote prediction in Pass Bill modal | 3.2 | Medium |
| 4 | No tutorial or help system | 7.1 | Large |

### Short-term (HIGH — next 2-3 sprints)

| # | Finding | Section | Effort |
|---|---------|---------|--------|
| 5 | VP scoreboard icon duplication (🏛️/🏛️) | 1.2, 6.2 | Small |
| 6 | Action cost format inconsistency ("6PC actions") | 2.2 | Small |
| 7 | Unavailable actions hidden instead of greyed out | 2.4 | Medium |
| 8 | Action log too limited (30 entries, no filtering) | 1.2 | Medium |
| 9 | Deal type dropdown overload (60+ flat list) | 4.1 | Medium |
| 10 | Opaque action names with no tooltips | 2.1 | Medium |
| 11 | Action grid overwhelm (20+ buttons) | 7.3 | Medium |
| 12 | Event resolution costs not shown in banner | 5.2 | Small |
| 13 | Other players' real-time action visibility | 8.1 | Medium |
| 14 | Screen reader accessibility (ARIA) | 10.1 | Large |
| 15 | Red/green color-blind issues | 10.3 | Medium |

### Medium-term (MEDIUM — backlog)

| # | Finding | Section | Effort |
|---|---------|---------|--------|
| 16 | Stability gauge placement | 1.1 | Small |
| 17 | Phase indicator missing | 1.1 | Small |
| 18 | Log entry detail quality | 1.2 | Medium |
| 19 | Bill lifecycle pipeline visualization | 3.3 | Small |
| 20 | Bill floor mechanism explanation | 3.1 | Small |
| 21 | Deal history tracking | 4.2 | Small |
| 22 | Deal proposal framing confusion | 4.3 | Small |
| 23 | Event banner not sticky | 5.1 | Small |
| 24 | Action results too ephemeral (3s toast) | 2.5 | Small |
| 25 | Interactive vs static element distinction | 6.3 | Small |
| 26 | Action panel turn highlighting | 6.4 | Small |
| 27 | AI personality descriptions | 7.2 | Small |
| 28 | Chat system improvements | 8.2 | Medium |
| 29 | Disconnection handling UI | 8.4 | Medium |
| 30 | Desktop wide-screen layout optimization | 9.1 | Small |
| 31 | Keyboard navigation gaps | 10.2 | Medium |
| 32 | Font sizes below 12px on desktop | 10.4 | Small |

### Low Priority (polish)

| # | Finding | Section | Effort |
|---|---------|---------|--------|
| 33 | Panel background contrast | 6.1 | Small |
| 34 | Passed Laws summary stats | 3.4 | Small |
| 35 | Failure warning formatting | 5.3 | Small |
| 36 | Keyboard shortcuts | 9.1 | Medium |
| 37 | Composition tooltip mobile parity | 9.2 | Small |
| 38 | Lobby loading feedback | 8.3 | Small |

---

## Notes

- The prior mobile audit (mobile_audit.md) addressed critical touch target and text overflow issues — those fixes remain sound and are not repeated here.
- All inline styles in ui.js make CSS overrides difficult. A long-term refactor to move inline styles to CSS classes would improve maintainability and make future UI fixes easier.
- The game re-renders the entire DOM on every state change (`content.innerHTML = html`). This causes input focus loss, scroll position reset, and performance concerns. A future refactor to virtual DOM or targeted updates would significantly improve UX.
