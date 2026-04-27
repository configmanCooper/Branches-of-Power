# Branches of Power — Gameplay & Difficulty Audit

**Date:** 2025-07-18  
**Version Audited:** 2.2.0  
**Based on:** Full source code analysis (`config.js`, `engine.js` ~3360 lines, `ai.js` ~680 lines, `events.js` 50 events), prior rules/balance audit, batch simulation data (10 games), detailed simulation log, and 10 fresh simulation runs.

---

## Fresh Simulation Results (10 Standard Games, All-Random AI)

| Game | President | House | Senate | Supreme Court | Rounds | Stability | Collapse? |
|------|-----------|-------|--------|---------------|--------|-----------|-----------|
| 1    | 53        | 85    | 57     | **254**       | 11     | 9         | No        |
| 2    | 116       | **153** | 115  | 114           | 11     | 10        | No        |
| 3    | 62        | 111   | 30     | **130**       | 11     | 6         | No        |
| 4    | 139       | **179** | 154  | 118           | 11     | 6         | No        |
| 5    | 89        | **163** | 48   | 88            | 11     | 10        | No        |
| 6    | 44        | 96    | **101**| 31            | 11     | 8         | No        |
| 7    | 68        | 34    | **116**| 72            | 11     | 7         | No        |
| 8    | 44        | **96** | 72   | 30            | 11     | 9         | No        |
| 9    | 75        | 84    | **88** | 38            | 11     | 9         | No        |
| 10   | 84        | **180**| 43   | 61            | 11     | 9         | No        |

**Winners:** House (5), Senate (3), Supreme Court (2), President (0)

### Batch Simulation Results (Prior Run — 10 Games)

| Sim | Winner       | President | House | Senate | SC  |
|-----|-------------|-----------|-------|--------|-----|
| 1   | Senate       | 56        | 65    | **85** | 17  |
| 2   | President    | **106**   | 33    | 71     | 75  |
| 3   | Supreme Court| 67        | 36    | 43     | **124**|
| 4   | House        | 84        | **101**| 101   | 47  |
| 5   | President    | **148**   | 76    | 127    | 43  |
| 6   | President    | **96**    | 0     | 62     | 36  |
| 7   | Senate       | 112       | 105   | **125**| 47  |
| 8   | President    | **123**   | 29    | 106    | 56  |
| 9   | President    | **113**   | 72    | 107    | 68  |
| 10  | President    | **104**   | 0     | 102    | 15  |

**Winners:** President (5), Senate (2), House (1), Supreme Court (1), Tie (1)

### Combined 20-Game Summary

| Role           | Wins | Win Rate | Avg VP | Median VP | Min VP | Max VP |
|----------------|------|----------|--------|-----------|--------|--------|
| President      | 5    | 25%      | 89     | 84        | 44     | 148    |
| House          | 6    | 30%      | 88     | 90        | 0      | 180    |
| Senate         | 5    | 25%      | 85     | 88        | 30     | 154    |
| Supreme Court  | 4    | 20%      | 68     | 54        | 15     | 254    |

---

## 1. Game Flow & Pacing

### 1.1 Are Games Too Long or Short?

**Finding: Standard (10 rounds) pacing is uneven; short games feel rushed, extended games drag**

- **Priority:** MEDIUM
- **Problem**: Standard 10-round games feel front-loaded. The early rounds (1-4) are spent building resources (PC, JP, popularity) with little direct conflict. Meaningful interaction between players — bill passage through both chambers, judicial review, elections — clusters in the mid-to-late game. Short 6-round games barely reach one election cycle (presidential election at round 4), meaning the entire game might play out under a single political configuration with no disruption.
- **Impact**: New players in short games never experience the "game-changing" moments (party change, impeachment, pack courts). Extended 24-round games risk tedium as the action set doesn't expand — players repeat the same optimal actions 24 times instead of 10.
- **Suggestion**: Add escalation mechanics that scale with round number — e.g., +1 VP for all bill-related actions after round 6, event frequency increases after round 12, or unlock "late-game actions" (impeachment, pack courts) only after round 4.
- **Implementation**: In `engine.js`, `endRound()` function (~line 2598): add a round-based multiplier to VP awards. In `getAvailableActions()` (~line 2814): gate Impeachment and Pack Courts behind `state.round >= 4`.

### 1.2 Dead Rounds

**Finding: Rounds 1-3 frequently produce minimal interaction**

- **Priority:** HIGH
- **Problem**: In simulations, rounds 1-3 see each role operating in isolation. The President issues executive orders or campaigns. House passes bills unilaterally. Senate debates and builds PC. SC does General Court and Clerks Research. There's no forcing function for cross-branch interaction until a bill passes both chambers (rare early) or an event triggers. Players can go 3+ rounds without meaningfully affecting each other.
- **Impact**: The game's core promise — political negotiation and checks-and-balances — is absent for the first 30% of a standard game. Players build resources in parallel rather than competing.
- **Suggestion**: Start round 1 with an event active (guaranteed), start stability at 4 instead of 5 to create immediate pressure, and give each role a "first 100 days" bonus action in round 1 to encourage aggressive early play.
- **Implementation**: In `createInitialState()` (~line 26): set `stability: 4`. After initial state creation, call `GameEvents.checkEventTrigger(state)` to seed a starting event. Add `state.firstRoundBonus = true` and grant 5 actions in round 1.

### 1.3 Tension Curve

**Finding: Tension builds erratically, driven by elections rather than player agency**

- **Priority:** MEDIUM
- **Problem**: The most dramatic moments in simulations were elections (rounds 4, 8) — particularly presidential elections that flip the party. These are largely dice-driven (d20 vs popularity). The game doesn't build player-driven tension; instead, tension spikes when random events occur or elections change the landscape. Between those spikes, the game is flat.
- **Impact**: Players feel like passengers between election rounds rather than drivers of the narrative.
- **Suggestion**: Add a visible "political pressure" tracker that increases when players take aggressive actions (filibuster, impeach, witchhunt, government shutdown). At thresholds, unlock new actions or trigger special events. This gives players agency over the tension curve.
- **Implementation**: Add `state.politicalPressure = 0` to initial state. Increment in relevant action functions. Add threshold checks in `endRound()`.

