import type { CashFlowsData } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

export function parseCashFlows(rows: Record<string, string>[]): CashFlowsData {
  let operating = 0;
  let investing = 0;
  let financing = 0;
  let netChange = 0;
  let beginningBalance = 0;
  let endingBalance = 0;
  let periodStart = '';
  let periodEnd = '';

  let section: 'operating' | 'investing' | 'financing' | 'none' = 'none';

  for (const row of rows) {
    const name = (row['Full name'] ?? row['full name'] ?? row['Name'] ?? row[''] ?? Object.values(row)[0] ?? '').trim();
    const rawAmount = row['Total'] ?? row['total'] ?? '';
    const amount = rawAmount.trim() ? parseQBOAmount(rawAmount) : null;
    if (!name) continue;

    if (/^\d+ (January|February|March|April|May|June|July|August|September|October|November|December)/i.test(name)) {
      if (!periodStart) periodStart = name;
      else periodEnd = name;
      continue;
    }
    if (/^Statement of Cash|^CaulCo|^Monday|^Tuesday|^Wednesday|^Thursday|^Friday|^Saturday|^Sunday/i.test(name)) continue;

    if (/^Net cash (from|used in) operating/i.test(name) && amount !== null) { operating = amount; continue; }
    if (/^Net cash (from|used in) investing/i.test(name) && amount !== null) { investing = amount; continue; }
    if (/^Net cash (from|used in) financing/i.test(name) && amount !== null) { financing = amount; continue; }
    if (/^Net (increase|decrease|change) in cash/i.test(name) && amount !== null) { netChange = amount; continue; }
    if (/^Cash (at|and cash equivalents at) (the )?beginning/i.test(name) && amount !== null) { beginningBalance = amount; continue; }
    if (/^Cash (at|and cash equivalents at) (the )?end/i.test(name) && amount !== null) { endingBalance = amount; continue; }

    if (/^Cash flows from operating/i.test(name)) { section = 'operating'; continue; }
    if (/^Cash flows from investing/i.test(name)) { section = 'investing'; continue; }
    if (/^Cash flows from financing/i.test(name)) { section = 'financing'; continue; }
  }

  if (netChange === 0) netChange = operating + investing + financing;

  return {
    periodStart,
    periodEnd,
    operating,
    investing,
    financing,
    netChange,
    beginningBalance,
    endingBalance,
  };
}
