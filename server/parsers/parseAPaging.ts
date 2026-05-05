import type { APAgingData, APAgingRow } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

// CaulCo QBO Caribbean A/P Aging format:
// Row 1: "A/P Ageing Summary Report"
// Row 2: "CaulCo Inc"
// Row 3: "As of 31 Mar, 2026"
// Row 5: [blank], CURRENT, 1 - 30, 31 - 60, 61 - 90, 91 AND OVER, Total

export function parseAPaging(rows: Record<string, string>[]): APAgingData {
  const agingRows: APAgingRow[] = [];
  let totals: APAgingRow = {
    supplier: 'TOTAL',
    current: 0, days1to30: 0, days31to60: 0,
    days61to90: 0, days91plus: 0, total: 0,
    isTotal: true,
  };
  let asOfDate = '';

  for (const row of rows) {
    const name =
      row['Vendor'] ??
      row['Supplier'] ??
      row['Name'] ??
      row['vendor'] ??
      row[''] ??
      Object.values(row)[0] ??
      '';
    if (!name || !name.trim()) continue;
    const trimmed = name.trim();

    if (/^CaulCo|^Monday|^Tuesday|^Wednesday|^Thursday|^Friday|^Saturday|^Sunday/i.test(trimmed)) continue;
    if (/^A\/P Ag(e?)ing/i.test(trimmed)) continue;
    if (/^As of/i.test(trimmed)) { asOfDate = trimmed; continue; }

    const isTotal = /^TOTAL$/i.test(trimmed);

    const agingRow: APAgingRow = {
      supplier:   trimmed,
      current:    parseQBOAmount(row['CURRENT'] ?? row['Current'] ?? row['current'] ?? '0'),
      days1to30:  parseQBOAmount(row['1 - 30'] ?? row['1-30'] ?? '0'),
      days31to60: parseQBOAmount(row['31 - 60'] ?? row['31-60'] ?? '0'),
      days61to90: parseQBOAmount(row['61 - 90'] ?? row['61-90'] ?? '0'),
      days91plus: parseQBOAmount(
        row['91 AND OVER'] ?? row['91 and over'] ??
        row['> 90'] ?? row['91+'] ?? '0'
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
