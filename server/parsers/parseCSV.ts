import Papa from "papaparse";

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  metadata: Record<string, string>;
  rawText: string;
}

/**
 * Parse a QBO-exported CSV file.
 * Handles: BOM characters, parentheses-as-negatives, metadata header rows,
 * and the standard Post Date/Amount/Payee/Memo bank format.
 */
export function parseQBOCSV(buffer: Buffer): CSVParseResult {
  // Strip BOM if present
  let text = buffer.toString('utf-8');
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const metadata: Record<string, string> = {};
  let dataStartIndex = 0;

  // QBO CSVs often have metadata rows before the actual data headers
  // e.g. "Report Name,Balance Sheet", "Date Range,Jan 1 - Dec 31 2024"
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    // If the line looks like a metadata row (2 columns, first is a label)
    const parts = line.split(',');
    if (parts.length === 2 && !line.includes('"') && isNaN(Number(parts[1]))) {
      const key = parts[0].replace(/"/g, '').trim();
      const val = parts[1].replace(/"/g, '').trim();
      if (key && val && !/^\d/.test(key)) {
        metadata[key] = val;
        dataStartIndex = i + 1;
        continue;
      }
    }
    // Stop at the first row that looks like data headers
    break;
  }

  const dataText = lines.slice(dataStartIndex).join('\n');

  const result = Papa.parse<Record<string, string>>(dataText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (value) => value.trim(),
  });

  const headers = result.meta.fields ?? [];
  const rows = (result.data as Record<string, string>[]).map(row => {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      cleaned[k] = v;
    }
    return cleaned;
  });

  return { headers, rows, metadata, rawText: text };
}

/**
 * Convert a QBO-formatted number string to a float.
 * Handles: parentheses for negatives, commas, dollar signs, empty strings.
 */
export function parseQBOAmount(value: string): number {
  if (!value || value.trim() === '' || value.trim() === '-') return 0;
  const s = value.trim();
  const isNegative = s.startsWith('(') && s.endsWith(')');
  const cleaned = s
    .replace(/[()$,\s]/g, '')
    .replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}
