// Branches of Power — Full Game Simulation with 4 Independent AI Agents
// Runs a complete 10-round standard game and outputs detailed results

'use strict';

var path = require('path');
var fs = require('fs');

// Engine references Config as a global variable
global.Config = require(path.join(__dirname, '..', 'game', 'js', 'config.js'));
var Engine = require(path.join(__dirname, '..', 'game', 'js', 'engine.js'));

// ========== OUTPUT HELPERS ==========
var output = [];
function log(text) { output.push(text); }
function logBlank() { output.push(''); }

function formatComp(label, obj) {
    return label + ': ' + Object.keys(obj).map(function(k) { return k + ' ' + obj[k]; }).join(', ');
}

function vpStandings(s) {
    return 'VP Standings: President ' + s.president.vp +
        ' | House ' + s.house.vp +
        ' | Senate ' + s.senate.vp +
        ' | Supreme Court ' + s.supremeCourt.vp;
}

function billStr(bill) {
    if (!bill) return '(none)';
    return bill.name + ' (Part: ' + bill.partisanship + ', Pop: ' + bill.popularity + ', Leg: ' + bill.legality + ')';
}

function courtStr(justices) {
    var lib = 0, mod = 0, con = 0;
    for (var i = 0; i < justices.length; i++) {
        if (justices[i].leaning === 'liberal') lib++;
        else if (justices[i].leaning === 'moderate') mod++;
        else con++;
    }
    return 'Lib ' + lib + ', Mod ' + mod + ', Con ' + con;
}

function roleLabel(role) {
    return Config.ROLE_LABELS[role] || role;
}

// ========== TRUST & NEGOTIATION SYSTEM ==========

var ROLES_LIST = ['president', 'house', 'senate', 'supremeCourt'];

var trust = {
    president: { house: 5, senate: 5, supremeCourt: 5 },
    house: { president: 5, senate: 5, supremeCourt: 5 },
    senate: { president: 5, house: 5, supremeCourt: 5 },
    supremeCourt: { president: 5, house: 5, senate: 5 }
};

function clampTrust(val) { return Math.max(0, Math.min(10, val)); }
function adjustTrust(from, to, amount) { trust[from][to] = clampTrust(trust[from][to] + amount); }

var pendingPromises = [];
var negotiationLog = [];

var personality = {
    president: { archetype: 'Dealmaker', baseLieRate: 0.30, threatFollowThrough: 0.60 },
    house: { archetype: 'Opportunist', baseLieRate: 0.15, threatFollowThrough: 0.80 },
    senate: { archetype: 'Strategist', baseLieRate: 0.25, threatFollowThrough: 0.70 },
    supremeCourt: { archetype: 'Outsider', baseLieRate: 0.40, threatFollowThrough: 0.50 }
};

// Promise stats for end-of-game summary
var promiseStats = {
    president: { made: 0, kept: 0, broken: 0 },
    house: { made: 0, kept: 0, broken: 0 },
    senate: { made: 0, kept: 0, broken: 0 },
    supremeCourt: { made: 0, kept: 0, broken: 0 }
};

// Track biggest trust swings for end-of-game summary
var trustSwings = [];

function recordTrustSwing(round, from, to, amount, reason) {
    trustSwings.push({ round: round, from: from, to: to, amount: amount, reason: reason });
}

function otherRoles(role) {
    return ROLES_LIST.filter(function(r) { return r !== role; });
}

function getVPForRole(state, role) {
    return state[role].vp;
}

function lieChance(role, targetRole, state) {
    var others = otherRoles(role);
    var otherVPs = others.map(function(r) { return getVPForRole(state, r); });
    var maxOtherVP = Math.max.apply(null, otherVPs);
    var vpLead = getVPForRole(state, role) - maxOtherVP;
    var desperation = vpLead < -10 ? 3 : (vpLead < -5 ? 2 : (vpLead < 0 ? 1 : 0));
    var roundsLeft = state.maxRounds - state.round;
    var base = personality[role].baseLieRate;
    var prob = base + (desperation * 0.1) - (roundsLeft * 0.03) - (trust[targetRole][role] * 0.02);
    return Math.max(0, Math.min(0.8, prob));
}

function makePromise(from, to, type, details, round) {
    var promise = { from: from, to: to, type: type, details: details, round: round, fulfilled: null };
    pendingPromises.push(promise);
    promiseStats[from].made++;
    return promise;
}

function fulfillPromise(promise, round) {
    promise.fulfilled = true;
    promiseStats[promise.from].kept++;
    adjustTrust(promise.to, promise.from, 1);
    recordTrustSwing(round, promise.to, promise.from, 1, 'Promise kept: ' + promise.type);
    log('[PROMISE KEPT] ' + roleLabel(promise.from) + ' fulfilled ' + promise.type + ' to ' + roleLabel(promise.to));
}

function breakPromise(promise, round, penalty) {
    penalty = penalty || 2;
    promise.fulfilled = false;
    promiseStats[promise.from].broken++;
    adjustTrust(promise.to, promise.from, -penalty);
    recordTrustSwing(round, promise.to, promise.from, -penalty, 'Promise broken: ' + promise.type);
    log('[PROMISE BROKEN] ' + roleLabel(promise.from) + ' broke ' + promise.type + ' to ' + roleLabel(promise.to) + ' (-' + penalty + ' trust)');
    // Reputation effect: all others reduce trust in betrayer by 0.5
    var others = otherRoles(promise.from);
    for (var i = 0; i < others.length; i++) {
        if (others[i] !== promise.to) {
            adjustTrust(others[i], promise.from, -0.5);
        }
    }
}

// --- Negotiation Phase ---

function isHostileAction(actionId) {
    return ['veto', 'witchhunt', 'impeach', 'filibuster', 'governmentShutdown',
            'investigateEO', 'investigateBill', 'judicialReview', 'killBill',
            'attackBill', 'admonish', 'constitutionalCrisis', 'partisanRuling',
            'disapproveJustice', 'inquiryPresident', 'inquiryChamber', 'sue'].indexOf(actionId) !== -1;
}

function isCooperativeAction(actionId) {
    return ['signBill', 'housePassBill', 'senatePassBill', 'confirmJustice',
            'supportBill', 'advocate', 'popularizeBill', 'advisoryRole',
            'conference', 'suggestJustice'].indexOf(actionId) !== -1;
}

function getActionTarget(role, actionId) {
    // Determine which role is affected by a hostile/cooperative action
    if (['veto', 'signBill'].indexOf(actionId) !== -1) return role === 'president' ? null : 'president';
    if (['witchhunt', 'sue'].indexOf(actionId) !== -1) return 'supremeCourt';
    if (['impeach', 'packCourts'].indexOf(actionId) !== -1) return 'president';
    if (['filibuster', 'governmentShutdown', 'stallBill'].indexOf(actionId) !== -1) return 'house';
    if (['investigateEO', 'inquiryPresident'].indexOf(actionId) !== -1) return 'president';
    if (['judicialReview', 'investigateBill', 'billReview'].indexOf(actionId) !== -1) return null; // general
    if (actionId === 'confirmJustice') return 'president';
    if (['disapproveJustice'].indexOf(actionId) !== -1) return 'president';
    if (actionId === 'housePassBill') return 'house'; // self
    if (actionId === 'senatePassBill') return 'senate'; // self
    return null;
}

