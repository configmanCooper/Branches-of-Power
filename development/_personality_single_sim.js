// Single simulation runner for personality testing
// Usage: node _personality_single_sim.js <fixedRole> <fixedPersonalityIndex>
'use strict';
var path = require('path');
global.Config = require(path.join(__dirname, '..', 'game', 'js', 'config.js'));
delete require.cache[require.resolve(path.join(__dirname, '..', 'game', 'js', 'engine.js'))];
var Engine = require(path.join(__dirname, '..', 'game', 'js', 'engine.js'));
Engine.init('standard');
var state = Engine.getState();
var ROLES_LIST = ['president', 'house', 'senate', 'supremeCourt'];

var fixedRole = process.argv[2] || 'president';
var fixedIdx = parseInt(process.argv[3] || '0', 10);

var trust = {
    president: { house: 5, senate: 5, supremeCourt: 5 },
    house: { president: 5, senate: 5, supremeCourt: 5 },
    senate: { president: 5, house: 5, supremeCourt: 5 },
    supremeCourt: { president: 5, house: 5, senate: 5 }
};
var pendingPromises = [];
var promiseStats = {
    president: { made: 0, kept: 0, broken: 0 },
    house: { made: 0, kept: 0, broken: 0 },
    senate: { made: 0, kept: 0, broken: 0 },
    supremeCourt: { made: 0, kept: 0, broken: 0 }
};

function clampTrust(val) { return Math.max(0, Math.min(10, val)); }
function adjustTrust(from, to, amount) { trust[from][to] = clampTrust(trust[from][to] + amount); }
function otherRoles(role) { return ROLES_LIST.filter(function(r) { return r !== role; }); }
function getVPForRole(s, role) { return s[role].vp; }

