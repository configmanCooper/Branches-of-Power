# Branches of Power — Events System Plan

## Overview

A dynamic events system that forces all four players to respond to national crises, opportunities, and political upheavals. Events create a cooperative tension layer on top of the competitive VP game — if stability hits 0, **everyone loses**.

---

## Stability

- **New global stat: Stability** — starts at **5**, min **0**, max **10**
- Displayed prominently in the game header (gauge/bar)
- If stability reaches **0** at any point, the game ends immediately and **all players lose** (no winner)
- Stability naturally decays by **1 every 3 rounds** (creates urgency to resolve events, not hoard stability)
- Players can never directly raise stability outside of event resolution

### Stability Thresholds (Visual + Mechanical)
| Stability | Label | Effect |
|-----------|-------|--------|
| 8–10 | 🟢 Prosperous | All players get +1 bonus VP at end of each round |
| 5–7 | 🟡 Stable | Normal gameplay |
| 3–4 | 🟠 Unstable | All bill popularity -2 at generation, elections swing harder |
| 1–2 | 🔴 Crisis | All players lose 1 action per round (3 instead of 4), no VP from passive sources |
| 0 | 💀 Collapse | **Game over — everyone loses** |

---

## Event System Mechanics

### Triggering
- **One event is active at a time** (a second event can queue if the first is about to expire)
- Events trigger at the **start of a round**, checked after round transition
- Trigger chance: **40% per round** if no event is active, **15%** if one is already active (queued)
- First event always triggers on **round 2** to let players establish positions first
- Events are drawn randomly from the pool, weighted by current stability (lower stability = more severe events)
- An event cannot repeat until at least 3 other events have occurred

### Event Structure
Each event has:
- **Name** and **flavor text**
- **Category** (Domestic, Foreign, Constitutional, Economic, Social, Natural, Security)
- **Severity**: Minor (⭐), Moderate (⭐⭐), Major (⭐⭐⭐)
- **Deadline**: Number of rounds to resolve (1–3 rounds)
- **Resolution options**: 2–4 ways to resolve, each requiring specific player actions
- **Failure penalty**: Stability lost if deadline expires unresolved (1–3)
- **Success reward**: Stability gained on resolution (0–2)
- **VP effects**: VP gained/lost by resolving players
- **Special actions**: Some events grant temporary actions usable only while the event is active
- **Responsible roles**: Which roles have resolution options available

### Resolution Mechanics
- Each resolution option is an **action** available to the designated role(s) during their turn
- Resolution options cost **1 action point** unless specified otherwise
- Some resolutions require **cooperation** (multiple roles must each take their resolution action)
- Some resolutions are **competitive** (one role resolves it their way, locking out other options)
- A resolution attempt may require a **d20 roll** with a threshold
- Once resolved, the event leaves play and its effects apply immediately

### Event Queue Display
- Active event shown as a prominent banner between the bill card and composition bars
- Shows: name, flavor text, deadline countdown, available resolution options for current player
- Queued event shown as a smaller "incoming" card with just the name and time remaining
- Color-coded by severity: green/yellow/red for minor/moderate/major

---

## The 50 Events

### DOMESTIC EVENTS (1–10)

---

#### 1. Government Funding Crisis
**Category:** Domestic | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"The current budget expires at midnight. Without action, federal agencies will begin shutting down."*

**Resolution Options:**
- **A) Emergency Budget (House + Senate):** Both House and Senate must each spend 1 action. House gains +2 VP, Senate gains +2 VP. Stability +1.
- **B) Presidential Decree (President):** President spends 1 action + 2 popularity. President gains +3 VP. Stability +1.
- **C) Austerity Measures (Any):** Any player spends 1 action. All players lose 1 VP. Stability +1 (but no VP reward).

**Failure:** Stability -2. All players lose 2 VP.

---

#### 2. Infrastructure Collapse
**Category:** Domestic | **Severity:** ⭐⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"A major bridge collapse has killed dozens and shut down a critical interstate corridor. The nation demands action."*

**Resolution Options:**
- **A) Emergency Reconstruction Bill (House):** House spends 2 actions. Current bill is replaced with a special Infrastructure Emergency bill (Part: 10, Pop: 16, Leg: 14). If passed before deadline, Stability +2, House +4 VP.
- **B) Federal Emergency Declaration (President):** President spends 1 action + 3 popularity. Stability +1. President +2 VP.
- **C) Court-Ordered Federal Response (Supreme Court):** SC spends 1 action + 2 JP. Roll d20: 12+ succeeds. Stability +1, SC +3 VP. Fail: no effect, action wasted.

**Failure:** Stability -3. President popularity -3.

**Special Action (President):** *"Address the Nation"* — Free action, +2 popularity but does not resolve the event.

---

#### 3. Opioid Epidemic Surge
**Category:** Domestic / Social | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"Overdose deaths have spiked 40% this quarter. Hospitals are overwhelmed and communities demand federal intervention."*

**Resolution Options:**
- **A) Fund Treatment Programs (House + President):** House spends 1 action + 2 PC, President spends 1 action. Stability +2. House +2 VP, President +2 VP.
- **B) Declare Public Health Emergency (President):** President spends 1 action + 2 popularity. Stability +1. President +3 VP.
- **C) Investigate Pharmaceutical Companies (Supreme Court):** SC spends 1 action. Roll d20: 10+. Stability +1, SC +2 VP, +1 JP. Fail: no resolution.

**Failure:** Stability -2. President popularity -2.

---

#### 4. National Teachers' Strike
**Category:** Domestic / Social | **Severity:** ⭐ | **Deadline:** 2 rounds
**Flavor:** *"Teachers across 30 states have walked out demanding better pay and funding. Schools sit empty."*

**Resolution Options:**
- **A) Education Funding Bill (House):** House spends 1 action. A temporary bill appears (Part: 12, Pop: 15, Leg: 12). If current bill exists, it queues. Stability +1, House +1 VP.
- **B) Presidential Mediation (President):** President spends 1 action. Roll d20: 8+ resolves. Stability +1, President +2 VP. Fail: popularity -1.
- **C) Back-to-Work Order (Senate):** Senate spends 1 action + 2 PC. Stability +1, Senate +1 VP. President popularity -1 (unpopular move).

**Failure:** Stability -1. House and Senate each lose 1 VP.

---

#### 5. Housing Market Crash
**Category:** Domestic / Economic | **Severity:** ⭐⭐⭐ | **Deadline:** 3 rounds
**Flavor:** *"Home values have plummeted 30% in six months. Foreclosures are soaring and banks are teetering."*

**Resolution Options:**
- **A) Bank Bailout (President + Senate):** President spends 1 action + 2 popularity, Senate spends 1 action + 2 PC. Stability +2. President +3 VP, Senate +3 VP.
- **B) Homeowner Relief Act (House):** House spends 2 actions. Stability +1, House +4 VP. Current bill popularity +3.
- **C) Let the Market Correct (No action needed):** Any player spends 1 action to "declare non-intervention." Stability +0. The resolving player gains +2 VP but all others lose 1 VP.

**Failure:** Stability -3. All players lose 3 VP.

**Special Action (Senate):** *"Emergency Hearing"* — 1 action, gain +3 PC. Does not resolve event.

---

