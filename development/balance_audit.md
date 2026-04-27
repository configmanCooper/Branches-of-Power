# Branches of Power — Comprehensive Balance & Rules Audit

**Date:** 2025-07-18  
**Version Audited:** 2.2.0  
**Sources:** `config.js`, `engine.js` (3358 lines), `events.js` (2653 lines), prior audit (`rulesandbalanceaudit.md`), 200-game random AI simulation  

---

## Simulation Data Summary

### 200-Game Random AI Results (Standard 10-Round)

| Role | Wins | Win % | Avg VP | Min VP | Max VP |
|------|------|-------|--------|--------|--------|
| **House** | **77** | **39%** | **97** | 4 | 240 |
| Supreme Court | 54 | 27% | 82 | 14 | 211 |
| Senate | 37 | 19% | 82 | 12 | 174 |
| President | 32 | 16% | 79 | 6 | 199 |

**Collapses:** 0/200 (stability never reached 0)

### 50-Game Confirmation Run

| Role | Wins | Win % | Avg VP |
|------|------|-------|--------|
| House | 24 | 48% | 100 |
| President | 9 | 18% | 85 |
| Senate | 9 | 18% | 91 |
| Supreme Court | 8 | 16% | 79 |

### Single Detailed Game Action Breakdown

| Role | Key Actions Used | VP Result |
|------|-----------------|-----------|
| **President** | assignJustice×16, advocate×7, resolveEvent×5, taxCuts×2 | 23 VP |
| **House** | housePassBill×14, initiateLegislation×10, caucusMeeting×10, subpoena×8 | 105 VP |
| **Senate** | nominations×10, filibuster×5, resolveEvent×5, debate×4, senatePassBill×4 | 47 VP |
| **Supreme Court** | investigateBill×25, oralArguments×9, clerksResearch×5, amicusBrief×4 | 64 VP |

---

## 1. Role-by-Role Action Analysis

### 1.1 PRESIDENT (13 Actions)

#### executiveOrder
- **VP Generation:** +1 VP (+2 if popularity ≥ 18, "Mandate bonus"), +1 Popularity
- **Cost:** 1 action
- **Conditions:** None (always available)
- **Strategic Value:** Reliable baseline VP generator. Best when stacking popularity for Bully Pulpit or Mandate threshold. The +1 Popularity compounds across rounds.
- **Balance Assessment:** ✅ Fairly priced. Low VP but unconditional and builds toward Mandate/Bully Pulpit thresholds.
- **Missing Mechanic:** Rules say EO should also lower legality by 1 on a passed bill. Not implemented (see Finding L1).

#### advocate / admonish
- **VP Generation:** 0 VP direct. Indirect: ±PC to chambers affects their capabilities.
- **Cost:** 1 action. **Also costs -5 Bill Popularity** (major hidden cost).
- **Conditions:** None
- **Strategic Value:** Advocate (+2/+4 PC to chambers) helps allies pass bills. Admonish (-2/-4 PC) hurts opponents. But the -5 Bill Popularity is devastating — it makes the current bill nearly unpopular.
- **Balance Assessment:** ⚠️ The -5 Popularity penalty is disproportionate. Advocating for legislation should *not* make the bill less popular. This effectively makes the action self-defeating if you want the bill to pass.
- **Suggestion:** Remove or reduce the -5 Popularity penalty to -2. Or make it asymmetric: Advocate costs -2 Pop, Admonish costs -5 Pop.

#### veto
- **VP Generation:** -1 VP (cost)
- **Cost:** 1 action + 1 VP; requires bill passed this round
- **Conditions:** `billPassedThisRound === true`
- **Strategic Value:** Sends bill back requiring 2/3 supermajority. Powerful blocking tool but costs VP to use.
- **Balance Assessment:** ✅ Well-balanced. The -1 VP cost prevents frivolous use while the supermajority requirement makes override very difficult.

#### sue
- **VP Generation:** Gives SC +1 VP (not the President)
- **Cost:** 1 action; requires opposing-party bill passed this round
- **Conditions:** Bill partisanship must oppose President's party
- **Strategic Value:** Forces judicial review, potentially striking down a bill. But gives VP to SC, not President. Only useful to undo damage from an opposing bill.
- **Balance Assessment:** ⚠️ Weak. President pays an action and gets nothing while SC gains VP. Consider granting President +1 VP if the bill is ruled unconstitutional.

#### taxCuts
- **VP Generation:** 0 direct; creates a bill (Pop 20, Part 5/15, Leg 10) that generates VP if passed
- **Cost:** 3 actions (entire turn minus 1)
- **Conditions:** ≥3 actions remaining
- **Strategic Value:** Creates an extremely popular bill guaranteed to boost popularity if signed. But 3 actions is enormous. Only 1 action left after.
- **Balance Assessment:** ⚠️ Overcosted. 3 actions for a bill that still needs to pass both chambers is too expensive. The original rules said 2 actions. At 3 actions, this is almost never worth using over 3 Executive Orders (3 VP + 3 Popularity vs speculative future VP).
- **Suggestion:** Reduce to 2 actions per original rules, or add +2 VP on creation.

#### campaign
- **VP Generation:** 0 direct VP; +4 Popularity
- **Cost:** 2 actions
- **Conditions:** ≥2 actions remaining
- **Strategic Value:** Large Popularity boost. Essential before elections. Enables Bully Pulpit (Pop>15) and Mandate bonus (Pop≥18). Good investment before round 4/8 elections.
- **Balance Assessment:** ✅ Appropriately priced. Two actions for +4 Pop is good when Pop matters.

#### signBill
- **VP Generation:** +4 VP, +1-2 Popularity (if bill Pop>10/15), +1 PC to House and Senate
- **Cost:** 1 action; requires bill passed by both chambers this round
- **Conditions:** `billPassedThisRound && billPassedByHouse && billPassedBySenate`
- **Strategic Value:** Best single action in the President's toolkit. But extremely conditional — both chambers must pass first.
- **Balance Assessment:** ✅ Well-designed. High reward gated by high coordination requirement.

#### assignJustice
- **VP Generation:** +2 VP (if Senate confirms)
- **Cost:** 1 action; requires vacancy
- **Conditions:** `pendingJustice !== null`, max 2/round
- **Strategic Value:** 2 VP per action if confirmed is decent. But in simulations, justice loops consumed ALL actions for multiple rounds.
- **Balance Assessment:** ⚠️ The action itself is fine, but the vacancy system can create an action trap (see Finding H5).

#### witchhunt
- **VP Generation:** -2 VP (cost), SC loses 6 VP
- **Cost:** 2 actions + 2 VP + 2 Popularity; requires Pop ≥ 15, max 2/game
- **Conditions:** High Popularity, limited uses
- **Strategic Value:** Devastating to SC (-6 VP is ~2 rounds of SC income). But costs are extreme: 2 actions + 2 VP + 2 Pop = roughly 4 VP opportunity cost + 2 VP direct = 6 VP effective cost to remove 6 VP from SC.
- **Balance Assessment:** ⚠️ Net zero VP impact at enormous opportunity cost. The 2-action + 2-Pop cost makes this almost never worthwhile. Only justified if SC is running away with the game.
- **Suggestion:** Reduce to 1 action + 1 VP + 1 Popularity, or increase SC penalty to -8 VP.

#### bullyPulpit
- **VP Generation:** +5 VP
- **Cost:** 1 action + 2 Popularity; requires Pop > 15
- **Conditions:** Popularity must be above 15 (checked as `> 15`, so 16+)
- **Strategic Value:** Best VP/action ratio in the President's toolkit. 5 VP for 1 action is excellent. But requires significant Popularity investment to reach 16+.
- **Balance Assessment:** ✅ Well-designed gated power. Rewards Presidents who build Popularity through other actions.