function runNegotiations(role, state, actions) {
    var actionIds = actions.map(function(a) { return a.id; });
    var others = otherRoles(role);
    var round = state.round;
    var bill = state.currentBill;

    // (a) Check expired promises and evaluate incoming
    for (var i = pendingPromises.length - 1; i >= 0; i--) {
        var p = pendingPromises[i];
        if (p.fulfilled !== null) continue;
        // Check if promise expired (was for a past round)
        if (p.round < round - 1) {
            breakPromise(p, round, 2);
        }
    }

    // (b) Bill Coordination: when a bill exists
    if (bill) {
        if (role === 'house' && actionIds.indexOf('housePassBill') !== -1) {
            // House asks President: "Will you sign?"
            var presWilling = trust.president.house >= 4 && billAligns(bill, state.president.party);
            var presLying = Math.random() < lieChance('president', 'house', state);
            var presResponse = presWilling ? (presLying ? false : true) : (presLying ? true : false);
            var sincerity = (presWilling && !presLying) || (!presWilling && !presLying) ? 'genuine' : 'LYING';
            negotiationLog.push({ round: round, from: 'house', to: 'president', msg: 'Will you sign the current bill?' });
            log('[NEGOTIATION] Round ' + round + ' | House → President: "Will you sign the current bill?"');
            log('[RESPONSE] President → House: "' + (presResponse ? 'Yes, I will sign it' : 'No, I intend to veto') + '" (trust: ' + trust.president.house + ', sincerity: ' + sincerity + ')');
            if (presResponse) {
                makePromise('president', 'house', 'bill_passage', 'Will sign current bill', round);
            }

            // House asks Senate: "Will you pass?"
            var senWilling = trust.senate.house >= 4 && billAligns(bill, state.senate.majorityParty);
            var senLying = Math.random() < lieChance('senate', 'house', state);
            var senResponse = senWilling ? (senLying ? false : true) : (senLying ? true : false);
            var senSincerity = (senWilling && !senLying) || (!senWilling && !senLying) ? 'genuine' : 'LYING';
            negotiationLog.push({ round: round, from: 'house', to: 'senate', msg: 'Will you pass the current bill?' });
            log('[NEGOTIATION] Round ' + round + ' | House → Senate: "Will you pass the current bill?"');
            log('[RESPONSE] Senate → House: "' + (senResponse ? 'Yes, we will pass it' : 'No, we may block it') + '" (trust: ' + trust.senate.house + ', sincerity: ' + senSincerity + ')');
            if (senResponse) {
                makePromise('senate', 'house', 'bill_passage', 'Will pass current bill', round);
            }
        }

        // President promises not to veto
        if (role === 'president' && actionIds.indexOf('signBill') !== -1) {
            for (var oi = 0; oi < others.length; oi++) {
                var other = others[oi];
                if (trust.president[other] >= 6) {
                    var alreadyPromised = pendingPromises.some(function(pp) {
                        return pp.from === 'president' && pp.to === other && pp.type === 'no_attack' && pp.fulfilled === null;
                    });
                    if (!alreadyPromised) {
                        makePromise('president', other, 'no_attack', 'Will not veto', round);
                        log('[NEGOTIATION] Round ' + round + ' | President → ' + roleLabel(other) + ': "I won\'t veto the bill"');
                    }
                }
            }
        }
    }

    // (c) Justice Deals: when vacancy exists
    if (state.justiceVacancy && role === 'president' && actionIds.indexOf('assignJustice') !== -1) {
        var senTrust = trust.president.senate;
        if (senTrust >= 6) {
            makePromise('president', 'senate', 'justice_confirmation', 'Will nominate moderate justice', round);
            log('[NEGOTIATION] Round ' + round + ' | President → Senate: "I\'ll nominate a moderate for your confirmation"');
            log('[RESPONSE] Senate → President: "We\'ll confirm a moderate" (trust: ' + trust.senate.president + ', sincerity: genuine)');
        } else if (senTrust <= 3) {
            log('[NEGOTIATION] Round ' + round + ' | President → Senate: "I\'ll nominate who I want regardless"');
            log('[RESPONSE] Senate → President: "We may block your nominee" (trust: ' + trust.senate.president + ', sincerity: genuine)');
        }
    }

    // (d) Threat Making
    // Senate threatens shutdown if House has high PC
    if (role === 'senate' && actionIds.indexOf('governmentShutdown') !== -1 && state.house.pc >= 4) {
        if (trust.senate.house <= 4) {
            makePromise('senate', 'house', 'threat', 'Will shutdown if House acts aggressively', round);
            negotiationLog.push({ round: round, from: 'senate', to: 'house', msg: 'Shutdown threat' });
            log('[NEGOTIATION] Round ' + round + ' | Senate → House: "Reduce your political capital or we shut it down"');
        }
    }

    // President threatens witchhunt if SC is doing well
    if (role === 'president' && actionIds.indexOf('witchhunt') !== -1 && state.supremeCourt.vp >= 8) {
        if (trust.president.supremeCourt <= 4) {
            makePromise('president', 'supremeCourt', 'threat', 'Will launch witchhunt', round);
            negotiationLog.push({ round: round, from: 'president', to: 'supremeCourt', msg: 'Witchhunt threat' });
            log('[NEGOTIATION] Round ' + round + ' | President → Supreme Court: "Back off or I launch a witchhunt"');
        }
    }

    // House threatens impeachment if President has low popularity
    if (role === 'house' && actionIds.indexOf('impeach') !== -1 && state.president.popularity <= 5) {
        if (trust.house.president <= 4 && state.house.pc >= 6) {
            makePromise('house', 'president', 'threat', 'Will impeach', round);
            negotiationLog.push({ round: round, from: 'house', to: 'president', msg: 'Impeachment threat' });
            log('[NEGOTIATION] Round ' + round + ' | House → President: "Shape up or face impeachment"');
        }
    }

    // (e) VP Kingmaking (rounds 7+)
    if (round >= 7) {
        var myVP = getVPForRole(state, role);
        var leaderRole = null;
        var leaderVP = -1;
        for (var ri = 0; ri < ROLES_LIST.length; ri++) {
            var rv = getVPForRole(state, ROLES_LIST[ri]);
            if (rv > leaderVP) { leaderVP = rv; leaderRole = ROLES_LIST[ri]; }
        }
        if (leaderRole !== role && myVP < leaderVP - 3) {
            // Propose alliance against leader
            var allies = otherRoles(role).filter(function(r) { return r !== leaderRole && getVPForRole(state, r) < leaderVP; });
            for (var ai = 0; ai < allies.length; ai++) {
                if (trust[role][allies[ai]] >= 4) {
                    log('[NEGOTIATION] Round ' + round + ' | ' + roleLabel(role) + ' → ' + roleLabel(allies[ai]) + ': "Let\'s work together against ' + roleLabel(leaderRole) + '"');
                    var allyWilling = trust[allies[ai]][role] >= 4;
                    var allyLying = Math.random() < lieChance(allies[ai], role, state);
                    var allyResponse = allyWilling ? !allyLying : allyLying;
                    var allySincerity = (allyWilling && !allyLying) || (!allyWilling && !allyLying) ? 'genuine' : 'LYING';
                    log('[RESPONSE] ' + roleLabel(allies[ai]) + ' → ' + roleLabel(role) + ': "' + (allyResponse ? 'Agreed, let\'s do it' : 'I\'ll pass on that') + '" (trust: ' + trust[allies[ai]][role] + ', sincerity: ' + allySincerity + ')');
                    if (allyResponse) {
                        makePromise(allies[ai], role, 'event_cooperation', 'Alliance against ' + roleLabel(leaderRole), round);
                    }
                }
            }
        } else if (leaderRole === role) {
            // Leader tries to bribe/bargain to prevent attacks
            for (var bi = 0; bi < others.length; bi++) {
                if (trust[role][others[bi]] <= 4) {
                    log('[NEGOTIATION] Round ' + round + ' | ' + roleLabel(role) + ' → ' + roleLabel(others[bi]) + ': "Don\'t attack me and I\'ll cooperate on bills"');
                    var bribeAccept = trust[others[bi]][role] >= 3 && Math.random() > 0.5;
                    if (bribeAccept) {
                        log('[RESPONSE] ' + roleLabel(others[bi]) + ' → ' + roleLabel(role) + ': "Deal" (trust: ' + trust[others[bi]][role] + ', sincerity: genuine)');
                        makePromise(others[bi], role, 'no_attack', 'No hostile actions this round', round);
                    } else {
                        // Rejected — chance of counteroffer
                        var counterChance = 0.4;
                        if (Math.random() < counterChance) {
                            log('[COUNTEROFFER] ' + roleLabel(others[bi]) + ' → ' + roleLabel(role) + ': "No, but how about you support my bill and I\'ll lay off?" (trust: ' + trust[others[bi]][role] + ')');
                            var counterAccept = trust[role][others[bi]] >= 4 && Math.random() > 0.4;
                            if (counterAccept) {
                                log('[RESPONSE] ' + roleLabel(role) + ' → ' + roleLabel(others[bi]) + ': "Counter accepted"');
                                makePromise(role, others[bi], 'bill_support', 'Support their bill in exchange for peace', round);
                                makePromise(others[bi], role, 'no_attack', 'No hostile actions this round', round);
                            } else {
                                log('[RESPONSE] ' + roleLabel(role) + ' → ' + roleLabel(others[bi]) + ': "Counter rejected"');
                            }
                        } else {
                            log('[RESPONSE] ' + roleLabel(others[bi]) + ' → ' + roleLabel(role) + ': "No deal" (trust: ' + trust[others[bi]][role] + ', sincerity: genuine)');
                        }
                    }
                }
            }
        }
    }
}