### 1.4 Election Impact

**Finding: Elections are impactful but feel detached from player decisions**

- **Priority:** MEDIUM
- **Problem**: Elections at rounds 2, 4, 6, 8 reshape chamber compositions based on presidential popularity. However, only one player (President) has direct control over popularity — other players can affect it only indirectly. The House and Senate players watch their compositions change based on another player's stat, with no recourse. Presidential elections (round 4, 8) are the most impactful — a party flip in the simulation completely changed gameplay — but the outcome is a d20 roll against popularity.
- **Impact**: Elections feel like the game happening TO players rather than being caused BY players. The Senate and House players have almost no control over the election outcome that reshapes their entire toolkit.
- **Suggestion**: Let each role influence elections: House should have a "Get Out The Vote" action, Senate should have a "Campaign Finance" action, SC should be able to issue election-related rulings. All should affect election outcomes.
- **Implementation**: Add pre-election actions in `getAvailableActions()` when `state.round % 2 === 0`. Modify `processHouseElection()` and `processSenateElection()` to factor in PC spent or special flags.

### 1.5 Event System Variety

**Finding: Events add meaningful variety but feel samey in resolution**

- **Priority:** LOW
- **Problem**: The 50 events span 6 categories (Domestic, Foreign, Constitutional, Economic, Social, Security) with good thematic diversity. However, resolution options follow a narrow template: "Role X spends 1 action [+ resource]" or "Roles X and Y cooperate." Most resolutions cost 1 action and reward 2-3 VP + stability. After seeing 3-4 events, the decision is always "who has an action to spare?" rather than a genuine strategic dilemma.
- **Impact**: Events become rote after the novelty wears off. Players always take the cheapest resolution that applies to them.
- **Suggestion**: Add more events with trade-off resolutions (e.g., "Resolve for +3 stability but your VP is halved" or "Resolve with a roll — success is amazing, failure is catastrophic"). Add events where resolution actively benefits one role at another's expense.
- **Implementation**: In `events.js`, add more events with `rollRequired: true` at higher thresholds (14+), and add resolutions with negative VP for the resolver but positive stability. Add `specialActions` to more events (currently only 2 of 50 have them).

---

## 2. Decision Depth

### 2.1 Meaningful Choices Per Turn

**Finding: Roles have widely varying decision depth — House has too many good options, SC has too few**

- **Priority:** HIGH
- **Problem**: Per turn, the House has 15-18 available actions with multiple good choices (pass bill, support/attack, caucus, subpoena, hearing, rider, initiate legislation as free). The President has 8-12 actions but many are situational (veto/sign only when bill passed, assign justice only with vacancy). The Senate has 8-10 actions but is often funneled into confirm justice or debate. The Supreme Court has 12-15 actions but only 3-4 produce VP (General Court, Advisory, Bill Review, Oral Arguments), all once-per-round limited. After using those 3-4, remaining actions are filler.
- **Impact**: House players always have interesting choices. SC players run out of good actions by action 3 and are forced into low-impact filler (Inquiry of President/Chamber for +1 VP). This creates an engagement asymmetry.
- **Suggestion**: Give SC more repeatable VP actions. Make Clerks Research (+2 JP) also grant +1 VP. Allow Investigate Bill to be used twice per round. Add a "Write Opinion" action: +2 VP, +1 JP, once per round.
- **Implementation**: In `getAvailableActions()` for `supremeCourt` case (~line 2988): remove the `investigateBillUsedThisRound` check (or add a new uncapped action). In `courtClerksResearch()` (~line 1948): add `state.supremeCourt.vp += 1`.

### 2.2 Dominant Strategies

**Finding: Several dominant strategies make other options irrelevant**

- **Priority:** CRITICAL
- **Problem**: 
  1. **House: Initiate Legislation (free) → Pass Bill** is the overwhelmingly dominant strategy. The free action creates a custom bill, and passing it yields 5+ VP base + bonuses. No other House action comes close in VP efficiency. Caucus Meeting (+3 PC) and Host Hearing (+3 VP) are distant seconds.
  2. **President: State Dinner (+3 VP, +2 Pop, target +1 VP)** dominates all other president actions except situational ones (sign bill, assign justice). Executive Order (+1 VP, +1 Pop) is strictly worse. Campaign (+4 Pop for 2 actions = 2 Pop/action) is only worth it when popularity is critically low.
  3. **SC: Judicial Review (unconstitutional)** is worth 10-15 VP — far more than any other SC action. The entire SC strategy revolves around setting up and executing Judicial Review. If there are no reviewable passed bills, SC has no path to competitive VP.
- **Impact**: The game reduces to formulaic play for House and SC. President and Senate have more variety but still have clear "best" actions. True strategic depth requires that multiple paths be approximately equal in expected value.
- **Suggestion**: 
  - Nerf State Dinner to +2 VP, +1 Pop (still good but not dominant)
  - Make Initiate Legislation cost 1 action instead of free
  - Add a VP cap or diminishing returns for repeated bill passage (e.g., 2nd bill pass in a game gives -1 VP, 3rd gives -2 VP)
  - Give SC alternative VP paths: event resolution VP should be higher, and "Court Legacy" should be visible mid-game as a motivator
- **Implementation**: In `presidentStateDinner()` (~line 903): change VP from 3 to 2, Pop from 2 to 1. In `houseInitiateLegislation()` (~line 1231): remove the `freeAction: true` return, call `advanceTurn()` instead. In `housePassBill()` (~line 1082): add diminishing returns based on `state.house.billsPassedTotal`.

### 2.3 Interesting Trade-offs

**Finding: The game has good trade-off design in theory, but implementation undermines it**

