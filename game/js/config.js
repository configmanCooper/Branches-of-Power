// Branches of Power — Configuration
// All game constants, action definitions, voting ranges, and rules

var Config = (function() {
    'use strict';

    var VERSION = '3.1.0';

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

    var BILL_DESCRIPTIONS = {
        'Education Reform Act': 'Overhauls public school funding and curriculum standards.',
        'Healthcare Access Bill': 'Expands coverage and reduces prescription costs.',
        'Infrastructure Investment Act': 'Funds roads, bridges, and broadband expansion.',
        'Tax Reform Bill': 'Restructures tax brackets and closes loopholes.',
        'Climate Action Act': 'Sets emissions targets and funds green energy.',
        'Immigration Reform Bill': 'Updates visa programs and border policy.',
        'Defense Spending Act': 'Adjusts military budget and readiness programs.',
        'Social Security Amendment': 'Modifies benefits and retirement age thresholds.',
        'Criminal Justice Reform': 'Reforms sentencing guidelines and prison conditions.',
        'Voting Rights Act': 'Strengthens voter protections and access.',
        'Gun Control Legislation': 'Regulates firearm sales and background checks.',
        'Trade Agreement Act': 'Establishes new international trade terms.',
        'Technology Privacy Act': 'Protects digital data and limits surveillance.',
        'Housing Affordability Bill': 'Funds affordable housing and rent protections.',
        'Veterans Benefits Act': 'Expands healthcare and job programs for veterans.',
        'Drug Policy Reform': 'Updates drug scheduling and treatment funding.',
        'Energy Independence Act': 'Invests in domestic energy production.',
        'Labor Rights Bill': 'Strengthens union protections and worker safety.',
        'Financial Regulation Act': 'Tightens oversight of banks and markets.',
        'Agricultural Subsidy Bill': 'Adjusts farm subsidies and food programs.',
        'Space Exploration Act': 'Funds NASA missions and commercial space.',
        'Cybersecurity Enhancement Act': 'Strengthens federal cyber defenses.',
        'Minimum Wage Adjustment': 'Raises the federal minimum wage.',
        'Student Loan Reform': 'Restructures student debt and repayment plans.',
        'Environmental Protection Act': 'Strengthens pollution limits and conservation.',
        'Foreign Aid Authorization': 'Sets foreign assistance budgets and priorities.',
        'Election Security Act': 'Funds secure voting systems and audits.',
        'Antitrust Enforcement Act': 'Strengthens monopoly breakup powers.',
        'Mental Health Funding Bill': 'Expands mental health services and research.',
        'Transportation Safety Act': 'Updates vehicle and transit safety standards.'
    };

    var GLOSSARY = {
        VP: 'Victory Points — your score. Highest VP wins the game.',
        PC: 'Political Capital — spend to boost votes, filibuster, or use powerful actions. Caps at 4 between rounds.',
        JP: 'Judicial Points — Supreme Court resource for reviews, briefs, and rulings.',
        Pop: 'Popularity — President\'s public approval (1-20). Affects elections and unlocks Bully Pulpit.',
        Stability: 'National stability (0-10). Events lower it. At 0, the government collapses and everyone loses.',
        Partisanship: 'How politically aligned a bill is (1=far right, 20=far left). Determines which factions vote for it.',
        Popularity_Bill: 'How popular a bill is with the public (1-20). Affects President VP when signing.',
        Legality: 'How legally sound a bill is (1-20). Low legality means the Supreme Court can strike it down.'
    };

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

    // 6.1 Action Tooltips — strategic hints for every action
    var ACTION_TOOLTIPS = {
        // President
        executiveOrder: '+1 VP, +1 Popularity. Reliable baseline action.',
        signBill: '+4 VP. Sign a bill passed by both chambers into law.',
        veto: '-1 VP. Send bill back, requires 2/3 to override.',
        campaign: '+4 Popularity. Costs 2 actions. Build toward Bully Pulpit.',
        bullyPulpit: '+5 VP, -2 Pop. Requires Popularity > 15.',
        stateDinner: '+3 VP, +2 Pop, target gets +1 VP.',
        assignJustice: '+2 VP if confirmed. Nominate a justice for vacant seat.',
        taxCuts: 'Create a popular bill. Costs 3 actions.',
        witchhunt: '-6 VP to SC. Costs 2 actions, 2 VP, 2 Pop. Requires Pop ≥ 15.',
        executivePrivilege: '+2 extra actions this round. Once per game.',
        advocate: '+2/+4 PC to chambers. Costs -5 bill popularity.',
        admonish: '-2/-4 PC from chambers. Costs -5 bill popularity.',
        sue: 'Force judicial review of opposing bill. SC gets +1 VP.',
        // House
        housePassBill: 'Call House vote on bill. VP based on vote margin.',
        initiateLegislation: 'Create a custom bill for the floor. Free action.',
        stateOfUnion: 'Choose: +1 VP, +2 PC, or hurt President popularity.',
        whipHouse: 'Shift 20 reps one faction step.',
        supportBill: '+5 bill popularity, +2 partisanship.',
        attackBill: '-5 bill popularity, -2 partisanship.',
        killBill: '+1 VP. Remove bill from floor. Costs 1 PC.',
        hostHearing: 'Choose: +2 VP, +2 PC, or hurt President.',
        riderAmendment: '+3 VP if bill passes both chambers.',
        earmark: '+4 VP. Costs 6 PC.',
        caucusMeeting: '+3 PC. Build political capital.',
        subpoena: '+2 VP. Investigate the executive branch.',
        powerOfPurse: '-4 VP. President & Senate lose 1 action each.',
        popularizeBill: '+3 bill popularity.',
        changeBillNow: 'Modify bill partisanship by ±2.',
        impeach: 'Begin impeachment. Costs 6 PC.',
        packCourts: 'Begin court packing. Costs 6 PC, 4 VP.',
        // Senate
        senatePassBill: 'Call Senate vote on bill. Needs 60/100 votes.',
        debate: '+2 PC. Build political capital.',
        filibuster: 'Block bill from passing. Costs 4-5 PC.',
        nominations: '+1 VP. Confirm/reject pending justice.',
        stall: 'Delay bill passage. Costs 2 PC.',
        conference: '+1 PC. Minor political capital gain.',
        governmentShutdown: 'Reset House PC to 0. Costs 6 PC, -2 VP.',
        repeal: 'Repeal a passed law. Costs 3 PC.',
        senateInvestigation: '+2 VP. Investigate executive branch.',
        reviveBill: 'Bring a bill back to the floor.',
        // Supreme Court
        judicialReview: 'Rule on bill constitutionality. Big VP if unconstitutional.',
        generalCourt: '+2 VP. Standard court business. Once per round.',
        investigateBill: '-1 to -3 legality on bill. Setup for judicial review.',
        courtClerksResearch: '+1 VP, +2 JP. Build judicial points.',
        courtAdvisoryRole: '+2 VP. Issue advisory opinion. Once per round.',
        certiorari: '+1 VP, +1 JP. Accept case for review.',
        oralArguments: '+2 VP, +1 JP. Hear oral arguments. Once per round.',
        injunction: 'Block bill temporarily. Costs 2 JP.',
        amicusBrief: '+3 legality to bill. Costs 2 JP. Once per round.',
        billReview: '+1 VP, legality info. Once per round.',
        landmarkRuling: '+5 VP. Costs 4 JP. Major ruling.',
        constitutionalCrisis: 'Permanent legality modifier. Costs 8 JP.',
        partisanRuling: 'Shift bill partisanship. Costs 4 JP.',
        internalInquiry: '+1 VP. Investigate a justice.',
        suggestJustice: 'Recommend justice leaning to President.',
        recusal: 'Recuse a justice from voting.',
        writeOpinion: '+1 VP, +1 JP. Write judicial opinion. Once per round.',
        // Shared
        resolveEvent: 'Help resolve active event for VP + stability.',
        proposeUnitySummit: 'Propose national unity. Costs 2 actions, 2 VP.',
        agreeUnitySummit: 'Join unity summit. Costs 1 action, 1 VP.',
        proposeAmendment: 'Propose constitutional amendment.',
        agreeAmendment: 'Support constitutional amendment.',
        skipRemainingActions: 'End your turn early.'
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
        PER_GAME_LIMITS: PER_GAME_LIMITS,
        ACTION_TOOLTIPS: ACTION_TOOLTIPS,
        BILL_DESCRIPTIONS: BILL_DESCRIPTIONS,
        GLOSSARY: GLOSSARY
    };
})();

if (typeof module !== 'undefined') module.exports = Config;
