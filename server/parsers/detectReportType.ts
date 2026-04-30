import type { ReportType } from "../../shared/types/reports";

interface DetectionResult {
  reportType: ReportType;
  confidence: 'high' | 'medium' | 'low';
}

// ─── Filename-based detection patterns ───────────────────────────────────────
const FILENAME_PATTERNS: Array<{ pattern: RegExp; type: ReportType }> = [
  { pattern: /balance.?sheet/i,           type: 'BalanceSheet' },
  // ProfitFirst MUST come before ProfitLoss to avoid misclassification
  { pattern: /profit.?first|pf.?alloc|pf.?week|weekly.?pf/i, type: 'ProfitFirst' },
  { pattern: /profit.?(and|&|loss)|p&l|p_l|income.?statement/i, type: 'ProfitLoss' },
  { pattern: /a[_\-\s]?r.?aging|accounts.?receivable.?aging/i, type: 'ARaging' },
  { pattern: /a[_\-\s]?p.?aging|accounts.?payable.?aging/i,   type: 'APaging' },
  { pattern: /vat.?detail|tax.?detail/i,  type: 'VATDetail' },
  { pattern: /vat.?summary|tax.?summary/i, type: 'VATSummary' },
  { pattern: /sales.?by.?product|product.?sales/i, type: 'SalesByProduct' },
  { pattern: /p[&_]?l.?by.?month|monthly.?p[&_]?l/i, type: 'PLByMonth' },
  { pattern: /p[&_]?l.?comparison|comparison/i, type: 'PLComparison' },
  { pattern: /supplier.?balance|vendor.?balance/i, type: 'SupplierBalance' },
  { pattern: /bank.?statement|statement.?of.?account/i, type: 'BankStatement' },
  { pattern: /cost.?in|cost.?form/i,      type: 'CostInForm' },
  { pattern: /cash.?flow/i,               type: 'CashFlows' },
  { pattern: /pf.?allocation|weekly.?pf|pf.?week/i, type: 'ProfitFirst' },
];

// ─── Content-based detection patterns ────────────────────────────────────────
const CONTENT_PATTERNS: Array<{ pattern: RegExp; type: ReportType; weight: number }> = [
  { pattern: /total assets|total liabilities|shareholders.? equity/i, type: 'BalanceSheet', weight: 3 },
  { pattern: /gross profit|net income|cost of goods sold/i,           type: 'ProfitLoss',   weight: 3 },
  { pattern: /accounts receivable aging|a\/r aging/i,                 type: 'ARaging',      weight: 3 },
  { pattern: /accounts payable aging|a\/p aging/i,                    type: 'APaging',      weight: 3 },
  { pattern: /vat detail|tax code|taxable amount/i,                   type: 'VATDetail',    weight: 3 },
  { pattern: /vat summary|output tax|input tax/i,                     type: 'VATSummary',   weight: 3 },
  { pattern: /payables.*bucket|vat.*bucket|profit.*bucket/i,          type: 'ProfitFirst',  weight: 3 },
  { pattern: /sales by product|product.*qty.*amount/i,                type: 'SalesByProduct', weight: 3 },
  { pattern: /cash flows from operating|investing activities/i,       type: 'CashFlows',    weight: 3 },
  { pattern: /91\+ days|over 90|91-120/i,                             type: 'ARaging',      weight: 2 },
  { pattern: /current.*1-30.*31-60.*61-90/i,                          type: 'ARaging',      weight: 2 },
  { pattern: /opening balance|closing balance|debit.*credit.*balance/i, type: 'BankStatement', weight: 2 },
];

export function detectReportType(filename: string, content?: string): DetectionResult {
  const normalizedFilename = filename.toLowerCase();

  // Try filename patterns first (high confidence)
  for (const { pattern, type } of FILENAME_PATTERNS) {
    if (pattern.test(normalizedFilename)) {
      return { reportType: type, confidence: 'high' };
    }
  }

  // Try content patterns if content is provided
  if (content) {
    const scores: Partial<Record<ReportType, number>> = {};
    for (const { pattern, type, weight } of CONTENT_PATTERNS) {
      if (pattern.test(content)) {
        scores[type] = (scores[type] ?? 0) + weight;
      }
    }

    const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
    if (best && best[1] >= 3) {
      return {
        reportType: best[0] as ReportType,
        confidence: best[1] >= 6 ? 'high' : 'medium',
      };
    }
  }

  return { reportType: 'Unknown', confidence: 'low' };
}
