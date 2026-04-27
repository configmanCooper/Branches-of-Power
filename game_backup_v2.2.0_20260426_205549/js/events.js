// Branches of Power — Events & Stability System
// National crisis events that all branches must respond to

var GameEvents = (function() {
    'use strict';

    // ========== EVENT DATA ==========
    var EVENT_POOL = [

        // --- DOMESTIC (1-10) ---
        {
            id: 'governmentFundingCrisis',
            name: 'Government Funding Crisis',
            category: 'Domestic',
            severity: 2,
            flavor: 'The current budget expires at midnight. Without action, essential services will shut down.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: 0, house: 0, senate: 0, supremeCourt: 0, all: -2 },
                popularity: 0,
                other: null
            },
            resolutions: [
                {
                    id: 'emergencyBudget',
                    label: 'Emergency Budget',
                    description: 'House and Senate each spend 1 action',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'presidentialDecree',
                    label: 'Presidential Decree',
                    description: 'President spends 1 action + 2 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 2, jp: 0 },
                    reward: { stability: 1, vp: { president: 3 } },
                    rollRequired: false
                },
                {
                    id: 'austerityMeasures',
                    label: 'Austerity Measures',
                    description: 'Any player spends 1 action. All lose 1 VP.',
                    roles: ['president', 'house', 'senate', 'supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { all: -1 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'infrastructureCollapse',
            name: 'Infrastructure Collapse',
            category: 'Domestic',
            severity: 3,
            flavor: 'A major bridge has collapsed, highlighting the nation\'s crumbling infrastructure.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -2, house: -2, senate: -2, supremeCourt: 0, all: 0 },
                popularity: -2,
                houseShift: { chaos: 45 },
                senateShift: { chaos: 12 }
            },
            resolutions: [
                {
                    id: 'emergencyRepairs',
                    label: 'Emergency Repairs',
                    description: 'President and House each spend 1 action',
                    roles: ['president', 'house'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 2, house: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'infrastructureBill',
                    label: 'Infrastructure Bill',
                    description: 'House spends 2 actions and 2 PC',
                    roles: ['house'],
                    cooperative: false,
                    cost: { actions: 2, pc: 2, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 4 } },
                    rollRequired: false
                },
                {
                    id: 'federalAid',
                    label: 'Federal Aid Package',
                    description: 'President spends 1 action + 3 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 3, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'opioidEpidemic',
            name: 'Opioid Epidemic',
            category: 'Domestic',
            severity: 2,
            flavor: 'Overdose deaths have reached record levels. The public demands immediate action.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -1, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'publicHealthResponse',
                    label: 'Public Health Response',
                    description: 'President and Senate each spend 1 action',
                    roles: ['president', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'drugEnforcement',
                    label: 'Drug Enforcement Crackdown',
                    description: 'President spends 1 action. Roll d20 ≥ 10.',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { president: 3 } },
                    rollRequired: true,
                    rollThreshold: 10,
                    rollBonus: 0
                },
                {
                    id: 'fundTreatment',
                    label: 'Fund Treatment Centers',
                    description: 'House spends 1 action + 1 PC',
                    roles: ['house'],
                    cooperative: false,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'teachersStrike',
            name: 'Teachers Strike',
            category: 'Domestic',
            severity: 1,
            flavor: 'Teachers across the nation have gone on strike demanding better pay and conditions.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -1,
                vp: { president: 0, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -1,
                other: null
            },
            resolutions: [
                {
                    id: 'negotiateTeachers',
                    label: 'Negotiate Settlement',
                    description: 'Senate spends 1 action',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { senate: 2 } },
                    rollRequired: false
                },
                {
                    id: 'educationFunding',
                    label: 'Education Funding Bill',
                    description: 'House spends 1 action + 1 PC',
                    roles: ['house'],
                    cooperative: false,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'housingMarketCrash',
            name: 'Housing Market Crash',
            category: 'Domestic',
            severity: 3,
            flavor: 'The housing market has crashed, leaving millions at risk of foreclosure.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -3,
                houseShift: { chaos: 60 },
                senateShift: { chaos: 15 }
            },
            resolutions: [
                {
                    id: 'housingBailout',
                    label: 'Housing Bailout',
                    description: 'President, House, and Senate each spend 1 action',
                    roles: ['president', 'house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { president: 2, house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'mortgageRelief',
                    label: 'Mortgage Relief Program',
                    description: 'President spends 1 action + 3 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 3, jp: 0 },
                    reward: { stability: 2, vp: { president: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'wildfireEmergency',
            name: 'Wildfire Emergency',
            category: 'Domestic',
            severity: 2,
            flavor: 'Massive wildfires are consuming homes and forests. Evacuation orders are in effect.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -2, house: 0, senate: 0, supremeCourt: 0, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'federalDisasterResponse',
                    label: 'Federal Disaster Response',
                    description: 'President spends 1 action',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { president: 3 } },
                    rollRequired: false
                },
                {
                    id: 'disasterFunding',
                    label: 'Disaster Funding Bill',
                    description: 'House and Senate each spend 1 action',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                }
            ],
            specialActions: []
        },
        {
            id: 'vaScandal',
            name: 'VA Scandal',
            category: 'Domestic',
            severity: 2,
            flavor: 'Veterans Affairs hospitals have been caught falsifying wait times. Veterans are dying.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'vaReform',
                    label: 'VA Reform Package',
                    description: 'Senate spends 1 action + 1 PC',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { senate: 3 } },
                    rollRequired: false
                },
                {
                    id: 'vaExecutiveAction',
                    label: 'Executive Action on VA',
                    description: 'President spends 1 action + 2 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 2, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'waterContamination',
            name: 'Water Contamination',
            category: 'Domestic',
            severity: 3,
            flavor: 'Lead contamination has been found in a major city\'s water supply. Thousands are affected.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -1, house: -1, senate: -1, supremeCourt: -1, all: 0 },
                popularity: -2,
                justiceEffect: { switchPartisanship: 1 },
                houseShift: { chaos: 30 }
            },
            resolutions: [
                {
                    id: 'emergencyWaterSupply',
                    label: 'Emergency Water Supply',
                    description: 'President spends 1 action immediately',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                },
                {
                    id: 'waterInfrastructure',
                    label: 'Water Infrastructure Overhaul',
                    description: 'House and Senate each spend 1 action + 1 PC each',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { house: 3, senate: 3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                }
            ],
            specialActions: []
        },
        {
            id: 'massShooting',
            name: 'Mass Shooting',
            category: 'Domestic',
            severity: 3,
            flavor: 'A horrific mass shooting has shocked the nation. The debate over gun control intensifies.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -1, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -3,
                houseShift: { chaos: 38 },
                justiceEffect: { switchPartisanship: 1 }
            },
            resolutions: [
                {
                    id: 'gunControlLegislation',
                    label: 'Gun Control Legislation',
                    description: 'House and Senate each spend 1 action + 1 PC',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 3, senate: 3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'mentalHealthInitiative',
                    label: 'Mental Health Initiative',
                    description: 'President spends 1 action + 2 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 2, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                },
                {
                    id: 'secondAmendmentRuling',
                    label: 'Second Amendment Ruling',
                    description: 'Supreme Court spends 1 action + 2 JP. Roll d20 ≥ 8.',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 2 },
                    reward: { stability: 2, vp: { supremeCourt: 4 } },
                    rollRequired: true,
                    rollThreshold: 8,
                    rollBonus: 0
                }
            ],
            specialActions: []
        },
        {
            id: 'censusControversy',
            name: 'Census Controversy',
            category: 'Domestic',
            severity: 1,
            flavor: 'A controversial question on the census has sparked legal battles and public outcry.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -1,
                vp: { president: 0, house: -1, senate: 0, supremeCourt: -1, all: 0 },
                popularity: 0,
                other: null
            },
            resolutions: [
                {
                    id: 'censusRuling',
                    label: 'Court Census Ruling',
                    description: 'Supreme Court spends 1 action + 1 JP',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 1 },
                    reward: { stability: 1, vp: { supremeCourt: 3 } },
                    rollRequired: false
                },
                {
                    id: 'censusCompromise',
                    label: 'Legislative Compromise',
                    description: 'House spends 1 action',
                    roles: ['house'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },

        // --- FOREIGN (11-20) ---
        {
            id: 'borderCrisis',
            name: 'Border Crisis',
            category: 'Foreign',
            severity: 2,
            flavor: 'A surge of migrants at the border has overwhelmed processing facilities.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'borderSecurity',
                    label: 'Border Security Package',
                    description: 'President and Senate each spend 1 action',
                    roles: ['president', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'immigrationReform',
                    label: 'Immigration Reform',
                    description: 'House spends 1 action + 2 PC',
                    roles: ['house'],
                    cooperative: false,
                    cost: { actions: 1, pc: 2, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'foreignMilitaryConflict',
            name: 'Foreign Military Conflict',
            category: 'Foreign',
            severity: 3,
            flavor: 'An allied nation is under attack. They are requesting immediate military assistance.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -3, house: 0, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -3,
                senateShift: { chaos: 18 }
            },
            resolutions: [
                {
                    id: 'militaryIntervention',
                    label: 'Military Intervention',
                    description: 'President spends 2 actions + 3 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 2, pc: 0, vp: 0, popularity: 3, jp: 0 },
                    reward: { stability: 2, vp: { president: 5 } },
                    rollRequired: true,
                    rollThreshold: 8,
                    rollBonus: 0
                },
                {
                    id: 'diplomaticSolution',
                    label: 'Diplomatic Solution',
                    description: 'President and Senate each spend 1 action',
                    roles: ['president', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 2, senate: 3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'sanctionsOnly',
                    label: 'Sanctions Only',
                    description: 'Senate spends 1 action',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { senate: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'tradeWar',
            name: 'Trade War',
            category: 'Foreign',
            severity: 2,
            flavor: 'Escalating tariffs with a major trading partner threaten the economy.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -1, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'tradeNegotiation',
                    label: 'Trade Negotiation',
                    description: 'President spends 1 action + 1 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 1, jp: 0 },
                    reward: { stability: 2, vp: { president: 3 } },
                    rollRequired: true,
                    rollThreshold: 10,
                    rollBonus: 0
                },
                {
                    id: 'tradeLegislation',
                    label: 'Trade Legislation',
                    description: 'House and Senate each spend 1 action',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                }
            ],
            specialActions: []
        },
        {
            id: 'climateSummit',
            name: 'Climate Summit',
            category: 'Foreign',
            severity: 1,
            flavor: 'A major international climate summit requires the US to take a position.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -1,
                vp: { president: -1, house: 0, senate: 0, supremeCourt: 0, all: 0 },
                popularity: -1,
                other: null
            },
            resolutions: [
                {
                    id: 'joinClimatePact',
                    label: 'Join Climate Pact',
                    description: 'President spends 1 action',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { president: 3 } },
                    rollRequired: false
                },
                {
                    id: 'climateCompromise',
                    label: 'Compromise Position',
                    description: 'Senate spends 1 action',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { senate: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'hostageCrisis',
            name: 'Hostage Crisis',
            category: 'Foreign',
            severity: 3,
            flavor: 'American citizens have been taken hostage by a foreign power.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -4, house: 0, senate: 0, supremeCourt: 0, all: 0 },
                popularity: -4,
                houseShift: { chaos: 30 },
                presidentLosesElection: true
            },
            resolutions: [
                {
                    id: 'rescueMission',
                    label: 'Rescue Mission',
                    description: 'President spends 2 actions. Roll d20 ≥ 12.',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 2, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { president: 6 } },
                    rollRequired: true,
                    rollThreshold: 12,
                    rollBonus: 0
                },
                {
                    id: 'hostageNegotiation',
                    label: 'Negotiate Release',
                    description: 'President spends 1 action + 3 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 3, jp: 0 },
                    reward: { stability: 2, vp: { president: 3 } },
                    rollRequired: false
                },
                {
                    id: 'senatePressure',
                    label: 'Diplomatic Pressure',
                    description: 'Senate spends 1 action + 2 PC',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 2, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { senate: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'cyberAttackOnAllies',
            name: 'Cyber Attack on Allies',
            category: 'Foreign',
            severity: 2,
            flavor: 'A state-sponsored cyber attack has targeted allied nations\' infrastructure.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -1, house: 0, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -1,
                other: null
            },
            resolutions: [
                {
                    id: 'cyberCounterattack',
                    label: 'Cyber Counterattack',
                    description: 'President spends 1 action. Roll d20 ≥ 10.',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 3 } },
                    rollRequired: true,
                    rollThreshold: 10,
                    rollBonus: 0
                },
                {
                    id: 'cyberDefenseAid',
                    label: 'Cyber Defense Aid',
                    description: 'Senate spends 1 action + 1 PC',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { senate: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'unResolution',
            name: 'UN Resolution',
            category: 'Foreign',
            severity: 1,
            flavor: 'The UN has proposed a resolution that requires US support or opposition.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -1,
                vp: { president: -1, house: 0, senate: -1, supremeCourt: 0, all: 0 },
                popularity: 0,
                other: null
            },
            resolutions: [
                {
                    id: 'supportResolution',
                    label: 'Support Resolution',
                    description: 'President spends 1 action',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                },
                {
                    id: 'opposeResolution',
                    label: 'Oppose Resolution',
                    description: 'Senate spends 1 action',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { senate: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'refugeeCrisis',
            name: 'Refugee Crisis',
            category: 'Foreign',
            severity: 2,
            flavor: 'A humanitarian crisis abroad has created a flood of refugees seeking asylum.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -1, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -1,
                other: null
            },
            resolutions: [
                {
                    id: 'refugeeAid',
                    label: 'Refugee Aid Program',
                    description: 'President and House each spend 1 action',
                    roles: ['president', 'house'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 2, house: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'refugeeCap',
                    label: 'Refugee Cap',
                    description: 'Senate spends 1 action',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { senate: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'embassyAttack',
            name: 'Embassy Attack',
            category: 'Foreign',
            severity: 3,
            flavor: 'A US embassy has been attacked. Staff are in danger.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -3, house: 0, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -3,
                senateShift: { chaos: 12 }
            },
            resolutions: [
                {
                    id: 'embassyRescue',
                    label: 'Military Rescue',
                    description: 'President spends 2 actions. Roll d20 ≥ 10.',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 2, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { president: 5 } },
                    rollRequired: true,
                    rollThreshold: 10,
                    rollBonus: 0
                },
                {
                    id: 'embassyEvacuation',
                    label: 'Ordered Evacuation',
                    description: 'President spends 1 action + 2 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 2, jp: 0 },
                    reward: { stability: 2, vp: { president: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'nuclearProliferation',
            name: 'Nuclear Proliferation',
            category: 'Foreign',
            severity: 3,
            flavor: 'Intelligence reports confirm a rogue state is developing nuclear weapons.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -2, house: 0, senate: -2, supremeCourt: 0, all: 0 },
                popularity: -2,
                senateShift: { chaos: 15 },
                justiceEffect: { switchPartisanship: 1 }
            },
            resolutions: [
                {
                    id: 'nuclearDiplomacy',
                    label: 'Nuclear Diplomacy',
                    description: 'President and Senate each spend 1 action',
                    roles: ['president', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { president: 3, senate: 3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'nuclearSanctions',
                    label: 'Severe Sanctions',
                    description: 'Senate spends 1 action + 2 PC',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 2, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { senate: 3 } },
                    rollRequired: false
                },
                {
                    id: 'nuclearStrike',
                    label: 'Preemptive Strike',
                    description: 'President spends 2 actions + 4 popularity. Roll d20 ≥ 14.',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 2, pc: 0, vp: 0, popularity: 4, jp: 0 },
                    reward: { stability: 3, vp: { president: 6 } },
                    rollRequired: true,
                    rollThreshold: 14,
                    rollBonus: 0
                }
            ],
            specialActions: []
        },

        // --- CONSTITUTIONAL (21-30) ---
        {
            id: 'impeachmentScandal',
            name: 'Impeachment Scandal',
            category: 'Constitutional',
            severity: 3,
            flavor: 'Evidence of presidential misconduct has surfaced. Congress must decide how to respond.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: 0, house: -2, senate: -2, supremeCourt: 0, all: 0 },
                popularity: 0,
                houseShift: { chaos: 38 },
                senateShift: { chaos: 15 },
                justiceEffect: { switchPartisanship: 1 },
                presidentLosesElection: true
            },
            resolutions: [
                {
                    id: 'beginImpeachment',
                    label: 'Begin Impeachment',
                    description: 'House and Senate each spend 1 action. President loses 3 VP.',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 3, senate: 3, president: -3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'censurePresident',
                    label: 'Censure Resolution',
                    description: 'Senate spends 1 action. President loses 1 VP.',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { senate: 2, president: -1 } },
                    rollRequired: false
                },
                {
                    id: 'clearPresident',
                    label: 'Clear the President',
                    description: 'Supreme Court spends 1 action + 2 JP. President gains 2 VP.',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 2 },
                    reward: { stability: 1, vp: { supremeCourt: 2, president: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'scVacancyCrisis',
            name: 'Supreme Court Vacancy Crisis',
            category: 'Constitutional',
            severity: 2,
            flavor: 'A Supreme Court justice has unexpectedly resigned. The vacancy must be filled.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -2, house: 0, senate: -2, supremeCourt: -1, all: 0 },
                popularity: -1,
                other: null
            },
            resolutions: [
                {
                    id: 'nominateAndConfirm',
                    label: 'Nominate and Confirm',
                    description: 'President and Senate each spend 1 action',
                    roles: ['president', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 2, senate: 2, supremeCourt: 1 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'blockNomination',
                    label: 'Block Nomination',
                    description: 'Senate spends 1 action + 2 PC. President loses 1 VP.',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 2, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { senate: 3, president: -1 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'constitutionalConvention',
            name: 'Constitutional Convention',
            category: 'Constitutional',
            severity: 2,
            flavor: 'States have called for a constitutional convention. The implications are enormous.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: 0, house: -1, senate: -1, supremeCourt: -2, all: 0 },
                popularity: 0,
                other: null
            },
            resolutions: [
                {
                    id: 'guideConvention',
                    label: 'Guide the Convention',
                    description: 'All four branches spend 1 action each',
                    roles: ['president', 'house', 'senate', 'supremeCourt'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { all: 3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'blockConvention',
                    label: 'Block the Convention',
                    description: 'Supreme Court spends 1 action + 3 JP',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 3 },
                    reward: { stability: 1, vp: { supremeCourt: 4 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'voterSuppression',
            name: 'Voter Suppression',
            category: 'Constitutional',
            severity: 2,
            flavor: 'Reports of systematic voter suppression threaten democratic legitimacy.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: 0, house: -1, senate: -1, supremeCourt: -1, all: 0 },
                popularity: -1,
                other: null
            },
            resolutions: [
                {
                    id: 'votingRightsAct',
                    label: 'Voting Rights Act',
                    description: 'House and Senate each spend 1 action',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'courtIntervention',
                    label: 'Court Intervention',
                    description: 'Supreme Court spends 1 action + 2 JP',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 2 },
                    reward: { stability: 2, vp: { supremeCourt: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'executiveOverreach',
            name: 'Executive Overreach',
            category: 'Constitutional',
            severity: 2,
            flavor: 'The President has issued too many executive orders. The other branches are alarmed.',
            deadline: 2,
            triggerCondition: function(state) {
                return state.president.executiveOrdersTotal >= 3;
            },
            failPenalty: {
                stability: -2,
                vp: { president: -3, house: 0, senate: 0, supremeCourt: 0, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'voluntaryRestraint',
                    label: 'Voluntary Restraint',
                    description: 'President spends 1 action + 2 popularity. President gains 2 VP.',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 2, jp: 0 },
                    reward: { stability: 2, vp: { president: 2 } },
                    rollRequired: false
                },
                {
                    id: 'congressionalCheck',
                    label: 'Congressional Check',
                    description: 'House spends 1 action. President loses 2 VP.',
                    roles: ['house'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 3, president: -2 } },
                    rollRequired: false
                },
                {
                    id: 'judicialReview',
                    label: 'Judicial Review',
                    description: 'Supreme Court spends 1 action + 1 JP. President loses 1 VP.',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 1 },
                    reward: { stability: 2, vp: { supremeCourt: 3, president: -1 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'stateVsFederal',
            name: 'State vs Federal',
            category: 'Constitutional',
            severity: 2,
            flavor: 'A state is challenging federal authority on a major policy issue.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -1, house: 0, senate: 0, supremeCourt: -2, all: 0 },
                popularity: 0,
                other: null
            },
            resolutions: [
                {
                    id: 'federalismRuling',
                    label: 'Federalism Ruling',
                    description: 'Supreme Court spends 1 action + 2 JP',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 2 },
                    reward: { stability: 2, vp: { supremeCourt: 4 } },
                    rollRequired: false
                },
                {
                    id: 'federalCompromise',
                    label: 'Federal Compromise',
                    description: 'President and Senate each spend 1 action',
                    roles: ['president', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                }
            ],
            specialActions: []
        },
        {
            id: 'filibusterReform',
            name: 'Filibuster Reform',
            category: 'Constitutional',
            severity: 1,
            flavor: 'The filibuster is being used to block all legislation. Calls for reform are growing.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -1,
                vp: { president: 0, house: -1, senate: -2, supremeCourt: 0, all: 0 },
                popularity: 0,
                other: null
            },
            resolutions: [
                {
                    id: 'reformFilibuster',
                    label: 'Reform Filibuster',
                    description: 'Senate spends 1 action + 2 PC',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 2, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { senate: 3 } },
                    rollRequired: false
                },
                {
                    id: 'defendFilibuster',
                    label: 'Defend Filibuster',
                    description: 'Senate spends 1 action. +2 VP but -1 stability.',
                    roles: ['senate'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: -1, vp: { senate: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'electoralCollege',
            name: 'Electoral College Controversy',
            category: 'Constitutional',
            severity: 2,
            flavor: 'A disputed election has reignited the debate over the Electoral College.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -1, house: -1, senate: -1, supremeCourt: -1, all: 0 },
                popularity: -1,
                other: null
            },
            resolutions: [
                {
                    id: 'electoralReform',
                    label: 'Electoral Reform',
                    description: 'House and Senate each spend 1 action + 1 PC',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 3, senate: 3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'upholdElectoralCollege',
                    label: 'Uphold Electoral College',
                    description: 'Supreme Court spends 1 action + 2 JP',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 2 },
                    reward: { stability: 1, vp: { supremeCourt: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'freedomOfPress',
            name: 'Freedom of Press Crisis',
            category: 'Constitutional',
            severity: 2,
            flavor: 'Government agencies have been caught surveilling journalists. Press freedom is at stake.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -2, house: 0, senate: 0, supremeCourt: -1, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'pressProtection',
                    label: 'Press Protection Act',
                    description: 'House and Senate each spend 1 action',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'firstAmendmentRuling',
                    label: 'First Amendment Ruling',
                    description: 'Supreme Court spends 1 action + 2 JP',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 2 },
                    reward: { stability: 2, vp: { supremeCourt: 4 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'secessionThreat',
            name: 'Secession Threat',
            category: 'Constitutional',
            severity: 3,
            flavor: 'A state legislature has voted to begin secession proceedings. The union is at risk.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -4,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: -1, all: 0 },
                popularity: -2,
                houseShift: { chaos: 53 },
                senateShift: { chaos: 23 },
                justiceEffect: { switchPartisanship: 1 }
            },
            resolutions: [
                {
                    id: 'addressSecession',
                    label: 'Presidential Address',
                    description: 'President spends 1 action + 3 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 3, jp: 0 },
                    reward: { stability: 2, vp: { president: 3 } },
                    rollRequired: false
                },
                {
                    id: 'secessionRuling',
                    label: 'Constitutional Ruling',
                    description: 'Supreme Court spends 1 action + 3 JP',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 3 },
                    reward: { stability: 3, vp: { supremeCourt: 5 } },
                    rollRequired: false
                },
                {
                    id: 'negotiateSecession',
                    label: 'Negotiate with State',
                    description: 'President and Senate each spend 1 action',
                    roles: ['president', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { president: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                }
            ],
            specialActions: []
        },

        // --- ECONOMIC (31-38) ---
        {
            id: 'stockMarketCrash',
            name: 'Stock Market Crash',
            category: 'Economic',
            severity: 3,
            flavor: 'The stock market has lost 30% of its value in a single week. Panic is spreading.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -3,
                houseShift: { chaos: 45 },
                senateShift: { chaos: 15 }
            },
            resolutions: [
                {
                    id: 'marketBailout',
                    label: 'Market Bailout',
                    description: 'President, House, and Senate each spend 1 action',
                    roles: ['president', 'house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { president: 2, house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'emergencyRatecut',
                    label: 'Emergency Rate Cut',
                    description: 'President spends 1 action + 2 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 2, jp: 0 },
                    reward: { stability: 2, vp: { president: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'nationalDebt',
            name: 'National Debt Crisis',
            category: 'Economic',
            severity: 2,
            flavor: 'The national debt has reached unsustainable levels. The debt ceiling must be raised.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: 0, house: -1, senate: -1, supremeCourt: 0, all: -1 },
                popularity: 0,
                other: null
            },
            resolutions: [
                {
                    id: 'raiseDebtCeiling',
                    label: 'Raise Debt Ceiling',
                    description: 'House and Senate each spend 1 action',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 1, senate: 1 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'spendingCuts',
                    label: 'Spending Cuts',
                    description: 'Any player spends 1 action. All lose 1 VP.',
                    roles: ['president', 'house', 'senate', 'supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { all: -1 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'energyCrisis',
            name: 'Energy Crisis',
            category: 'Economic',
            severity: 2,
            flavor: 'Energy prices have skyrocketed. Rolling blackouts affect millions.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'energyEmergency',
                    label: 'Energy Emergency Declaration',
                    description: 'President spends 1 action + 1 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 1, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                },
                {
                    id: 'energyBill',
                    label: 'Energy Independence Bill',
                    description: 'House and Senate each spend 1 action + 1 PC',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 3, senate: 3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                }
            ],
            specialActions: []
        },
        {
            id: 'laborUnion',
            name: 'Labor Union Standoff',
            category: 'Economic',
            severity: 1,
            flavor: 'Major labor unions have called a general strike affecting key industries.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -1,
                vp: { president: -1, house: -1, senate: 0, supremeCourt: 0, all: 0 },
                popularity: -1,
                other: null
            },
            resolutions: [
                {
                    id: 'laborMediation',
                    label: 'Federal Mediation',
                    description: 'President spends 1 action',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                },
                {
                    id: 'laborRightsLegislation',
                    label: 'Labor Rights Legislation',
                    description: 'House spends 1 action + 1 PC',
                    roles: ['house'],
                    cooperative: false,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'techMonopoly',
            name: 'Tech Monopoly',
            category: 'Economic',
            severity: 2,
            flavor: 'A tech giant has been found to be operating an illegal monopoly.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -1,
                vp: { president: 0, house: -1, senate: -1, supremeCourt: -1, all: 0 },
                popularity: 0,
                other: null
            },
            resolutions: [
                {
                    id: 'antitrustAction',
                    label: 'Antitrust Action',
                    description: 'Supreme Court spends 1 action + 2 JP. Roll d20 ≥ 8.',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 2 },
                    reward: { stability: 2, vp: { supremeCourt: 4 } },
                    rollRequired: true,
                    rollThreshold: 8,
                    rollBonus: 0
                },
                {
                    id: 'techRegulation',
                    label: 'Tech Regulation Bill',
                    description: 'House and Senate each spend 1 action',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                }
            ],
            specialActions: []
        },
        {
            id: 'inflationSurge',
            name: 'Inflation Surge',
            category: 'Economic',
            severity: 2,
            flavor: 'Inflation has surged to record levels. Consumer prices are out of control.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'inflationPackage',
                    label: 'Anti-Inflation Package',
                    description: 'President and House each spend 1 action',
                    roles: ['president', 'house'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 2, house: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'priceControls',
                    label: 'Price Controls',
                    description: 'President spends 1 action + 2 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 2, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'bankingFailure',
            name: 'Banking Failure',
            category: 'Economic',
            severity: 3,
            flavor: 'A major bank has collapsed. Contagion threatens the entire financial system.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -3,
                houseShift: { chaos: 38 },
                senateShift: { chaos: 12 }
            },
            resolutions: [
                {
                    id: 'bankBailout',
                    label: 'Bank Bailout',
                    description: 'President, House, and Senate each spend 1 action. All lose 1 VP.',
                    roles: ['president', 'house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { all: -1, president: 2, house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'fdicAction',
                    label: 'FDIC Emergency Action',
                    description: 'President spends 2 actions',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 2, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'cryptoRegulation',
            name: 'Crypto Regulation Crisis',
            category: 'Economic',
            severity: 1,
            flavor: 'A major cryptocurrency exchange has collapsed. Investors demand regulation.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -1,
                vp: { president: 0, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: 0,
                other: null
            },
            resolutions: [
                {
                    id: 'cryptoBill',
                    label: 'Crypto Regulation Bill',
                    description: 'House and Senate each spend 1 action',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'cryptoExecutiveOrder',
                    label: 'Executive Order on Crypto',
                    description: 'President spends 1 action',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },

        // --- SOCIAL (39-44) ---
        {
            id: 'nationwideProtests',
            name: 'Nationwide Protests',
            category: 'Social',
            severity: 2,
            flavor: 'Massive protests have erupted across the country demanding social change.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'addressProtests',
                    label: 'Presidential Address',
                    description: 'President spends 1 action + 2 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 2, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                },
                {
                    id: 'reformLegislation',
                    label: 'Reform Legislation',
                    description: 'House and Senate each spend 1 action',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 3, senate: 3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                }
            ],
            specialActions: []
        },
        {
            id: 'publicHealthEmergency',
            name: 'Public Health Emergency',
            category: 'Social',
            severity: 2,
            flavor: 'A disease outbreak has been declared a public health emergency.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'healthEmergencyResponse',
                    label: 'Emergency Health Response',
                    description: 'President spends 1 action',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                },
                {
                    id: 'healthFundingBill',
                    label: 'Health Funding Bill',
                    description: 'House and Senate each spend 1 action + 1 PC',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 3, senate: 3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                }
            ],
            specialActions: []
        },
        {
            id: 'educationCrisis',
            name: 'Education Crisis',
            category: 'Social',
            severity: 1,
            flavor: 'Test scores have plummeted nationwide. The education system is failing.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -1,
                vp: { president: -1, house: -1, senate: 0, supremeCourt: 0, all: 0 },
                popularity: -1,
                other: null
            },
            resolutions: [
                {
                    id: 'educationReform',
                    label: 'Education Reform',
                    description: 'House spends 1 action + 1 PC',
                    roles: ['house'],
                    cooperative: false,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 3 } },
                    rollRequired: false
                },
                {
                    id: 'educationExecutiveOrder',
                    label: 'Education Executive Order',
                    description: 'President spends 1 action',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'socialMediaDisinfo',
            name: 'Social Media Disinformation',
            category: 'Social',
            severity: 2,
            flavor: 'Foreign-sponsored disinformation campaigns are destabilizing public discourse.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -1, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -1,
                other: null
            },
            resolutions: [
                {
                    id: 'disinfoRegulation',
                    label: 'Platform Regulation',
                    description: 'House and Senate each spend 1 action',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'disinfoRuling',
                    label: 'First Amendment Ruling',
                    description: 'Supreme Court spends 1 action + 1 JP',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 1 },
                    reward: { stability: 1, vp: { supremeCourt: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'racialJustice',
            name: 'Racial Justice Movement',
            category: 'Social',
            severity: 2,
            flavor: 'A major incident has galvanized the racial justice movement. The nation demands action.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -2,
                other: null
            },
            resolutions: [
                {
                    id: 'civilRightsAct',
                    label: 'Civil Rights Act',
                    description: 'House and Senate each spend 1 action + 1 PC',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 3, senate: 3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'executiveOrderJustice',
                    label: 'Executive Order on Justice',
                    description: 'President spends 1 action + 2 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 2, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                },
                {
                    id: 'equalProtectionRuling',
                    label: 'Equal Protection Ruling',
                    description: 'Supreme Court spends 1 action + 2 JP',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 2 },
                    reward: { stability: 2, vp: { supremeCourt: 4 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'religiousFreedom',
            name: 'Religious Freedom Dispute',
            category: 'Social',
            severity: 1,
            flavor: 'A conflict between religious liberty and civil rights has reached a boiling point.',
            deadline: 3,
            triggerCondition: null,
            failPenalty: {
                stability: -1,
                vp: { president: 0, house: 0, senate: 0, supremeCourt: -2, all: 0 },
                popularity: 0,
                other: null
            },
            resolutions: [
                {
                    id: 'religiousFreedomRuling',
                    label: 'Court Ruling',
                    description: 'Supreme Court spends 1 action + 2 JP',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 2 },
                    reward: { stability: 1, vp: { supremeCourt: 4 } },
                    rollRequired: false
                },
                {
                    id: 'religiousCompromise',
                    label: 'Legislative Compromise',
                    description: 'House spends 1 action',
                    roles: ['house'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },

        // --- SECURITY (45-50) ---
        {
            id: 'domesticTerrorism',
            name: 'Domestic Terrorism',
            category: 'Security',
            severity: 3,
            flavor: 'A domestic terrorist attack has struck. The nation is in shock.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -3, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -3,
                houseShift: { chaos: 45 },
                justiceEffect: { switchPartisanship: 1 }
            },
            resolutions: [
                {
                    id: 'counterterrorism',
                    label: 'Counterterrorism Response',
                    description: 'President spends 2 actions',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 2, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 4 } },
                    rollRequired: true,
                    rollThreshold: 8,
                    rollBonus: 0
                },
                {
                    id: 'securityLegislation',
                    label: 'Security Legislation',
                    description: 'House and Senate each spend 1 action + 1 PC',
                    roles: ['house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'civilLibertiesRuling',
                    label: 'Civil Liberties Ruling',
                    description: 'Supreme Court spends 1 action + 2 JP',
                    roles: ['supremeCourt'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 2 },
                    reward: { stability: 1, vp: { supremeCourt: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: [
                {
                    id: 'declareEmergency',
                    label: 'Declare State of Emergency',
                    description: 'President extends deadline by 1 round',
                    role: 'president',
                    cost: { actions: 0 },
                    effect: { extendDeadline: 1, popularity: -1 },
                    usesRemaining: 1
                }
            ]
        },
        {
            id: 'dataBreach',
            name: 'Government Data Breach',
            category: 'Security',
            severity: 2,
            flavor: 'Millions of government records have been stolen in a massive data breach.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -2,
                vp: { president: -1, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -1,
                other: null
            },
            resolutions: [
                {
                    id: 'cyberSecurityOverhaul',
                    label: 'Cybersecurity Overhaul',
                    description: 'President and Senate each spend 1 action',
                    roles: ['president', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'dataPrivacyBill',
                    label: 'Data Privacy Bill',
                    description: 'House spends 1 action + 1 PC',
                    roles: ['house'],
                    cooperative: false,
                    cost: { actions: 1, pc: 1, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 1, vp: { house: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        },
        {
            id: 'nuclearPlantEmergency',
            name: 'Nuclear Plant Emergency',
            category: 'Security',
            severity: 3,
            flavor: 'A nuclear power plant is experiencing a meltdown. Evacuation is underway.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -4,
                vp: { president: -3, house: -1, senate: -1, supremeCourt: 0, all: 0 },
                popularity: -3,
                houseShift: { chaos: 60 },
                senateShift: { chaos: 18 },
                justiceEffect: { resign: true }
            },
            resolutions: [
                {
                    id: 'nuclearResponse',
                    label: 'Federal Emergency Response',
                    description: 'President spends 2 actions + 2 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 2, pc: 0, vp: 0, popularity: 2, jp: 0 },
                    reward: { stability: 3, vp: { president: 5 } },
                    rollRequired: false
                },
                {
                    id: 'nuclearEvacuation',
                    label: 'Mass Evacuation Order',
                    description: 'President and House each spend 1 action',
                    roles: ['president', 'house'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 2, house: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                }
            ],
            specialActions: [
                {
                    id: 'deployNationalGuard',
                    label: 'Deploy National Guard',
                    description: 'President extends deadline by 1 round, -1 popularity',
                    role: 'president',
                    cost: { actions: 0 },
                    effect: { extendDeadline: 1, popularity: -1 },
                    usesRemaining: 1
                }
            ]
        },
        {
            id: 'electionInterference',
            name: 'Election Interference',
            category: 'Security',
            severity: 3,
            flavor: 'Foreign powers have been caught interfering in upcoming elections.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -2, house: -1, senate: -1, supremeCourt: -1, all: 0 },
                popularity: -2,
                houseShift: { chaos: 53 },
                senateShift: { chaos: 18 },
                justiceEffect: { switchPartisanship: 2 },
                presidentLosesElection: true
            },
            resolutions: [
                {
                    id: 'electionSecurity',
                    label: 'Election Security Package',
                    description: 'All four branches spend 1 action each',
                    roles: ['president', 'house', 'senate', 'supremeCourt'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { all: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'sanctionAttackers',
                    label: 'Sanction Attackers',
                    description: 'President and Senate each spend 1 action',
                    roles: ['president', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { president: 2, senate: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                }
            ],
            specialActions: []
        },
        {
            id: 'assassinationAttempt',
            name: 'Assassination Attempt',
            category: 'Security',
            severity: 3,
            flavor: 'An assassination attempt on the President has shaken the nation.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -3,
                vp: { president: -3, house: 0, senate: 0, supremeCourt: 0, all: -1 },
                popularity: -3,
                houseShift: { chaos: 30 },
                senateShift: { chaos: 12 },
                presidentLosesElection: true
            },
            resolutions: [
                {
                    id: 'unityResponse',
                    label: 'Unity Response',
                    description: 'All four branches spend 1 action each',
                    roles: ['president', 'house', 'senate', 'supremeCourt'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { all: 2 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'securityCrackdown',
                    label: 'Security Crackdown',
                    description: 'President spends 1 action + 2 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 2, jp: 0 },
                    reward: { stability: 2, vp: { president: 3 } },
                    rollRequired: false
                }
            ],
            specialActions: [
                {
                    id: 'rallyCry',
                    label: 'Rally the Nation',
                    description: '+1 roll bonus to all event resolutions',
                    role: 'president',
                    cost: { actions: 0 },
                    effect: { rollBonus: 2, popularity: -1 },
                    usesRemaining: 1
                }
            ]
        },
        {
            id: 'pandemicResponseFailure',
            name: 'Pandemic Response Failure',
            category: 'Security',
            severity: 3,
            flavor: 'The government\'s pandemic response has failed. Cases are surging out of control.',
            deadline: 2,
            triggerCondition: null,
            failPenalty: {
                stability: -4,
                vp: { president: -3, house: -2, senate: -2, supremeCourt: 0, all: 0 },
                popularity: -4,
                houseShift: { chaos: 68 },
                senateShift: { chaos: 23 },
                justiceEffect: { resign: true },
                presidentLosesElection: true
            },
            resolutions: [
                {
                    id: 'pandemicOverhaul',
                    label: 'Pandemic Response Overhaul',
                    description: 'President, House, and Senate each spend 1 action',
                    roles: ['president', 'house', 'senate'],
                    cooperative: true,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 3, vp: { president: 3, house: 3, senate: 3 } },
                    rollRequired: false,
                    rollThreshold: 0,
                    rollBonus: 0,
                    agreedRoles: []
                },
                {
                    id: 'emergencyFunding',
                    label: 'Emergency Funding',
                    description: 'House spends 2 actions + 2 PC',
                    roles: ['house'],
                    cooperative: false,
                    cost: { actions: 2, pc: 2, vp: 0, popularity: 0, jp: 0 },
                    reward: { stability: 2, vp: { house: 4 } },
                    rollRequired: false
                },
                {
                    id: 'presidentialAddress',
                    label: 'Presidential Address',
                    description: 'President spends 1 action + 3 popularity',
                    roles: ['president'],
                    cooperative: false,
                    cost: { actions: 1, pc: 0, vp: 0, popularity: 3, jp: 0 },
                    reward: { stability: 1, vp: { president: 2 } },
                    rollRequired: false
                }
            ],
            specialActions: []
        }
    ];

    // ========== EVENT SYSTEM FUNCTIONS ==========

    function getRandomEvent(state) {
        // Filter eligible events
        var recentHistory = state.eventHistory.slice(-3);
        var eligible = [];
        for (var i = 0; i < EVENT_POOL.length; i++) {
            var evt = EVENT_POOL[i];
            // Skip if in recent history
            if (recentHistory.indexOf(evt.id) !== -1) continue;
            // Skip if active or queued
            if (state.activeEvent && state.activeEvent.id === evt.id) continue;
            if (state.queuedEvent && state.queuedEvent.id === evt.id) continue;
            // Check trigger condition
            if (evt.triggerCondition && !evt.triggerCondition(state)) continue;
            eligible.push(evt);
        }

        if (eligible.length === 0) return null;

        // Weight by severity based on current stability
        // Low stability = favor higher severity events
        var weights = [];
        var totalWeight = 0;
        for (var j = 0; j < eligible.length; j++) {
            var w;
            var sev = eligible[j].severity;
            if (state.stability <= 3) {
                // Crisis: favor severe events
                w = sev === 3 ? 4 : (sev === 2 ? 2 : 1);
            } else if (state.stability <= 6) {
                // Normal: balanced
                w = sev === 3 ? 2 : (sev === 2 ? 3 : 2);
            } else {
                // Prosperous: favor minor events
                w = sev === 3 ? 1 : (sev === 2 ? 2 : 4);
            }
            weights.push(w);
            totalWeight += w;
        }

        var roll = Math.random() * totalWeight;
        var cumulative = 0;
        for (var k = 0; k < eligible.length; k++) {
            cumulative += weights[k];
            if (roll < cumulative) {
                // Deep copy the event
                return JSON.parse(JSON.stringify(eligible[k]));
            }
        }

        return JSON.parse(JSON.stringify(eligible[eligible.length - 1]));
    }

    function checkEventTrigger(state) {
        // First event always on round 2
        if (state.round === 2 && !state.activeEvent && state.eventHistory.length === 0) {
            return getRandomEvent(state);
        }

        // Don't trigger on round 1
        if (state.round <= 1) return null;

        // Cooldown check
        if (state.eventCooldown > 0) {
            state.eventCooldown--;
            return null;
        }

        var chance;
        if (!state.activeEvent) {
            chance = 0.40; // 40% if no active event
        } else if (!state.queuedEvent) {
            chance = 0.15; // 15% if one active (for queue)
        } else {
            return null; // Both slots full
        }

        if (Math.random() < chance) {
            return getRandomEvent(state);
        }

        return null;
    }

    function canResolve(resolution, role, state) {
        // Check if this role is eligible
        if (resolution.roles.indexOf(role) === -1) return false;

        var rs = state[role];

        // For cooperative: check if already committed
        if (resolution.cooperative && resolution.agreedRoles.indexOf(role) !== -1) {
            return false;
        }

        // Check action cost
        if (resolution.cost.actions > 0 && rs.actionsRemaining < resolution.cost.actions) return false;

        // Check PC cost
        if (resolution.cost.pc > 0 && (rs.pc === undefined || rs.pc < resolution.cost.pc)) return false;

        // Check popularity cost (president only)
        if (resolution.cost.popularity > 0) {
            if (role === 'president' && state.president.popularity < resolution.cost.popularity) return false;
        }

        // Check JP cost (supreme court only)
        if (resolution.cost.jp > 0) {
            if (role === 'supremeCourt' && state.supremeCourt.jp < resolution.cost.jp) return false;
        }

        // Check VP cost
        if (resolution.cost.vp > 0 && rs.vp < resolution.cost.vp) return false;

        return true;
    }

    function resolveEvent(resolution, role, state) {
        if (!canResolve(resolution, role, state)) {
            return { success: false, message: 'Cannot resolve: insufficient resources.', resolved: false };
        }

        var rs = state[role];

        // For cooperative resolutions
        if (resolution.cooperative) {
            // Deduct costs for this role
            if (resolution.cost.actions > 0) {
                // Deduct extra actions beyond the 1 that advanceTurn handles
                rs.actionsRemaining -= (resolution.cost.actions - 1);
            }
            if (resolution.cost.pc > 0) rs.pc -= resolution.cost.pc;
            if (resolution.cost.popularity > 0 && role === 'president') {
                state.president.popularity = Math.max(1, state.president.popularity - resolution.cost.popularity);
            }
            if (resolution.cost.jp > 0 && role === 'supremeCourt') {
                state.supremeCourt.jp -= resolution.cost.jp;
            }
            if (resolution.cost.vp > 0) rs.vp -= resolution.cost.vp;

            // Add role to agreed
            if (resolution.agreedRoles.indexOf(role) === -1) {
                resolution.agreedRoles.push(role);
            }

            // Check if all roles have committed
            var allCommitted = true;
            for (var i = 0; i < resolution.roles.length; i++) {
                if (resolution.agreedRoles.indexOf(resolution.roles[i]) === -1) {
                    allCommitted = false;
                    break;
                }
            }

            if (allCommitted) {
                // Apply rewards
                applyRewards(resolution.reward, state);
                return { success: true, message: 'All parties committed! ' + resolution.label + ' enacted.', resolved: true };
            } else {
                var remaining = [];
                for (var r = 0; r < resolution.roles.length; r++) {
                    if (resolution.agreedRoles.indexOf(resolution.roles[r]) === -1) {
                        remaining.push(resolution.roles[r]);
                    }
                }
                return { success: true, message: role + ' committed to ' + resolution.label + '. Waiting for: ' + remaining.join(', '), resolved: false };
            }
        }

        // Non-cooperative resolution
        // Deduct costs
        if (resolution.cost.actions > 0) {
            rs.actionsRemaining -= (resolution.cost.actions - 1);
        }
        if (resolution.cost.pc > 0) rs.pc -= resolution.cost.pc;
        if (resolution.cost.popularity > 0 && role === 'president') {
            state.president.popularity = Math.max(1, state.president.popularity - resolution.cost.popularity);
        }
        if (resolution.cost.jp > 0 && role === 'supremeCourt') {
            state.supremeCourt.jp -= resolution.cost.jp;
        }
        if (resolution.cost.vp > 0) rs.vp -= resolution.cost.vp;

        // Roll if required
        if (resolution.rollRequired) {
            var roll = Math.floor(Math.random() * 20) + 1;
            var bonus = (resolution.rollBonus || 0) + (state.activeEvent && state.activeEvent.rollBonus ? state.activeEvent.rollBonus : 0);
            var total = roll + bonus;
            if (total < resolution.rollThreshold) {
                return { success: true, message: 'Rolled ' + roll + (bonus ? '+' + bonus : '') + ' = ' + total + ' (needed ' + resolution.rollThreshold + '). Failed!', resolved: false };
            }
        }

        // Apply rewards
        applyRewards(resolution.reward, state);
        return { success: true, message: resolution.label + ' enacted successfully!', resolved: true };
    }

    function applyRewards(reward, state) {
        // Apply stability
        if (reward.stability) {
            state.stability = Math.min(state.stabilityMax, Math.max(0, state.stability + reward.stability));
        }

        // Apply VP rewards
        if (reward.vp) {
            var roles = ['president', 'house', 'senate', 'supremeCourt'];
            // Apply "all" first
            if (reward.vp.all) {
                for (var a = 0; a < roles.length; a++) {
                    state[roles[a]].vp += reward.vp.all;
                }
            }
            // Apply individual role VP
            for (var v = 0; v < roles.length; v++) {
                if (reward.vp[roles[v]]) {
                    state[roles[v]].vp += reward.vp[roles[v]];
                }
            }
        }
    }

    function applyFailure(event, state) {
        var penalty = event.failPenalty;
        if (!penalty) return;

        // Apply stability penalty
        if (penalty.stability) {
            state.stability = Math.max(0, state.stability + penalty.stability);
        }

        // Apply VP penalties
        if (penalty.vp) {
            var roles = ['president', 'house', 'senate', 'supremeCourt'];
            if (penalty.vp.all) {
                for (var a = 0; a < roles.length; a++) {
                    state[roles[a]].vp += penalty.vp.all;
                }
            }
            for (var v = 0; v < roles.length; v++) {
                if (penalty.vp[roles[v]]) {
                    state[roles[v]].vp += penalty.vp[roles[v]];
                }
            }
        }

        // Apply popularity penalty
        if (penalty.popularity) {
            state.president.popularity = Math.max(1, Math.min(20, state.president.popularity + penalty.popularity));
        }

        // Drastic House composition shift
        if (penalty.houseShift) {
            var hs = penalty.houseShift;
            if (state.house && state.house.composition) {
                // Shift seats between factions
                if (hs.fromFaction && hs.toFaction && hs.amount) {
                    var from = state.house.composition[hs.fromFaction] || 0;
                    var shift = Math.min(from, hs.amount);
                    state.house.composition[hs.fromFaction] -= shift;
                    state.house.composition[hs.toFaction] = (state.house.composition[hs.toFaction] || 0) + shift;
                }
                // Shift seats from majority to minority faction
                if (hs.chaos) {
                    var hFactions = Object.keys(state.house.composition);
                    var majorityIdx = 0;
                    var minorityIdx = 0;
                    for (var hi = 1; hi < hFactions.length; hi++) {
                        if ((state.house.composition[hFactions[hi]] || 0) > (state.house.composition[hFactions[majorityIdx]] || 0)) majorityIdx = hi;
                        if ((state.house.composition[hFactions[hi]] || 0) < (state.house.composition[hFactions[minorityIdx]] || 0)) minorityIdx = hi;
                    }
                    if (majorityIdx === minorityIdx) minorityIdx = (majorityIdx + 1) % hFactions.length;
                    var chaosAmt = Math.min(state.house.composition[hFactions[majorityIdx]] || 0, hs.chaos);
                    state.house.composition[hFactions[majorityIdx]] -= chaosAmt;
                    state.house.composition[hFactions[minorityIdx]] = (state.house.composition[hFactions[minorityIdx]] || 0) + chaosAmt;
                }
            }
        }

        // Drastic Senate composition shift
        if (penalty.senateShift) {
            var ss = penalty.senateShift;
            if (state.senate && state.senate.composition) {
                if (ss.fromFaction && ss.toFaction && ss.amount) {
                    var sfrom = state.senate.composition[ss.fromFaction] || 0;
                    var sshift = Math.min(sfrom, ss.amount);
                    state.senate.composition[ss.fromFaction] -= sshift;
                    state.senate.composition[ss.toFaction] = (state.senate.composition[ss.toFaction] || 0) + sshift;
                }
                // Shift seats from majority to minority faction
                if (ss.chaos) {
                    var sFactions = Object.keys(state.senate.composition);
                    var sMajIdx = 0;
                    var sMinIdx = 0;
                    for (var si = 1; si < sFactions.length; si++) {
                        if ((state.senate.composition[sFactions[si]] || 0) > (state.senate.composition[sFactions[sMajIdx]] || 0)) sMajIdx = si;
                        if ((state.senate.composition[sFactions[si]] || 0) < (state.senate.composition[sFactions[sMinIdx]] || 0)) sMinIdx = si;
                    }
                    if (sMajIdx === sMinIdx) sMinIdx = (sMajIdx + 1) % sFactions.length;
                    var sChaosAmt = Math.min(state.senate.composition[sFactions[sMajIdx]] || 0, ss.chaos);
                    state.senate.composition[sFactions[sMajIdx]] -= sChaosAmt;
                    state.senate.composition[sFactions[sMinIdx]] = (state.senate.composition[sFactions[sMinIdx]] || 0) + sChaosAmt;
                }
            }
        }

        // Justice effects (resignation or partisanship switch)
        if (penalty.justiceEffect && state.supremeCourt && state.supremeCourt.justices) {
            var justices = state.supremeCourt.justices;
            var je = penalty.justiceEffect;

            if (je.resign && justices.length > 0) {
                // Remove a random justice
                var resignIdx = Math.floor(Math.random() * justices.length);
                var resigned = justices.splice(resignIdx, 1)[0];
                // Log will be handled by engine
            }

            if (je.switchPartisanship && je.switchPartisanship > 0) {
                // Switch 1-2 justices' leanings
                var switchCount = Math.min(je.switchPartisanship, justices.length);
                var leanings = ['liberal', 'moderate', 'conservative'];
                for (var si = 0; si < switchCount; si++) {
                    var switchIdx = Math.floor(Math.random() * justices.length);
                    var current = justices[switchIdx].leaning;
                    var currentIdx = leanings.indexOf(current);
                    // Move one step toward opposite
                    if (currentIdx === 0) justices[switchIdx].leaning = 'moderate';
                    else if (currentIdx === 2) justices[switchIdx].leaning = 'moderate';
                    else justices[switchIdx].leaning = Math.random() < 0.5 ? 'liberal' : 'conservative';
                }
            }
        }

        // President automatically loses next election
        if (penalty.presidentLosesElection) {
            state.presidentLosesNextElection = true;
        }
    }

    function getAvailableEventActions(role, state) {
        var actions = [];
        if (!state.activeEvent || state.activeEvent.resolved) return actions;

        var evt = state.activeEvent;

        // Resolution options
        for (var i = 0; i < evt.resolutions.length; i++) {
            var res = evt.resolutions[i];
            if (res.roles.indexOf(role) === -1) continue;

            if (res.cooperative) {
                // Check if already committed
                if (res.agreedRoles && res.agreedRoles.indexOf(role) !== -1) {
                    // Already committed — show waiting status but don't add action
                    continue;
                }
                if (canResolve(res, role, state)) {
                    actions.push({
                        id: 'resolveEvent',
                        label: 'Commit: ' + res.label,
                        cost: res.cost.actions,
                        description: res.description,
                        params: { resolutionId: res.id }
                    });
                }
            } else {
                if (canResolve(res, role, state)) {
                    actions.push({
                        id: 'resolveEvent',
                        label: res.label,
                        cost: res.cost.actions,
                        description: res.description,
                        params: { resolutionId: res.id }
                    });
                }
            }
        }

        // Special actions
        var specs = evt.specialActions || [];
        for (var s = 0; s < specs.length; s++) {
            var spec = specs[s];
            if (spec.usesRemaining <= 0) continue;
            if (spec.role !== role && spec.role !== 'any') continue;
            actions.push({
                id: 'eventSpecialAction',
                label: spec.label,
                cost: spec.cost.actions || 0,
                description: spec.description,
                params: { specialActionId: spec.id }
            });
        }

        return actions;
    }

    return {
        EVENT_POOL: EVENT_POOL,
        getRandomEvent: getRandomEvent,
        checkEventTrigger: checkEventTrigger,
        canResolve: canResolve,
        resolveEvent: resolveEvent,
        applyFailure: applyFailure,
        getAvailableEventActions: getAvailableEventActions
    };
})();

if (typeof module !== 'undefined') module.exports = GameEvents;
