import { create } from "zustand";
import type {
  BalanceSheetData,
  ProfitLossData,
  ARAgingData,
  APAgingData,
  VATDetailData,
  VATSummaryData,
  ProfitFirstData,
  SalesByProductData,
  CashFlowsData,
  BankStatementData,
  UploadedFile,
  ReportType,
} from "../../../shared/types/reports";
import type { Alert } from "../../../shared/types/alerts";

// PLByMonth, PLComparison, SupplierBalance use generic parsed shapes
// until dedicated type interfaces are added to shared/types/reports.ts
type PLByMonthData = { columns: string[]; rows: Record<string, unknown>[] };
type PLComparisonData = { columns: string[]; rows: Record<string, unknown>[] };
type SupplierBalanceData = { rows: Record<string, unknown>[]; total: number };

interface ReportStore {
  uploadedFiles: UploadedFile[];

  // Core report slots
  balanceSheet: BalanceSheetData | null;
  profitLoss: ProfitLossData | null;
  arAging: ARAgingData | null;
  apAging: APAgingData | null;
  vatDetail: VATDetailData | null;
  vatSummary: VATSummaryData | null;
  profitFirst: ProfitFirstData | null;
  salesByProduct: SalesByProductData | null;
  cashFlows: CashFlowsData | null;
  bankStatement: BankStatementData | null;

  // Previously orphaned — now wired
  plByMonth: PLByMonthData | null;
  plComparison: PLComparisonData | null;
  supplierBalance: SupplierBalanceData | null;

  alerts: Alert[];
  duplicateBanner: { reportType: ReportType; oldFilename: string } | null;

  // Actions
  setReport: (type: ReportType, data: unknown, file: UploadedFile) => void;
  removeReport: (type: ReportType) => void;
  setAlerts: (alerts: Alert[]) => void;
  resolveAlert: (id: string) => void;
  clearDuplicateBanner: () => void;
  clearAll: () => void;
}

export const useReportStore = create<ReportStore>((set, get) => ({
  uploadedFiles: [],
  balanceSheet: null,
  profitLoss: null,
  arAging: null,
  apAging: null,
  vatDetail: null,
  vatSummary: null,
  profitFirst: null,
  salesByProduct: null,
  cashFlows: null,
  bankStatement: null,
  plByMonth: null,
  plComparison: null,
  supplierBalance: null,
  alerts: [],
  duplicateBanner: null,

  setReport: (type, data, file) => {
    const existing = get().uploadedFiles.find(f => f.reportType === type);

    set(state => {
      const newFiles = existing
        ? state.uploadedFiles.map(f => f.reportType === type ? file : f)
        : [...state.uploadedFiles, file];

      const reportKey = getReportKey(type);
      return {
        uploadedFiles: newFiles,
        ...(reportKey ? { [reportKey]: data } : {}),
        duplicateBanner: existing
          ? { reportType: type, oldFilename: existing.filename }
          : null,
      };
    });

    if (existing) {
      setTimeout(() => {
        set(state =>
          state.duplicateBanner?.reportType === type ? { duplicateBanner: null } : {}
        );
      }, 5000);
    }
  },

  removeReport: (type) => {
    const reportKey = getReportKey(type);
    set(state => ({
      uploadedFiles: state.uploadedFiles.filter(f => f.reportType !== type),
      ...(reportKey ? { [reportKey]: null } : {}),
    }));
  },

  setAlerts: (alerts) => set({ alerts }),

  resolveAlert: (id) =>
    set(state => ({
      alerts: state.alerts.map(a => a.id === id ? { ...a, resolved: true } : a),
    })),

  clearDuplicateBanner: () => set({ duplicateBanner: null }),

  clearAll: () =>
    set({
      uploadedFiles: [],
      balanceSheet: null,
      profitLoss: null,
      arAging: null,
      apAging: null,
      vatDetail: null,
      vatSummary: null,
      profitFirst: null,
      salesByProduct: null,
      cashFlows: null,
      bankStatement: null,
      plByMonth: null,
      plComparison: null,
      supplierBalance: null,
      alerts: [],
      duplicateBanner: null,
    }),
}));

function getReportKey(type: ReportType): keyof ReportStore | null {
  const map: Partial<Record<ReportType, keyof ReportStore>> = {
    BalanceSheet:    'balanceSheet',
    ProfitLoss:      'profitLoss',
    ARaging:         'arAging',
    APaging:         'apAging',
    VATDetail:       'vatDetail',
    VATSummary:      'vatSummary',
    ProfitFirst:     'profitFirst',
    SalesByProduct:  'salesByProduct',
    CashFlows:       'cashFlows',
    BankStatement:   'bankStatement',
    PLByMonth:       'plByMonth',
    PLComparison:    'plComparison',
    SupplierBalance: 'supplierBalance',
  };
  return map[type] ?? null;
}
