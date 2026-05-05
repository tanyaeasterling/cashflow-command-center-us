import type { ProfitLossData } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

export function parseProfitLoss(rows: Record<string, string>[]): ProfitLossData {
  let totalIncome = 0;
  let totalCOGS = 0;
  let grossProfit = 0;
  let totalExpenses = 0;
  let netIncome = 0;
  let periodStart = '';
  let periodEnd = '';
  let basis: 'Cash' | 'Accrual' = 'Cash';
  const income: { name: string; amount: number }[] = [];
  const costOfGoods: { name: string; amount: number }[] = [];
  const expenses: { name: string; amount: number }[] = [];
  let section: 'income' | 'cogs' | 'expenses' | 'none' = 'none';

  for (const row of rows) {
    const keys = Object.keys(row);
    const nameKey = keys.find(k => k !== 'Total' && k !== 'total') ?? keys[0] ?? '';
    const name = (row[nameKey] ?? '').trim();
    const rawAmount = row['Total'] ?? row['total'] ?? '';
    const amount = rawAmount.trim() ? parseQBOAmount(rawAmount) : null;
    if (!name) continue;

    if (/accrual/i.test(name)) { basis = 'Accrual'; continue; }

    if (/^\d+ (January|February|March|April|May|June|July|August|September|October|November|December)/i.test(name)) {
      if (!periodStart) periodStart = name;
      else periodEnd = name;
      continue;
    }
    if (/^Profit and Loss|^CaulCo|^Monday|^Tuesday|^Wednesday|^Thursday|^Friday|^Saturday|^Sunday/i.test(name)) continue;

    if (/^Total for Income|^Total Income/i.test(name) && amount !== null) { totalIncome = Math.abs(amount); continue; }
    if (/^Total for Cost of Sales|^Total COGS|^Total Cost of Goods/i.test(name) && amount !== null) { totalCOGS = Math.abs(amount); continue; }
    if (/^Gross Profit/i.test(name) && amount !== null) { grossProfit = amount; continue; }
    if (/^Total for Expenses|^Total Expenses|^Total Operating/i.test(name) && amount !== null) { totalExpenses = Math.abs(amount); continue; }
    if (/^Net (Income|Profit|Loss)|^Profit for the (year|period)|^Net Earnings/i.test(name) && amount !== null) { netIncome = amount; continue; }
    if (/^Total for /i.test(name)) continue;

    if (/^Income$/i.test(name)) { section = 'income'; continue; }
    if (/^Cost of (Sales|Goods)|^COGS/i.test(name)) { section = 'cogs'; continue; }
    if (/^Expenses?$/i.test(name)) { section = 'expenses'; continue; }
    if (amount === null) continue;

    switch (section) {
      case 'income':   income.push({ name, amount }); break;
      case 'cogs':     costOfGoods.push({ name, amount }); break;
      case 'expenses': expenses.push({ name, amount }); break;
    }
  }

  if (totalIncome === 0 && income.length > 0) totalIncome = income.reduce((s, r) => s + Math.abs(r.amount), 0);
  if (totalCOGS === 0 && costOfGoods.length > 0) totalCOGS = costOfGoods.reduce((s, r) => s + Math.abs(r.amount), 0);
  if (grossProfit === 0) grossProfit = totalIncome - totalCOGS;
  if (totalExpenses === 0 && expenses.length > 0) totalExpenses = expenses.reduce((s, r) => s + Math.abs(r.amount), 0);
  if (netIncome === 0) netIncome = grossProfit - totalExpenses;

  const grossMargin = totalIncome > 0 ? grossProfit / totalIncome : 0;
  const netMargin   = totalIncome > 0 ? netIncome   / totalIncome : 0;

  return {
    periodStart,
    periodEnd,
    basis,
    income,
    totalIncome,
    costOfGoods,
    totalCOGS,
    grossProfit,
    grossMargin,
    expenses,
    totalExpenses,
    netIncome,
    netMargin,
  };
}
