import type { BalanceSheetData } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

interface RawRow { name: string; amount: number | null }

function extractRows(rows: Record<string, string>[]): RawRow[] {
  return rows.map(row => {
    const keys = Object.keys(row);
    const nameKey = keys.find(k => k !== 'Total' && k !== 'total') ?? keys[0] ?? '';
    const name = (row[nameKey] ?? '').trim();
    const rawAmount = row['Total'] ?? row['total'] ?? '';
    const amount = rawAmount.trim() ? parseQBOAmount(rawAmount) : null;
    return { name, amount };
  });
}

export function parseBalanceSheet(rows: Record<string, string>[]): BalanceSheetData {
  const raw = extractRows(rows);

  const currentAssets: { name: string; amount: number }[] = [];
  const fixedAssets: { name: string; amount: number }[] = [];
  const otherAssets: { name: string; amount: number }[] = [];
  const currentLiabilities: { name: string; amount: number }[] = [];
  const longTermLiabilities: { name: string; amount: number }[] = [];
  const equityItems: { name: string; amount: number }[] = [];

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let asOfDate = '';
  let basis: 'Cash' | 'Accrual' = 'Cash';
  let cashOnHand = 0;
  let salesTaxPayable: number | undefined;
  let ownerDraws: number | undefined;

  let section: 'current_assets' | 'fixed_assets' | 'other_assets' | 'current_liabilities' | 'longterm_liabilities' | 'equity' | 'none' = 'none';

  for (const { name, amount } of raw) {
    if (!name) continue;

    if (/^As of/i.test(name)) { asOfDate = name; continue; }
    if (/accrual/i.test(name)) { basis = 'Accrual'; continue; }
    if (/^Balance Sheet|^CaulCo|^Monday|^Tuesday|^Wednesday|^Thursday|^Friday|^Saturday|^Sunday/i.test(name)) continue;

    // Grand totals — must be checked before the generic "Total for" skip below
    if (/^Total for Assets$|^Total Assets$/i.test(name) && amount !== null) { totalAssets = amount; continue; }
    if (/^Total for Liabilities$|^Total Liabilities$/i.test(name) && amount !== null) { totalLiabilities = amount; continue; }
    if (/^Total for.+Equity$|^Total Equity$/i.test(name) && amount !== null) { totalEquity = amount; continue; }

    // Cash on hand — QBO exports "Total for Bank Accounts"; older format uses "Total for BANK"
    if (/^Total for Bank Accounts$|^Total for BANK$/i.test(name) && amount !== null) {
      cashOnHand = amount;
      continue;
    }

    // Skip all remaining "Total for X" subtotals and the outer "LIABILITIES AND EQUITY" wrapper
    if (/^Total for /i.test(name)) continue;
    if (/^LIABILITIES AND EQUITY$/i.test(name)) continue;

    // Section detection
    if (/^Current Assets$/i.test(name)) { section = 'current_assets'; continue; }
    if (/^Assets$/i.test(name)) { section = 'current_assets'; continue; }
    if (/^Bank Accounts$/i.test(name)) { section = 'current_assets'; continue; }
    if (/^Long.?term [Aa]ssets|^Non.?current [Aa]ssets|^Fixed [Aa]ssets/i.test(name)) { section = 'fixed_assets'; continue; }
    if (/^Other [Aa]ssets/i.test(name)) { section = 'other_assets'; continue; }
    if (/^Current [Ll]iabilities$/i.test(name)) { section = 'current_liabilities'; continue; }
    if (/^Liabilities(?! and Equity)/i.test(name)) { section = 'current_liabilities'; continue; }
    if (/^Non.?current [Ll]iabilities|^Long.?term [Ll]iabilities/i.test(name)) { section = 'longterm_liabilities'; continue; }
    if (/^Equity|^Owner|^Shareholder/i.test(name)) { section = 'equity'; continue; }

    if (amount === null) continue;

    // US-specific field extraction
    if (/sales tax payable/i.test(name) && section === 'current_liabilities') salesTaxPayable = amount;
    if (/owner draws|owner distributions/i.test(name) && section === 'equity') ownerDraws = amount;

    switch (section) {
      case 'current_assets':       currentAssets.push({ name, amount }); break;
      case 'fixed_assets':         fixedAssets.push({ name, amount }); break;
      case 'other_assets':         otherAssets.push({ name, amount }); break;
      case 'current_liabilities':  currentLiabilities.push({ name, amount }); break;
      case 'longterm_liabilities': longTermLiabilities.push({ name, amount }); break;
      case 'equity':               equityItems.push({ name, amount }); break;
    }
  }

  if (totalAssets === 0) {
    totalAssets = [...currentAssets, ...fixedAssets, ...otherAssets].reduce((s, r) => s + r.amount, 0);
  }
  if (totalLiabilities === 0) {
    totalLiabilities = [...currentLiabilities, ...longTermLiabilities].reduce((s, r) => s + r.amount, 0);
  }
  if (totalEquity === 0) {
    totalEquity = equityItems.reduce((s, r) => s + r.amount, 0);
  }

  // Inject a synthetic "Cash on Hand" entry so components can find it via /cash/i.
  // The BANK section header row may already be in currentAssets with amount:0,
  // which would block the regex check. Remove it first, then inject the real value.
  if (cashOnHand !== 0) {
    // Remove any stray header rows (amount 0) that snuck in before the Total was captured
    const bankHeaderIdx = currentAssets.findIndex(
      a => /^BANK$|^Bank Accounts$/i.test(a.name) && a.amount === 0
    );
    if (bankHeaderIdx !== -1) currentAssets.splice(bankHeaderIdx, 1);
    if (!currentAssets.some(a => /cash on hand|cash in bank/i.test(a.name))) {
      currentAssets.unshift({ name: 'Cash on Hand (Bank)', amount: cashOnHand });
    }
  }

  return {
    asOfDate,
    basis,
    assets: { currentAssets, fixedAssets, otherAssets, totalAssets },
    liabilities: { currentLiabilities, longTermLiabilities, totalLiabilities },
    equity: { items: equityItems, totalEquity },
    ...(salesTaxPayable !== undefined && { salesTaxPayable }),
    ...(ownerDraws !== undefined && { ownerDraws }),
  };
}
