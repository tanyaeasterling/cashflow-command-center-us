import type { ARAgingData, ARAgingRow } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

// CaulCo QBO Caribbean exports use:
// - "Ageing" spelling (not "Aging")
// - First column is unnamed (customer name has no header)
// - Columns: [blank], CURRENT, 1 - 30, 31 - 60, 61 - 90, 91 AND OVER, Total
// - "As of" date is on row 3
// - TOTAL row starts with "TOTAL"

export function parseARaging(rows: Record<string, string>[]): ARAgingData {
  const agingRows: ARAgingRow[] = [];
  let totals: ARAgingRow = {
    customer: 'TOTAL',
    current: 0, days1to30: 0, days31to60: 0,
    days61to90: 0, days91plus: 0, total: 0,
    isTotal: true,
  };
  let asOfDate = '';

  for (const row of rows) {
    // Get customer name -- QBO Caribbean has it in the first unnamed column
    // Try multiple possible header names including blank/empty key
    const name =
      row['Customer'] ??
      row['Name'] ??
      row['customer'] ??
      row[''] ??           // unnamed first column
      Object.values(row)[0] ?? // first value regardless of key
      '';

    if (!name || !name.trim()) continue;

    // Skip metadata rows
    const trimmed = name.trim();
    if (/^CaulCo|^As of|^Monday|^Tuesday|^Wednesday|^Thursday|^Friday|^Saturday|^Sunday/i.test(trimmed)) continue;
    if (/^A\/R Ag(e?)ing/i.test(trimmed)) continue;

    // Capture as-of date
    if (/^As of/i.test(trimmed)) {
      asOfDate = trimmed;
      continue;
    }

    const isTotal = /^TOTAL$/i.test(trimmed);

    const agingRow: ARAgingRow = {
      customer:   trimmed,
      current:    parseQBOAmount(row['CURRENT'] ?? row['Current'] ?? row['current'] ?? '0'),
      days1to30:  parseQBOAmount(row['1 - 30'] ?? row['1-30'] ?? row['1-30 Days'] ?? '0'),
      days31to60: parseQBOAmount(row['31 - 60'] ?? row['31-60'] ?? row['31-60 Days'] ?? '0'),
      days61to90: parseQBOAmount(row['61 - 90'] ?? row['61-90'] ?? row['61-90 Days'] ?? '0'),
      days91plus: parseQBOAmount(
        row['91 AND OVER'] ?? row['91 and over'] ??
        row['> 90'] ?? row['91+'] ?? row['91 and Over'] ?? '0'
      ),
      total:      parseQBOAmount(row['Total'] ?? row['TOTAL'] ?? row['total'] ?? '0'),
      isTotal,
    };

    if (isTotal) {
      totals = agingRow;
    } else {
      agingRows.push(agingRow);
    }
  }

  return { asOfDate, rows: agingRows, totals };
}
