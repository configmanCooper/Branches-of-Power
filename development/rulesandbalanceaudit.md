# Branches of Power — Rules and Balance Audit

**Date:** 2025-07-17  
**Based on:** Simulation results (10-round standard game, 2026-04-23), rules analysis (`Branches of Power.txt`, `Branches of Power_ Rulebook.txt`), and engine implementation (`engine.js`, `config.js`)

---

## 1. VP Economy Analysis

### How Each Role Earns VP

| Role | VP Sources | Typical VP/Action |
|------|-----------|-------------------|
| **President** | Bill passage passive (+5 base ±partisan), Sign Bill (+2), Executive Order (+1), Justice confirmed (+2), Tax Cuts bonus (+2), Popularity>15 end-of-round (+1) | ~1-2 VP/action |
| **House** | Pass Bill (+4 base + ceil(votes/80)), Bill passed by both chambers (+2, +2 partisan align), Kill Bill (+1), State of Union (+1), Host Hearing (+1), Initiate Legislation (free) | **~8 VP/action** |
| **Senate** | Pass Bill (+4 base + ceil(votes/20)), Bill passed by both chambers (+2, +2 partisan align), Nominations (+1), Filibuster (+1), Gov Shutdown (+1), Justice nomination (+1) | ~1-2 VP/action |
| **Supreme Court** | Judicial Review (unconst: +5, const: +2), General Court (+1), Advisory Role (+2), Bill Review (+1), Inquiry (+1), Bill not passed passive (+1), Bill signed passive (-1) | ~1-2 VP/action |

### VP Per Round Rates Observed in Simulation

| Round | President | House | Senate | Supreme Court |
|-------|-----------|-------|--------|---------------|
| 1 | 1 | 32 | 0 | 3 |
| 2 | 8 | 32 | 4 | 5 |
| 3 | 8 | 36 | 4 | 5 |
| 4 | 8 | 36 | 4 | 5 |
| 5 | 8 | 36 | 4 | 5 |
| 6 | 8 | 36 | 4 | 5 |
| 7 | 8 | 40 | 4 | 5 |
| 8 | 6 | 40 | 4 | 5 |
| 9 | 6 | 11 | 14 | -2 |
| 10 | 6 | 11 | 14 | -2 |
| **Total** | **67** | **310** | **56** | **34** |
| **Avg/Round** | **6.7** | **31.0** | **5.6** | **3.4** |

### VP Sources by Action Type (House Detail)

In rounds 1-8, the House earned VP almost exclusively from **repeated housePassBill calls**:
- Free action: `initiateLegislation` creates bill with Partisanship 5, Popularity 13, Legality 2
- Partisanship 5 falls in range [1-6] for Extreme Republicans AND [3-9] for Republicans
- With a heavily Republican House (231+ extremeRep + 89+ Rep), the bill passes with 320-435 votes every time
- Each pass: 4 VP + ceil(votes/80) = 4 + 4 to 6 = **8-10 VP per action**
- House calls pass 4 times per round = **32-40 VP per round**

### VP Generation Proportionality: **Catastrophically Imbalanced**

House earns 4.6× more VP than the President, 5.5× more than the Senate, and 9.1× more than the Supreme Court. No other role has a repeatable, unconditional 8+ VP action.

---

## 2. Action Economy Analysis

### How Each Role Spent Their 4 Actions

**President (Rounds 2-8):** assignJustice × 4 every round
- Locked into a loop: Court had vacancies every round (from Internal Inquiry + Court turnover), so President spent all 4 actions nominating justices
- Each confirmation = +2 VP → 8 VP/round
- No time for Executive Orders, Campaign, Tax Cuts, or bill interaction

**House (Rounds 1-8):** initiateLegislation (free) + housePassBill × 4
- Initiate Legislation costs 0 actions, creates a custom bill
- Then passes the same bill 4 times for 8+ VP each
- Never needed to use whip, support, hearing, or any other action
- **100% action efficiency** — every action produces maximum VP

**Senate (Rounds 1-8):** confirmJustice × 4 every round
- Forced to confirm justices because President kept nominating
- Each confirmation = +1 VP → 4 VP/round
- Never got to pass bills, debate, update, or use any legislative tools
- Rounds 1 Senate tried to pass but failed (54/60 — needed 60, only had 54)

**Supreme Court:** generalCourt, advisoryRole, billReview, suggestJustice/internalInquiry (rotating pattern)
- General Court: +1 VP (once/round)
- Advisory Role: +2 VP (once/round, requires alignment)
- Bill Review: +1 VP (once/round)
- Suggest Justice / Internal Inquiry: no direct VP
- Total: ~5 VP/round when alignment holds

### Action Efficiency (VP per Action)

| Role | VP/Action | Notes |
|------|-----------|-------|
| House | **8.0** | housePassBill is absurdly efficient |
| President | ~2.0 | assignJustice → confirmation = 2 VP |
| Senate | ~1.0 | confirmJustice = 1 VP |
| Supreme Court | ~1.25 | Mix of 1-2 VP actions |

### Wasted Actions and Missing Options

