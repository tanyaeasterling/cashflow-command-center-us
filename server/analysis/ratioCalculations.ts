import type { RatioResult, RatiosData } from "../../shared/types/ratios";
import type { BalanceSheetData, ProfitLossData, ARAgingData, APAgingData, InventoryData } from "../../shared/types/reports";
import { CLIENT_CONFIG } from "../../shared/config/usConfig";

interface RatioInputs {
  balanceSheet?: BalanceSheetData;
  profitLoss?: ProfitLossData;
  arAging?: ARAgingData;
  apAging?: APAgingData;
  inventory?: InventoryData;
}

function makeRatio(
  name: string,
  value: number | null,
  unit: RatioResult['unit'],
  description: string,
  thresholds: { healthy: number; warning: number },
  higherIsBetter = true,
): RatioResult {
  let status: RatioResult['status'] = 'unknown';
  if (value !== null) {
    if (higherIsBetter) {
      status = value >= thresholds.healthy ? 'healthy' : value >= thresholds.warning ? 'warning' : 'critical';
    } else {
      status = value <= thresholds.healthy ? 'healthy' : value <= thresholds.warning ? 'warning' : 'critical';
    }
  }
  return { name, value, unit, description, status, benchmark: thresholds };
}

export function calculateRatios(inputs: RatioInputs): RatiosData {
  const { balanceSheet, profitLoss, arAging, apAging, inventory } = inputs;
  const t = CLIENT_CONFIG.ratioThresholds;

  // ─── GMROI ─────────────────────────────────────────────────────────────────
  let gmroiValue: number | null = null;
  if (inventory && profitLoss && inventory.totalValue > 0) {
    gmroiValue = profitLoss.grossProfit / inventory.totalValue;
  }
  const gmroi = makeRatio(
    'GMROI',
    gmroiValue,
    'x',
    'Gross Margin Return on Inventory Investment. Measures how much gross profit is earned per dollar of inventory.',
    { healthy: t.gmroi.healthy, warning: t.gmroi.warning },
    true,
  );

  // ─── A/R Days ──────────────────────────────────────────────────────────────
  let arDaysValue: number | null = null;
  if (arAging && profitLoss && profitLoss.totalIncome > 0) {
    arDaysValue = (arAging.totals.total / profitLoss.totalIncome) * 365;
  }
  const arDays = makeRatio(
    'A/R Days',
    arDaysValue,
    'days',
    'Average number of days to collect receivables. Lower is better.',
    { healthy: t.arDays.healthy, warning: t.arDays.warning },
    false,
  );

  // ─── A/P Days ──────────────────────────────────────────────────────────────
  let apDaysValue: number | null = null;
  if (apAging && profitLoss && profitLoss.totalCOGS > 0) {
    apDaysValue = (apAging.totals.total / profitLoss.totalCOGS) * 365;
  }
  const apDays = makeRatio(
    'A/P Days',
    apDaysValue,
    'days',
    'Average number of days to pay suppliers. Higher may indicate cash management strategy.',
    { healthy: t.apDays.healthy, warning: t.apDays.warning },
    false,
  );

  // ─── Gross Margin ──────────────────────────────────────────────────────────
  const grossMarginValue = profitLoss?.grossMargin ?? null;
  const grossMargin = makeRatio(
    'Gross Margin',
    grossMarginValue !== null ? grossMarginValue * 100 : null,
    '%',
    'Gross profit as a percentage of revenue. Benchmark: 25%+.',
    { healthy: t.grossMargin.healthy * 100, warning: t.grossMargin.warning * 100 },
    true,
  );

  // ─── Inventory Turnover ────────────────────────────────────────────────────
  let inventoryTurnoverValue: number | null = null;
  if (inventory && profitLoss && inventory.totalValue > 0) {
    inventoryTurnoverValue = profitLoss.totalCOGS / inventory.totalValue;
  }
  const inventoryTurnover = makeRatio(
    'Inventory Turnover',
    inventoryTurnoverValue,
    'x',
    'Number of times inventory is sold and replaced per period.',
    { healthy: t.inventoryTurnover.healthy, warning: t.inventoryTurnover.warning },
    true,
  );

  // ─── Current Ratio ─────────────────────────────────────────────────────────
  let currentRatioValue: number | null = null;
  if (balanceSheet) {
    const currentAssets = balanceSheet.assets.currentAssets.reduce((s, a) => s + a.amount, 0);
    const currentLiabilities = balanceSheet.liabilities.currentLiabilities.reduce((s, l) => s + l.amount, 0);
    if (currentLiabilities > 0) {
      currentRatioValue = currentAssets / currentLiabilities;
    }
  }
  const currentRatio = makeRatio(
    'Current Ratio',
    currentRatioValue,
    'ratio',
    'Current assets divided by current liabilities. Measures short-term liquidity.',
    { healthy: t.currentRatio.healthy, warning: t.currentRatio.warning },
    true,
  );

  // ─── Debt-to-Equity ────────────────────────────────────────────────────────
  let debtToEquityValue: number | null = null;
  if (balanceSheet && balanceSheet.equity.totalEquity > 0) {
    debtToEquityValue = balanceSheet.liabilities.totalLiabilities / balanceSheet.equity.totalEquity;
  }
  const debtToEquity = makeRatio(
    'Debt-to-Equity',
    debtToEquityValue,
    'ratio',
    'Total liabilities divided by total equity. Lower indicates less financial leverage.',
    { healthy: t.debtToEquity.healthy, warning: t.debtToEquity.warning },
    false,
  );

  // ─── Net Margin ────────────────────────────────────────────────────────────
  const netMarginValue = profitLoss?.netMargin ?? null;
  const netMargin = makeRatio(
    'Net Margin',
    netMarginValue !== null ? netMarginValue * 100 : null,
    '%',
    'Net income as a percentage of revenue. Benchmark: 10%+.',
    { healthy: t.netMargin.healthy * 100, warning: t.netMargin.warning * 100 },
    true,
  );

  return { gmroi, arDays, apDays, grossMargin, inventoryTurnover, currentRatio, debtToEquity, netMargin };
}
