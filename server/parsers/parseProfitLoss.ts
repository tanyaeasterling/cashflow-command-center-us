import type { ProfitLossData, LineItem } from "../../shared/types/reports";

export function parseProfitLoss(lines: string[]): ProfitLossData {
  const result: ProfitLossData = {
    periodStart: '',
    periodEnd: '',
    basis: 'Accrual',
    income: [],
    totalIncome: 0,
    costOfGoods: [],
    totalCOGS: 0,
    grossProfit: 0,
    grossMargin: 0,
    expenses: [],
    totalExpenses: 0,
    netIncome: 0,
    netMargin: 0,
  };

  let section: 'income' | 'cogs' | 'expenses' | null = null;

  for (const line of lines) {
    if (/cash basis/i.test(line)) result.basis = 'Cash';
    if (/accrual basis/i.test(line)) result.basis = 'Accrual';

    // Period detection
    const periodMatch = line.match(/(\w+ \d+,?\s*\d{4})\s*[-–to]+\s*(\w+ \d+,?\s*\d{4})/i);
    if (periodMatch && !result.periodStart) {
      result.periodStart = periodMatch[1];
      result.periodEnd = periodMatch[2];
    }

    if (/^income|^revenue|^sales/i.test(line) && !/total/i.test(line)) { section = 'income'; continue; }
    if (/cost of goods|cost of sales/i.test(line) && !/total/i.test(line)) { section = 'cogs'; continue; }
    if (/^expenses|operating expenses/i.test(line) && !/total/i.test(line)) { section = 'expenses'; continue; }

    if (/total income|total revenue|total sales/i.test(line)) {
      result.totalIncome = extractAmount(line);
      continue;
    }
    if (/total cost of goods|total cogs/i.test(line)) {
      result.totalCOGS = extractAmount(line);
      continue;
    }
    if (/gross profit/i.test(line)) {
      result.grossProfit = extractAmount(line);
      continue;
    }
    if (/total expenses/i.test(line)) {
      result.totalExpenses = extractAmount(line);
      continue;
    }
    if (/net (income|profit|loss)/i.test(line)) {
      result.netIncome = extractAmount(line);
      continue;
    }

    if (section && extractAmount(line) !== 0) {
      const item: LineItem = {
        name: line.replace(/[\d,.()\-$]+/g, '').trim(),
        amount: extractAmount(line),
      };
      if (item.name) {
        if (section === 'income') result.income.push(item);
        else if (section === 'cogs') result.costOfGoods.push(item);
        else if (section === 'expenses') result.expenses.push(item);
      }
    }
  }

  if (result.totalIncome > 0) {
    result.grossMargin = result.grossProfit / result.totalIncome;
    result.netMargin = result.netIncome / result.totalIncome;
  }

  return result;
}

function extractAmount(line: string): number {
  const match = line.match(/[\d,]+(\.\d{2})?/g);
  if (!match) return 0;
  const lastNum = match[match.length - 1];
  const isNeg = line.includes('(') || /loss/i.test(line);
  const val = parseFloat(lastNum.replace(/,/g, ''));
  return isNeg ? -val : val;
}