var PRESIDENT_TYPES = [
    { name: 'Dealmaker', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.3, negotiationRate: 0.8, aggressiveness: 0.2, cooperation: 0.8 },
    { name: 'Populist', riskLevel: 0.8, legislativeFocus: 0.7, baseLieRate: 0.5, negotiationRate: 0.5, aggressiveness: 0.5, cooperation: 0.3 },
    { name: 'Hawk', riskLevel: 0.6, legislativeFocus: 0.3, baseLieRate: 0.2, negotiationRate: 0.4, aggressiveness: 0.9, cooperation: 0.2 },
    { name: 'Statesman', riskLevel: 0.3, legislativeFocus: 0.8, baseLieRate: 0.1, negotiationRate: 0.6, aggressiveness: 0.1, cooperation: 0.7 },
    { name: 'Opportunist', riskLevel: 0.7, legislativeFocus: 0.5, baseLieRate: 0.35, negotiationRate: 0.5, aggressiveness: 0.4, cooperation: 0.5 },
    { name: 'Isolationist', riskLevel: 0.4, legislativeFocus: 0.2, baseLieRate: 0.15, negotiationRate: 0.2, aggressiveness: 0.3, cooperation: 0.1 },
    { name: 'Tactician', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.4, negotiationRate: 0.9, aggressiveness: 0.4, cooperation: 0.5 },
    { name: 'Reformer', riskLevel: 0.6, legislativeFocus: 0.9, baseLieRate: 0.15, negotiationRate: 0.7, aggressiveness: 0.1, cooperation: 0.8 }
];
var HOUSE_TYPES = [
    { name: 'Legislator', riskLevel: 0.7, legislativeFocus: 0.9, baseLieRate: 0.15, negotiationRate: 0.6, aggressiveness: 0.2, cooperation: 0.6 },
    { name: 'Obstructionist', riskLevel: 0.5, legislativeFocus: 0.3, baseLieRate: 0.3, negotiationRate: 0.4, aggressiveness: 0.8, cooperation: 0.2 },
    { name: 'Whip Master', riskLevel: 0.3, legislativeFocus: 0.6, baseLieRate: 0.1, negotiationRate: 0.5, aggressiveness: 0.3, cooperation: 0.5 },
    { name: 'Populist Speaker', riskLevel: 0.5, legislativeFocus: 0.7, baseLieRate: 0.2, negotiationRate: 0.6, aggressiveness: 0.2, cooperation: 0.7 },
    { name: 'Power Broker', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.45, negotiationRate: 0.8, aggressiveness: 0.4, cooperation: 0.5 },
    { name: 'Radical', riskLevel: 0.9, legislativeFocus: 0.8, baseLieRate: 0.5, negotiationRate: 0.3, aggressiveness: 0.7, cooperation: 0.2 },
    { name: 'Pragmatist', riskLevel: 0.5, legislativeFocus: 0.7, baseLieRate: 0.15, negotiationRate: 0.5, aggressiveness: 0.2, cooperation: 0.6 },
    { name: 'Committee Chair', riskLevel: 0.2, legislativeFocus: 0.5, baseLieRate: 0.2, negotiationRate: 0.4, aggressiveness: 0.2, cooperation: 0.4 }
];
var SENATE_TYPES = [
    { name: 'Majority Leader', riskLevel: 0.5, legislativeFocus: 0.8, baseLieRate: 0.2, negotiationRate: 0.6, aggressiveness: 0.3, cooperation: 0.7 },
    { name: 'Filibusterer', riskLevel: 0.5, legislativeFocus: 0.3, baseLieRate: 0.4, negotiationRate: 0.3, aggressiveness: 0.8, cooperation: 0.2 },
    { name: 'Consensus Builder', riskLevel: 0.4, legislativeFocus: 0.6, baseLieRate: 0.05, negotiationRate: 0.7, aggressiveness: 0.1, cooperation: 0.9 },
    { name: 'Kingmaker', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.35, negotiationRate: 0.9, aggressiveness: 0.4, cooperation: 0.5 },
    { name: 'Hardliner', riskLevel: 0.7, legislativeFocus: 0.7, baseLieRate: 0.2, negotiationRate: 0.3, aggressiveness: 0.5, cooperation: 0.2 },
    { name: 'Dealmaker', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.3, negotiationRate: 0.8, aggressiveness: 0.3, cooperation: 0.7 },
    { name: 'Saboteur', riskLevel: 0.8, legislativeFocus: 0.2, baseLieRate: 0.5, negotiationRate: 0.3, aggressiveness: 0.9, cooperation: 0.1 },
    { name: 'Institutionalist', riskLevel: 0.2, legislativeFocus: 0.6, baseLieRate: 0.1, negotiationRate: 0.5, aggressiveness: 0.2, cooperation: 0.5 }
];
var SC_TYPES = [
    { name: 'Activist', riskLevel: 0.8, legislativeFocus: 0.5, baseLieRate: 0.35, negotiationRate: 0.4, aggressiveness: 0.7, cooperation: 0.3 },
    { name: 'Originalist', riskLevel: 0.2, legislativeFocus: 0.3, baseLieRate: 0.1, negotiationRate: 0.3, aggressiveness: 0.3, cooperation: 0.5 },
    { name: 'Strategist', riskLevel: 0.5, legislativeFocus: 0.5, baseLieRate: 0.3, negotiationRate: 0.7, aggressiveness: 0.4, cooperation: 0.5 },
    { name: 'Maverick', riskLevel: 0.9, legislativeFocus: 0.4, baseLieRate: 0.45, negotiationRate: 0.3, aggressiveness: 0.6, cooperation: 0.2 },
    { name: 'Guardian', riskLevel: 0.4, legislativeFocus: 0.6, baseLieRate: 0.15, negotiationRate: 0.5, aggressiveness: 0.2, cooperation: 0.6 },
    { name: 'Politician', riskLevel: 0.5, legislativeFocus: 0.4, baseLieRate: 0.4, negotiationRate: 0.8, aggressiveness: 0.5, cooperation: 0.4 },
    { name: 'Precedent Setter', riskLevel: 0.5, legislativeFocus: 0.7, baseLieRate: 0.2, negotiationRate: 0.4, aggressiveness: 0.3, cooperation: 0.5 },
    { name: 'Minimalist', riskLevel: 0.1, legislativeFocus: 0.2, baseLieRate: 0.05, negotiationRate: 0.2, aggressiveness: 0.1, cooperation: 0.3 }
];

