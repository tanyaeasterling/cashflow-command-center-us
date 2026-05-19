import type { ProfitFirstData, PFBucketWeek } from "../../shared/types/reports";
import { extractNumericValue } from "./parseExcel";
import * as XLSX from "xlsx";

const WEEK_SHEET_PATTERN = /^(week\s*\d+|new\s*format)/i;

// Rows to skip — these are layout/header rows not bucket data
const SKIP_LABELS = /^(caulco|transfer|stored|payables\s*pay\s*out|total|payables\s*negative)/i;

// Map raw label text to canonical bucket names used in caulsConfig targets
const BUCKET_LABEL_MAP: Record<string, string> = {
  'income':              'Income',
  'payables':            'Payables',
  'foreign':             'Payables',
  'local':               'Payables',
  'vat':                 'VAT',
  'stamp tax':           'StampTax',
  'real revenue':        'RealRevenue',
  'debt paydown':        'DebtPaydown',
  'capital exp':         'CapEx',
  'capex':               'CapEx',
  'charity':             'Charity',
  'marketing':           'Marketing',
  'compensation':        'Compensation',
  'operating exp':       'Operating',
  'operating':           'Operating',
  'payroll':             'Payroll',
  'profit':              'Profit',
  'rent':                'Rent',
  'taxes':               'Taxes',
  'vault':               'Vault',
};

function canonicalizeBucket(rawLabel: string): string | null {
  const lower = rawLabel.toLowerCase();
  for (const [key, canonical] of Object.entries(BUCKET_LABEL_MAP)) {
    if (lower.includes(key)) return canonical;
  }
  return null;
}

/**
 * Parse the Profit First Apple Numbers Excel export.
 *
 * The file structure per sheet is:
 *   Row 0:  "Caulco"  (layout header — skip)
 *   Row 1:  "Transfer" labels (skip)
 *   Row 2:  "Stored" label (skip)
 *   Row 3:  "Income"  | amount-in-col-1
 *   Row 4:  blank
 *   Row 5+: bucket label in col-0, amount in col-1
 *
 * CRITICAL: SheetJS returns col-0 as the sheet "header" key because row-0
 * says "Caulco". This means row objects are keyed by "Caulco" for col-0.
 * We bypass that by re-reading the workbook directly via AOA (array of arrays)
 * so we can index by column position, not by header name.
 */
export function parseProfitFirst(
  _sheets: unknown,
  rawBuffer?: Buffer,
): ProfitFirstData {
  // If we have the raw buffer, use it directly for reliable AOA parsing
  if (rawBuffer) {
    return parseProfitFirstFromBuffer(rawBuffer);
  }

  // Fallback: try to extract from the sheets object if buffer not available
  // This path is less reliable but kept for backwards compatibility
  const sheetsArr = Array.isArray(_sheets) ? _sheets : [];
  const weeks: PFBucketWeek[] = [];
  const bucketNamesSet = new Set<string>();

  for (const sheet of sheetsArr) {
    if (!WEEK_SHEET_PATTERN.test(sheet.name ?? '')) continue;
    const week = parseWeekSheetFromRows(sheet.name, sheet.rows ?? [], sheet.headers ?? []);
    if (week) {
      weeks.push(week);
      Object.keys(week.buckets).forEach(k => bucketNamesSet.add(k));
    }
  }

  return buildResult(weeks, bucketNamesSet);
}

export function parseProfitFirstFromBuffer(buffer: Buffer): ProfitFirstData {
  const wb = XLSX.read(buffer, { type: 'buffer', cellNF: true, cellDates: true });
  const weeks: PFBucketWeek[] = [];
  const bucketNamesSet = new Set<string>();

  for (const sheetName of wb.SheetNames) {
    if (!WEEK_SHEET_PATTERN.test(sheetName)) continue;
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    // AOA with raw:false gives us formatted string values (resolves formulas)
    const aoa: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
      raw: false,
    }) as (string | number | null)[][];

    const week = parseWeekAOA(sheetName, aoa);
    if (week) {
      weeks.push(week);
      Object.keys(week.buckets).forEach(k => bucketNamesSet.add(k));
    }
  }

  return buildResult(weeks, bucketNamesSet);
}

function parseWeekAOA(
  sheetName: string,
  aoa: (string | number | null)[][],
): PFBucketWeek | null {
  const buckets: Record<string, number> = {};
  let totalIncome = 0;

  for (const row of aoa) {
    if (!row || row.length < 2) continue;

    const rawLabel = String(row[0] ?? '').trim();
    if (!rawLabel) continue;
    if (SKIP_LABELS.test(rawLabel)) continue;

    const amount = extractNumericValue(row[1]);
    const canonical = canonicalizeBucket(rawLabel);

    if (!canonical) continue;

    if (canonical === 'Income') {
      totalIncome = amount;
    } else {
      // Accumulate into canonical bucket (e.g. Foreign + Local both → Payables)
      buckets[canonical] = (buckets[canonical] ?? 0) + amount;
    }
  }

  if (Object.keys(buckets).length === 0 && totalIncome === 0) return null;

  return {
    weekLabel: sheetName,
    weekDate: undefined,
    buckets,
    totalIncome,
  };
}

// Fallback path using pre-parsed sheet rows (when raw buffer unavailable)
function parseWeekSheetFromRows(
  sheetName: string,
  rows: Record<string, unknown>[],
  headers: string[],
): PFBucketWeek | null {
  const buckets: Record<string, number> = {};
  let totalIncome = 0;

  // The first header is the layout title (e.g. "Caulco") — use it as label key
  const labelKey = headers[0] ?? '';
  // Amount is always column index 1
  const amountKey = headers[1] ?? '';

  for (const row of rows) {
    const rawLabel = String(row[labelKey] ?? '').trim();
    if (!rawLabel) continue;
    if (SKIP_LABELS.test(rawLabel)) continue;

    const amount = extractNumericValue(row[amountKey]);
    const canonical = canonicalizeBucket(rawLabel);
    if (!canonical) continue;

    if (canonical === 'Income') {
      totalIncome = amount;
    } else {
      buckets[canonical] = (buckets[canonical] ?? 0) + amount;
    }
  }

  if (Object.keys(buckets).length === 0 && totalIncome === 0) return null;
  return { weekLabel: sheetName, weekDate: undefined, buckets, totalIncome };
}

function buildResult(
  weeks: PFBucketWeek[],
  bucketNamesSet: Set<string>,
): ProfitFirstData {
  // Sort: Week 1, Week 2 … Week 10, NEW FORMAT last
  weeks.sort((a, b) => {
    const numA = parseInt(a.weekLabel.replace(/\D/g, ''), 10) || 999;
    const numB = parseInt(b.weekLabel.replace(/\D/g, ''), 10) || 999;
    return numA - numB;
  });

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