// --- Promise Resolution ---

function evaluatePromises(role, actionId, state, round) {
    for (var i = 0; i < pendingPromises.length; i++) {
        var p = pendingPromises[i];
        if (p.fulfilled !== null) continue;
        if (p.from !== role) continue;

        // Bill passage promises
        if (p.type === 'bill_passage') {
            if (role === 'house' && actionId === 'housePassBill') {
                fulfillPromise(p, round);
            } else if (role === 'senate' && actionId === 'senatePassBill') {
                fulfillPromise(p, round);
            } else if (role === 'president' && actionId === 'signBill') {
                fulfillPromise(p, round);
            }
        }

        // No-attack promises (veto)
        if (p.type === 'no_attack') {
            if (role === 'president' && actionId === 'veto') {
                breakPromise(p, round, 3);
            } else if (isHostileAction(actionId)) {
                var target = getActionTarget(role, actionId);
                if (target === p.to) {
                    breakPromise(p, round, 2);
                }
            }
        }

        // Justice confirmation promises
        if (p.type === 'justice_confirmation') {
            if (role === 'president' && actionId === 'assignJustice') {
                // Check if nominated moderate as promised
                var nominated = state.justiceNominated;
                if (nominated && nominated.leaning === 'moderate') {
                    fulfillPromise(p, round);
                } else if (nominated) {
                    breakPromise(p, round, 2);
                }
            } else if (role === 'senate' && actionId === 'confirmJustice') {
                fulfillPromise(p, round);
            }
        }

        // Threat follow-through
        if (p.type === 'threat') {
            if (isHostileAction(actionId)) {
                var threatTarget = getActionTarget(role, actionId);
                if (threatTarget === p.to) {
                    p.fulfilled = true;
                    // Threat carried out — reduces trust but shows consistency
                    adjustTrust(p.to, p.from, -1);
                    recordTrustSwing(round, p.to, p.from, -1, 'Threat carried out: ' + actionId);
                    log('[THREAT EXECUTED] ' + roleLabel(role) + ' followed through on threat against ' + roleLabel(p.to));
                }
            }
        }
    }
}

// --- Trust Decay ---

function decayTrust() {
    for (var i = 0; i < ROLES_LIST.length; i++) {
        for (var j = 0; j < ROLES_LIST.length; j++) {
            if (i === j) continue;
            var current = trust[ROLES_LIST[i]][ROLES_LIST[j]];
            if (current > 5) trust[ROLES_LIST[i]][ROLES_LIST[j]] = Math.max(5, current - 0.25);
            else if (current < 5) trust[ROLES_LIST[i]][ROLES_LIST[j]] = Math.min(5, current + 0.25);
        }
    }
}

// --- Trust Matrix Logging ---

function logTrustMatrix(round) {
    log('Trust Matrix (Round ' + round + '):');
    log('                Pres  House  Sen   SC');
    var labels = { president: 'Pres trusts:', house: 'House trusts:', senate: 'Sen trusts:', supremeCourt: 'SC trusts:' };
    var paddings = { president: '  ', house: ' ', senate: '   ', supremeCourt: '    ' };
    for (var i = 0; i < ROLES_LIST.length; i++) {
        var r = ROLES_LIST[i];
        var vals = [];
        for (var j = 0; j < ROLES_LIST.length; j++) {
            if (ROLES_LIST[j] === r) {
                vals.push('  —  ');
            } else {
                var v = trust[r][ROLES_LIST[j]];
                var vs = v % 1 === 0 ? v.toString() : v.toFixed(1);
                while (vs.length < 5) vs = ' ' + vs;
                vals.push(vs);
            }
        }
        log(labels[r] + paddings[r] + vals.join(' '));
    }
}