#### executivePrivilege
- **VP Generation:** 0 direct; +2 extra actions this round
- **Cost:** Free action (doesn't consume an action); once per game
- **Conditions:** Not already used this game
- **Strategic Value:** Effectively +2 actions = ~2-10 VP depending on what you do with them. Best used when you have high-value actions available.
- **Balance Assessment:** ✅ Strong but appropriately limited (once per game, no direct VP).

#### stateDinner
- **VP Generation:** +3 VP to President, +2 Popularity, +1 VP to target
- **Cost:** 1 action; once per round
- **Conditions:** Target must be another role
- **Strategic Value:** Excellent: 3 VP + 2 Pop for 1 action, plus diplomacy (target gets +1 VP). Best repeatable VP action for President.
- **Balance Assessment:** ⚠️ **Arguably too strong.** 3 VP + 2 Pop per action with no resource cost or threshold is the highest unconditional VP/action in the President's kit. Over 10 rounds this is 30 VP + 20 Pop from a single action slot.
- **Suggestion:** Reduce to +2 VP or add a Popularity threshold (e.g., Pop ≥ 10).

---

### 1.2 HOUSE OF REPRESENTATIVES (17 Actions)

#### stateOfUnion
- **VP Generation:** 0-1 VP depending on choice (gainVP: +1 VP; others: PC/Pop effects)
- **Cost:** 1 action; once per round
- **Conditions:** None
- **Strategic Value:** Versatile utility action. `hurtPres` (-4 Pres Pop) is powerful politically. `gainPC` (+2 PC) builds resources. `gainVP` (+1 VP) is low return.
- **Balance Assessment:** ✅ Well-designed menu of options with meaningful trade-offs.

#### whipHouse
- **VP Generation:** 0 VP
- **Cost:** 1 action
- **Conditions:** Valid faction and direction
- **Strategic Value:** Converts 20 reps one faction step. Can shift voting outcomes for future bills. Strategic but no immediate VP.
- **Balance Assessment:** ✅ Appropriate utility action.

#### supportBill / attackBill
- **VP Generation:** 0 VP direct
- **Cost:** 1 action each
- **Conditions:** Bill on floor
- **Strategic Value:** ±5 Popularity AND makes bill more extreme (Part ±2 away from center). Support makes bills popular but harder to pass bipartisanly. Attack does the opposite.
- **Balance Assessment:** ✅ Creates interesting tension between popularity and passability.

#### killBill
- **VP Generation:** +1 VP
- **Cost:** 1 action + 1 PC; once per round
- **Conditions:** Bill on floor, 1 PC
- **Strategic Value:** Blocks bill this round. +1 VP is modest but the blocking effect is valuable defensively.
- **Balance Assessment:** ✅ Appropriately costed defensive tool.

#### hostHearing
- **VP Generation:** 0-3 VP depending on choice (`gainVP`: +3 VP is best)
- **Cost:** 1 action
- **Conditions:** None
- **Strategic Value:** `gainVP` (+3 VP) is a strong unconditional VP action. `pcAndHurtPres` (+2 PC, -2 Pres Pop) combines resource generation with political attack.
- **Balance Assessment:** ⚠️ The `gainVP` option at +3 VP/action with no cost is one of the highest unconditional VP rates. Combined with other strong actions, this contributes to House dominance.

#### riderAmendment
- **VP Generation:** +3 VP if bill passes both chambers (conditional)
- **Cost:** 1 action; once per bill
- **Conditions:** Bill on floor, no rider already attached
- **Strategic Value:** Speculative investment. +3 VP only triggers if the bill completes the full legislative path. In practice, many bills don't pass both chambers.
- **Balance Assessment:** ✅ Good design — rewards legislative engagement with uncertain payoff.

#### earmark
- **VP Generation:** +4 VP
- **Cost:** 1 action + 6 PC
- **Conditions:** 6 PC available
- **Strategic Value:** PC-to-VP conversion. 6 PC → 4 VP is expensive (1.5 PC per VP). Only useful with excess PC.
- **Balance Assessment:** ✅ Appropriately expensive for unconditional VP.

#### caucusMeeting
- **VP Generation:** 0 VP
- **Cost:** 1 action; once per round
- **Conditions:** None
- **Strategic Value:** +3 PC is strong resource generation. Essential for PC-hungry actions (Kill Bill, Popularize, Earmark, Impeach, Pack Courts).
- **Balance Assessment:** ✅ Core resource generation action.

#### subpoena
- **VP Generation:** +2 VP
- **Cost:** 1 action; once per round
- **Conditions:** None
- **Strategic Value:** +2 VP AND -2 Pres Pop. Excellent dual-purpose action: VP generation + political attack. No cost beyond the action.
- **Balance Assessment:** ⚠️ Undercosted. 2 VP + anti-President effect for just 1 action with no resource cost. Should cost 1 PC or be limited to once every 2 rounds.

#### powerOfPurse
- **VP Generation:** -4 VP (cost)
- **Cost:** 1 action + 4 VP; once per game
- **Conditions:** 4 VP available
- **Strategic Value:** Removes 1 action from President AND Senate this round AND next round. Two rounds of reduced actions for two opponents is powerful strategically but costs 4 VP.
- **Balance Assessment:** ✅ High-impact but self-balancing through VP cost.

#### popularizeBill
- **VP Generation:** 0 VP direct
- **Cost:** 1 action + 1 PC; once per round
- **Conditions:** Bill on floor, 1 PC
- **Strategic Value:** +5 Popularity, -4 Legality, +3 extreme Partisanship. Makes bills popular but legally vulnerable and more extreme.
- **Balance Assessment:** ✅ Interesting trade-off between popularity and legality.

#### changeBill
- **VP Generation:** 0 VP
- **Cost:** 2 actions + 2 PC
- **Conditions:** ≥2 actions, ≥2 PC
- **Strategic Value:** Creates a 10/10/10 bill. Expensive when Initiate Legislation is free. Only useful if you need a centrist bill (Part 10).
- **Balance Assessment:** ⚠️ Obsoleted by Initiate Legislation. 2 actions + 2 PC for a 10/10/10 bill vs free for a 9-11/9-11/7-10 bill makes this never worth using.
- **Suggestion:** Either make Change Bill cheaper (1 action + 1 PC) or allow more customization (±5 adjustments per rules).

#### housePassBill
- **VP Generation:** 5 + ceil(votes/80) base VP, plus Populist Surge (+3 if Pop≥15), plus Legislative Blitz (+2 for 3rd+ bill), plus partisan alignment bonus (+2/+2)
- **Cost:** 1 action + optional PC for dice bonus
- **Conditions:** Bill on floor, not killed, not already passed by House (guard exists at line 1085)
- **Strategic Value:** Primary VP engine for House. With favorable composition, a single pass can yield 8-15 VP.
- **Balance Assessment:** 🔴 **The pass guard exists** (`if (getActiveBill().passedByHouse) return { success: false }` at line 1085) — this was fixed since the prior audit. However, the VP formula is still generous:
  - Base: 5 + ceil(votes/80) = typically 5-10 VP
  - Populist Surge: +3 VP (easy to trigger with popularize/support)
  - Legislative Blitz: +2 VP per bill after 3rd (cumulative games snowball)
  - Both-chambers bonus: +2 VP + partisan alignment bonus
  - **Total per bill: 8-15 VP is achievable.**
  - Compare to Senate's `4 + ceil(votes/20)` = 5-9 VP with much harder passage threshold.
- **Suggestion:** Reduce House base from 5 to 3, or equalize the formulas (both use `3 + ceil(votes/50)`).

#### initiateLegislation
- **VP Generation:** 0 VP (creates a bill)
- **Cost:** FREE (no action consumed)
- **Conditions:** Once per round
- **Strategic Value:** Creates a bill at 10±1 Part, 10±1 Pop, with legality penalty per adjustment. Caps at ±1 per stat per the code clamp at line 1236.
- **Balance Assessment:** ⚠️ Being free gives House a massive advantage over Senate's bill-shaping tools (Update Bill costs an action). While the adjustment is now capped at ±1 (fixing prior audit's C3), the free action itself is still a structural advantage.
- **Note:** The code at line 1236 now applies `clamp(partAdj || 0, -1, 1)` correctly enforcing ±1 limits.

