import { useReportStore } from "@/store/useReportStore";
import { CLIENT_CONFIG } from "../../../shared/config/caulsConfig";

// ─── CASHFLOW Letter definitions ──────────────────────────────────────────────
// Each letter maps to data already in the store.
// Score is 0-100 per letter, then averaged to a composite.

interface LetterScore {
  letter: string;
  label: string;
  description: string;
  score: number;         // 0-100
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  detail: string;
}

function scoreToStatus(score: number): 'healthy' | 'warning' | 'critical' | 'unknown' {
  if (score < 0) return 'unknown';
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'warning';
  return 'critical';
}

const STATUS_COLORS = {
  healthy:  { bg: "oklch(94% 0.06 145)", border: "oklch(75% 0.14 145)", text: "oklch(32% 0.12 145)", dot: "var(--tec-green)" },
  warning:  { bg: "oklch(96% 0.05 75)",  border: "oklch(82% 0.12 75)",  text: "oklch(38% 0.10 75)",  dot: "var(--tec-amber)" },
  critical: { bg: "oklch(96% 0.04 25)",  border: "oklch(82% 0.10 25)",  text: "oklch(38% 0.12 25)",  dot: "var(--tec-red)"   },
  unknown:  { bg: "oklch(95% 0.01 300)", border: "oklch(85% 0.03 300)", text: "oklch(50% 0.05 300)", dot: "oklch(70% 0.05 300)" },
};

