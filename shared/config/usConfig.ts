// ─── US Client Configuration Template ────────────────────────────────────────
// Copy this file per engagement and fill in the placeholders.
// Do not edit caulsConfig.ts — it remains active for the CaulCo deployment.

export const CLIENT_CONFIG = {
  clientName: 'The Brunch Spot',
  clientSlug: 'brunch-spot',
  ownerName: '[OWNER_NAME]',
  consultantName: 'Tanya Easterling',
  firmName: 'Tanya Easterling Consulting',
  schedulingLink: 'https://TanyaEasterlingConsulting.17hats.com/p#/scheduling/vvnfcfhchfzfgbtndzntsrcsptzxbtrf',
  locations: ['Main Location'],
  currency: 'USD',
  currencySymbol: '$',
  taxLabel: 'Sales Tax',
  taxRate: 'Varies by state',
  fiscalYearStart: 'January',

  foreignOrdersActive: false,
  vatEnabled: false,

  clientProfile: 'retail' as 'retail' | 'medical' | 'nil-athlete',

  // US Profit First standard Michalowicz entry targets (decimal fractions)
  profitFirstTargets: {
    Profit: 0.05,
    OwnerPay: 0.50,
    Tax: 0.15,
    OperatingExpenses: 0.30,
    DebtService: 0,
  } as Record<string, number>,

  engagementFlags: [] as string[],

  ratioThresholds: {
    grossMargin:       { healthy: 0.30, warning: 0.20 },
    netMargin:         { healthy: 0.10, warning: 0.05 },
    currentRatio:      { healthy: 2.0,  warning: 1.2  },
    debtToEquity:      { healthy: 1.0,  warning: 2.0  },
    arDays:            { healthy: 30,   warning: 45   },
    apDays:            { healthy: 45,   warning: 60   },
    gmroi:             { healthy: 2.0,  warning: 1.5  },
    inventoryTurnover: { healthy: 6,    warning: 4    },
  },

  rolePermissions: {
    admin:      { upload: true,  download: true,  stressTest: true,  viewAlerts: true,  manageUsers: true  },
    owner:      { upload: false, download: true,  stressTest: true,  viewAlerts: true,  manageUsers: false },
    bookkeeper: { upload: true,  download: false, stressTest: false, viewAlerts: true,  manageUsers: false },
    accountant: { upload: false, download: true,  stressTest: false, viewAlerts: true,  manageUsers: false },
  } as Record<string, { upload: boolean; download: boolean; stressTest: boolean; viewAlerts: boolean; manageUsers: boolean }>,

  tierTabs: {
    delivery: [
      'overview',
      'cash',
      'profit-first',
      'alerts',
      'reports',
      'settings',
    ],
    retainer: [
      'overview',
      'cash',
      'profit-first',
      'ar-aging',
      'ap-aging',
      'sales-tax',
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
