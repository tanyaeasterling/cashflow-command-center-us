import type { APAgingData, APAgingRow } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

export function parseAPaging(rows: Record<string, string>[]): APAgingData {
  const agingRows: APAgingRow[] = [];
  let totals: APAgingRow = { supplier: 'TOTAL', current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days91plus: 0, total: 0, isTotal: true };

  for (const row of rows) {
    const name = row['Vendor'] ?? row['Supplier'] ?? row['Name'] ?? row['vendor'] ?? '';
    if (!name) continue;

    const isTotal = /^total/i.test(name);
    const agingRow: APAgingRow = {
      supplier:  name,
      current:   parseQBOAmount(row['Current'] ?? row['current'] ?? '0'),
      days1to30: parseQBOAmount(row['1 - 30'] ?? row['1-30'] ?? '0'),
      days31to60: parseQBOAmount(row['31 - 60'] ?? row['31-60'] ?? '0'),
      days61to90: parseQBOAmount(row['61 - 90'] ?? row['61-90'] ?? '0'),
      days91plus: parseQBOAmount(row['> 90'] ?? row['91+'] ?? row['91 and over'] ?? '0'),
      total:     parseQBOAmount(row['Total'] ?? row['total'] ?? '0'),
      isTotal,
    };

    if (isTotal) {
      totals = agingRow;
    } else {
      agingRows.push(agingRow);
    }
  }

  return {
    asOfDate: '',
    rows: agingRows,
    totals,
  };
}
