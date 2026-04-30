/**
 * Trend Analysis Engine
 * Provides Month-over-Month (MoM), Year-over-Year (YoY), and
 * Profit First weekly trend calculations.
 */

export interface TrendPoint {
  label: string;
  value: number;
  changePercent?: number;
  changeAbs?: number;
}

export interface TrendResult {
  points: TrendPoint[];
  latestValue: number;
  latestChangePercent: number | null;
  latestChangeAbs: number | null;
  trend: 'up' | 'down' | 'flat';
  sparkline: number[];
}

/**
 * Calculate Month-over-Month trend from a series of {label, value} points.
 * Labels should be month names or ISO date strings.
 */
export function calcMoMTrend(data: { label: string; value: number }[]): TrendResult {
  if (data.length === 0) {
    return { points: [], latestValue: 0, latestChangePercent: null, latestChangeAbs: null, trend: 'flat', sparkline: [] };
  }

  const points: TrendPoint[] = data.map((d, i) => {
    const prev = data[i - 1];
    const changeAbs = prev ? d.value - prev.value : undefined;
    const changePercent = prev && prev.value !== 0 ? ((d.value - prev.value) / Math.abs(prev.value)) * 100 : undefined;
    return { label: d.label, value: d.value, changeAbs, changePercent };
  });

  const latest = points[points.length - 1]!;
  const trend = latest.changeAbs == null ? 'flat'
    : latest.changeAbs > 0 ? 'up'
    : latest.changeAbs < 0 ? 'down'
    : 'flat';

  return {
    points,
    latestValue: latest.value,
    latestChangePercent: latest.changePercent ?? null,
    latestChangeAbs: latest.changeAbs ?? null,
    trend,
    sparkline: data.map(d => d.value),
  };
}

/**
 * Calculate Year-over-Year trend from two arrays of monthly values.
 * currentYear and priorYear should each have up to 12 values.
 */
export function calcYoYTrend(
  currentYear: number[],
  priorYear: number[],
  labels: string[],
): TrendResult {
  const currentTotal = currentYear.reduce((s, v) => s + v, 0);
  const priorTotal = priorYear.reduce((s, v) => s + v, 0);

  const points: TrendPoint[] = labels.map((label, i) => {
    const cur = currentYear[i] ?? 0;
    const pri = priorYear[i] ?? 0;
    const changeAbs = cur - pri;
    const changePercent = pri !== 0 ? (changeAbs / Math.abs(pri)) * 100 : undefined;
    return { label, value: cur, changeAbs, changePercent };
  });

  const changeAbs = currentTotal - priorTotal;
  const changePercent = priorTotal !== 0 ? (changeAbs / Math.abs(priorTotal)) * 100 : null;
  const trend = changeAbs > 0 ? 'up' : changeAbs < 0 ? 'down' : 'flat';

  return {
    points,
    latestValue: currentTotal,
    latestChangePercent: changePercent,
    latestChangeAbs: changeAbs,
    trend,
    sparkline: currentYear,
  };
}

/**
 * Calculate Profit First weekly bucket trends.
 * Input: array of weekly snapshots with bucket values.
 * Returns per-bucket trend results.
 */
export function calcPFWeeklyTrends(
  weeks: Array<{ label: string; buckets: Record<string, number> }>,
): Record<string, TrendResult> {
  if (weeks.length === 0) return {};

  const bucketNames = Object.keys(weeks[0]?.buckets ?? {});
  const results: Record<string, TrendResult> = {};

  for (const bucket of bucketNames) {
    const series = weeks.map(w => ({ label: w.label, value: w.buckets[bucket] ?? 0 }));
    results[bucket] = calcMoMTrend(series);
  }

  return results;
}

/**
 * Calculate a simple linear regression slope for a numeric series.
 * Returns positive for upward trend, negative for downward.
 */
export function calcLinearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY = values.reduce((s, v) => s + v, 0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}