#### impeach
- **VP Generation:** Creates impeachment bill. If passed both chambers: House +6 VP, Senate +2 VP, President -8 VP.
- **Cost:** 1 action + 6 PC; max 2/game. Bill requires 2/3 supermajority.
- **Conditions:** 6 PC, limit not reached
- **Strategic Value:** Nuclear option. 6 PC is achievable (2 Caucus Meetings = 6 PC). But the 2/3 supermajority requirement in both chambers makes passage extremely unlikely.
- **Balance Assessment:** ⚠️ Nearly impossible to execute. The 2/3 requirement means you need 288/435 House votes AND 67/100 Senate votes. With typical compositions, this requires near-total party dominance in both chambers. The 6 PC cost on top makes this a trap action.
- **Suggestion:** Consider requiring only simple majority in House (218) and 2/3 in Senate (67), matching real-world impeachment mechanics.

#### packCourts
- **VP Generation:** SC -10 VP; House loses 4 VP + 6 PC
- **Cost:** 1 action + 6 PC + 4 VP; once per game. Creates bill (Pop 5, Leg 5) requiring passage.
- **Conditions:** 6 PC, 4 VP, not used
- **Strategic Value:** Devastating to SC if passed (-10 VP + 4 allied justices). But the bill starts at Pop 5 / Leg 5 making it very hard to pass.
- **Balance Assessment:** ✅ Appropriately expensive for a game-changing effect. The low starting stats make passage a real challenge.

---

### 1.3 SENATE (11 Actions)

#### confirmJustice
- **VP Generation:** +1 VP to Senate; +2 VP to President (if approved)
- **Cost:** 1 action; requires pending nomination
- **Conditions:** Justice nominated
- **Strategic Value:** +1 VP is modest. Can reject (costs PC), denying President +2 VP. But the action is forced — ignoring nominations means vacancies persist.
- **Balance Assessment:** ⚠️ The President gets 2× the VP that Senate does for the same action chain. Senate is doing the work but President gets more reward.

#### nominations
- **VP Generation:** Pass: 0 VP (+4 PC, +1 Pres Pop). Block: +1 VP (+1 PC, -2 Pres Pop)
- **Cost:** 1 action; once per round
- **Conditions:** None
- **Strategic Value:** Excellent action. Pass gives massive PC gain (+4 PC is the best single PC action). Block gives VP + PC + political damage. Always useful.
- **Balance Assessment:** ✅ Well-designed with meaningful choice between cooperation and opposition.

#### debate
- **VP Generation:** 0 VP; +2 PC, shifts 5 senators
- **Cost:** 1 action
- **Conditions:** None
- **Strategic Value:** Core resource generation + composition shaping. +2 PC per action is essential. The senator shifting lets Senate player shape future votes.
- **Balance Assessment:** ✅ Fixed since prior audit (now correctly gives +2 PC and allows directional shifts per line 1361).

#### updateBill
- **VP Generation:** 0 VP
- **Cost:** 1 action + optional PC for extra changes
- **Conditions:** Bill on floor
- **Strategic Value:** Fine-tune bills for passage. Up to 3 stat points free, more costs PC. Critical for Senate to make bills passable.
- **Balance Assessment:** ✅ Solid utility action. The PC cost for extra changes is appropriate.

#### filibuster
- **VP Generation:** +1 VP; House +2 PC, Pres -1 Pop/-1 VP, SC +1 VP
- **Cost:** 4+ PC (escalating: +1 PC per use after first)
- **Conditions:** Sufficient PC, bill on floor
- **Strategic Value:** Kills current bill and generates a new one. Good when current bill is unfavorable. But costly (4+ PC) and benefits other roles (House +2 PC, SC +1 VP).
- **Balance Assessment:** ⚠️ Net VP is poor for Senate (+1 VP for 4+ PC) while other roles benefit more. The SC +1 VP contradicts the rulebook ("Supreme Court does not get VP for this").
- **Suggestion:** Remove SC +1 VP per rulebook. Consider increasing Senate VP to +2.

#### stallBill
- **VP Generation:** 0 VP
- **Cost:** 1 action + 2 PC; once per round
- **Conditions:** 2 PC
- **Strategic Value:** Keeps bill on floor next round. Useful if the current bill is favorable and you want more time to modify/pass it.
- **Balance Assessment:** ✅ Reasonable defensive/strategic tool.

#### conference
- **VP Generation:** 0 VP; +1 PC to both House and Senate
- **Cost:** 1 action; once per round
- **Conditions:** None
- **Strategic Value:** Modest PC generation (+1 each). Worse than Debate (+2 PC) or Nominations (+4 PC pass / +1 PC block). Only useful for diplomacy or when other options are exhausted.
- **Balance Assessment:** ⚠️ Underpowered compared to other PC-generation actions. The +1 PC to House also helps a competitor.

#### senatePassBill
- **VP Generation:** 4 + ceil(votes/20) VP base. Plus partisan alignment bonuses.
- **Cost:** 1 action + optional PC
- **Conditions:** Bill on floor, not killed, not already passed by Senate (guard at line 1461)
- **Strategic Value:** Primary VP engine. The 60-vote threshold (or 51 with 1 PC) makes passage much harder than House's 218/435.
- **Balance Assessment:** 🔴 **Structurally disadvantaged vs House.** 
  - Senate needs 60% of members (60/100) vs House needing 50.1% (218/435)
  - Senate only gets a d6 bonus (vs House d20) when close to threshold
  - Senate voting ranges: no single partisan value captures all 4 factions simultaneously
  - The 51-with-PC option helps but still requires favorable composition
  - VP formula (4 + ceil(votes/20)) can actually yield MORE VP per pass than House, but passes happen far less often
- **Suggestion:** Lower default threshold to 55, or give Senate d20 bonus like House.

#### reviveBill / repealBill
- **VP Generation:** Revive: 0 VP (returns bill to floor). Repeal: +2 VP each to House and Senate if passed.
- **Cost:** 1 action each
- **Conditions:** Passed bills exist
- **Strategic Value:** Revive lets Senate re-process favorable bills. Repeal creates a "mirror" bill that undoes an opposing bill.
- **Balance Assessment:** ✅ Good strategic tools. Repeal is particularly interesting — the partisanship inversion (`21 - original`) creates a natural partisan flip.

#### governmentShutdown
- **VP Generation:** -2 VP (backlash)
- **Cost:** 1 action + 6 PC; max 2/game
- **Conditions:** 6 PC
- **Strategic Value:** Sets House PC to 0, -4 Pres Pop. Devastating to House and President. But costs 6 PC + 2 VP, which is enormous.
- **Balance Assessment:** ⚠️ The -2 VP backlash makes this marginally useful. Senate pays 6 PC + 2 VP to zero out House's (typically 0-4) PC. Only worthwhile if House has stockpiled 4+ PC.
- **Suggestion:** Remove the -2 VP backlash, or reduce PC cost to 4.