#### 6. Wildfire Season Emergency
**Category:** Domestic / Natural | **Severity:** ⭐⭐ | **Deadline:** 1 round
**Flavor:** *"Unprecedented wildfires are consuming western states. Tens of thousands have evacuated."*

**Resolution Options:**
- **A) Deploy Federal Resources (President):** President spends 1 action + 1 popularity. Stability +1, President +2 VP.
- **B) Emergency Appropriations (House + Senate):** Both spend 1 action each. Stability +2. House +1 VP, Senate +1 VP.

**Failure:** Stability -2. President popularity -3.

---

#### 7. Veterans Affairs Scandal
**Category:** Domestic | **Severity:** ⭐ | **Deadline:** 2 rounds
**Flavor:** *"Whistle-blowers reveal systematic neglect at VA hospitals. Veterans groups demand accountability."*

**Resolution Options:**
- **A) Congressional Investigation (House):** House spends 1 action. Stability +1. House +2 VP. President popularity -1.
- **B) Executive Overhaul (President):** President spends 1 action + 1 popularity. Stability +1, President +2 VP.
- **C) Judicial Review of VA Policies (Supreme Court):** SC spends 1 action. Stability +1, SC +1 VP, +1 JP.

**Failure:** Stability -1. President popularity -2.

---

#### 8. Water Contamination Crisis
**Category:** Domestic / Natural | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"Lead contamination in a major city's water supply has poisoned thousands. National outrage builds."*

**Resolution Options:**
- **A) Federal Cleanup Fund (House + President):** House spends 1 action + 1 PC, President spends 1 action. Stability +2. House +2 VP, President +2 VP.
- **B) Sue Responsible Parties (Supreme Court):** SC spends 1 action + 1 JP. Roll d20: 8+. Stability +1, SC +3 VP. Fail: SC +1 VP, no stability.
- **C) Senate Emergency Committee (Senate):** Senate spends 1 action. Stability +1, Senate +2 VP.

**Failure:** Stability -2. All players lose 1 VP.

---

#### 9. Mass Shooting Response
**Category:** Domestic / Social | **Severity:** ⭐⭐ | **Deadline:** 1 round
**Flavor:** *"A devastating mass shooting dominates the news cycle. The country grieves and demands leadership."*

**Resolution Options:**
- **A) Presidential Address + Gun Reform Push (President):** President spends 1 action. Stability +1, President +2 VP, popularity +1. A special Gun Reform bill (Part: 14, Pop: 16, Leg: 10) replaces current bill.
- **B) Moment of Silence + Hearing (House):** House spends 1 action. Stability +1, House +1 VP, +2 PC.
- **C) Constitutional Analysis (Supreme Court):** SC spends 1 action. Stability +1, SC +1 VP. All active bills legality +2.

**Failure:** Stability -2. President popularity -2.

---

#### 10. Census Controversy
**Category:** Domestic | **Severity:** ⭐ | **Deadline:** 3 rounds
**Flavor:** *"Allegations of census manipulation threaten the legitimacy of upcoming redistricting."*

**Resolution Options:**
- **A) Independent Commission (Senate):** Senate spends 1 action. Stability +1, Senate +2 VP.
- **B) Court Oversight (Supreme Court):** SC spends 1 action. Stability +1, SC +1 VP, +1 JP.
- **C) Executive Order for Transparency (President):** President spends 1 action. Stability +1, President +1 VP, popularity +1.

**Failure:** Stability -1. House composition shifts 10 seats toward the minority party.

---

### FOREIGN AFFAIRS EVENTS (11–20)

---

#### 11. Border Crisis Escalation
**Category:** Foreign | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"A surge of migrants overwhelms border facilities. Humanitarian conditions deteriorate rapidly."*

**Resolution Options:**
- **A) Emergency Border Funding (House + Senate):** Both spend 1 action each. Stability +1. House +2 VP, Senate +2 VP.
- **B) Executive Action on Immigration (President):** President spends 1 action. Uses 1 executive order slot. Stability +1, President +2 VP. Popularity shifts: +2 if conservative bill on floor, -2 if liberal.
- **C) Court-Ordered Humanitarian Standards (Supreme Court):** SC spends 1 action + 1 JP. Stability +1, SC +2 VP. President popularity -1.

**Failure:** Stability -2. President popularity -3.

---

#### 12. Foreign Military Conflict
**Category:** Foreign / Security | **Severity:** ⭐⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"A hostile nation has attacked a U.S. ally. The world watches for America's response."*

**Resolution Options:**
- **A) Authorize Military Force (President + Senate):** President spends 1 action + 2 popularity, Senate spends 1 action + 2 PC. Stability +2. President +4 VP, Senate +2 VP.
- **B) Diplomatic Resolution (President):** President spends 2 actions. Roll d20: 12+ succeeds. Stability +2, President +5 VP, popularity +2. Fail: Stability -1, popularity -2.
- **C) Congressional Debate (House + Senate):** Both spend 1 action each. Stability +1. House +1 VP, Senate +1 VP. Delays but doesn't fully resolve — extends deadline by 1 round (can only be used once).

**Failure:** Stability -3. President popularity -4. All players lose 2 VP.

**Special Action (President):** *"War Room Briefing"* — Free action. Gain +2 popularity. Can only be used once during this event.

---

#### 13. Trade War Eruption
**Category:** Foreign / Economic | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"Retaliatory tariffs between the U.S. and a major trade partner are hammering the economy."*

**Resolution Options:**
- **A) Trade Deal Negotiation (President):** President spends 1 action + 1 popularity. Stability +1, President +3 VP.
- **B) Tariff Relief Bill (House):** House spends 1 action. Current bill partisanship shifts 2 toward center (toward 10). Stability +1, House +2 VP.
- **C) Economic Stimulus Package (Senate):** Senate spends 1 action + 2 PC. Stability +1, Senate +2 VP. All players gain +1 VP.

**Failure:** Stability -2. All bill popularity -3 (economy suffering).

---

#### 14. International Climate Summit
**Category:** Foreign | **Severity:** ⭐ | **Deadline:** 3 rounds
**Flavor:** *"A landmark global climate summit is convening. U.S. participation — or absence — will shape the outcome."*

**Resolution Options:**
- **A) Full Participation (President + House):** President spends 1 action, House spends 1 action. Stability +2. President +2 VP, House +2 VP. Popularity +1.
- **B) Observer Status (President):** President spends 1 action. Stability +1. President +1 VP. No popularity change.
- **C) Boycott + Domestic Focus (Senate):** Senate spends 1 action. Stability +0. Senate +2 VP. President popularity -1. (Resolves event but no stability gain.)

**Failure:** Stability -1. President popularity -1.

---

#### 15. Hostage Crisis Abroad
**Category:** Foreign / Security | **Severity:** ⭐⭐⭐ | **Deadline:** 1 round
**Flavor:** *"American citizens are being held hostage by a militant group overseas. Every hour counts."*

**Resolution Options:**
- **A) Special Operations Rescue (President):** President spends 2 actions + 2 popularity. Roll d20: 10+ succeeds. Success: Stability +2, President +5 VP, popularity +3. Failure: Stability -1, President -2 VP, popularity -3.
- **B) Diplomatic Negotiation (President + Senate):** President spends 1 action, Senate spends 1 action + 2 PC. Stability +1. President +2 VP, Senate +2 VP. No roll needed.

