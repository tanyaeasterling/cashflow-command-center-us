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

  let section: 'current_assets' | 'fixed_assets' | 'other_assets' | 'current_liabilities' | 'longterm_liabilities' | 'equity' | 'none' = 'none';

  for (const { name, amount } of raw) {
    if (!name) continue;

    if (/^As of/i.test(name)) { asOfDate = name; continue; }
    if (/accrual/i.test(name)) { basis = 'Accrual'; continue; }
    if (/^Balance Sheet|^CaulCo|^Monday|^Tuesday|^Wednesday|^Thursday|^Friday|^Saturday|^Sunday/i.test(name)) continue;

    if (/^Total Assets$/i.test(name) && amount !== null) { totalAssets = amount; continue; }
    if (/^Total Liabilities$/i.test(name) && amount !== null) { totalLiabilities = amount; continue; }
    if (/^Total Equity|^Total Owner|^Net Assets/i.test(name) && amount !== null) { totalEquity = amount; continue; }
    if (/^Total for /i.test(name)) continue;

    if (/^Current Assets$/i.test(name)) { section = 'current_assets'; continue; }
    if (/^Assets$/i.test(name)) { section = 'current_assets'; continue; }
    if (/^Non-?current Assets|^Fixed Assets|^Long.?term Assets/i.test(name)) { section = 'fixed_assets'; continue; }
    if (/^Other Assets/i.test(name)) { section = 'other_assets'; continue; }
    if (/^Current Liabilities$/i.test(name)) { section = 'current_liabilities'; continue; }
    if (/^Liabilities$/i.test(name)) { section = 'current_liabilities'; continue; }
    if (/^Non-?current Liabilities|^Long.?term Liabilities/i.test(name)) { section = 'longterm_liabilities'; continue; }
    if (/^Equity|^Owner|^Shareholder/i.test(name)) { section = 'equity'; continue; }

    if (amount === null) continue;

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

  return {
    asOfDate,
    basis,
    assets: { currentAssets, fixedAssets, otherAssets, totalAssets },
    liabilities: { currentLiabilities, longTermLiabilities, totalLiabilities },
    equity: { items: equityItems, totalEquity },
  };
}