---

### 1.4 SUPREME COURT (20 Actions)

#### judicialReview
- **VP Generation:** Unconstitutional: 10 VP (15 if swing vote, +3 if unanimous) + VP rescission from all roles. Constitutional: 5 VP (8 if unanimous). +1 JP either way.
- **Cost:** 1 action + optional VP for bonus votes (2 VP = +1 vote, 5 VP = +2 votes)
- **Conditions:** Passed bills exist, bill not already declared constitutional
- **Strategic Value:** SC's most powerful action. An unconstitutional ruling yields 10-18 VP AND rescinds VP from all other roles. Constitutional ruling still gives 5-8 VP.
- **Balance Assessment:** ✅ High-risk, high-reward. The VP rescission is the only mechanic that directly reduces other players' VP, making SC the "auditor" role. The optional VP spend for bonus votes creates interesting risk/reward decisions.
- **Note:** The `remand` option (return bill to floor, +3 VP, +1 JP) is a moderate fallback that avoids committing to a ruling.

#### inquiryPresident / inquiryChamber
- **VP Generation:** +1 VP each
- **Cost:** 1 action
- **Conditions:** None
- **Strategic Value:** Low VP but with political effects (±Pop or ±PC to targets). Useful filler actions.
- **Balance Assessment:** ✅ Appropriate for low-commitment political maneuvering.

#### investigateEO
- **VP Generation:** 0 VP to SC; President -2 VP, -2 Pop; House/Senate +1 PC each
- **Cost:** 1 action; once per round
- **Conditions:** President used EO ≥2 times this round, no witchhunt protection
- **Strategic Value:** Punishes EO-heavy Presidents. But conditional on President using 2+ EOs in a round (which is uncommon in practice since Presidents have better options).
- **Balance Assessment:** ⚠️ Too conditional. Requires a specific President strategy that rarely occurs. When triggered, it's devastating to the President but gives nothing to SC.
- **Suggestion:** Either reduce the EO threshold to 1, or give SC +1 VP for using it.

#### investigateBill
- **VP Generation:** 0 VP; bill legality -2
- **Cost:** 1 action
- **Conditions:** Bill on floor, not Pack the Courts
- **Strategic Value:** Lowers legality to set up unconstitutional rulings later. Key strategic play for SC.
- **Balance Assessment:** ⚠️ No VP for a strategic investment is fine in theory, but SC was observed using this action 25 times in a single game — far too many uses for zero VP. Consider adding +1 VP or making it once per round.

#### billReview
- **VP Generation:** +2 VP, +1 JP
- **Cost:** 1 action; once per round
- **Conditions:** Bill on floor
- **Strategic Value:** +2 legality on bill, plus ±2 partisanship/popularity adjustment, +2 VP, +1 JP. Strong multi-purpose action.
- **Balance Assessment:** ✅ Now correctly implements partisanship/popularity adjustment (fixed since prior audit per line 1715-1736). Good balanced action combining VP, JP, and bill-shaping.

#### amicusBrief
- **VP Generation:** +2 VP; bill legality -4
- **Cost:** 1 action + 2 JP; once per round
- **Conditions:** Bill on floor, 2 JP
- **Strategic Value:** Strong VP action that also lowers legality significantly. Combines VP generation with strategic legality manipulation.
- **Balance Assessment:** ✅ Well-priced: 2 JP for 2 VP + strategic effect.

#### disapproveJustice / suggestJustice
- **VP Generation:** 0 VP each
- **Cost:** 1 action each; various conditions
- **Conditions:** Justice nomination pending (disapprove) or vacancy + no nomination (suggest)
- **Strategic Value:** Political influence over court composition. Disapprove forces President to re-nominate or pay -2 VP, -2 Pop. Suggest sets a target leaning.
- **Balance Assessment:** ✅ Good thematic actions. The penalty for ignoring SC's suggestion is meaningful.

#### generalCourt
- **VP Generation:** +2 VP, +1 JP
- **Cost:** 1 action; once per round
- **Conditions:** None
- **Strategic Value:** Unconditional VP + JP generation. SC's most reliable income.
- **Balance Assessment:** ✅ Now correctly awards 2 VP (fixed since prior audit). Essential baseline action for SC.