var ALL_TYPES = { president: PRESIDENT_TYPES, house: HOUSE_TYPES, senate: SENATE_TYPES, supremeCourt: SC_TYPES };

// Fixed personality for the tested role, random for others
var personality = {};
for (var ri = 0; ri < ROLES_LIST.length; ri++) {
    var r = ROLES_LIST[ri];
    if (r === fixedRole) {
        personality[r] = ALL_TYPES[r][fixedIdx];
    } else {
        personality[r] = ALL_TYPES[r][Math.floor(Math.random() * ALL_TYPES[r].length)];
    }
}

function lieChance(role, targetRole, s) {
    var others = otherRoles(role);
    var otherVPs = others.map(function(r) { return getVPForRole(s, r); });
    var maxOtherVP = Math.max.apply(null, otherVPs);
    var vpLead = getVPForRole(s, role) - maxOtherVP;
    var desperation = vpLead < -10 ? 3 : (vpLead < -5 ? 2 : (vpLead < 0 ? 1 : 0));
    var roundsLeft = s.maxRounds - s.round;
    var base = personality[role].baseLieRate;
    var prob = base + (desperation * 0.1) - (roundsLeft * 0.03) - (trust[targetRole][role] * 0.02);
    return Math.max(0, Math.min(0.8, prob));
}

function makePromise(from, to, type, details, round) {
    var p = { from: from, to: to, type: type, details: details, round: round, fulfilled: null };
    pendingPromises.push(p);
    promiseStats[from].made++;
    return p;
}
function fulfillPromise(p) { p.fulfilled = true; promiseStats[p.from].kept++; adjustTrust(p.to, p.from, 1); }
function breakPromise(p) {
    p.fulfilled = false; promiseStats[p.from].broken++; adjustTrust(p.to, p.from, -2);
    var others = otherRoles(p.from);
    for (var i = 0; i < others.length; i++) { if (others[i] !== p.to) adjustTrust(others[i], p.from, -0.5); }
}

function getCourtMajority(justices) {
    var lib = 0, con = 0;
    for (var i = 0; i < justices.length; i++) {
        if (justices[i].leaning === 'liberal') lib++;
        else if (justices[i].leaning === 'conservative') con++;
    }
    return lib > con ? 'liberal' : (con > lib ? 'conservative' : 'moderate');
}
function billAligns(bill, party) { return !bill ? false : (party === 'democrat' ? bill.partisanship > 10 : bill.partisanship < 10); }
function billMisaligns(bill, party) { return !bill ? false : (party === 'democrat' ? bill.partisanship < 8 : bill.partisanship > 12); }

// Negotiations (simplified)
function runNegotiations(role, s, actions) {
    var actionIds = actions.map(function(a) { return a.id; });
    var bill = s.currentBill;
    var p = personality[role];
    if (Math.random() > p.negotiationRate) return;
    var targets = otherRoles(role);
    var target = targets[Math.floor(Math.random() * targets.length)];
    if (trust[role][target] < 3 && Math.random() > 0.3) return;
    if (bill && (actionIds.indexOf('housePassBill') !== -1 || actionIds.indexOf('senatePassBill') !== -1)) {
        var party = role === 'president' ? s.president.party :
            (role === 'house' ? s.house.majorityParty : (role === 'senate' ? s.senate.majorityParty : 'independent'));
        var align = billAligns(bill, party);
        if (align && trust[role][target] >= 4) {
            makePromise(role, target, 'support_bill', 'Will vote yes on current bill', s.round);
        }
    }
}