**Failure:** Stability -3. President popularity -5, President -3 VP.

---

#### 16. Cyber Attack on Allies
**Category:** Foreign / Security | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"A massive state-sponsored cyber attack has crippled allied nations' infrastructure. They're requesting U.S. aid."*

**Resolution Options:**
- **A) Joint Cyber Defense Initiative (President + House):** President spends 1 action, House spends 1 action + 1 PC. Stability +2. President +2 VP, House +2 VP.
- **B) Sanctions Response (Senate):** Senate spends 1 action. Stability +1. Senate +2 VP.
- **C) Formal Court Jurisdiction Claim (Supreme Court):** SC spends 1 action + 2 JP. Stability +1. SC +2 VP. All bills legality +1.

**Failure:** Stability -2. All players lose 1 VP.

---

#### 17. UN Resolution Controversy
**Category:** Foreign | **Severity:** ⭐ | **Deadline:** 2 rounds
**Flavor:** *"A controversial UN resolution demands a U.S. response. Allies and opponents alike watch closely."*

**Resolution Options:**
- **A) Support the Resolution (President):** President spends 1 action. Stability +1. President +2 VP. Popularity +1 if liberal bill on floor, -1 if conservative.
- **B) Veto at the UN (President):** President spends 1 action. Stability +1. President +1 VP. Popularity +1 if conservative bill on floor, -1 if liberal.
- **C) Senate Foreign Relations Hearing (Senate):** Senate spends 1 action. Stability +1. Senate +2 VP, +2 PC.

**Failure:** Stability -1. President popularity -2.

---

#### 18. Refugee Crisis
**Category:** Foreign / Social | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"A humanitarian catastrophe has displaced millions. Pressure mounts on the U.S. to accept refugees."*

**Resolution Options:**
- **A) Open Borders Response (President + House):** President spends 1 action + 1 popularity, House spends 1 action. Stability +2. President +2 VP, House +2 VP. Bill popularity on floor +3.
- **B) Humanitarian Aid Only (Senate):** Senate spends 1 action + 1 PC. Stability +1. Senate +2 VP.
- **C) Legal Framework Review (Supreme Court):** SC spends 1 action. Stability +1. SC +1 VP, +1 JP.

**Failure:** Stability -2. All bill popularity -2.

---

#### 19. Embassy Attack
**Category:** Foreign / Security | **Severity:** ⭐⭐ | **Deadline:** 1 round
**Flavor:** *"A U.S. embassy has been attacked. Staff are sheltering in place and the world demands a response."*

**Resolution Options:**
- **A) Military Response (President):** President spends 1 action + 2 popularity. Stability +1. President +3 VP.
- **B) Diplomatic De-escalation (President + Senate):** President spends 1 action, Senate spends 1 action. Stability +2. President +1 VP, Senate +2 VP. Popularity +1.

**Failure:** Stability -2. President popularity -4, President -2 VP.

---

#### 20. Nuclear Proliferation Threat
**Category:** Foreign / Security | **Severity:** ⭐⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"Intelligence confirms a rogue state is months away from a nuclear weapon. The clock is ticking."*

**Resolution Options:**
- **A) Preemptive Sanctions (President + Senate):** President spends 1 action, Senate spends 1 action + 2 PC. Stability +1. President +2 VP, Senate +2 VP.
- **B) Military Strike Authorization (President + House + Senate):** All three spend 1 action each. Roll d20: 12+. Success: Stability +2, each gets +3 VP. Fail: Stability -1, President popularity -3.
- **C) International Tribunal Referral (Supreme Court):** SC spends 1 action + 2 JP. Stability +1. SC +3 VP. Extends deadline +1 round if not resolved.

**Failure:** Stability -3. All players lose 3 VP. Permanent: all future bills legality -1.

**Special Action (Senate):** *"Intelligence Briefing"* — Free action. Grants the Military Strike option -2 to its roll threshold (10+ instead of 12+). Can only be used once.

---

### CONSTITUTIONAL / POLITICAL EVENTS (21–30)

---

#### 21. Impeachment Scandal Erupts
**Category:** Constitutional | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"Bombshell evidence of presidential misconduct dominates every news cycle. Congress must respond."*

**Resolution Options:**
- **A) Formal Investigation (House):** House spends 1 action + 2 PC. Stability +1. House +3 VP. President popularity -3.
- **B) Presidential Transparency (President):** President spends 1 action + 3 popularity. Stability +2. President +1 VP. (Takes the hit voluntarily.)
- **C) Judicial Inquiry (Supreme Court):** SC spends 1 action + 1 JP. Stability +1. SC +2 VP. President popularity -1.

**Failure:** Stability -2. President popularity -4.

**Special Action (President):** *"Release Documents"* — 1 action. Popularity -2 but extends deadline by 1 round.

---

#### 22. Supreme Court Vacancy Crisis
**Category:** Constitutional | **Severity:** ⭐⭐ | **Deadline:** 3 rounds
**Flavor:** *"A justice has unexpectedly passed away. The balance of the court hangs in the balance, and the public demands a swift replacement."*

**Resolution Options:**
- **A) Bipartisan Nomination (President + Senate):** President nominates (1 action), Senate confirms (1 action). The nominated justice must be moderate. Stability +2. President +2 VP, Senate +2 VP.
- **B) Partisan Push (President):** President nominates any leaning (1 action). Senate must still confirm separately. Stability +1 on confirmation. President +2 VP. If Senate rejects, event continues.
- **C) Court Self-Governance (Supreme Court):** SC spends 1 action + 2 JP. SC chooses the replacement leaning. Stability +1. SC +2 VP.

**Failure:** Stability -2. SC loses 2 VP. A random-leaning justice is appointed.

**Effect on game state:** Actually creates a justice vacancy (removes a random justice) when the event triggers.

---

#### 23. Constitutional Convention Call
**Category:** Constitutional | **Severity:** ⭐⭐⭐ | **Deadline:** 3 rounds
**Flavor:** *"34 states have called for a constitutional convention. The foundations of governance are being questioned."*

**Resolution Options:**
- **A) Embrace the Convention (All 4 players):** Each player spends 1 action. Stability +2. Each player gains +2 VP. All bill legality resets to 12.
- **B) Congressional Override (House + Senate):** Both spend 2 actions each + 2 PC each. Stability +1. House +3 VP, Senate +3 VP.
- **C) Judicial Injunction (Supreme Court):** SC spends 2 actions + 4 JP. Roll d20: 14+. Success: Stability +2, SC +5 VP. Fail: Stability -1.

**Failure:** Stability -3. All bill legality permanently -3. All players lose 2 VP.

---

#### 24. Voter Suppression Allegations
**Category:** Constitutional | **Severity:** ⭐ | **Deadline:** 2 rounds
**Flavor:** *"Reports of systematic voter suppression in multiple states have sparked protests and legal challenges."*

**Resolution Options:**
- **A) Voting Rights Legislation (House):** House spends 1 action. Stability +1. House +2 VP. Senate composition shifts 4 seats toward Democrats.
- **B) DOJ Investigation (President):** President spends 1 action. Stability +1. President +1 VP, popularity +1.
- **C) Court Ruling (Supreme Court):** SC spends 1 action. Stability +1. SC +2 VP, +1 JP. House composition shifts 5 seats toward majority.