function logPromiseSummary(round) {
    var active = pendingPromises.filter(function(p) { return p.fulfilled === null; });
    var kept = pendingPromises.filter(function(p) { return p.fulfilled === true && p.round >= round - 1; });
    var broken = pendingPromises.filter(function(p) { return p.fulfilled === false && p.round >= round - 1; });
    if (active.length > 0 || kept.length > 0 || broken.length > 0) {
        log('Promises: ' + active.length + ' active, ' + kept.length + ' kept, ' + broken.length + ' broken (this round)');
    }
}

// --- End-of-Game Trust Summary ---

function logEndOfGameTrust(state) {
    log('=== TRUST & NEGOTIATION SUMMARY ===');
    logBlank();

    // Final trust matrix
    log('Final Trust Matrix:');
    log('                Pres  House  Sen   SC');
    var labels = { president: 'Pres trusts:', house: 'House trusts:', senate: 'Sen trusts:', supremeCourt: 'SC trusts:' };
    var paddings = { president: '  ', house: ' ', senate: '   ', supremeCourt: '    ' };
    for (var i = 0; i < ROLES_LIST.length; i++) {
        var r = ROLES_LIST[i];
        var vals = [];
        for (var j = 0; j < ROLES_LIST.length; j++) {
            if (ROLES_LIST[j] === r) {
                vals.push('  —  ');
            } else {
                var v = trust[r][ROLES_LIST[j]];
                var vs = v % 1 === 0 ? v.toString() : v.toFixed(1);
                while (vs.length < 5) vs = ' ' + vs;
                vals.push(vs);
            }
        }
        log(labels[r] + paddings[r] + vals.join(' '));
    }
    logBlank();

    // Promise stats per player
    log('Promise Statistics:');
    for (var pi = 0; pi < ROLES_LIST.length; pi++) {
        var pr = ROLES_LIST[pi];
        var ps = promiseStats[pr];
        log('  ' + roleLabel(pr) + ': ' + ps.made + ' made, ' + ps.kept + ' kept, ' + ps.broken + ' broken');
    }
    logBlank();

    // Awards
    var mostTrusted = null, mostTrustedScore = -1;
    var biggestBetrayer = null, biggestBetrayerScore = 0;
    for (var ti = 0; ti < ROLES_LIST.length; ti++) {
        var tr = ROLES_LIST[ti];
        // Average trust others have in this role
        var totalTrust = 0, count = 0;
        for (var tj = 0; tj < ROLES_LIST.length; tj++) {
            if (ROLES_LIST[tj] !== tr) {
                totalTrust += trust[ROLES_LIST[tj]][tr];
                count++;
            }
        }
        var avg = totalTrust / count;
        if (avg > mostTrustedScore) { mostTrustedScore = avg; mostTrusted = tr; }
        if (promiseStats[tr].broken > biggestBetrayerScore) { biggestBetrayerScore = promiseStats[tr].broken; biggestBetrayer = tr; }
    }
    log('Awards:');
    log('  Most Trusted: ' + roleLabel(mostTrusted) + ' (avg trust: ' + mostTrustedScore.toFixed(1) + ')');
    if (biggestBetrayer && biggestBetrayerScore > 0) {
        log('  Biggest Betrayer: ' + roleLabel(biggestBetrayer) + ' (' + biggestBetrayerScore + ' broken promises)');
    } else {
        log('  Biggest Betrayer: None — all promises honored!');
    }
    logBlank();

    // Key negotiation moments (top 5 trust swings)
    if (trustSwings.length > 0) {
        trustSwings.sort(function(a, b) { return Math.abs(b.amount) - Math.abs(a.amount); });
        var topN = Math.min(5, trustSwings.length);
        log('Key Negotiation Moments:');
        for (var si = 0; si < topN; si++) {
            var sw = trustSwings[si];
            var sign = sw.amount > 0 ? '+' : '';
            log('  Round ' + sw.round + ': ' + roleLabel(sw.from) + ' → ' + roleLabel(sw.to) + ' (' + sign + sw.amount + ') — ' + sw.reason);
        }
        logBlank();
    }

    log('Personality Archetypes: President=' + personality.president.archetype +
        ', House=' + personality.house.archetype +
        ', Senate=' + personality.senate.archetype +
        ', SC=' + personality.supremeCourt.archetype);
    logBlank();
}

// ========== AI STRATEGY FUNCTIONS ==========

function getCourtMajority(justices) {
    var lib = 0, con = 0;
    for (var i = 0; i < justices.length; i++) {
        if (justices[i].leaning === 'liberal') lib++;
        else if (justices[i].leaning === 'conservative') con++;
    }
    if (lib > con) return 'liberal';
    if (con > lib) return 'conservative';
    return 'moderate';
}

function billAligns(bill, party) {
    if (!bill) return false;
    if (party === 'democrat') return bill.partisanship > 10;
    return bill.partisanship < 10;
}

function billMisaligns(bill, party) {
    if (!bill) return false;
    if (party === 'democrat') return bill.partisanship < 8;
    return bill.partisanship > 12;
}

