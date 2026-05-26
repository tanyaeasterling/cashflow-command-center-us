import { useReportStore } from "@/store/useReportStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { CLIENT_CONFIG } from "../../../../shared/config/usConfig";
import { PiggyBank, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from "recharts";

export function ProfitFirst() {
  const { profitFirst } = useReportStore();

  if (!profitFirst) {
    return (
      <EmptyState
        title="Profit First data not loaded"
        description="Upload the weekly Profit First allocation spreadsheet (Apple Numbers / Excel) to view bucket analysis."
        reportType="PF Allocation (XLSX)"
        icon={<PiggyBank size={24} style={{ color: "var(--tec-purple)" }} />}
      />
    );
  }

  const { latestWeek, weeks } = profitFirst;
  const totalIncome = latestWeek.totalIncome;

  // Build bucket cards with target vs actual
  const bucketCards = Object.entries(CLIENT_CONFIG.profitFirstTargets).map(([name, config]) => {
    const actual = latestWeek.buckets[name] ?? 0;
    const targetAmt = totalIncome * (config.target / 100);
    const actualPct = totalIncome > 0 ? (actual / totalIncome) * 100 : 0;
    const variance = actual - targetAmt;
    const variancePct = config.target > 0 ? ((actualPct - config.target) / config.target) * 100 : 0;
    const status = Math.abs(variancePct) <= 5 ? 'healthy' : Math.abs(variancePct) <= 15 ? 'warning' : 'critical';

    return { name, actual, targetAmt, actualPct, config, variance, variancePct, status };
  });

  // Income trend chart data
  const trendData = weeks.slice(-10).map(w => ({
    week: w.weekLabel.replace(/week\s*/i, 'W'),
    income: w.totalIncome,
  }));

  // Allocation bar data
  const allocationData = bucketCards
    .filter(b => b.actual !== 0)
    .map(b => ({ name: b.name.slice(0, 8), actual: b.actualPct, target: b.config.target }));

  const statusColor = (s: string) =>
    s === 'healthy' ? "var(--tec-green)" : s === 'warning' ? "var(--tec-amber)" : "var(--tec-red)";

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(55% 0.06 300)" }}>Latest Week Income</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: "var(--tec-purple-deep)", fontFamily: "'DM Serif Display', serif" }}>
            {formatCurrency(totalIncome, true)}
          </p>
          <p className="text-xs mt-1" style={{ color: "oklch(55% 0.06 300)" }}>{latestWeek.weekLabel}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(55% 0.06 300)" }}>Weeks Loaded</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: "var(--tec-purple-deep)", fontFamily: "'DM Serif Display', serif" }}>
            {weeks.length}
          </p>
          <p className="text-xs mt-1" style={{ color: "oklch(55% 0.06 300)" }}>Allocation periods</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(55% 0.06 300)" }}>Buckets On Target</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: "var(--tec-green)", fontFamily: "'DM Serif Display', serif" }}>
            {bucketCards.filter(b => b.status === 'healthy').length}/{bucketCards.length}
          </p>
          <p className="text-xs mt-1" style={{ color: "oklch(55% 0.06 300)" }}>Within ±5% of target</p>
        </div>
      </div>

      {/* 15 Bucket Cards */}
      <div>
        <h2 className="text-lg mb-3" style={{ fontFamily: "'DM Serif Display', serif", color: "var(--tec-purple-deep)" }}>
          Bucket Status — {latestWeek.weekLabel}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {bucketCards.map(b => {
            const TrendIcon = b.variance > 0 ? TrendingUp : b.variance < 0 ? TrendingDown : Minus;
            return (
              <div
                key={b.name}
                className="rounded-xl border p-3 shadow-sm"
                style={{
                  background: "oklch(100% 0 0)",
                  borderColor: "oklch(88% 0.005 300)",
                  borderLeft: `4px solid ${statusColor(b.status)}`,
                }}
              >
                <p className="text-xs font-semibold truncate" style={{ color: "var(--tec-purple-deep)" }}>{b.name}</p>
                <p className="text-lg font-semibold mt-1" style={{ color: statusColor(b.status), fontFamily: "'DM Serif Display', serif" }}>
                  {formatCurrency(b.actual, true)}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs" style={{ color: "oklch(55% 0.06 300)" }}>
                    {b.actualPct.toFixed(1)}% / {b.config.target}%
                  </span>
                  <TrendIcon size={11} style={{ color: statusColor(b.status) }} />
                </div>
                {b.config.note && (
                  <p className="text-xs mt-1 leading-tight" style={{ color: "oklch(60% 0.05 300)" }}>
                    {b.config.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Allocation Bar Chart */}
      {allocationData.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
            Actual vs Target Allocation (%)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={allocationData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="actual" name="Actual %" fill="var(--tec-purple)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" name="Target %" fill="var(--tec-gold)" radius={[4, 4, 0, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Income Trend */}
      {trendData.length > 1 && (
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
            Weekly Income Trend
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v, true)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="income" fill="var(--tec-purple)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