**Failure:** Stability -1. Next election results are more volatile (double the swing).

---

#### 25. Executive Overreach Backlash
**Category:** Constitutional | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"The President's recent actions have been called unconstitutional by legal scholars. Both chambers are pushing back."*

**Triggers only if:** President has used 3+ executive orders total.

**Resolution Options:**
- **A) Presidential Restraint (President):** President spends 1 action + 2 popularity. President loses 1 executive order slot for the rest of the game. Stability +2. President +1 VP.
- **B) Congressional Censure (House + Senate):** Both spend 1 action each. Stability +1. House +2 VP, Senate +2 VP. President popularity -2.
- **C) Judicial Check (Supreme Court):** SC spends 1 action. Stability +1. SC +2 VP, +1 JP. President's next executive order costs +1 additional popularity.

**Failure:** Stability -2. President popularity -3. SC gains +2 VP.

---

#### 26. State vs. Federal Conflict
**Category:** Constitutional | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"Several states are openly defying a federal mandate. The constitutional balance of power is being tested."*

**Resolution Options:**
- **A) Federal Enforcement (President):** President spends 1 action + 2 popularity. Stability +1. President +2 VP.
- **B) Compromise Legislation (House + Senate):** Both spend 1 action each. Stability +2. House +1 VP, Senate +1 VP. +2 PC to each.
- **C) Constitutional Ruling (Supreme Court):** SC spends 1 action + 2 JP. Stability +1. SC +3 VP. All bills legality +2.

**Failure:** Stability -2. Random: House OR Senate lose 3 PC.

---

#### 27. Filibuster Reform Pressure
**Category:** Constitutional | **Severity:** ⭐ | **Deadline:** 2 rounds
**Flavor:** *"Public frustration with legislative gridlock has reached a fever pitch. Calls to reform the filibuster dominate the news."*

**Resolution Options:**
- **A) Reform the Filibuster (Senate):** Senate spends 1 action + 3 PC. Stability +1. Senate +2 VP. For the rest of the game, filibuster costs 6 PC instead of 4.
- **B) Defend Tradition (Senate):** Senate spends 1 action. Stability +1. Senate +1 VP. Senate gains +3 PC.
- **C) Presidential Pressure (President):** President spends 1 action. Stability +1. President +1 VP, popularity +1.

**Failure:** Stability -1. Senate loses 2 PC.

---

#### 28. Electoral College Controversy
**Category:** Constitutional | **Severity:** ⭐⭐ | **Deadline:** 3 rounds
**Flavor:** *"A disputed election result has reignited debate over the Electoral College. Protests and counter-protests grow."*

**Resolution Options:**
- **A) Accept the Results (President):** President spends 1 action. Stability +1. President +1 VP. Popularity: roll d20, 10+ means +2, under 10 means -2.
- **B) Congressional Certification (House + Senate):** Both spend 1 action each. Stability +2. House +1 VP, Senate +1 VP.
- **C) Supreme Court Ruling (Supreme Court):** SC spends 1 action + 2 JP. Stability +2. SC +3 VP. President popularity ±0.

**Failure:** Stability -2. Next presidential election is automatically lost by incumbent.

---

#### 29. Freedom of Press Crisis
**Category:** Constitutional | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"The arrest of several journalists has triggered a First Amendment crisis. Media organizations are in uproar."*

**Resolution Options:**
- **A) Release and Apologize (President):** President spends 1 action + 1 popularity. Stability +2. President +1 VP.
- **B) Congressional Hearing (House):** House spends 1 action. Stability +1. House +2 VP. President popularity -2.
- **C) First Amendment Ruling (Supreme Court):** SC spends 1 action. Stability +1. SC +2 VP, +1 JP. President popularity -1.

**Failure:** Stability -2. President popularity -3. All players lose 1 VP.

---

#### 30. Secession Threat
**Category:** Constitutional | **Severity:** ⭐⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"A coalition of states has formally threatened secession over federal policies. The union itself is at stake."*

**Resolution Options:**
- **A) National Address + Concessions (President):** President spends 2 actions + 3 popularity. Stability +2. President +3 VP.
- **B) Unity Resolution (All 4 players):** Each player spends 1 action. Stability +2. Each player gains +1 VP. All current bill stats shift 2 toward center (partisanship toward 10).
- **C) Federal Court Injunction (Supreme Court):** SC spends 2 actions + 4 JP. Stability +1. SC +4 VP. Senate and House each lose 2 PC.

**Failure:** Stability -3. All players lose 3 VP. Permanent: one random faction in House loses 10 seats.

---

### ECONOMIC EVENTS (31–38)

---

#### 31. Stock Market Crash
**Category:** Economic | **Severity:** ⭐⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"The markets have plummeted 30% in a week. Panic selling continues and retirement accounts are devastated."*

**Resolution Options:**
- **A) Emergency Stimulus (President + House + Senate):** All three spend 1 action each. Stability +2. Each gets +2 VP. President popularity +1.
- **B) Fed Intervention Pressure (President):** President spends 1 action + 2 popularity. Stability +1. President +3 VP.
- **C) Financial Regulation (Supreme Court + Senate):** SC spends 1 action + 2 JP, Senate spends 1 action. Stability +1. SC +2 VP, Senate +2 VP. All bills legality +2.

**Failure:** Stability -3. All players lose 3 VP. All bill popularity -3.

**Special Action (House):** *"Emergency Committee"* — 1 action, +4 PC. Doesn't resolve event.

---

#### 32. National Debt Crisis
**Category:** Economic | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"The national debt has hit an unsustainable threshold. Credit agencies are threatening a downgrade."*

**Resolution Options:**
- **A) Bipartisan Budget Deal (House + Senate):** Both spend 1 action each + 1 PC each. Stability +2. House +2 VP, Senate +2 VP.
- **B) Spending Freeze Executive Order (President):** President spends 1 action. Uses 1 EO slot. Stability +1. President +2 VP. Popularity -1.
- **C) Debt Ceiling Ruling (Supreme Court):** SC spends 1 action. Stability +1. SC +1 VP, +1 JP.

**Failure:** Stability -2. All players lose 2 VP.

---

#### 33. Energy Crisis
**Category:** Economic | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"Gas prices have tripled overnight. Rolling blackouts hit major cities. Citizens are furious."*

**Resolution Options:**
- **A) Release Strategic Reserves (President):** President spends 1 action + 1 popularity. Stability +1. President +2 VP.
- **B) Energy Bill Fast-Track (House + Senate):** Both spend 1 action each. Stability +2. House +2 VP, Senate +2 VP. A new bill (Part: 10, Pop: 14, Leg: 12) goes to floor.
- **C) Price Gouging Investigation (Supreme Court):** SC spends 1 action + 1 JP. Roll d20: 8+. Stability +1. SC +2 VP. Fail: no resolution.

**Failure:** Stability -2. President popularity -3. All bill popularity -2.

---

#### 34. Labor Union Showdown
**Category:** Economic / Social | **Severity:** ⭐ | **Deadline:** 2 rounds
**Flavor:** *"Major unions across critical industries have authorized a general strike. Supply chains are grinding to a halt."*

