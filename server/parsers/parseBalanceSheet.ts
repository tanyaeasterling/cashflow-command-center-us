import type { BalanceSheetData } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

// CaulCo QBO Caribbean Balance Sheet format:
// Row 1: "Balance Sheet,"
// Row 2: "CaulCo Inc,"
// Row 3: "As of 31 Mar, 2026,"
// Row 4: blank
// Row 5: ",Total"  <- headers (account name column is UNNAMED)
// Rows 6+: account name in first column, amount in "Total" column
// Section headers have no amount (e.g. "Assets,", "Current Assets,")
// "Total for X" rows are subtotals
// "TOTAL" rows are grand totals

interface RawRow { name: string; amount: number | null }

function extractRows(rows: Record<string, string>[]): RawRow[] {
  return rows.map(row => {
    // Account name is in the unnamed first column or any key that isn't "Total"
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
  const nonCurrentAssets: { name: string; amount: number }[] = [];
  const currentLiabilities: { name: string; amount: number }[] = [];
  const nonCurrentLiabilities: { name: string; amount: number }[] = [];
  const equityItems: { name: string; amount: number }[] = [];

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let totalCurrentAssets = 0;
  let totalCurrentLiabilities = 0;
  let asOfDate = '';

  let section: 'current_assets' | 'noncurrent_assets' | 'current_liabilities' | 'noncurrent_liabilities' | 'equity' | 'none' = 'none';

  for (const { name, amount } of raw) {
    if (!name) continue;

    // Capture as-of date
    if (/^As of/i.test(name)) { asOfDate = name; continue; }

    // Skip metadata
    if (/^Balance Sheet|^CaulCo|^Monday|^Tuesday|^Wednesday|^Thursday|^Friday|^Saturday|^Sunday/i.test(name)) continue;

    // Detect grand totals
    if (/^Total Assets$/i.test(name) && amount !== null) { totalAssets = amount; continue; }
    if (/^Total Liabilities$/i.test(name) && amount !== null) { totalLiabilities = amount; continue; }
    if (/^Total Equity|^Total Owner|^Net Assets/i.test(name) && amount !== null) { totalEquity = amount; continue; }

    // Detect subtotals
    if (/^Total for Current Assets|^Total Current Assets/i.test(name) && amount !== null) { totalCurrentAssets = amount; continue; }
    if (/^Total for Current Liabilities|^Total Current Liabilities/i.test(name) && amount !== null) { totalCurrentLiabilities = amount; continue; }

    // Skip other "Total for" subtotal rows
    if (/^Total for /i.test(name)) continue;

    // Section detection
    if (/^Current Assets$/i.test(name)) { section = 'current_assets'; continue; }
    if (/^Non-?current Assets|^Fixed Assets|^Long.?term Assets/i.test(name)) { section = 'noncurrent_assets'; continue; }
    if (/^Current Liabilities$/i.test(name)) { section = 'current_liabilities'; continue; }
    if (/^Non-?current Liabilities|^Long.?term Liabilities/i.test(name)) { section = 'noncurrent_liabilities'; continue; }
    if (/^Equity|^Owner|^Shareholder/i.test(name)) { section = 'equity'; continue; }
    if (/^Assets$/i.test(name)) { section = 'current_assets'; continue; }
    if (/^Liabilities$/i.test(name)) { section = 'current_liabilities'; continue; }

    // Skip section headers with no amount
    if (amount === null) continue;

    // Assign to section
    switch (section) {
      case 'current_assets':
        currentAssets.push({ name, amount });
        break;
      case 'noncurrent_assets':
        nonCurrentAssets.push({ name, amount });
        break;
      case 'current_liabilities':
        currentLiabilities.push({ name, amount });
        break;
      case 'noncurrent_liabilities':
        nonCurrentLiabilities.push({ name, amount });
        break;
      case 'equity':
        equityItems.push({ name, amount });
        break;
    }
  }

  // If grand totals were not found in labeled rows, compute from sections
  if (totalAssets === 0 && currentAssets.length > 0) {
    totalAssets = [...currentAssets, ...nonCurrentAssets].reduce((s, r) => s + r.amount, 0);
  }
  if (totalLiabilities === 0 && currentLiabilities.length > 0) {
    totalLiabilities = [...currentLiabilities, ...nonCurrentLiabilities].reduce((s, r) => s + r.amount, 0);
  }
  if (totalEquity === 0 && equityItems.length > 0) {
    totalEquity = equityItems.reduce((s, r) => s + r.amount, 0);
  }
  if (totalCurrentAssets === 0) {
    totalCurrentAssets = currentAssets.reduce((s, r) => s + r.amount, 0);
  }
  if (totalCurrentLiabilities === 0) {
    totalCurrentLiabilities = currentLiabilities.reduce((s, r) => s + r.amount, 0);
  }

  return {
    asOfDate,
    assets: {
      currentAssets,
      nonCurrentAssets,
      totalCurrentAssets,
      totalAssets,
    },
    liabilities: {
      currentLiabilities,
      nonCurrentLiabilities,
      totalCurrentLiabilities,
      totalLiabilities,
    },
    equity: {
      items: equityItems,
      totalEquity,
    },
  };
}
