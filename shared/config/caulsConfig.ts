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

  // Does this client have active foreign import orders?
  // Controls whether the "VAT at Port near zero" CRITICAL alert fires.
  foreignOrdersActive: true,

  // Does this client operate in a VAT jurisdiction?
  // Set false for US clients, NIL athletes, and most domestic TEC clients.
  vatEnabled: true,

  // Client profile controls which tab set and parser suite is active.
  // 'retail'    = QBO grocery/retail (CaulCo model)
  // 'medical'   = RCM/claims-based (AAU Medical model)
  // 'nil-athlete' = income by deal, simplified (W3 model)
  clientProfile: 'retail' as 'retail' | 'medical' | 'nil-athlete',

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

  // ── CORRECTED engagement flags (updated May 2026) ──────────────────────────
  // Customer D resolved: KeHE Distributors (primary) + MDI — bank display issue,
  //   not a missing vendor. Wire payments now matched to supplier bills in QBO.
  // KPM and AMC are controlled intercompany balances (wife's company + Adam's
  //   sole proprietorship), not arm's-length creditors. IRD documentation risk
  //   remains — no formal intercompany agreements or repayment schedule in place.
  // GDB loan: ACB references corrected throughout — this is a Grenada Development
  //   Bank obligation. XCD 9,945/month debt service unmodeled in Profit First.
  engagementFlags: [
    'VAT-at-port misallocation — VAT paid on imports coded to wrong bucket',
    'Rent bucket at 15% — target is 20% — correction required in redesign',
    'Payables bucket running negative — timing gap between PF allocation and supplier payments',
    'GDB loan (Grenada Development Bank) XCD 9,945/month not modeled in CapEx bucket',
    'SGU enrollment sensitivity — model 15% revenue reduction scenario',
    'Blenda Ba AR — $15,610 in 91+ days — collections action required',
    'VAT Suspense account $30,011 — forensic trace required',
    'Stamp Tax provision $57,383 vs $16,528 allocated — $30,855 shortfall',
    'KPM ($587,767) and AMC ($253,958) are intercompany balances — IRD documentation risk',
    'KeHE Distributors and MDI identified as Customer D — match wires to QBO supplier bills',
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

  // ── Tier-based tab visibility ────────────────────────────────────────────────
  // 'delivery' tabs are included in the base $3,500 engagement package.
  // 'retainer' tabs unlock on upgrade. Shown with a lock icon until upgraded.
  // After 90 days on delivery tier, a soft-expiration banner appears.
  tierTabs: {
    delivery: [
      'overview',
      'cash',
      'profit-first',
      'alerts',      // rebranded as Leak Locator
      'reports',
      'settings',
    ],
    retainer: [
      'overview',
      'cash',
      'profit-first',
      'ar-aging',
      'ap-aging',
      'vat',
      'inventory',
      'real-revenue',
      'debt-service',
      'stress-test',
      'alerts',
      'reports',
      'settings',
    ],
  },
};

export type ClientConfig = typeof CLIENT_CONFIG;
export type TecRole = 'admin' | 'owner' | 'bookkeeper' | 'accountant';
export type ClientTier = 'delivery' | 'retainer';
export type ClientProfile = 'retail' | 'medical' | 'nil-athlete';
