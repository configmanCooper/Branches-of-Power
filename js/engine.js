// Branches of Power — Game Engine
// Core game state management, round flow, bills, elections, dice

var Engine = (function() {
    'use strict';

    var state = null;

    // --- Dice Rolling ---
    function rollD(sides) {
        var result = Math.floor(Math.random() * sides) + 1;
        if (state) {
            state.diceHistory.push({ sides: sides, result: result, round: state.round, timestamp: Date.now() });
            if (state.diceHistory.length > 200) state.diceHistory.shift();
        }
        return result;
    }
    function rollD20() { return rollD(20); }
    function rollD6() { return rollD(6); }

    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
    function clampBillStat(val) { return clamp(val, Config.BILL_STAT_MIN, Config.BILL_STAT_MAX); }
    function clampPopularity(val) { return clamp(val, Config.POPULARITY_MIN, Config.POPULARITY_MAX); }

    // --- Initialization ---
    function createInitialState(gameLength) {
        var maxRounds = (Config.GAME_LENGTHS[gameLength] || Config.GAME_LENGTHS.standard).rounds;

        // Roll for president's party
        var presParty = rollD(2) === 1 ? 'republican' : 'democrat';

        // Generate senate composition (100 senators)
        var senateComp = generateSenateComposition();

        // Generate house composition (435 reps)
        var houseComp = generateHouseComposition();

        // Generate supreme court (9 justices)
        var justices = generateCourtComposition();

        var senateMajority = getSenateMajority(senateComp);
        var houseMajority = getHouseMajority(houseComp);

        state = {
            version: Config.VERSION,
            round: 1,
            maxRounds: maxRounds,
            phase: 'action',
            turnOrder: ['president', 'house', 'senate', 'supremeCourt'],
            currentTurnIndex: 0,
            currentActionInTurn: 0,

            president: {
                party: presParty,
                popularity: Config.POPULARITY_START,
                vp: 0,
                actionsRemaining: 4,
                executiveOrdersThisRound: 0,
                executiveOrdersTotal: 0,
                termsServed: 0,
                roundsInCurrentTerm: 0,
                witchhuntsUsed: 0,
                witchhuntProtectedNextRound: false,
                billsSignedLowLegality: 0,
                justiceNominationsThisRound: 0,
                executivePrivilegeUsed: false,
                stateDinnerUsedThisRound: false
            },

            house: {
                composition: houseComp,
                majorityParty: houseMajority,
                pc: 0,
                vp: 0,
                actionsRemaining: 4,
                impeachmentsUsed: 0,
                packCourtsUsed: false,
                killBillUsedThisRound: false,
                popularizeUsedThisRound: false,
                stateOfUnionUsedThisRound: false,
                initiatedLegislationThisRound: false,
                uniqueActionsThisRound: [],
                speakersGavelGranted: false,
                billsPassedTotal: 0,
                caucusMeetingUsedThisRound: false,
                subpoenaUsedThisRound: false,
                powerOfPurseUsed: false
            },

            senate: {
                composition: senateComp,
                majorityParty: senateMajority,
                pc: 0,
                vp: 0,
                actionsRemaining: 4,
                governmentShutdownsUsed: 0,
                governmentShutdownUsedThisRound: false,
                filibusterUsedThisRound: false,
                stallUsedThisRound: false,
                conferenceUsedThisRound: false,
                nominationsUsedThisRound: false,
                filibustersUsedTotal: 0
            },

            supremeCourt: {
                justices: justices,
                vp: 0,
                jp: 0,
                actionsRemaining: 4,
                courtSize: Config.COURT_DEFAULT_SIZE,
                isPacked: false,
                internalInquiryUsed: 0,
                constitutionalCrisisUsed: 0,
                partisanRulingUsed: 0,
                investigateEOUsedThisRound: false,
                generalCourtUsedThisRound: false,
                advisoryUsedThisRound: false,
                suggestJusticeUsedThisRound: false,
                internalInquiryUsedThisRound: false,
                partisanRulingUsedThisRound: false,
                legalityModifier: 0,
                witchhuntDebuff: 0,
                recusedJusticeIndex: null,
                recusalUsedThisRound: false,
                landmarkRulingUsed: false,
                landmarkEffect: null,
                baseActionsPerRound: 4,
                judicialReviewBonus: 0
            },

            bills: [],
            activeBillId: null,
            billIdCounter: 0,
            passedBills: [],
            precedents: [],
            unconstitutionalBills: [],
            pendingAmendment: null,
            pendingUnitySummit: null,
            billPassedThisRound: false,
            billPassedByHouse: false,
            billPassedBySenate: false,
            billVetoedThisRound: false,
            billKilledThisRound: false,
            billStalledNextRound: false,
            pendingJustice: null,
            justiceNominated: null,
            justiceSuggestedByCourt: null,
            billsSentToFloor: 0,

            log: [],
            diceHistory: [],
            electionLog: [],

            // Trust & Negotiation System
            trust: {
                president: { house: 5, senate: 5, supremeCourt: 5 },
                house: { president: 5, senate: 5, supremeCourt: 5 },
                senate: { president: 5, house: 5, supremeCourt: 5 },
                supremeCourt: { president: 5, house: 5, senate: 5 }
            },
            deals: [],       // active deals: { id, from, to, type, ask, offer, round, status: 'pending'|'accepted'|'fulfilled'|'broken'|'rejected' }
            dealCounter: 0,

            perGameLimits: JSON.parse(JSON.stringify(Config.PER_GAME_LIMITS)),

            // Stability & Events
            stability: 5,
            stabilityMax: 10,
            activeEvent: null,
            queuedEvent: null,
            eventHistory: [],
            eventCooldown: 0,
            stabilityCollapse: false
        };

        // Generate first bill
        addBillToFloor(generateBill());

        return state;
    }

    function generateSenateComposition() {
        // Random distribution of 100 senators
        var dem = 20 + rollD(10);
        var rep = 20 + rollD(10);
        var modDem = 10 + rollD(10);
        var modRep = Config.SENATE_TOTAL - dem - rep - modDem;
        if (modRep < 5) { modRep = 5; dem = Config.SENATE_TOTAL - rep - modDem - modRep; }
        return { democrat: dem, modDem: modDem, modRep: modRep, republican: rep };
    }

    function generateHouseComposition() {
        var dem = 80 + rollD(40);
        var rep = 80 + rollD(40);
        var extremeDem = 20 + rollD(30);
        var extremeRep = Config.HOUSE_TOTAL - dem - rep - extremeDem;
        if (extremeRep < 10) { extremeRep = 10; dem = Config.HOUSE_TOTAL - rep - extremeDem - extremeRep; }
        return { extremeDem: extremeDem, democrat: dem, republican: rep, extremeRep: extremeRep };
    }

    function generateCourtComposition() {
        var justices = [];
        var leanings = ['conservative', 'moderate', 'liberal'];
        // Roll for each justice
        for (var i = 0; i < Config.COURT_DEFAULT_SIZE; i++) {
            var roll = rollD(3);
            justices.push({ leaning: leanings[roll - 1], id: i });
        }
        return justices;
    }

    function getSenateMajority(comp) {
        var demTotal = comp.democrat + comp.modDem;
        var repTotal = comp.republican + comp.modRep;
        return demTotal >= repTotal ? 'democrat' : 'republican';
    }

    function getHouseMajority(comp) {
        var demTotal = comp.extremeDem + comp.democrat;
        var repTotal = comp.republican + comp.extremeRep;
        return demTotal >= repTotal ? 'democrat' : 'republican';
    }

    function getCourtMajority() {
        var lib = 0, con = 0, mod = 0;
        for (var i = 0; i < state.supremeCourt.justices.length; i++) {
            var l = state.supremeCourt.justices[i].leaning;
            if (l === 'liberal') lib++;
            else if (l === 'conservative') con++;
            else mod++;
        }
        if (lib > con) return 'liberal';
        if (con > lib) return 'conservative';
        return 'moderate';
    }

    // --- Bill Generation ---
    function generateBill() {
        var partisanship = clampBillStat(rollD(16) + 2); // 3-18 range
        var popularity = clampBillStat(rollD(14) + 3); // 4-17 range
        // Unstable penalty
        if (state.stability <= 4) {
            popularity = clampBillStat(popularity - 2);
        }
        var legality = clampBillStat(rollD(10) + 5 + state.supremeCourt.legalityModifier);
        var name = Config.BILL_NAMES[Math.floor(Math.random() * Config.BILL_NAMES.length)];
        return {
            name: name,
            partisanship: partisanship,
            popularity: popularity,
            legality: legality,
            type: 'normal',
            markers: [],
            passedByHouse: false,
            passedBySenate: false,
            isImpeachment: false,
            isPackCourts: false,
            isTaxCuts: false,
            isRepeal: false,
            originalBillIndex: -1,
            houseVotes: 0,
            senateVotes: 0
        };
    }

    // --- Multi-Bill Helpers ---
    function getActiveBill() {
        if (!state.activeBillId && state.bills.length > 0) {
            state.activeBillId = state.bills[0].id;
        }
        for (var i = 0; i < state.bills.length; i++) {
            if (state.bills[i].id === state.activeBillId) return state.bills[i];
        }
        return state.bills.length > 0 ? state.bills[0] : null;
    }

    function addBillToFloor(bill) {
        bill.id = ++state.billIdCounter;
        state.bills.push(bill);
        state.activeBillId = bill.id;
        return bill;
    }

    function removeBillFromFloor(billId) {
        for (var i = 0; i < state.bills.length; i++) {
            if (state.bills[i].id === billId) {
                state.bills.splice(i, 1);
                break;
            }
        }
        if (state.activeBillId === billId) {
            state.activeBillId = state.bills.length > 0 ? state.bills[0].id : null;
        }
    }

    function getBillById(billId) {
        for (var i = 0; i < state.bills.length; i++) {
            if (state.bills[i].id === billId) return state.bills[i];
        }
        return null;
    }

    // --- Voting Calculations ---
    function calculateSenateVotes(bill, pcUsed) {
        var comp = state.senate.composition;
        var p = bill.partisanship;
        var extra = pcUsed || 0;
        var votes = 0;

        // Each faction votes based on partisanship range, PC can expand range by 1 per PC
        var factions = [
            { count: comp.democrat, min: 11, max: 18 },
            { count: comp.modDem, min: 8, max: 15 },
            { count: comp.modRep, min: 5, max: 12 },
            { count: comp.republican, min: 3, max: 9 }
        ];

        for (var i = 0; i < factions.length; i++) {
            var f = factions[i];
            var adjMin = f.min - extra;
            var adjMax = f.max + extra;
            if (p >= adjMin && p <= adjMax) {
                votes += f.count;
            }
        }

        return votes;
    }

    function calculateHouseVotes(bill, pcUsed) {
        var comp = state.house.composition;
        var p = bill.partisanship;
        var extra = pcUsed || 0;
        var votes = 0;

        var factions = [
            { count: comp.extremeDem, min: 14, max: 20 },
            { count: comp.democrat, min: 11, max: 18 },
            { count: comp.republican, min: 3, max: 9 },
            { count: comp.extremeRep, min: 1, max: 6 }
        ];

        for (var i = 0; i < factions.length; i++) {
            var f = factions[i];
            var adjMin = f.min - extra;
            var adjMax = f.max + extra;
            if (p >= adjMin && p <= adjMax) {
                votes += f.count;
            }
        }

        return votes;
    }

    function calculateJudicialReview(bill, bonusVotesFor, bonusVotesAgainst, sentByPresident) {
        var justices = state.supremeCourt.justices;
        var p = bill.partisanship;
        var leg = bill.legality;
        var votesUncon = 0;
        var votesCon = 0;

        for (var i = 0; i < justices.length; i++) {
            // Skip recused justice
            if (state.supremeCourt.recusedJusticeIndex === i) continue;
            var j = justices[i];
            var wouldVoteUncon = false;

            if (j.leaning === 'conservative') {
                wouldVoteUncon = (p >= 11 && p <= 20) && leg < 15;
            } else if (j.leaning === 'liberal') {
                wouldVoteUncon = (p >= 1 && p <= 9) && leg < 15;
            } else { // moderate
                wouldVoteUncon = ((p >= 15 && p <= 20) || (p >= 1 && p <= 5)) && leg < 15;
            }

            if (wouldVoteUncon) votesUncon++;
            else votesCon++;
        }

        // Legality bonuses
        if (leg > 10) {
            votesCon += Math.floor((leg - 10) / 2);
        } else if (leg < 10) {
            votesUncon += Math.floor((10 - leg) / 2);
        }

        // President sent it
        if (sentByPresident) votesUncon++;

        // Witchhunt debuff
        votesUncon -= state.supremeCourt.witchhuntDebuff;

        // Judicial review bonus (from landmark ruling)
        votesUncon += state.supremeCourt.judicialReviewBonus;

        // Bonus votes
        votesCon += (bonusVotesFor || 0);
        votesUncon += (bonusVotesAgainst || 0);

        return {
            unconstitutional: Math.max(0, votesUncon),
            constitutional: Math.max(0, votesCon),
            result: votesUncon > votesCon ? 'unconstitutional' : 'constitutional'
        };
    }

    // --- Action Processing ---
    function getCurrentRole() {
        return state.turnOrder[state.currentTurnIndex];
    }

    function addLog(role, action, details) {
        state.log.push({
            round: state.round,
            role: role,
            action: action,
            details: details,
            timestamp: Date.now()
        });
    }

    function advanceTurn() {
        var currentRole = getCurrentRole();
        var roleState = state[currentRole];
        roleState.actionsRemaining--;

        // Find next player with actions remaining
        var checked = 0;
        while (checked < 4) {
            state.currentTurnIndex = (state.currentTurnIndex + 1) % 4;
            var nextRole = getCurrentRole();
            if (state[nextRole].actionsRemaining > 0) {
                return;
            }
            checked++;
        }

        // All players used all actions — end of round
        endRound();
    }

    function advanceTurnNoDecrement() {
        // Used when action consumed extra actions
        var checked = 0;
        while (checked < 4) {
            state.currentTurnIndex = (state.currentTurnIndex + 1) % 4;
            var nextRole = getCurrentRole();
            if (state[nextRole].actionsRemaining > 0) {
                return;
            }
            checked++;
        }
        endRound();
    }

    function skipRemainingActions(role) {
        if (state[role]) {
            state[role].actionsRemaining = 0;
            addLog(role, 'Skip', 'No valid actions — skipping remaining actions.');
            advanceTurnNoDecrement();
        }
    }

    // --- Trust & Negotiation ---
    var DEAL_TYPES = {
        // President actions
        signBill: { label: 'Sign the bill', roles: ['president'], billRelated: true },
        vetoBill: { label: 'Veto the bill', roles: ['president'], billRelated: true },
        executiveOrder: { label: 'Issue an Executive Order', roles: ['president'] },
        nominateJustice: { label: 'Nominate a justice', roles: ['president'] },
        advocate: { label: 'Advocate for legislation', roles: ['president'], billRelated: true },
        admonish: { label: 'Admonish legislation', roles: ['president'], billRelated: true },
        campaign: { label: 'Go on Campaign Trail', roles: ['president'] },
        taxCuts: { label: 'Propose Tax Cuts bill', roles: ['president'] },
        sueBill: { label: 'Sue (send bill to SC review)', roles: ['president'], billRelated: true },
        stateDinner: { label: 'Host a State Dinner', roles: ['president'] },
        executivePrivilege: { label: 'Use Executive Privilege', roles: ['president'] },

        // House actions
        passBillHouse: { label: 'Pass the bill in the House', roles: ['house'], billRelated: true },
        killBill: { label: 'Kill the bill in committee', roles: ['house'], billRelated: true },
        supportBill: { label: 'Support the bill (+popularity)', roles: ['house'], billRelated: true },
        attackBill: { label: 'Attack the bill (-popularity)', roles: ['house'], billRelated: true },
        popularizeBill: { label: 'Popularize the bill', roles: ['house'], billRelated: true },
        changeBill: { label: 'Change Bill Now (new bill)', roles: ['house'] },
        initiateLegislation: { label: 'Initiate new legislation', roles: ['house'] },
        riderAmendment: { label: 'Attach a Rider Amendment', roles: ['house'], billRelated: true },
        impeach: { label: 'Impeach the President', roles: ['house'] },
        packCourts: { label: 'Pack the Courts', roles: ['house'] },
        hostHearing: { label: 'Host a Hearing', roles: ['house'] },
        whipHouse: { label: 'Whip the House', roles: ['house'] },
        earmark: { label: 'Earmark (+4 VP)', roles: ['house'] },
        caucusMeeting: { label: 'Caucus Meeting (+PC)', roles: ['house'] },
        subpoena: { label: 'Subpoena Power', roles: ['house'] },
        powerOfPurse: { label: 'Power of the Purse', roles: ['house'] },

        // Senate actions
        passBillSenate: { label: 'Pass the bill in the Senate', roles: ['senate'], billRelated: true },
        filibuster: { label: 'Filibuster the bill', roles: ['senate'], billRelated: true },
        updateBill: { label: 'Update bill stats', roles: ['senate'], billRelated: true },
        stallBill: { label: 'Stall the bill (keep next round)', roles: ['senate'], billRelated: true },
        debate: { label: 'Debate legislation (+PC)', roles: ['senate'] },
        conference: { label: 'Conference with House (+PC)', roles: ['senate'] },
        confirmJustice: { label: 'Confirm/reject justice nominee', roles: ['senate'] },
        nominations: { label: 'Pass/Block nominations', roles: ['senate'] },
        reviveBill: { label: 'Revive a passed bill', roles: ['senate'] },
        repealBill: { label: 'Repeal a passed bill', roles: ['senate'] },
        governmentShutdown: { label: 'Government Shutdown', roles: ['senate'] },

        // Supreme Court actions
        reviewBill: { label: 'Judicial Review', roles: ['supremeCourt'], billRelated: true },
        investigateBill: { label: 'Investigate bill legality', roles: ['supremeCourt'], billRelated: true },
        billReview: { label: 'Bill Review (+legality)', roles: ['supremeCourt'], billRelated: true },
        investigateEO: { label: 'Investigate Executive Orders', roles: ['supremeCourt'] },
        amicusBrief: { label: 'File Amicus Brief', roles: ['supremeCourt'], billRelated: true },
        oralArguments: { label: 'Oral Arguments (center bill)', roles: ['supremeCourt'], billRelated: true },
        injunction: { label: 'Issue an Injunction', roles: ['supremeCourt'], billRelated: true },
        partisanRuling: { label: 'Partisan Ruling', roles: ['supremeCourt'] },
        constitutionalCrisis: { label: 'Declare Constitutional Crisis', roles: ['supremeCourt'] },
        certiorari: { label: 'Writ of Certiorari', roles: ['supremeCourt'], billRelated: true },
        generalCourt: { label: 'General Court (+VP)', roles: ['supremeCourt'] },
        advisoryRole: { label: 'Advisory Role (+VP)', roles: ['supremeCourt'] },
        disapproveJustice: { label: 'Disapprove justice nominee', roles: ['supremeCourt'] },

        // Any role
        proposeAmendment: { label: 'Propose Constitutional Amendment', roles: ['president', 'house', 'senate'] },
        proposeUnitySummit: { label: 'Propose National Unity Summit', roles: ['president', 'house', 'senate', 'supremeCourt'] },
        agreeUnitySummit: { label: 'Agree to Unity Summit', roles: ['president', 'house', 'senate', 'supremeCourt'] },
        rejectUnitySummit: { label: 'Reject Unity Summit', roles: ['president', 'house', 'senate', 'supremeCourt'] },

        // Event-related actions
        resolveEvent: { label: 'Help resolve the active event', roles: ['president', 'house', 'senate', 'supremeCourt'] },
        commitToEvent: { label: 'Commit to cooperative event resolution', roles: ['president', 'house', 'senate', 'supremeCourt'] },
        dontResolveEvent: { label: 'Let the event fail (don\'t resolve it)', roles: ['president', 'house', 'senate', 'supremeCourt'] },
        eventSpecialAction: { label: 'Use event special action', roles: ['president', 'house', 'senate', 'supremeCourt'] },

        general: { label: 'General favor', roles: ['president', 'house', 'senate', 'supremeCourt'] }
    };

    function clampTrust(val) { return Math.max(0, Math.min(10, val)); }

    function adjustTrust(from, to, amount) {
        if (state.trust[from] && state.trust[from][to] !== undefined) {
            state.trust[from][to] = clampTrust(state.trust[from][to] + amount);
        }
    }

    function proposeDeal(from, to, askType, offerType, message, askBillId, offerBillId) {
        // Build description with bill names
        var askLabel = DEAL_TYPES[askType] ? DEAL_TYPES[askType].label : askType;
        var offerLabel = DEAL_TYPES[offerType] ? DEAL_TYPES[offerType].label : offerType;

        // Attach bill names to bill-related deals
        var askBillName = '';
        var offerBillName = '';
        if (askBillId && state.bills) {
            for (var i = 0; i < state.bills.length; i++) {
                if (state.bills[i].id === askBillId) { askBillName = state.bills[i].name; break; }
            }
        }
        if (offerBillId && state.bills) {
            for (var j = 0; j < state.bills.length; j++) {
                if (state.bills[j].id === offerBillId) { offerBillName = state.bills[j].name; break; }
            }
        }

        var deal = {
            id: ++state.dealCounter,
            from: from,
            to: to,
            askType: askType,
            offerType: offerType,
            askBillId: askBillId || null,
            offerBillId: offerBillId || null,
            askBillName: askBillName,
            offerBillName: offerBillName,
            message: message || '',
            round: state.round,
            status: 'pending'
        };
        state.deals.push(deal);
        var dealDesc = askLabel + (askBillName ? ' ("' + askBillName + '")' : '') + ' for ' + offerLabel + (offerBillName ? ' ("' + offerBillName + '")' : '');
        addLog(from, 'Propose Deal', 'Proposed deal to ' + Config.ROLE_LABELS[to] + ': ' + dealDesc);
        return deal;
    }

    function respondToDeal(dealId, accept) {
        var deal = null;
        for (var i = 0; i < state.deals.length; i++) {
            if (state.deals[i].id === dealId) { deal = state.deals[i]; break; }
        }
        if (!deal || deal.status !== 'pending') return { success: false, message: 'Deal not found or already resolved.' };

        if (accept) {
            deal.status = 'accepted';
            adjustTrust(deal.from, deal.to, 0.5);
            adjustTrust(deal.to, deal.from, 0.5);
            addLog(deal.to, 'Accept Deal', 'Accepted deal from ' + Config.ROLE_LABELS[deal.from] + '.');
        } else {
            deal.status = 'rejected';
            adjustTrust(deal.from, deal.to, -0.5);
            addLog(deal.to, 'Reject Deal', 'Rejected deal from ' + Config.ROLE_LABELS[deal.from] + '.');
        }
        return { success: true, deal: deal };
    }

    function fulfillDeal(dealId) {
        var deal = null;
        for (var i = 0; i < state.deals.length; i++) {
            if (state.deals[i].id === dealId) { deal = state.deals[i]; break; }
        }
        if (!deal || deal.status !== 'accepted') return { success: false, message: 'Deal not active.' };
        deal.status = 'fulfilled';
        adjustTrust(deal.to, deal.from, 1.5);
        adjustTrust(deal.from, deal.to, 1);
        addLog(deal.from, 'Deal Fulfilled', 'Kept promise to ' + Config.ROLE_LABELS[deal.to] + '.');
        return { success: true };
    }

    function breakDeal(dealId) {
        var deal = null;
        for (var i = 0; i < state.deals.length; i++) {
            if (state.deals[i].id === dealId) { deal = state.deals[i]; break; }
        }
        if (!deal || deal.status !== 'accepted') return { success: false, message: 'Deal not active.' };
        deal.status = 'broken';
        adjustTrust(deal.to, deal.from, -2);
        // Reputation damage — others lose trust too
        var roles = ['president', 'house', 'senate', 'supremeCourt'];
        for (var i = 0; i < roles.length; i++) {
            if (roles[i] !== deal.from && roles[i] !== deal.to) {
                adjustTrust(roles[i], deal.from, -0.5);
            }
        }
        addLog(deal.from, 'Deal Broken', 'Broke promise to ' + Config.ROLE_LABELS[deal.to] + '! Trust damaged.');
        return { success: true };
    }

    function getActiveDeals(role) {
        return state.deals.filter(function(d) {
            return (d.from === role || d.to === role) && (d.status === 'pending' || d.status === 'accepted');
        });
    }

    function getPendingDealsForRole(role) {
        return state.deals.filter(function(d) {
            return d.to === role && d.status === 'pending';
        });
    }

    function getAcceptedDealsForRole(role) {
        return state.deals.filter(function(d) {
            return d.from === role && d.status === 'accepted';
        });
    }

    function expireOldDeals() {
        for (var i = 0; i < state.deals.length; i++) {
            var d = state.deals[i];
            if (d.status === 'accepted' && d.round < state.round - 1) {
                breakDeal(d.id);
            }
            if (d.status === 'pending' && d.round < state.round) {
                d.status = 'expired';
            }
        }
        // Trust regression toward neutral
        var roles = ['president', 'house', 'senate', 'supremeCourt'];
        for (var i = 0; i < roles.length; i++) {
            for (var j = 0; j < roles.length; j++) {
                if (i === j) continue;
                var t = state.trust[roles[i]][roles[j]];
                if (t > 5) state.trust[roles[i]][roles[j]] = Math.max(5, t - 0.25);
                else if (t < 5) state.trust[roles[i]][roles[j]] = Math.min(5, t + 0.25);
            }
        }
    }

    // --- President Actions ---
    function presidentExecutiveOrder() {
        var vpGain = (state.president.popularity >= 18) ? 2 : 1;
        state.president.vp += vpGain;
        state.president.popularity = clampPopularity(state.president.popularity + 1);
        state.president.executiveOrdersThisRound++;
        state.president.executiveOrdersTotal++;
        var mandateMsg = vpGain === 2 ? ' (Mandate bonus!)' : '';
        addLog('president', 'Executive Order', '+' + vpGain + ' VP, +1 Popularity' + mandateMsg);
        advanceTurn();
        return { success: true, message: 'Executive Order issued. +' + vpGain + ' VP, +1 Popularity.' + mandateMsg };
    }

    function presidentAdvocate(target, amount) {
        // target: 'both' (+/-2 to both), 'senate' or 'house' (+/-4 to one)
        // amount: positive = advocate, negative = admonish
        if (target === 'both') {
            var adj = amount > 0 ? 2 : -2;
            state.senate.pc = Math.max(0, state.senate.pc + adj);
            state.house.pc = Math.max(0, state.house.pc + adj);
            addLog('president', amount > 0 ? 'Advocate Legislation' : 'Admonish Legislation',
                (adj > 0 ? '+' : '') + adj + ' PC to both Senate and House. -5 Bill Popularity.');
        } else {
            var adj2 = amount > 0 ? 4 : -4;
            state[target].pc = Math.max(0, state[target].pc + adj2);
            addLog('president', amount > 0 ? 'Advocate Legislation' : 'Admonish Legislation',
                (adj2 > 0 ? '+' : '') + adj2 + ' PC to ' + target + '. -5 Bill Popularity.');
        }
        var activeBill = getActiveBill();
        if (activeBill) {
            activeBill.popularity = clampBillStat(activeBill.popularity - 5);
        }
        advanceTurn();
        return { success: true, message: 'Legislation ' + (amount > 0 ? 'advocated' : 'admonished') + '.' };
    }

    function presidentVeto() {
        if (!state.billPassedThisRound) {
            return { success: false, message: 'No bill was passed this round to veto.' };
        }
        state.president.vp -= 1;

        // Undo all VP gained/lost from this bill
        // The bill goes back on the floor with 2/3 requirement
        var bill = state.passedBills.pop();
        bill.passedByHouse = false;
        bill.passedBySenate = false;
        bill.requiresSupermajority = true;
        addBillToFloor(bill);
        state.billPassedThisRound = false;
        state.billPassedByHouse = false;
        state.billPassedBySenate = false;

        addLog('president', 'Veto', 'Bill vetoed! Returns to floor requiring 2/3 vote. -1 VP.');
        advanceTurn();
        return { success: true, message: 'Bill vetoed and returned to Congress.' };
    }

    function presidentSue() {
        if (!state.billPassedThisRound) {
            return { success: false, message: 'No bill was passed this round to sue over.' };
        }
        var bill = state.passedBills[state.passedBills.length - 1];
        var presParty = state.president.party;
        var isOpposing = (presParty === 'democrat' && bill.partisanship < 10) ||
                         (presParty === 'republican' && bill.partisanship > 10);
        if (!isOpposing) {
            return { success: false, message: 'Can only sue over opposing party bills.' };
        }

        state.supremeCourt.vp += 1;
        // Judicial review will be triggered — Supreme Court decides
        state.pendingSue = true;
        addLog('president', 'Sue', 'Bill sent to Supreme Court for review. SC gets +1 VP.');
        advanceTurn();
        return { success: true, message: 'Bill sent to Supreme Court.' };
    }

    function presidentTaxCuts() {
        if (state.president.actionsRemaining < 3) {
            return { success: false, message: 'Tax Cuts requires 3 action points.' };
        }
        var partisanship = state.president.party === 'republican' ? 5 : 15;
        var taxBill = {
            name: 'Tax Cuts Act',
            partisanship: partisanship,
            popularity: 20,
            legality: clampBillStat(10 + state.supremeCourt.legalityModifier),
            type: 'taxCuts',
            markers: [],
            passedByHouse: false,
            passedBySenate: false,
            isImpeachment: false,
            isPackCourts: false,
            isTaxCuts: true,
            isRepeal: false,
            originalBillIndex: -1,
            houseVotes: 0,
            senateVotes: 0
        };
        addBillToFloor(taxBill);
        state.president.actionsRemaining -= 2; // will lose 1 more in advanceTurn
        addLog('president', 'Tax Cuts', 'Tax Cuts bill on the floor! Partisanship ' + partisanship + ', Popularity 20, Legality 10.');
        advanceTurn();
        return { success: true, message: 'Tax Cuts bill placed on floor.' };
    }

    function presidentCampaign() {
        if (state.president.actionsRemaining < 2) {
            return { success: false, message: 'Campaign Trail requires 2 action points.' };
        }
        state.president.popularity = clampPopularity(state.president.popularity + 4);
        state.president.actionsRemaining -= 1; // will lose 1 more in advanceTurn
        addLog('president', 'Campaign Trail', '+4 Popularity.');
        advanceTurn();
        return { success: true, message: 'Campaigning! +4 Popularity.' };
    }

    function presidentSignBill() {
        if (!state.billPassedThisRound || !state.billPassedByHouse || !state.billPassedBySenate) {
            return { success: false, message: 'No bill passed by both chambers to sign.' };
        }
        var bill = state.passedBills[state.passedBills.length - 1];
        if (!bill) return { success: false, message: 'No bill available to sign.' };
        if (bill.popularity > 15) {
            state.president.popularity = clampPopularity(state.president.popularity + 2);
        } else if (bill.popularity > 10) {
            state.president.popularity = clampPopularity(state.president.popularity + 1);
        }
        state.president.vp += 4;
        bill.vpEarned = bill.vpEarned || { president: 0, house: 0, senate: 0, supremeCourt: 0 };
        bill.vpEarned.president += 4;
        state.house.pc = Math.max(0, state.house.pc + 1);
        state.senate.pc = Math.max(0, state.senate.pc + 1);
        bill.signed = true;
        // SC already penalized in completeBillPassage; no duplicate penalty

        // Remove signed bill from floor; generate new if none left
        removeBillFromFloor(bill.id);
        if (state.bills.length === 0) {
            addBillToFloor(generateBill());
        }
        addLog('president', 'Sign Bill', 'Bill signed! +4 VP, +Pop bonus, new bill on floor.');
        advanceTurn();
        return { success: true, message: 'Bill signed into law!' };
    }

    function presidentAssignJustice(leaning) {
        if (!state.pendingJustice) {
            return { success: false, message: 'No justice vacancy to fill.' };
        }
        if (state.president.justiceNominationsThisRound >= 2) {
            return { success: false, message: 'Maximum 2 nominations per round.' };
        }
        var vacancy = state.pendingJustice;
        var assignedLeaning = leaning;

        if (vacancy.type === 'death') {
            var roll = rollD20();
            if (roll <= 10) {
                assignedLeaning = 'moderate';
                addLog('president', 'Assign Justice', 'Rolled ' + roll + ' — must assign moderate justice.');
            }
        }

        // If SC suggested a justice, President must comply or pay penalty
        if (state.justiceSuggestedByCourt && assignedLeaning !== state.justiceSuggestedByCourt) {
            state.president.vp -= 2;
            state.president.popularity = clampPopularity(state.president.popularity - 2);
            addLog('president', 'Assign Justice', 'Ignored SC suggestion (' + state.justiceSuggestedByCourt + '). -2 VP, -2 Popularity.');
        }
        state.justiceSuggestedByCourt = null;

        state.justiceNominated = { leaning: assignedLeaning, vacancy: vacancy };
        state.president.justiceNominationsThisRound++;
        addLog('president', 'Assign Justice', 'Nominated a ' + assignedLeaning + ' justice. Awaiting Senate confirmation.');
        advanceTurn();
        return { success: true, message: 'Justice nominated: ' + assignedLeaning };
    }

    function presidentDeclareWitchhunt() {
        if (state.president.popularity < 15) {
            return { success: false, message: 'Popularity must be >= 15.' };
        }
        if (state.president.witchhuntsUsed >= Config.PER_GAME_LIMITS.witchhunts) {
            return { success: false, message: 'Maximum witchhunts used this game.' };
        }
        if (state.president.actionsRemaining < 2) {
            return { success: false, message: 'Requires 2 action points.' };
        }
        state.president.popularity = clampPopularity(state.president.popularity - 2);
        state.president.vp -= 2;
        state.supremeCourt.vp -= 6;
        state.supremeCourt.witchhuntDebuff = 1; // -1 bonus vote for 2 rounds
        state.president.witchhuntProtectedNextRound = true;
        state.president.witchhuntsUsed++;
        state.president.actionsRemaining -= 1;
        addLog('president', 'Declare Witchhunt', 'SC loses 6 VP, -1 review bonus for 2 rounds. President -2 Pop, -2 VP.');
        advanceTurn();
        return { success: true, message: 'Witchhunt declared!' };
    }

    function presidentBullyPulpit() {
        if (state.president.popularity <= 15) {
            return { success: false, message: 'Popularity must be above 15.' };
        }
        state.president.popularity = clampPopularity(state.president.popularity - 2);
        state.president.vp += 5;
        addLog('president', 'Bully Pulpit', '-2 Popularity, +5 VP.');
        advanceTurn();
        return { success: true, message: 'Bully Pulpit! -2 Popularity, +5 VP.' };
    }

    function presidentExecutivePrivilege() {
        if (state.president.executivePrivilegeUsed) {
            return { success: false, message: 'Executive Privilege already used this game.' };
        }
        state.president.executivePrivilegeUsed = true;
        state.president.actionsRemaining += 2;
        addLog('president', 'Executive Privilege', '+2 extra actions this round (once per game).');
        // Free action — don't consume an action
        return { success: true, message: 'Executive Privilege! +2 actions this round.', freeAction: true };
    }

    function presidentStateDinner(targetRole) {
        if (state.president.stateDinnerUsedThisRound) {
            return { success: false, message: 'State Dinner already used this round.' };
        }
        if (targetRole === 'president') {
            return { success: false, message: 'Cannot target yourself.' };
        }
        if (['house', 'senate', 'supremeCourt'].indexOf(targetRole) === -1) {
            return { success: false, message: 'Invalid target.' };
        }
        state.president.stateDinnerUsedThisRound = true;
        state.president.vp += 3;
        state.president.popularity = clampPopularity(state.president.popularity + 2);
        state[targetRole].vp += 1;
        addLog('president', 'State Dinner', '+3 VP, +2 Popularity. ' + Config.ROLE_LABELS[targetRole] + ' +1 VP.');
        advanceTurn();
        return { success: true, message: 'State Dinner! +3 VP, +2 Pop. ' + Config.ROLE_LABELS[targetRole] + ' gets +1 VP.' };
    }

    // --- House Actions ---
    function houseStateOfUnion(choice) {
        if (state.house.stateOfUnionUsedThisRound) {
            return { success: false, message: 'Already used State of the Union this round.' };
        }
        state.house.stateOfUnionUsedThisRound = true;
        switch (choice) {
            case 'boostPres':
                state.president.popularity = clampPopularity(state.president.popularity + 2);
                addLog('house', 'State of the Union', '+2 President Popularity.');
                break;
            case 'hurtPres':
                state.president.popularity = clampPopularity(state.president.popularity - 4);
                addLog('house', 'State of the Union', '-4 President Popularity.');
                break;
            case 'gainPC':
                state.house.pc += 2;
                addLog('house', 'State of the Union', '+2 PC for House.');
                break;
            case 'hurtSenate':
                state.senate.pc = Math.max(0, state.senate.pc - 4);
                addLog('house', 'State of the Union', '-4 PC for Senate.');
                break;
            case 'gainVP':
                state.house.vp += 1;
                addLog('house', 'State of the Union', '+1 VP for House.');
                break;
        }
        advanceTurn();
        return { success: true, message: 'State of the Union address delivered.' };
    }

    function houseWhip(faction, direction) {
        // Convert 20 reps one step in direction
        var comp = state.house.composition;
        var order = ['extremeDem', 'democrat', 'republican', 'extremeRep'];
        var idx = order.indexOf(faction);
        if (idx === -1) return { success: false, message: 'Invalid faction.' };
        var targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= order.length) {
            return { success: false, message: 'Cannot whip further in that direction.' };
        }
        var amount = Math.min(20, comp[faction]);
        comp[faction] -= amount;
        comp[order[targetIdx]] += amount;
        state.house.majorityParty = getHouseMajority(comp);
        addLog('house', 'Whip the House', 'Converted ' + amount + ' ' + faction + ' to ' + order[targetIdx] + '.');
        advanceTurn();
        return { success: true, message: 'House whipped!' };
    }

    function houseSupportAttackBill(support) {
        if (!getActiveBill()) return { success: false, message: 'No bill on floor.' };
        var bill = getActiveBill();
        if (support) {
            bill.popularity = clampBillStat(bill.popularity + 5);
        } else {
            bill.popularity = clampBillStat(bill.popularity - 5);
        }
        // Make more extreme
        if (bill.partisanship < 10) {
            bill.partisanship = clampBillStat(bill.partisanship - 2);
        } else if (bill.partisanship > 10) {
            bill.partisanship = clampBillStat(bill.partisanship + 2);
        } else {
            // Partisanship is 10, coin flip
            bill.partisanship = clampBillStat(bill.partisanship + (rollD(2) === 1 ? -2 : 2));
        }
        addLog('house', support ? 'Support Bill' : 'Attack Bill',
            (support ? '+5' : '-5') + ' Popularity, bill more extreme.');
        advanceTurn();
        return { success: true, message: 'Bill ' + (support ? 'supported' : 'attacked') + '.' };
    }

    function houseKillBill() {
        if (!getActiveBill()) return { success: false, message: 'No bill on floor.' };
        if (state.house.killBillUsedThisRound) return { success: false, message: 'Already used Kill Bill this round.' };
        if (state.house.pc < 1) return { success: false, message: 'Need 1 PC.' };

        state.house.pc -= 1;
        state.house.vp += 1;
        state.house.killBillUsedThisRound = true;
        state.billKilledThisRound = true;
        getActiveBill().killed = true;
        addLog('house', 'Kill Bill', 'Bill sent to committee. +1 VP. Cannot pass this round.');
        advanceTurn();
        return { success: true, message: 'Bill killed in committee.' };
    }

    function houseHostHearing(choice) {
        switch (choice) {
            case 'pcAndBoostPres':
                state.house.pc += 1;
                state.president.popularity = clampPopularity(state.president.popularity + 1);
                addLog('house', 'Host Hearing', '+1 PC, +1 President Popularity.');
                break;
            case 'pcAndHurtPres':
                state.house.pc += 2;
                state.president.popularity = clampPopularity(state.president.popularity - 2);
                addLog('house', 'Host Hearing', '+2 PC, -2 President Popularity.');
                break;
            case 'gainVP':
                state.house.vp += 3;
                addLog('house', 'Host Hearing', '+3 VP.');
                break;
        }
        advanceTurn();
        return { success: true, message: 'Hearing concluded.' };
    }

    function housePopularizeBill() {
        if (!getActiveBill()) return { success: false, message: 'No bill on floor.' };
        if (state.house.popularizeUsedThisRound) return { success: false, message: 'Already used this round.' };
        if (state.house.pc < 1) return { success: false, message: 'Need 1 PC.' };

        state.house.pc -= 1;
        state.house.popularizeUsedThisRound = true;
        var bill = getActiveBill();
        bill.popularity = clampBillStat(bill.popularity + 5);
        bill.legality = clampBillStat(bill.legality - 4);
        if (bill.partisanship < 10) {
            bill.partisanship = clampBillStat(bill.partisanship - 3);
        } else {
            bill.partisanship = clampBillStat(bill.partisanship + 3);
        }
        addLog('house', 'Popularize Bill', '+5 Pop, -4 Legality, +3 Partisanship (extreme).');
        advanceTurn();
        return { success: true, message: 'Bill popularized!' };
    }

    function houseChangeBill() {
        if (state.house.actionsRemaining < 2) return { success: false, message: 'Needs 2 actions.' };
        if (state.house.pc < 2) return { success: false, message: 'Need 2 PC.' };

        state.house.pc -= 2;
        state.house.actionsRemaining -= 1;
        // New bill with customization
        var bill = {
            name: 'House Initiated Bill',
            partisanship: 10,
            popularity: 10,
            legality: clampBillStat(10 + state.supremeCourt.legalityModifier),
            type: 'normal',
            markers: [],
            passedByHouse: false,
            passedBySenate: false,
            isImpeachment: false,
            isPackCourts: false,
            isTaxCuts: false,
            isRepeal: false,
            originalBillIndex: -1,
            houseVotes: 0,
            senateVotes: 0
        };
        addBillToFloor(bill);
        addLog('house', 'Change Bill Now', 'New bill on floor (10/10/10). Cost 2 PC, 2 actions.');
        advanceTurn();
        return { success: true, message: 'New bill placed on floor.' };
    }

    function housePassBill(pcToUse) {
        if (!getActiveBill()) return { success: false, message: 'No bill on floor.' };
        if (state.billKilledThisRound) return { success: false, message: 'Bill was killed this round.' };
        if (getActiveBill().passedByHouse) return { success: false, message: 'Bill already passed the House.' };

        var bill = getActiveBill();
        var pcUsed = Math.min(pcToUse || 0, state.house.pc);
        var votes = calculateHouseVotes(bill, pcUsed);

        // If less than 20 more needed, can use 1 PC for d20 bonus
        var threshold = bill.requiresSupermajority ? Config.HOUSE_SUPERMAJORITY : Config.HOUSE_PASS_THRESHOLD;
        var diceBonus = 0;
        if (votes < threshold && (threshold - votes) < 20 && state.house.pc >= pcUsed + 1) {
            pcUsed++;
            diceBonus = rollD20();
            votes += diceBonus;
        }

        state.house.pc = Math.max(0, state.house.pc - pcUsed);
        bill.houseVotes = votes;

        if (votes >= threshold) {
            bill.passedByHouse = true;
            state.billPassedByHouse = true;
            var housePassVP = 5 + Math.ceil(votes / 80);
            // Override Momentum: bonus VP for overriding a presidential veto
            if (bill.requiresSupermajority) {
                housePassVP += 4;
                addLog('house', 'Override Momentum', 'Veto overridden! House +4 bonus VP.');
            }
            state.house.vp += housePassVP;
            bill.vpEarned = bill.vpEarned || { president: 0, house: 0, senate: 0, supremeCourt: 0 };
            bill.vpEarned.house += housePassVP;

            // Populist Surge: bonus VP for popular bills passing the House
            if (bill.popularity >= 15) {
                state.house.vp += 3;
                bill.vpEarned.house += 3;
                addLog('house', 'Populist Surge', 'Bill popularity ≥ 15! House +3 bonus VP.');
            }

            // Legislative Blitz: bonus VP for 3rd+ bill passed
            state.house.billsPassedTotal++;
            if (state.house.billsPassedTotal >= 3) {
                state.house.vp += 2;
                bill.vpEarned.house += 2;
                addLog('house', 'Legislative Blitz', 'Bill #' + state.house.billsPassedTotal + ' passed! +2 bonus VP.');
            }

            if (bill.passedBySenate) {
                completeBillPassage(bill);
                // House bonus for bill passing both
                var partisanPoints = bill.partisanship > 10 ?
                    (state.house.majorityParty === 'democrat' ? bill.partisanship - 10 : 0) :
                    (state.house.majorityParty === 'republican' ? 10 - bill.partisanship : 0);
                state.house.pc += partisanPoints;
                state.house.vp += 2;
                bill.vpEarned.house += 2;
                if ((state.house.majorityParty === 'democrat' && bill.partisanship > 10) ||
                    (state.house.majorityParty === 'republican' && bill.partisanship < 10)) {
                    state.house.vp += 2;
                    bill.vpEarned.house += 2;
                }
            }

            addLog('house', 'Pass Bill', 'PASSED with ' + votes + ' votes!' +
                (diceBonus > 0 ? ' (d20 bonus: ' + diceBonus + ')' : ''));
        } else {
            addLog('house', 'Pass Bill', 'FAILED with ' + votes + '/' + threshold + ' votes.' +
                (diceBonus > 0 ? ' (d20 bonus: ' + diceBonus + ')' : ''));
        }
        advanceTurn();
        return { success: true, message: votes >= threshold ? 'Bill passed the House!' : 'Bill failed.' };
    }

    function houseImpeach() {
        if (state.house.impeachmentsUsed >= Config.PER_GAME_LIMITS.impeachments) {
            return { success: false, message: 'Maximum impeachments used.' };
        }
        if (state.house.pc < 6) return { success: false, message: 'Need 6 PC.' };

        state.house.pc -= 6;
        state.house.impeachmentsUsed++;

        var partisanship = state.house.majorityParty === 'democrat' ? 20 : 1;
        // Adjust for executive orders
        var eoAdj = Math.floor(state.president.executiveOrdersTotal / 2);
        if (partisanship > 10) partisanship = Math.max(10, partisanship - eoAdj);
        else partisanship = Math.min(10, partisanship + eoAdj);

        var legality = clampBillStat(10 + eoAdj + state.president.billsSignedLowLegality);

        var bill = {
            name: 'Articles of Impeachment',
            partisanship: partisanship,
            popularity: 10,
            legality: legality,
            type: 'impeachment',
            markers: [],
            passedByHouse: false,
            passedBySenate: false,
            isImpeachment: true,
            isPackCourts: false,
            isTaxCuts: false,
            isRepeal: false,
            requiresSupermajority: true,
            originalBillIndex: -1,
            houseVotes: 0,
            senateVotes: 0
        };
        addBillToFloor(bill);
        addLog('house', 'Articles of Impeachment', 'Impeachment proceedings begun! Part: ' + partisanship + ', Leg: ' + legality);
        advanceTurn();
        return { success: true, message: 'Impeachment proceedings initiated!' };
    }

    function housePackCourts() {
        if (state.house.packCourtsUsed) return { success: false, message: 'Already used this game.' };
        if (state.house.pc < 6) return { success: false, message: 'Need 6 PC.' };
        if (state.house.vp < 4) return { success: false, message: 'Need 4 VP.' };

        state.house.pc -= 6;
        state.house.vp -= 4;
        state.house.packCourtsUsed = true;

        var partisanship = state.house.majorityParty === 'democrat' ? 18 : 3;
        var bill = {
            name: 'Pack the Courts Act',
            partisanship: partisanship,
            popularity: 5,
            legality: clampBillStat(5 + state.supremeCourt.legalityModifier),
            type: 'packCourts',
            markers: [],
            passedByHouse: false,
            passedBySenate: false,
            isImpeachment: false,
            isPackCourts: true,
            isTaxCuts: false,
            isRepeal: false,
            originalBillIndex: -1,
            houseVotes: 0,
            senateVotes: 0
        };
        addBillToFloor(bill);
        addLog('house', 'Pack the Courts', 'Pack the Courts bill on floor! 4 new justices if passed.');
        advanceTurn();
        return { success: true, message: 'Pack the Courts bill placed.' };
    }

    function houseInitiateLegislation(partAdj, popAdj) {
        if (state.house.initiatedLegislationThisRound) {
            return { success: false, message: 'Already initiated legislation this round.' };
        }
        // Enforce limits: max ±1 partisanship (costs 2 legality), max ±1 popularity (costs 1 legality)
        partAdj = clamp(partAdj || 0, -1, 1);
        popAdj = clamp(popAdj || 0, -1, 1);
        var legPenalty = Math.abs(partAdj) * 2 + Math.abs(popAdj);
        state.house.initiatedLegislationThisRound = true;
        var billName = 'HB: ' + Config.BILL_NAMES[Math.floor(Math.random() * Config.BILL_NAMES.length)];
        var bill = {
            name: billName,
            partisanship: clampBillStat(10 + partAdj),
            popularity: clampBillStat(10 + popAdj),
            legality: clampBillStat(10 + state.supremeCourt.legalityModifier - legPenalty),
            type: 'normal',
            markers: [],
            passedByHouse: false,
            passedBySenate: false,
            isImpeachment: false,
            isPackCourts: false,
            isTaxCuts: false,
            isRepeal: false,
            originalBillIndex: -1,
            houseVotes: 0,
            senateVotes: 0
        };
        addBillToFloor(bill);
        addLog('house', 'Initiate Legislation', 'New bill: Part ' + bill.partisanship + ', Pop ' + bill.popularity + ', Leg ' + bill.legality);
        // Free action — don't advance turn
        return { success: true, message: 'New legislation initiated.', freeAction: true };
    }

    function houseRiderAmendment() {
        if (!getActiveBill()) return { success: false, message: 'No bill on floor.' };
        var bill = getActiveBill();
        if (bill.riderForHouse) return { success: false, message: 'Rider already attached to this bill.' };
        bill.riderForHouse = true;
        addLog('house', 'Rider Amendment', 'Attached +3 VP rider to "' + bill.name + '". House earns bonus if bill passes both chambers.');
        advanceTurn();
        return { success: true, message: 'Rider amendment attached!' };
    }

    function houseEarmark() {
        if (state.house.pc < 6) return { success: false, message: 'Need 6 PC.' };
        state.house.pc -= 6;
        state.house.vp += 4;
        addLog('house', 'Earmark', '-6 PC, +4 VP.');
        advanceTurn();
        return { success: true, message: 'Earmark! -6 PC, +4 VP.' };
    }

    function houseCaucusMeeting() {
        if (state.house.caucusMeetingUsedThisRound) return { success: false, message: 'Already used this round.' };
        state.house.caucusMeetingUsedThisRound = true;
        state.house.pc += 3;
        addLog('house', 'Caucus Meeting', '+3 PC.');
        advanceTurn();
        return { success: true, message: 'Caucus Meeting! +3 PC.' };
    }

    function houseSubpoena() {
        if (state.house.subpoenaUsedThisRound) return { success: false, message: 'Already used this round.' };
        state.house.subpoenaUsedThisRound = true;
        state.president.popularity = clampPopularity(state.president.popularity - 2);
        state.house.vp += 2;
        addLog('house', 'Subpoena Power', '-2 President Popularity, +2 VP.');
        advanceTurn();
        return { success: true, message: 'Subpoena issued! -2 Pres Pop, +2 VP.' };
    }

    function housePowerOfPurse() {
        if (state.house.powerOfPurseUsed) return { success: false, message: 'Already used (once per game).' };
        if (state.house.vp < 4) return { success: false, message: 'Need 4 VP.' };
        state.house.powerOfPurseUsed = true;
        state.house.vp -= 4;
        state.president.actionsRemaining = Math.max(0, state.president.actionsRemaining - 1);
        state.senate.actionsRemaining = Math.max(0, state.senate.actionsRemaining - 1);
        state.purseDebuffNextRound = true;
        addLog('house', 'Power of the Purse', '-4 VP. President and Senate lose 1 action this round and next round.');
        advanceTurn();
        return { success: true, message: 'Power of the Purse! President and Senate lose 1 action.' };
    }

    // --- Senate Actions ---
    function senateJusticeNomination(approve) {
        if (!state.justiceNominated) return { success: false, message: 'No justice nominated.' };

        if (approve) {
            state.supremeCourt.justices.push({
                leaning: state.justiceNominated.leaning,
                id: state.supremeCourt.justices.length
            });
            state.president.vp += 2;
            addLog('senate', 'Confirm Justice', 'Justice confirmed: ' + state.justiceNominated.leaning + '. President +2 VP.');
        } else {
            var pcCost = 0;
            if (state.justiceNominated.vacancy && state.justiceNominated.vacancy.type === 'retirement') pcCost = 2;
            if (state.justiceSuggestedByCourt) pcCost = 3;
            if (state.senate.pc < pcCost) {
                return { success: false, message: 'Need ' + pcCost + ' PC to disapprove.' };
            }
            state.senate.pc -= pcCost;
            addLog('senate', 'Reject Justice', 'Justice nomination rejected. President must nominate again.');
        }
        state.senate.vp += 1;
        state.justiceNominated = null;
        advanceTurn();
        return { success: true, message: approve ? 'Justice confirmed.' : 'Justice rejected.' };
    }

    function senateNominations(pass) {
        if (state.senate.nominationsUsedThisRound) return { success: false, message: 'Already used this round.' };
        state.senate.nominationsUsedThisRound = true;

        if (pass) {
            state.senate.pc += 4;
            state.president.popularity = clampPopularity(state.president.popularity + 1);
            addLog('senate', 'Pass Nominations', '+4 PC, +1 President Popularity.');
        } else {
            state.senate.pc += 1;
            state.senate.vp += 1;
            state.president.popularity = clampPopularity(state.president.popularity - 2);
            addLog('senate', 'Block Nominations', '+1 PC, +1 VP, -2 President Popularity.');
        }
        advanceTurn();
        return { success: true, message: 'Nominations ' + (pass ? 'passed' : 'blocked') + '.' };
    }

    function senateDebate(direction) {
        state.senate.pc += 2;
        // Shift 5 senators one step in chosen direction (default: toward moderate)
        var comp = state.senate.composition;
        direction = direction || 'moderate';
        var shifted = 0;
        if (direction === 'left') {
            var fromRep = Math.min(comp.republican, 3);
            var fromModRep = Math.min(comp.modRep, 2);
            comp.republican -= fromRep;
            comp.modRep += fromRep - fromModRep;
            comp.modDem += fromModRep;
            shifted = fromRep + fromModRep;
        } else if (direction === 'right') {
            var fromDem = Math.min(comp.democrat, 3);
            var fromModDem = Math.min(comp.modDem, 2);
            comp.democrat -= fromDem;
            comp.modDem += fromDem - fromModDem;
            comp.modRep += fromModDem;
            shifted = fromDem + fromModDem;
        } else {
            var fromDem = Math.min(comp.democrat, 3);
            var fromRep = Math.min(comp.republican, 2);
            comp.democrat -= fromDem;
            comp.modDem += fromDem;
            comp.republican -= fromRep;
            comp.modRep += fromRep;
            shifted = fromDem + fromRep;
        }
        state.senate.majorityParty = getSenateMajority(comp);
        addLog('senate', 'Debate Legislation', '+2 PC, ' + shifted + ' senators shifted (' + direction + ').');
        advanceTurn();
        return { success: true, message: 'Debate concluded.' };
    }

    function senateUpdateBill(changes) {
        if (!getActiveBill()) return { success: false, message: 'No bill on floor.' };
        // changes = { partisanship: +/-X, popularity: +/-Y, legality: +/-Z }
        var total = Math.abs(changes.partisanship || 0) + Math.abs(changes.popularity || 0) + Math.abs(changes.legality || 0);
        var maxChange = 3;
        if (total > maxChange) {
            var extraNeeded = Math.ceil((total - maxChange) / 2);
            if (state.senate.pc < extraNeeded) return { success: false, message: 'Need ' + extraNeeded + ' PC for extra changes.' };
            state.senate.pc -= extraNeeded;
        }
        var bill = getActiveBill();
        bill.partisanship = clampBillStat(bill.partisanship + (changes.partisanship || 0));
        bill.popularity = clampBillStat(bill.popularity + (changes.popularity || 0));
        bill.legality = clampBillStat(bill.legality + (changes.legality || 0));
        addLog('senate', 'Update Bill', 'Bill modified. Part: ' + bill.partisanship + ', Pop: ' + bill.popularity + ', Leg: ' + bill.legality);
        advanceTurn();
        return { success: true, message: 'Bill updated.' };
    }

    function senateFilibuster() {
        var filibusterCost = 4;
        if (state.senate.filibustersUsedTotal >= 1) {
            filibusterCost += state.senate.filibustersUsedTotal;
        }
        if (state.senate.pc < filibusterCost) return { success: false, message: 'Need ' + filibusterCost + ' PC.' };

        state.senate.pc -= filibusterCost;
        state.senate.filibustersUsedTotal++;
        state.senate.vp += 1;
        state.house.pc += 2;
        state.president.popularity = clampPopularity(state.president.popularity - 1);
        state.president.vp -= 1;
        state.supremeCourt.vp += 1; // SC passive: bill removed without passing
        var filibusteredBill = getActiveBill();
        if (filibusteredBill) removeBillFromFloor(filibusteredBill.id);
        addBillToFloor(generateBill());
        addLog('senate', 'Filibuster', 'Bill killed! +1 VP Senate, +2 PC House, -1 Pres Pop/VP. New bill.');
        advanceTurn();
        return { success: true, message: 'Filibuster successful!' };
    }

    function senateStallBill() {
        if (state.senate.stallUsedThisRound) return { success: false, message: 'Already stalled this round.' };
        if (state.senate.pc < 2) return { success: false, message: 'Need 2 PC.' };
        state.senate.pc -= 2;
        state.senate.stallUsedThisRound = true;
        var stalledBill = getActiveBill();
        if (stalledBill) stalledBill.stalled = true;
        addLog('senate', 'Stall Bill', 'Bill will remain on floor next round.');
        advanceTurn();
        return { success: true, message: 'Bill stalled.' };
    }

    function senateConference() {
        if (state.senate.conferenceUsedThisRound) return { success: false, message: 'Already used this round.' };
        state.senate.conferenceUsedThisRound = true;
        state.senate.pc += 1;
        state.house.pc += 1;
        addLog('senate', 'Conference', '+1 PC for both Senate and House.');
        advanceTurn();
        return { success: true, message: 'Conference with House.' };
    }

    function senatePassBill(pcToUse) {
        if (!getActiveBill()) return { success: false, message: 'No bill on floor.' };
        if (state.billKilledThisRound) return { success: false, message: 'Bill was killed this round.' };
        if (getActiveBill().passedBySenate) return { success: false, message: 'Bill already passed the Senate.' };

        var bill = getActiveBill();
        var pcUsed = Math.min(pcToUse || 0, state.senate.pc);
        var votes = calculateSenateVotes(bill, pcUsed);

        var threshold = bill.requiresSupermajority ? Config.SENATE_SUPERMAJORITY : Config.SENATE_PASS_THRESHOLD;
        // Can use 1 PC for 51 threshold
        var adjustedThreshold = threshold;
        if (!bill.requiresSupermajority && votes < threshold && votes >= Config.SENATE_PASS_WITH_PC && state.senate.pc >= pcUsed + 1) {
            pcUsed++;
            adjustedThreshold = Config.SENATE_PASS_WITH_PC;
        }

        // If less than 6 more needed, can use 1 PC for d6 bonus
        var diceBonus = 0;
        if (votes < adjustedThreshold && (adjustedThreshold - votes) < 6 && state.senate.pc >= pcUsed + 1) {
            pcUsed++;
            diceBonus = rollD6();
            votes += diceBonus;
        }

        state.senate.pc = Math.max(0, state.senate.pc - pcUsed);
        bill.senateVotes = votes;

        if (votes >= adjustedThreshold) {
            bill.passedBySenate = true;
            state.billPassedBySenate = true;
            var senatePassVP = 4 + Math.ceil(votes / 20);
            state.senate.vp += senatePassVP;
            bill.vpEarned = bill.vpEarned || { president: 0, house: 0, senate: 0, supremeCourt: 0 };
            bill.vpEarned.senate += senatePassVP;

            if (bill.passedByHouse) {
                completeBillPassage(bill);
                // Senate bonus
                var partisanPoints = bill.partisanship > 10 ?
                    (state.senate.majorityParty === 'democrat' ? bill.partisanship - 10 : 0) :
                    (state.senate.majorityParty === 'republican' ? 10 - bill.partisanship : 0);
                state.senate.pc += Math.floor(partisanPoints / 2);
                state.senate.vp += 2;
                bill.vpEarned.senate += 2;
            }

            addLog('senate', 'Pass Bill', 'PASSED with ' + votes + ' votes!' +
                (diceBonus > 0 ? ' (d6 bonus: ' + diceBonus + ')' : ''));
        } else {
            addLog('senate', 'Pass Bill', 'FAILED with ' + votes + '/' + adjustedThreshold + ' votes.' +
                (diceBonus > 0 ? ' (d6 bonus: ' + diceBonus + ')' : ''));
        }
        advanceTurn();
        return { success: true, message: votes >= adjustedThreshold ? 'Bill passed the Senate!' : 'Bill failed.' };
    }

    function senateReviveBill(billIndex) {
        if (billIndex < 0 || billIndex >= state.passedBills.length) {
            return { success: false, message: 'Invalid bill index.' };
        }
        var bill = state.passedBills.splice(billIndex, 1)[0];
        bill.passedByHouse = false;
        bill.passedBySenate = false;
        addBillToFloor(bill);
        addLog('senate', 'Revive Bill', 'Bill "' + bill.name + '" returned to floor.');
        advanceTurn();
        return { success: true, message: 'Bill revived.' };
    }

    function senateRepealBill(billIndex) {
        if (billIndex < 0 || billIndex >= state.passedBills.length) {
            return { success: false, message: 'Invalid bill index.' };
        }
        var origBill = state.passedBills[billIndex];
        var repealBill = {
            name: 'Repeal: ' + origBill.name,
            partisanship: clampBillStat(21 - origBill.partisanship),
            popularity: origBill.popularity,
            legality: origBill.legality,
            type: 'repeal',
            markers: ['R'],
            passedByHouse: false,
            passedBySenate: false,
            isImpeachment: false,
            isPackCourts: false,
            isTaxCuts: false,
            isRepeal: true,
            originalBillIndex: billIndex,
            houseVotes: 0,
            senateVotes: 0
        };
        addBillToFloor(repealBill);
        addLog('senate', 'Repeal Bill', 'Repeal bill for "' + origBill.name + '" on floor.');
        advanceTurn();
        return { success: true, message: 'Repeal bill placed.' };
    }

    function senateGovernmentShutdown() {
        if (state.senate.governmentShutdownUsedThisRound) return { success: false, message: 'Already used this round.' };
        if (state.senate.governmentShutdownsUsed >= Config.PER_GAME_LIMITS.governmentShutdowns) {
            return { success: false, message: 'Maximum shutdowns used this game.' };
        }
        if (state.senate.pc < 6) return { success: false, message: 'Need 6 PC.' };

        state.senate.pc -= 6;
        state.senate.governmentShutdownsUsed++;
        state.senate.governmentShutdownUsedThisRound = true;
        state.house.pc = 0;
        state.president.popularity = clampPopularity(state.president.popularity - 4);
        state.senate.vp -= 2;
        addLog('senate', 'Government Shutdown', 'House PC set to 0, -4 President Popularity. -2 VP backlash.');
        advanceTurn();
        return { success: true, message: 'Government shutdown!' };
    }

    // --- Supreme Court Actions ---
    function courtJudicialReview(billIndex, vpSpent, ruling) {
        var bill;
        if (billIndex === -1) {
            // Review current bill (if passed this round or last)
            bill = state.passedBills[state.passedBills.length - 1];
        } else {
            bill = state.passedBills[billIndex];
        }
        if (!bill) return { success: false, message: 'No bill to review.' };
        if (bill.markers && bill.markers.indexOf('C') !== -1) {
            return { success: false, message: 'Bill already declared constitutional.' };
        }

        // Remand option — skip vote calculation entirely
        if (ruling === 'remand') {
            var remandIdx = state.passedBills.indexOf(bill);
            if (remandIdx !== -1) state.passedBills.splice(remandIdx, 1);
            bill.legality = 10;
            bill.partisanship = bill.partisanship > 10
                ? clampBillStat(bill.partisanship - 2)
                : (bill.partisanship < 10 ? clampBillStat(bill.partisanship + 2) : bill.partisanship);
            bill.popularity = clampBillStat(bill.popularity - 3);
            bill.passedByHouse = false;
            bill.passedBySenate = false;
            bill.markers = bill.markers || [];
            bill.markers.push('REMAND');
            addBillToFloor(bill);
            state.supremeCourt.vp += 3;
            state.supremeCourt.jp += 1;
            addLog('supremeCourt', 'Judicial Review', '"' + bill.name + '" REMANDED to floor. Legality=10, partisanship shifted toward center, -3 pop. +3 VP, +1 JP.');
            state.pendingSue = false;
            advanceTurn();
            return { success: true, message: 'Bill remanded to floor.', result: { result: 'remand' } };
        }

        var bonusFor = 0, bonusAgainst = 0;
        if (vpSpent >= 5) { bonusAgainst += 2; state.supremeCourt.vp -= 5; }
        else if (vpSpent >= 2) { bonusAgainst += 1; state.supremeCourt.vp -= 2; }

        var sentByPres = state.pendingSue || false;
        var result = calculateJudicialReview(bill, bonusFor, bonusAgainst, sentByPres);

        if (result.result === 'unconstitutional') {
            var swingVote = Math.abs(result.unconstitutional - result.constitutional) === 1;
            var unanimous = result.constitutional === 0;
            var reviewVP = swingVote ? 15 : 10;
            if (unanimous) reviewVP += 3;
            state.supremeCourt.vp += reviewVP;
            state.supremeCourt.jp += 1;
            // Rescind VP earned by all players from this bill
            var rescinded = bill.vpEarned || { president: 0, house: 0, senate: 0, supremeCourt: 0 };
            state.president.vp -= rescinded.president;
            state.house.vp -= rescinded.house;
            state.senate.vp -= rescinded.senate;
            state.supremeCourt.vp -= rescinded.supremeCourt;
            var rescindDetails = 'Pres ' + rescinded.president + ', House ' + rescinded.house +
                ', Senate ' + rescinded.senate + ', SC ' + rescinded.supremeCourt;
            addLog('supremeCourt', 'Judicial Review', '"' + bill.name + '" ruled UNCONSTITUTIONAL! +' + reviewVP + ' VP' + (swingVote ? ' (Swing Vote!)' : '') + (unanimous ? ' (Unanimous!)' : '') + ', +1 JP. VP rescinded: ' + rescindDetails);
            var idx = state.passedBills.indexOf(bill);
            if (idx !== -1) state.passedBills.splice(idx, 1);
            state.unconstitutionalBills.push(bill);
        } else {
            var unanimousCon = result.unconstitutional === 0;
            var conVP = unanimousCon ? 8 : 5;
            state.supremeCourt.vp += conVP;
            state.supremeCourt.jp += 1;
            bill.markers = bill.markers || [];
            bill.markers.push('C');
            addLog('supremeCourt', 'Judicial Review', '"' + bill.name + '" ruled CONSTITUTIONAL. +' + conVP + ' VP' + (unanimousCon ? ' (Unanimous!)' : '') + ', +1 JP. Cannot be reviewed again.');
        }

        // Store precedent
        state.precedents.push({
            partisanship: bill.partisanship,
            popularity: bill.popularity,
            ruling: result.result
        });

        state.pendingSue = false;
        advanceTurn();
        return { success: true, message: 'Ruling: ' + result.result, result: result };
    }

    function courtInquiryPresident(choice) {
        if (choice === 'hurt') {
            state.president.popularity = clampPopularity(state.president.popularity - 2);
            addLog('supremeCourt', 'Inquiry of President', '-2 President Popularity. +1 VP.');
        } else {
            state.president.popularity = clampPopularity(state.president.popularity + 1);
            addLog('supremeCourt', 'Inquiry of President', '+1 President Popularity. +1 VP.');
        }
        state.supremeCourt.vp += 1;
        advanceTurn();
        return { success: true, message: 'Inquiry complete.' };
    }

    function courtInquiryChamber(target, choice) {
        if (target !== 'house' && target !== 'senate') return { success: false, message: 'Invalid target.' };
        if (choice === 'hurt') {
            state[target].pc = Math.max(0, state[target].pc - 2);
            addLog('supremeCourt', 'Inquiry of ' + Config.ROLE_LABELS[target], '-2 PC. +1 VP.');
        } else {
            state[target].pc += 1;
            addLog('supremeCourt', 'Inquiry of ' + Config.ROLE_LABELS[target], '+1 PC. +1 VP.');
        }
        state.supremeCourt.vp += 1;
        advanceTurn();
        return { success: true, message: 'Inquiry complete.' };
    }

    function courtInvestigateEO() {
        if (state.supremeCourt.investigateEOUsedThisRound) {
            return { success: false, message: 'Already used this round.' };
        }
        if (state.president.executiveOrdersThisRound < 2) {
            return { success: false, message: 'President must have used EO at least twice this round.' };
        }
        if (state.president.witchhuntProtectedNextRound) {
            return { success: false, message: 'President is protected by witchhunt declaration.' };
        }
        state.supremeCourt.investigateEOUsedThisRound = true;
        state.president.vp -= 2;
        state.president.popularity = clampPopularity(state.president.popularity - 2);
        state.house.pc += 1;
        state.senate.pc += 1;
        addLog('supremeCourt', 'Investigate Executive Orders', 'President -2 VP, -2 Pop. House/Senate +1 PC.');
        advanceTurn();
        return { success: true, message: 'Executive orders investigated.' };
    }

    function courtInvestigateBill() {
        if (!getActiveBill()) return { success: false, message: 'No bill on floor.' };
        var bill = getActiveBill();
        if (bill.isPackCourts) return { success: false, message: 'Cannot investigate Pack the Courts.' };
        bill.legality = clampBillStat(bill.legality - 2);
        addLog('supremeCourt', 'Investigate Bill', 'Bill legality -2. Now: ' + bill.legality);
        advanceTurn();
        return { success: true, message: 'Bill investigated.' };
    }

    function courtBillReview(partAdj, popAdj) {
        if (!getActiveBill()) return { success: false, message: 'No bill on floor.' };
        if (state.supremeCourt.billReviewUsedThisRound) return { success: false, message: 'Already used this round.' };
        state.supremeCourt.billReviewUsedThisRound = true;
        var bill = getActiveBill();
        bill.legality = clampBillStat(bill.legality + 2);
        // 2 points total adjustment across partisanship and popularity
        partAdj = clamp(partAdj || 0, -2, 2);
        popAdj = clamp(popAdj || 0, -2, 2);
        var totalAdj = Math.abs(partAdj) + Math.abs(popAdj);
        if (totalAdj > 2) {
            var scale = 2 / totalAdj;
            partAdj = Math.round(partAdj * scale);
            popAdj = Math.round(popAdj * scale);
        }
        bill.partisanship = clampBillStat(bill.partisanship + partAdj);
        bill.popularity = clampBillStat(bill.popularity + popAdj);
        state.supremeCourt.vp += 2;
        state.supremeCourt.jp += 1;
        addLog('supremeCourt', 'Bill Review', 'Bill legality +2, partisanship ' + (partAdj >= 0 ? '+' : '') + partAdj + ', popularity ' + (popAdj >= 0 ? '+' : '') + popAdj + '. +2 VP, +1 JP.');
        advanceTurn();
        return { success: true, message: 'Bill reviewed.' };
    }

    function courtDisapproveJustice(preferredLeaning) {
        if (!state.justiceNominated) return { success: false, message: 'No justice nominated.' };
        if (state.justiceNominated.disapproved) return { success: false, message: 'Already disapproved this nominee.' };

        // SC puts forward a different leaning than the President nominated
        var altLeaning = preferredLeaning || 'moderate';
        state.justiceNominated.disapproved = true;
        state.justiceNominated.scPreferredLeaning = altLeaning;

        // President must re-nominate: if they pick a different leaning than SC wants, they pay -2 VP, -2 Pop
        // For now, cancel the current nomination — President must use assignJustice again
        var oldLeaning = state.justiceNominated.leaning;
        state.pendingJustice = state.justiceNominated.vacancy;
        state.justiceSuggestedByCourt = altLeaning;
        state.justiceNominated = null;

        addLog('supremeCourt', 'Disapprove Justice', 'Disapproved ' + oldLeaning + ' nominee. Suggests ' + altLeaning + ' instead. President must re-nominate or pay -2 VP, -2 Pop.');
        advanceTurn();
        return { success: true, message: 'Justice disapproved. President must re-nominate.' };
    }

    function courtSuggestJustice(leaning) {
        if (state.supremeCourt.suggestJusticeUsedThisRound) {
            return { success: false, message: 'Already used this round.' };
        }
        if (!state.pendingJustice) return { success: false, message: 'No vacancy.' };
        state.supremeCourt.suggestJusticeUsedThisRound = true;
        state.justiceSuggestedByCourt = leaning;
        addLog('supremeCourt', 'Suggest Justice', 'Court suggests a ' + leaning + ' justice.');
        advanceTurn();
        return { success: true, message: 'Justice suggested.' };
    }

    function courtGeneralCourt() {
        if (state.supremeCourt.generalCourtUsedThisRound) {
            return { success: false, message: 'Already used this round.' };
        }
        state.supremeCourt.generalCourtUsedThisRound = true;
        state.supremeCourt.vp += 2;
        state.supremeCourt.jp += 1;
        addLog('supremeCourt', 'General Court', '+2 VP, +1 JP.');
        advanceTurn();
        return { success: true, message: 'General cases heard.' };
    }

    function courtAdvisoryRole() {
        if (state.supremeCourt.advisoryUsedThisRound) {
            return { success: false, message: 'Already used this round.' };
        }
        // 2-of-3 alignment check
        var courtLeaning = getCourtMajority();
        var presParty = state.president.party;
        var houseParty = state.house.majorityParty;
        var demLib = 0, repCon = 0;
        if (presParty === 'democrat') demLib++; else repCon++;
        if (houseParty === 'democrat') demLib++; else repCon++;
        if (courtLeaning === 'liberal') demLib++; else if (courtLeaning === 'conservative') repCon++;
        var aligned = demLib >= 2 || repCon >= 2;
        if (!aligned) return { success: false, message: 'At least 2 branches must lean same direction.' };

        state.supremeCourt.advisoryUsedThisRound = true;
        state.supremeCourt.vp += 2;
        state.supremeCourt.jp += 1;
        addLog('supremeCourt', 'Advisory Role', '2+ branches aligned. +2 VP, +1 JP. May adjust bill.');
        advanceTurn();
        return { success: true, message: 'Advisory role taken.' };
    }

    function courtInternalInquiry() {
        if (state.supremeCourt.internalInquiryUsedThisRound) {
            return { success: false, message: 'Already used this round.' };
        }
        if (state.supremeCourt.internalInquiryUsed >= Config.PER_GAME_LIMITS.internalInquiry) {
            return { success: false, message: 'Maximum internal inquiries used.' };
        }
        if (state.supremeCourt.jp < 2) return { success: false, message: 'Need 2 JP.' };

        state.supremeCourt.jp -= 2;
        state.supremeCourt.internalInquiryUsedThisRound = true;
        state.supremeCourt.internalInquiryUsed++;

        var roll = rollD20();
        if (roll >= 10) {
            // Force retirement
            state.pendingJustice = { type: 'retirement', forced: true };
            addLog('supremeCourt', 'Internal Inquiry', 'Rolled ' + roll + ' — justice retires!');
        } else {
            addLog('supremeCourt', 'Internal Inquiry', 'Rolled ' + roll + ' — no retirement.');
        }
        advanceTurn();
        return { success: true, message: roll >= 10 ? 'Justice forced to retire!' : 'Inquiry unsuccessful.' };
    }

    function courtPartisanRuling(direction) {
        if (state.supremeCourt.partisanRulingUsedThisRound) {
            return { success: false, message: 'Already used this round.' };
        }
        if (state.supremeCourt.partisanRulingUsed >= Config.PER_GAME_LIMITS.partisanRuling) {
            return { success: false, message: 'Maximum partisan rulings used.' };
        }
        if (state.supremeCourt.actionsRemaining < 2) return { success: false, message: 'Needs 2 actions.' };
        if (state.supremeCourt.jp < 4) return { success: false, message: 'Need 4 JP.' };

        state.supremeCourt.jp -= 4;
        state.supremeCourt.partisanRulingUsed++;
        state.supremeCourt.partisanRulingUsedThisRound = true;
        state.supremeCourt.actionsRemaining -= 1;
        // Permanently shift all partisanship
        // direction: 1 = more liberal (increase), -1 = more conservative (decrease)
        var activeBill = getActiveBill();
        if (activeBill) {
            activeBill.partisanship = clampBillStat(activeBill.partisanship + direction);
        }
        addLog('supremeCourt', 'Partisan Ruling', 'All future bills shift partisanship by ' + direction + '.');
        advanceTurn();
        return { success: true, message: 'Partisan ruling issued.' };
    }

    function courtAmicusBrief() {
        if (!getActiveBill()) return { success: false, message: 'No bill on the floor.' };
        if (state.supremeCourt.amicusBriefUsedThisRound) return { success: false, message: 'Already used this round.' };
        if (state.supremeCourt.jp < 2) return { success: false, message: 'Need 2 JP.' };

        state.supremeCourt.jp -= 2;
        state.supremeCourt.amicusBriefUsedThisRound = true;
        state.supremeCourt.vp += 2;
        var bill = getActiveBill();
        bill.legality = clampBillStat(bill.legality - 4);
        addLog('supremeCourt', 'Amicus Brief', '+2 VP, current bill legality -4 (now ' + bill.legality + ').');
        advanceTurn();
        return { success: true, message: 'Amicus brief filed! +2 VP, legality -4.' };
    }

    function courtConstitutionalCrisis() {
        if (state.supremeCourt.constitutionalCrisisUsed >= Config.PER_GAME_LIMITS.constitutionalCrisis) {
            return { success: false, message: 'Maximum crises used.' };
        }
        if (state.supremeCourt.actionsRemaining < 2) return { success: false, message: 'Needs 2 actions.' };
        if (state.supremeCourt.jp < 8) return { success: false, message: 'Need 8 JP.' };

        state.supremeCourt.jp -= 8;
        state.supremeCourt.constitutionalCrisisUsed++;
        state.supremeCourt.actionsRemaining -= 1;
        state.supremeCourt.legalityModifier -= 2;

        // Lower all passed bill legality
        for (var i = 0; i < state.passedBills.length; i++) {
            state.passedBills[i].legality = clampBillStat(state.passedBills[i].legality - 2);
        }
        var activeBill = getActiveBill();
        if (activeBill) {
            activeBill.legality = clampBillStat(activeBill.legality - 2);
        }

        addLog('supremeCourt', 'Constitutional Crisis', 'All legality permanently -2!');
        advanceTurn();
        return { success: true, message: 'Constitutional crisis declared!' };
    }

    // Writ of Certiorari — target a passed bill, legality -3, +1 VP. Once per bill.
    function courtCertiorari(billIndex) {
        if (billIndex < 0 || billIndex >= state.passedBills.length) {
            return { success: false, message: 'Invalid bill index.' };
        }
        if (state.supremeCourt.jp < 1) return { success: false, message: 'Need 1 JP.' };
        var bill = state.passedBills[billIndex];
        if (bill.certiorariUsed) return { success: false, message: 'Certiorari already granted for this bill.' };

        state.supremeCourt.jp -= 1;
        bill.certiorariUsed = true;
        bill.legality = clampBillStat(bill.legality - 3);
        state.supremeCourt.vp += 1;
        addLog('supremeCourt', 'Writ of Certiorari', 'Cert granted for "' + bill.name + '". Legality -3 (now ' + bill.legality + '). +1 VP.');
        advanceTurn();
        return { success: true, message: 'Certiorari granted!' };
    }

    // Oral Arguments — current bill partisanship moves 2 toward center, +2 VP. Once per round.
    function courtOralArguments() {
        if (!getActiveBill()) return { success: false, message: 'No bill on the floor.' };
        if (state.supremeCourt.oralArgumentsUsedThisRound) return { success: false, message: 'Already used this round.' };

        state.supremeCourt.oralArgumentsUsedThisRound = true;
        var bill = getActiveBill();
        var shift = bill.partisanship > 10 ? -2 : (bill.partisanship < 10 ? 2 : 0);
        bill.partisanship = clampBillStat(bill.partisanship + shift);
        state.supremeCourt.vp += 2;
        addLog('supremeCourt', 'Oral Arguments', 'Bill partisanship shifted ' + shift + ' toward center (now ' + bill.partisanship + '). +2 VP.');
        advanceTurn();
        return { success: true, message: 'Oral arguments concluded.' };
    }

    // Injunction — block bill from being voted on rest of round. Once per game, 3 JP.
    function courtInjunction() {
        if (!getActiveBill()) return { success: false, message: 'No bill on the floor.' };
        if (state.supremeCourt.injunctionUsed) return { success: false, message: 'Already used this game.' };
        if (state.supremeCourt.jp < 3) return { success: false, message: 'Need 3 JP.' };

        state.supremeCourt.jp -= 3;
        state.supremeCourt.injunctionUsed = true;
        state.billKilledThisRound = true;
        getActiveBill().killed = true;
        state.supremeCourt.vp += 1;
        addLog('supremeCourt', 'Injunction', 'Bill blocked from votes this round! +1 VP.');
        advanceTurn();
        return { success: true, message: 'Injunction issued!' };
    }

    // Clerks Research — gain +2 JP. Once per round.
    function courtClerksResearch() {
        if (state.supremeCourt.clerksResearchUsedThisRound) return { success: false, message: 'Already used this round.' };

        state.supremeCourt.clerksResearchUsedThisRound = true;
        state.supremeCourt.jp += 2;
        addLog('supremeCourt', 'Clerks Research', '+2 JP (now ' + state.supremeCourt.jp + ').');
        advanceTurn();
        return { success: true, message: 'Clerks completed research.' };
    }

    function courtRecusal(leaning) {
        if (state.supremeCourt.recusalUsedThisRound) {
            return { success: false, message: 'Recusal already used this round.' };
        }
        if (state.supremeCourt.jp < 1) return { success: false, message: 'Need 1 JP.' };

        var justiceIdx = -1;
        for (var i = 0; i < state.supremeCourt.justices.length; i++) {
            if (state.supremeCourt.justices[i].leaning === leaning) {
                justiceIdx = i;
                break;
            }
        }
        if (justiceIdx === -1) return { success: false, message: 'No justice with leaning: ' + leaning };

        state.supremeCourt.jp -= 1;
        state.supremeCourt.recusedJusticeIndex = justiceIdx;
        state.supremeCourt.recusalUsedThisRound = true;
        addLog('supremeCourt', 'Recusal', 'Justice #' + justiceIdx + ' (' + leaning + ') recused from judicial review this round.');
        advanceTurn();
        return { success: true, message: leaning + ' justice recused.' };
    }

    function courtLandmarkRuling(effect) {
        if (state.supremeCourt.landmarkRulingUsed) {
            return { success: false, message: 'Landmark ruling already used this game.' };
        }
        if (state.supremeCourt.actionsRemaining < 2) return { success: false, message: 'Needs 2 actions.' };
        if (state.supremeCourt.jp < 6) return { success: false, message: 'Need 6 JP.' };

        var validEffects = ['extraAction', 'legalityStandard', 'courtAuthority', 'precedentPower'];
        if (validEffects.indexOf(effect) === -1) return { success: false, message: 'Invalid landmark effect.' };

        state.supremeCourt.jp -= 6;
        state.supremeCourt.actionsRemaining -= 1;
        state.supremeCourt.landmarkRulingUsed = true;
        state.supremeCourt.landmarkEffect = effect;
        state.perGameLimits.landmarkRuling = 0;

        var desc = '';
        if (effect === 'extraAction') {
            state.supremeCourt.baseActionsPerRound = 5;
            desc = 'SC permanently gets 5 actions per round.';
        } else if (effect === 'legalityStandard') {
            state.supremeCourt.legalityModifier += 3;
            desc = 'All future bills start with +3 legality.';
        } else if (effect === 'courtAuthority') {
            state.supremeCourt.judicialReviewBonus += 2;
            desc = 'All future judicial reviews get +2 unconstitutional votes.';
        } else if (effect === 'precedentPower') {
            desc = 'All precedent effects are doubled.';
        }

        addLog('supremeCourt', 'Landmark Ruling', 'Landmark ruling issued: ' + effect + '. ' + desc);
        advanceTurn();
        return { success: true, message: 'Landmark ruling: ' + desc };
    }

    // --- Co-Action: Constitutional Amendment ---
    function proposeAmendment(role, billIndex, destination) {
        if (role !== 'president' && role !== 'house' && role !== 'senate') {
            return { success: false, message: 'Only President, House, or Senate can propose.' };
        }
        if (state.pendingAmendment) {
            return { success: false, message: 'An amendment is already pending.' };
        }
        if (!state.unconstitutionalBills || state.unconstitutionalBills.length === 0) {
            return { success: false, message: 'No unconstitutional bills to amend.' };
        }
        if (state.president.popularity < 15) {
            return { success: false, message: 'President popularity must be ≥ 15.' };
        }
        var rs = state[role];
        if (rs.actionsRemaining < 2) return { success: false, message: 'Need 2 actions to propose.' };
        if (rs.vp < 1) return { success: false, message: 'Need 1 VP to propose.' };
        if (role === 'house' && state.house.pc < 1) return { success: false, message: 'House needs 1 PC.' };
        if (role === 'senate' && state.senate.pc < 1) return { success: false, message: 'Senate needs 1 PC.' };

        var bill = state.unconstitutionalBills[billIndex];
        if (!bill) return { success: false, message: 'Invalid bill index.' };

        // Deduct costs for proposer
        rs.actionsRemaining -= 1; // uses 1 action now, 1 consumed by advanceTurn
        rs.vp -= 1;
        if (role === 'president') {
            state.president.popularity = clampPopularity(state.president.popularity - 1);
        }
        if (role === 'house') state.house.pc -= 1;
        if (role === 'senate') state.senate.pc -= 1;

        state.pendingAmendment = {
            billIndex: billIndex,
            bill: bill,
            destination: destination || 'floor', // 'floor' or 'drawPile'
            proposedBy: role,
            agreed: [role],
            needed: ['president', 'house', 'senate'].filter(function(r) { return r !== role; })
        };

        addLog(role, 'Constitutional Amendment', 'Proposed amendment to restore "' + bill.name + '". Waiting for ' + state.pendingAmendment.needed.join(' and ') + ' to agree.');
        advanceTurn();
        return { success: true, message: 'Amendment proposed! Other players must agree.' };
    }

    function agreeAmendment(role) {
        if (!state.pendingAmendment) {
            return { success: false, message: 'No pending amendment.' };
        }
        var amendment = state.pendingAmendment;
        if (amendment.agreed.indexOf(role) !== -1) {
            return { success: false, message: 'You already agreed.' };
        }
        if (amendment.needed.indexOf(role) === -1) {
            return { success: false, message: 'Your agreement is not needed.' };
        }

        var rs = state[role];
        if (rs.actionsRemaining < 2) return { success: false, message: 'Need 2 actions to agree.' };
        if (rs.vp < 1) return { success: false, message: 'Need 1 VP to agree.' };
        if (role === 'house' && state.house.pc < 1) return { success: false, message: 'House needs 1 PC.' };
        if (role === 'senate' && state.senate.pc < 1) return { success: false, message: 'Senate needs 1 PC.' };

        // Deduct costs
        rs.actionsRemaining -= 1;
        rs.vp -= 1;
        if (role === 'president') {
            state.president.popularity = clampPopularity(state.president.popularity - 1);
        }
        if (role === 'house') state.house.pc -= 1;
        if (role === 'senate') state.senate.pc -= 1;

        amendment.agreed.push(role);
        amendment.needed.splice(amendment.needed.indexOf(role), 1);

        addLog(role, 'Constitutional Amendment', 'Agreed to amendment for "' + amendment.bill.name + '".');

        // Check if all 3 have agreed
        if (amendment.agreed.length >= 3) {
            return executeAmendment();
        }

        advanceTurn();
        return { success: true, message: 'Agreement recorded. Waiting for ' + amendment.needed.join(', ') + '.' };
    }

    function rejectAmendment(role) {
        if (!state.pendingAmendment) {
            return { success: false, message: 'No pending amendment.' };
        }
        var billName = state.pendingAmendment.bill.name;
        state.pendingAmendment = null;
        addLog(role, 'Constitutional Amendment', 'Rejected amendment for "' + billName + '". Amendment cancelled.');
        advanceTurn();
        return { success: true, message: 'Amendment rejected and cancelled.' };
    }

    function executeAmendment() {
        var amendment = state.pendingAmendment;
        var bill = amendment.bill;

        // Remove from unconstitutional bills
        var idx = state.unconstitutionalBills.indexOf(bill);
        if (idx !== -1) state.unconstitutionalBills.splice(idx, 1);

        // Mark as constitutional
        bill.markers = bill.markers || [];
        bill.markers.push('C');

        // Reset bill passage flags so it can be worked on again
        bill.passedByHouse = false;
        bill.passedBySenate = false;

        if (amendment.destination === 'floor') {
            addBillToFloor(bill);
            addLog('system', 'Constitutional Amendment', '"' + bill.name + '" restored to floor as constitutional!');
        } else {
            // "Draw pile" — bill goes away, generate new bill next time
            state.passedBills.push(bill);
            addLog('system', 'Constitutional Amendment', '"' + bill.name + '" restored to passed bills as constitutional!');
        }

        // Supreme Court loses 5 VP
        state.supremeCourt.vp -= 5;
        addLog('system', 'Constitutional Amendment', 'Supreme Court loses 5 VP from amendment.');

        state.pendingAmendment = null;
        advanceTurn();
        return { success: true, message: 'Constitutional Amendment passed! "' + bill.name + '" declared constitutional.' };
    }

    // --- National Unity Summit Co-Action ---
    function proposeUnitySummit(role) {
        if (state.pendingUnitySummit) {
            return { success: false, message: 'A Unity Summit is already pending.' };
        }
        if (state.stability >= 8) {
            return { success: false, message: 'Stability is already high (≥8). No summit needed.' };
        }
        var rs = state[role];
        if (rs.actionsRemaining < 2) return { success: false, message: 'Need 2 actions to propose.' };
        if (rs.vp < 2) return { success: false, message: 'Need 2 VP to propose summit.' };

        rs.actionsRemaining -= 1; // 1 action now, 1 from advanceTurn
        rs.vp -= 2;

        state.pendingUnitySummit = {
            proposedBy: role,
            agreed: [role],
            needed: Config.ROLES.filter(function(r) { return r !== role; }),
            round: state.round
        };

        addLog(role, 'Unity Summit', '🕊️ Proposed National Unity Summit! Needs 3/4 roles to agree. (4/4 = +3 stability)');
        advanceTurn();
        return { success: true, message: 'Unity Summit proposed! Other players must agree.' };
    }

    function agreeUnitySummit(role) {
        if (!state.pendingUnitySummit) {
            return { success: false, message: 'No pending Unity Summit.' };
        }
        var summit = state.pendingUnitySummit;
        if (summit.agreed.indexOf(role) !== -1) {
            return { success: false, message: 'Already agreed to this summit.' };
        }
        if (summit.needed.indexOf(role) === -1) {
            return { success: false, message: 'Not needed for this summit.' };
        }

        var rs = state[role];
        if (rs.actionsRemaining < 1) return { success: false, message: 'Need 1 action to agree.' };
        if (rs.vp < 1) return { success: false, message: 'Need 1 VP to agree.' };

        rs.vp -= 1;
        summit.agreed.push(role);
        summit.needed = summit.needed.filter(function(r) { return r !== role; });
        addLog(role, 'Unity Summit', 'Agreed to National Unity Summit.');

        // Check if 3/4 have agreed (minimum threshold)
        if (summit.agreed.length >= 3 && summit.needed.length <= 1) {
            return resolveUnitySummit(role);
        }

        advanceTurn();
        return { success: true, message: 'Agreed to Unity Summit. Waiting for others.' };
    }

    function rejectUnitySummit(role) {
        if (!state.pendingUnitySummit) {
            return { success: false, message: 'No pending Unity Summit.' };
        }
        var summitProposer = state.pendingUnitySummit.proposedBy;
        state.pendingUnitySummit = null;
        addLog(role, 'Unity Summit', '❌ Rejected Unity Summit. Summit cancelled.');
        advanceTurn();
        return { success: true, message: 'Unity Summit rejected and cancelled.' };
    }

    function resolveUnitySummit(triggerRole) {
        var summit = state.pendingUnitySummit;
        var allAgreed = summit.agreed.length === 4;
        var stabilityGain = allAgreed ? 3 : 2;

        state.stability = Math.min(10, state.stability + stabilityGain);

        var vpReward = allAgreed ? 2 : 1;
        for (var i = 0; i < summit.agreed.length; i++) {
            state[summit.agreed[i]].vp += vpReward;
        }

        addLog('system', 'Unity Summit', '🕊️ National Unity Summit succeeded! ' +
            summit.agreed.length + '/4 roles participated. Stability +' + stabilityGain +
            ' (now ' + state.stability + '). Participants +' + vpReward + ' VP.');

        state.pendingUnitySummit = null;
        advanceTurn();
        return { success: true, message: 'Unity Summit passed! Stability +' + stabilityGain + '.' };
    }

    // --- Bill Passage Completion ---
    function completeBillPassage(bill) {
        state.billPassedThisRound = true;
        state.passedBills.push(bill);
        bill.vpEarned = bill.vpEarned || { president: 0, house: 0, senate: 0, supremeCourt: 0 };

        // President passive: gains VP for bill passage
        var presVP = 5;
        if (bill.partisanship === 10) {
            presVP += 1;
        } else {
            var diff = bill.partisanship - 10;
            if (state.president.party === 'democrat') {
                presVP += diff; // positive if liberal bill
            } else {
                presVP -= diff; // positive if conservative bill
            }
        }
        state.president.vp += presVP;
        bill.vpEarned.president += presVP;

        // Popularity effect
        if (bill.popularity <= 5) {
            state.president.popularity = clampPopularity(state.president.popularity - 2);
        } else if (bill.popularity <= 10) {
            state.president.popularity = clampPopularity(state.president.popularity - 1);
        }

        // Track low-legality bills for impeachment
        if (bill.legality < 10) state.president.billsSignedLowLegality++;

        // Handle special bills
        if (bill.isImpeachment) {
            state.president.vp -= 8;
            state.house.vp += 6;
            state.senate.vp += 2;
            bill.vpEarned.president -= 8;
            bill.vpEarned.house += 6;
            bill.vpEarned.senate += 2;
        }
        if (bill.isPackCourts) {
            // Add 4 justices
            var courtLeaning = state.house.majorityParty === 'democrat' ? 'liberal' : 'conservative';
            for (var i = 0; i < 4; i++) {
                state.supremeCourt.justices.push({
                    leaning: courtLeaning,
                    id: state.supremeCourt.justices.length
                });
            }
            state.supremeCourt.courtSize = Config.COURT_PACKED_SIZE;
            state.supremeCourt.isPacked = true;
            state.supremeCourt.vp -= 10;
            bill.vpEarned.supremeCourt -= 10;
        }
        if (bill.isTaxCuts) {
            state.president.popularity = clampPopularity(state.president.popularity + 2);
            state.president.vp += 2;
            bill.vpEarned.president += 2;
        }
        if (bill.isRepeal && bill.originalBillIndex >= 0) {
            // Find the original bill safely, since indices may have shifted
            var repealIdx = bill.originalBillIndex;
            if (repealIdx < state.passedBills.length && state.passedBills[repealIdx] !== bill) {
                state.passedBills.splice(repealIdx, 1);
            }
            state.senate.vp += 2;
            state.house.vp += 2;
            bill.vpEarned.senate += 2;
            bill.vpEarned.house += 2;
        }

        // SC passive: -1 VP when bill signed
        state.supremeCourt.vp -= 1;
        bill.vpEarned.supremeCourt -= 1;

        // Rider Amendment: if House attached a rider and bill passes both chambers
        if (bill.riderForHouse) {
            state.house.vp += 3;
            bill.vpEarned.house += 3;
            addLog('house', 'Rider Amendment', 'Rider on "' + bill.name + '" pays out! House +3 VP.');
        }

        // Check precedents — only when bill passed by both house and senate
        if (bill.passedByHouse && bill.passedBySenate) {
            for (var pi = 0; pi < state.precedents.length; pi++) {
                var prec = state.precedents[pi];
                if (prec.partisanship === bill.partisanship && prec.popularity === bill.popularity) {
                    var legChange = 3;
                    var vpGain;
                    if (state.supremeCourt.landmarkEffect === 'precedentPower') {
                        legChange = 6;
                    }
                    if (prec.ruling === 'unconstitutional') {
                        bill.legality = clampBillStat(bill.legality - legChange);
                        vpGain = state.supremeCourt.landmarkEffect === 'precedentPower' ? 4 : 2;
                        state.supremeCourt.vp += vpGain;
                        addLog('supremeCourt', 'Precedent Applied', 'Precedent (unconstitutional) matched "' + bill.name + '". Legality -' + legChange + ', SC +' + vpGain + ' VP.');
                    } else {
                        bill.legality = clampBillStat(bill.legality + legChange);
                        vpGain = state.supremeCourt.landmarkEffect === 'precedentPower' ? 2 : 1;
                        state.supremeCourt.vp += vpGain;
                        addLog('supremeCourt', 'Precedent Applied', 'Precedent (constitutional) matched "' + bill.name + '". Legality +' + legChange + ', SC +' + vpGain + ' VP.');
                    }
                    state.supremeCourt.jp += 1;
                    break;
                }
            }
        }

        // Generate new bill for next action
        if (!bill.isTaxCuts) {
            removeBillFromFloor(bill.id);
            if (state.bills.length === 0) {
                addBillToFloor(generateBill());
            }
        }
    }

    // --- Elections ---
    function processElections() {
        var results = [];

        // Supreme Court turnover — every round
        var courtResult = processCourtTurnover();
        if (courtResult) results.push(courtResult);

        // House elections — every 2 rounds
        if (state.round % 2 === 0) {
            var houseResult = processHouseElection();
            results.push(houseResult);
        }

        // Senate elections — every 2 rounds
        if (state.round % 2 === 0) {
            var senateResult = processSenateElection();
            results.push(senateResult);
        }

        // Presidential election — every 4 rounds
        if (state.round % 4 === 0) {
            var presResult = processPresidentialElection();
            results.push(presResult);
        }

        state.electionLog.push({ round: state.round, results: results });
        return results;
    }

    function processCourtTurnover() {
        var roll = rollD20();
        var result = { type: 'court', roll: roll, event: null };

        var majority = getCourtMajority();
        var removeLeaning = null;
        var vacancyType = null;

        if (roll === 1) { removeLeaning = majority === 'liberal' ? 'liberal' : 'conservative'; vacancyType = 'death'; }
        else if (roll === 2) { removeLeaning = majority === 'liberal' ? 'liberal' : 'conservative'; vacancyType = 'retirement'; }
        else if (roll === 19) {
            removeLeaning = majority === 'liberal' ? 'conservative' : 'liberal';
            vacancyType = 'retirement';
        }
        else if (roll === 20) {
            removeLeaning = majority === 'liberal' ? 'conservative' : 'liberal';
            vacancyType = 'death';
        }
        else if (roll === 10) { removeLeaning = 'moderate'; vacancyType = 'death'; }
        else if (roll === 11) { removeLeaning = 'moderate'; vacancyType = 'retirement'; }

        if (removeLeaning) {
            // Find and remove a justice of that leaning
            for (var i = state.supremeCourt.justices.length - 1; i >= 0; i--) {
                if (state.supremeCourt.justices[i].leaning === removeLeaning) {
                    state.supremeCourt.justices.splice(i, 1);
                    state.pendingJustice = { type: vacancyType, leaning: removeLeaning };
                    result.event = removeLeaning + ' justice ' + (vacancyType === 'death' ? 'died' : 'retired');
                    addLog('election', 'Court Turnover', result.event + ' (rolled ' + roll + ')');
                    break;
                }
            }
        }
        return result;
    }

    function processHouseElection() {
        var pop = state.president.popularity;
        var comp = state.house.composition;
        var changes = [];

        if (pop <= 3) {
            // Roll 10d20 moving 2 steps away, 12d20 moving 1 step away
            var total2 = 0;
            for (var i = 0; i < 10; i++) total2 += rollD20();
            var total1 = 0;
            for (var j = 0; j < 12; j++) total1 += rollD20();
            shiftHouse(comp, state.president.party, -2, Math.min(total2, Config.HOUSE_TOTAL));
            shiftHouse(comp, state.president.party, -1, Math.min(total1, Config.HOUSE_TOTAL));
            changes.push(total2 + ' reps shift 2 steps away, ' + total1 + ' shift 1 step away');
        } else if (pop <= 8) {
            var t2 = 0;
            for (var a = 0; a < 4; a++) t2 += rollD20();
            var t1 = 0;
            for (var b = 0; b < 6; b++) t1 += rollD20();
            shiftHouse(comp, state.president.party, -2, Math.min(t2, Config.HOUSE_TOTAL));
            shiftHouse(comp, state.president.party, -1, Math.min(t1, Config.HOUSE_TOTAL));
            changes.push(t2 + ' reps shift 2 away, ' + t1 + ' shift 1 away');
        } else if (pop <= 12) {
            var ta = 0, tb = 0;
            for (var c = 0; c < 4; c++) { ta += rollD20(); tb += rollD20(); }
            shiftHouse(comp, state.president.party, -1, Math.min(ta, Config.HOUSE_TOTAL));
            shiftHouse(comp, state.president.party, 1, Math.min(tb, Config.HOUSE_TOTAL));
            changes.push(ta + ' away, ' + tb + ' toward president');
        } else if (pop <= 18) {
            var tc = 0, td = 0;
            for (var d = 0; d < 4; d++) tc += rollD20();
            for (var e = 0; e < 6; e++) td += rollD20();
            shiftHouse(comp, state.president.party, 2, Math.min(tc, Config.HOUSE_TOTAL));
            shiftHouse(comp, state.president.party, 1, Math.min(td, Config.HOUSE_TOTAL));
            changes.push(tc + ' shift 2 toward, ' + td + ' shift 1 toward');
        } else {
            var te = 0, tf = 0;
            for (var f = 0; f < 10; f++) te += rollD20();
            for (var g = 0; g < 12; g++) tf += rollD20();
            shiftHouse(comp, state.president.party, 2, Math.min(te, Config.HOUSE_TOTAL));
            shiftHouse(comp, state.president.party, 1, Math.min(tf, Config.HOUSE_TOTAL));
            changes.push(te + ' shift 2 toward, ' + tf + ' shift 1 toward');
        }

        state.house.majorityParty = getHouseMajority(comp);
        addLog('election', 'House Election', changes.join('; '));
        return { type: 'house', changes: changes, composition: JSON.parse(JSON.stringify(comp)) };
    }

    function shiftHouse(comp, presParty, steps, count) {
        // steps > 0 = toward president's party, steps < 0 = away
        var order = presParty === 'democrat' ?
            ['extremeRep', 'republican', 'democrat', 'extremeDem'] :
            ['extremeDem', 'democrat', 'republican', 'extremeRep'];

        for (var s = 0; s < Math.abs(steps); s++) {
            var remaining = count;
            if (steps > 0) {
                // Move toward president: shift from far end toward president
                for (var i = 0; i < order.length - 1 && remaining > 0; i++) {
                    var move = Math.min(comp[order[i]], remaining);
                    comp[order[i]] -= move;
                    comp[order[i + 1]] += move;
                    remaining -= move;
                }
            } else {
                // Move away from president: shift from president end away
                for (var j = order.length - 1; j > 0 && remaining > 0; j--) {
                    var moveAway = Math.min(comp[order[j]], remaining);
                    comp[order[j]] -= moveAway;
                    comp[order[j - 1]] += moveAway;
                    remaining -= moveAway;
                }
            }
        }
    }

    function processSenateElection() {
        var pop = state.president.popularity;
        var changing = rollD20() + rollD6() + rollD6();
        changing = Math.min(changing, 32);

        var comp = state.senate.composition;
        var order = state.president.party === 'democrat' ?
            ['republican', 'modRep', 'modDem', 'democrat'] :
            ['democrat', 'modDem', 'modRep', 'republican'];

        var steps = 0;
        if (pop <= 5) steps = -2;
        else if (pop <= 10) steps = -1;
        else if (pop <= 15) steps = 1;
        else steps = 2;

        // Shift senators
        for (var s = 0; s < Math.abs(steps); s++) {
            var remaining = changing;
            if (steps > 0) {
                for (var i = 0; i < order.length - 1 && remaining > 0; i++) {
                    var move = Math.min(comp[order[i]], remaining);
                    comp[order[i]] -= move;
                    comp[order[i + 1]] += move;
                    remaining -= move;
                }
            } else {
                for (var j = order.length - 1; j > 0 && remaining > 0; j--) {
                    var moveAway = Math.min(comp[order[j]], remaining);
                    comp[order[j]] -= moveAway;
                    comp[order[j - 1]] += moveAway;
                    remaining -= moveAway;
                }
            }
        }

        state.senate.majorityParty = getSenateMajority(comp);
        addLog('election', 'Senate Election', changing + ' senators shifted ' + steps + ' steps.');
        return { type: 'senate', changing: changing, steps: steps, composition: JSON.parse(JSON.stringify(comp)) };
    }

    function processPresidentialElection() {
        var pop = state.president.popularity;
        var bonus = 0;
        if (state.president.roundsInCurrentTerm <= 4) bonus = 2;
        else if (state.president.roundsInCurrentTerm <= 8) bonus = -1;

        var canRunAgain = state.president.termsServed < 2;
        var roll = rollD20();
        var effectivePop = pop + bonus;

        // If president is forced to lose due to event failure
        var forcedLoss = state.presidentLosesNextElection;
        if (forcedLoss) {
            state.presidentLosesNextElection = false; // consume the flag
        }

        var result = { type: 'president', roll: roll, effectivePop: effectivePop };

        if (forcedLoss) {
            // President automatically loses — opposing party wins
            state.president.party = state.president.party === 'democrat' ? 'republican' : 'democrat';
            state.president.popularity = 10;
            state.president.vp -= 3;
            state.president.termsServed = 1;
            state.president.roundsInCurrentTerm = 0;
            state.president.executiveOrdersTotal = 0;
            result.winner = 'oppositeParty';
            addLog('election', 'Presidential Election', '🚨 President forced out by national crisis! Opposing ' + state.president.party + ' party wins.');
        } else if (roll <= effectivePop && canRunAgain) {
            // Same president/party wins
            state.president.popularity = clampPopularity(state.president.popularity + 1);
            state.president.termsServed++;
            state.president.roundsInCurrentTerm = 0;
            result.winner = 'same';
            addLog('election', 'Presidential Election', 'Incumbent wins! Rolled ' + roll + ' vs ' + effectivePop + '.');
        } else if (roll <= effectivePop && !canRunAgain) {
            // Same party, new president
            var newPop = state.president.popularity > 15 ? 11 : 10;
            state.president.popularity = newPop;
            state.president.termsServed = 1;
            state.president.roundsInCurrentTerm = 0;
            state.president.executiveOrdersTotal = 0;
            result.winner = 'sameParty';
            addLog('election', 'Presidential Election', 'Same party wins! New president. Rolled ' + roll + '.');
        } else {
            // Different party wins
            state.president.party = state.president.party === 'democrat' ? 'republican' : 'democrat';
            state.president.popularity = 10;
            state.president.vp -= 2;
            state.president.termsServed = 1;
            state.president.roundsInCurrentTerm = 0;
            state.president.executiveOrdersTotal = 0;
            result.winner = 'oppositeParty';
            addLog('election', 'Presidential Election', 'Opposing party wins! New ' + state.president.party + ' president. Rolled ' + roll + '.');
        }
        return result;
    }

    // --- Round Management ---
    function endRound() {
        // Expire old deals and regress trust
        expireOldDeals();

        // President passive: VP for high popularity
        if (state.president.popularity > 15) {
            state.president.vp += 1;
            addLog('passive', 'President Bonus', 'Popularity > 15. +1 VP.');
        }

        // Supreme Court: Precedent Dividends — each precedent gives +1 VP per round
        if (state.precedents && state.precedents.length > 0) {
            var precVP = state.precedents.length;
            state.supremeCourt.vp += precVP;
            addLog('passive', 'Precedent Dividends', '+' + precVP + ' VP for ' + state.precedents.length + ' precedent(s).');
        }

        // Cap PC carryover
        state.senate.pc = Math.min(state.senate.pc, Config.MAX_PC_CARRYOVER);
        state.house.pc = Math.min(state.house.pc, Config.MAX_PC_CARRYOVER);

        // Process elections
        var electionResults = processElections();

        // Check if bill on floor wasn't passed — SC gets VP
        if (state.bills.length > 0 && !state.billPassedThisRound) {
            state.supremeCourt.vp += 1;
        }

        // Senate penalty: if House passed a bill but Senate didn't pass it this round
        if (state.billPassedByHouse && !state.billPassedBySenate) {
            state.senate.vp -= 1;
            addLog('passive', 'Senate Inaction', 'House passed bill but Senate did not. Senate -1 VP.');
        }

        // Advance round
        state.round++;

        if (state.round > state.maxRounds) {
            // Court Legacy: SC earns 2 VP per judicial review outcome (precedent)
            if (state.precedents && state.precedents.length > 0) {
                var legacyVP = state.precedents.length * 2;
                state.supremeCourt.vp += legacyVP;
                addLog('supremeCourt', 'Court Legacy', '+' + legacyVP + ' VP for ' + state.precedents.length + ' judicial review rulings.');
            }
            state.phase = 'gameOver';
            return;
        }

        // Reset round state
        state.phase = 'action';
        state.currentTurnIndex = 0;
        state.president.actionsRemaining = 4;
        state.house.actionsRemaining = 4;
        state.senate.actionsRemaining = 4;
        state.supremeCourt.actionsRemaining = state.supremeCourt.baseActionsPerRound;

        // Power of the Purse carry-over: President and Senate lose 1 action next round too
        if (state.purseDebuffNextRound) {
            state.president.actionsRemaining = Math.max(1, state.president.actionsRemaining - 1);
            state.senate.actionsRemaining = Math.max(1, state.senate.actionsRemaining - 1);
            state.purseDebuffNextRound = false;
            addLog('house', 'Power of the Purse', 'Continued budget pressure — President and Senate have 1 fewer action this round.');
        }

        // Court Calendar bonus (Feature #10): 5+ justices of same leaning = +1 action
        var leanCounts = { liberal: 0, conservative: 0, moderate: 0 };
        for (var ci = 0; ci < state.supremeCourt.justices.length; ci++) {
            leanCounts[state.supremeCourt.justices[ci].leaning]++;
        }
        if (leanCounts.liberal >= 5 || leanCounts.conservative >= 5 || leanCounts.moderate >= 5) {
            state.supremeCourt.actionsRemaining += 1;
            addLog('supremeCourt', 'Court Calendar', 'Supermajority of justices — +1 bonus action this round.');
        }

        state.president.executiveOrdersThisRound = 0;
        state.president.roundsInCurrentTerm++;
        state.president.justiceNominationsThisRound = 0;
        state.president.stateDinnerUsedThisRound = false;

        state.house.killBillUsedThisRound = false;
        state.house.popularizeUsedThisRound = false;
        state.house.stateOfUnionUsedThisRound = false;
        state.house.initiatedLegislationThisRound = false;
        state.house.uniqueActionsThisRound = [];
        state.house.speakersGavelGranted = false;
        state.house.caucusMeetingUsedThisRound = false;
        state.house.subpoenaUsedThisRound = false;

        state.senate.governmentShutdownUsedThisRound = false;
        state.senate.filibusterUsedThisRound = false;
        state.senate.stallUsedThisRound = false;
        state.senate.conferenceUsedThisRound = false;
        state.senate.nominationsUsedThisRound = false;

        state.supremeCourt.investigateEOUsedThisRound = false;
        state.supremeCourt.generalCourtUsedThisRound = false;
        state.supremeCourt.advisoryUsedThisRound = false;
        state.supremeCourt.suggestJusticeUsedThisRound = false;
        state.supremeCourt.internalInquiryUsedThisRound = false;
        state.supremeCourt.partisanRulingUsedThisRound = false;
        state.supremeCourt.billReviewUsedThisRound = false;
        state.supremeCourt.amicusBriefUsedThisRound = false;
        state.supremeCourt.oralArgumentsUsedThisRound = false;
        state.supremeCourt.clerksResearchUsedThisRound = false;
        state.supremeCourt.recusedJusticeIndex = null;
        state.supremeCourt.recusalUsedThisRound = false;

        if (state.supremeCourt.witchhuntDebuff > 0) {
            state.supremeCourt.witchhuntDebuff--;
        }
        state.president.witchhuntProtectedNextRound = false;

        state.billPassedThisRound = false;
        state.billPassedByHouse = false;
        state.billPassedBySenate = false;
        state.billVetoedThisRound = false;
        state.billKilledThisRound = false;
        state.pendingSue = false;

        // Cancel pending amendment if not completed by round end
        if (state.pendingAmendment) {
            addLog('system', 'Constitutional Amendment', 'Amendment expired — not all parties agreed before round end.');
            state.pendingAmendment = null;
        }

        // Cancel pending Unity Summit if not completed by round end
        if (state.pendingUnitySummit) {
            addLog('system', 'Unity Summit', '🕊️ Unity Summit expired — not enough support before round end.');
            state.pendingUnitySummit = null;
        }

        // Clear all bills from floor except stalled ones
        var stalledBills = [];
        for (var bi = 0; bi < state.bills.length; bi++) {
            if (state.bills[bi].stalled) {
                state.bills[bi].stalled = false; // only stalls for one round
                stalledBills.push(state.bills[bi]);
            }
        }
        state.bills = stalledBills;
        if (state.bills.length > 0) {
            state.activeBillId = state.bills[0].id;
        }
        // Always generate a fresh bill
        addBillToFloor(generateBill());

        // Stability decay: -1 every 3 rounds
        if (state.round % 3 === 0 && state.round > 1) {
            state.stability = Math.max(0, state.stability - 1);
            addLog('system', 'Stability Decay', 'National stability declined. Now: ' + state.stability);
        }

        // Check if stability hit 0 — game over, everyone loses
        if (state.stability <= 0) {
            state.phase = 'gameOver';
            state.stabilityCollapse = true;
            addLog('system', 'COLLAPSE', 'National stability has collapsed! All players lose!');
            return;
        }

        // Stability threshold effects
        if (state.stability >= 8) {
            Config.ROLES.forEach(function(r) { state[r].vp += 1; });
            addLog('passive', 'Prosperity Bonus', 'Stability 8+. All players +1 VP.');
        } else if (state.stability <= 2) {
            Config.ROLES.forEach(function(r) {
                state[r].actionsRemaining = Math.max(1, state[r].actionsRemaining - 1);
            });
            addLog('passive', 'Crisis Penalty', 'Stability \u2264 2. All players lose 1 action.');
        }

        // Event deadline check
        if (state.activeEvent && !state.activeEvent.resolved) {
            state.activeEvent.roundsRemaining--;
            if (state.activeEvent.roundsRemaining <= 0) {
                var failEvt = state.activeEvent;
                var pen = failEvt.failPenalty || {};
                GameEvents.applyFailure(failEvt, state);
                addLog('system', 'Event Failed', '💥 "' + failEvt.name + '" was not resolved in time!');
                if (pen.houseShift) addLog('system', 'Drastic Effect', '🏛️ House composition drastically shifted!');
                if (pen.senateShift) addLog('system', 'Drastic Effect', '🏛️ Senate composition drastically shifted!');
                if (pen.justiceEffect && pen.justiceEffect.resign) addLog('system', 'Drastic Effect', '⚖️ A Supreme Court justice has resigned!');
                if (pen.justiceEffect && pen.justiceEffect.switchPartisanship) addLog('system', 'Drastic Effect', '⚖️ ' + pen.justiceEffect.switchPartisanship + ' justice(s) changed partisanship!');
                if (pen.presidentLosesElection) addLog('system', 'Drastic Effect', '🗳️ President will automatically lose the next election!');
                state.eventHistory.push(failEvt.id);
                state.activeEvent = null;
                if (state.queuedEvent) {
                    state.activeEvent = state.queuedEvent;
                    state.queuedEvent = null;
                }
            }
        }

        // Check for new event trigger
        if (typeof GameEvents !== 'undefined' && (!state.activeEvent || !state.queuedEvent)) {
            var newEvent = GameEvents.checkEventTrigger(state);
            if (newEvent) {
                newEvent.roundsRemaining = newEvent.deadline;
                newEvent.roundTriggered = state.round;
                newEvent.resolved = false;
                newEvent.resolutions = newEvent.resolutions.map(function(r) {
                    return Object.assign({}, r, { agreedRoles: [] });
                });
                if (!state.activeEvent) {
                    state.activeEvent = newEvent;
                    addLog('system', 'EVENT', '\u26A1 ' + newEvent.name + '! (' + newEvent.deadline + ' rounds to resolve)');
                } else if (!state.queuedEvent) {
                    state.queuedEvent = newEvent;
                    addLog('system', 'EVENT QUEUED', '\u26A1 ' + newEvent.name + ' is incoming!');
                }
            }
        }
    }

    // --- Get Available Actions ---
    function getAvailableActions(role) {
        if (state.phase !== 'action') return [];
        if (getCurrentRole() !== role) return [];
        var actions = [];
        var rs = state[role];
        if (rs.actionsRemaining <= 0) return [];

        switch (role) {
            case 'president':
                actions.push({ id: 'executiveOrder', label: 'Executive Order', cost: 1, description: '+1 VP, +1 Popularity' });
                actions.push({ id: 'advocate', label: 'Advocate Legislation', cost: 1, description: '+/-2 PC to chambers, -5 Bill Pop' });
                actions.push({ id: 'admonish', label: 'Admonish Legislation', cost: 1, description: '-2/-4 PC to chambers, -5 Bill Pop' });
                if (state.billPassedThisRound) {
                    actions.push({ id: 'veto', label: 'Veto', cost: '1 + 1VP', description: 'Send bill back. Needs 2/3 to override.' });
                    if ((state.president.party === 'democrat' && state.passedBills.length > 0 && state.passedBills[state.passedBills.length-1].partisanship < 10) ||
                        (state.president.party === 'republican' && state.passedBills.length > 0 && state.passedBills[state.passedBills.length-1].partisanship > 10)) {
                        actions.push({ id: 'sue', label: 'Sue', cost: 1, description: 'Send to Supreme Court for review' });
                    }
                }
                if (rs.actionsRemaining >= 3) {
                    actions.push({ id: 'taxCuts', label: 'Tax Cuts', cost: 3, description: 'Popular bill on floor' });
                }
                if (rs.actionsRemaining >= 2) {
                    actions.push({ id: 'campaign', label: 'Campaign Trail', cost: 2, description: '+4 Popularity' });
                }
                if (state.billPassedThisRound && state.billPassedByHouse && state.billPassedBySenate) {
                    actions.push({ id: 'signBill', label: 'Sign Bill', cost: 1, description: '+4 VP, Popularity bonus' });
                }
                if (state.pendingJustice && state.president.justiceNominationsThisRound < 2) {
                    actions.push({ id: 'assignJustice', label: 'Assign Justice', cost: 1, description: 'Nominate a justice' });
                }
                if (rs.popularity >= 15 && rs.witchhuntsUsed < Config.PER_GAME_LIMITS.witchhunts && rs.actionsRemaining >= 2) {
                    actions.push({ id: 'witchhunt', label: 'Declare Witchhunt', cost: '2 + 2VP + 2Pop', description: 'SC loses 6 VP' });
                }
                if (rs.popularity > 15) {
                    actions.push({ id: 'bullyPulpit', label: 'Bully Pulpit', cost: '1 + 2Pop', description: '-2 Popularity, +5 VP' });
                }
                if (!rs.executivePrivilegeUsed) {
                    actions.push({ id: 'executivePrivilege', label: 'Executive Privilege', cost: 'Free', description: '+2 actions this round (once per game)' });
                }
                if (!rs.stateDinnerUsedThisRound) {
                    actions.push({ id: 'stateDinner', label: 'State Dinner', cost: 1, description: '+3 VP, +2 Pop, target +1 VP' });
                }
                // Constitutional Amendment co-action
                if (state.pendingAmendment && state.pendingAmendment.needed.indexOf('president') !== -1) {
                    actions.push({ id: 'agreeAmendment', label: 'Agree to Amendment', cost: '2 + 1VP + 1Pop', description: 'Support constitutional amendment' });
                    actions.push({ id: 'rejectAmendment', label: 'Reject Amendment', cost: 1, description: 'Cancel pending amendment' });
                }
                if (!state.pendingAmendment && state.unconstitutionalBills && state.unconstitutionalBills.length > 0 && rs.popularity >= 15 && rs.actionsRemaining >= 2 && rs.vp >= 1) {
                    actions.push({ id: 'proposeAmendment', label: 'Propose Amendment', cost: '2 + 1VP + 1Pop', description: 'Restore an unconstitutional bill' });
                }
                // National Unity Summit
                if (state.pendingUnitySummit && state.pendingUnitySummit.needed.indexOf('president') !== -1) {
                    actions.push({ id: 'agreeUnitySummit', label: '🕊️ Agree to Unity Summit', cost: '1 + 1VP', description: 'Support stability summit' });
                    actions.push({ id: 'rejectUnitySummit', label: 'Reject Unity Summit', cost: 1, description: 'Cancel pending summit' });
                }
                if (!state.pendingUnitySummit && state.stability < 8 && rs.actionsRemaining >= 2 && rs.vp >= 2) {
                    actions.push({ id: 'proposeUnitySummit', label: '🕊️ Propose Unity Summit', cost: '2 + 2VP', description: 'All branches unite for stability (+2/+3)' });
                }
                break;

            case 'house':
                if (!state.house.stateOfUnionUsedThisRound) {
                    actions.push({ id: 'stateOfUnion', label: 'State of the Union', cost: 1, description: 'Various effects' });
                }
                actions.push({ id: 'whipHouse', label: 'Whip the House', cost: 1, description: 'Convert 20 reps' });
                if (getActiveBill()) {
                    actions.push({ id: 'supportBill', label: 'Support Bill', cost: 1, description: '+5 Pop, more extreme' });
                    actions.push({ id: 'attackBill', label: 'Attack Bill', cost: 1, description: '-5 Pop, more extreme' });
                }
                if (getActiveBill() && !state.house.killBillUsedThisRound && state.house.pc >= 1) {
                    actions.push({ id: 'killBill', label: 'Kill Bill', cost: '1 + 1PC', description: '+1 VP, bill dead this round' });
                }
                actions.push({ id: 'hostHearing', label: 'Host Hearing', cost: 1, description: 'PC/VP/Pres Pop options' });
                if (getActiveBill() && !getActiveBill().riderForHouse) {
                    actions.push({ id: 'riderAmendment', label: 'Rider Amendment', cost: 1, description: 'Attach +3 VP rider to bill' });
                }
                if (state.house.pc >= 6) {
                    actions.push({ id: 'earmark', label: 'Earmark', cost: '6PC', description: '-6 PC, +4 VP' });
                }
                if (!state.house.caucusMeetingUsedThisRound) {
                    actions.push({ id: 'caucusMeeting', label: 'Caucus Meeting', cost: 1, description: '+3 PC' });
                }
                if (!state.house.subpoenaUsedThisRound) {
                    actions.push({ id: 'subpoena', label: 'Subpoena Power', cost: 1, description: '-2 Pres Pop, +2 VP' });
                }
                if (!state.house.powerOfPurseUsed && state.house.vp >= 4) {
                    actions.push({ id: 'powerOfPurse', label: 'Power of the Purse', cost: '1 + 4VP', description: 'Pres & Senate lose 1 action this round & next' });
                }
                if (getActiveBill() && !state.house.popularizeUsedThisRound && state.house.pc >= 1) {
                    actions.push({ id: 'popularizeBill', label: 'Popularize Bill', cost: '1 + 1PC', description: '+5 Pop, -4 Leg, +3 Part' });
                }
                if (rs.actionsRemaining >= 2 && state.house.pc >= 2) {
                    actions.push({ id: 'changeBill', label: 'Change Bill Now', cost: '2 + 2PC', description: 'New bill on floor' });
                }
                if (getActiveBill() && !state.billKilledThisRound && !getActiveBill().killed && !getActiveBill().passedByHouse) {
                    actions.push({ id: 'housePassBill', label: 'Pass Bill', cost: 1, description: 'Vote on bill' });
                }
                if (!state.house.initiatedLegislationThisRound) {
                    actions.push({ id: 'initiateLegislation', label: 'Initiate Legislation', cost: 'Free', description: 'New bill (free action)' });
                }
                if (state.house.pc >= 6 && state.house.impeachmentsUsed < Config.PER_GAME_LIMITS.impeachments) {
                    actions.push({ id: 'impeach', label: 'Impeach President', cost: '1 + 6PC', description: 'Impeachment proceedings' });
                }
                if (!state.house.packCourtsUsed && state.house.pc >= 6 && state.house.vp >= 4) {
                    actions.push({ id: 'packCourts', label: 'Pack the Courts', cost: '1 + 6PC + 4VP', description: 'Add 4 justices' });
                }
                // Constitutional Amendment co-action
                if (state.pendingAmendment && state.pendingAmendment.needed.indexOf('house') !== -1) {
                    actions.push({ id: 'agreeAmendment', label: 'Agree to Amendment', cost: '2 + 1VP + 1PC', description: 'Support constitutional amendment' });
                    actions.push({ id: 'rejectAmendment', label: 'Reject Amendment', cost: 1, description: 'Cancel pending amendment' });
                }
                if (!state.pendingAmendment && state.unconstitutionalBills && state.unconstitutionalBills.length > 0 && state.president.popularity >= 15 && rs.actionsRemaining >= 2 && rs.vp >= 1 && rs.pc >= 1) {
                    actions.push({ id: 'proposeAmendment', label: 'Propose Amendment', cost: '2 + 1VP + 1PC', description: 'Restore an unconstitutional bill' });
                }
                // National Unity Summit (House)
                if (state.pendingUnitySummit && state.pendingUnitySummit.needed.indexOf('house') !== -1) {
                    actions.push({ id: 'agreeUnitySummit', label: '🕊️ Agree to Unity Summit', cost: '1 + 1VP', description: 'Support stability summit' });
                    actions.push({ id: 'rejectUnitySummit', label: 'Reject Unity Summit', cost: 1, description: 'Cancel pending summit' });
                }
                if (!state.pendingUnitySummit && state.stability < 8 && rs.actionsRemaining >= 2 && rs.vp >= 2) {
                    actions.push({ id: 'proposeUnitySummit', label: '🕊️ Propose Unity Summit', cost: '2 + 2VP', description: 'All branches unite for stability (+2/+3)' });
                }
                break;

            case 'senate':
                if (state.justiceNominated) {
                    actions.push({ id: 'confirmJustice', label: 'Confirm Justice', cost: 1, description: 'Approve/reject nominee' });
                }
                if (!state.senate.nominationsUsedThisRound) {
                    actions.push({ id: 'nominations', label: 'Pass/Block Nominations', cost: 1, description: '+4 PC or +1 VP' });
                }
                actions.push({ id: 'debate', label: 'Debate Legislation', cost: 1, description: '+2 PC, shift senators' });
                if (getActiveBill()) {
                    actions.push({ id: 'updateBill', label: 'Update Bill', cost: 1, description: 'Change bill stats' });
                }
                var filibusterCostDisplay = state.senate.filibustersUsedTotal >= 2 ? 5 : 4;
                if (state.senate.pc >= filibusterCostDisplay) {
                    actions.push({ id: 'filibuster', label: 'Filibuster', cost: filibusterCostDisplay + 'PC', description: 'Kill bill, new one' + (state.senate.filibustersUsedTotal >= 2 ? ' (fatigue +1PC)' : '') });
                }
                if (!state.senate.stallUsedThisRound && state.senate.pc >= 2) {
                    actions.push({ id: 'stallBill', label: 'Stall Bill', cost: '2PC', description: 'Bill stays next round' });
                }
                if (!state.senate.conferenceUsedThisRound) {
                    actions.push({ id: 'conference', label: 'Conference', cost: 1, description: '+1 PC for both chambers' });
                }
                if (getActiveBill() && !state.billKilledThisRound && !getActiveBill().killed && !getActiveBill().passedBySenate) {
                    actions.push({ id: 'senatePassBill', label: 'Pass Bill', cost: 1, description: 'Vote on bill' });
                }
                if (state.passedBills.length > 0) {
                    actions.push({ id: 'reviveBill', label: 'Revive Bill', cost: 1, description: 'Bring back passed bill' });
                    actions.push({ id: 'repealBill', label: 'Repeal Bill', cost: 1, description: 'Create repeal bill' });
                }
                if (!state.senate.governmentShutdownUsedThisRound && state.senate.governmentShutdownsUsed < Config.PER_GAME_LIMITS.governmentShutdowns && state.senate.pc >= 6) {
                    actions.push({ id: 'governmentShutdown', label: 'Government Shutdown', cost: '6PC', description: 'House PC=0, -4 Pres Pop' });
                }
                // Constitutional Amendment co-action
                if (state.pendingAmendment && state.pendingAmendment.needed.indexOf('senate') !== -1) {
                    actions.push({ id: 'agreeAmendment', label: 'Agree to Amendment', cost: '2 + 1VP + 1PC', description: 'Support constitutional amendment' });
                    actions.push({ id: 'rejectAmendment', label: 'Reject Amendment', cost: 1, description: 'Cancel pending amendment' });
                }
                if (!state.pendingAmendment && state.unconstitutionalBills && state.unconstitutionalBills.length > 0 && state.president.popularity >= 15 && rs.actionsRemaining >= 2 && rs.vp >= 1 && rs.pc >= 1) {
                    actions.push({ id: 'proposeAmendment', label: 'Propose Amendment', cost: '2 + 1VP + 1PC', description: 'Restore an unconstitutional bill' });
                }
                // National Unity Summit (Senate)
                if (state.pendingUnitySummit && state.pendingUnitySummit.needed.indexOf('senate') !== -1) {
                    actions.push({ id: 'agreeUnitySummit', label: '🕊️ Agree to Unity Summit', cost: '1 + 1VP', description: 'Support stability summit' });
                    actions.push({ id: 'rejectUnitySummit', label: 'Reject Unity Summit', cost: 1, description: 'Cancel pending summit' });
                }
                if (!state.pendingUnitySummit && state.stability < 8 && rs.actionsRemaining >= 2 && rs.vp >= 2) {
                    actions.push({ id: 'proposeUnitySummit', label: '🕊️ Propose Unity Summit', cost: '2 + 2VP', description: 'All branches unite for stability (+2/+3)' });
                }
                break;

            case 'supremeCourt':
                if (state.passedBills.length > 0) {
                    actions.push({ id: 'judicialReview', label: 'Judicial Review', cost: 1, description: 'Rule on constitutionality (or remand)' });
                }
                actions.push({ id: 'inquiryPresident', label: 'Inquiry of President', cost: 1, description: '+/-Pres Pop, +1 VP' });
                actions.push({ id: 'inquiryChamber', label: 'Inquiry of Chamber', cost: 1, description: '+/-PC to chamber, +1 VP' });
                if (!state.supremeCourt.investigateEOUsedThisRound && state.president.executiveOrdersThisRound >= 2 && !state.president.witchhuntProtectedNextRound) {
                    actions.push({ id: 'investigateEO', label: 'Investigate EO', cost: 1, description: 'Pres -2VP/-2Pop' });
                }
                if (getActiveBill() && !getActiveBill().isPackCourts) {
                    actions.push({ id: 'investigateBill', label: 'Investigate Bill', cost: 1, description: 'Bill legality -2' });
                }
                if (getActiveBill() && !state.supremeCourt.billReviewUsedThisRound) {
                    actions.push({ id: 'billReview', label: 'Bill Review', cost: 1, description: 'Legality +2, adjust Part/Pop ±2, +2 VP' });
                }
                if (getActiveBill() && !state.supremeCourt.amicusBriefUsedThisRound && state.supremeCourt.jp >= 2) {
                    actions.push({ id: 'amicusBrief', label: 'Amicus Brief', cost: '1 + 2JP', description: '+2 VP, bill legality -4' });
                }
                if (state.justiceNominated) {
                    actions.push({ id: 'disapproveJustice', label: 'Disapprove Justice', cost: 1, description: 'Reject nominee' });
                }
                if (state.pendingJustice && !state.justiceNominated && !state.supremeCourt.suggestJusticeUsedThisRound) {
                    actions.push({ id: 'suggestJustice', label: 'Suggest Justice', cost: 1, description: 'Suggest nominee' });
                }
                if (!state.supremeCourt.generalCourtUsedThisRound) {
                    actions.push({ id: 'generalCourt', label: 'General Court', cost: 1, description: '+2 VP' });
                }
                if (!state.supremeCourt.advisoryUsedThisRound) {
                    actions.push({ id: 'advisoryRole', label: 'Advisory Role', cost: 1, description: '+2 VP (requires 2/3 alignment)' });
                }
                if (!state.supremeCourt.internalInquiryUsedThisRound && state.supremeCourt.internalInquiryUsed < Config.PER_GAME_LIMITS.internalInquiry && state.supremeCourt.jp >= 2) {
                    actions.push({ id: 'internalInquiry', label: 'Internal Inquiry', cost: '1 + 2JP', description: 'Roll d20: 10+ retires a justice' });
                }
                if (rs.actionsRemaining >= 2 && state.supremeCourt.jp >= 4 && !state.supremeCourt.partisanRulingUsedThisRound && state.supremeCourt.partisanRulingUsed < Config.PER_GAME_LIMITS.partisanRuling) {
                    actions.push({ id: 'partisanRuling', label: 'Partisan Ruling', cost: '2 + 4JP', description: 'Shift all partisanship' });
                }
                if (rs.actionsRemaining >= 2 && state.supremeCourt.jp >= 8 && state.supremeCourt.constitutionalCrisisUsed < Config.PER_GAME_LIMITS.constitutionalCrisis) {
                    actions.push({ id: 'constitutionalCrisis', label: 'Constitutional Crisis', cost: '2 + 8JP', description: 'All legality -2 permanently' });
                }
                // Recusal (Feature #7)
                if (!state.supremeCourt.recusalUsedThisRound && state.supremeCourt.jp >= 1) {
                    actions.push({ id: 'recusal', label: 'Recuse Justice', cost: '1 + 1JP', description: 'Remove a justice from judicial review this round' });
                }
                // Landmark Ruling (Feature #8)
                if (!state.supremeCourt.landmarkRulingUsed && rs.actionsRemaining >= 2 && state.supremeCourt.jp >= 6) {
                    actions.push({ id: 'landmarkRuling', label: 'Landmark Ruling', cost: '2 + 6JP', description: 'Once-per-game powerful effect' });
                }
                // Writ of Certiorari — target a passed bill, legality -3
                if (state.passedBills.length > 0 && state.supremeCourt.jp >= 1) {
                    var hasCertTarget = state.passedBills.some(function(b) { return !b.certiorariUsed; });
                    if (hasCertTarget) {
                        actions.push({ id: 'certiorari', label: 'Writ of Certiorari', cost: '1 + 1JP', description: 'Target bill legality -3, +1 VP' });
                    }
                }
                // Oral Arguments — bill partisanship toward center, +2 VP
                if (getActiveBill() && !state.supremeCourt.oralArgumentsUsedThisRound) {
                    actions.push({ id: 'oralArguments', label: 'Oral Arguments', cost: 1, description: 'Bill partisanship toward center, +2 VP' });
                }
                // Injunction — block bill votes this round, once per game
                if (getActiveBill() && !state.supremeCourt.injunctionUsed && state.supremeCourt.jp >= 3 && !state.billKilledThisRound) {
                    actions.push({ id: 'injunction', label: 'Injunction', cost: '1 + 3JP', description: 'Block bill votes this round, +1 VP (once/game)' });
                }
                // Clerks Research — +2 JP
                if (!state.supremeCourt.clerksResearchUsedThisRound) {
                    actions.push({ id: 'clerksResearch', label: 'Clerks Research', cost: 1, description: '+2 JP' });
                }
                // National Unity Summit (Supreme Court)
                if (state.pendingUnitySummit && state.pendingUnitySummit.needed.indexOf('supremeCourt') !== -1) {
                    actions.push({ id: 'agreeUnitySummit', label: '🕊️ Agree to Unity Summit', cost: '1 + 1VP', description: 'Support stability summit' });
                    actions.push({ id: 'rejectUnitySummit', label: 'Reject Unity Summit', cost: 1, description: 'Cancel pending summit' });
                }
                if (!state.pendingUnitySummit && state.stability < 8 && rs.actionsRemaining >= 2 && rs.vp >= 2) {
                    actions.push({ id: 'proposeUnitySummit', label: '🕊️ Propose Unity Summit', cost: '2 + 2VP', description: 'All branches unite for stability (+2/+3)' });
                }
                break;
        }

        // Event resolution actions
        if (state.activeEvent && typeof GameEvents !== 'undefined') {
            var eventActions = GameEvents.getAvailableEventActions(role, state);
            for (var ei = 0; ei < eventActions.length; ei++) {
                actions.push(eventActions[ei]);
            }
        }

        return actions;
    }

    // Execute action by ID
    var actionLock = false;

    function executeAction(role, actionId, params) {
        if (actionLock) {
            return { success: false, message: 'Action in progress.' };
        }
        // Deal actions are free and don't require it to be your turn
        var dealActions = ['proposeDeal', 'respondDeal', 'fulfillDeal', 'breakDeal'];
        if (actionId === 'initiateLegislation') {
            if (role !== 'house') {
                return { success: false, message: 'Only the House can initiate legislation.' };
            }
        } else if (dealActions.indexOf(actionId) === -1 && getCurrentRole() !== role) {
            return { success: false, message: 'Not your turn.' };
        }
        params = params || {};

        var result;
        actionLock = true;
        var actionResult;
        try {
        switch (actionId) {
            // President
            case 'executiveOrder': actionResult = presidentExecutiveOrder(); break;
            case 'advocate': actionResult = presidentAdvocate(params.target || 'both', 1); break;
            case 'admonish': actionResult = presidentAdvocate(params.target || 'both', -1); break;
            case 'veto': actionResult = presidentVeto(); break;
            case 'sue': actionResult = presidentSue(); break;
            case 'taxCuts': actionResult = presidentTaxCuts(); break;
            case 'campaign': actionResult = presidentCampaign(); break;
            case 'signBill': actionResult = presidentSignBill(); break;
            case 'assignJustice': actionResult = presidentAssignJustice(params.leaning || 'moderate'); break;
            case 'witchhunt': actionResult = presidentDeclareWitchhunt(); break;
            case 'bullyPulpit': actionResult = presidentBullyPulpit(); break;
            case 'executivePrivilege': actionResult = presidentExecutivePrivilege(); break;
            case 'stateDinner': actionResult = presidentStateDinner(params.targetRole || 'house'); break;

            // House
            case 'stateOfUnion': actionResult = houseStateOfUnion(params.choice || 'gainVP'); break;
            case 'whipHouse': actionResult = houseWhip(params.faction || 'democrat', params.direction || 'left'); break;
            case 'supportBill': actionResult = houseSupportAttackBill(true); break;
            case 'attackBill': actionResult = houseSupportAttackBill(false); break;
            case 'killBill': actionResult = houseKillBill(); break;
            case 'hostHearing': actionResult = houseHostHearing(params.choice || 'gainVP'); break;
            case 'popularizeBill': actionResult = housePopularizeBill(); break;
            case 'changeBill': actionResult = houseChangeBill(); break;
            case 'housePassBill': actionResult = housePassBill(params.pcToUse || 0); break;
            case 'initiateLegislation': actionResult = houseInitiateLegislation(params.partAdj || 0, params.popAdj || 0); break;
            case 'impeach': actionResult = houseImpeach(); break;
            case 'packCourts': actionResult = housePackCourts(); break;
            case 'riderAmendment': actionResult = houseRiderAmendment(); break;
            case 'earmark': actionResult = houseEarmark(); break;
            case 'caucusMeeting': actionResult = houseCaucusMeeting(); break;
            case 'subpoena': actionResult = houseSubpoena(); break;
            case 'powerOfPurse': actionResult = housePowerOfPurse(); break;

            // Senate
            case 'confirmJustice': actionResult = senateJusticeNomination(true); break;
            case 'rejectJustice': actionResult = senateJusticeNomination(false); break;
            case 'nominations': actionResult = senateNominations(params.pass !== false); break;
            case 'blockNominations': actionResult = senateNominations(false); break;
            case 'debate': actionResult = senateDebate(params.direction || 'moderate'); break;
            case 'updateBill': actionResult = senateUpdateBill(params.changes || {}); break;
            case 'filibuster': actionResult = senateFilibuster(); break;
            case 'stallBill': actionResult = senateStallBill(); break;
            case 'conference': actionResult = senateConference(); break;
            case 'senatePassBill': actionResult = senatePassBill(params.pcToUse || 0); break;
            case 'reviveBill': actionResult = senateReviveBill(params.billIndex || 0); break;
            case 'repealBill': actionResult = senateRepealBill(params.billIndex || 0); break;
            case 'governmentShutdown': actionResult = senateGovernmentShutdown(); break;

            // Supreme Court
            case 'judicialReview': actionResult = courtJudicialReview(params.billIndex || -1, params.vpSpent || 0, params.ruling || null); break;
            case 'inquiryPresident': actionResult = courtInquiryPresident(params.choice || 'hurt'); break;
            case 'inquiryChamber': actionResult = courtInquiryChamber(params.target || 'house', params.choice || 'hurt'); break;
            case 'investigateEO': actionResult = courtInvestigateEO(); break;
            case 'investigateBill': actionResult = courtInvestigateBill(); break;
            case 'billReview': actionResult = courtBillReview(params.partAdj || 0, params.popAdj || 0); break;
            case 'disapproveJustice': actionResult = courtDisapproveJustice(params.leaning || 'moderate'); break;
            case 'suggestJustice': actionResult = courtSuggestJustice(params.leaning || 'moderate'); break;
            case 'generalCourt': actionResult = courtGeneralCourt(); break;
            case 'advisoryRole': actionResult = courtAdvisoryRole(); break;
            case 'internalInquiry': actionResult = courtInternalInquiry(); break;
            case 'partisanRuling': actionResult = courtPartisanRuling(params.direction || 1); break;
            case 'constitutionalCrisis': actionResult = courtConstitutionalCrisis(); break;
            case 'amicusBrief': actionResult = courtAmicusBrief(); break;
            case 'certiorari': actionResult = courtCertiorari(params.billIndex || 0); break;
            case 'oralArguments': actionResult = courtOralArguments(); break;
            case 'injunction': actionResult = courtInjunction(); break;
            case 'clerksResearch': actionResult = courtClerksResearch(); break;
            case 'recusal': actionResult = courtRecusal(params.leaning || 'moderate'); break;
            case 'landmarkRuling': actionResult = courtLandmarkRuling(params.effect || 'extraAction'); break;

            // Co-Actions (available to President, House, Senate)
            case 'proposeAmendment': actionResult = proposeAmendment(role, params.billIndex || 0, params.destination || 'floor'); break;
            case 'agreeAmendment': actionResult = agreeAmendment(role); break;
            case 'rejectAmendment': actionResult = rejectAmendment(role); break;

            // National Unity Summit (available to all roles)
            case 'proposeUnitySummit': actionResult = proposeUnitySummit(role); break;
            case 'agreeUnitySummit': actionResult = agreeUnitySummit(role); break;
            case 'rejectUnitySummit': actionResult = rejectUnitySummit(role); break;

            // Bill selection (free action)
            case 'setActiveBill':
                if (params.billId) {
                    state.activeBillId = params.billId;
                    actionResult = { success: true, message: 'Selected bill.', freeAction: true };
                } else {
                    actionResult = { success: false, message: 'No bill ID provided.' };
                }
                break;

            // Deals (free actions — don't consume a turn)
            case 'proposeDeal':
                actionResult = proposeDeal(role, params.to, params.askType, params.offerType, params.message, params.askBillId || null, params.offerBillId || null);
                if (actionResult) actionResult = { success: true, deal: actionResult, message: 'Deal proposed.' };
                break;
            case 'respondDeal':
                actionResult = respondToDeal(params.dealId, params.accept);
                break;
            case 'fulfillDeal':
                actionResult = fulfillDeal(params.dealId);
                break;
            case 'breakDeal':
                actionResult = breakDeal(params.dealId);
                break;

            case 'resolveEvent':
                if (!state.activeEvent) {
                    actionResult = { success: false, message: 'No active event.' };
                } else {
                    var resId = params.resolutionId;
                    var resolution = null;
                    for (var ri = 0; ri < state.activeEvent.resolutions.length; ri++) {
                        if (state.activeEvent.resolutions[ri].id === resId) {
                            resolution = state.activeEvent.resolutions[ri];
                            break;
                        }
                    }
                    if (!resolution) {
                        actionResult = { success: false, message: 'Invalid resolution.' };
                    } else {
                        actionResult = GameEvents.resolveEvent(resolution, role, state);
                        if (actionResult.resolved) {
                            addLog('system', 'Event Resolved', '"' + state.activeEvent.name + '" resolved via "' + resolution.label + '"!');
                            state.eventHistory.push(state.activeEvent.id);
                            state.activeEvent = null;
                            if (state.queuedEvent) {
                                state.activeEvent = state.queuedEvent;
                                state.queuedEvent = null;
                                addLog('system', 'EVENT', '\u26A1 ' + state.activeEvent.name + ' is now active!');
                            }
                        }
                        if (actionResult.success) advanceTurn();
                    }
                }
                break;
            case 'eventSpecialAction':
                if (!state.activeEvent) {
                    actionResult = { success: false, message: 'No active event.' };
                } else {
                    var specId = params.specialActionId;
                    var specAction = null;
                    var specs = state.activeEvent.specialActions || [];
                    for (var si = 0; si < specs.length; si++) {
                        if (specs[si].id === specId) { specAction = specs[si]; break; }
                    }
                    if (!specAction || specAction.usesRemaining <= 0) {
                        actionResult = { success: false, message: 'Special action not available.' };
                    } else if (specAction.role !== role && specAction.role !== 'any') {
                        actionResult = { success: false, message: 'Wrong role for this action.' };
                    } else {
                        specAction.usesRemaining--;
                        if (specAction.effect) {
                            if (specAction.effect.pc) state[role].pc += specAction.effect.pc;
                            if (specAction.effect.popularity) state.president.popularity = Math.max(1, Math.min(20, state.president.popularity + specAction.effect.popularity));
                            if (specAction.effect.jp) state.supremeCourt.jp += specAction.effect.jp;
                            if (specAction.effect.vp) state[role].vp += specAction.effect.vp;
                            if (specAction.effect.vpAll) {
                                Config.ROLES.forEach(function(r) { state[r].vp += specAction.effect.vpAll; });
                            }
                            if (specAction.effect.extendDeadline) {
                                state.activeEvent.roundsRemaining += specAction.effect.extendDeadline;
                            }
                            if (specAction.effect.rollBonus) {
                                state.activeEvent.rollBonus = (state.activeEvent.rollBonus || 0) + specAction.effect.rollBonus;
                            }
                        }
                        addLog(role, 'Event Action', specAction.label + ' used.');
                        if (specAction.cost && specAction.cost.actions > 0) advanceTurn();
                        actionResult = { success: true, message: specAction.label + ' applied!' };
                    }
                }
                break;

            case 'skipRemainingActions':
                skipRemainingActions(role);
                actionResult = { success: true, message: 'Skipped remaining actions.', freeAction: true };
                break;

            default: actionResult = { success: false, message: 'Unknown action: ' + actionId };
        }

        // Speaker's Gavel: track unique House actions
        if (role === 'house' && actionResult.success && actionId !== 'initiateLegislation') {
            if (state.house.uniqueActionsThisRound.indexOf(actionId) === -1) {
                state.house.uniqueActionsThisRound.push(actionId);
            }
            if (state.house.uniqueActionsThisRound.length >= 4 && !state.house.speakersGavelGranted) {
                state.house.speakersGavelGranted = true;
                state.house.actionsRemaining += 1;
                addLog('house', 'Speaker\'s Gavel', '4 unique actions used! +1 bonus action.');
            }
        }

        return actionResult;
        } finally {
            actionLock = false;
        }
    }

    function getWinner() {
        if (state.phase !== 'gameOver') return null;
        var roles = Config.ROLES;
        var winner = roles[0];
        var maxVP = state[roles[0]].vp;
        for (var i = 1; i < roles.length; i++) {
            if (state[roles[i]].vp > maxVP) {
                maxVP = state[roles[i]].vp;
                winner = roles[i];
            }
        }
        return { role: winner, vp: maxVP };
    }

    return {
        init: function(gameLength) { return createInitialState(gameLength || 'standard'); },
        getState: function() { return state; },
        setState: function(s) {
            if (!s || typeof s !== 'object' || !s.version) {
                console.error('Invalid state received');
                return;
            }
            state = s;
        },
        getCurrentRole: getCurrentRole,
        skipRemainingActions: skipRemainingActions,
        proposeDeal: proposeDeal,
        respondToDeal: respondToDeal,
        fulfillDeal: fulfillDeal,
        breakDeal: breakDeal,
        getActiveDeals: getActiveDeals,
        getPendingDealsForRole: getPendingDealsForRole,
        getAcceptedDealsForRole: getAcceptedDealsForRole,
        adjustTrust: adjustTrust,
        DEAL_TYPES: DEAL_TYPES,
        getAvailableActions: getAvailableActions,
        executeAction: executeAction,
        getWinner: getWinner,
        calculateSenateVotes: calculateSenateVotes,
        calculateHouseVotes: calculateHouseVotes,
        calculateJudicialReview: calculateJudicialReview,
        generateBill: generateBill,
        getActiveBill: getActiveBill,
        addBillToFloor: addBillToFloor,
        removeBillFromFloor: removeBillFromFloor,
        getBillById: getBillById,
        setActiveBill: function(billId) { state.activeBillId = billId; },
        getSenateMajority: getSenateMajority,
        getHouseMajority: getHouseMajority,
        getCourtMajority: getCourtMajority,
        rollD20: rollD20,
        rollD6: rollD6,
        getStability: function() { return state ? state.stability : 0; },
        getActiveEvent: function() { return state ? state.activeEvent : null; },
        getQueuedEvent: function() { return state ? state.queuedEvent : null; }
    };
})();

if (typeof module !== 'undefined') module.exports = Engine;
