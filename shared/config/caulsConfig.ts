// ─── CaulCo Inc. Client Configuration ────────────────────────────────────────
// This file contains ALL client-specific constants.
// New clients = new config file. Nothing else changes.

export const CLIENT_CONFIG = {
  clientName: 'CaulCo Inc.',
  clientSlug: 'cauls',
  ownerName: 'Adam DeCaul',
  consultantName: 'Tanya Easterling',
  firmName: 'Tanya Easterling Consulting',
  schedulingLink: 'https://TanyaEasterlingConsulting.17hats.com/p#/scheduling/vvnfcfhchfzfgbtndzntsrcsptzxbtrf',
  locations: ['Container Park', 'Lance Aux Epines', 'Warehouse'],
  currency: 'XCD',
  currencySymbol: 'EC$',
  fiscalYearStart: 'January',

  profitFirstTargets: {
    'Payables':     { target: 75, note: 'Foreign + Local suppliers' },
    'VAT':          { target: 4,  note: 'Take from Vend sales report' },
    'StampTax':     { target: 0.8 },
    'RealRevenue':  { target: 18, note: 'Net after all obligations' },
    'DebtPaydown':  { target: 8,  note: 'Of real revenue' },
    'CapEx':        { target: 5,  note: 'Asset upgrade debt not yet modeled' },
    'Compensation': { target: 20, note: 'Of real revenue' },
    'Operating':    { target: 15, note: 'Of real revenue' },
    'Payroll':      { target: 30, note: 'Of real revenue' },
    'Rent':         { target: 20, note: 'Currently 15% — correction required' },
    'Taxes':        { target: 3 },
    'Vault':        { target: 1 },
    'Profit':       { target: 1 },
    'Marketing':    { target: 1.5 },
    'Charity':      { target: 0.5 },
  } as Record<string, { target: number; note?: string }>,

  engagementFlags: [
    'VAT-at-port misallocation — VAT paid on imports being coded to wrong bucket',
    'Rent bucket at 15% — target is 20% — correction required in redesign',
    'Payables bucket running negative — root cause: timing gap between PF allocation and supplier payments',
    'Asset upgrade debt service not modeled in CapEx bucket',
    'SGU enrollment sensitivity — model 15% revenue reduction scenario',
    'Blenda Ba AR — $15,610 in 91+ days — collections action required',
    'VAT Suspense account $30,011 — forensic trace required',
    'Stamp Tax provision $57,383 vs $16,528 allocated — $30,855 shortfall',
  ],

  ratioThresholds: {
    gmroi:              { healthy: 2.0, warning: 1.5 },
    arDays:             { healthy: 14,  warning: 30 },
    apDays:             { healthy: 45,  warning: 60 },
    grossMargin:        { healthy: 0.25, warning: 0.20 },
    inventoryTurnover:  { healthy: 6,   warning: 4 },
    currentRatio:       { healthy: 2.0, warning: 1.2 },
    debtToEquity:       { healthy: 1.0, warning: 2.0 },
    netMargin:          { healthy: 0.10, warning: 0.05 },
  },

  rolePermissions: {
    admin:      { upload: true,  download: true,  stressTest: true,  viewAlerts: true,  manageUsers: true  },
    owner:      { upload: false, download: true,  stressTest: true,  viewAlerts: true,  manageUsers: false },
    bookkeeper: { upload: true,  download: false, stressTest: false, viewAlerts: true,  manageUsers: false },
    accountant: { upload: false, download: true,  stressTest: false, viewAlerts: true,  manageUsers: false },
  } as Record<string, { upload: boolean; download: boolean; stressTest: boolean; viewAlerts: boolean; manageUsers: boolean }>,
};

export type ClientConfig = typeof CLIENT_CONFIG;
export type TecRole = 'admin' | 'owner' | 'bookkeeper' | 'accountant';
