// Branches of Power — AI Player System
// Personality definitions and decision-making for AI-controlled roles

var GameAI = (function() {
    'use strict';

    var PERSONALITIES = {
        president: [
            { name: 'Dealmaker', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.3, negotiationRate: 0.8, aggressiveness: 0.2, cooperation: 0.8 },
            { name: 'Populist', riskLevel: 0.8, legislativeFocus: 0.7, baseLieRate: 0.5, negotiationRate: 0.5, aggressiveness: 0.5, cooperation: 0.3 },
            { name: 'Hawk', riskLevel: 0.6, legislativeFocus: 0.3, baseLieRate: 0.2, negotiationRate: 0.4, aggressiveness: 0.9, cooperation: 0.2 },
            { name: 'Statesman', riskLevel: 0.3, legislativeFocus: 0.8, baseLieRate: 0.1, negotiationRate: 0.6, aggressiveness: 0.1, cooperation: 0.7 },
            { name: 'Opportunist', riskLevel: 0.7, legislativeFocus: 0.5, baseLieRate: 0.35, negotiationRate: 0.5, aggressiveness: 0.4, cooperation: 0.5 },
            { name: 'Isolationist', riskLevel: 0.4, legislativeFocus: 0.2, baseLieRate: 0.15, negotiationRate: 0.2, aggressiveness: 0.3, cooperation: 0.1 },
            { name: 'Tactician', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.4, negotiationRate: 0.9, aggressiveness: 0.4, cooperation: 0.5 },
            { name: 'Reformer', riskLevel: 0.6, legislativeFocus: 0.9, baseLieRate: 0.15, negotiationRate: 0.7, aggressiveness: 0.1, cooperation: 0.8 }
        ],
        house: [
            { name: 'Legislator', riskLevel: 0.7, legislativeFocus: 0.9, baseLieRate: 0.15, negotiationRate: 0.6, aggressiveness: 0.2, cooperation: 0.6 },
            { name: 'Obstructionist', riskLevel: 0.5, legislativeFocus: 0.3, baseLieRate: 0.3, negotiationRate: 0.4, aggressiveness: 0.8, cooperation: 0.2 },
            { name: 'Whip Master', riskLevel: 0.3, legislativeFocus: 0.6, baseLieRate: 0.1, negotiationRate: 0.5, aggressiveness: 0.3, cooperation: 0.5 },
            { name: 'Populist Speaker', riskLevel: 0.5, legislativeFocus: 0.7, baseLieRate: 0.2, negotiationRate: 0.6, aggressiveness: 0.2, cooperation: 0.7 },
            { name: 'Power Broker', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.45, negotiationRate: 0.8, aggressiveness: 0.4, cooperation: 0.5 },
            { name: 'Radical', riskLevel: 0.9, legislativeFocus: 0.8, baseLieRate: 0.5, negotiationRate: 0.3, aggressiveness: 0.7, cooperation: 0.2 },
            { name: 'Pragmatist', riskLevel: 0.5, legislativeFocus: 0.7, baseLieRate: 0.15, negotiationRate: 0.5, aggressiveness: 0.2, cooperation: 0.6 },
            { name: 'Committee Chair', riskLevel: 0.2, legislativeFocus: 0.5, baseLieRate: 0.2, negotiationRate: 0.4, aggressiveness: 0.2, cooperation: 0.4 }
        ],
        senate: [
            { name: 'Majority Leader', riskLevel: 0.5, legislativeFocus: 0.8, baseLieRate: 0.2, negotiationRate: 0.6, aggressiveness: 0.3, cooperation: 0.7 },
            { name: 'Filibusterer', riskLevel: 0.5, legislativeFocus: 0.3, baseLieRate: 0.4, negotiationRate: 0.3, aggressiveness: 0.8, cooperation: 0.2 },
            { name: 'Consensus Builder', riskLevel: 0.4, legislativeFocus: 0.6, baseLieRate: 0.05, negotiationRate: 0.7, aggressiveness: 0.1, cooperation: 0.9 },
            { name: 'Kingmaker', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.35, negotiationRate: 0.9, aggressiveness: 0.4, cooperation: 0.5 },
            { name: 'Hardliner', riskLevel: 0.7, legislativeFocus: 0.7, baseLieRate: 0.2, negotiationRate: 0.3, aggressiveness: 0.5, cooperation: 0.2 },
            { name: 'Dealmaker', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.3, negotiationRate: 0.8, aggressiveness: 0.3, cooperation: 0.7 },
            { name: 'Saboteur', riskLevel: 0.8, legislativeFocus: 0.2, baseLieRate: 0.5, negotiationRate: 0.3, aggressiveness: 0.9, cooperation: 0.1 },
            { name: 'Institutionalist', riskLevel: 0.2, legislativeFocus: 0.6, baseLieRate: 0.1, negotiationRate: 0.5, aggressiveness: 0.2, cooperation: 0.5 }
        ],
        supremeCourt: [
            { name: 'Activist', riskLevel: 0.8, legislativeFocus: 0.5, baseLieRate: 0.35, negotiationRate: 0.4, aggressiveness: 0.7, cooperation: 0.3 },
            { name: 'Originalist', riskLevel: 0.2, legislativeFocus: 0.3, baseLieRate: 0.1, negotiationRate: 0.3, aggressiveness: 0.3, cooperation: 0.5 },
            { name: 'Strategist', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.3, negotiationRate: 0.7, aggressiveness: 0.4, cooperation: 0.5 },
            { name: 'Maverick', riskLevel: 0.9, legislativeFocus: 0.4, baseLieRate: 0.45, negotiationRate: 0.3, aggressiveness: 0.6, cooperation: 0.2 },
            { name: 'Guardian', riskLevel: 0.4, legislativeFocus: 0.6, baseLieRate: 0.15, negotiationRate: 0.5, aggressiveness: 0.2, cooperation: 0.6 },
            { name: 'Politician', riskLevel: 0.5, legislativeFocus: 0.4, baseLieRate: 0.4, negotiationRate: 0.8, aggressiveness: 0.5, cooperation: 0.4 },
            { name: 'Precedent Setter', riskLevel: 0.5, legislativeFocus: 0.7, baseLieRate: 0.2, negotiationRate: 0.4, aggressiveness: 0.3, cooperation: 0.5 },
            { name: 'Minimalist', riskLevel: 0.1, legislativeFocus: 0.2, baseLieRate: 0.05, negotiationRate: 0.2, aggressiveness: 0.1, cooperation: 0.3 }
        ]
    };

    // Currently active AI config: { role: { enabled: true, personality: {...} } }
    var aiConfig = {};

    function getPersonalities(role) {
        return PERSONALITIES[role] || [];
    }

    function getRandomPersonality(role) {
        var list = PERSONALITIES[role];
        return list[Math.floor(Math.random() * list.length)];
    }

    function setAI(role, enabled, personalityName) {
        if (enabled) {
            var pers = null;
            if (personalityName === 'random' || !personalityName) {
                pers = getRandomPersonality(role);
            } else {
                var list = PERSONALITIES[role];
                for (var i = 0; i < list.length; i++) {
                    if (list[i].name === personalityName) { pers = list[i]; break; }
                }
                if (!pers) pers = getRandomPersonality(role);
            }
            aiConfig[role] = { enabled: true, personality: pers };
        } else {
            aiConfig[role] = { enabled: false, personality: null };
        }
    }

    function isAI(role) {
        return aiConfig[role] && aiConfig[role].enabled;
    }

    function getAIConfig(role) {
        return aiConfig[role] || { enabled: false, personality: null };
    }

    function resetAI() {
        aiConfig = {};
    }

    // --- Helper functions ---

    function billAligns(bill, party) {
        if (party === 'democrat') return bill.partisanship >= 11;
        return bill.partisanship <= 9;
    }

    function billMisaligns(bill, party) {
        if (party === 'democrat') return bill.partisanship <= 9;
        return bill.partisanship >= 11;
    }

    function getCourtMajority(justices) {
        var lib = 0, con = 0;
        for (var i = 0; i < justices.length; i++) {
            if (justices[i].leaning === 'liberal') lib++;
            else if (justices[i].leaning === 'conservative') con++;
        }
        return lib > con ? 'liberal' : (con > lib ? 'conservative' : 'moderate');
    }

    function pickFromPriorities(priorities, actions, p) {
        if (priorities.length > 0) {
            priorities.sort(function(a, b) { return b.weight - a.weight; });
            var pick = 0;
            if (priorities.length > 1 && Math.random() < p.riskLevel * 0.25) pick = 1;
            return priorities[Math.min(pick, priorities.length - 1)];
        }
        return { id: actions[0].id, params: {} };
    }

    // Helper to get active bill from state (works with both old currentBill and new bills array)
    function getStateBill(s) {
        if (s.bills && s.bills.length > 0) {
            for (var i = 0; i < s.bills.length; i++) {
                if (s.bills[i].id === s.activeBillId) return s.bills[i];
            }
            return s.bills[0];
        }
        return s.currentBill || null;
    }

    // --- AI Decision Functions ---

    function presidentAI(s, actions, p) {
        var party = s.president.party;
        var pop = s.president.popularity;
        var bill = getStateBill(s);
        var ids = actions.map(function(a) { return a.id; });

        if (ids.indexOf('signBill') !== -1) return { id: 'signBill', params: {} };
        if (ids.indexOf('executivePrivilege') !== -1 && (s.round <= 3 + Math.floor(p.riskLevel * 5)))
            return { id: 'executivePrivilege', params: {} };
        if (ids.indexOf('assignJustice') !== -1) {
            var lean = party === 'democrat' ? 'liberal' : 'conservative';
            return { id: 'assignJustice', params: { leaning: lean } };
        }
        if (ids.indexOf('veto') !== -1 && s.passedBills && s.passedBills.length > 0) {
            var lastBill = s.passedBills[s.passedBills.length-1];
            if (lastBill && (billMisaligns(lastBill, party) || (p.aggressiveness > 0.6 && !billAligns(lastBill, party))))
                return { id: 'veto', params: {} };
        }

        var priorities = [];

        if (ids.indexOf('advocate') !== -1 && bill && billAligns(bill, party))
            priorities.push({ id: 'advocate', params: { target: 'both' }, weight: p.legislativeFocus * 10 + p.cooperation * 3 });
        if (ids.indexOf('advocate') !== -1 && bill && !billMisaligns(bill, party) && p.cooperation > 0.5)
            priorities.push({ id: 'advocate', params: { target: 'both' }, weight: p.cooperation * 5 });
        if (ids.indexOf('taxCuts') !== -1 && s.president.actionsRemaining >= 3)
            priorities.push({ id: 'taxCuts', params: {}, weight: p.legislativeFocus * 8 + p.riskLevel * 3 });

        if (ids.indexOf('stateDinner') !== -1)
            priorities.push({ id: 'stateDinner', params: { targetRole: p.cooperation > 0.5 ? 'house' : 'senate' }, weight: (1 - p.legislativeFocus) * 8 + 3 });
        if (ids.indexOf('bullyPulpit') !== -1 && pop > 15)
            priorities.push({ id: 'bullyPulpit', params: {}, weight: (1 - p.legislativeFocus) * 7 + p.riskLevel * 3 });
        if (ids.indexOf('executiveOrder') !== -1)
            priorities.push({ id: 'executiveOrder', params: {}, weight: (1 - p.legislativeFocus) * 5 + (pop >= 18 ? 4 : 0) });

        if (ids.indexOf('witchhunt') !== -1)
            priorities.push({ id: 'witchhunt', params: {}, weight: p.aggressiveness * 10 });

        if (ids.indexOf('campaign') !== -1 && pop <= 10)
            priorities.push({ id: 'campaign', params: {}, weight: 8 });
        if (ids.indexOf('campaign') !== -1 && pop <= 15)
            priorities.push({ id: 'campaign', params: {}, weight: 3 });

        return pickFromPriorities(priorities, actions, p);
    }

    function houseAI(s, actions, p) {
        var party = s.house.majorityParty;
        var bill = getStateBill(s);
        var pc = s.house.pc;
        var ids = actions.map(function(a) { return a.id; });

        if (ids.indexOf('initiateLegislation') !== -1) {
            var pa = party === 'democrat' ? 1 : -1;
            return { id: 'initiateLegislation', params: { partAdj: pa, popAdj: 1 } };
        }

        var priorities = [];

        if (ids.indexOf('housePassBill') !== -1 && bill && billAligns(bill, party))
            priorities.push({ id: 'housePassBill', params: { pcToUse: Math.min(pc, 1 + Math.floor(p.riskLevel * 3)) }, weight: p.legislativeFocus * 12 });
        if (ids.indexOf('housePassBill') !== -1 && bill && bill.partisanship >= 7 && bill.partisanship <= 13 && p.riskLevel > 0.4)
            priorities.push({ id: 'housePassBill', params: { pcToUse: Math.min(pc, Math.floor(p.riskLevel * 4)) }, weight: p.legislativeFocus * 6 + p.riskLevel * 3 });

        if (ids.indexOf('riderAmendment') !== -1 && bill && billAligns(bill, party) && !bill.riderForHouse)
            priorities.push({ id: 'riderAmendment', params: {}, weight: p.legislativeFocus * 8 });

        if (ids.indexOf('supportBill') !== -1 && bill && billAligns(bill, party))
            priorities.push({ id: 'supportBill', params: {}, weight: p.legislativeFocus * 6 + p.cooperation * 2 });
        if (ids.indexOf('attackBill') !== -1 && bill && billMisaligns(bill, party))
            priorities.push({ id: 'attackBill', params: {}, weight: p.aggressiveness * 6 + p.legislativeFocus * 2 });

        if (ids.indexOf('killBill') !== -1 && bill && billMisaligns(bill, party))
            priorities.push({ id: 'killBill', params: {}, weight: p.aggressiveness * 7 });
        if (ids.indexOf('impeach') !== -1 && p.aggressiveness > 0.6)
            priorities.push({ id: 'impeach', params: {}, weight: p.aggressiveness * 8 + p.riskLevel * 3 });
        if (ids.indexOf('packCourts') !== -1 && p.aggressiveness > 0.5 && p.riskLevel > 0.6)
            priorities.push({ id: 'packCourts', params: {}, weight: p.aggressiveness * 6 + p.riskLevel * 4 });

        if (ids.indexOf('whipHouse') !== -1) {
            var f = party === 'democrat' ? 'republican' : 'democrat';
            var d = party === 'democrat' ? 'left' : 'right';
            priorities.push({ id: 'whipHouse', params: { faction: f, direction: d }, weight: (1 - p.riskLevel) * 5 + (pc < 3 ? 3 : 0) });
        }
        if (ids.indexOf('hostHearing') !== -1)
            priorities.push({ id: 'hostHearing', params: { choice: pc < 3 ? 'pcAndHurtPres' : 'gainVP' }, weight: (1 - p.legislativeFocus) * 5 + 2 });
        if (ids.indexOf('stateOfUnion') !== -1)
            priorities.push({ id: 'stateOfUnion', params: { choice: pc < 3 ? 'gainPC' : 'gainVP' }, weight: (1 - p.legislativeFocus) * 4 + 2 });

        if (ids.indexOf('earmark') !== -1 && pc >= 8)
            priorities.push({ id: 'earmark', params: {}, weight: 6 });

        if (ids.indexOf('caucusMeeting') !== -1)
            priorities.push({ id: 'caucusMeeting', params: {}, weight: pc < 4 ? 8 : 4 });

        if (ids.indexOf('subpoena') !== -1)
            priorities.push({ id: 'subpoena', params: {}, weight: p.aggressiveness * 6 + 3 });

        if (ids.indexOf('powerOfPurse') !== -1 && p.aggressiveness > 0.5 && p.riskLevel > 0.5)
            priorities.push({ id: 'powerOfPurse', params: {}, weight: p.aggressiveness * 7 + p.riskLevel * 5 });

        if (ids.indexOf('housePassBill') !== -1 && bill && p.riskLevel > 0.5)
            priorities.push({ id: 'housePassBill', params: { pcToUse: Math.min(pc, 2) }, weight: p.riskLevel * 4 });

        return pickFromPriorities(priorities, actions, p);
    }

    function senateAI(s, actions, p) {
        var party = s.senate.majorityParty;
        var bill = getStateBill(s);
        var pc = s.senate.pc;
        var ids = actions.map(function(a) { return a.id; });

        if (ids.indexOf('confirmJustice') !== -1 && s.justiceNominated) {
            var aligned = (party === 'democrat' && s.justiceNominated.leaning === 'liberal') ||
                          (party === 'republican' && s.justiceNominated.leaning === 'conservative') ||
                          s.justiceNominated.leaning === 'moderate';
            if (aligned || p.cooperation > 0.5)
                return { id: 'confirmJustice', params: {} };
        }

        var priorities = [];

        if (ids.indexOf('senatePassBill') !== -1 && bill && billAligns(bill, party))
            priorities.push({ id: 'senatePassBill', params: { pcToUse: Math.min(pc, 1 + Math.floor(p.riskLevel * 3)) }, weight: p.legislativeFocus * 12 });
        if (ids.indexOf('senatePassBill') !== -1 && bill && bill.partisanship >= 7 && bill.partisanship <= 13 && p.riskLevel > 0.3)
            priorities.push({ id: 'senatePassBill', params: { pcToUse: Math.min(pc, Math.floor(p.riskLevel * 3)) }, weight: p.legislativeFocus * 6 + p.riskLevel * 3 });

        if (ids.indexOf('updateBill') !== -1 && bill && !billAligns(bill, party) && p.legislativeFocus > 0.5) {
            var ps = party === 'democrat' ? 1 : -1;
            priorities.push({ id: 'updateBill', params: { changes: { partisanship: ps, popularity: 1, legality: 1 } }, weight: p.legislativeFocus * 7 });
        }

        if (ids.indexOf('filibuster') !== -1 && bill && billMisaligns(bill, party))
            priorities.push({ id: 'filibuster', params: {}, weight: p.aggressiveness * 9 });
        if (ids.indexOf('governmentShutdown') !== -1 && p.aggressiveness > 0.7)
            priorities.push({ id: 'governmentShutdown', params: {}, weight: p.aggressiveness * 8 + p.riskLevel * 3 });
        if (ids.indexOf('stallBill') !== -1 && bill && billMisaligns(bill, party))
            priorities.push({ id: 'stallBill', params: {}, weight: p.aggressiveness * 5 });

        if (ids.indexOf('conference') !== -1)
            priorities.push({ id: 'conference', params: {}, weight: p.cooperation * 5 + (pc < 3 ? 4 : 0) });
        if (ids.indexOf('debate') !== -1) {
            var dir = party === 'democrat' ? 'left' : 'right';
            priorities.push({ id: 'debate', params: { direction: dir }, weight: (1 - p.riskLevel) * 4 + (pc < 4 ? 4 : 1) });
        }
        if (ids.indexOf('nominations') !== -1)
            priorities.push({ id: 'nominations', params: { pass: pc < 3 || p.cooperation > 0.6 }, weight: 4 + (pc < 3 ? 3 : 0) });

        if (ids.indexOf('updateBill') !== -1 && bill) {
            var ps2 = party === 'democrat' ? 1 : -1;
            priorities.push({ id: 'updateBill', params: { changes: { partisanship: ps2, popularity: 1, legality: 1 } }, weight: p.legislativeFocus * 4 });
        }

        if (ids.indexOf('senatePassBill') !== -1 && bill && p.riskLevel > 0.4)
            priorities.push({ id: 'senatePassBill', params: { pcToUse: Math.min(pc, 2) }, weight: p.riskLevel * 4 });

        return pickFromPriorities(priorities, actions, p);
    }

    function supremeCourtAI(s, actions, p) {
        var justices = s.supremeCourt.justices;
        var courtLeaning = getCourtMajority(justices);
        var vp = s.supremeCourt.vp;
        var jp = s.supremeCourt.jp;
        var ids = actions.map(function(a) { return a.id; });
        var bill = getStateBill(s);

        function simReview(testBill, skipIdx) {
            var votesU = 0, votesC = 0;
            for (var ji = 0; ji < justices.length; ji++) {
                if (ji === skipIdx) continue;
                if (s.supremeCourt.recusedJusticeIndex === ji) continue;
                var j = justices[ji];
                var bp = testBill.partisanship;
                var wouldUncon = false;
                if (j.leaning === 'conservative') wouldUncon = (bp >= 11) && testBill.legality < 15;
                else if (j.leaning === 'liberal') wouldUncon = (bp <= 9) && testBill.legality < 15;
                else wouldUncon = (bp >= 15 || bp <= 5) && testBill.legality < 15;
                if (wouldUncon) votesU++; else votesC++;
            }
            if (testBill.legality > 10) votesC += Math.floor((testBill.legality - 10) / 2);
            else if (testBill.legality < 10) votesU += Math.floor((10 - testBill.legality) / 2);
            votesU -= s.supremeCourt.witchhuntDebuff || 0;
            votesU += s.supremeCourt.judicialReviewBonus || 0;
            return { u: Math.max(0, votesU), c: Math.max(0, votesC), wins: votesU > votesC };
        }

        function billAlignsWithCourt(b) {
            if (!b) return false;
            if (courtLeaning === 'liberal') return b.partisanship >= 11;
            if (courtLeaning === 'conservative') return b.partisanship <= 9;
            return b.partisanship >= 8 && b.partisanship <= 12;
        }

        var bestReviewTarget = -1, bestReviewResult = null;
        var unreviewedBills = [];
        if (s.passedBills) {
            for (var bi = 0; bi < s.passedBills.length; bi++) {
                var pb = s.passedBills[bi];
                if (pb.markers && pb.markers.indexOf('C') !== -1) continue;
                unreviewedBills.push(bi);
                var sim = simReview(pb, -1);
                if (sim.wins && (bestReviewTarget === -1 || pb.legality < s.passedBills[bestReviewTarget].legality)) {
                    bestReviewTarget = bi;
                    bestReviewResult = sim;
                }
            }
        }

        var priorities = [];

        // Judicial Review when we WILL win
        if (ids.indexOf('judicialReview') !== -1 && bestReviewTarget !== -1) {
            var margin = bestReviewResult.u - bestReviewResult.c;
            var vpToSpend = (margin <= 1 && vp >= 5) ? 5 : (margin <= 2 && vp >= 2) ? 2 : 0;
            priorities.push({ id: 'judicialReview', params: { billIndex: bestReviewTarget, vpSpent: vpToSpend }, weight: 25 });
        }

        // Recusal only if it flips a losing review to winning
        if (ids.indexOf('recusal') !== -1 && unreviewedBills.length > 0 && bestReviewTarget === -1) {
            var bestRecusalLeaning = null;
            var leanings = ['liberal', 'conservative', 'moderate'];
            for (var li = 0; li < leanings.length; li++) {
                var testLean = leanings[li];
                var jIdx = -1;
                for (var jj = 0; jj < justices.length; jj++) {
                    if (justices[jj].leaning === testLean && s.supremeCourt.recusedJusticeIndex !== jj) { jIdx = jj; break; }
                }
                if (jIdx === -1) continue;
                for (var ui = 0; ui < unreviewedBills.length; ui++) {
                    var testSim = simReview(s.passedBills[unreviewedBills[ui]], jIdx);
                    if (testSim.wins) { bestRecusalLeaning = testLean; break; }
                }
                if (bestRecusalLeaning) break;
            }
            if (bestRecusalLeaning) {
                priorities.push({ id: 'recusal', params: { leaning: bestRecusalLeaning }, weight: 18 });
            }
        }

        // Investigate Bill on misaligned bills
        if (ids.indexOf('investigateBill') !== -1 && bill && !billAlignsWithCourt(bill))
            priorities.push({ id: 'investigateBill', params: {}, weight: 14 + p.aggressiveness * 2 });

        // Constitutional Crisis
        if (ids.indexOf('constitutionalCrisis') !== -1 && unreviewedBills.length >= 2)
            priorities.push({ id: 'constitutionalCrisis', params: {}, weight: 13 + unreviewedBills.length * 2 + p.aggressiveness * 3 });

        // Landmark Ruling
        if (ids.indexOf('landmarkRuling') !== -1) {
            var eff = 'courtAuthority';
            if (s.round <= 3) eff = 'courtAuthority';
            else if (s.precedents && s.precedents.length >= 3) eff = 'precedentPower';
            else if (s.round >= 8) eff = 'extraAction';
            priorities.push({ id: 'landmarkRuling', params: { effect: eff }, weight: 12 + (s.round <= 4 ? 4 : 0) });
        }

        // Bill Review on aligned bills only
        if (ids.indexOf('billReview') !== -1 && bill && billAlignsWithCourt(bill) && bill.legality >= 10) {
            var bpa = courtLeaning === 'liberal' ? 1 : (courtLeaning === 'conservative' ? -1 : 0);
            priorities.push({ id: 'billReview', params: { partAdj: bpa, popAdj: -1 }, weight: 10 + (1 - p.aggressiveness) * 2 });
        }

        // Amicus Brief — 2 JP for 2 VP + legality -4 (good on misaligned bills)
        if (ids.indexOf('amicusBrief') !== -1 && bill && !billAlignsWithCourt(bill)) {
            priorities.push({ id: 'amicusBrief', params: {}, weight: 12 + p.aggressiveness * 2 });
        }

        // Partisan Ruling
        if (ids.indexOf('partisanRuling') !== -1) {
            var prDir = courtLeaning === 'liberal' ? 1 : -1;
            priorities.push({ id: 'partisanRuling', params: { direction: prDir }, weight: 8 + p.aggressiveness * 3 + (s.round >= 6 ? 2 : 0) });
        }

        // Baseline VP
        if (ids.indexOf('generalCourt') !== -1)
            priorities.push({ id: 'generalCourt', params: {}, weight: 7 + (1 - p.riskLevel) * 2 });
        if (ids.indexOf('advisoryRole') !== -1)
            priorities.push({ id: 'advisoryRole', params: {}, weight: 7 + (1 - p.riskLevel) * 2 });

        // Oral Arguments — good VP action, moves bill toward center
        if (ids.indexOf('oralArguments') !== -1)
            priorities.push({ id: 'oralArguments', params: {}, weight: 9 + (1 - p.aggressiveness) * 2 });

        // Certiorari — weaken a passed bill for future overturn
        if (ids.indexOf('certiorari') !== -1 && s.passedBills) {
            for (var ci = 0; ci < s.passedBills.length; ci++) {
                var cb = s.passedBills[ci];
                if (!cb.certiorariUsed && !(cb.markers && cb.markers.indexOf('C') !== -1)) {
                    priorities.push({ id: 'certiorari', params: { billIndex: ci }, weight: 10 + p.aggressiveness * 2 });
                    break;
                }
            }
        }

        // Clerks Research — build JP for future powerful actions
        if (ids.indexOf('clerksResearch') !== -1)
            priorities.push({ id: 'clerksResearch', params: {}, weight: 7 + (jp < 3 ? 4 : 0) + (1 - p.riskLevel) * 2 });

        // Write Opinion — +2 VP, +1 JP
        if (ids.indexOf('writeOpinion') !== -1)
            priorities.push({ id: 'writeOpinion', params: {}, weight: 9 + (1 - p.riskLevel) * 2 });

        // Injunction — block bill votes (save for misaligned bills)
        if (ids.indexOf('injunction') !== -1 && bill && !billAlignsWithCourt(bill))
            priorities.push({ id: 'injunction', params: {}, weight: 11 + p.aggressiveness * 3 });

        // Lower priority
        if (ids.indexOf('investigateEO') !== -1)
            priorities.push({ id: 'investigateEO', params: {}, weight: 5 + p.aggressiveness * 4 });
        if (ids.indexOf('suggestJustice') !== -1)
            priorities.push({ id: 'suggestJustice', params: { leaning: courtLeaning }, weight: p.cooperation * 3 + 2 });
        if (ids.indexOf('inquiryPresident') !== -1) {
            var presAligned = (s.president.party === 'democrat' && courtLeaning === 'liberal') || (s.president.party === 'republican' && courtLeaning === 'conservative');
            priorities.push({ id: 'inquiryPresident', params: { choice: presAligned ? 'help' : 'hurt' }, weight: 3 + p.aggressiveness * 2 });
        }
        if (ids.indexOf('inquiryChamber') !== -1) {
            var ha = (s.house.majorityParty === 'democrat' && courtLeaning === 'liberal') ||
                     (s.house.majorityParty === 'republican' && courtLeaning === 'conservative');
            priorities.push({ id: 'inquiryChamber', params: { target: ha ? 'senate' : 'house', choice: 'hurt' }, weight: 2 + p.aggressiveness * 2 });
        }
        if (ids.indexOf('internalInquiry') !== -1)
            priorities.push({ id: 'internalInquiry', params: {}, weight: 3 + p.riskLevel * 2 });
        if (ids.indexOf('disapproveJustice') !== -1 && s.justiceNominated) {
            var na = (courtLeaning === 'liberal' && s.justiceNominated.leaning === 'liberal') ||
                     (courtLeaning === 'conservative' && s.justiceNominated.leaning === 'conservative') ||
                     s.justiceNominated.leaning === 'moderate';
            if (!na) priorities.push({ id: 'disapproveJustice', params: {}, weight: 6 + p.aggressiveness * 2 });
        }
        if (ids.indexOf('investigateBill') !== -1 && bill && billAlignsWithCourt(bill))
            priorities.push({ id: 'investigateBill', params: {}, weight: 4 });

        return pickFromPriorities(priorities, actions, p);
    }

    // --- Main decision function ---

    function getAIDecision(role, state, actions) {
        var config = aiConfig[role];
        if (!config || !config.enabled) return null;
        var p = config.personality;

        // AI deal-making: 30% chance to propose a deal before main action
        if (Math.random() < 0.30 && typeof Engine !== 'undefined') {
            var otherRoles = ['president', 'house', 'senate', 'supremeCourt'].filter(function(r) { return r !== role; });
            // Pick target with highest trust toward the AI
            var bestTarget = null;
            var bestTrust = -Infinity;
            for (var ti = 0; ti < otherRoles.length; ti++) {
                var tr = state.trust && state.trust[otherRoles[ti]] ? (state.trust[otherRoles[ti]][role] || 5) : 5;
                if (tr > bestTrust) { bestTrust = tr; bestTarget = otherRoles[ti]; }
            }
            if (bestTarget) {
                var proposal = getAIDealProposal(role, bestTarget, state);
                if (proposal) {
                    Engine.proposeDeal(role, proposal.to, proposal.askType, proposal.offerType, proposal.message);
                }
            }
        }

        // Prioritize event resolution when stability is low or events are active
        var eventActions = actions.filter(function(a) { return a.id === 'resolveEvent' || a.id === 'eventSpecialAction'; });
        if (eventActions.length > 0 && state.stability !== undefined) {
            // Always try to resolve events when stability <= 4, or with cooperation-weighted chance otherwise
            var resolveChance = state.stability <= 2 ? 0.95 : (state.stability <= 4 ? 0.8 : (0.4 + p.cooperation * 0.4));
            if (Math.random() < resolveChance) {
                // Pick the best resolution (prefer non-cooperative solo actions for simplicity)
                var soloActions = eventActions.filter(function(a) { return a.id === 'resolveEvent'; });
                if (soloActions.length > 0) {
                    var pick = soloActions[Math.floor(Math.random() * soloActions.length)];
                    return { id: pick.id, params: pick.params || {} };
                }
                // Try special actions
                var specials = eventActions.filter(function(a) { return a.id === 'eventSpecialAction'; });
                if (specials.length > 0) {
                    return { id: specials[0].id, params: specials[0].params || {} };
                }
            }
        }

        // Unity Summit: agree if stability is low, or with cooperation chance
        var unitySummitActions = actions.filter(function(a) { return a.id === 'agreeUnitySummit' || a.id === 'proposeUnitySummit'; });
        if (unitySummitActions.length > 0 && state.stability !== undefined) {
            var agreeAction = unitySummitActions.filter(function(a) { return a.id === 'agreeUnitySummit'; });
            if (agreeAction.length > 0) {
                var agreeChance = state.stability <= 3 ? 0.95 : (state.stability <= 5 ? 0.7 : (0.3 + p.cooperation * 0.4));
                if (Math.random() < agreeChance) {
                    return { id: 'agreeUnitySummit', params: {} };
                }
            }
            var proposeAction = unitySummitActions.filter(function(a) { return a.id === 'proposeUnitySummit'; });
            if (proposeAction.length > 0 && state.stability <= 4 && p.cooperation >= 0.5) {
                if (Math.random() < 0.4) {
                    return { id: 'proposeUnitySummit', params: {} };
                }
            }
        }

        switch (role) {
            case 'president': return presidentAI(state, actions, p);
            case 'house': return houseAI(state, actions, p);
            case 'senate': return senateAI(state, actions, p);
            case 'supremeCourt': return supremeCourtAI(state, actions, p);
        }
        return null;
    }

    // AI deal response: decides whether to accept a deal from a player
    function respondToDeal(aiRole, fromRole, askType, offerType, state) {
        var conf = aiConfig[aiRole];
        if (!conf || !conf.personality) return Math.random() > 0.5;
        var p = conf.personality;

        // Base acceptance from cooperation trait
        var acceptChance = p.cooperation * 0.5 + 0.2;

        // Trust modifier
        var trust = state.trust && state.trust[aiRole] ? state.trust[aiRole][fromRole] || 5 : 5;
        acceptChance += (trust - 5) * 0.05;

        // If they're asking something hard, less likely
        var hardAsks = ['filibuster', 'killBill', 'vetoBill', 'reviewBill', 'dontResolveEvent'];
        if (hardAsks.indexOf(askType) !== -1) acceptChance -= 0.15;

        // If offer is good, more likely
        var goodOffers = ['passBillHouse', 'passBillSenate', 'signBill', 'confirmJustice', 'nominateJustice',
                          'resolveEvent', 'commitToEvent', 'agreeUnitySummit'];
        if (goodOffers.indexOf(offerType) !== -1) acceptChance += 0.15;

        // Event-specific logic
        var stab = state.stability !== undefined ? state.stability : 5;

        // If they ask us to resolve/commit to event and stability is low, very likely to agree
        if ((askType === 'resolveEvent' || askType === 'commitToEvent') && stab <= 4) {
            acceptChance += 0.3;
        }
        // If they offer to resolve event, we like that
        if ((offerType === 'resolveEvent' || offerType === 'commitToEvent') && stab <= 5) {
            acceptChance += 0.2;
        }
        // If they ask us NOT to resolve, depends on whether it benefits us strategically
        if (askType === 'dontResolveEvent') {
            if (stab <= 3) {
                acceptChance -= 0.4; // Too dangerous to let it fail
            } else {
                acceptChance += p.aggressiveness * 0.2 - 0.1; // Aggressive AIs more open to chaos
            }
        }
        // Unity summit deals — cooperative AIs love these
        if (askType === 'agreeUnitySummit' || offerType === 'agreeUnitySummit') {
            acceptChance += p.cooperation * 0.2;
            if (stab <= 4) acceptChance += 0.2;
        }

        // Aggressive personalities less likely to cooperate
        acceptChance -= p.aggressiveness * 0.2;

        return Math.random() < Math.max(0.1, Math.min(0.9, acceptChance));
    }

    // AI proactively proposes deals to the player
    function getAIDealProposal(aiRole, playerRole, state) {
        var conf = aiConfig[aiRole];
        if (!conf || !conf.personality) return null;
        var p = conf.personality;

        // Only propose if negotiation rate is high enough
        if (Math.random() > (p.negotiationRate || 0.3)) return null;

        // Don't spam deals
        var existingDeals = (state.deals || []).filter(function(d) {
            return d.from === aiRole && d.to === playerRole && (d.status === 'pending' || d.status === 'accepted');
        });
        if (existingDeals.length > 0) return null;

        var bill = getStateBill(state);
        var proposals = [];
        var stab = state.stability !== undefined ? state.stability : 5;

        // Event-related deal proposals (high priority when events are active)
        if (state.activeEvent && !state.activeEvent.resolved) {
            var evt = state.activeEvent;
            var evtName = evt.name;

            // Ask player to help resolve event
            if (stab <= 5 || p.cooperation >= 0.5) {
                proposals.push({ ask: 'resolveEvent', offer: 'resolveEvent', msg: 'Let\'s both work to resolve "' + evtName + '"!' });
                proposals.push({ ask: 'commitToEvent', offer: 'commitToEvent', msg: 'We need to cooperate on "' + evtName + '" — commit together?' });
            }

            // If stability is critical, urgently ask for help
            if (stab <= 3) {
                proposals.push({ ask: 'resolveEvent', offer: 'general', msg: '⚠️ Stability is critical! Please help resolve "' + evtName + '"!' });
                proposals.push({ ask: 'commitToEvent', offer: 'general', msg: '⚠️ We MUST resolve "' + evtName + '" or we all lose!' });
            }

            // Aggressive AI might propose letting events fail for strategic gain
            if (p.aggressiveness >= 0.6 && stab >= 5 && evt.failPenalty) {
                var pen = evt.failPenalty;
                // If failure would hurt opponents more than us
                var myLoss = (pen.vp && pen.vp[aiRole]) ? pen.vp[aiRole] : 0;
                var theirLoss = (pen.vp && pen.vp[playerRole]) ? pen.vp[playerRole] : 0;
                if (theirLoss < myLoss - 1 || pen.houseShift || pen.senateShift || (pen.justiceEffect && aiRole !== 'supremeCourt')) {
                    proposals.push({ ask: 'dontResolveEvent', offer: 'dontResolveEvent', msg: 'Let "' + evtName + '" fail — the chaos benefits us both.' });
                }
            }

            // Offer to use event special action in exchange for something
            if (evt.specialActions && evt.specialActions.length > 0) {
                proposals.push({ ask: 'general', offer: 'eventSpecialAction', msg: 'I\'ll use a special action on "' + evtName + '" if you help me out.' });
            }
        }

        // Unity Summit deals
        if (state.pendingUnitySummit && state.pendingUnitySummit.needed.indexOf(playerRole) !== -1) {
            proposals.push({ ask: 'agreeUnitySummit', offer: 'general', msg: 'Please join the Unity Summit — we need your support!' });
        }
        if (!state.pendingUnitySummit && stab <= 4 && p.cooperation >= 0.4) {
            proposals.push({ ask: 'proposeUnitySummit', offer: 'agreeUnitySummit', msg: 'Propose a Unity Summit and I\'ll agree to it.' });
            proposals.push({ ask: 'agreeUnitySummit', offer: 'proposeUnitySummit', msg: 'I\'ll propose a Unity Summit if you agree to join.' });
        }

        // Role-specific deal proposals
        if (aiRole === 'house' && bill) {
            if (bill.passedByHouse) {
                proposals.push({ ask: 'signBill', offer: 'passBillHouse', msg: 'We passed the bill — will you sign it?' });
            } else {
                proposals.push({ ask: 'signBill', offer: 'passBillHouse', msg: 'Pass this bill if you sign it.' });
            }
        }
        if (aiRole === 'senate' && bill) {
            proposals.push({ ask: 'signBill', offer: 'passBillSenate', msg: 'We\'ll pass the bill if you sign it.' });
            if (playerRole === 'house') {
                proposals.push({ ask: 'passBillHouse', offer: 'passBillSenate', msg: 'Let\'s both pass this bill.' });
            }
        }
        if (aiRole === 'president') {
            proposals.push({ ask: 'passBillHouse', offer: 'signBill', msg: 'Pass the bill and I\'ll sign it.' });
            proposals.push({ ask: 'passBillSenate', offer: 'signBill', msg: 'Get the Senate to pass it, I\'ll sign.' });
        }
        if (aiRole === 'supremeCourt') {
            proposals.push({ ask: 'general', offer: 'reviewBill', msg: 'Support our judicial review efforts.' });
        }

        // General proposals
        proposals.push({ ask: 'general', offer: 'general', msg: 'Let\'s cooperate this round.' });

        if (proposals.length === 0) return null;
        var pick = proposals[Math.floor(Math.random() * proposals.length)];
        return { to: playerRole, askType: pick.ask, offerType: pick.offer, message: pick.msg };
    }

    return {
        PERSONALITIES: PERSONALITIES,
        getPersonalities: getPersonalities,
        getRandomPersonality: getRandomPersonality,
        setAI: setAI,
        isAI: isAI,
        getAIConfig: getAIConfig,
        resetAI: resetAI,
        getAIDecision: getAIDecision,
        respondToDeal: respondToDeal,
        getAIDealProposal: getAIDealProposal
    };
})();

if (typeof module !== 'undefined') module.exports = GameAI;
