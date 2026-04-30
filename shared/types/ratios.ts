export interface RatioResult {
  name: string;
  value: number | null;
  benchmark: { healthy: number; warning: number };
  unit: 'x' | '%' | 'days' | 'ratio';
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  description: string;
}

export interface RatiosData {
  gmroi: RatioResult;
  arDays: RatioResult;
  apDays: RatioResult;
  grossMargin: RatioResult;
  inventoryTurnover: RatioResult;
  currentRatio: RatioResult;
  debtToEquity: RatioResult;
  netMargin: RatioResult;
}