- **Priority:** MEDIUM
- **Problem**: The game has well-designed trade-offs on paper:
  - Advocate/Admonish: help chambers pass bills but costs -5 bill popularity
  - Bully Pulpit: convert popularity into VP (-2 Pop, +5 VP)
  - Government Shutdown: nuke House PC but lose 2 VP yourself
  - Kill Bill: block legislation but only +1 VP
  - Witchhunt: devastate SC but costs 2 actions, 2 VP, 2 Pop
  
  However, because dominant strategies exist, players never reach these interesting trade-offs. Why use Bully Pulpit (-2 Pop, +5 VP) when State Dinner (+3 VP, +2 Pop) is strictly better? Why Kill Bill when you can just pass your own bill for 5+ VP?
- **Impact**: The game's best-designed mechanics go unused because the VP-optimal path avoids them entirely.
- **Suggestion**: Flatten the VP curve on "safe" actions (State Dinner, General Court, Caucus Meeting) and increase VP on "risky" actions (Bully Pulpit, Government Shutdown, Constitutional Crisis) so players are tempted to take risks.
- **Implementation**: Adjust VP values in respective action functions across `engine.js`.

### 2.4 Trap Actions

**Finding: Several actions look appealing but are almost always bad**

- **Priority:** MEDIUM
- **Problem**:
  1. **Earmark (-6 PC, +4 VP)**: Costs 6 PC (the maximum carryover!) for only 4 VP. Caucus Meeting gives +3 PC for 1 action; you'd need 2 Caucus Meetings to fund 1 Earmark. Those same 2 actions spent on Host Hearing (+3 VP × 2 = 6 VP) are better AND don't consume PC.
  2. **Power of the Purse (-4 VP, lose Pres & Senate 1 action)**: You spend 4 VP to deny others 2 actions total. Those 2 denied actions are worth roughly 4-6 VP to the victims. You're spending 4 VP to deny ~5 VP — barely net positive, and you lose the tempo.
  3. **Pack Courts (-6 PC, -4 VP)**: Costs 10 resources to create a bill that starts at Pop 5, Leg 5 — extremely hard to pass. Even if passed, the SC gets -10 VP which partially comes back to haunt you through the SC's reduced ability to generate VP-affecting events.
  4. **Revive Bill (Senate)**: Brings a passed bill back to the floor. This undoes VP everyone earned from passing it. No player should ever want to bring back a bill that's already been passed — it erases progress.
- **Impact**: New players will try these actions, realize they're terrible, and lose. Experienced players will never use them, reducing the effective action space.
- **Suggestion**: 
  - Earmark: reduce cost to 4 PC or increase VP to 6
  - Power of the Purse: reduce cost to 2 VP or add +2 VP to House as compensation
  - Pack Courts: reduce PC cost to 4, or remove the VP cost
  - Revive Bill: clarify this is for tactical use (bringing back a bill to modify and re-pass for more VP) or add a VP bonus for reviving
- **Implementation**: Adjust costs/rewards in `houseEarmark()` (~line 1274), `housePowerOfPurse()` (~line 1302), `housePackCourts()` (~line 1198), `senateReviveBill()` (~line 1515).

### 2.5 Never-Used Actions

**Finding: Multiple actions are effectively dead**

- **Priority:** HIGH
- **Problem**: Across 20 simulations and the detailed simulation log, these actions were never or almost never taken:
  1. **Constitutional Crisis** (SC): Costs 2 actions + 8 JP. 8 JP requires 4 rounds of Clerks Research (the only JP generator). Spending half the game's JP for a legality modifier that might help future reviews is terrible ROI.
  2. **Partisan Ruling** (SC): Costs 2 actions + 4 JP. Shifts only the current bill's partisanship by 1 (supposed to be permanent per rules but isn't implemented that way). 4 JP and 2 actions for +1 shift is absurd.
  3. **Constitutional Amendment** (co-action): Requires President Pop ≥ 15, 3 players to agree, each spending 2 actions + 1 VP + resources. The total cost is approximately 6 actions + 3 VP + 2 PC across 3 players. The payoff: one unconstitutional bill returns to the floor and SC loses 5 VP. Almost never worth the coordination cost.
  4. **Impeach President** (House): Costs 6 PC + 1 action, creates a bill requiring supermajority (288/435 House, 67/100 Senate). In practice, impossible to pass unless compositions are extremely skewed.
- **Impact**: These actions occupy mental space and menu real estate without being viable. They create the illusion of depth without contributing to it.
- **Suggestion**: Either make them viable by reducing costs, or remove them and replace with more practical alternatives. Specifically:
  - Constitutional Crisis: Reduce JP cost to 4, make it a 1-action ability
  - Partisan Ruling: Implement the permanent modifier as rules intended, or reduce cost to 1 action + 2 JP
  - Impeach: Reduce PC cost to 4, reduce threshold to simple majority
- **Implementation**: Adjust cost checks and effects in respective functions. For Partisan Ruling, add `state.supremeCourt.partisanshipModifier` and apply in `generateBill()` alongside `legalityModifier`.

---

## 3. Difficulty Curve

### 3.1 New Player Approachability

**Finding: The game is overwhelming for new players**

- **Priority:** HIGH
- **Problem**: Each role has 12-18 available actions per turn, many with complex prerequisites and resource costs. A new House player sees: State of the Union, Whip the House, Support Bill, Attack Bill, Kill Bill, Host Hearing, Rider Amendment, Earmark, Caucus Meeting, Subpoena, Power of the Purse, Popularize Bill, Change Bill Now, Pass Bill, Initiate Legislation, Impeach, Pack Courts — plus potential Amendment and Unity Summit actions. That's 19 actions to evaluate on turn 1. Each has different costs (actions, PC, VP), different effects (bill stats, VP, popularity, chamber composition), and different prerequisites.
- **Impact**: Analysis paralysis is inevitable. New players will make random or suboptimal choices and fall behind players who've learned the dominant strategies. The learning curve is a cliff, not a curve.
- **Suggestion**: 
  - Implement a "tutorial mode" that presents only 4-5 core actions per role in the first 3 rounds, then gradually unlocks advanced actions
  - Add action categories in the UI: "Legislative" (pass, support, attack, kill), "Political" (hearing, subpoena, state of union), "Nuclear" (impeach, pack courts, shutdown)
  - Highlight recommended actions based on game state (e.g., "Bill aligns with your party — consider passing it")