// President AI: tries to maximize VP through EOs, bill signing, and popularity
// Trust-aware: considers promises and trust when choosing hostile/cooperative actions
function presidentAI(state, actions) {
    var party = state.president.party;
    var pop = state.president.popularity;
    var bill = state.currentBill;
    var actionIds = actions.map(function(a) { return a.id; });

    // Check if we have a no-attack promise to anyone (avoid veto if promised)
    var noVetoPromise = pendingPromises.some(function(p) {
        return p.from === 'president' && p.type === 'no_attack' && p.fulfilled === null && p.details.indexOf('veto') !== -1;
    });

    // Check if someone promised to help us (senate confirmation, etc.)
    var senatePromisedConfirm = pendingPromises.some(function(p) {
        return p.from === 'senate' && p.to === 'president' && p.type === 'justice_confirmation' && p.fulfilled === null;
    });

    // Priority 1: Sign bill if available (big VP gain)
    if (actionIds.indexOf('signBill') !== -1) {
        return { id: 'signBill', params: {} };
    }

    // Priority 2: Assign justice if vacancy (trust-influenced leaning choice)
    if (actionIds.indexOf('assignJustice') !== -1) {
        var leaning = party === 'democrat' ? 'liberal' : 'conservative';
        // If we promised Senate a moderate, and trust is decent, honor it
        var promisedModerate = pendingPromises.some(function(p) {
            return p.from === 'president' && p.to === 'senate' && p.type === 'justice_confirmation' && p.fulfilled === null;
        });
        if (promisedModerate && trust.president.senate >= 5) {
            leaning = 'moderate';
        }
        return { id: 'assignJustice', params: { leaning: leaning } };
    }

    // Priority 3: Veto misaligned bills — but respect trust/promises
    if (actionIds.indexOf('veto') !== -1 && bill) {
        var lastBill = state.passedBills.length > 0 ? state.passedBills[state.passedBills.length - 1] : null;
        if (lastBill && billMisaligns(lastBill, party)) {
            // Don't veto if we promised not to and trust is high
            if (!noVetoPromise || trust.president.house <= 3) {
                return { id: 'veto', params: {} };
            }
        }
    }

    // Priority 4: Tax Cuts when we have enough actions (early in turn)
    if (actionIds.indexOf('taxCuts') !== -1 && state.president.actionsRemaining >= 3) {
        return { id: 'taxCuts', params: {} };
    }

    // Priority 5: Campaign when popularity is low
    if (actionIds.indexOf('campaign') !== -1 && pop <= 8) {
        return { id: 'campaign', params: {} };
    }

    // Priority 6: Witchhunt if SC has lots of VP — trust-gated
    if (actionIds.indexOf('witchhunt') !== -1 && state.supremeCourt.vp >= 8) {
        if (trust.president.supremeCourt <= 4) {
            return { id: 'witchhunt', params: {} };
        }
    }

    // Priority 7: Executive Order (reliable +1 VP +1 Pop)
    if (actionIds.indexOf('executiveOrder') !== -1) {
        return { id: 'executiveOrder', params: {} };
    }

    // Priority 8: Advocate aligned chambers — more willing with higher trust
    if (actionIds.indexOf('advocate') !== -1 && bill && billAligns(bill, party)) {
        return { id: 'advocate', params: { target: 'both' } };
    }

    // Priority 9: Admonish if bill misaligns — less likely with high trust toward chambers
    if (actionIds.indexOf('admonish') !== -1 && bill && billMisaligns(bill, party)) {
        var avgChamberTrust = (trust.president.house + trust.president.senate) / 2;
        if (avgChamberTrust <= 6) {
            return { id: 'admonish', params: { target: 'both' } };
        }
    }

    // Priority 10: Campaign if moderate popularity
    if (actionIds.indexOf('campaign') !== -1) {
        return { id: 'campaign', params: {} };
    }

    // Priority 11: Sue opposing bills — trust-gated toward SC
    if (actionIds.indexOf('sue') !== -1) {
        if (trust.president.supremeCourt <= 5) {
            return { id: 'sue', params: {} };
        }
    }

    // Fallback: first available action
    return { id: actions[0].id, params: {} };
}

// House AI: legislation control, bill passing, PC building
// Trust-aware: considers promises and relationships for hostile/cooperative actions
function houseAI(state, actions) {
    var party = state.house.majorityParty;
    var bill = state.currentBill;
    var pc = state.house.pc;
    var actionIds = actions.map(function(a) { return a.id; });

    // Check if President promised to sign
    var presPromisedSign = pendingPromises.some(function(p) {
        return p.from === 'president' && p.to === 'house' && p.type === 'bill_passage' && p.fulfilled === null;
    });

    // Check if Senate promised to pass
    var senatePromisedPass = pendingPromises.some(function(p) {
        return p.from === 'senate' && p.to === 'house' && p.type === 'bill_passage' && p.fulfilled === null;
    });

    // Check no-attack promises
    var noAttackPromise = function(target) {
        return pendingPromises.some(function(p) {
            return p.from === 'house' && p.to === target && p.type === 'no_attack' && p.fulfilled === null;
        });
    };

    // Priority 1: Initiate Legislation (free action!) with party-aligned bill
    if (actionIds.indexOf('initiateLegislation') !== -1) {
        var partAdj = party === 'democrat' ? 1 : -1;
        return { id: 'initiateLegislation', params: { partAdj: partAdj, popAdj: 1 } };
    }

    // Priority 2: Pass aligned bills — more eager if President promised to sign
    if (actionIds.indexOf('housePassBill') !== -1 && bill && billAligns(bill, party)) {
        var pcUse = Math.min(pc, 2);
        if (presPromisedSign || senatePromisedPass) pcUse = Math.min(pc, 3); // invest more if promised support
        return { id: 'housePassBill', params: { pcToUse: pcUse } };
    }

    // Priority 3: Support aligned bills
    if (actionIds.indexOf('supportBill') !== -1 && bill && billAligns(bill, party)) {
        return { id: 'supportBill', params: {} };
    }

    // Priority 4: Kill misaligned bills
    if (actionIds.indexOf('killBill') !== -1 && bill && billMisaligns(bill, party)) {
        return { id: 'killBill', params: {} };
    }

    // Priority 5: Attack misaligned bills
    if (actionIds.indexOf('attackBill') !== -1 && bill && billMisaligns(bill, party)) {
        return { id: 'attackBill', params: {} };
    }

    // Priority 6: Whip the House toward majority
    if (actionIds.indexOf('whipHouse') !== -1) {
        var faction, direction;
        if (party === 'democrat') {
            faction = 'republican';
            direction = 'left';
        } else {
            faction = 'democrat';
            direction = 'right';
        }
        return { id: 'whipHouse', params: { faction: faction, direction: direction } };
    }

    // Priority 7: Host Hearing for PC
    if (actionIds.indexOf('hostHearing') !== -1) {
        if (pc < 2) {
            return { id: 'hostHearing', params: { choice: 'pcAndHurtPres' } };
        }
        return { id: 'hostHearing', params: { choice: 'gainVP' } };
    }

    // Priority 8: State of the Union for VP or PC
    if (actionIds.indexOf('stateOfUnion') !== -1) {
        if (pc < 2) {
            return { id: 'stateOfUnion', params: { choice: 'gainPC' } };
        }
        return { id: 'stateOfUnion', params: { choice: 'gainVP' } };
    }

    // Priority 9: Popularize aligned bills
    if (actionIds.indexOf('popularizeBill') !== -1 && bill && billAligns(bill, party)) {
        return { id: 'popularizeBill', params: {} };
    }

    // Priority 10: Try to pass any bill for VP
    if (actionIds.indexOf('housePassBill') !== -1) {
        return { id: 'housePassBill', params: { pcToUse: Math.min(pc, 2) } };
    }

    // Priority 11: Impeach if high PC — trust-gated
    if (actionIds.indexOf('impeach') !== -1 && pc >= 8) {
        if (trust.house.president <= 4 && !noAttackPromise('president')) {
            return { id: 'impeach', params: {} };
        }
    }

    // Priority 12: Pack courts if possible — trust-gated toward SC
    if (actionIds.indexOf('packCourts') !== -1) {
        if (trust.house.supremeCourt <= 5) {
            return { id: 'packCourts', params: {} };
        }
    }

    // Fallback
    return { id: actions[0].id, params: {} };
}