**Resolution Options:**
- **A) Pro-Labor Legislation (House):** House spends 1 action. Stability +1. House +2 VP. Senate loses 1 PC.
- **B) Presidential Mediation (President):** President spends 1 action. Roll d20: 10+. Stability +1, President +2 VP, popularity +1. Fail: popularity -1.
- **C) National Labor Relations Ruling (Supreme Court):** SC spends 1 action. Stability +1. SC +1 VP, +1 JP.

**Failure:** Stability -1. All bill popularity -2.

---

#### 35. Tech Monopoly Concerns
**Category:** Economic | **Severity:** ⭐ | **Deadline:** 3 rounds
**Flavor:** *"Big tech companies control 80% of digital markets. Calls for antitrust action grow louder daily."*

**Resolution Options:**
- **A) Antitrust Legislation (House + Senate):** Both spend 1 action each. Stability +1. House +2 VP, Senate +2 VP.
- **B) Executive Antitrust Action (President):** President spends 1 action. Stability +1. President +2 VP.
- **C) Supreme Court Antitrust Ruling (Supreme Court):** SC spends 1 action + 2 JP. Stability +1. SC +3 VP.

**Failure:** Stability -1. All players lose 1 VP.

---

#### 36. Inflation Surge
**Category:** Economic | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"Inflation has hit 12% — the highest in decades. Grocery prices and rent are squeezing families nationwide."*

**Resolution Options:**
- **A) Interest Rate Pressure (President):** President spends 1 action + 2 popularity. Stability +1. President +2 VP.
- **B) Cost of Living Relief Act (House):** House spends 1 action + 2 PC. Stability +1. House +3 VP.
- **C) Price Control Debate (Senate):** Senate spends 1 action + 2 PC. Stability +1. Senate +2 VP. All bill popularity +2.

**Failure:** Stability -2. President popularity -2. All players lose 1 VP.

---

#### 37. Banking System Failure
**Category:** Economic | **Severity:** ⭐⭐⭐ | **Deadline:** 1 round
**Flavor:** *"Three major banks have failed simultaneously. Depositors are lined up around the block."*

**Resolution Options:**
- **A) Federal Deposit Guarantee (President + Senate):** President spends 1 action + 2 popularity, Senate spends 1 action + 2 PC. Stability +2. President +3 VP, Senate +3 VP.
- **B) Emergency Nationalization (House):** House spends 2 actions + 3 PC. Stability +1. House +4 VP. President popularity -2.

**Failure:** Stability -3. All players lose 4 VP. All bill legality -2.

---

#### 38. Cryptocurrency Regulation Demand
**Category:** Economic | **Severity:** ⭐ | **Deadline:** 3 rounds
**Flavor:** *"A major crypto exchange collapse has wiped out billions in savings. Calls for regulation are universal."*

**Resolution Options:**
- **A) Regulatory Framework Bill (House):** House spends 1 action. Stability +1. House +2 VP. Current bill legality +2.
- **B) SEC Enforcement Order (President):** President spends 1 action. Stability +1. President +1 VP.
- **C) Constitutional Ruling on Digital Assets (Supreme Court):** SC spends 1 action + 1 JP. Stability +1. SC +2 VP. All bills legality +1.

**Failure:** Stability -1. All players lose 1 VP.

---

### SOCIAL / CULTURAL EVENTS (39–44)

---

#### 39. Nationwide Protests
**Category:** Social | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"Massive protests have erupted in every major city. Property damage mounts and tensions between police and civilians escalate."*

**Resolution Options:**
- **A) National Guard Deployment (President):** President spends 1 action + 2 popularity. Stability +1. President +2 VP. Popularity ±0 (already spent). House loses 2 PC.
- **B) Reform Legislation (House + Senate):** Both spend 1 action each. Stability +2. House +2 VP, Senate +2 VP. President popularity +1.
- **C) Civil Rights Ruling (Supreme Court):** SC spends 1 action + 2 JP. Stability +1. SC +3 VP. President popularity +1.

**Failure:** Stability -2. All players lose 2 VP. President popularity -3.

---

#### 40. Public Health Emergency
**Category:** Social | **Severity:** ⭐⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"A new infectious disease is spreading rapidly. Hospitals are overwhelmed and fear is rising."*

**Resolution Options:**
- **A) Federal Emergency Declaration (President + House):** President spends 1 action + 2 popularity, House spends 1 action + 2 PC. Stability +2. President +3 VP, House +3 VP.
- **B) Emergency Funding (Senate):** Senate spends 2 actions + 3 PC. Stability +1. Senate +4 VP.
- **C) Public Health Mandate Ruling (Supreme Court):** SC spends 1 action + 2 JP. Stability +1. SC +2 VP. Roll d20: 14+ gives extra +1 stability.

**Failure:** Stability -3. All players lose 3 VP. President popularity -3. Permanent: all players lose 1 action per round for 2 rounds.

**Special Action (President):** *"National Address on Health"* — Free action. Popularity +2. Does not resolve event.

---

#### 41. Education System Crisis
**Category:** Social | **Severity:** ⭐ | **Deadline:** 3 rounds
**Flavor:** *"National test scores have plummeted to historic lows. Parents and educators blame politicians."*

**Resolution Options:**
- **A) Education Reform Bill (House):** House spends 1 action. A special Education bill (Part: 10, Pop: 14, Leg: 14) appears. If passed, Stability +2, House +3 VP. Otherwise Stability +1, House +1 VP.
- **B) Executive Education Initiative (President):** President spends 1 action + 1 popularity. Stability +1. President +2 VP.
- **C) State Funding Ruling (Supreme Court):** SC spends 1 action. Stability +1. SC +1 VP, +1 JP.

**Failure:** Stability -1. House and Senate each lose 1 VP.

---

#### 42. Social Media Disinformation Wave
**Category:** Social / Security | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"Foreign-backed disinformation campaigns are destabilizing public discourse. Trust in institutions is cratering."*

**Resolution Options:**
- **A) Tech Regulation (House + Senate):** Both spend 1 action each. Stability +2. House +1 VP, Senate +1 VP.
- **B) Intelligence Community Exposure (President):** President spends 1 action. Stability +1. President +2 VP. Popularity +1.
- **C) First Amendment Analysis (Supreme Court):** SC spends 1 action + 1 JP. Stability +1. SC +2 VP.

**Failure:** Stability -2. President popularity -2. Next election results are more volatile.

---

#### 43. Racial Justice Reckoning
**Category:** Social | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"A high-profile incident of racial injustice has ignited a national conversation. Leaders from all sides are under pressure."*

**Resolution Options:**
- **A) Civil Rights Legislation (House + Senate):** Both spend 1 action each. Stability +2. House +2 VP, Senate +2 VP.
- **B) Presidential Commission (President):** President spends 1 action + 1 popularity. Stability +1. President +2 VP.
- **C) Equal Protection Ruling (Supreme Court):** SC spends 1 action + 2 JP. Stability +1. SC +3 VP. All bill legality +1.

**Failure:** Stability -2. All players lose 1 VP. President popularity -2.

---

#### 44. Religious Freedom vs. Civil Rights Clash
**Category:** Social / Constitutional | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"A landmark case pitting religious liberty against civil rights protections has divided the nation."*