- **Senate was action-starved**: All 4 actions consumed by justice confirmations in rounds 2-8. The Senate player had no opportunity to use legislative tools.
- **President was action-starved**: All 4 actions consumed by justice assignments. No Executive Orders, no signing bills, no campaigning.
- **House had too many effective options**: Initiate Legislation (free) + 4× Pass Bill is devastatingly efficient. No need to explore other actions.
- **Supreme Court had limited VP-producing actions**: Only 3 actions per round that produce VP (General Court, Advisory, Bill Review), all once-per-round limited.

### Free Actions Impact

`initiateLegislation` being free is a **massive advantage** for the House. It lets them:
1. Replace any unfavorable bill with a custom one
2. Set partisanship to guarantee passage (e.g., Part 5 with Republican majority)
3. Do this without spending any of their 4 action points
4. Then spend all 4 actions passing the bill repeatedly

No other role has a free action of this power. The President's closest equivalent (passive VP on bill passage) requires other players to cooperate.

---

## 3. Rules Implementation Review

### Discrepancies Between Rules-as-Written and Rules-as-Coded

| # | Topic | Rules Say | Code Does | Severity |
|---|-------|-----------|-----------|----------|
| 1 | **General Court VP** | "Gain 2 VP" (both rule docs) | `state.supremeCourt.vp += 1` (line 1222) | **HIGH** — SC earns half the intended VP |
| 2 | **Debate Legislation PC** | "Gain 2 PC" (original rules); "Gain 1 PC" (rulebook) | `state.senate.pc += 1` (line 906) | MEDIUM — conflicting rule docs, code follows lower value |
| 3 | **Debate senator conversion** | "Convert 5 senators one step away" (rulebook) | Converts 3 democrats + 2 republicans toward moderate only (lines 909-914) | MEDIUM — code only shifts toward moderate, rules say "whatever direction" |
| 4 | **Filibuster PC cost** | "Cost 6 PC" (original rules) | `state.senate.pc < 4` check (line 941) | **HIGH** — Filibuster costs 4 PC in code vs 6 in original rules |
| 5 | **Filibuster SC VP** | Rulebook says "Supreme Court does not get VP for this" | `state.supremeCourt.vp += 1` (line 948) | MEDIUM — code contradicts rulebook |
| 6 | **Constitutional Crisis cost** | "Costs 10 VP" (both rule docs) | `state.supremeCourt.vp < 8` check (line 1301) | **HIGH** — 8 VP in code vs 10 VP in rules |
| 7 | **President passive bill VP** | Original rules: "gain 4 VP"; Rulebook: "gain 5 VP" | `presVP = 5` (line 1327) | LOW — code follows rulebook |
| 8 | **Bill Review scope** | Rulebook: "+2 legality, change popularity or partisanship by 2" | Code only does `+2 legality, +1 VP` (line 1190) — no pop/partisan adjustment | **HIGH** — Missing half the action's effect |
| 9 | **Investigate EO effect** | Rules: "President loses all VP and Popularity gained from EOs this round" | Code: "President -2 VP, -2 Pop" (fixed amount, lines 1168-1169) | MEDIUM — simplified but different |
| 10 | **House Pass Bill repeated passage** | Rules don't say bill can be passed multiple times | No guard against re-passing a bill already passed by House | **CRITICAL** — see Finding #1 |
| 11 | **Tax Cuts action cost** | "Costs 2 actions" (original rules); "Cost: 3 action points" (rulebook) | `actionsRemaining < 3` check → costs 3 actions (line 444) | LOW — code follows rulebook |
| 12 | **Initiate Legislation customization** | Rulebook: "add/subtract 1 partisanship (costs 2 legality), or 1 popularity (costs 1 legality)" | Code: takes arbitrary `partAdj` and `popAdj`, legality = 10 - abs(partAdj) - abs(popAdj) (line 841) | **HIGH** — Code allows much larger adjustments than rules permit |
| 13 | **Senate Pass Bill partisan bonus** | Rules: "add 1 PC for each partisan point" | Code: `Math.floor(partisanPoints / 2)` (line 1015) | MEDIUM — Senate gets half the PC the rules specify |
| 14 | **Kill Bill effect** | Rulebook: "bill stays on floor this round AND next round without vote" | Code only sets `billKilledThisRound` (line 631), no carry to next round | LOW — simplified |
| 15 | **Advisory Role bill adjustment** | Rulebook: "Change the points of the bill a total of two in whatever categories" | Code gives +2 VP only, no bill adjustment (line 1241) | MEDIUM — Missing bill modification |
| 16 | **Judicial Review constitutional VP** | Rulebook: "gain 2 VP" | Code: `+2 VP` (line 1120) | OK — matches |
| 17 | **Executive Order bill legality** | Rulebook: "write an 'E' on 1 passed bill and lower legality by 1" | Code: no bill legality effect (line 370-376) | MEDIUM — missing mechanic |

### Ambiguities Resolved by Implementation

1. **Turn interleaving**: Rules say "each player takes one action then switches." Code implements round-robin: President→House→Senate→SC→President→... This is reasonable.
2. **"Bill passed by both chambers"**: Code tracks `billPassedByHouse` and `billPassedBySenate` flags separately, allowing passage in any order within a round.
3. **PC spending on votes**: Code auto-spends PC for dice bonus and threshold reduction when close to passing. Rules leave this as player choice.
4. **Justice vacancy creation**: Internal Inquiry creates a `pendingJustice` vacancy that persists until filled. Multiple vacancies are not tracked (only one at a time).