// Senate AI: debate, conference, bill passing, strategic blocking
// Trust-aware: considers relationships for filibuster, shutdown, and confirmation decisions
function senateAI(state, actions) {
    var party = state.senate.majorityParty;
    var bill = state.currentBill;
    var pc = state.senate.pc;
    var actionIds = actions.map(function(a) { return a.id; });

    // Check if we promised House to pass a bill
    var promisedPassToHouse = pendingPromises.some(function(p) {
        return p.from === 'senate' && p.to === 'house' && p.type === 'bill_passage' && p.fulfilled === null;
    });

    // Check no-attack promises
    var noAttackPromise = function(target) {
        return pendingPromises.some(function(p) {
            return p.from === 'senate' && p.to === target && p.type === 'no_attack' && p.fulfilled === null;
        });
    };

    // Priority 1: Confirm aligned justices — trust with president influences willingness
    if (actionIds.indexOf('confirmJustice') !== -1 && state.justiceNominated) {
        var aligned = (party === 'democrat' && state.justiceNominated.leaning === 'liberal') ||
                      (party === 'republican' && state.justiceNominated.leaning === 'conservative') ||
                      state.justiceNominated.leaning === 'moderate';
        // Confirm if aligned OR if trust with president is high enough
        if (aligned || trust.senate.president >= 7) {
            return { id: 'confirmJustice', params: {} };
        }
    }

    // Priority 2: Pass aligned bills — prioritize if we promised
    if (actionIds.indexOf('senatePassBill') !== -1 && bill && (billAligns(bill, party) || promisedPassToHouse)) {
        return { id: 'senatePassBill', params: { pcToUse: Math.min(pc, 2) } };
    }

    // Priority 3: Conference for mutual PC benefit
    if (actionIds.indexOf('conference') !== -1 && pc < 3) {
        return { id: 'conference', params: {} };
    }

    // Priority 4: Debate for PC and senator shifting
    if (actionIds.indexOf('debate') !== -1 && pc < 4) {
        var debateDir = party === 'democrat' ? 'left' : 'right';
        return { id: 'debate', params: { direction: debateDir } };
    }

    // Priority 5: Nominations for PC
    if (actionIds.indexOf('nominations') !== -1) {
        if (pc < 3) {
            return { id: 'nominations', params: { pass: true } };
        }
        return { id: 'nominations', params: { pass: false } };
    }

    // Priority 6: Update bill toward alignment
    if (actionIds.indexOf('updateBill') !== -1 && bill) {
        var partShift = party === 'democrat' ? 1 : -1;
        return { id: 'updateBill', params: { changes: { partisanship: partShift, popularity: 1, legality: 1 } } };
    }

    // Priority 7: Filibuster extremely misaligned bills — trust-gated
    if (actionIds.indexOf('filibuster') !== -1 && bill && billMisaligns(bill, party) && bill.partisanship !== undefined) {
        var extreme = (party === 'democrat' && bill.partisanship <= 5) ||
                      (party === 'republican' && bill.partisanship >= 15);
        if (extreme && trust.senate.house <= 5 && !noAttackPromise('house')) {
            return { id: 'filibuster', params: {} };
        }
    }

    // Priority 8: Government Shutdown when House has lots of PC — trust-gated
    if (actionIds.indexOf('governmentShutdown') !== -1 && state.house.pc >= 4) {
        if (trust.senate.house <= 4 && !noAttackPromise('house')) {
            return { id: 'governmentShutdown', params: {} };
        }
    }

    // Priority 9: Debate as general action
    if (actionIds.indexOf('debate') !== -1) {
        var debateDir2 = party === 'democrat' ? 'left' : 'right';
        return { id: 'debate', params: { direction: debateDir2 } };
    }

    // Priority 10: Try to pass any bill
    if (actionIds.indexOf('senatePassBill') !== -1) {
        return { id: 'senatePassBill', params: { pcToUse: Math.min(pc, 1) } };
    }

    // Priority 11: Stall misaligned bills
    if (actionIds.indexOf('stallBill') !== -1 && bill && billMisaligns(bill, party)) {
        return { id: 'stallBill', params: {} };
    }

    // Priority 12: Conference fallback
    if (actionIds.indexOf('conference') !== -1) {
        return { id: 'conference', params: {} };
    }

    // Fallback
    return { id: actions[0].id, params: {} };
}

