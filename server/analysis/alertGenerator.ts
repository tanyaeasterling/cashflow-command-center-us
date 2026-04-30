import type { Alert, AlertLevel, AlertCategory } from "../../shared/types/alerts";
import type {
  ARAgingData,
  APAgingData,
  BalanceSheetData,
  ProfitLossData,
  VATSummaryData,
  ProfitFirstData,
  InventoryData,
} from "../../shared/types/reports";
import { CLIENT_CONFIG } from "../../shared/config/caulsConfig";
import { nanoid } from "nanoid";

interface AlertInput {
  arAging?: ARAgingData;
  apAging?: APAgingData;
  balanceSheet?: BalanceSheetData;
  profitLoss?: ProfitLossData;
  vatSummary?: VATSummaryData;
  profitFirst?: ProfitFirstData;
  inventory?: InventoryData;
  weeklyExpenses?: number;
}

function makeAlert(
  level: AlertLevel,
  category: AlertCategory,
  title: string,
  detail: string,
): Alert {
  return {
    id: nanoid(),
    level,
    category,
    title,
    detail,
    generatedAt: new Date().toISOString(),
    resolved: false,
  };
}

function fmt(n: number): string {
  return `EC$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function generateAlerts(input: AlertInput): Alert[] {
  const alerts: Alert[] = [];
  const { arAging, apAging, balanceSheet, profitLoss, vatSummary, profitFirst, inventory, weeklyExpenses } = input;

  // ─── CRITICAL RULES ────────────────────────────────────────────────────────

  // A/R 91+ days
  if (arAging) {
    for (const row of arAging.rows) {
      if (row.days91plus > 0 && !row.isTotal) {
        alerts.push(makeAlert(
          'critical', 'AR',
          `A/R 91+ Days: ${row.customer} — ${fmt(row.days91plus)}`,
          `${row.customer} has ${fmt(row.days91plus)} outstanding for 91+ days. Immediate collections action required.`,
        ));
      }
    }
  }

  // VAT Suspense
  const vatSuspense = balanceSheet?.vatSuspense ?? 0;
  if (vatSuspense > 1000) {
    alerts.push(makeAlert(
      'critical', 'VAT',
      `VAT Suspense ${fmt(vatSuspense)} — Forensic trace required`,
      `VAT Suspense account balance of ${fmt(vatSuspense)} requires a full forensic trace to identify misallocated transactions.`,
    ));
  }

  // VAT at Port near zero
  const vatAtPort = vatSummary?.vatAtPort ?? 0;
  const foreignOrdersActive = true; // CaulCo always has foreign orders
  if (vatAtPort < 100 && foreignOrdersActive) {
    alerts.push(makeAlert(
      'critical', 'VAT',
      `VAT at Port near zero — misallocation likely`,
      `VAT at Port is only ${fmt(vatAtPort)}. With active foreign orders, this strongly suggests VAT paid on imports is being coded to the wrong bucket.`,
    ));
  }

  // Payables bucket negative
  if (profitFirst) {
    const payablesBucket = profitFirst.latestWeek.buckets['Payables'] ?? 0;
    if (payablesBucket < 0) {
      alerts.push(makeAlert(
        'critical', 'ProfitFirst',
        `Payables bucket negative ${fmt(payablesBucket)} — reconciliation required`,
        `The Payables bucket is running negative at ${fmt(payablesBucket)}. Root cause is likely a timing gap between PF allocation and supplier payments.`,
      ));
    }
  }

  // Cash below 2-week threshold
  if (balanceSheet && weeklyExpenses) {
    const cash = balanceSheet.assets.currentAssets.find(a => /cash/i.test(a.name))?.amount ?? 0;
    if (cash < weeklyExpenses * 2) {
      alerts.push(makeAlert(
        'critical', 'Cash',
        `Cash below 2-week operating threshold`,
        `Current cash of ${fmt(cash)} is below the 2-week operating threshold of ${fmt(weeklyExpenses * 2)}.`,
      ));
    }
  }

  // ─── WARNING RULES ─────────────────────────────────────────────────────────

  // Stamp Tax gap
  const stampTaxProvision = balanceSheet?.stampTaxProvision ?? 0;
  const stampTaxAllocated = profitFirst?.latestWeek.buckets['StampTax'] ?? 0;
  if (stampTaxProvision > 0 && stampTaxAllocated > 0 && stampTaxProvision > stampTaxAllocated * 1.5) {
    alerts.push(makeAlert(
      'warning', 'StampTax',
      `Stamp Tax gap: ${fmt(stampTaxProvision)} vs ${fmt(stampTaxAllocated)} allocated`,
      `Stamp Tax provision of ${fmt(stampTaxProvision)} exceeds allocated amount ${fmt(stampTaxAllocated)} by more than 50%. Shortfall: ${fmt(stampTaxProvision - stampTaxAllocated)}.`,
    ));
  }

  // VAT allocation gap
  if (vatSummary && balanceSheet) {
    const vatBSAccount = balanceSheet.liabilities.currentLiabilities.find(l => /vat/i.test(l.name))?.amount ?? 0;
    const vatAllocated = vatSummary.vatCollected;
    if (vatBSAccount > 0 && vatAllocated > vatBSAccount * 1.8) {
      alerts.push(makeAlert(
        'warning', 'VAT',
        `VAT allocation gap: ${fmt(vatAllocated)} allocated vs ${fmt(vatBSAccount)} on BS`,
        `VAT allocated over 10 weeks (${fmt(vatAllocated)}) is more than 1.8x the Balance Sheet VAT account (${fmt(vatBSAccount)}). Review allocation methodology.`,
      ));
    }
  }

  // Inventory GMROI by location
  if (inventory) {
    for (const loc of inventory.locations) {
      if (loc.gmroi !== undefined && loc.gmroi < 1.5) {
        alerts.push(makeAlert(
          'warning', 'Inventory',
          `${loc.location} GMROI ${loc.gmroi.toFixed(2)}x below 1.5x threshold`,
          `${loc.location} has a GMROI of ${loc.gmroi.toFixed(2)}x, below the warning threshold of 1.5x. Review product mix and pricing.`,
        ));
      }
      if (loc.value > 250000 && (loc.turnover === 0 || loc.turnover === undefined)) {
        alerts.push(makeAlert(
          'warning', 'Inventory',
          `${loc.location} ${fmt(loc.value)} at zero sell-through`,
          `${loc.location} has ${fmt(loc.value)} in inventory with zero recorded sell-through. Verify inventory counts and sales data.`,
        ));
      }
    }
  }

  // Real revenue margin
  if (profitLoss) {
    const realRevenueMargin = profitLoss.netMargin;
    if (realRevenueMargin < 0.15) {
      alerts.push(makeAlert(
        'warning', 'Revenue',
        `Real revenue margin ${pct(realRevenueMargin)} below 15% threshold`,
        `Net margin of ${pct(realRevenueMargin)} is below the 15% Profit First real revenue target.`,
      ));
    }
  }

  // Rent bucket
  if (profitFirst && profitFirst.latestWeek.totalIncome > 0) {
    const rentBucket = profitFirst.latestWeek.buckets['Rent'] ?? 0;
    const rentPct = rentBucket / profitFirst.latestWeek.totalIncome;
    if (rentPct < 0.18) {
      alerts.push(makeAlert(
        'warning', 'ProfitFirst',
        `Rent bucket ${pct(rentPct)} below 20% target`,
        `Rent bucket is at ${pct(rentPct)} of income, below the 20% target. Current allocation requires correction.`,
      ));
    }
  }

  // A/R overdue 31+
  if (arAging) {
    const overdue31 = arAging.totals.days31to60 + arAging.totals.days61to90 + arAging.totals.days91plus;
    if (overdue31 > 5000) {
      alerts.push(makeAlert(
        'warning', 'AR',
        `A/R overdue 31+ days: ${fmt(overdue31)}`,
        `Total A/R overdue 31+ days is ${fmt(overdue31)}. Review collection procedures.`,
      ));
    }
  }

  // A/P 61+ days
  if (apAging) {
    const ap61 = apAging.totals.days61to90 + apAging.totals.days91plus;
    if (ap61 > 0) {
      alerts.push(makeAlert(
        'warning', 'AP',
        `A/P 61+ days: ${fmt(ap61)} — supplier relationship risk`,
        `${fmt(ap61)} in payables is 61+ days overdue. This poses a risk to supplier relationships and credit terms.`,
      ));
    }
  }

  // ─── INFO RULES ────────────────────────────────────────────────────────────

  if (!input.profitFirst) {
    alerts.push(makeAlert('info', 'DataMissing',
      'Asset upgrade debt not modeled — upload loan documentation',
      'No Profit First data loaded. Upload the weekly PF allocation spreadsheet to model debt service.'));
  }

  if (!input.profitLoss) {
    alerts.push(makeAlert('info', 'DataMissing',
      'P&L not uploaded — gross margin and net income unavailable',
      'Upload the Profit & Loss report to enable margin analysis and net income calculations.'));
  }

  if (!input.apAging) {
    alerts.push(makeAlert('info', 'DataMissing',
      'A/P Aging not uploaded — supplier payable days unavailable',
      'Upload the Accounts Payable Aging report to calculate supplier payment days and risk flags.'));
  }

  if (!input.vatSummary) {
    alerts.push(makeAlert('info', 'DataMissing',
      'VAT Tax Detail not uploaded — forensic trace incomplete',
      'Upload the VAT Tax Detail report to complete the VAT forensic trace and allocation gap analysis.'));
  }

  return alerts;
}