**Resolution Options:**
- **A) Compromise Legislation (House + Senate):** Both spend 1 action each. Stability +1. House +2 VP, Senate +2 VP. Bill partisanship shifts 1 toward center.
- **B) Executive Guidance (President):** President spends 1 action. Stability +1. President +1 VP. Popularity: +2 if aligned with court majority, -2 otherwise.
- **C) Landmark Ruling (Supreme Court):** SC spends 1 action + 3 JP. Stability +2. SC +4 VP. The ruling is binding — all current bill legality shifts +3 or -3 (SC chooses).

**Failure:** Stability -2. All bill legality -2.

---

### SECURITY / EMERGENCY EVENTS (45–50)

---

#### 45. Domestic Terrorism Threat
**Category:** Security | **Severity:** ⭐⭐⭐ | **Deadline:** 1 round
**Flavor:** *"Credible intelligence warns of an imminent domestic terror attack. The nation is on high alert."*

**Resolution Options:**
- **A) Counterterrorism Operation (President):** President spends 2 actions + 1 popularity. Roll d20: 8+ prevents attack. Success: Stability +2, President +4 VP, popularity +2. Fail: Stability -1, attack happens anyway.
- **B) Emergency Session (House + Senate):** Both spend 1 action each. Stability +1. House +1 VP, Senate +1 VP. Extends deadline +1 round.
- **C) Emergency Court Authorization (Supreme Court):** SC spends 1 action + 2 JP. Gives President's counterterrorism roll +4 bonus (or auto-succeeds if threshold already met). SC +2 VP.

**Failure:** Stability -3. All players lose 2 VP. President popularity -4.

**Special Action (President):** *"Raise Threat Level"* — Free action. All other resolution options get -2 to their roll thresholds. Can only be used once.

---

#### 46. Major Data Breach
**Category:** Security | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"A massive breach has exposed the personal data of 100 million Americans. Outrage and fear spread."*

**Resolution Options:**
- **A) Data Protection Act (House):** House spends 1 action. Stability +1. House +2 VP. Current bill legality +2.
- **B) Executive Cybersecurity Order (President):** President spends 1 action. Uses 1 EO slot. Stability +1. President +2 VP.
- **C) Privacy Rights Ruling (Supreme Court):** SC spends 1 action + 1 JP. Stability +1. SC +2 VP.
- **D) Senate Investigation (Senate):** Senate spends 1 action. Stability +1. Senate +2 VP, +2 PC.

**Failure:** Stability -2. All players lose 1 VP.

---

#### 47. Nuclear Plant Emergency
**Category:** Security / Natural | **Severity:** ⭐⭐⭐ | **Deadline:** 1 round
**Flavor:** *"A nuclear reactor is experiencing a partial meltdown. Evacuations are underway but time is critical."*

**Resolution Options:**
- **A) Federal Emergency Response (President):** President spends 2 actions + 2 popularity. Stability +2. President +4 VP.
- **B) Emergency Funding (House + Senate):** Both spend 1 action each + 1 PC each. Stability +2. House +2 VP, Senate +2 VP.

**Failure:** Stability -3. All players lose 3 VP. President popularity -4. Permanent: stability max reduced to 9.

---

#### 48. Election Interference Discovery
**Category:** Security / Constitutional | **Severity:** ⭐⭐ | **Deadline:** 2 rounds
**Flavor:** *"Evidence of foreign interference in U.S. elections has been confirmed. The legitimacy of recent results is in question."*

**Resolution Options:**
- **A) Special Counsel Appointment (President):** President spends 1 action + 1 popularity. Stability +1. President +2 VP.
- **B) Congressional Investigation (House + Senate):** Both spend 1 action each. Stability +2. House +2 VP, Senate +2 VP.
- **C) Emergency Election Ruling (Supreme Court):** SC spends 1 action + 2 JP. Stability +1. SC +3 VP. Next election results are stabilized (reduced swing).

**Failure:** Stability -2. Next election results doubled in volatility. All players lose 1 VP.

---

#### 49. Assassination Attempt
**Category:** Security | **Severity:** ⭐⭐⭐ | **Deadline:** 1 round
**Flavor:** *"An assassination attempt on a major political figure has shocked the nation. The country demands unity."*

**Resolution Options:**
- **A) National Unity Address (President):** President spends 1 action. Stability +2. President +2 VP, popularity +3. All other players gain +1 VP.
- **B) Security Overhaul (House + Senate + Supreme Court):** Each spends 1 action. Stability +2. Each gains +1 VP. All bill legality +2.

**Failure:** Stability -3. All players lose 2 VP. President popularity -3.

**Special Action (All players):** *"Moment of Unity"* — Any player can use 1 action. +1 VP to all players, does not resolve event but adds +1 to stability reward when resolved.

---

#### 50. Pandemic Response Failure
**Category:** Security / Social | **Severity:** ⭐⭐⭐ | **Deadline:** 3 rounds
**Flavor:** *"The government's response to a growing pandemic has been widely criticized as inadequate. Cases are surging and public trust has collapsed."*

**Resolution Options:**
- **A) Comprehensive Federal Response (President + House + Senate):** All three spend 1 action each + President spends 2 popularity, House spends 2 PC, Senate spends 2 PC. Stability +2. Each gains +3 VP.
- **B) Emergency Health Powers (President):** President spends 2 actions + 3 popularity. Stability +1. President +4 VP.
- **C) Public Health Mandate Review (Supreme Court):** SC spends 1 action + 3 JP. Stability +1. SC +3 VP. Roll d20: 15+ gives +1 additional stability.
- **D) State-by-State Approach (Senate):** Senate spends 1 action. Stability +0 (event resolved but no stability gain). Senate +2 VP. President popularity -2.

**Failure:** Stability -3. All players lose 4 VP. President popularity -4. Permanent: all players have 3 actions per round for the next 2 rounds.

**Special Action (House):** *"Emergency Appropriations Committee"* — 1 action, +3 PC to House and +2 PC to Senate. Does not resolve event.
**Special Action (Supreme Court):** *"Emergency Session"* — Free action, +1 JP. Does not resolve event.

---

## Implementation Design Notes

### Event Timing
- Events are checked at the **start of each round**, after `endRound()` processes
- An event drawn is immediately displayed to all players
- Deadline countdown starts the round it appears (e.g., deadline 2 = this round + next round)

### Event Data Structure
```javascript
{
    id: 'stockMarketCrash',
    name: 'Stock Market Crash',
    category: 'Economic',
    severity: 3,                    // 1=minor, 2=moderate, 3=major
    flavor: 'The markets have...',
    deadline: 2,                    // rounds to resolve
    roundTriggered: null,           // set when event activates
    resolved: false,
    failPenalty: { stability: -3, vp: { all: -3 }, popularity: 0, other: 'All bill popularity -3' },
    successReward: { stability: 2 },
    resolutions: [
        {
            id: 'emergencyStimulus',
            label: 'Emergency Stimulus',
            description: 'President, House, and Senate each spend 1 action',
            roles: ['president', 'house', 'senate'],   // all must act
            cooperative: true,                          // requires all listed roles
            cost: { actions: 1, vp: 0, pc: 0, popularity: 0, jp: 0 },
            reward: { vp: 2, popularity: 1 },           // per participating role
            rollRequired: false,
            agreedRoles: []                             // tracks who has committed
        },
        // ... more resolution options
    ],
    specialActions: [
        {
            id: 'emergencyCommittee',
            label: 'Emergency Committee',
            role: 'house',
            cost: { actions: 1 },
            effect: { pc: 4 },
            usesRemaining: 1,
            resolvesEvent: false
        }
    ],
    stateEffects: {                 // effects on trigger
        onTrigger: null,            // e.g., remove a justice, change bill stats
        onResolve: null,            // e.g., create special bill
        onFail: null                // e.g., permanent legality modifier
    }
}
```