// Supreme Court AI: VP accumulation, judicial review, court composition
// Trust-aware: considers trust for investigative and hostile actions
function supremeCourtAI(state, actions) {
    var justices = state.supremeCourt.justices;
    var courtLeaning = getCourtMajority(justices);
    var vp = state.supremeCourt.vp;
    var actionIds = actions.map(function(a) { return a.id; });
    var bill = state.currentBill;

    // Check no-attack promises
    var noAttackPromise = function(target) {
        return pendingPromises.some(function(p) {
            return p.from === 'supremeCourt' && p.to === target && p.type === 'no_attack' && p.fulfilled === null;
        });
    };

    // Priority 1: General Court for safe +1 VP
    if (actionIds.indexOf('generalCourt') !== -1) {
        return { id: 'generalCourt', params: {} };
    }

    // Priority 2: Advisory Role when aligned
    if (actionIds.indexOf('advisoryRole') !== -1) {
        return { id: 'advisoryRole', params: {} };
    }

    // Priority 3: Bill Review for +1 VP, legality boost, and stat adjustment
    if (actionIds.indexOf('billReview') !== -1 && bill) {
        var brPartAdj = courtLeaning === 'liberal' ? 1 : (courtLeaning === 'conservative' ? -1 : 0);
        var brPopAdj = brPartAdj === 0 ? -2 : -1;
        return { id: 'billReview', params: { partAdj: brPartAdj, popAdj: brPopAdj } };
    }

    // Priority 4: Recusal before judicial review — recuse a justice who would vote "wrong"
    if (actionIds.indexOf('recusal') !== -1 && actionIds.indexOf('judicialReview') !== -1 && state.passedBills.length > 0) {
        // Find the bill we'd review and decide if recusal helps
        var reviewBill = null;
        for (var ri = 0; ri < state.passedBills.length; ri++) {
            var rpb = state.passedBills[ri];
            if (!rpb.markers || rpb.markers.indexOf('C') === -1) {
                reviewBill = rpb;
                break;
            }
        }
        if (reviewBill) {
            // Recuse a justice who would vote constitutional on a bill we want unconstitutional
            var recuseTarget = null;
            if (courtLeaning === 'liberal' && reviewBill.partisanship >= 11) {
                recuseTarget = 'conservative'; // conservatives would vote unconstitutional on liberal bills, not what we want
            } else if (courtLeaning === 'conservative' && reviewBill.partisanship <= 9) {
                recuseTarget = 'liberal';
            } else if (reviewBill.legality >= 12) {
                recuseTarget = 'moderate'; // moderates tend to vote constitutional on high legality
            }
            if (recuseTarget) {
                var hasJustice = justices.some(function(j) { return j.leaning === recuseTarget; });
                if (hasJustice) {
                    return { id: 'recusal', params: { leaning: recuseTarget } };
                }
            }
        }
    }

    // Priority 5: Judicial Review on passed bills with low legality - trust influences threshold
    if (actionIds.indexOf('judicialReview') !== -1 && state.passedBills.length > 0) {
        var targetIdx = -1;
        var lowestLeg = 20;
        for (var i = 0; i < state.passedBills.length; i++) {
            var pb = state.passedBills[i];
            if ((!pb.markers || pb.markers.indexOf('C') === -1) && pb.legality < lowestLeg) {
                lowestLeg = pb.legality;
                targetIdx = i;
            }
        }
        // Higher trust with other branches -> less aggressive review threshold
        var avgTrust = (trust.supremeCourt.president + trust.supremeCourt.house + trust.supremeCourt.senate) / 3;
        var legalityThreshold = avgTrust >= 7 ? 10 : 12;
        if (targetIdx !== -1 && lowestLeg < legalityThreshold) {
            var vpToSpend = vp >= 5 ? 5 : (vp >= 2 ? 2 : 0);
            // Choose remand if legality is borderline (8-12) and we want to be less aggressive
            var ruling = undefined; // let engine decide via vote
            if (lowestLeg >= 8 && lowestLeg <= 12 && avgTrust >= 5) {
                ruling = 'remand'; // moderate approach — send back instead of striking down
            }
            return { id: 'judicialReview', params: { billIndex: targetIdx, vpSpent: vpToSpend, ruling: ruling } };
        }
    }

    // Priority 5: Investigate EO when president has 2+ EOs - trust-gated
    if (actionIds.indexOf('investigateEO') !== -1) {
        if (trust.supremeCourt.president <= 5 && !noAttackPromise('president')) {
            return { id: 'investigateEO', params: {} };
        }
    }

    // Priority 6: Suggest Justice aligned with court
    if (actionIds.indexOf('suggestJustice') !== -1) {
        var leaning = courtLeaning === 'liberal' ? 'liberal' :
                      courtLeaning === 'conservative' ? 'conservative' : 'moderate';
        return { id: 'suggestJustice', params: { leaning: leaning } };
    }

    // Priority 7: Investigate Bill to lower legality for future review
    if (actionIds.indexOf('investigateBill') !== -1 && bill && bill.legality > 8) {
        return { id: 'investigateBill', params: {} };
    }

    // Priority 8: Internal Inquiry to retire misaligned justices
    if (actionIds.indexOf('internalInquiry') !== -1) {
        return { id: 'internalInquiry', params: {} };
    }

    // Priority 9: Inquiry of President (hurt if misaligned) - trust-influenced
    if (actionIds.indexOf('inquiryPresident') !== -1) {
        var presParty = state.president.party;
        var aligned = (presParty === 'democrat' && courtLeaning === 'liberal') ||
                      (presParty === 'republican' && courtLeaning === 'conservative');
        if (aligned || trust.supremeCourt.president >= 6) {
            return { id: 'inquiryPresident', params: { choice: 'help' } };
        }
        if (!noAttackPromise('president')) {
            return { id: 'inquiryPresident', params: { choice: 'hurt' } };
        }
    }

    // Priority 10: Inquiry of Chamber - trust-influenced
    if (actionIds.indexOf('inquiryChamber') !== -1) {
        var houseAligned = (state.house.majorityParty === 'democrat' && courtLeaning === 'liberal') ||
                           (state.house.majorityParty === 'republican' && courtLeaning === 'conservative');
        var target = houseAligned ? 'senate' : 'house';
        if (!noAttackPromise(target)) {
            return { id: 'inquiryChamber', params: { target: target, choice: 'hurt' } };
        }
    }

    // Priority 11: Landmark Ruling mid-game when JP is high
    if (actionIds.indexOf('landmarkRuling') !== -1) {
        // Choose best effect based on game state
        var effect = 'extraAction'; // default: more actions
        if (state.precedents && state.precedents.length >= 3) {
            effect = 'precedentPower'; // lots of precedents to leverage
        } else if (state.passedBills.length >= 4) {
            effect = 'courtAuthority'; // many bills to review
        } else if (state.round <= 5) {
            effect = 'legalityStandard'; // early game: influence future bills
        }
        return { id: 'landmarkRuling', params: { effect: effect } };
    }

    // Priority 12: Partisan Ruling late game
    if (actionIds.indexOf('partisanRuling') !== -1 && state.round >= 7) {
        var dir = courtLeaning === 'liberal' ? 1 : -1;
        return { id: 'partisanRuling', params: { direction: dir } };
    }

    // Priority 13: Constitutional Crisis late game
    if (actionIds.indexOf('constitutionalCrisis') !== -1 && state.round >= 8) {
        return { id: 'constitutionalCrisis', params: {} };
    }

    // Priority 14: Disapprove misaligned justice - trust-influenced
    if (actionIds.indexOf('disapproveJustice') !== -1 && state.justiceNominated) {
        var nomAligned = (courtLeaning === 'liberal' && state.justiceNominated.leaning === 'liberal') ||
                          (courtLeaning === 'conservative' && state.justiceNominated.leaning === 'conservative') ||
                          state.justiceNominated.leaning === 'moderate';
        if (!nomAligned && trust.supremeCourt.president <= 5) {
            return { id: 'disapproveJustice', params: {} };
        }
    }

    // Fallback
    return { id: actions[0].id, params: {} };
}

// AI dispatcher
function getAIDecision(role, state, actions) {
    switch (role) {
        case 'president': return presidentAI(state, actions);
        case 'house': return houseAI(state, actions);
        case 'senate': return senateAI(state, actions);
        case 'supremeCourt': return supremeCourtAI(state, actions);
        default: return { id: actions[0].id, params: {} };
    }
}

// ========== MAIN SIMULATION ==========

