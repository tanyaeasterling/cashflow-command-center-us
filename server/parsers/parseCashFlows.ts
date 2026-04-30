import type { CashFlowsData } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

export function parseCashFlows(rows: Record<string, string>[], meta?: { periodStart?: string; periodEnd?: string }): CashFlowsData {
  let operating = 0;
  let investing = 0;
  let financing = 0;
  let beginningBalance = 0;
  let endingBalance = 0;
  let section: 'operating' | 'investing' | 'financing' | 'other' = 'other';

  for (const row of rows) {
    const label = (row[''] ?? row['Account'] ?? row['Description'] ?? row['Label'] ?? '').trim();
    const amtStr = row['Amount'] ?? row['Total'] ?? row['Value'] ?? '';
    const amount = parseQBOAmount(amtStr);

    // Detect section headers
    if (/operating activities/i.test(label)) { section = 'operating'; continue; }
    if (/investing activities/i.test(label)) { section = 'investing'; continue; }
    if (/financing activities/i.test(label)) { section = 'financing'; continue; }

    // Detect summary totals
    if (/net cash.*operating/i.test(label)) { operating = amount; continue; }
    if (/net cash.*investing/i.test(label)) { investing = amount; continue; }
    if (/net cash.*financing/i.test(label)) { financing = amount; continue; }
    if (/beginning.*balance|opening.*balance/i.test(label)) { beginningBalance = amount; continue; }
    if (/ending.*balance|closing.*balance/i.test(label)) { endingBalance = amount; continue; }

    // Accumulate by section if no explicit total found yet
    if (amount !== 0 && label && !/^total/i.test(label)) {
      if (section === 'operating') operating += amount;
      else if (section === 'investing') investing += amount;
      else if (section === 'financing') financing += amount;
    }
  }

  const netChange = operating + investing + financing;
  if (endingBalance === 0 && beginningBalance !== 0) {
    endingBalance = beginningBalance + netChange;
  }

  return {
    periodStart: meta?.periodStart ?? '',
    periodEnd: meta?.periodEnd ?? '',
    operating,
    investing,
    financing,
    netChange,
    beginningBalance,
    endingBalance,
  };
}
