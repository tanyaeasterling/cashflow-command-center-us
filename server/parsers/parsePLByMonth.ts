import { parseQBOAmount } from "./parseCSV";

export interface PLByMonthRow {
  account: string;
  months: Record<string, number>;
  total: number;
}

export interface PLByMonthData {
  periodStart: string;
  periodEnd: string;
  months: string[];
  rows: PLByMonthRow[];
  totalIncome: Record<string, number>;
  totalExpenses: Record<string, number>;
  netIncome: Record<string, number>;
}

export function parsePLByMonth(rows: Record<string, string>[], headers: string[]): PLByMonthData {
  // Headers: first col is account name, remaining cols are month labels + Total
  const monthCols = headers.filter(h => h && h !== '' && !/^total$/i.test(h)).slice(1);
  const plRows: PLByMonthRow[] = [];
  const totalIncome: Record<string, number> = {};
  const totalExpenses: Record<string, number> = {};
  const netIncome: Record<string, number> = {};

  for (const row of rows) {
    const account = row[''] ?? row['Account'] ?? row[headers[0] ?? ''] ?? '';
    if (!account) continue;

    const months: Record<string, number> = {};
    let total = 0;
    for (const m of monthCols) {
      const v = parseQBOAmount(row[m] ?? '0');
      months[m] = v;
      total += v;
    }

    if (/^total income/i.test(account)) {
      Object.assign(totalIncome, months);
    } else if (/^total expenses/i.test(account)) {
      Object.assign(totalExpenses, months);
    } else if (/^net income/i.test(account)) {
      Object.assign(netIncome, months);
    } else {
      plRows.push({ account, months, total });
    }
  }

  return {
    periodStart: '',
    periodEnd: '',
    months: monthCols,
    rows: plRows,
    totalIncome,
    totalExpenses,
    netIncome,
  };
}
