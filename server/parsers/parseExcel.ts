import * as XLSX from "xlsx";

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface ExcelParseResult {
  sheets: ExcelSheet[];
  sheetNames: string[];
}

/**
 * Parse an Excel file (XLSX/XLS) using SheetJS.
 * Uses {cellNF: true} and reads .v (value) not .f (formula) to handle
 * Apple Numbers exports and formula cells correctly.
 * Skips the "Export Summary" sheet from Apple Numbers exports.
 */
export function parseExcelFile(buffer: Buffer): ExcelParseResult {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellNF: true,
    cellDates: true,
  });

  const sheets: ExcelSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    // Skip Apple Numbers export summary sheet
    if (/export.?summary/i.test(sheetName)) continue;

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    // Convert to array of arrays to handle formula values properly
    const aoa: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false, // Use formatted values
    });

    if (aoa.length === 0) continue;

    // Find the first non-empty row as headers
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, aoa.length); i++) {
      const row = aoa[i];
      if (row && row.some(cell => cell !== null && cell !== '')) {
        headerRowIndex = i;
        break;
      }
    }

    const headerRow = aoa[headerRowIndex] as (string | null)[];
    const headers = headerRow.map(h => (h ?? '').toString().trim());

    const rows: Record<string, unknown>[] = [];
    for (let i = headerRowIndex + 1; i < aoa.length; i++) {
      const row = aoa[i] as unknown[];
      if (!row || row.every(cell => cell === null || cell === '')) continue;

      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        if (h) obj[h] = row[idx] ?? null;
      });
      rows.push(obj);
    }

    sheets.push({ name: sheetName, headers, rows });
  }

  return { sheets, sheetNames: workbook.SheetNames };
}

/**
 * Extract a numeric value from an Excel cell, handling formula results.
 */
export function extractNumericValue(cell: unknown): number {
  if (cell === null || cell === undefined || cell === '') return 0;
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'string') {
    const cleaned = cell.replace(/[,$()]/g, '').trim();
    const isNeg = cell.trim().startsWith('(') && cell.trim().endsWith(')');
    const n = parseFloat(cleaned);
    if (isNaN(n)) return 0;
    return isNeg ? -Math.abs(n) : n;
  }
  return 0;
}
