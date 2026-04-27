// Personality Effectiveness Test — runs sims for each personality of each role
'use strict';

var path = require('path');
var fs = require('fs');
var execSync = require('child_process').execSync;

var SIMS_PER_PERSONALITY = 5;
var ROLES = ['president', 'house', 'senate', 'supremeCourt'];
var ROLE_LABELS = { president: 'President', house: 'House', senate: 'Senate', supremeCourt: 'Supreme Court' };

var personalityNames = {
    president: ['Dealmaker', 'Populist', 'Hawk', 'Statesman', 'Opportunist', 'Isolationist', 'Tactician', 'Reformer'],
    house: ['Legislator', 'Obstructionist', 'Whip Master', 'Populist Speaker', 'Power Broker', 'Radical', 'Pragmatist', 'Committee Chair'],
    senate: ['Majority Leader', 'Filibusterer', 'Consensus Builder', 'Kingmaker', 'Hardliner', 'Dealmaker', 'Saboteur', 'Institutionalist'],
    supremeCourt: ['Activist', 'Originalist', 'Strategist', 'Maverick', 'Guardian', 'Politician', 'Precedent Setter', 'Minimalist']
};

var simScript = path.join(__dirname, '_personality_single_sim.js');

// ======================= MAIN =======================
var allResults = {};
var totalSims = 0;

console.log('Running personality effectiveness tests...');
console.log(SIMS_PER_PERSONALITY + ' sims per personality, ' + (4 * 8 * SIMS_PER_PERSONALITY) + ' total simulations\n');

for (var ri = 0; ri < ROLES.length; ri++) {
    var role = ROLES[ri];
    allResults[role] = {};

    console.log('================================================');
    console.log('  Testing ' + ROLE_LABELS[role] + ' Personalities');
    console.log('================================================');

    for (var pi = 0; pi < 8; pi++) {
        var pName = personalityNames[role][pi];
        allResults[role][pName] = { wins: 0, totalVP: 0, vpValues: [], sims: 0 };

        for (var si = 0; si < SIMS_PER_PERSONALITY; si++) {
            try {
                var stdout = execSync('node "' + simScript + '" ' + role + ' ' + pi, {
                    cwd: __dirname, timeout: 30000
                }).toString().trim();
                var parsed = JSON.parse(stdout);
                allResults[role][pName].sims++;
                allResults[role][pName].totalVP += parsed.vp[role];
                allResults[role][pName].vpValues.push(parsed.vp[role]);
                if (parsed.winner === role) allResults[role][pName].wins++;
                totalSims++;
            } catch (e) {
                console.log('  ERROR: ' + pName + ' sim ' + (si + 1) + ': ' + (e.message || '').substring(0, 80));
                totalSims++;
            }
        }

        var data = allResults[role][pName];
        var avgVP = data.sims > 0 ? (data.totalVP / data.sims).toFixed(1) : '0';
        var winPct = data.sims > 0 ? (100 * data.wins / data.sims).toFixed(0) : '0';
        console.log('  ' + pName + ': Avg VP=' + avgVP + ', Wins=' + data.wins + '/' + data.sims + ' (' + winPct + '%)');
    }
    console.log('');
}

// ======================= RANKINGS =======================

var outputLines = [];
outputLines.push('==========================================================');
outputLines.push('  PERSONALITY EFFECTIVENESS RANKINGS');
outputLines.push('  ' + SIMS_PER_PERSONALITY + ' simulations per personality');
outputLines.push('  ' + totalSims + ' total simulations run on ' + new Date().toISOString().split('T')[0]);
outputLines.push('==========================================================');
outputLines.push('');
outputLines.push('Method: Each personality was tested with that role fixed to');
outputLines.push('the personality and all other roles using random personalities.');
outputLines.push('This isolates the effect of each personality on performance.');
outputLines.push('');