#### advisoryRole
- **VP Generation:** +2 VP, +1 JP
- **Cost:** 1 action; once per round
- **Conditions:** 2 of 3 branches (President, House, Court) must lean same direction
- **Strategic Value:** Same VP as General Court but with alignment requirement. The "2-of-3" check (fixed from prior audit's "all 3" requirement) makes this more accessible.
- **Balance Assessment:** ✅ The 2-of-3 alignment requirement is now reasonable (fixed since prior audit per line 1796). Provides VP when political winds are favorable.

#### internalInquiry
- **VP Generation:** 0 VP; costs 2 JP
- **Cost:** 1 action + 2 JP; max 6/game, once per round
- **Conditions:** 2 JP
- **Strategic Value:** 50% chance (d20 ≥ 10) of forcing retirement → vacancy → SC influences replacement. Risky but powerful for long-term court composition.
- **Balance Assessment:** ⚠️ At 6 uses per game (highest per-game limit), this can create persistent vacancy loops that trap President and Senate into nomination/confirmation cycles (see Finding H5). Consider reducing to 3/game.

#### partisanRuling
- **VP Generation:** 0 VP; costs 4 JP + 2 actions
- **Cost:** 2 actions + 4 JP; max 2/game
- **Conditions:** 4 JP, 2 actions remaining
- **Strategic Value:** Shifts current bill partisanship by ±1. **Still missing persistent modifier** per Finding L5 from prior audit.
- **Balance Assessment:** 🔴 **Catastrophically overpriced.** 4 JP + 2 actions for shifting ONE bill's partisanship by 1 point is absurd. This should permanently shift all future bills' partisanship (using a modifier like `legalityModifier`).
- **Suggestion:** Implement `partisanshipModifier` in `generateBill()`. Then the 4 JP + 2 action cost becomes justified for a permanent global effect.

#### constitutionalCrisis
- **VP Generation:** 0 VP; costs 8 JP + 2 actions
- **Cost:** 2 actions + 8 JP; max 2/game
- **Conditions:** 8 JP, 2 actions remaining
- **Strategic Value:** Permanently lowers all legality by 2 (via `legalityModifier -= 2`). Powerful setup for future unconstitutional rulings.
- **Balance Assessment:** ⚠️ Costs 8 JP which requires ~4 rounds of JP generation to accumulate. Combined with 2 actions, this is a massive investment. But the permanent legality reduction compounds over remaining rounds.
- **Note:** Prior audit flagged rules say 10 VP cost, code uses 8 JP. The JP currency (not VP) is correct in the code — the rules may have been referring to an older VP-based cost.

#### recusal
- **VP Generation:** 0 VP; costs 1 JP
- **Cost:** 1 action + 1 JP; once per round
- **Conditions:** Justice of specified leaning exists, 1 JP
- **Strategic Value:** Removes a justice from judicial review calculations this round. Can tip review outcomes by removing a justice who would vote against your desired ruling.
- **Balance Assessment:** ✅ Clever tactical tool with appropriate cost.

#### landmarkRuling
- **VP Generation:** 0 VP direct; permanent game-changing effect
- **Cost:** 2 actions + 6 JP; once per game
- **Conditions:** 6 JP, 2 actions remaining
- **Effects:** 
  - `extraAction`: +1 permanent action/round (huge over remaining rounds)
  - `legalityStandard`: +3 legality on all future bills (counter-productive for SC)
  - `courtAuthority`: +2 unconstitutional votes in all reviews (strongest for SC)
  - `precedentPower`: double precedent effects (situational)
- **Balance Assessment:** ⚠️ Effect variance is extreme. `courtAuthority` (+2 unconstitutional votes forever) is game-breakingly strong for judicial review. `legalityStandard` (+3 legality) actually *hurts* SC by making unconstitutional rulings harder. These need rebalancing.
- **Suggestion:** Nerf `courtAuthority` to +1 vote, and change `legalityStandard` to -3 legality (making it pro-SC).

#### certiorari
- **VP Generation:** +1 VP; target bill legality -3
- **Cost:** 1 action + 1 JP; once per bill
- **Conditions:** Passed bills exist, 1 JP
- **Strategic Value:** Weakens passed bills for future judicial review. +1 VP is modest.
- **Balance Assessment:** ✅ Appropriately costed strategic investment.

#### oralArguments
- **VP Generation:** +2 VP; bill partisanship moved 2 toward center
- **Cost:** 1 action; once per round
- **Conditions:** Bill on floor
- **Strategic Value:** +2 VP plus bill centering. Centrist bills are harder for both chambers to pass (no faction likes Part 10), so this can block legislation while generating VP.
- **Balance Assessment:** ✅ Good dual-purpose action.

#### injunction
- **VP Generation:** +1 VP; blocks bill votes this round
- **Cost:** 1 action + 3 JP; once per game
- **Conditions:** Bill on floor, 3 JP, not used
- **Strategic Value:** Kills bill for the round like House's Kill Bill. +1 VP is modest for the 3 JP cost.
- **Balance Assessment:** ⚠️ Overpriced. 3 JP + once-per-game for +1 VP and a Kill Bill effect. Compare to House's Kill Bill: 1 PC + once-per-round for +1 VP + the same effect.
- **Suggestion:** Increase VP to +2 or reduce JP cost to 2.

#### clerksResearch
- **VP Generation:** 0 VP; +2 JP
- **Cost:** 1 action; once per round
- **Conditions:** None
- **Strategic Value:** Essential JP generation. 2 JP per action fuels the JP economy for other actions.
- **Balance Assessment:** ✅ Core resource generation, properly balanced.

---

## 2. VP Economy Analysis

### 2.1 VP Generation Per Round (Theoretical Maximum)

| Role | Best 4 Actions | Max VP/Round | Notes |
|------|---------------|--------------|-------|
| **President** | Bully Pulpit + State Dinner + EO + EO | 5+3+2+2 = 12 | Requires Pop ≥ 18 for Mandate EOs |
| **President (realistic)** | State Dinner + EO + EO + Sign Bill | 3+1+1+4 = 9 | Requires bill passage |
| **House** | Host Hearing(VP) + Subpoena + Pass Bill + Caucus | 3+2+8+0 = 13 | Pass assumes favorable composition |
| **House (with bonuses)** | As above + Populist Surge + Blitz | 13+3+2 = 18 | With popular bill and 3rd+ bill |
| **Senate** | Nominations(pass) + Debate + Pass Bill + Confirm | 0+0+9+1 = 10 | Pass assumes favorable composition |
| **Supreme Court** | General Court + Advisory + Bill Review + Oral Args | 2+2+2+2 = 8 | All once-per-round actions |
| **SC (with JR)** | Judicial Review (uncon) + General + Advisory + Oral | 10+2+2+2 = 16 | JR requires passed bill |

### 2.2 VP Per Round (Practical, from Simulation)

| Role | Avg VP/Round (200 games) | Range |
|------|-------------------------|-------|
| **House** | ~9.7 | 4-24 per round |
| Supreme Court | ~8.2 | -2 to 14 per round |
| Senate | ~8.2 | -1 to 11 per round |
| President | ~7.9 | -1 to 12 per round |

### 2.3 VP Snowball Effects

- **Precedent Dividends (SC):** Each judicial review creates a precedent that awards +1 VP/round passively forever. Over 10 rounds with 3 precedents, that's ~21 bonus VP. Additionally, Court Legacy awards 2 VP per precedent at game end. **This is the primary SC snowball mechanic.**
- **Legislative Blitz (House):** After 3rd bill passed, each additional pass gives +2 bonus VP. This rewards sustained bill passage.
- **Stability Prosperity (All):** At stability ≥ 8, all players get +1 VP/round. This rewards cooperative play but doesn't differentially advantage any role.
- **Popularity → Bully Pulpit (President):** High popularity enables 5 VP/action, which is a mini-snowball if President can maintain Pop ≥ 16.

### 2.4 VP Sinks

| VP Sink | Cost | Target | Worth It? |
|---------|------|--------|-----------|
| Veto | -1 VP | President | Yes — prevents opposing bill |
| Witchhunt | -2 VP | President | Rarely — too expensive |
| Pack Courts | -4 VP | House | Rarely — too conditional |
| Power of Purse | -4 VP | House | Situationally — cripples opponents |
| Gov Shutdown | -2 VP | Senate | Rarely — too expensive |
| JR VP spend | -2/-5 VP | SC | Sometimes — can yield 10+ VP |
| Unity Summit | -2/-1 VP | All | Only if stability critical |
| Amendment | -1 VP | All involved | Very rarely |

### 2.5 Co-Action VP Cost Analysis

**Constitutional Amendment:** Each participant pays 2 actions + 1 VP (+ 1 PC or 1 Pop). Total cost: 6 actions + 3 VP + resources across 3 players. Reward: SC loses 5 VP, bill restored. Net: 3 roles collectively pay ~6 VP opportunity cost + 3 VP direct to remove 5 VP from SC. **Not worth it** — the participants lose more than SC does.

**Unity Summit:** Proposer pays 2 actions + 2 VP. Each agreerer pays 1 action + 1 VP. Total: 5 actions + 5 VP for +2/+3 stability + 1-2 VP per participant. Net: ~3 VP total cost for stability gain. **Only worth it if stability is critically low (≤ 3).**

---

## 3. Political Capital (PC) Economy

### 3.1 PC Generation Comparison

| Action | Role | PC Gained | Cost |
|--------|------|-----------|------|
| Caucus Meeting | House | +3 | 1 action, 1/round |
| Nominations (pass) | Senate | +4 | 1 action, 1/round |
| Nominations (block) | Senate | +1 | 1 action, 1/round |
| Debate | Senate | +2 | 1 action |
| Conference | Senate | +1 each | 1 action, 1/round |
| Host Hearing (pcAndHurtPres) | House | +2 | 1 action |
| Host Hearing (pcAndBoostPres) | House | +1 | 1 action |
| State of Union (gainPC) | House | +2 | 1 action, 1/round |
| Advocate (both) | President→H+S | +2 each | 1 Pres action |
| Bill passage partisan bonus | House/Senate | Variable | Bill passes |

**House max PC/round:** Caucus (+3) + SotU (+2) + Hearing (+2) = **+7 PC/round** (3 actions)  
**Senate max PC/round:** Nominations (+4) + Debate (+2) + Conference (+1) + Debate (+2) = **+9 PC/round** (4 actions, all actions used)

### 3.2 PC Spending Balance

| Action | Role | PC Cost | Benefit |
|--------|------|---------|---------|
| Kill Bill | House | 1 | +1 VP, block bill |
| Popularize | House | 1 | +5 Pop, -4 Leg, +3 extreme Part |
| Change Bill | House | 2 | New 10/10/10 bill |
| Earmark | House | 6 | +4 VP |
| Impeach | House | 6 | Impeachment bill |
| Pack Courts | House | 6 | Pack Courts bill |
| Filibuster | Senate | 4+ | Kill bill, new one, +1 VP |
| Stall Bill | Senate | 2 | Bill stays next round |
| Gov Shutdown | Senate | 6 | House PC=0, -4 Pres Pop, -2 VP |

### 3.3 PC Carryover (Max 4) Assessment

The max 4 PC carryover is appropriate. Without it, Senate could stockpile indefinitely for Government Shutdown (6 PC). With the cap, Senate must generate at least 2 PC in the shutdown round plus have 4 carried over, requiring commitment across two rounds.

**House** can stockpile 3 (Caucus) + carryover 4 = 7 available, enabling Earmark/Impeach/Pack Courts in a single round.

**Assessment:** ✅ The cap creates meaningful timing decisions. Players must plan PC generation around action timing.

### 3.4 Are PC-Gated Actions Appropriately Priced?

| Action | PC Cost | Appropriate? | Notes |
|--------|---------|-------------|-------|
| Kill Bill | 1 | ✅ | Cheap for a defensive tool |
| Popularize | 1 | ✅ | Fair for bill modification |
| Change Bill | 2 | ⚠️ | Overpriced given Initiate Legislation is free |
| Earmark | 6 | ✅ | 1.5 PC/VP conversion rate is expensive |
| Filibuster | 4+ | ✅ | Expensive but powerful |
| Stall | 2 | ✅ | Moderate for temporal control |
| Impeach | 6 | ⚠️ | 6 PC + supermajority = near-impossible |
| Pack Courts | 6+4VP | ✅ | Deliberately prohibitive |
| Gov Shutdown | 6 | ⚠️ | Overpriced for the effect |

---

## 4. Voting Mechanics

### 4.1 Senate Voting Thresholds

- **60/100 (standard):** Very difficult. Requires a bill's partisanship to fall in 2+ factions' ranges simultaneously. Only Part 8-9 or 11-12 captures 3 factions (democrat 11-18, modDem 8-15, modRep 5-12, republican 3-9).
- **51/100 (with 1 PC):** More achievable. Reduces threshold by 9 votes, roughly equivalent to one faction.
- **67/100 (supermajority):** Nearly impossible. Requires all 4 factions to agree, which only happens at Part 8-9 (capturing modDem 8-15 + modRep 5-12 + republican 3-9 = 3 factions, maybe 70 senators).

**Assessment:** The 60-vote default is structurally challenging. The faction ranges create a "sweet spot" around Part 8-12 where 2-3 factions overlap, but that still often yields only 50-60 votes. PC helps but requires investment.

**The d6 bonus** (when within 6 votes) is weak compared to House's d20 bonus (when within 20 votes). This asymmetry means Senate needs to be much closer to threshold before dice can help.

### 4.2 House Voting Thresholds

- **218/435 (standard):** 50.1%. With 4 factions, any bill that captures 2 factions gets enough votes. Part 3-6 captures extremeRep (1-6) + republican (3-9) = ~200-250 votes typically. Part 14-18 captures extremeDem (14-20) + democrat (11-18) = similar.
- **288/435 (supermajority):** 66.2%. Requires 3 factions, which means a bill near Part 9-11 (capturing democrat 11-18 + modDem equiv not present in House... wait, House factions don't have moderates). Actually requires broad appeal across 3 of 4 extreme factions — difficult.

**Assessment:** House passage is much easier than Senate because the 50.1% threshold combined with faction composition almost always guarantees passage if the bill is tuned to one party's factions.

### 4.3 Faction Voting Ranges: Do They Create Meaningful Politics?

**Senate factions create a spectrum:**
```
Republican:  3-9   ████
Mod Rep:     5-12    ██████
Mod Dem:     8-15       ██████
Democrat:   11-18         ████████
```
The overlap zones (5-9, 8-12, 11-15) create genuine coalition-building opportunities. Bills around Part 8-12 can capture moderates from both sides.

**House factions are polarized:**
```
Extreme Rep: 1-6   ████
Republican:  3-9    ████
Democrat:   11-18         ████████
Extreme Dem: 14-20           ████████
```
There's a "dead zone" at Part 7-13 where only partial faction overlap exists (Rep 3-9 captures Part 7-9, Dem 11-18 captures Part 11-13). This makes centrist House bills harder to pass — you must commit to one party's base.

**Assessment:** ✅ The faction ranges create genuine strategic depth. Senate ranges overlap more (encouraging centrism), while House ranges are polarized (encouraging partisan bills). This reflects real-world dynamics well.

### 4.4 Composition System

Each chamber has 4 factions with fixed voting ranges but variable seat counts. Compositions change via elections and player actions (Whip, Debate).

**Issue:** Random initial compositions can be extreme. House starts with `80+d40` for Dem/Rep and `20+d30` for extremes, meaning the remainder (`extremeRep = 435 - dem - rep - extremeDem`) can be very large or very small. This creates games where one party dominates from turn 1.

**Suggestion:** Ensure initial compositions are more balanced (e.g., guarantee no single faction exceeds 40% of seats).

### 4.5 Elections Impact

Elections every 2 rounds shift compositions based on presidential popularity. The magnitude uses multiple d20 rolls summed (4d20-12d20), creating high variance.

**Key finding from prior audit confirmed:** Elections are one-directional per popularity band. Neutral popularity (10-12) still causes slight shifts. Over 5 election cycles, compositions become increasingly extreme.

**No mean-reversion mechanism exists.** Once a faction loses seats, there's no natural recovery. This confirmed again in our 200-game simulation.

---

## 5. Interaction Balance

### 5.1 Can Any Role Dominate Another Unfairly?

**House → President:** Yes. Subpoena (-2 Pop, +2 VP, once/round) with no counterplay is repeatable harassment. State of Union (hurtPres: -4 Pop) adds more. The President has no defensive action against Popularity attacks.

**House → Senate:** Yes. Power of Purse removes Senate actions. Government Shutdown defense (Senate must spend 6 PC to protect House PC from being zero'd... wait, that's Senate → House). Actually House has limited direct anti-Senate tools.

**Senate → House:** Government Shutdown (6 PC to zero House PC) is devastating when House is stockpiling for Impeach/Pack Courts.

**Senate → President:** Block Nominations (-2 Pop, +1 VP, +1 PC) is effective harassment. Filibuster (-1 Pres Pop, -1 Pres VP) is also anti-President.

**President → SC:** Witchhunt (-6 SC VP) is devastating but costs too much. Sue sends bills to SC review (giving SC +1 VP — counterproductive for President).

**SC → President:** Investigate EO (-2 VP, -2 Pop) is conditional. Inquiry of President (-2 Pop or +1 Pop, +1 VP) is mild.

**SC → House/Senate:** Limited direct interaction. SC shapes bill stats but can't directly attack chambers.

**Assessment:** ⚠️ House has the strongest ability to attack the President with no meaningful cost or counterplay. The President lacks defensive actions against Popularity reduction. Consider adding a "Press Conference" action that lets President recover 2 Popularity as a reaction or free action.

### 5.2 Defensive Options

| Attack | Defender | Available Defense |
|--------|----------|-------------------|
| Subpoena (-2 Pop) | President | None — no reaction |
| SotU hurtPres (-4 Pop) | President | None |
| Gov Shutdown (PC=0) | House | None — preemptive spending only |
| Witchhunt (-6 VP) | SC | Only prevention: keep Pres Pop < 15 |
| Impeachment | President | Veto doesn't apply; hope for 1/3 blocking vote |
| Filibuster | House | Kill Bill prevents, but filibuster kills different bill |
| Judicial Review | All | Ensure high legality bills; Constitutional Amendment |

**Assessment:** 🔴 **Defensive options are insufficient.** Most attacks have no reactive defense — only proactive prevention. This creates a "first-mover advantage" where the attacking player always wins the exchange.

**Suggestion:** Add reaction mechanics: e.g., President can spend 1 action to "Address the Nation" (+3 Pop) as an interrupt when Popularity drops below a threshold.

### 5.3 Trust/Deal System

The trust system (0-10 scale, starts at 5) with deal proposal/acceptance/fulfillment/breaking is well-implemented mechanically. Trust naturally regresses toward 5 each round (-0.25 per step).

**Issue:** In the simulation, deals were rarely used because the random AI doesn't strategize about deals. In human play, deals would be critical. The system is well-designed but untestable with random AI.

**Assessment:** ✅ System is sound mechanically. The trust regression prevents permanent feuds or alliances. Deal expiration (1 round after acceptance) prevents long-term lock-in.

---

## 6. Event System Balance

### 6.1 Severity Level Scaling

| Severity | Stability Loss | VP Loss | Drastic Effects | Count |
|----------|---------------|---------|-----------------|-------|
| 1 (Minor) | -1 | 0 to -3 total | None | 8 events |
| 2 (Moderate) | -2 | -2 to -6 total | Rare | 22 events |
| 3 (Severe) | -3 to -4 | -3 to -10 total | Common (house/senate shifts, justice effects, president loses election) | 20 events |

**Assessment:** ✅ Severity scaling is appropriate. Severity 1 events are nuisances; Severity 3 events can reshape the game.

### 6.2 Drastic Failure Effects

Drastic effects only trigger on severity 3 event failures:
- **houseShift (chaos):** Moves 30-68 seats from majority to minority faction. Can flip House control.
- **senateShift (chaos):** Moves 12-23 senators similarly.
- **justiceEffect (switchPartisanship):** 1-2 justices shift leaning. Can flip court majority.
- **justiceEffect (resign):** Random justice leaves. Creates vacancy.
- **presidentLosesElection:** Automatic loss at next election cycle.

**Assessment:** ⚠️ The chaos shift mechanic (majority→minority) creates unpredictable swings. A House with 300 Rep could lose 60 to extremeDem in one failed event, which feels narratively odd. Consider shifting toward moderate factions instead of the smallest faction.

### 6.3 Event Trigger Rate (40%)

- Round 2: First event guaranteed
- 40% chance per round when no active event
- 15% chance to queue a second event
- Cooldown system prevents rapid-fire events

In a 10-round game, expect ~3-4 events. Each event has 2-3 round deadline, consuming ~8-12 rounds of event presence total (with overlap). This means events are present for most of the game.

**Assessment:** ✅ The 40% trigger rate creates 3-4 events per game, which is enough to be meaningful without overwhelming normal gameplay.

### 6.4 Do Events Favor/Punish Specific Roles?

**Event resolution options by role:**

| Role | Solo Resolution Options | Cooperative Options | Special Actions |
|------|------------------------|--------------------|-----------------| 
| President | ~25 events (most common resolver) | ~15 events | 3 events |
| House | ~12 events | ~15 events | 0 |
| Senate | ~12 events | ~15 events | 0 |
| Supreme Court | ~10 events | ~5 events | 0 |

**Assessment:** 🔴 **Events heavily favor the President** as the resolver. Most events have a "Presidential Address/Action" option that costs 1 action + popularity. The President gets the most opportunities to earn event VP (2-6 VP per resolution). SC has the fewest options and many events have no SC resolution at all.

**Suggestion:** Add more SC resolution options. Many "constitutional" and "social" events should have court-based resolutions. Also ensure event VP rewards are calibrated to match the role's typical VP rate.

**Event VP rewards comparison:**
- President: Typically 2-5 VP per solo resolution (average ~3)
- House/Senate cooperative: Typically 2-3 VP each
- SC: Typically 3-4 VP per resolution but requires JP cost

The JP cost for SC event resolutions means SC effectively pays more than other roles. President resolutions cost popularity (recoverable) while SC costs are from a limited JP pool.

---

## 7. Edge Cases & Exploits

### 7.1 Degenerate Strategies

**🔴 CRITICAL — House Hearing+Subpoena VP Farm**
The House can use Host Hearing (gainVP: +3 VP) + Subpoena (+2 VP) every round for a guaranteed +5 VP/round from 2 actions with zero resource cost. Combined with 1 bill pass (8+ VP) and 1 caucus meeting (for PC), this yields ~13+ VP/round consistently.

**Mitigation:** Add a PC cost to Host Hearing's VP option (1 PC for +3 VP) and/or make Subpoena cost 1 PC.

**⚠️ HIGH — SC Investigate Bill Spam**
In the detailed simulation, SC used `investigateBill` 25 times — far more than any other action. This has no per-round limit and no VP cost, so SC can drain bill legality to 1 across multiple bills, then judicial review everything as unconstitutional.

**Mitigation:** Add once-per-round limit to investigateBill, or add a JP cost (1 JP per use).

**⚠️ HIGH — Justice Vacancy Loop**
Internal Inquiry (6/game) + Court Turnover (30%/round) can create perpetual vacancies that force President and Senate into nomination/confirmation loops. In the detailed game, President spent 16 actions on assignJustice and Senate spent 3 on confirmJustice — these players were partially locked out of other actions.

**Mitigation:** Reduce Internal Inquiry limit to 3/game. Or make justice confirmation a free action for Senate (it's administrative, not legislative).

### 7.2 Per-Game Limits Assessment

| Limit | Current | Appropriate? |
|-------|---------|-------------|
| Witchhunts | 2 | ✅ Sufficient |
| Gov Shutdowns | 2 | ✅ Sufficient |
| Impeachments | 2 | ✅ Sufficient |
| Pack Courts | 1 | ✅ One is enough |
| Constitutional Crisis | 2 | ⚠️ At 8 JP each, even 1 is rare. Could be 1. |
| Internal Inquiry | 6 | 🔴 Too high — creates vacancy loops. Reduce to 3. |
| Partisan Ruling | 2 | ✅ Appropriate |
| Landmark Ruling | 1 | ✅ Appropriate |

### 7.3 Infinite Loops and Lock States

**No infinite loops found.** The `acts < 2000` safety valve in simulations never triggered. The turn system correctly rotates through all 4 players and forces round advancement when all players exhaust actions.

**Potential lock state:** If all 4 players have 0 actions remaining mid-round, `advanceTurn()` calls `endRound()`, which correctly resets. ✅ No issues found.

**Pending state lock:** Pending amendments and Unity Summits expire at round end, preventing indefinite blocks. ✅ Correct.

### 7.4 Griefing Potential

**House can grief President:** Subpoena every round (-2 Pop) + State of Union (hurtPres: -4 Pop) = -6 Pop/round with no cost. President has no defense. Over 3 rounds, this can drop President from 10 to 1 Popularity, destroying all Popularity-gated actions and triggering adverse election outcomes.

**Senate can grief House:** Government Shutdown (6 PC to zero House PC) is expensive but devastating if timed when House has stockpiled 4+ PC for Impeach/Pack Courts.

**SC can block legislation indefinitely:** Investigate Bill (legality -2, unlimited) + Injunction (block votes, once/game) + Judicial Review (strike down) creates a multi-layered legislative blockade. In a real game, SC can lower legality below 10 on every bill, making judicial review favorable.

**Suggestion:** Add reaction/defense mechanics so targeted players have counterplay options.

---

## Findings Summary

### CRITICAL

| ID | Finding | Impact | Suggestion | File/Line |
|----|---------|--------|------------|-----------|
| C1 | **House Hearing+Subpoena VP Farm**: +5 VP/round from 2 actions with zero cost | House wins 39% of games (should be ~25%) | Add 1 PC cost to Host Hearing's `gainVP` option; add 1 PC cost to Subpoena | `engine.js` L1023 (`houseHostHearing` case 'gainVP'), L1292 (`houseSubpoena`) |
| C2 | **Investigate Bill has no per-round limit**: SC used it 25× in one game | SC can manipulate all bill legality to minimum | Add `investigateBillUsedThisRound` flag, once per round | `engine.js` L1705 (`courtInvestigateBill`), add to round reset at L2693 |
| C3 | **House VP formula is ~40% higher than Senate's effective rate** | House averaging 97 VP vs Senate 82 VP, House wins 2× more often | Reduce House pass VP base from 5 to 3; equalize dice bonuses (both d20 or both d10) | `engine.js` L1106 (`housePassVP = 5`), L1489 (`senatePassVP = 4`) |

### HIGH

| ID | Finding | Impact | Suggestion | File/Line |
|----|---------|--------|------------|-----------|
| H1 | **Internal Inquiry limit (6/game) creates vacancy loops** | President and Senate lose 30-70% of actions to nominations | Reduce to 3/game | `config.js` L121 |
| H2 | **Partisan Ruling doesn't apply persistent modifier** | 4 JP + 2 actions for +1 partisanship on ONE bill is unplayable | Add `partisanshipModifier` to state, apply in `generateBill()` | `engine.js` L1832-1854 (add modifier), L239 (apply in generateBill) |
| H3 | **Senate d6 bonus vs House d20 bonus asymmetry** | Senate has ~30% probability of getting +3.5 avg help; House has ~100% of +10.5 avg | Give Senate d20 bonus within 20 votes (matching House), or give both d10 | `engine.js` L1477 (Senate d6), L1094 (House d20) |
| H4 | **Advocate/Admonish -5 Bill Popularity penalty** | Makes these actions self-defeating for bill passage | Reduce to -2 Popularity, or make Advocate +2 Pop / Admonish -5 Pop | `engine.js` L709 |
| H5 | **Events heavily favor President as resolver** | President gets most event VP opportunities; SC gets fewest | Add SC resolution options to 5-10 more events | `events.js` (multiple events) |
| H6 | **Filibuster awards SC +1 VP per rulebook contradiction** | Minor VP leak to SC | Remove `state.supremeCourt.vp += 1` from filibuster | `engine.js` L1427 |
| H7 | **Landmark Ruling `courtAuthority` is game-breaking** | +2 unconstitutional votes permanently trivializes judicial review | Nerf to +1 vote; fix `legalityStandard` to -3 (not +3, which hurts SC) | `engine.js` L2004-2006 |

### MEDIUM

| ID | Finding | Impact | Suggestion | File/Line |
|----|---------|--------|------------|-----------|
| M1 | **State Dinner is President's best action with no conditions** | 3 VP + 2 Pop unconditionally per round = 50 VP over game | Reduce to +2 VP or add Pop ≥ 10 threshold | `engine.js` L914-917 |
| M2 | **Conference is underpowered** (+1 PC each) | Never worth using vs Debate (+2 PC) or Nominations (+4 PC) | Increase to +2 PC each, or add +1 VP to Senate | `engine.js` L1451-1453 |
| M3 | **Government Shutdown -2 VP backlash** | Makes 6 PC cost + VP loss too expensive | Remove -2 VP backlash or reduce PC cost to 4 | `engine.js` L1568 |
| M4 | **Change Bill Now obsoleted by Initiate Legislation** | 2 actions + 2 PC for same result as free action | Reduce cost to 1 action + 1 PC, or allow ±5 customization per rules | `engine.js` L1053-1056 |
| M5 | **No mean-reversion in election composition shifts** | Compositions snowball to 100% one party | Add 5-10% natural reversion each election cycle | `engine.js` L2421-2496 |
| M6 | **Injunction overpriced** (3 JP, once/game for +1 VP) | Compare to Kill Bill (1 PC, once/round, +1 VP) | Increase VP to +2 or reduce JP to 2 | `engine.js` L1937-1941 |
| M7 | **No defensive reactions against Popularity attacks** | President has no counterplay to Subpoena/SotU harassment | Add "Address the Nation" free reaction when Pop drops below threshold | New action in President's toolkit |
| M8 | **Senate partisan PC bonus halved** vs rules | `Math.floor(partisanPoints / 2)` instead of per-point | Match rules: remove the `/2` divisor | `engine.js` L1500 |
| M9 | **Sue gives SC +1 VP instead of President** | President pays action for opponent's benefit | Add President +1 VP if ruling goes unconstitutional | `engine.js` L749 |

### LOW

| ID | Finding | Impact | Suggestion | File/Line |
|----|---------|--------|------------|-----------|
| L1 | **EO missing bill legality effect** from rules | Minor missing mechanic | Add optional bill targeting to EO | `engine.js` L680-690 |
| L2 | **Tax Cuts costs 3 actions** (original rules say 2) | Minor usability issue | Consider reducing to 2 actions | `engine.js` L758-759 |
| L3 | **Kill Bill doesn't carry to next round** per rules | Simplified from rules | Add carry-over flag | `engine.js` L996-1008 |
| L4 | **0 stability collapses in 200 games** | Collapse mechanic never triggers | Increase stability decay rate or add event-triggered decay | `engine.js` L2746-2756 |
| L5 | **Chaos shift goes majority→smallest** faction instead of center | Narratively odd (majority flips to extreme opposition) | Shift toward moderate factions instead | `events.js` L2507-2518 |

---

## Projected Balance After Fixes

### After Critical Fixes Only (C1-C3)

| Role | Estimated Avg VP | Win Rate |
|------|-----------------|----------|
| President | 80 | ~22% |
| House | 85 | ~28% |
| Senate | 85 | ~26% |
| Supreme Court | 82 | ~24% |

### After Critical + High Fixes

| Role | Estimated Avg VP | Win Rate |
|------|-----------------|----------|
| President | 82 | ~24% |
| House | 82 | ~26% |
| Senate | 82 | ~25% |
| Supreme Court | 82 | ~25% |

---

## Implementation Priority

### Phase 1: Critical (Required for Balanced Play)
1. **C1:** Add PC cost to Host Hearing VP option and Subpoena
2. **C2:** Add per-round limit to Investigate Bill
3. **C3:** Equalize House/Senate VP formulas

### Phase 2: High (Required for Strategic Depth)
4. **H1:** Reduce Internal Inquiry limit to 3/game
5. **H2:** Add persistent partisanship modifier for Partisan Ruling
6. **H3:** Equalize dice bonuses between chambers
7. **H4:** Fix Advocate/Admonish Popularity penalty
8. **H5:** Add more SC event resolution options
9. **H6:** Remove SC VP from filibuster
10. **H7:** Rebalance Landmark Ruling effects

### Phase 3: Medium (Improved Experience)
11-19. Medium findings as listed above

### Phase 4: Low (Polish)
20-24. Low findings as listed above
