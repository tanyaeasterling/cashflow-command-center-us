export interface StressTestInputs {
  baseWeeklyRevenue: number;
  baseWeeklyExpenses: number;
  currentCash: number;
  revenueChangePct: number;    // -50 to +50
  expenseChangePct: number;    // -30 to +30
  collectionDelayWeeks: number; // 0 to 8
  inventoryBuildPct: number;   // 0 to 50
}

export interface WeekProjection {
  week: number;
  label: string;
  revenue: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCash: number;
  payablesBucket: number;
  vatBucket: number;
  realRevenueBucket: number;
}

export interface StressTestResult {
  projections: WeekProjection[];
  finalCash: number;
  minCash: number;
  minCashWeek: number;
  isViable: boolean;
  twoWeekThreshold: number;
  bucketHealth: BucketHealth[];
}

import { CLIENT_CONFIG } from "../../shared/config/usConfig";

export interface BucketHealth {
  name: string;
  target: number;
  actual: number;
  status: 'healthy' | 'warning' | 'critical';
}

const PF_TARGETS = CLIENT_CONFIG.profitFirstTargets;

export function runStressTest(inputs: StressTestInputs): StressTestResult {
  const {
    baseWeeklyRevenue,
    baseWeeklyExpenses,
    currentCash,
    revenueChangePct,
    expenseChangePct,
    collectionDelayWeeks,
    inventoryBuildPct,
  } = inputs;

  const adjustedRevenue = baseWeeklyRevenue * (1 + revenueChangePct / 100);
  const adjustedExpenses = baseWeeklyExpenses * (1 + expenseChangePct / 100);
  const inventoryDrain = baseWeeklyExpenses * (inventoryBuildPct / 100);

  const projections: WeekProjection[] = [];
  let cumulativeCash = currentCash;
  let minCash = currentCash;
  let minCashWeek = 0;

  for (let week = 1; week <= 12; week++) {
    // Revenue is delayed by collection delay
    const effectiveRevenue = week > collectionDelayWeeks ? adjustedRevenue : adjustedRevenue * 0.3;
    const effectiveExpenses = adjustedExpenses + (week <= 4 ? inventoryDrain : 0);
    const netCashFlow = effectiveRevenue - effectiveExpenses;
    cumulativeCash += netCashFlow;

    if (cumulativeCash < minCash) {
      minCash = cumulativeCash;
      minCashWeek = week;
    }

    projections.push({
      week,
      label: `Wk ${week}`,
      revenue: effectiveRevenue,
      expenses: effectiveExpenses,
      netCashFlow,
      cumulativeCash,
      payablesBucket: effectiveRevenue * (PF_TARGETS['OperatingExpenses'] ?? 0.30),
      vatBucket: effectiveRevenue * (PF_TARGETS['Tax'] ?? 0.15),
      realRevenueBucket: effectiveRevenue * (PF_TARGETS['Profit'] ?? 0.05),
    });
  }

  const twoWeekThreshold = adjustedExpenses * 2;

  // Calculate bucket health based on stressed revenue
  const bucketHealth: BucketHealth[] = Object.entries(PF_TARGETS)
    .slice(0, 8)
    .map(([name, rawTarget]) => {
      const target = typeof rawTarget === 'number' ? rawTarget : (rawTarget as { target: number }).target / 100;
      const actual = adjustedRevenue * target;
      const baseline = baseWeeklyRevenue * target;
      const ratio = baseline > 0 ? actual / baseline : 1;
      return {
        name,
        target: baseline,
        actual,
        status: ratio >= 0.9 ? 'healthy' : ratio >= 0.7 ? 'warning' : 'critical',
      };
    });

  return {
    projections,
    finalCash: cumulativeCash,
    minCash,
    minCashWeek,
    isViable: minCash > twoWeekThreshold,
    twoWeekThreshold,
    bucketHealth,
  };
}