- **Implementation**: In `getAvailableActions()` (~line 2814): add a `state.tutorialMode` flag. When true, return only core actions (pass bill, support/attack bill, debate, executive order, general court, etc.). Add a `tutorialRoundsRemaining` counter that unlocks more actions each round.

### 3.2 Learning Curve

**Finding: There is no gradual skill progression — the game is either confusing or solved**

- **Priority:** MEDIUM
- **Problem**: There are two player states: confused (don't understand the systems) and solved (know the dominant strategies). There's no middle ground where a player is "getting better." Once you discover that House should Initiate Legislation → Pass Bill, or that SC should always do General Court + Advisory + Bill Review + Clerks Research, the game is "solved" for that role. There's no ladder of increasingly sophisticated strategies to discover.
- **Impact**: Replayability suffers. After 3-5 games, players have found the optimal lines and the game becomes mechanical.
- **Suggestion**: Create strategic depth through interaction: make VP from bills depend on both chambers' composition AND the bill's stats, so players must negotiate. Add asymmetric information (e.g., each player gets a secret "agenda" card worth bonus VP if achieved). Add timing incentives (bonus VP for passing a bill in rounds 1-3 vs late-game).
- **Implementation**: Add `state[role].secretObjective` in `createInitialState()`. Add objective evaluation in `getWinner()`. Add round-based VP modifiers in bill passage functions.

### 3.3 Action Description Clarity

**Finding: Action descriptions are too terse for informed decision-making**

- **Priority:** MEDIUM
- **Problem**: Action descriptions in `getAvailableActions()` are 3-8 words: "Vote on bill," "+5 Pop, more extreme," "Various effects." These don't convey enough information for players to make informed choices. "Various effects" for State of the Union gives no hint at the 5 sub-options. "+5 Pop, more extreme" for Support Bill doesn't explain that "more extreme" means ±2 partisanship away from center, which affects which factions vote yes/no.
- **Impact**: Players must either memorize the full rules or click actions to see what happens — neither is good UX.
- **Suggestion**: Expand descriptions to include concrete numbers and effects. Show projected vote counts for pass-bill actions. Display current bill stats in the action tooltip.
- **Implementation**: In `getAvailableActions()`: change descriptions to include current state info. E.g., for `housePassBill`: `'Vote on bill (est. ' + calculateHouseVotes(bill, 0) + '/218 votes)'`.

### 3.4 Cognitive Overload

**Finding: Too much simultaneous state to track**

- **Priority:** HIGH
- **Problem**: At any given moment, a player must track: their VP, their PC/JP, the active bill's 3 stats, the active bill's passage status (House/Senate), the president's popularity, chamber compositions (4 factions each for House and Senate, 3 for SC), stability, active event + deadline, trust with 3 other players, active deals, pending justice nominations, pending amendments, pending unity summits, round number, election timing, per-game action limits. That's easily 30+ state variables affecting their decisions.
- **Impact**: Human players cannot process all this information. They will simplify by ignoring most state and focusing on VP, leading to shallow play that doesn't engage with the game's deeper systems.
- **Suggestion**: 
  - Surface the 3-5 most decision-relevant pieces of information per action
  - Hide intermediate state (chamber compositions) behind a "details" panel
  - Add visual indicators (green/yellow/red) for key thresholds (bill passability, stability danger, election proximity)
  - Reduce the number of simultaneous systems: consider removing trust/deals from the core game and making it an "advanced" module
- **Implementation**: UI changes primarily. In engine, add helper functions: `getBillPassChance(bill, chamber)`, `getElectionOutlook()`, `getStabilityStatus()` that return simplified assessments.

### 3.5 1 Human + 3 AI vs 4 Humans

**Finding: Solo play against AI is a fundamentally different and inferior experience**

- **Priority:** HIGH
- **Problem**: The AI uses a weighted priority system (`pickFromPriorities`) that never negotiates deals, rarely coordinates on cooperative events, and can't assess long-term strategy. The AI resolves events based on cooperation trait + stability, but never strategically refuses events to pressure opponents. Against 3 AI opponents, the human player can exploit predictable behavior (AI always signs aligned bills, AI always confirms aligned justices) for guaranteed VP.
  
  With 4 human players, the game becomes a negotiation game where deals, trust, and bluffing matter. These systems (trust, deals, lie detection) are entirely absent in AI play. The trust system regresses toward neutral (5) every round, and deals expire after 1 round, so even the mechanical infrastructure for politics doesn't persist.
- **Impact**: The game is designed as a 4-player negotiation game but most plays will be 1 human + 3 AI. The AI doesn't negotiate, so 80% of the game's design (trust, deals, lying, cooperation) is unused.
- **Suggestion**: 
  - Improve AI to proactively propose deals with the human player more often
  - Make AI personalities more distinct in observable behavior (aggressive AI should filibuster and shutdown visibly)
  - Add "AI tells" — when AI is considering aggressive actions, show a warning to the human player
  - Consider a "vs AI" mode where the human plays all 4 roles in sequence (hot-seat solo)
- **Implementation**: In `ai.js`, increase `negotiationRate` for all personalities. In `getAIDealProposal()` (~line 576), make proposals more frequent and strategic. Add a `getAIIntent()` function that surfaces what the AI is considering to the UI.

---

## 4. Win Conditions & VP Balance

### 4.1 Can Every Role Realistically Win?

**Finding: Yes, but with wildly different variance**

- **Priority:** HIGH
- **Problem**: Across 20 simulations, all four roles won at least once. However, the VP variance is extreme:
  - **House**: 0 to 180 VP (range: 180). When the House gets favorable compositions and bills align, it dominates. When compositions are unfavorable, it can score literally 0.
  - **Supreme Court**: 15 to 254 VP (range: 239). SC's VP is almost entirely dependent on Judicial Review outcomes. A game with many reviewable bills and favorable court composition produces massive VP; a game without produces nearly nothing.
  - **President**: 44 to 148 VP (range: 104). More consistent but tied to popularity management and bill passage.
  - **Senate**: 30 to 154 VP (range: 124). Moderate variance, heavily dependent on whether bills can pass the 60-vote threshold.
- **Impact**: The winner is often determined by initial random conditions (chamber compositions, court leanings) rather than player skill. A liberal court facing liberal bills can't rule them unconstitutional — the SC player is structurally locked out of their best VP action regardless of skill.
- **Suggestion**: 
  - Add a "catch-up" VP bonus: any role more than 20 VP behind the leader at election time gets +3 VP
  - Normalize starting conditions: guarantee court is balanced (3 lib / 3 con / 3 mod) rather than random
  - Add VP floors: no role can go below 0 VP (prevents the demoralization of negative VP)
  - Add role-specific VP objectives that don't depend on other players' actions
- **Implementation**: In `createInitialState()`, set `justices` to a fixed balanced distribution. In `processElections()`, add catch-up logic. In all VP deduction code, add `Math.max(0, state[role].vp - amount)`.

### 4.2 Runaway Leader Problem

**Finding: The game has a severe runaway leader problem, especially for House and SC**

- **Priority:** CRITICAL
- **Problem**: Once a role gets ahead, the game's mechanics amplify the advantage:
  - **House VP snowball**: Legislative Blitz gives +2 VP for each bill after the 3rd. Populist Surge gives +3 VP for popular bills. Speaker's Gavel grants a bonus action for variety. These bonuses compound — a House that passes 3 bills is rewarded with bonus VP, making it harder for others to catch up.
  - **SC VP snowball**: Each Judicial Review creates a precedent. Precedent Dividends give +1 VP per precedent per round. A SC with 5 precedents earns +5 passive VP every round. Over 5 rounds, that's 25 VP from doing nothing. Plus Court Legacy at game end gives +2 VP per precedent. 5 precedents = +10 VP at game end.
  - **President snowball**: High popularity → favorable elections → more aligned congress → easier to pass aligned bills → more VP from bill passage → higher popularity.
- **Impact**: By round 5, the winner is often already determined. The remaining rounds feel like going through the motions.
- **Suggestion**: 
  - Cap Precedent Dividends at 3 VP per round regardless of precedent count
  - Remove or reduce Legislative Blitz bonus
  - Add anti-snowball events: "Corruption Scandal" triggers when any role has 2× the VP of the lowest role, hitting the leader with -5 VP
  - Make elections more volatile for leaders (higher popularity = more to lose)
- **Implementation**: In `endRound()` (~line 2609): cap `precVP` at 3. In `housePassBill()` (~line 1123): reduce or remove blitz bonus. Add a leader-check in `endRound()` that triggers balancing events.

### 4.3 Comeback Mechanics

**Finding: Comeback mechanics are almost nonexistent**

- **Priority:** HIGH
- **Problem**: The only comeback mechanics are:
  1. **Elections**: Can flip compositions, but don't directly transfer VP. A trailing player gets no VP boost from a favorable election.
  2. **Impeachment**: Costs 6 PC and requires supermajority — practically impossible for a trailing player to execute.
  3. **Witchhunt**: Requires Pop ≥ 15 — unlikely for a trailing President.
  4. **Pack Courts**: Costs 6 PC + 4 VP — a trailing House can't afford this.
  5. **Events**: Sometimes penalize the leader, but penalties are small (-1 to -3 VP) and spread across all players.
  
  There is no rubber-banding mechanic, no "Hail Mary" action, no mechanism that lets a trailing player take a big risk for a big reward.
- **Impact**: Players who fall behind in the first 3-4 rounds have no viable path to victory. They play out the remaining rounds knowing they've lost. This is the single biggest threat to player engagement and replayability.
- **Suggestion**: 
  - Add a "Desperate Measures" action available to any role 15+ VP behind the leader: spend 2 actions for a d20 roll. On 15+, gain 10 VP. On 10-14, gain 5 VP. Below 10, lose 2 VP. High-risk, high-reward.
  - When stability ≤ 3, the trailing player gets +1 action per round (chaos favors the underdog)
  - Late-game events (rounds 8+) should have higher VP rewards
- **Implementation**: In `getAvailableActions()`: check if role VP is 15+ behind leader, add "desperateMeasures" action. Add corresponding function in action processing. In `endRound()` stability penalty section: give trailing player bonus actions.

### 4.4 VP Distribution Fairness

**Finding: VP generation is structurally unfair — some roles have passive income, others don't**

- **Priority:** HIGH
- **Problem**:
  - **President**: Gets passive VP from bill passage (+5 base ± partisan) even when they didn't help pass it. Gets +1 VP/round for Pop > 15. These passives can generate 6+ VP/round without spending actions.
  - **House**: Gets massive VP from passing bills (5 + votes/80 + bonuses). Active income is very high but requires actions.
  - **Senate**: Gets VP from passing bills (4 + votes/20) but the 60-vote threshold makes this unreliable. Also gets +1 VP from justice confirmation. Low passive income.
  - **SC**: Gets -1 VP passive when bills pass (penalty!). Gets +1 VP when bills don't pass. Gets Precedent Dividends (+1/precedent/round) — the only significant passive. JP (Judicial Points) are a secondary resource with no direct VP conversion except through expensive actions.
  
  The President earning VP whenever ANY bill passes — even one they opposed — is particularly unfair. The SC losing VP whenever a bill passes is thematically appropriate but mathematically punishing.
- **Impact**: President and House have structurally higher VP floors. Senate and SC must work harder to achieve the same VP. SC in particular is penalized for the game's core activity (legislation).
- **Suggestion**: 
  - President passive from bill passage should only apply when they sign the bill, not automatically
  - SC should gain +1 VP when a bill passes (recognizing their constitutional role) rather than -1 VP
  - Senate should get +1 passive VP per round for each time a bill was debated (rewarding legislative process)
- **Implementation**: In `completeBillPassage()` (~line 2238): remove the automatic president VP award. Move it to `presidentSignBill()`. Change `state.supremeCourt.vp -= 1` to `state.supremeCourt.vp += 1` in `completeBillPassage()`.

### 4.5 VP Farming Exploits

**Finding: Multiple VP farming paths exist**

- **Priority:** CRITICAL
- **Problem**:
  1. **House Pass Bill farming**: Even with the prior audit's fix for repeated passage, the House can still Initiate Legislation (free/1 action), pass the bill, then Initiate again next round. Each pass nets 5+ VP plus bonuses. With 4 actions/round, the House can pass a bill AND do 3 other VP-generating actions every round.
  2. **SC Precedent farming**: Each Judicial Review creates a precedent worth +1 VP/round forever. With the `courtAuthority` landmark effect (+2 unconstitutional votes), the SC can rule almost anything unconstitutional. 5 precedents × 5 remaining rounds = 25 passive VP + the direct review VP (10-15 each) = 75-100 VP from reviews alone.
  3. **President State Dinner farming**: +3 VP, +2 Pop per round, once per round. Over 10 rounds, that's 30 VP and +20 Pop from a single repeatable action with no resource cost beyond the action point.
  4. **House Subpoena + Hearing cycle**: Subpoena (+2 VP, -2 Pres Pop) + Host Hearing (+3 VP) = 5 VP for 2 actions with no resource cost. Repeatable every round.
- **Impact**: Any player who discovers these cycles will dominate. The game devolves into each role executing their optimal VP farm rather than interacting with the political simulation.
- **Suggestion**: 
  - Add diminishing returns: each action type gives -1 VP for each time it was used in the previous round (tracked per action type)
  - Cap passive VP income at 5 per round per role
  - Make VP-generating actions cost more as the game progresses (inflation mechanic)
- **Implementation**: Add `state[role].actionUsageCounts = {}` tracking. In action execution, check if same action was used last round and apply penalty. In `endRound()`, cap passive VP additions.

---

## 5. Player Agency

### 5.1 Role Distinctiveness

**Finding: Roles feel mechanically distinct but thematically overlapping**

- **Priority:** LOW
- **Problem**: Each role has a unique action set, but many actions produce similar effects (X gives VP, Y gives PC, Z affects bill stats). The President's actions feel like "executive power" — EOs, campaign, foreign affairs. The House feels like "legislative machine" — bills, hearings, subpoenas. The Senate is the weakest identity — it's a weaker House that can also filibuster and confirm justices. The SC has the most unique identity (judicial review, precedents, JP as secondary resource) but the least agency over outcomes.
- **Impact**: Senate players often feel like they're playing a weaker version of House. Both chambers pass bills, both have PC, both interact with the same bills. The asymmetry in power (House passes easily, Senate struggles) doesn't feel like a meaningful difference — it feels like the Senate is just worse.
- **Suggestion**: Give Senate unique mechanics that House can't replicate: treaty ratification, war declarations, filibuster reform that permanently changes rules. Make the Senate the "gatekeeping" role — nothing passes without Senate approval, and they get VP for blocking as much as passing.
- **Implementation**: Add Senate-exclusive actions in `getAvailableActions()`. Add `state.senate.blockedBillsTotal` tracking with VP rewards.

### 5.2 Action Lockouts

**Finding: Players can be completely locked out of meaningful actions**

- **Priority:** CRITICAL
- **Problem**: 
  1. **Justice nomination loop** (documented in prior audit): When vacancies exist, President must nominate and Senate must confirm. With Internal Inquiry creating vacancies + court turnover, this can consume ALL actions for both roles for multiple rounds.
  2. **SC without passed bills**: If no bills have been passed, the SC cannot use Judicial Review — their highest-VP action. In games where legislation stalls (common when House and Senate have misaligned compositions), the SC has no path to competitive VP.
  3. **House at 0 PC**: Many House actions require PC (Kill Bill, Popularize, Change Bill, Earmark, Impeach, Pack Courts). Without PC, the House is limited to Support/Attack Bill, Host Hearing, Whip, State of Union, and Pass Bill. These are still viable, but half the action space is locked.
  4. **Senate at 0 PC**: Senate cannot Filibuster, Stall, or Government Shutdown without PC. These are the Senate's most impactful defensive actions. Without PC, Senate is limited to Debate, Conference, Nominations, and Pass Bill — mostly weak VP generators.
- **Impact**: Lockouts are frustrating and game-losing. A President stuck in the justice loop for 6 rounds can't campaign, can't executive order, can't interact with legislation at all. They're a spectator in their own game.
- **Suggestion**: 
  - Make justice nomination automatic: President declares leaning, Senate votes next turn. No action cost for either. Vacancy is a state event, not an action sink.
  - Give SC a fallback VP action when no bills are passed: "Issue Advisory Opinion" for +3 VP, costs 1 action, no prerequisites.
  - Guarantee each role has at least 2 uncapped, uncostful VP-generating actions at all times
- **Implementation**: Restructure justice nomination as a triggered event in `endRound()` rather than a player action. Remove from `getAvailableActions()` president/senate. Add automatic resolution in `processCourtTurnover()`.

### 5.3 Turn Order Fairness

**Finding: President→House→Senate→SC order creates meaningful first-mover advantages**

- **Priority:** MEDIUM
- **Problem**: The President always acts first, meaning they can sign bills, issue EOs, and set the tone before anyone else acts. The House acts second and can craft/pass bills before the Senate weighs in. The Senate acts third — by the time they act, the bill may have already been killed or passed by House. The SC acts last, which is actually beneficial for Judicial Review (they see the full picture) but means they can never pre-empt actions.
  
  The round-robin rotation (P→H→S→SC→P→H→S→SC...) means in a typical round, President and House get first crack at the bill. If House passes the bill on their first action, Senate's response options are limited.
- **Impact**: Senate's "Filibuster" and "Stall" actions are reactive — they can only be used after the bill has been on the floor for the Senate's turn. If House passes the bill before Senate's turn, the bill is already passed. Senate can't pre-emptively block.
- **Suggestion**: 
  - Randomize turn order each round (draw from a deck of role cards)
  - Or: reverse the order every other round (SC→S→H→P on odd rounds)
  - Or: let the player with the lowest VP choose to go first each round
- **Implementation**: In `endRound()` before resetting `currentTurnIndex`: shuffle `state.turnOrder` array or implement the alternative ordering logic.

### 5.4 Cross-Player Interaction

**Finding: Players can meaningfully affect each other, but interaction is mostly indirect**

- **Priority:** MEDIUM
- **Problem**: Direct player-vs-player interactions include: Veto (President vs Congress), Filibuster (Senate vs bill), Kill Bill (House vs bill), Witchhunt (President vs SC), Impeachment (House vs President), Government Shutdown (Senate vs House/President), Subpoena (House vs President), Power of the Purse (House vs President/Senate).
  
  However, these are all costly and rare. Most player interaction is indirect — everyone interacts with the bill, and the bill mediates all political conflict. Player A modifies the bill, Player B reacts to the modified bill. There's no direct "I attack your VP" action except for Witchhunt and Impeachment.
- **Impact**: The game feels more like 4 people playing separate solitaire games that occasionally intersect around a shared bill. The deal system exists but isn't enforceable (a player can always break a deal and just suffer trust penalties).
- **Suggestion**: Add more direct interaction: "Censure" action any role can take against another for -2 VP but costs 1 VP. "Alliance" mechanic where two roles formally ally for +1 VP/round each but the other two roles also get a bonus. Make deals enforceable — breaking a deal costs VP, not just trust.
- **Implementation**: Add `censure` action in `getAvailableActions()` for all roles. In `breakDeal()` (~line 620): add `state[deal.from].vp -= 2` as a concrete VP penalty.

---

## 6. Event & Stability System

### 6.1 Events as Decisions vs Random Punishment

**Finding: Events are mostly structured decisions but lack strategic depth**

- **Priority:** MEDIUM
- **Problem**: Each event presents 2-3 resolution options, each assigned to specific roles. The decision is straightforward: can you afford the cost? If yes, resolve it for VP + stability. If no, let it fail and eat the penalty. There's rarely a genuine dilemma — the optimal play is almost always "cheapest resolution that applies to your role."
  
  Only 7 events have roll-based resolutions (d20 ≥ 8/10/12/14), adding a risk element. Only 2 events (Domestic Terrorism, Nuclear Plant Emergency) have special actions. None of the events create lasting strategic changes — they're resolved in 1-3 rounds and forgotten.
- **Impact**: Events feel like interruptions rather than pivotal game moments. "Oh, an event. I'll spend 1 action to resolve it. Back to my strategy." They don't change how you play; they just tax your actions.
- **Suggestion**: 
  - Add events with lasting effects: "Wartime Economy" — all VP from bill passage doubled for 3 rounds. "Court Reforms" — SC gets +2 actions for 2 rounds but stability -1.
  - Add events with competitive resolutions: multiple roles CAN resolve it, but only the resolver gets the VP. This creates a race condition.
  - Add events that change the rules temporarily: "Media Frenzy" — all bill popularity changes are doubled. "Congressional Recess" — no bills can be passed this round.
- **Implementation**: In `events.js`, add events with `onResolve` callbacks that modify game state for multiple rounds. Add a `tempModifiers` array to `state` and process in `endRound()`.

### 6.2 Stability Management Engagement

**Finding: Stability management is a background concern, not an engaging mechanic**

- **Priority:** MEDIUM
- **Problem**: Stability starts at 5, decays by 1 every 3 rounds, and drops from failed events. It increases from resolved events and Unity Summits. The stability range (0-10) has three thresholds:
  - 8+: All players +1 VP/round (Prosperity Bonus)
  - ≤2: All players lose 1 action/round (Crisis Penalty)
  - 0: Game over, everyone loses (Collapse)
  
  In 20 simulations, stability never hit 0. It averaged 8.1 at game end. The AI consistently resolves events when stability ≤ 4. Stability collapse is a theoretically interesting mechanic but practically never happens.
- **Impact**: Stability is a background meter that players occasionally tend to. It's never the central strategic concern. The Prosperity Bonus (+1 VP/round at 8+) is too small to motivate maintaining stability; the Crisis Penalty is scary but rare.
- **Suggestion**: 
  - Make the Prosperity Bonus scale: stability 8 = +1 VP/round, 9 = +2 VP/round, 10 = +3 VP/round. This makes maintaining high stability actively rewarding.
  - Make decay faster: -1 every 2 rounds instead of every 3. This forces more event resolution actions.
  - Add a strategic tension: events can only be resolved by spending an action, and resolving events gives VP. But letting events fail costs stability AND VP. The player who resolves the event gets VP, so there's an incentive to let others resolve it (free-rider problem). This is already partially implemented but needs stronger rewards to make the dilemma meaningful.
- **Implementation**: In `endRound()` (~line 2760): scale prosperity bonus by stability level. Change decay frequency check from `state.round % 3` to `state.round % 2`.

### 6.3 Collapse Mechanic Fairness

**Finding: The collapse mechanic (stability=0, everyone loses) is fair in theory but nearly impossible to trigger**

- **Priority:** LOW
- **Problem**: Stability starts at 5. Decay is -1 every 3 rounds. Max decay over 10 rounds = 3 (rounds 3, 6, 9). Events can cause -1 to -4 stability when they fail. To reach 0, you'd need: 5 (start) - 3 (decay) - fails = 0, meaning at least 2 stability points from failed events. But the AI almost always resolves events when stability ≤ 4.
  
  In a 4-human game, strategic event sabotage (deliberately letting events fail to hurt opponents) could theoretically trigger collapse, but the shared-loss outcome means no one benefits from collapse. The only scenario is accidental collapse from a chain of severity-3 events.
- **Impact**: The collapse mechanic exists as a theoretical threat but doesn't meaningfully influence decision-making. Players don't fear it because it effectively never happens.
- **Suggestion**: 
  - Either lower starting stability to 3 (making collapse a real threat) or change the collapse consequence: instead of "everyone loses," the player with the highest stability contribution (most events resolved) wins. This creates a strategic incentive around stability management.
  - Alternative: at stability ≤ 1, trigger a special "Emergency Powers" phase where one role (determined by a roll or vote) gets double actions for 1 round. This makes brinkmanship interesting.
- **Implementation**: Change `state.stability = 5` to `state.stability = 3` in `createInitialState()`. Or modify collapse in `endRound()` to declare the most-contributing player as winner.

### 6.4 Strategic Tension from Events

**Finding: Events create procedural tension but not strategic tension**

- **Priority:** MEDIUM
- **Problem**: When an event triggers, there's a moment of "oh no, what happened?" followed by a quick calculation of costs. The tension is procedural (can I afford to resolve this?) not strategic (should I resolve this? what are the second-order effects?). 
  
  The cooperative resolution mechanic is the closest to strategic tension — both House and Senate must agree to spend an action — but in practice, cooperative resolutions are usually the cheapest option (1 action each) and both players benefit, so they always agree.
  
  The only truly tense event scenario is a severity-3 event with a 2-round deadline when stability is already low. These create genuine "we must cooperate or we all die" moments. But they're rare (maybe once per game).
- **Impact**: Events are a missed opportunity for the game's best moments. With better design, events could be the centerpiece of political negotiation — "I'll resolve this event, but only if you agree to sign my bill."
- **Suggestion**: 
  - Decouple event resolution VP from the resolver: give VP to ALL roles that contributed, but give the "lead resolver" bonus VP. This creates negotiation over who takes the lead.
  - Add "contested events" where different roles have conflicting interests in the resolution (e.g., "Trade War" — House wants protectionism, Senate wants free trade, each resolution benefits one side).
  - Increase event frequency in mid-to-late game to create more interactive moments.
- **Implementation**: Modify `resolveEvent()` in `events.js` to distribute VP more broadly. Add `conflicting: true` flag to some events with role-specific resolution outcomes. Reduce `eventCooldown` in later rounds.

---

## Summary of Findings by Priority

### CRITICAL (Game-Breaking, Fix First)

| # | Finding | Section | Summary |
|---|---------|---------|---------|
| 1 | Dominant strategy: House Initiate+Pass | 2.2 | Free custom bill + easy passage = unbeatable VP farming |
| 2 | Runaway leader: Precedent Dividends compound | 4.2 | SC with 5+ precedents earns 5+ passive VP/round forever |
| 3 | Action lockout: Justice nomination loop | 5.2 | President and Senate lose all actions for multiple rounds |
| 4 | VP farming: multiple uncapped cycles exist | 4.5 | State Dinner, Subpoena+Hearing, Pass Bill all farmable |
| 5 | No comeback mechanics | 4.3 | Trailing players have no high-risk/high-reward options |

### HIGH (Major Issues, Fix Soon)

| # | Finding | Section | Summary |
|---|---------|---------|---------|
| 6 | Dead rounds 1-3 | 1.2 | No cross-branch interaction for first 30% of game |
| 7 | SC has too few VP actions | 2.1 | Runs out of good actions by action 3 of 4 |
| 8 | Trap actions: Earmark, Power of Purse, Pack Courts | 2.4 | Look appealing, always bad — punish new players |
| 9 | Never-used: Constitutional Crisis, Partisan Ruling, Amendment | 2.5 | Dead weight in the action space |
| 10 | New player overload: 15-19 actions per turn | 3.1 | Analysis paralysis with no guidance |
| 11 | Cognitive overload: 30+ state variables | 3.4 | Too much info for human processing |
| 12 | VP floor disparity: SC penalized for legislation | 4.4 | SC loses VP when bills pass — punished for core gameplay |
| 13 | AI doesn't engage negotiation systems | 3.5 | 80% of game design unused in solo play |
| 14 | Extreme VP variance by role | 4.1 | 0-254 VP range means RNG > skill |

### MEDIUM (Improve When Possible)

| # | Finding | Section | Summary |
|---|---------|---------|---------|
| 15 | Tension driven by elections not players | 1.3 | Players are passengers, not drivers |
| 16 | Elections detached from most players | 1.4 | Only President affects election outcomes |
| 17 | No learning curve gradient | 3.2 | Confused → solved with no middle ground |
| 18 | Action descriptions too terse | 3.3 | Can't make informed decisions from labels |
| 19 | Turn order creates first-mover advantage | 5.3 | President/House always act before Senate/SC |
| 20 | Indirect player interaction | 5.4 | Solitaire with occasional bill intersection |
| 21 | Events lack strategic depth | 6.1 | Always take cheapest resolution |
| 22 | Stability is a background concern | 6.2 | Never central to decision-making |
| 23 | Events lack strategic tension | 6.4 | Procedural, not strategic decisions |

### LOW (Polish)

| # | Finding | Section | Summary |
|---|---------|---------|---------|
| 24 | Event resolutions feel samey | 1.5 | All follow same "1 action + resource" template |
| 25 | Senate identity is "weaker House" | 5.1 | Lacks unique mechanics |
| 26 | Collapse mechanic never triggers | 6.3 | Stability 0 is theoretically possible, practically impossible |

---

## Recommended Fix Prioritization

### Phase 1: Core Balance (Weeks 1-2)
1. Make Initiate Legislation cost 1 action (not free)
2. Add diminishing returns to repeated bill passage VP
3. Cap Precedent Dividends at 3 VP/round
4. Restructure justice nominations as automatic events, not action sinks
5. Add VP floor of 0 for all roles
6. Nerf State Dinner to +2 VP, +1 Pop

### Phase 2: Engagement (Weeks 3-4)
7. Add "Desperate Measures" comeback action for trailing players
8. Start the game with an active event
9. Lower starting stability to 4
10. Add 2-3 uncapped VP actions for SC (Write Opinion, enhanced Clerks Research)
11. Fix trap actions: reduce Earmark to 4 PC, reduce Pack Courts VP cost

### Phase 3: Depth (Weeks 5-8)
12. Add tutorial mode with graduated action unlocks
13. Improve action descriptions with projected outcomes
14. Add secret objectives for each role
15. Improve AI negotiation behavior
16. Add contested events with role-specific interests
17. Randomize turn order each round

### Phase 4: Polish (Weeks 9+)
18. Scale Prosperity Bonus by stability level
19. Add "Get Out The Vote" / "Campaign Finance" election actions for non-President roles
20. Add visual indicators for key thresholds
21. Remove or redesign dead actions (Constitutional Crisis, Partisan Ruling)
22. Make deals enforceable with VP penalties for breaking