function evaluatePromises(role, actionId, s, round) {
    for (var i = pendingPromises.length - 1; i >= 0; i--) {
        var p = pendingPromises[i];
        if (p.fulfilled !== null) continue;
        if (p.from === role && p.type === 'support_bill' && (actionId === 'housePassBill' || actionId === 'senatePassBill')) {
            if (Math.random() < lieChance(role, p.to, s)) breakPromise(p);
            else fulfillPromise(p);
        }
        if (round - p.round > 2 && p.fulfilled === null) breakPromise(p);
    }
}

function decayTrust() {
    for (var i = 0; i < ROLES_LIST.length; i++) {
        for (var j = 0; j < ROLES_LIST.length; j++) {
            if (i !== j) trust[ROLES_LIST[i]][ROLES_LIST[j]] = clampTrust(trust[ROLES_LIST[i]][ROLES_LIST[j]] - 0.2);
        }
    }
}

// ========== AI DECISION FUNCTIONS (from batch_simulation.js) ==========
function presidentAI(s, actions) {
    var party = s.president.party;
    var pop = s.president.popularity;
    var bill = s.currentBill;
    var ids = actions.map(function(a) { return a.id; });
    var p = personality.president;

    if (ids.indexOf('signBill') !== -1) return { id: 'signBill', params: {} };
    if (ids.indexOf('executivePrivilege') !== -1 && (s.round <= 3 + Math.floor(p.riskLevel * 5)))
        return { id: 'executivePrivilege', params: {} };
    if (ids.indexOf('assignJustice') !== -1) {
        var lean = party === 'democrat' ? 'liberal' : 'conservative';
        return { id: 'assignJustice', params: { leaning: lean } };
    }
    if (ids.indexOf('veto') !== -1 && s.passedBills.length > 0) {
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

    if (priorities.length > 0) {
        priorities.sort(function(a, b) { return b.weight - a.weight; });
        var pick = 0;
        if (priorities.length > 1 && Math.random() < p.riskLevel * 0.3) pick = 1;
        if (priorities.length > 2 && Math.random() < p.riskLevel * 0.15) pick = 2;
        return priorities[Math.min(pick, priorities.length - 1)];
    }
    return { id: actions[0].id, params: {} };
}

function houseAI(s, actions) {
    var party = s.house.majorityParty;
    var bill = s.currentBill;
    var pc = s.house.pc;
    var ids = actions.map(function(a) { return a.id; });
    var p = personality.house;

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

    if (priorities.length > 0) {
        priorities.sort(function(a, b) { return b.weight - a.weight; });
        var pick = 0;
        if (priorities.length > 1 && Math.random() < p.riskLevel * 0.3) pick = 1;
        if (priorities.length > 2 && Math.random() < p.riskLevel * 0.15) pick = 2;
        return priorities[Math.min(pick, priorities.length - 1)];
    }
    return { id: actions[0].id, params: {} };
}

function senateAI(s, actions) {
    var party = s.senate.majorityParty;
    var bill = s.currentBill;
    var pc = s.senate.pc;
    var ids = actions.map(function(a) { return a.id; });
    var p = personality.senate;

    if (ids.indexOf('confirmJustice') !== -1 && s.justiceNominated) {
        var aligned = (party === 'democrat' && s.justiceNominated.leaning === 'liberal') ||
                      (party === 'republican' && s.justiceNominated.leaning === 'conservative') ||
                      s.justiceNominated.leaning === 'moderate';
        if (aligned || (p.cooperation > 0.5 && trust.senate.president >= 5))
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

    if (priorities.length > 0) {
        priorities.sort(function(a, b) { return b.weight - a.weight; });
        var pick = 0;
        if (priorities.length > 1 && Math.random() < p.riskLevel * 0.3) pick = 1;
        if (priorities.length > 2 && Math.random() < p.riskLevel * 0.15) pick = 2;
        return priorities[Math.min(pick, priorities.length - 1)];
    }
    return { id: actions[0].id, params: {} };
}

function supremeCourtAI(s, actions) {
    var justices = s.supremeCourt.justices;
    var courtLeaning = getCourtMajority(justices);
    var vp = s.supremeCourt.vp;
    var jp = s.supremeCourt.jp;
    var ids = actions.map(function(a) { return a.id; });
    var bill = s.currentBill;
    var p = personality.supremeCourt;

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

    if (ids.indexOf('judicialReview') !== -1 && bestReviewTarget !== -1) {
        var margin = bestReviewResult.u - bestReviewResult.c;
        var vpToSpend = (margin <= 1 && vp >= 5) ? 5 : (margin <= 2 && vp >= 2) ? 2 : 0;
        priorities.push({ id: 'judicialReview', params: { billIndex: bestReviewTarget, vpSpent: vpToSpend }, weight: 25 });
    }

    if (ids.indexOf('recusal') !== -1 && unreviewedBills.length > 0 && bestReviewTarget === -1) {
        var bestRecusalLeaning = null, bestRecusalWeight = 0;
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
                if (testSim.wins) {
                    bestRecusalLeaning = testLean;
                    bestRecusalWeight = 18;
                    break;
                }
            }
            if (bestRecusalLeaning) break;
        }
        if (bestRecusalLeaning) {
            priorities.push({ id: 'recusal', params: { leaning: bestRecusalLeaning }, weight: bestRecusalWeight });
        }
    }

    if (ids.indexOf('investigateBill') !== -1 && bill && !billAlignsWithCourt(bill))
        priorities.push({ id: 'investigateBill', params: {}, weight: 14 + p.aggressiveness * 2 });

    if (ids.indexOf('constitutionalCrisis') !== -1 && unreviewedBills.length >= 2)
        priorities.push({ id: 'constitutionalCrisis', params: {}, weight: 13 + unreviewedBills.length * 2 + p.aggressiveness * 3 });

    if (ids.indexOf('landmarkRuling') !== -1) {
        var eff = 'courtAuthority';
        if (s.round <= 3) eff = 'courtAuthority';
        else if (s.precedents && s.precedents.length >= 3) eff = 'precedentPower';
        else if (s.round >= 8) eff = 'extraAction';
        priorities.push({ id: 'landmarkRuling', params: { effect: eff }, weight: 12 + (s.round <= 4 ? 4 : 0) });
    }

    if (ids.indexOf('billReview') !== -1 && bill && billAlignsWithCourt(bill) && bill.legality >= 10) {
        var bpa = courtLeaning === 'liberal' ? 1 : (courtLeaning === 'conservative' ? -1 : 0);
        priorities.push({ id: 'billReview', params: { partAdj: bpa, popAdj: -1 }, weight: 10 + (1 - p.aggressiveness) * 2 });
    }

    // Amicus Brief — 2 JP for 2 VP + legality -4 (good on misaligned bills)
    if (ids.indexOf('amicusBrief') !== -1 && bill && !billAlignsWithCourt(bill)) {
        priorities.push({ id: 'amicusBrief', params: {}, weight: 12 + p.aggressiveness * 2 });
    }

    if (ids.indexOf('partisanRuling') !== -1) {
        var prDir = courtLeaning === 'liberal' ? 1 : -1;
        priorities.push({ id: 'partisanRuling', params: { direction: prDir }, weight: 8 + p.aggressiveness * 3 + (s.round >= 6 ? 2 : 0) });
    }

    if (ids.indexOf('generalCourt') !== -1)
        priorities.push({ id: 'generalCourt', params: {}, weight: 7 + (1 - p.riskLevel) * 2 });
    if (ids.indexOf('advisoryRole') !== -1)
        priorities.push({ id: 'advisoryRole', params: {}, weight: 7 + (1 - p.riskLevel) * 2 });

    // Oral Arguments — partisanship toward center, +2 VP
    if (ids.indexOf('oralArguments') !== -1)
        priorities.push({ id: 'oralArguments', params: {}, weight: 9 + (1 - p.aggressiveness) * 2 });

    // Certiorari — weaken passed bill for future overturn
    if (ids.indexOf('certiorari') !== -1 && s.passedBills) {
        for (var ci = 0; ci < s.passedBills.length; ci++) {
            var cb = s.passedBills[ci];
            if (!cb.certiorariUsed && !(cb.markers && cb.markers.indexOf('C') !== -1)) {
                priorities.push({ id: 'certiorari', params: { billIndex: ci }, weight: 10 + p.aggressiveness * 2 });
                break;
            }
        }
    }

    // Clerks Research — build JP
    if (ids.indexOf('clerksResearch') !== -1)
        priorities.push({ id: 'clerksResearch', params: {}, weight: 6 + (jp < 3 ? 4 : 0) + (1 - p.riskLevel) * 2 });

    // Injunction — block misaligned bill votes
    if (ids.indexOf('injunction') !== -1 && bill && !billAlignsWithCourt(bill))
        priorities.push({ id: 'injunction', params: {}, weight: 11 + p.aggressiveness * 3 });

    if (ids.indexOf('investigateEO') !== -1)
        priorities.push({ id: 'investigateEO', params: {}, weight: 5 + p.aggressiveness * 3 });
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

    if (priorities.length > 0) {
        priorities.sort(function(a, b) { return b.weight - a.weight; });
        var pick = 0;
        if (priorities.length > 1 && Math.random() < p.riskLevel * 0.25) pick = 1;
        return priorities[Math.min(pick, priorities.length - 1)];
    }
    return { id: actions[0].id, params: {} };
}

