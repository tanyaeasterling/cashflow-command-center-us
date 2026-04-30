import type { ProfitFirstData, PFBucketWeek } from "../../shared/types/reports";
import type { ExcelSheet } from "./parseExcel";
import { extractNumericValue } from "./parseExcel";

const WEEK_SHEET_PATTERN = /^(week\s*\d+|new\s*format)/i;
const BUCKET_KEYWORDS = [
  'payables', 'vat', 'stamp', 'real revenue', 'debt', 'capex',
  'compensation', 'operating', 'payroll', 'rent', 'taxes',
  'vault', 'profit', 'marketing', 'charity', 'income',
];

/**
 * Parse the Profit First Apple Numbers Excel export.
 * Reads Week 1 through Week 10 and NEW FORMAT sheets.
 * Skips Export Summary sheet (already handled in parseExcel.ts).
 */
export function parseProfitFirst(sheets: ExcelSheet[]): ProfitFirstData {
  const weeks: PFBucketWeek[] = [];
  const bucketNamesSet = new Set<string>();

  // Filter to only week sheets
  const weekSheets = sheets.filter(s => WEEK_SHEET_PATTERN.test(s.name));

  for (const sheet of weekSheets) {
    const week = parseWeekSheet(sheet);
    if (week) {
      weeks.push(week);
      Object.keys(week.buckets).forEach(k => bucketNamesSet.add(k));
    }
  }

  // Sort weeks by label
  weeks.sort((a, b) => a.weekLabel.localeCompare(b.weekLabel));

  const latestWeek = weeks[weeks.length - 1] ?? {
    weekLabel: 'No Data',
    buckets: {},
    totalIncome: 0,
  };

  return {
    weeks,
    latestWeek,
    bucketNames: Array.from(bucketNamesSet),
  };
}

function parseWeekSheet(sheet: ExcelSheet): PFBucketWeek | null {
  const buckets: Record<string, number> = {};
  let totalIncome = 0;
  let weekDate: string | undefined;

  // Try to find the date in the first few rows
  for (const row of sheet.rows.slice(0, 5)) {
    for (const val of Object.values(row)) {
      if (val instanceof Date) {
        weekDate = val.toISOString().split('T')[0];
        break;
      }
      if (typeof val === 'string' && /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(val)) {
        weekDate = val;
        break;
      }
    }
    if (weekDate) break;
  }

  // Parse bucket rows — look for rows where first column is a bucket name
  for (const row of sheet.rows) {
    const firstKey = sheet.headers[0] ?? '';
    const label = String(row[firstKey] ?? '').trim().toLowerCase();

    if (!label) continue;

    const isBucket = BUCKET_KEYWORDS.some(k => label.includes(k));
    if (!isBucket) continue;

    // Find the allocation/actual amount column
    const amountKey = sheet.headers.find(h =>
      /amount|actual|allocated|balance|total/i.test(h) && h !== firstKey
    ) ?? sheet.headers[1];

    if (!amountKey) continue;

    const amount = extractNumericValue(row[amountKey]);
    const bucketName = String(row[firstKey] ?? '').trim();

    if (/income|revenue|sales/i.test(label)) {
      totalIncome = amount;
    } else if (bucketName) {
      buckets[bucketName] = amount;
    }
  }

  if (Object.keys(buckets).length === 0) return null;

  return {
    weekLabel: sheet.name,
    weekDate,
    buckets,
    totalIncome,
  };
}
