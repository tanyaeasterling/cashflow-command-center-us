import type { CashFlowsData } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

// CaulCo QBO Caribbean Cash Flow format:
// Headers: "Full name, Total"
// Section headers: "Cash flows from operating activities,"
// Key totals: "Net cash from operating activities", etc.

export function parseCashFlows(rows: Record<string, string>[]): CashFlowsData {
  let operatingActivities = 0;
  let investingActivities = 0;
  let financingActivities = 0;
  let netCashChange = 0;
  let openingBalance = 0;
  let closingBalance = 0;
  let periodLabel = '';

  const operatingItems: { name: string; amount: number }[] = [];
  const investingItems: { name: string; amount: number }[] = [];
  const financingItems: { name: string; amount: number }[] = [];

  let section: 'operating' | 'investing' | 'financing' | 'none' = 'none';

  for (const row of rows) {
    const name = (row['Full name'] ?? row['full name'] ?? row['Name'] ?? row[''] ?? Object.values(row)[0] ?? '').trim();
    const rawAmount = row['Total'] ?? row['total'] ?? '';
    const amount = rawAmount.trim() ? parseQBOAmount(rawAmount) : null;

    if (!name) continue;

    // Capture period
    if (/^\d+ (January|February|March|April|May|June|July|August|September|October|November|December)/i.test(name)) {
      periodLabel = name;
      continue;
    }

    // Skip metadata
    if (/^Statement of Cash|^CaulCo|^Monday|^Tuesday|^Wednesday|^Thursday|^Friday|^Saturday|^Sunday/i.test(name)) continue;

    // Key totals
    if (/^Net cash (from|used in) operating/i.test(name) && amount !== null) { operatingActivities = amount; continue; }
    if (/^Net cash (from|used in) investing/i.test(name) && amount !== null) { investingActivities = amount; continue; }
    if (/^Net cash (from|used in) financing/i.test(name) && amount !== null) { financingActivities = amount; continue; }
    if (/^Net (increase|decrease|change) in cash/i.test(name) && amount !== null) { netCashChange = amount; continue; }
    if (/^Cash (at|and cash equivalents at) (the )?beginning/i.test(name) && amount !== null) { openingBalance = amount; continue; }
    if (/^Cash (at|and cash equivalents at) (the )?end/i.test(name) && amount !== null) { closingBalance = amount; continue; }

    // Section detection
    if (/^Cash flows from operating/i.test(name)) { section = 'operating'; continue; }
    if (/^Cash flows from investing/i.test(name)) { section = 'investing'; continue; }
    if (/^Cash flows from financing/i.test(name)) { section = 'financing'; continue; }

    if (amount === null) continue;

    switch (section) {
      case 'operating': operatingItems.push({ name, amount }); break;
      case 'investing': investingItems.push({ name, amount }); break;
      case 'financing': financingItems.push({ name, amount }); break;
    }
  }

  // Compute from items if totals not found
  if (operatingActivities === 0 && operatingItems.length > 0) {
    operatingActivities = operatingItems.reduce((s, r) => s + r.amount, 0);
  }
  if (investingActivities === 0 && investingItems.length > 0) {
    investingActivities = investingItems.reduce((s, r) => s + r.amount, 0);
  }
  if (financingActivities === 0 && financingItems.length > 0) {
    financingActivities = financingItems.reduce((s, r) => s + r.amount, 0);
  }
  if (netCashChange === 0) {
    netCashChange = operatingActivities + investingActivities + financingActivities;
  }

  return {
    periodLabel,
    operatingActivities,
    investingActivities,
    financingActivities,
    netCashChange,
    openingBalance,
    closingBalance,
    operatingItems,
    investingItems,
    financingItems,
  };
}