### Engine Integration
- `state.stability` — new global field (starts at 5)
- `state.activeEvent` — currently active event object (or null)
- `state.queuedEvent` — next event waiting (or null)
- `state.eventHistory` — array of past event IDs (prevents repeats)
- `state.eventCooldown` — rounds since last event
- Events appear in `getAvailableActions()` as resolution/special actions for eligible roles
- `executeAction()` gets new cases for event resolution and special actions
- `endRound()` checks: decrement deadline, apply failure if expired, check for new event trigger
- Cooperative resolutions track which roles have committed via `agreedRoles[]`

### UI Integration
- **Event Banner**: Large, color-coded banner between bill card and composition bars
- Shows severity icon, name, flavor text, deadline countdown, and available resolution buttons
- Pending cooperative progress shown (e.g., "2/3 roles committed")
- **Stability Gauge**: In game header next to VP scoreboard, color-coded bar with numeric value
- **Event History**: Collapsed section in log panel showing past events and outcomes

### Stability Display
- Shown as a segmented bar (10 segments) with color gradient
- Current value displayed as number
- Pulses/flashes when at 2 or below
- Threshold labels shown (Prosperous/Stable/Unstable/Crisis)

### Balance Considerations
- Events should average ~1.5 stability loss on failure, ~1 stability gain on success
- With natural decay (-1 every 3 rounds), players must actively resolve events to survive
- In a 10-round game: ~4-5 events will trigger, ~3 stability lost to decay = players need to resolve most events
- In a 24-round game: ~10-12 events, ~8 stability decay = very challenging to survive
- Severity weighting: at stability 8+, 60% minor / 30% moderate / 10% major; at stability 3-, 10% minor / 30% moderate / 60% major
- Co-op resolutions give better stability but cost all participating players actions — creates interesting negotiation

### Multiplayer Interaction
- Event resolution options visible to all players
- Cooperative resolutions require each role to independently commit (like Constitutional Amendment)
- Players may strategically let events fail to hurt rivals (but risk collective loss)
- Special actions can be used to help other players set up their resolution
- Chat becomes critical for coordinating event responses

---

## Simulation: AI Negotiation & Trust System

*This section describes the negotiation, deception, and trust mechanics used exclusively by the simulation AI agents. This is NOT part of the game itself — it models realistic human negotiation behavior to produce more interesting simulation results.*

### Trust Model

Each AI agent maintains a **trust score** toward every other agent (4 agents × 3 trust scores each = 12 trust relationships).

| Field | Value |
|-------|-------|
| Initial trust | 5 (neutral) |
| Minimum | 0 (total distrust — never cooperate) |
| Maximum | 10 (full trust — always cooperate) |

```javascript
trust = {
    president:    { house: 5, senate: 5, supremeCourt: 5 },
    house:        { president: 5, senate: 5, supremeCourt: 5 },
    senate:       { president: 5, house: 5, supremeCourt: 5 },
    supremeCourt: { president: 5, house: 5, senate: 5 }
};
```

### Trust Adjustments

