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
import { CLIENT_CONFIG } from "../../shared/config/usConfig";
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
  return `${CLIENT_CONFIG.currencySymbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  // Sales Tax Payable threshold
  const salesTaxPayable = balanceSheet?.salesTaxPayable ?? 0;
  if (salesTaxPayable > 5000) {
    alerts.push(makeAlert(
      'warning', 'Tax',
      `Sales Tax Payable ${fmt(salesTaxPayable)} — verify filing is current`,
      `Sales Tax Payable balance of ${fmt(salesTaxPayable)} exceeds the $5,000 threshold. Confirm current filing period is up to date.`,
    ));
  }

  // VAT at Port near zero
  const vatAtPort = vatSummary?.vatAtPort ?? 0;
  const foreignOrdersActive = CLIENT_CONFIG.foreignOrdersActive ?? false;
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
    if (realRevenueMargin < CLIENT_CONFIG.ratioThresholds.netMargin.warning) {
      alerts.push(makeAlert(
        'warning', 'Revenue',
        `Net margin ${pct(realRevenueMargin)} below ${pct(CLIENT_CONFIG.ratioThresholds.netMargin.warning)} threshold`,
        `Net margin of ${pct(realRevenueMargin)} is below the warning threshold of ${pct(CLIENT_CONFIG.ratioThresholds.netMargin.warning)}.`,
      ));
    }
  }

  // REMOVED: Rent bucket warning (CaulCo-specific — not applicable to US clients)

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


  return alerts;
}