for (var ri2 = 0; ri2 < ROLES.length; ri2++) {
    var role2 = ROLES[ri2];
    var label = ROLE_LABELS[role2];

    var rankings = [];
    for (var pName2 in allResults[role2]) {
        var d = allResults[role2][pName2];
        var avg = d.sims > 0 ? d.totalVP / d.sims : 0;
        var min = d.vpValues.length > 0 ? Math.min.apply(null, d.vpValues) : 0;
        var max = d.vpValues.length > 0 ? Math.max.apply(null, d.vpValues) : 0;
        rankings.push({
            name: pName2,
            avgVP: avg,
            wins: d.wins,
            sims: d.sims,
            winRate: d.sims > 0 ? (100 * d.wins / d.sims) : 0,
            min: min,
            max: max
        });
    }

    rankings.sort(function(a, b) {
        if (b.avgVP !== a.avgVP) return b.avgVP - a.avgVP;
        return b.winRate - a.winRate;
    });

    outputLines.push('=== ' + label.toUpperCase() + ' PERSONALITIES ===');
    outputLines.push('');
    outputLines.push('Rank  Personality          Avg VP   Win Rate      Min VP   Max VP');
    outputLines.push('----  -------------------  ------   ----------    ------   ------');

    for (var k = 0; k < rankings.length; k++) {
        var r = rankings[k];
        var nameStr = r.name;
        while (nameStr.length < 20) nameStr += ' ';
        var avgStr = r.avgVP.toFixed(1);
        while (avgStr.length < 6) avgStr = ' ' + avgStr;
        var wrStr = r.winRate.toFixed(0) + '%';
        while (wrStr.length < 4) wrStr = ' ' + wrStr;
        var winsStr = '(' + r.wins + '/' + r.sims + ')';
        while (winsStr.length < 6) winsStr += ' ';
        var minStr = '' + r.min;
        while (minStr.length < 6) minStr = ' ' + minStr;
        var maxStr = '' + r.max;
        while (maxStr.length < 6) maxStr = ' ' + maxStr;

        var line = ' #' + (k + 1) + '   ' + nameStr + avgStr + '   ' + wrStr + ' ' + winsStr + '   ' + minStr + '   ' + maxStr;
        outputLines.push(line);
    }
    outputLines.push('');
}

// Best & Worst summary
outputLines.push('==========================================================');
outputLines.push('  BEST & WORST PERSONALITY PER ROLE');
outputLines.push('==========================================================');
outputLines.push('');

for (var ri3 = 0; ri3 < ROLES.length; ri3++) {
    var role3 = ROLES[ri3];
    var best = null, bestAvg = -999, worst = null, worstAvg = 999;
    for (var pn in allResults[role3]) {
        var dd = allResults[role3][pn];
        var aavg = dd.sims > 0 ? dd.totalVP / dd.sims : 0;
        if (aavg > bestAvg) { bestAvg = aavg; best = pn; }
        if (aavg < worstAvg) { worstAvg = aavg; worst = pn; }
    }
    outputLines.push(ROLE_LABELS[role3] + ':');
    outputLines.push('  BEST  = ' + best + ' (' + bestAvg.toFixed(1) + ' avg VP)');
    outputLines.push('  WORST = ' + worst + ' (' + worstAvg.toFixed(1) + ' avg VP)');
    outputLines.push('  Spread = ' + (bestAvg - worstAvg).toFixed(1) + ' VP difference');
    outputLines.push('');
}

// Trait analysis
outputLines.push('==========================================================');
outputLines.push('  TRAIT CORRELATION ANALYSIS');
outputLines.push('==========================================================');
outputLines.push('');
outputLines.push('Average trait values for top 3 vs bottom 3 performers:');
outputLines.push('');

var traitNames = ['riskLevel', 'legislativeFocus', 'baseLieRate', 'negotiationRate', 'aggressiveness', 'cooperation'];
var allPersonalities = {
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

for (var ri4 = 0; ri4 < ROLES.length; ri4++) {
    var role4 = ROLES[ri4];
    var pList = allPersonalities[role4];
    var sorted = [];
    for (var pp = 0; pp < pList.length; pp++) {
        var pData = allResults[role4][pList[pp].name];
        if (!pData || pData.sims === 0) continue;
        sorted.push({ personality: pList[pp], avgVP: pData.totalVP / pData.sims });
    }
    sorted.sort(function(a, b) { return b.avgVP - a.avgVP; });

    outputLines.push(ROLE_LABELS[role4] + ':');
    if (sorted.length >= 3) {
        for (var ti = 0; ti < traitNames.length; ti++) {
            var t = traitNames[ti];
            var topAvg = 0, botAvg = 0;
            for (var j = 0; j < 3; j++) {
                topAvg += sorted[j].personality[t];
                botAvg += sorted[sorted.length - 1 - j].personality[t];
            }
            topAvg = (topAvg / 3).toFixed(2);
            botAvg = (botAvg / 3).toFixed(2);
            var diff = (parseFloat(topAvg) - parseFloat(botAvg)).toFixed(2);
            var indicator = Math.abs(parseFloat(diff)) > 0.15 ? (parseFloat(diff) > 0 ? ' ▲' : ' ▼') : '';
            var tLabel = t;
            while (tLabel.length < 18) tLabel += ' ';
            outputLines.push('  ' + tLabel + 'Top3=' + topAvg + '  Bot3=' + botAvg + '  Diff=' + diff + indicator);
        }
    }
    outputLines.push('');
}

// Write to file
var outPath = path.join(__dirname, 'PERSONALITY_RANKINGS.txt');
fs.writeFileSync(outPath, outputLines.join('\n'), 'utf8');
console.log('\n================================================================');
console.log('Results saved to: ' + outPath);
console.log('================================================================');
