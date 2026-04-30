// ─── Report Types ─────────────────────────────────────────────────────────────

export type ReportType =
  | 'BalanceSheet'
  | 'ProfitLoss'
  | 'ARaging'
  | 'APaging'
  | 'VATDetail'
  | 'VATSummary'
  | 'ProfitFirst'
  | 'SalesByProduct'
  | 'PLByMonth'
  | 'PLComparison'
  | 'SupplierBalance'
  | 'BankStatement'
  | 'CostInForm'
  | 'CashFlows'
  | 'Unknown';

export interface ParsedReport {
  reportType: ReportType;
  periodStart?: string;
  periodEnd?: string;
  basis?: 'Cash' | 'Accrual';
  filename: string;
  data: unknown;
  uploadedAt: string;
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────
export interface BalanceSheetData {
  asOfDate: string;
  basis: 'Cash' | 'Accrual';
  assets: {
    currentAssets: LineItem[];
    fixedAssets: LineItem[];
    otherAssets: LineItem[];
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: LineItem[];
    longTermLiabilities: LineItem[];
    totalLiabilities: number;
  };
  equity: {
    items: LineItem[];
    totalEquity: number;
  };
  pfSubAccounts?: PFSubAccount[];
  vatSuspense?: number;
  stampTaxProvision?: number;
}

export interface LineItem {
  name: string;
  amount: number;
  indent?: number;
}

export interface PFSubAccount {
  name: string;
  balance: number;
}

// ─── Profit & Loss ────────────────────────────────────────────────────────────
export interface ProfitLossData {
  periodStart: string;
  periodEnd: string;
  basis: 'Cash' | 'Accrual';
  income: LineItem[];
  totalIncome: number;
  costOfGoods: LineItem[];
  totalCOGS: number;
  grossProfit: number;
  grossMargin: number;
  expenses: LineItem[];
  totalExpenses: number;
  netIncome: number;
  netMargin: number;
}

// ─── A/R Aging ────────────────────────────────────────────────────────────────
export interface ARAgingRow {
  customer: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days91plus: number;
  total: number;
  isTotal?: boolean;
}

export interface ARAgingData {
  asOfDate: string;
  rows: ARAgingRow[];
  totals: ARAgingRow;
}

// ─── A/P Aging ────────────────────────────────────────────────────────────────
export interface APAgingRow {
  supplier: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days91plus: number;
  total: number;
  isTotal?: boolean;
}

export interface APAgingData {
  asOfDate: string;
  rows: APAgingRow[];
  totals: APAgingRow;
}

// ─── VAT ─────────────────────────────────────────────────────────────────────
export interface VATDetailRow {
  date: string;
  txnType: string;
  num: string;
  name: string;
  memo: string;
  taxCode: string;
  taxAmount: number;
  taxableAmount: number;
}

export interface VATDetailData {
  periodStart: string;
  periodEnd: string;
  rows: VATDetailRow[];
  totalVAT: number;
  suspenseBalance?: number;
}

export interface VATSummaryData {
  periodStart: string;
  periodEnd: string;
  vatCollected: number;
  vatPaid: number;
  vatAtPort: number;
  vatSuspense: number;
  netVATDue: number;
}

// ─── Profit First ─────────────────────────────────────────────────────────────
export interface PFBucketWeek {
  weekLabel: string;
  weekDate?: string;
  buckets: Record<string, number>;
  totalIncome: number;
}

export interface ProfitFirstData {
  weeks: PFBucketWeek[];
  latestWeek: PFBucketWeek;
  bucketNames: string[];
}

// ─── Sales by Product ─────────────────────────────────────────────────────────
export interface SalesByProductRow {
  product: string;
  qty: number;
  amount: number;
  percentOfTotal: number;
}

export interface SalesByProductData {
  periodStart: string;
  periodEnd: string;
  rows: SalesByProductRow[];
  totalSales: number;
}

// ─── Cash Flows ───────────────────────────────────────────────────────────────
export interface CashFlowsData {
  periodStart: string;
  periodEnd: string;
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  beginningBalance: number;
  endingBalance: number;
}

// ─── Bank Statement ───────────────────────────────────────────────────────────
export interface BankStatementRow {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface BankStatementData {
  accountName: string;
  periodStart: string;
  periodEnd: string;
  rows: BankStatementRow[];
  openingBalance: number;
  closingBalance: number;
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export interface InventoryLocationData {
  location: string;
  value: number;
  units: number;
  gmroi?: number;
  daysCover?: number;
  turnover?: number;
}

export interface InventoryData {
  asOfDate: string;
  locations: InventoryLocationData[];
  totalValue: number;
  totalUnits: number;
}

// ─── Uploaded File State ──────────────────────────────────────────────────────
export interface UploadedFile {
  id: string;
  filename: string;
  reportType: ReportType;
  uploadedAt: string;
  parsedData: unknown;
  dbId?: number;
}
