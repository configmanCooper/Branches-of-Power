// Branches of Power — Configuration
// All game constants, action definitions, voting ranges, and rules

var Config = (function() {
    'use strict';

    var VERSION = '2.2.0';

    // Game length options
    var GAME_LENGTHS = {
        short: { rounds: 6, label: 'Short (6 rounds)' },
        standard: { rounds: 10, label: 'Standard (10 rounds)' },
        extended: { rounds: 24, label: 'Extended (24 rounds)' }
    };

    // Roles
    var ROLES = ['president', 'house', 'senate', 'supremeCourt'];
    var ROLE_LABELS = {
        president: 'President',
        house: 'House of Representatives',
        senate: 'Senate',
        supremeCourt: 'Supreme Court'
    };
    var ROLE_ICONS = {
        president: '🏛️',
        house: '🏠',
        senate: '🏛️',
        supremeCourt: '⚖️'
    };
    var ROLE_COLORS = {
        president: '#DAA520',
        house: '#2E8B57',
        senate: '#4169E1',
        supremeCourt: '#6A0DAD'
    };

    // Parties
    var PARTIES = {
        DEMOCRAT: 'democrat',
        REPUBLICAN: 'republican'
    };

    // Senate factions and voting ranges (partisanship range where they vote YES)
    var SENATE_FACTIONS = {
        democrat:    { label: 'Democrat',           voteYesMin: 11, voteYesMax: 18, color: '#0000CD' },
        modDem:      { label: 'Moderate Democrat',  voteYesMin: 8,  voteYesMax: 15, color: '#6495ED' },
        modRep:      { label: 'Moderate Republican', voteYesMin: 5, voteYesMax: 12, color: '#F08080' },
        republican:  { label: 'Republican',         voteYesMin: 3,  voteYesMax: 9,  color: '#CC0000' }
    };

    // House factions and voting ranges
    var HOUSE_FACTIONS = {
        extremeDem:  { label: 'Extreme Democrat',   voteYesMin: 14, voteYesMax: 20, color: '#00008B' },
        democrat:    { label: 'Democrat',            voteYesMin: 11, voteYesMax: 18, color: '#0000CD' },
        republican:  { label: 'Republican',          voteYesMin: 3,  voteYesMax: 9,  color: '#CC0000' },
        extremeRep:  { label: 'Extreme Republican',  voteYesMin: 1,  voteYesMax: 6,  color: '#8B0000' }
    };

    // Supreme Court justice leanings
    var JUSTICE_LEANINGS = {
        liberal:      { label: 'Liberal',      voteUnconMin: 1,  voteUnconMax: 9,  color: '#0000CD' },
        moderate:     { label: 'Moderate',     voteUnconRanges: [[1,5],[15,20]],    color: '#808080' },
        conservative: { label: 'Conservative', voteUnconMin: 11, voteUnconMax: 20, color: '#CC0000' }
    };

    // Senate voting: need 60 yes (or 51 with 1PC), 100 total senators
    var SENATE_TOTAL = 100;
    var SENATE_PASS_THRESHOLD = 60;
    var SENATE_PASS_WITH_PC = 51;
    var SENATE_SUPERMAJORITY = 67; // 2/3 for veto override, impeachment

    // House voting: need 218 yes, 435 total
    var HOUSE_TOTAL = 435;
    var HOUSE_PASS_THRESHOLD = 218;
    var HOUSE_SUPERMAJORITY = 288; // 2/3 for veto override, impeachment

    // Supreme Court: 9 justices (can expand to 13 with Pack the Courts)
    var COURT_DEFAULT_SIZE = 9;
    var COURT_PACKED_SIZE = 13;

    // Max PC carryover
    var MAX_PC_CARRYOVER = 4;

    // Bill stat ranges
    var BILL_STAT_MIN = 1;
    var BILL_STAT_MAX = 20;

    // President popularity range
    var POPULARITY_MIN = 1;
    var POPULARITY_MAX = 20;
    var POPULARITY_START = 10;

    // Bill templates for random generation
    var BILL_NAMES = [
        'Education Reform Act', 'Healthcare Access Bill', 'Infrastructure Investment Act',
        'Tax Reform Bill', 'Climate Action Act', 'Immigration Reform Bill',
        'Defense Spending Act', 'Social Security Amendment', 'Criminal Justice Reform',
        'Voting Rights Act', 'Gun Control Legislation', 'Trade Agreement Act',
        'Technology Privacy Act', 'Housing Affordability Bill', 'Veterans Benefits Act',
        'Drug Policy Reform', 'Energy Independence Act', 'Labor Rights Bill',
        'Financial Regulation Act', 'Agricultural Subsidy Bill', 'Space Exploration Act',
        'Cybersecurity Enhancement Act', 'Minimum Wage Adjustment', 'Student Loan Reform',
        'Environmental Protection Act', 'Foreign Aid Authorization', 'Election Security Act',
        'Antitrust Enforcement Act', 'Mental Health Funding Bill', 'Transportation Safety Act'
    ];

    // Election rules
    var ELECTIONS = {
        president: { frequency: 4, maxTerms: 2 },
        senate:    { frequency: 2, maxChange: 32 },
        house:     { frequency: 2 },
        court:     { frequency: 1 }
    };

    // Per-game limits for special actions
    var PER_GAME_LIMITS = {
        witchhunts: 2,
        governmentShutdowns: 2,
        impeachments: 2,
        packCourts: 1,
        constitutionalCrisis: 2,
        internalInquiry: 6,
        partisanRuling: 2,
        landmarkRuling: 1
    };

    return {
        VERSION: VERSION,
        GAME_LENGTHS: GAME_LENGTHS,
        ROLES: ROLES,
        ROLE_LABELS: ROLE_LABELS,
        ROLE_ICONS: ROLE_ICONS,
        ROLE_COLORS: ROLE_COLORS,
        PARTIES: PARTIES,
        SENATE_FACTIONS: SENATE_FACTIONS,
        HOUSE_FACTIONS: HOUSE_FACTIONS,
        JUSTICE_LEANINGS: JUSTICE_LEANINGS,
        SENATE_TOTAL: SENATE_TOTAL,
        SENATE_PASS_THRESHOLD: SENATE_PASS_THRESHOLD,
        SENATE_PASS_WITH_PC: SENATE_PASS_WITH_PC,
        SENATE_SUPERMAJORITY: SENATE_SUPERMAJORITY,
        HOUSE_TOTAL: HOUSE_TOTAL,
        HOUSE_PASS_THRESHOLD: HOUSE_PASS_THRESHOLD,
        HOUSE_SUPERMAJORITY: HOUSE_SUPERMAJORITY,
        COURT_DEFAULT_SIZE: COURT_DEFAULT_SIZE,
        COURT_PACKED_SIZE: COURT_PACKED_SIZE,
        MAX_PC_CARRYOVER: MAX_PC_CARRYOVER,
        BILL_STAT_MIN: BILL_STAT_MIN,
        BILL_STAT_MAX: BILL_STAT_MAX,
        POPULARITY_MIN: POPULARITY_MIN,
        POPULARITY_MAX: POPULARITY_MAX,
        POPULARITY_START: POPULARITY_START,
        BILL_NAMES: BILL_NAMES,
        ELECTIONS: ELECTIONS,
        PER_GAME_LIMITS: PER_GAME_LIMITS
    };
})();

if (typeof module !== 'undefined') module.exports = Config;
