import type { ProfitLossData } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

// CaulCo QBO Caribbean P&L format:
// Row 1: "Profit and Loss,"
// Row 2: "CaulCo Inc,"
// Row 3: date range e.g. "1 January, 2025-31 March, 2026,"
// Row 5: ",Total"  <- headers (account name column UNNAMED)
// Section headers: "Income,", "Cost of Sales,", "Expenses,"
// "Total for X" rows are subtotals
// Key totals: "Total for Income", "Total for Cost of Sales", "Total for Expenses"
// "Net Income" or "Profit for the year" at bottom

export function parseProfitLoss(rows: Record<string, string>[]): ProfitLossData {
  let totalIncome = 0;
  let totalCOGS = 0;
  let grossProfit = 0;
  let totalExpenses = 0;
  let netIncome = 0;
  let periodLabel = '';

  const incomeItems: { name: string; amount: number }[] = [];
  const cogsItems: { name: string; amount: number }[] = [];
  const expenseItems: { name: string; amount: number }[] = [];

  let section: 'income' | 'cogs' | 'expenses' | 'none' = 'none';

  for (const row of rows) {
    const keys = Object.keys(row);
    const nameKey = keys.find(k => k !== 'Total' && k !== 'total') ?? keys[0] ?? '';
    const name = (row[nameKey] ?? '').trim();
    const rawAmount = row['Total'] ?? row['total'] ?? '';
    const amount = rawAmount.trim() ? parseQBOAmount(rawAmount) : null;

    if (!name) continue;

    // Capture period
    if (/^\d+ (January|February|March|April|May|June|July|August|September|October|November|December)/i.test(name)) {
      periodLabel = name;
      continue;
    }

    // Skip metadata rows
    if (/^Profit and Loss|^CaulCo|^Monday|^Tuesday|^Wednesday|^Thursday|^Friday|^Saturday|^Sunday/i.test(name)) continue;

    // Key totals
    if (/^Total for Income|^Total Income/i.test(name) && amount !== null) { totalIncome = Math.abs(amount); continue; }
    if (/^Total for Cost of Sales|^Total COGS|^Total Cost of Goods/i.test(name) && amount !== null) { totalCOGS = Math.abs(amount); continue; }
    if (/^Gross Profit/i.test(name) && amount !== null) { grossProfit = amount; continue; }
    if (/^Total for Expenses|^Total Expenses|^Total Operating/i.test(name) && amount !== null) { totalExpenses = Math.abs(amount); continue; }
    if (/^Net (Income|Profit|Loss)|^Profit for the (year|period)|^Net Earnings/i.test(name) && amount !== null) { netIncome = amount; continue; }

    // Skip other subtotals
    if (/^Total for /i.test(name)) continue;

    // Section detection
    if (/^Income$/i.test(name)) { section = 'income'; continue; }
    if (/^Cost of (Sales|Goods)|^COGS/i.test(name)) { section = 'cogs'; continue; }
    if (/^Expenses?$/i.test(name)) { section = 'expenses'; continue; }

    if (amount === null) continue;

    switch (section) {
      case 'income':    incomeItems.push({ name, amount }); break;
      case 'cogs':      cogsItems.push({ name, amount }); break;
      case 'expenses':  expenseItems.push({ name, amount }); break;
    }
  }

  // Compute from items if totals not found
  if (totalIncome === 0 && incomeItems.length > 0) {
    totalIncome = incomeItems.reduce((s, r) => s + Math.abs(r.amount), 0);
  }
  if (totalCOGS === 0 && cogsItems.length > 0) {
    totalCOGS = cogsItems.reduce((s, r) => s + Math.abs(r.amount), 0);
  }
  if (grossProfit === 0) {
    grossProfit = totalIncome - totalCOGS;
  }
  if (totalExpenses === 0 && expenseItems.length > 0) {
    totalExpenses = expenseItems.reduce((s, r) => s + Math.abs(r.amount), 0);
  }
  if (netIncome === 0) {
    netIncome = grossProfit - totalExpenses;
  }

  const grossMargin = totalIncome > 0 ? grossProfit / totalIncome : 0;
  const netMargin   = totalIncome > 0 ? netIncome   / totalIncome : 0;

  return {
    periodLabel,
    totalIncome,
    totalCOGS,
    grossProfit,
    grossMargin,
    totalExpenses,
    netIncome,
    netMargin,
    incomeItems,
    cogsItems,
    expenseItems,
  };
}