function runSimulation() {
    Engine.init('standard');
    var state = Engine.getState();

    // Header
    log('=== BRANCHES OF POWER SIMULATION ===');
    log('Game Length: Standard (10 rounds)');
    log('Date: ' + new Date().toISOString().split('T')[0]);
    logBlank();

    // Initial state
    log('=== INITIAL STATE ===');
    log('President Party: ' + state.president.party);
    log('Senate Composition: Dem ' + state.senate.composition.democrat +
        ', Mod-Dem ' + state.senate.composition.modDem +
        ', Mod-Rep ' + state.senate.composition.modRep +
        ', Rep ' + state.senate.composition.republican +
        ' (Majority: ' + state.senate.majorityParty + ')');
    log('House Composition: Far-D ' + state.house.composition.extremeDem +
        ', Dem ' + state.house.composition.democrat +
        ', Rep ' + state.house.composition.republican +
        ', Far-R ' + state.house.composition.extremeRep +
        ' (Majority: ' + state.house.majorityParty + ')');
    log('Supreme Court: ' + courtStr(state.supremeCourt.justices));
    log('Starting Bill: ' + billStr(state.currentBill));
    logBlank();

    var totalActions = 0;
    var maxIterations = 2000; // safety limit

    while (state.phase !== 'gameOver' && totalActions < maxIterations) {
        var currentRound = state.round;
        log('=== ROUND ' + currentRound + ' ===');
        logBlank();

        var lastRole = null;
        var roundActions = 0;

        // Process all turns in this round
        while (state.phase === 'action' && state.round === currentRound && roundActions < 200) {
            var role = Engine.getCurrentRole();
            var actions = Engine.getAvailableActions(role);

            // Log role header when role changes
            if (role !== lastRole) {
                if (lastRole !== null) logBlank();
                log('--- ' + roleLabel(role) + "'s Turn ---");
                log('Actions Remaining: ' + state[role].actionsRemaining);
                if (role === 'president') log('Popularity: ' + state.president.popularity);
                if (role === 'house' || role === 'senate') log('PC: ' + state[role].pc);
                if (role === 'supremeCourt') log('VP: ' + state.supremeCourt.vp);
                lastRole = role;
            }

            if (actions.length === 0) {
                log('  No actions available — skipping');
                break;
            }

            log('Available: [' + actions.map(function(a) { return a.id; }).join(', ') + ']');

            // Run negotiations before AI decision
            runNegotiations(role, state, actions);

            // Try actions, retrying on failure with reduced options
            var failedIds = [];
            var succeeded = false;
            var wasFreeAction = false;
            var prevRound = state.round;

            for (var retries = 0; retries < 20; retries++) {
                var filteredActions = actions.filter(function(a) {
                    return failedIds.indexOf(a.id) === -1;
                });

                if (filteredActions.length === 0) {
                    log('  All actions exhausted (failures). Stalling.');
                    break;
                }

                var decision;
                var hasInitiate = filteredActions.some(function(a) { return a.id === 'initiateLegislation'; });
                if (role === 'house' && hasInitiate) {
                    // Max ±1 partisanship, ±1 popularity per rules
                    var partAdj = state.house.majorityParty === 'democrat' ? 1 : -1;
                    decision = { id: 'initiateLegislation', params: { partAdj: partAdj, popAdj: 1 } };
                } else {
                    decision = getAIDecision(role, state, filteredActions);
                }

                var paramStr = JSON.stringify(decision.params);
                if (paramStr === '{}') paramStr = 'none';

                var result = Engine.executeAction(role, decision.id, decision.params);

                if (!result.success) {
                    log('  Tried: ' + decision.id + ' → FAILED: ' + result.message);
                    failedIds.push(decision.id);
                    continue;
                }

                succeeded = true;
                log('  Action: ' + decision.id + ' (Params: ' + paramStr + ')');
                log('  Result: ✓ ' + result.message);

                // Evaluate promises after successful action
                evaluatePromises(role, decision.id, state, currentRound);

                totalActions++;
                roundActions++;

                if (result.freeAction) {
                    log('  (Free action — turn continues)');
                    lastRole = null;
                    wasFreeAction = true;
                }
                break;
            }

            if (!succeeded) {
                break;
            }

            state = Engine.getState();
            if (!wasFreeAction && (state.round !== prevRound || state.phase === 'gameOver')) {
                break;
            }
        }

        // End of round summary
        state = Engine.getState();
        logBlank();
        log('--- End of Round ' + currentRound + ' ---');
        log(vpStandings(state));
        log('President Popularity: ' + state.president.popularity);
        log('House PC: ' + state.house.pc + ' | Senate PC: ' + state.senate.pc);

        if (state.currentBill) {
            log('Current Bill: ' + billStr(state.currentBill));
        }

        // Election results
        if (state.electionLog && state.electionLog.length > 0) {
            var lastElection = state.electionLog[state.electionLog.length - 1];
            if (lastElection.round === currentRound) {
                log('Elections:');
                for (var e = 0; e < lastElection.results.length; e++) {
                    var er = lastElection.results[e];
                    if (!er) continue;
                    if (er.type === 'court' && er.event) {
                        log('  Court: ' + er.event);
                    } else if (er.type === 'house') {
                        log('  House Election: ' + (er.changes ? er.changes.join('; ') : 'Minor shifts'));
                        log('  New House: Far-D ' + state.house.composition.extremeDem +
                            ', Dem ' + state.house.composition.democrat +
                            ', Rep ' + state.house.composition.republican +
                            ', Far-R ' + state.house.composition.extremeRep +
                            ' (Majority: ' + state.house.majorityParty + ')');
                    } else if (er.type === 'senate') {
                        log('  Senate Election: ' + er.changing + ' senators shifted ' + er.steps + ' steps');
                        log('  New Senate: Dem ' + state.senate.composition.democrat +
                            ', Mod-Dem ' + state.senate.composition.modDem +
                            ', Mod-Rep ' + state.senate.composition.modRep +
                            ', Rep ' + state.senate.composition.republican +
                            ' (Majority: ' + state.senate.majorityParty + ')');
                    } else if (er.type === 'president') {
                        log('  Presidential Election: ' + er.winner + ' (rolled ' + er.roll + ' vs ' + er.effectivePop + ')');
                        log('  President Party: ' + state.president.party);
                    }
                }
            }
        }

        log('Supreme Court: ' + courtStr(state.supremeCourt.justices) + ' | JP: ' + state.supremeCourt.jp);
        if (state.supremeCourt.landmarkEffect) {
            log('Landmark Effect: ' + state.supremeCourt.landmarkEffect);
        }
        if (state.precedents && state.precedents.length > 0) {
            log('Precedents Set: ' + state.precedents.length);
        }
        logBlank();

        // Trust matrix and promise summary at end of round
        logTrustMatrix(currentRound);
        logPromiseSummary(currentRound);
        logBlank();

        // Trust decay toward neutral
        decayTrust();

        if (state.phase === 'gameOver') break;
    }

    // Game Over
    log('=== GAME OVER ===');
    log('Final ' + vpStandings(state));

    var winner = Engine.getWinner();
    if (winner) {
        log('Winner: ' + roleLabel(winner.role) + ' with ' + winner.vp + ' VP!');
    } else {
        log('Winner: Could not determine');
    }
    logBlank();

    // Full action log
    log('=== FULL ACTION LOG ===');
    if (state.log && state.log.length > 0) {
        for (var i = 0; i < state.log.length; i++) {
            var entry = state.log[i];
            log('R' + entry.round + ' [' + entry.role + '] ' + entry.action + ': ' + entry.details);
        }
    }
    logBlank();

    // Statistics
    log('=== STATISTICS ===');
    log('Total Actions Executed: ' + totalActions);
    log('Bills Passed: ' + state.passedBills.length);
    log('President Terms Served: ' + state.president.termsServed);
    log('Executive Orders Total: ' + state.president.executiveOrdersTotal);
    log('Final Dice Rolls: ' + state.diceHistory.length);
    logBlank();

    // End-of-game trust and negotiation summary
    logEndOfGameTrust(state);

    // Write to file
    var outputPath = path.join(__dirname, 'SIMULATION_RESULTS.txt');
    fs.writeFileSync(outputPath, output.join('\n'), 'utf8');
    console.log('Simulation complete! Results written to: ' + outputPath);
    console.log('Total actions: ' + totalActions + ' | Winner: ' + (winner ? roleLabel(winner.role) + ' (' + winner.vp + ' VP)' : 'N/A'));
}

runSimulation();