function getAIDecision(role, s, actions) {
    switch (role) {
        case 'president': return presidentAI(s, actions);
        case 'house': return houseAI(s, actions);
        case 'senate': return senateAI(s, actions);
        case 'supremeCourt': return supremeCourtAI(s, actions);
        default: return { id: actions[0].id, params: {} };
    }
}

// ========== RUN SIMULATION ==========
var totalActions = 0;
var maxIter = 2000;

while (state.phase !== 'gameOver' && totalActions < maxIter) {
    var currentRound = state.round;
    var roundActions = 0;
    while (state.phase === 'action' && state.round === currentRound && roundActions < 200) {
        var role = Engine.getCurrentRole();
        var actions = Engine.getAvailableActions(role);
        if (actions.length === 0) break;
        runNegotiations(role, state, actions);
        var failedIds = [];
        var succeeded = false;
        var wasFreeAction = false;
        var prevRound = state.round;
        for (var retries = 0; retries < 20; retries++) {
            var filtered = actions.filter(function(a) { return failedIds.indexOf(a.id) === -1; });
            if (filtered.length === 0) break;
            var decision;
            var hasInit = filtered.some(function(a) { return a.id === 'initiateLegislation'; });
            if (role === 'house' && hasInit) {
                var adj = state.house.majorityParty === 'democrat' ? 1 : -1;
                decision = { id: 'initiateLegislation', params: { partAdj: adj, popAdj: 1 } };
            } else {
                decision = getAIDecision(role, state, filtered);
            }
            var result = Engine.executeAction(role, decision.id, decision.params);
            if (!result.success) { failedIds.push(decision.id); continue; }
            succeeded = true;
            evaluatePromises(role, decision.id, state, currentRound);
            totalActions++;
            roundActions++;
            if (result.freeAction) wasFreeAction = true;
            break;
        }
        if (!succeeded) break;
        state = Engine.getState();
        if (!wasFreeAction && (state.round !== prevRound || state.phase === 'gameOver')) break;
    }
    state = Engine.getState();
    decayTrust();
    if (state.phase === 'gameOver') break;
}

var winner = Engine.getWinner();
var output = {
    winner: winner ? winner.role : 'none',
    vp: {
        president: state.president.vp,
        house: state.house.vp,
        senate: state.senate.vp,
        supremeCourt: state.supremeCourt.vp
    },
    billsPassed: state.passedBills.length,
    personalities: {
        president: personality.president.name,
        house: personality.house.name,
        senate: personality.senate.name,
        supremeCourt: personality.supremeCourt.name
    }
};
console.log(JSON.stringify(output));