| Event | Trust Change |
|-------|-------------|
| Promise kept (cooperative action completed) | +1 to +2 |
| Promise broken (agreed to cooperate, then didn't) | -2 to -3 |
| Beneficial solo action toward another player | +1 |
| Hostile action toward another player (e.g., witchhunt, shutdown, impeach) | -1 to -2 |
| Veto of a bill another player worked to pass | -1 |
| Helped resolve event cooperatively | +1 |
| Let event fail when could have resolved it | -1 to all players |
| Lied about intent (said "will do X", did Y instead) | -2 |

### Negotiation Types

The simulation models these negotiation scenarios:

---

#### 1. Constitutional Amendment Proposals

**Situation:** A player proposes a Constitutional Amendment. They need President + House + Senate to all agree and spend 2 actions + 1 VP + 1 PC/Pop each.

**Negotiation flow:**
1. Proposer broadcasts intent: *"I'm proposing an amendment for [bill]. Will you agree?"*
2. Each needed player evaluates:
   - **Trust in proposer** — if < 3, refuse outright ("Can't trust you'll follow through")
   - **Self-interest** — is the amendment worth 2 actions + 1 VP + 1 PC/Pop to me?
   - **VP standings** — if proposer is winning, less likely to help them
   - **Stability pressure** — if stability is low, more willing to cooperate on anything

**Deception scenarios:**
- **Bait & Switch:** A player agrees to the amendment, causing the proposer to lock in their 2 actions and resources. Then the agreeing player spends their turn on something else instead. The proposer wasted resources. Trust in betrayer: -3.
- **Honest Decline:** A player openly refuses. No trust change (honest disagreement is fine).
- **Conditional Agreement:** "I'll agree if you advocate for my bill next round." If the condition is met, +2 trust. If not, -2 trust.

---

#### 2. Cooperative Event Resolution

**Situation:** An event requires 2–3 players to each spend an action to resolve it cooperatively (better stability reward than solo resolution).

**Negotiation flow:**
1. Any player proposes the cooperative path: *"Let's all take option A for +2 stability."*
2. Other players respond based on:
   - **Trust in proposer** — will they actually spend their action, or are they baiting?
   - **Alternative self-interest** — "I could solo-resolve this for +3 VP but only +1 stability"
   - **Stability urgency** — at stability ≤ 3, cooperation becomes nearly mandatory

**Deception scenarios:**
- **Free Rider:** Player says "I'll help" but then uses their action on something selfish, hoping the other cooperators still resolve it. If the event fails because of them: -3 trust from ALL players. If another player solo-resolves it: -2 trust from that player.
- **Selective Cooperation:** Player only cooperates with high-trust partners. If trust < 4, they solo-resolve or ignore the event.
- **Sacrifice Play:** A player with high VP lead offers to solo-resolve (even at personal cost) to build trust for future cooperation. +2 trust from all players.

---

#### 3. Bill Passage Coordination

**Situation:** Getting a bill fully passed requires House to pass, Senate to pass, and President to sign. These happen across different turns.

**Negotiation flow:**
1. When a bill is on the floor, House AI might say: *"This bill aligns with me. If I pass it, will Senate pass it too?"*
2. Senate evaluates: Does this bill align with me? Trust in House? What's the VP calculation?
3. President evaluates: Will I sign or veto? Is it worth promising to sign?

**Deception scenarios:**
- **Veto Trap:** President says "I'll sign it" to get House and Senate to spend actions passing it. Then vetoes. President denies VP to both chambers and gains a strategic advantage. Trust in President: -3 from both House and Senate.
- **Selective Passing:** Senate says "I'll pass it" but then filibusters or stalls instead. Trust in Senate: -2 from House.
- **Honest Signaling:** President says "I'll veto any bill below partisanship 12" and consistently follows through. Over time, trust +1 per kept signal. Other players learn to draft bills the President will actually sign.

---

#### 4. Justice Nomination Deals

**Situation:** President nominates a justice, Senate confirms/rejects, SC can disapprove.

**Negotiation flow:**
1. President: *"I'll nominate a moderate if Senate agrees to confirm."*
2. Senate evaluates: Trust in President? Will they actually pick moderate?
3. SC: *"I suggest liberal. If President ignores me, I'll spend future actions hurting them."*

**Deception scenarios:**
- **Bait Nomination:** President promises moderate, nominates partisan justice. Senate already committed an action to the confirmation round. Trust in President: -2 from Senate, -2 from SC.
- **SC Pressure Bluff:** SC threatens retaliation for ignoring their suggestion but doesn't actually follow through (because other actions are higher priority). If caught not retaliating: -1 trust (seen as empty threats).
- **Honest Compromise:** President genuinely picks moderate to maintain trust with multiple players. +1 trust from Senate and SC.

---

#### 5. Threat & Retaliation Negotiations

**Situation:** Players can threaten punitive actions (witchhunt, government shutdown, impeachment, investigate EO, etc.) to influence behavior.

**Negotiation flow:**
1. Senate to House: *"If you kill this bill, I'll government shutdown next round."*
2. House evaluates: Does Senate have the PC? Is their trust high enough to believe the threat? Do I care?

**Deception scenarios:**
- **Hollow Threat:** Senate threatens shutdown but doesn't have 6 PC. If House calls the bluff and Senate can't follow through, +1 trust for House toward Senate (predictable), but Senate's threat credibility drops.
- **Follow-Through:** Senate actually shuts down government after warning. Trust in Senate doesn't change much (they were honest about the threat), but relationship becomes adversarial.
- **Deterrence Lie:** SC says "I'll rule your next bill unconstitutional" to prevent House from passing a bill. SC actually can't (bill has high legality). If the bluff works, SC gains strategic position. If House calls it and SC can't deliver: -2 trust.

---

#### 6. VP Kingmaking Negotiations (Late Game)

**Situation:** In later rounds (7+), players start making deals about who should win or at least who should NOT win.

**Negotiation flow:**
1. Third-place player to fourth-place player: *"The leader has 50 VP. We need to stop them. I'll handle the bill, you hit their VP."*
2. Evaluation: Trust level? Does the deal actually help me or am I being used?

**Deception scenarios:**
- **False Alliance:** First-place player tells second-place: "Let's team up against third-place who's catching up." Actually just trying to distract second-place from targeting them. If second-place realizes: -3 trust.
- **Genuine Alliance:** Two players genuinely cooperate to check the leader. Mutual +1 trust per round of cooperation.
- **Backstab Timing:** Player cooperates for several rounds to build trust to 8+, then betrays at the critical moment (final round) for maximum VP swing. Devastating but effective strategy.

---

### AI Decision Framework for Negotiations

Each AI agent makes negotiation decisions using this formula:

```
willingness_to_cooperate = (
    trust_in_partner × 2
    + stability_urgency × 3          // higher when stability < 4
    + personal_benefit × 2           // VP/PC/Pop gained
    - personal_cost × 2              // actions/VP/PC lost
    - competitor_benefit × 1         // don't help the leader
    + relationship_investment × 1    // value of building long-term trust
) / 10

// Result: 0-10 scale
// 0-3: Refuse
// 4-5: Consider (50% chance, weighted by trust)
// 6-8: Agree and follow through
// 9-10: Eagerly agree
```

### Lying Decision Framework

Each AI decides whether to lie (agree but not follow through) using:

```
lie_probability = (
    personal_gain_from_lying × 3     // how much do I gain by betraying?
    - trust_of_partner_in_me × 1    // they'll lose trust in me
    - rounds_remaining × 0.5         // lying is cheaper late game
    - average_trust_toward_me × 0.5  // reputation damage
    + desperation × 2                // if losing badly, lie more
) / 10

// Result: probability 0.0 - 1.0
// Only lies if lie_probability > 0.4
// Players with trust < 2 toward them are less effective liars (no one believes them)
```

### Personality Archetypes

Each AI agent has a personality that biases their negotiation style:

| Role | Archetype | Traits |
|------|-----------|--------|
| President | **The Dealmaker** | Moderate liar (30% base lie rate). Makes lots of deals. Prioritizes popularity preservation. Will betray when popularity is high enough to absorb the trust hit. |
| House | **The Opportunist** | Low liar (15% base lie rate). Generally honest because they benefit most from steady bill passage cooperation. But will betray if VP gap is large. |
| Senate | **The Strategist** | Moderate liar (25% base lie rate). Uses threats effectively. Follows through on threats ~70% of the time. Values long-term positioning over short-term VP. |
| Supreme Court | **The Outsider** | High liar (40% base lie rate when desperate). Starts cooperative but becomes deceptive if falling behind. Most likely to make and break promises because SC has the fewest natural cooperative actions. |

### Negotiation Log Format

All negotiations are logged in the simulation output:

```
[NEGOTIATION] Round 3 | President → Senate: "Will you confirm a moderate justice?"
[RESPONSE] Senate → President: "Agreed" (trust: 6, sincerity: genuine)
[FOLLOW-UP] Round 3 | President nominated moderate justice (PROMISE KEPT)
[TRUST UPDATE] Senate trust in President: 6 → 7

[NEGOTIATION] Round 5 | House → Senate: "Let's cooperate on Emergency Stimulus event"
[RESPONSE] Senate → House: "Agreed" (trust: 5, sincerity: LYING — plans to filibuster instead)
[FOLLOW-UP] Round 5 | House spent action on event resolution, Senate filibustered bill instead
[BETRAYAL] Senate broke promise to House
[TRUST UPDATE] House trust in Senate: 5 → 2

[NEGOTIATION] Round 8 | SC → President: "If you sign this bill, I'll rule it constitutional"
[RESPONSE] President → SC: "Deal" (trust: 4, sincerity: genuine)
[FOLLOW-UP] Round 8 | President signed bill. SC ruled it UNCONSTITUTIONAL (PROMISE BROKEN)
[TRUST UPDATE] President trust in SC: 4 → 1
```

### Trust State Display (End of Each Round)

```
Trust Matrix (Round 5):
                    Pres  House  Sen   SC
President trusts:    —      7     4     3
House trusts:        6      —     2     5
Senate trusts:       5      3     —     6
SC trusts:           3      4     7     —

Active Promises: 
  - House → Senate: "Will pass Trade bill" (made Round 4) — PENDING
  - SC → President: "Won't review next bill" (made Round 5) — PENDING
```

### Implementation Notes for Simulation

1. **Promise Tracking:** Maintain an array of `pendingPromises` with `{ from, to, action, round, fulfilled: null }`
2. **Negotiation Phase:** Before each AI's action selection, run a negotiation check:
   - Are there cooperative actions available (events, amendments)?
   - Would any deal improve my position?
   - Should I propose, respond to, or ignore current deals?
3. **Promise Evaluation:** After each action, check if any pending promises were kept or broken
4. **Trust Decay:** Trust naturally drifts toward 5 by 0.25 per round (grudges fade, trust erodes)
5. **Reputation Broadcasting:** When a player betrays, ALL players reduce trust slightly (-0.5) even if not directly involved (reputation effect)
6. **Offer Formatting:** AI generates human-readable offer strings for the log, making simulation output read like a political drama