---

## 4. Bill System Analysis

### Bill Generation, Passage, Signing, Vetoing, and Review

**Generation**: Bills are randomly generated with:
- Partisanship: d16+2 (range 3-18)
- Popularity: d14+3 (range 4-17)
- Legality: d10+5+legalityModifier (range 6-15 base)

**Initiate Legislation** (House free action): Creates a bill with Part 10±adj, Pop 10±adj, Leg 10-|adj|-|adj|. The simulation AI always used partAdj=-5, popAdj=+3, creating bills with Part 5, Pop 13, Leg 2. This is the optimal play because:
- Part 5 passes the Republican-majority House easily
- Pop 13 is decent but irrelevant since House just farms pass VP
- Leg 2 is terrible but doesn't matter because the bill never reaches SC review

**Passage**: House passes via faction voting. Senate requires 60 (or 51 with PC). Both chambers earn VP for passing.

**Signing**: President can sign if both chambers pass → +2 VP, new bill generated.

**Veto**: Costs 1 VP, bill returns requiring 2/3 supermajority.

### Does the Bill System Create Interesting Decisions?

**No — it is almost entirely formulaic in the current implementation.** The dominant strategy is:
1. House initiates custom legislation (free)
2. House passes it repeatedly (the code doesn't prevent this)
3. Senate cannot pass it (60-vote threshold is much harder to reach)
4. Bill sits on floor, SC gets +1 passive VP at end of round

Bills only became interesting in rounds 9-10 when the party balance shifted and bills actually passed both chambers. At that point, the President got to sign bills, Senate could finally participate, and interesting decisions emerged around kill/support/attack.

### Senate/House Voting Mechanics

**House voting is far too easy.** With even a modest majority, the House can guarantee passage:
- Initiate Legislation at Part 5 → Republicans (3-9 range) AND Extreme Republicans (1-6 range) both vote yes
- With 231 extremeRep + 89 Rep = 320 votes (needs 218)
- Even without manipulation, the House can always craft a bill that passes

**Senate voting is far too hard.** The 60-vote threshold (out of 100) is extremely difficult:
- No single faction spans a wide enough range to guarantee 60 votes
- The composition in the simulation (Dem 28, ModDem 18, ModRep 33, Rep 21) means Part 5 only gets ModRep (33) + Rep (21) = 54 votes — not enough
- Senate would need to spend multiple actions on debate/update to get a bill passable, while House can pass instantly

**Fundamental asymmetry**: House needs 218/435 (50.1%) while Senate needs 60/100 (60%). Combined with faction ranges that rarely overlap enough for 60+ senators, the Senate is structurally disadvantaged at passing bills.

---

## 5. Election System Analysis

### Election Frequencies and Observed Impact

**Court (every round):** d20 roll, vacancy on 1, 2, 10, 11, 19, 20 (30% chance). In the simulation, vacancies occurred rounds 1, 2, 5. The president and senate spent essentially all their actions on justice nominations/confirmations because Internal Inquiry (SC action) also created vacancies, leading to a perpetual vacancy loop.

**Legislative elections (every 2 rounds):** House and Senate compositions shift based on presidential popularity. With popularity 10-12 (neutral), shifts were modest but cumulative. Over 10 rounds, the House went from a balanced split to 100% Republican (Far-D 0, Dem 0, Rep 300+, Far-R 135). This runaway effect means elections amplify existing advantages rather than creating balance.

**Presidential election (every 4 rounds):** Round 4: incumbent won (roll 9 vs pop 13). Round 8: opposing party won (roll 15 vs pop 14). The party change in round 8 was the only major disruption, creating the most interesting gameplay (rounds 9-10).

### Do Elections Create Meaningful Change?

**Elections are too deterministic in their direction** but unpredictable in magnitude. A popularity of 10-12 (very common — the president rarely moves far from baseline) means gentle shifts toward the president's party. Over multiple election cycles, this creates a snowball effect where the president's party dominates both chambers more and more.

**The composition snowball** is a real problem: As the House becomes more Republican, House-initiated Republican bills pass with more votes, generating more VP. Elections never reset this — they only accelerate it.

### Election Impact on VP

Elections themselves don't directly award VP, but they reshape the legislative landscape:
- A House that's 90%+ one party can pass ANY bill tuned to that party's faction
- A Senate that's 90%+ moderate-Republican still can't reach 60 votes on many bills
- Presidential party change (round 8→9) was the most impactful event: suddenly created a Democrat president with a Republican congress, enabling bipartisan dynamics

---

## 6. Special Actions Analysis

### Cost vs. Reward Analysis

| Action | Cost | Reward | Practical? | Notes |
|--------|------|--------|------------|-------|
| **Impeachment** | 6 PC, 1 action | President -8 VP, House +6 VP, Senate +2 VP; requires 2/3 vote | **Almost never** | 6 PC is enormous. Need 288/435 House votes AND 67/100 Senate votes. The bipartisan requirements make this nearly impossible. |
| **Pack Courts** | 6 PC, 4 VP, 1 action | +4 justices of your party, SC -10 VP | **Almost never** | Costs 10 resources (6 PC + 4 VP). Need to pass through both chambers. Bill starts at Pop 5, Leg 5 — very hard to pass. |
| **Government Shutdown** | 6 PC | House PC=0, Pres Pop -4, +1 VP | **Rarely** | 6 PC is very expensive for Senate. Gaining 6 PC takes multiple rounds. Return of +1 VP and tactical disruption is marginal. |
| **Witchhunt** | 2 actions, 2 VP, 2 Pop; requires Pop≥15 | SC -6 VP, SC can't investigate next round | **Rarely** | Reaching Pop 15 is hard. Spending 2 VP + 2 Pop + 2 actions is enormous. SC only averages 3.4 VP/round so -6 VP is devastating to SC but the opportunity cost to President is too high. |
| **Constitutional Crisis** | 2 actions, 8 VP | All legality permanently -2 | **Almost never** | 8 VP is roughly 2+ rounds of SC income. The legality reduction helps SC's judicial review but the VP cost is self-defeating. |
| **Internal Inquiry** | 2 VP | 30% chance of forced retirement | **Sometimes** | Used in simulation. Creates vacancies that the SC player can try to influence via Suggest Justice. Net cost if it works: 2 VP for political influence. |
| **Partisan Ruling** | 2 actions, 4 VP | Shift all partisanship by 1 | **Almost never** | 4 VP and 2 actions for a tiny permanent shift. Only useful if a 1-point shift flips a key faction's vote. |

### Summary: Special actions are almost universally too expensive and too situational. They exist as "nuclear options" but the opportunity cost of using them (spending VP you need to WIN) makes them self-defeating. The only special action that saw use was Internal Inquiry (which at 2 VP cost with 30% chance is itself marginal).

---

## 7. Simulation Results Deep Dive

### Round-by-Round Analysis

**Round 1: The Pattern Emerges**
- President: Tax Cuts (3 actions) + Executive Order (1 action) = 1 VP
- House: Initiate Legislation (free, Part 5/Pop 13/Leg 2) + Pass Bill ×4 = 32 VP
- Senate: Pass Bill ×4, all FAILED (54/60 votes) = 0 VP
- Supreme Court: General Court + Advisory + Bill Review + Internal Inquiry = 3 VP
- **Key insight**: House discovered the exploit immediately. 32 VP in round 1 while others combined for 4 VP.

**Rounds 2-8: The Justice Loop**
- Internal Inquiry (R1) caused a retirement → vacancy
- President spent all 4 actions nominating justices every round
- Senate spent all 4 actions confirming justices every round
- House continued the initiate+pass×4 pattern = 32-40 VP/round
- SC settled into a rotation: General Court, Advisory, Bill Review, Suggest Justice
- Court composition went from balanced (Lib 1, Mod 4, Con 4) to extreme (Lib 1, Mod 3, Con 31)

**Round 8: Presidential Election**
- Opposing party wins (Democrat replaces Republican)
- This breaks the justice nomination loop (no more vacancies being created)
- First round where real legislative gameplay emerges

**Rounds 9-10: Actual Gameplay**
- Democrat president + Republican congress creates genuine tension
- House initiates bill (Part 5) → passes House (435 votes!) AND Senate (100 votes — because the Senate is now 100% mod-Republican, and Part 5 falls in 5-12 range)
- President signs the bill → first bill passage in the game!
- Multiple bills pass, creating VP for everyone
- Senate finally earns meaningful VP (14/round)
- House VP drops to 11/round (still using kill bill, support, attack)
- SC tries judicial review, spends VP, gets some back

### Key Turning Points

1. **Round 1, Action 1**: House uses Initiate Legislation to create Part 5 bill → sets the dominant strategy for the entire game
2. **Round 1, Action 3**: Senate fails first pass attempt (54/60) → Senate is locked out of bill passage for 8 rounds
3. **Round 2**: Internal Inquiry creates vacancy → triggers the justice nomination loop that consumes President and Senate for 7 rounds
4. **Round 8**: Presidential election changes party → breaks the monotony, enables actual bill passage

### Why House Dominated So Completely

**Root cause: housePassBill has no guard against repeated passage.** The code at line 708-756 processes a bill pass attempt every time it's called. There is no check like:
```javascript
if (bill.passedByHouse) return { success: false, message: 'Bill already passed.' };
```

This means:
1. House passes the same bill 4 times per round
2. Each pass awards 4 VP + ceil(votes/80) = 8-10 VP
3. 4 passes × 8 VP = 32 VP per round minimum
4. Over 10 rounds = 320 VP from pass actions alone

Additionally, `initiateLegislation` being free with arbitrary adjustments means the House can always craft a bill guaranteed to pass.

### What Each AI Did Well or Poorly

**President AI**: Reasonably played — took advantage of justice vacancies for guaranteed +2 VP per confirmation. Could have diversified (Executive Orders, Campaign) if not locked into the justice loop. Used Tax Cuts in R1 which was wasted (got replaced by House's initiate legislation immediately).

**House AI**: Exploited the pass-bill bug perfectly. The strategy (initiate at Part 5, pass ×4) was the mathematically optimal play given the rules-as-coded. The AI did nothing wrong — the game is broken.

**Senate AI**: Made the best of a bad situation. Confirming justices (1 VP each, 4/round) was the only reliable VP source since bills couldn't pass the Senate. In rounds 9-10, the AI correctly passed bills and blocked nominations. Could have been more aggressive with debate/conference to build PC earlier.

**Supreme Court AI**: Played a reasonable rotation. Could have been more aggressive with Judicial Review in rounds 9-10 (used it but rulings came back constitutional). The Advisory Role being blocked after R8 (Democrat president broke alignment) correctly identified an issue.

### Were AI Strategies Reasonable Representations of Optimal Play?

**For House**: Yes — exploiting housePassBill is the dominant strategy. No rational House player would do anything else.

**For Senate**: Partially — the AI was too passive in rounds 1-8. A human Senate player would have used debate/conference to build PC, then tried to pass a bill with PC support. However, even with optimal play, Senate VP would cap around 10-12/round vs House's 32+.

**For President**: Partially — a human would have varied actions more (EOs for VP+Pop, Campaign for election advantage). But the justice loop was hard to escape since SC kept creating vacancies.

**For Supreme Court**: Partially — more aggressive use of Constitutional Crisis or partnering with Senate to pass bills through judicial review could have helped. But the VP ceiling for SC is structurally very low.

---

## Findings by Priority

---

### CRITICAL (Game-Breaking)

#### Finding C1: House Can Pass the Same Bill Unlimited Times Per Round

- **Issue**: `housePassBill()` (engine.js line 708) has no guard to prevent passing a bill that was already passed by the House. Each successful pass awards 4 VP + ceil(votes/80) VP.
- **Evidence**: In the simulation, House called `housePassBill` 4 times per round, earning 32-40 VP/round. Final score: House 310 VP vs next-highest President 67 VP (4.6× gap).
- **Root Cause**: Missing validation check — `bill.passedByHouse` is set to `true` on line 729 but never checked at the top of the function.
- **Suggested Fix**: Add at the start of `housePassBill()`:
  ```javascript
  if (bill.passedByHouse) return { success: false, message: 'Bill already passed the House.' };
  ```
- **Impact**: Reduces House from 32+ VP/round to approximately 8-12 VP/round (one pass attempt). This single fix would close ~80% of the balance gap.

#### Finding C2: Senate Can Also Pass the Same Bill Unlimited Times Per Round

- **Issue**: `senatePassBill()` (engine.js line 976) has the same vulnerability — no check for `bill.passedBySenate`. While the Senate failed its passes in this simulation, a future simulation with different composition could exploit this identically.
- **Evidence**: The code at line 1004 sets `bill.passedBySenate = true` but this is never checked as a precondition.
- **Root Cause**: Same as C1 — missing validation.
- **Suggested Fix**: Add at the start of `senatePassBill()`:
  ```javascript
  if (bill.passedBySenate) return { success: false, message: 'Bill already passed the Senate.' };
  ```
- **Impact**: Prevents the same exploit from appearing for Senate under different compositions.

#### Finding C3: Initiate Legislation Allows Unrestricted Stat Customization

- **Issue**: `houseInitiateLegislation()` (line 832) accepts arbitrary `partAdj` and `popAdj` parameters with no bounds checking. The rules state you can only adjust by ±1 partisanship (costing 2 legality) or ±1 popularity (costing 1 legality). The code allows `partAdj=-5, popAdj=+3` (as used by the AI), creating Part 5, Pop 13, Leg 2.
- **Evidence**: Every round, the AI created bills with Part 5/Pop 13/Leg 2. These passed the Republican-majority House with 320-435 votes (100% pass rate).
- **Root Cause**: The code uses `partAdj` and `popAdj` as raw offsets with no bounds. The legality penalty formula `10 - abs(partAdj) - abs(popAdj)` handles cost but doesn't enforce the per-point limits from the rules.
- **Suggested Fix**: Enforce the rules-as-written limits:
  ```javascript
  // Without PC: max ±1 partisanship (costs 2 leg) or ±1 popularity (costs 1 leg)
  // With PC: can spend 1 PC per additional point with no legality penalty
  if (Math.abs(partAdj) > 1 && pcAvailable < Math.abs(partAdj) - 1) {
      return { success: false, message: 'Exceeds free adjustment limit.' };
  }
  ```
  Or alternatively, cap the free adjustment at ±2 partisanship and ±2 popularity maximum, with higher adjustments requiring PC expenditure.
- **Impact**: Prevents the House from crafting a "perfect bill" every round. Bills would start near 10/10/10 and require actions/PC to move into passable range, making the House invest real resources.

---

### HIGH (Major Balance Issues)

#### Finding H1: House Pass Bill VP Formula Is Roughly 4× Senate's

- **Issue**: House gets `4 + ceil(votes/80)` VP per pass. With 320 votes, that's 4+4=8 VP. Senate gets `4 + ceil(votes/20)` VP per pass, but wait — Senate's formula is actually MORE generous per-vote (ceil(100/20) = 5, total 9 VP). However, the Senate's 60-vote threshold makes passing far harder, and the House's ability to guarantee passage with a custom bill means House consistently earns 8+ VP while Senate earns 0.
- **Evidence**: Over 10 rounds, House earned VP from passing in every round. Senate only earned VP from passing in rounds 9-10.
- **Root Cause**: The structural advantage isn't the VP formula — it's the combination of (1) easy passage threshold, (2) free custom bill creation, and (3) the repeated-pass bug. Even with the repeated-pass bug fixed, the House's ability to guarantee passage every round while Senate struggles to reach 60 votes is a fundamental imbalance.
- **Suggested Fix**: Consider one or more of:
  - Raise House pass threshold to 250 (57.5%)
  - Lower Senate pass threshold to 55 (matching real-world simple majority after filibuster reform)
  - Reduce base VP for passing from 4 to 2
  - Make passage VP scale with bill popularity (rewarding crafting good bills, not just any bill)
- **Impact**: Would make bill passage a meaningful achievement rather than a VP farm.

#### Finding H2: General Court VP Is Half the Rules Amount

- **Issue**: Code awards 1 VP for General Court (line 1222). Both rule documents state it should be 2 VP.
- **Evidence**: `state.supremeCourt.vp += 1` vs rules: "Gain 2 VP" (both docs)
- **Root Cause**: Implementation error.
- **Suggested Fix**: Change to `state.supremeCourt.vp += 2`.
- **Impact**: SC would earn 1 additional VP per round (10 VP over a full game). Not enough to fix the balance alone, but it's a direct rules violation.

#### Finding H3: Bill Review Missing Partisanship/Popularity Adjustment

- **Issue**: The rulebook states Bill Review should "Increase the legality of the bill by 2, change popularity or partisanship by a total of two points in either direction of your choice. Gain 1 VP." The code only increases legality by 2 and gives 1 VP — the popularity/partisanship adjustment is missing.
- **Evidence**: `courtBillReview()` at line 1186 — only modifies legality and VP.
- **Root Cause**: Incomplete implementation.
- **Suggested Fix**: Add parameters for the 2-point adjustment across popularity and partisanship.
- **Impact**: Would give SC more agency to shape bills toward states that favor judicial review (e.g., lowering popularity to hurt the president, or shifting partisanship to set up unconstitutional rulings).

#### Finding H4: Senate Debate Gives 1 PC Instead of 2, and Only Shifts Toward Moderate

- **Issue**: Original rules say "Gain 2 PC and convert 5 senators one step away in whatever direction." Code gives 1 PC and only shifts toward moderate (3 Democrats→ModDem, 2 Republicans→ModRep).
- **Evidence**: `senateDebate()` at line 905: `state.senate.pc += 1`, then fixed shifts toward moderate.
- **Root Cause**: Implementation chose the lower value from conflicting rule sources and hardcoded shift direction.
- **Suggested Fix**: Award 2 PC. Allow the player to choose shift direction and which factions to shift. This is critical for Senate to build PC for passing bills.
- **Impact**: Senate could build PC faster (2/action vs 1/action) and shape the Senate composition strategically. Over 10 rounds, this is potentially 10+ more PC, enabling filibusters, bill updates, etc.

#### Finding H5: The Justice Nomination Loop Consumes All President and Senate Actions

- **Issue**: When Internal Inquiry creates vacancies and Court Turnover creates more, the President and Senate are forced into a nomination/confirmation loop that prevents them from doing anything else. In the simulation, rounds 2-8 saw President and Senate spend ALL actions on justice management.
- **Evidence**: R2-R8: President used assignJustice ×4, Senate used confirmJustice ×4. No legislative actions from either role for 7 straight rounds.
- **Root Cause**: (1) Vacancies persist until filled. (2) Each vacancy requires 1 President action + 1 Senate action. (3) With 4 actions/round and constant vacancy creation, there's no room for anything else. (4) The AI creates a vacancy via Internal Inquiry and the court turnover roll adds more.
- **Suggested Fix**: 
  - Limit justice nominations to 2 per round maximum
  - Or: make nomination a free action for the President (matching the political reality that nomination is just an announcement)
  - Or: automatically confirm a justice after 1 round if Senate doesn't act (prevents indefinite queue)
- **Impact**: President and Senate would have 2+ actions per round for legislative and political activities.

---

### MEDIUM (Moderate Improvements)

#### Finding M1: Filibuster Cost Mismatch (4 PC in Code vs 6 PC in Original Rules)

- **Issue**: Original rules say Filibuster costs 6 PC. Code charges 4 PC (line 941). Rulebook says 4 PC (line 79 of rulebook).
- **Evidence**: `state.senate.pc < 4` check in `senateFilibuster()`.
- **Root Cause**: Conflicting rule documents; code follows the rulebook.
- **Suggested Fix**: Standardize to one cost. 4 PC seems reasonable given the Senate's difficulty accumulating PC.
- **Impact**: Minor — filibuster was never used in the simulation regardless.

#### Finding M2: Constitutional Crisis VP Cost Mismatch (8 VP vs 10 VP)

- **Issue**: Both rule documents say Constitutional Crisis costs 10 VP. Code charges 8 VP (line 1301).
- **Evidence**: `state.supremeCourt.vp < 8` check.
- **Root Cause**: Intentional or accidental reduction.
- **Suggested Fix**: Either update code to 10 VP (matching rules) or update rules to 8 VP. Either way, the action is still impractical due to the enormous VP cost.
- **Impact**: Minor — action is almost never practical at either cost.

#### Finding M3: Senate Pass Bill Partisan PC Bonus Is Halved

- **Issue**: Rules: "add 1 PC for each partisan point of majority party." Code: `Math.floor(partisanPoints / 2)` (line 1015).
- **Evidence**: When Senate passes a bill with Part 5 and Republican majority, partisan points = 5. Rules would give 5 PC; code gives 2 PC.
- **Root Cause**: Intentional halving (possibly for balance), but undocumented.
- **Suggested Fix**: Either match the rules (1 PC per partisan point) or document the halving as intentional. Given Senate's PC struggles, the full amount would help.
- **Impact**: Would help Senate build PC reserves for defensive actions (filibuster, stall, government shutdown).

#### Finding M4: Filibuster Awards SC +1 VP Despite Rulebook Saying It Shouldn't

- **Issue**: Rulebook explicitly states "The Supreme Court does not get VP for this." Code awards `state.supremeCourt.vp += 1` (line 948).
- **Evidence**: Direct contradiction between rulebook and code.
- **Root Cause**: Oversight — the filibuster function was likely copied from a template that included SC passive VP.
- **Suggested Fix**: Remove `state.supremeCourt.vp += 1` from `senateFilibuster()`.
- **Impact**: Minor — filibuster is rare.

#### Finding M5: Elections Create Runaway Composition Effects

- **Issue**: Every 2 rounds, elections shift House and Senate compositions based on presidential popularity. With neutral popularity (10-12), shifts are modest but always in the same direction. Over 5 election cycles, the House went from balanced to 100% Republican.
- **Evidence**: R0: Far-D 32, Dem 83, Rep 89, Far-R 231 → R10: Far-D 0, Dem 0, Rep 300, Far-R 135.
- **Root Cause**: The shift mechanic is additive and one-directional. Even a "neutral" popularity of 10-12 causes slight toward-president shifts. There's no mean-reversion or natural party regeneration.
- **Suggested Fix**: Add mean-reversion mechanics:
  - Each election, 5-10% of members naturally shift back toward the center
  - Or: introduce "wave elections" where extreme compositions trigger backlash
  - Or: cap the maximum composition at 80% for any single faction group
- **Impact**: Would prevent the late-game degenerate state where one party controls 100% of a chamber.

#### Finding M6: Advisory Role Is Too Restrictive

- **Issue**: Advisory Role requires President, House, AND Supreme Court all lean the same direction. After the presidential election in R8, this became impossible (Democrat president + Republican House + Conservative Court), blocking the SC's best VP action.
- **Evidence**: Rounds 9-10: "FAILED: All branches must lean same direction" for every advisory attempt.
- **Root Cause**: The alignment requirement is too strict — it requires all three branches to match, which is unlikely in a contested game.
- **Suggested Fix**: Require only 2 of 3 branches to align, OR increase VP to 3 when all 3 align (rewarding the rare perfect alignment).
- **Impact**: SC would have a more reliable 2 VP action, improving their VP rate from ~3.4/round to ~4.5/round.

#### Finding M7: Supreme Court Net VP from Bill Passage Is Negative

- **Issue**: When a bill passes both chambers, SC loses 1 VP (passive, line 1384). When a bill is signed by President, SC loses nothing additional. The SC's passive "+1 VP when bill not passed" is the only reliable passive VP source, but it's small. The net effect is that successful legislation HURTS the SC.
- **Evidence**: Rounds 9-10: Bills passed and were signed → SC VP went DOWN (from 38 to 34 over R9-10).
- **Root Cause**: The design intent (SC gains power from legislative gridlock) is sound thematically, but the numbers don't support competitive VP generation.
- **Suggested Fix**: Increase the "bill not passed" passive to +2 VP, or add +1 VP whenever a bill the SC reviewed is signed (the review was valuable).
- **Impact**: Would give SC a more competitive VP rate in legislative-heavy games.

---

### LOW (Polish)

#### Finding L1: Executive Order Has No Bill Legality Effect

- **Issue**: The rulebook describes Executive Orders as allowing the President to "write an 'E' on 1 [passed bill] and lower its legality by 1." This is not implemented in the code.
- **Evidence**: `presidentExecutiveOrder()` at line 369 — only adds VP and popularity.
- **Root Cause**: Simplified for digital implementation (tracking "E" markers on bills).
- **Suggested Fix**: Add optional bill selection to Executive Order and reduce selected bill's legality by 1. This creates interesting interplay with SC judicial review.
- **Impact**: Would give President another strategic dimension and create SC interaction opportunities.

#### Finding L2: Change Bill Now Missing Player Customization

- **Issue**: The rulebook says Change Bill Now lets you "add or subtract up to 5 points in partisanship and/or popularity, but subtract 1 legality for each point." Code creates a flat 10/10/10 bill with no customization (line 685-706).
- **Evidence**: `houseChangeBill()` generates a fixed bill with no parameters for customization.
- **Root Cause**: Simplified implementation.
- **Suggested Fix**: Accept adjustment parameters similar to Initiate Legislation but with the 2 PC + 2 action cost, and allow up to ±5 adjustment with legality penalty.
- **Impact**: Minor — Change Bill Now is expensive (2 PC + 2 actions) and rarely worth using compared to free Initiate Legislation.

#### Finding L3: Tax Cuts Uses 3 Actions in Code But Original Rules Say 2

- **Issue**: Original rules say Tax Cuts costs 2 actions. Rulebook says 3 actions. Code implements 3 actions.
- **Evidence**: `presidentTaxCuts()` line 444: `actionsRemaining < 3`.
- **Root Cause**: Rule revision between documents.
- **Suggested Fix**: Standardize — 3 actions makes Tax Cuts very expensive but the bill (Pop 20, Part 5/15, Leg 10) is very strong. Either cost could work; 2 actions would make it more viable.
- **Impact**: Minor quality-of-life for President. At 3 actions, Tax Cuts is rarely worth using over 3 Executive Orders (3 VP + 3 Pop vs eventual bill passage VP).

#### Finding L4: Kill Bill Doesn't Carry to Next Round

- **Issue**: Rulebook says Kill Bill means "the bill stays on the floor this round and the next round without a vote." Code only prevents voting this round.
- **Evidence**: `state.billKilledThisRound = true` but no carry-over flag in `endRound()`.
- **Root Cause**: Simplified implementation.
- **Suggested Fix**: Add `billKilledCarryOver` flag that persists one additional round.
- **Impact**: Would make Kill Bill more impactful strategically.

#### Finding L5: Partisan Ruling Only Shifts Current Bill, Not Future Bills

- **Issue**: The rules say Partisan Ruling permanently shifts "all bills on the floor and all future bills." Code only shifts the current bill's partisanship by ±1 (line 1289) with no persistent modifier.
- **Evidence**: `courtPartisanRuling()` modifies `state.currentBill.partisanship` but doesn't set a permanent modifier (unlike Constitutional Crisis which uses `legalityModifier`).
- **Root Cause**: Missing persistent modifier implementation.
- **Suggested Fix**: Add `state.supremeCourt.partisanshipModifier` and apply it in `generateBill()`, similar to how `legalityModifier` works.
- **Impact**: Would make Partisan Ruling actually useful — currently it's 4 VP for a +1 shift on one bill, which is absurd.

#### Finding L6: Co-Action Constitutional Amendment Not Implemented

- **Issue**: The rulebook describes a "Co-Action: Constitutional Amendment" that requires President Pop≥15 and agreement from President, Senate, and House. This is not implemented in the engine.
- **Evidence**: No function for Constitutional Amendment exists in engine.js.
- **Root Cause**: Complex multi-player cooperation action may have been deferred.
- **Suggested Fix**: Implement as described in rulebook. This gives players a way to counteract SC dominance.
- **Impact**: Low — the action is very expensive and requires near-unanimous cooperation.

---

## Summary of Recommended Fix Priority

### Immediate (Required for Playable Game)
1. **C1**: Add `passedByHouse` check to `housePassBill()` — prevents repeated pass exploit
2. **C2**: Add `passedBySenate` check to `senatePassBill()` — prevents same exploit
3. **C3**: Enforce Initiate Legislation adjustment limits per the rulebook

### Short-Term (Required for Balanced Game)
4. **H1**: Rebalance VP awards for bill passage across roles
5. **H2**: Fix General Court to award 2 VP per rules
6. **H3**: Implement full Bill Review action (legality + pop/partisanship adjustment)
7. **H4**: Fix Senate Debate to award 2 PC and allow directional shifts
8. **H5**: Limit justice nominations per round or make them free actions

### Medium-Term (Improved Experience)
9. **M3**: Fix Senate partisan PC bonus
10. **M4**: Remove SC VP from filibuster
11. **M5**: Add mean-reversion to election mechanics
12. **M6**: Relax Advisory Role alignment requirement
13. **M7**: Improve SC passive VP rates

### Long-Term (Polish)
14. **L1-L6**: Various implementation completeness fixes

---

## Projected Balance After Critical Fixes

If C1, C2, and C3 are fixed (no repeated passing, limited Initiate Legislation adjustments):

| Role | Estimated VP/Round | Projected 10-Round Total |
|------|-------------------|--------------------------|
| President | 6-8 | 60-80 |
| House | 8-12 | 80-120 |
| Senate | 6-10 | 60-100 |
| Supreme Court | 4-6 | 40-60 |

With additional H-tier fixes (General Court 2 VP, full Bill Review, Debate 2 PC):

| Role | Estimated VP/Round | Projected 10-Round Total |
|------|-------------------|--------------------------|
| President | 7-9 | 70-90 |
| House | 8-10 | 80-100 |
| Senate | 7-10 | 70-100 |
| Supreme Court | 6-8 | 60-80 |

This would create a competitive game where all four roles have viable paths to victory and meaningful strategic decisions.