export function CashflowScore() {
  const {
    balanceSheet, profitLoss, arAging, apAging,
    profitFirst, alerts, cashFlows, bankStatement,
    uploadedFiles,
  } = useReportStore();

  // ── C — Clarity: data completeness ────────────────────────────────────────
  const requiredReports = ['BalanceSheet', 'ProfitLoss', 'ARaging', 'APaging', 'CashFlows', 'BankStatement', 'ProfitFirst'];
  const loadedCount = uploadedFiles.filter(f => requiredReports.includes(f.reportType)).length;
  const clarityScore = Math.round((loadedCount / requiredReports.length) * 100);

  // ── A — Assignment: Profit First bucket completeness ─────────────────────
  const bucketCount = Object.keys(CLIENT_CONFIG.profitFirstTargets).length;
  const assignedBuckets = profitFirst
    ? Object.keys(profitFirst.latestWeek.buckets ?? {}).length
    : 0;
  const assignmentScore = profitFirst
    ? Math.min(100, Math.round((assignedBuckets / bucketCount) * 100))
    : -1;

  // ── S — Structure: account structure health (sub-account integrity) ───────
  // Proxy: if balance sheet has both current and non-current assets, structure is present
  const hasStructure = balanceSheet
    ? (balanceSheet.assets.currentAssets.length > 0 && balanceSheet.assets.totalAssets > 0)
    : null;
  const structureScore = hasStructure === null ? -1 : hasStructure ? 80 : 30;

  // ── H — Habits: PF snapshot recency (weekly cadence) ─────────────────────
  // Proxy: if PF data exists and has a week label, habits are being maintained
  const hasRecentPF = profitFirst?.latestWeek?.weekLabel;
  const habitsScore = hasRecentPF ? 75 : profitFirst ? 40 : -1;

  // ── F — Flow: operating cash flow position ────────────────────────────────
  const operatingCF = cashFlows?.operatingActivities ?? null;
  let flowScore = -1;
  if (operatingCF !== null) {
    if (operatingCF > 0) flowScore = 85;
    else if (operatingCF > -50000) flowScore = 45;
    else flowScore = 15;
  } else if (profitLoss) {
    const netIncome = profitLoss.netIncome ?? 0;
    flowScore = netIncome > 0 ? 65 : netIncome > -50000 ? 35 : 10;
  }

  // ── L — Leaks: alert count and severity ───────────────────────────────────
  const criticalCount = alerts.filter(a => a.level === 'critical' && !a.resolved).length;
  const warningCount  = alerts.filter(a => a.level === 'warning'  && !a.resolved).length;
  const leaksScore = alerts.length === 0
    ? -1
    : Math.max(0, 100 - (criticalCount * 25) - (warningCount * 8));

  // ── O — Ownership: owner pay and profit allocation ────────────────────────
  const pfBuckets = profitFirst?.latestWeek?.buckets ?? {};
  const hasProfit  = 'Profit' in pfBuckets || 'profit' in pfBuckets;
  const hasOwnerComp = 'Compensation' in pfBuckets || 'RealRevenue' in pfBuckets;
  const ownershipScore = profitFirst
    ? (hasProfit && hasOwnerComp ? 85 : hasOwnerComp ? 55 : 25)
    : -1;

  // ── W — Wealth: debt paydown and vault building ───────────────────────────
  const hasDebtPaydown = 'DebtPaydown' in pfBuckets || 'Vault' in pfBuckets;
  const totalLiabilities = balanceSheet?.liabilities.totalLiabilities ?? 0;
  const totalAssets      = balanceSheet?.assets.totalAssets ?? 1;
  const debtRatio = totalLiabilities / totalAssets;
  let wealthScore = -1;
  if (balanceSheet) {
    wealthScore = debtRatio < 0.4 ? 85 : debtRatio < 0.6 ? 60 : debtRatio < 0.8 ? 35 : 15;
    if (hasDebtPaydown) wealthScore = Math.min(100, wealthScore + 10);
  }

  // ── Composite score ───────────────────────────────────────────────────────
  const scores = [clarityScore, assignmentScore, structureScore, habitsScore, flowScore, leaksScore, ownershipScore, wealthScore];
  const validScores = scores.filter(s => s >= 0);
  const composite = validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0;

  const letters: LetterScore[] = [
    {
      letter: 'C', label: 'Clarity',
      description: 'Financial data completeness',
      score: clarityScore,
      status: scoreToStatus(clarityScore),
      detail: `${loadedCount} of ${requiredReports.length} reports loaded`,
    },
    {
      letter: 'A', label: 'Assignment',
      description: 'Profit First bucket allocation',
      score: assignmentScore,
      status: scoreToStatus(assignmentScore),
      detail: assignmentScore < 0 ? 'No PF data uploaded' : `${assignedBuckets} of ${bucketCount} buckets assigned`,
    },
    {
      letter: 'S', label: 'Structure',
      description: 'Account architecture integrity',
      score: structureScore,
      status: scoreToStatus(structureScore),
      detail: hasStructure === null ? 'Upload Balance Sheet to assess' : hasStructure ? 'Account structure detected' : 'Account structure gaps found',
    },
    {
      letter: 'H', label: 'Habits',
      description: 'Weekly PF upload cadence',
      score: habitsScore,
      status: scoreToStatus(habitsScore),
      detail: hasRecentPF ? `Latest: ${hasRecentPF}` : profitFirst ? 'PF data present, week label missing' : 'No PF snapshots uploaded',
    },
    {
      letter: 'F', label: 'Flow',
      description: 'Operating cash flow position',
      score: flowScore,
      status: scoreToStatus(flowScore),
      detail: operatingCF !== null
        ? `Operating CF: EC$${operatingCF.toLocaleString()}`
        : profitLoss ? `Net income proxy: EC$${(profitLoss.netIncome ?? 0).toLocaleString()}` : 'Upload Cash Flow Statement',
    },
    {
      letter: 'L', label: 'Leaks',
      description: 'Active financial leak alerts',
      score: leaksScore,
      status: scoreToStatus(leaksScore),
      detail: alerts.length === 0
        ? 'No alerts generated yet'
        : `${criticalCount} critical, ${warningCount} warnings unresolved`,
    },
    {
      letter: 'O', label: 'Ownership',
      description: 'Owner pay and profit allocation',
      score: ownershipScore,
      status: scoreToStatus(ownershipScore),
      detail: profitFirst
        ? (hasProfit && hasOwnerComp ? 'Profit and compensation buckets active' : 'Incomplete ownership allocation')
        : 'Upload Profit First data',
    },
    {
      letter: 'W', label: 'Wealth',
      description: 'Debt reduction and vault building',
      score: wealthScore,
      status: scoreToStatus(wealthScore),
      detail: balanceSheet
        ? `Debt ratio: ${(debtRatio * 100).toFixed(0)}%${hasDebtPaydown ? ' — paydown bucket active' : ' — no paydown bucket'}`
        : 'Upload Balance Sheet',
    },
  ];

  const compositeStatus = scoreToStatus(composite);
  const compositeColors = STATUS_COLORS[compositeStatus];

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ background: "oklch(22% 0.16 310)", borderColor: "oklch(35% 0.18 310)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: "'DM Serif Display', serif", color: "var(--tec-gold-light)" }}
          >
            CASHFLOW Health Score
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "oklch(70% 0.06 300)" }}>
            Tanya Easterling Consulting proprietary methodology
          </p>
        </div>
        <div className="text-right">
          <div
            className="text-4xl font-bold tabular-nums"
            style={{ color: composite >= 70 ? "var(--tec-green)" : composite >= 40 ? "var(--tec-amber)" : "var(--tec-red)" }}
          >
            {validScores.length > 0 ? composite : '--'}
          </div>
          <div className="text-xs" style={{ color: "oklch(65% 0.06 300)" }}>
            out of 100
          </div>
        </div>
      </div>

      {/* Letter grid */}
      <div className="grid grid-cols-4 gap-2">
        {letters.map(({ letter, label, score, status, detail }) => {
          const colors = STATUS_COLORS[status];
          return (
            <div
              key={letter}
              className="rounded-lg border p-2.5 space-y-1"
              style={{ background: colors.bg, borderColor: colors.border }}
              title={detail}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xl font-bold"
                  style={{ fontFamily: "'DM Serif Display', serif", color: colors.dot }}
                >
                  {letter}
                </span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: colors.dot, flexShrink: 0 }}
                />
              </div>
              <div className="text-xs font-medium" style={{ color: colors.text }}>
                {label}
              </div>
              <div className="text-xs" style={{ color: colors.text, opacity: 0.75 }}>
                {score < 0 ? 'No data' : `${score}/100`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail strip — shows lowest scoring letter */}
      {(() => {
        const lowest = [...letters].filter(l => l.score >= 0).sort((a, b) => a.score - b.score)[0];
        if (!lowest) return null;
        return (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: "oklch(18% 0.14 310)", color: "oklch(80% 0.05 300)" }}
          >
            <span style={{ color: "var(--tec-gold-light)", fontWeight: 600 }}>
              Focus area:
            </span>{" "}
            <span style={{ color: STATUS_COLORS[lowest.status].dot, fontWeight: 600 }}>
              {lowest.letter} — {lowest.label}
            </span>{" "}
            {lowest.detail}
          </div>
        );
      })()}
    </div>
  );
}
