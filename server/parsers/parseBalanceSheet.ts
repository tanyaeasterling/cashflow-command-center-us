import type { BalanceSheetData, LineItem, PFSubAccount } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

const PF_BUCKET_NAMES = [
  'payables', 'vat', 'stamp tax', 'real revenue', 'debt paydown',
  'capex', 'compensation', 'operating', 'payroll', 'rent',
  'taxes', 'vault', 'profit', 'marketing', 'charity',
];

export function parseBalanceSheet(lines: string[]): BalanceSheetData {
  const result: BalanceSheetData = {
    asOfDate: '',
    basis: 'Accrual',
    assets: { currentAssets: [], fixedAssets: [], otherAssets: [], totalAssets: 0 },
    liabilities: { currentLiabilities: [], longTermLiabilities: [], totalLiabilities: 0 },
    equity: { items: [], totalEquity: 0 },
    pfSubAccounts: [],
    vatSuspense: 0,
    stampTaxProvision: 0,
  };

  let section: 'currentAssets' | 'fixedAssets' | 'otherAssets' | 'currentLiabilities' | 'longTermLiabilities' | 'equity' | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Date detection
    if (/as of|as at/i.test(line) && !result.asOfDate) {
      const match = line.match(/\b(\w+ \d+,?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4})\b/);
      if (match) result.asOfDate = match[1];
    }

    // Basis detection
    if (/cash basis/i.test(line)) result.basis = 'Cash';
    if (/accrual basis/i.test(line)) result.basis = 'Accrual';

    // Section detection
    if (/current assets/i.test(line) && !/total/i.test(line)) { section = 'currentAssets'; continue; }
    if (/fixed assets|property|equipment/i.test(line) && !/total/i.test(line)) { section = 'fixedAssets'; continue; }
    if (/other assets/i.test(line) && !/total/i.test(line)) { section = 'otherAssets'; continue; }
    if (/current liabilities/i.test(line) && !/total/i.test(line)) { section = 'currentLiabilities'; continue; }
    if (/long.?term liabilities/i.test(line) && !/total/i.test(line)) { section = 'longTermLiabilities'; continue; }
    if (/equity/i.test(line) && !/total/i.test(line)) { section = 'equity'; continue; }

    // Total rows
    if (/total assets/i.test(line)) {
      result.assets.totalAssets = extractAmount(line);
      continue;
    }
    if (/total liabilities/i.test(line) && !/equity/i.test(line)) {
      result.liabilities.totalLiabilities = extractAmount(line);
      continue;
    }
    if (/total equity/i.test(line)) {
      result.equity.totalEquity = extractAmount(line);
      continue;
    }

    // VAT Suspense
    if (/vat suspense/i.test(line)) {
      result.vatSuspense = Math.abs(extractAmount(line));
    }

    // Stamp Tax provision
    if (/stamp tax/i.test(line) && /provision|payable/i.test(line)) {
      result.stampTaxProvision = Math.abs(extractAmount(line));
    }

    // PF Sub-accounts
    const isPFBucket = PF_BUCKET_NAMES.some(b => lower.includes(b));
    if (isPFBucket && extractAmount(line) !== 0) {
      const name = line.replace(/[\d,.()\-$]+/g, '').trim();
      const balance = extractAmount(line);
      result.pfSubAccounts!.push({ name, balance });
    }

    // Line items
    if (section && extractAmount(line) !== 0) {
      const item: LineItem = {
        name: line.replace(/[\d,.()\-$]+/g, '').trim(),
        amount: extractAmount(line),
      };
      if (item.name) {
        if (section === 'currentAssets') result.assets.currentAssets.push(item);
        else if (section === 'fixedAssets') result.assets.fixedAssets.push(item);
        else if (section === 'otherAssets') result.assets.otherAssets.push(item);
        else if (section === 'currentLiabilities') result.liabilities.currentLiabilities.push(item);
        else if (section === 'longTermLiabilities') result.liabilities.longTermLiabilities.push(item);
        else if (section === 'equity') result.equity.items.push(item);
      }
    }
  }

  return result;
}

function extractAmount(line: string): number {
  const match = line.match(/[\d,]+(\.\d{2})?/g);
  if (!match) return 0;
  const lastNum = match[match.length - 1];
  const isNeg = line.includes('(') || line.startsWith('-');
  const val = parseFloat(lastNum.replace(/,/g, ''));
  return isNeg ? -val : val;
}
