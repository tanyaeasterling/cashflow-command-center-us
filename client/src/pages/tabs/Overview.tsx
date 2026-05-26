import { useReportStore } from "@/store/useReportStore";
import { KPICard } from "@/components/ui/KPICard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CashflowScore } from "@/components/CashflowScore";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { CLIENT_CONFIG } from "../../../../shared/config/usConfig";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Banknote, TrendingUp, Users, Building2, AlertTriangle, PiggyBank } from "lucide-react";

export function Overview() {
  const { balanceSheet, profitLoss, arAging, apAging, profitFirst, alerts } = useReportStore();

  const hasAnyData = !!(balanceSheet || profitLoss || arAging || apAging);

  if (!hasAnyData) {
    return (
      <EmptyState
        title="No financial data loaded"
        description="Upload your QuickBooks reports to populate the overview dashboard. Start with the Balance Sheet and Profit & Loss."
        icon={<Banknote size={24} style={{ color: "var(--tec-purple)" }} />}
      />
    );
  }

  // ─── KPI calculations ─────────────────────────────────────────────────────
  const totalAssets = balanceSheet?.assets.totalAssets ?? 0;
  const totalLiabilities = balanceSheet?.liabilities.totalLiabilities ?? 0;
  const totalEquity = balanceSheet?.equity.totalEquity ?? 0;
  const cash = balanceSheet?.assets?.currentAssets?.find?.(a => /cash/i.test(a.name))?.amount ?? 0;
  const totalIncome = profitLoss?.totalIncome ?? 0;
  const grossProfit = profitLoss?.grossProfit ?? 0;
  const netIncome = profitLoss?.netIncome ?? 0;
  const grossMargin = profitLoss?.grossMargin ?? 0;
  const arTotal = arAging?.totals.total ?? 0;
  const ar91 = arAging?.totals.days91plus ?? 0;
  const apTotal = apAging?.totals.total ?? 0;
  const criticalAlerts = alerts.filter(a => a.level === 'critical' && !a.resolved).length;
  const latestPFIncome = profitFirst?.latestWeek.totalIncome ?? 0;

  // ─── Chart data ───────────────────────────────────────────────────────────
  const plChartData = profitLoss ? [
    { name: 'Revenue', value: totalIncome },
    { name: 'COGS', value: profitLoss.totalCOGS },
    { name: 'Gross Profit', value: grossProfit },
    { name: 'Expenses', value: profitLoss.totalExpenses },
    { name: 'Net Income', value: netIncome },
  ] : [];

  const bsChartData = balanceSheet ? [
    { name: 'Assets', value: totalAssets },
    { name: 'Liabilities', value: totalLiabilities },
    { name: 'Equity', value: totalEquity },
  ] : [];

  const PIE_COLORS = [
    "var(--tec-purple)", "var(--tec-gold)", "var(--tec-green)",
    "var(--tec-amber)", "var(--tec-red)",
  ];

  return (
    <div className="space-y-6">
      {/* CASHFLOW Health Score — TEC proprietary methodology */}
      <CashflowScore />

      {/* Engagement flags banner */}
      {CLIENT_CONFIG.engagementFlags.length > 0 && (
        <div
          className="rounded-xl p-4 border"
          style={{
            background: "oklch(97% 0.02 310)",
            borderColor: "oklch(85% 0.06 310)",
          }}
        >
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--tec-purple-deep)" }}>
            <AlertTriangle size={14} style={{ color: "var(--tec-amber)" }} />
            Active Engagement Flags
          </h3>
          <ul className="space-y-1">
            {CLIENT_CONFIG.engagementFlags.slice(0, 4).map((flag, i) => (
              <li key={i} className="text-xs flex items-start gap-2" style={{ color: "oklch(40% 0.08 310)" }}>
                <span className="mt-0.5 shrink-0" style={{ color: "var(--tec-amber)" }}>•</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI Grid */}
      <div>
        <h2 className="text-lg mb-3" style={{ fontFamily: "'DM Serif Display', serif", color: "var(--tec-purple-deep)" }}>
          Key Performance Indicators
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            title="Total Assets"
            value={formatCurrency(totalAssets, true)}
            subtitle="Balance Sheet"
            status="neutral"
            icon={<Banknote size={18} />}
          />
          <KPICard
            title="Cash on Hand"
            value={formatCurrency(cash, true)}
            subtitle="Current assets"
            status={cash > 50000 ? 'healthy' : cash > 20000 ? 'warning' : 'critical'}
            icon={<Banknote size={18} />}
          />
          <KPICard
            title="Gross Margin"
            value={formatPercent(grossMargin)}
            subtitle={`Revenue: ${formatCurrency(totalIncome, true)}`}
            status={grossMargin >= 0.25 ? 'healthy' : grossMargin >= 0.20 ? 'warning' : 'critical'}
            icon={<TrendingUp size={18} />}
          />
          <KPICard
            title="Net Income"
            value={formatCurrency(netIncome, true)}
            subtitle={`Margin: ${formatPercent(profitLoss?.netMargin)}`}
            status={netIncome > 0 ? 'healthy' : 'critical'}
            icon={<TrendingUp size={18} />}
          />
          <KPICard
            title="A/R Total"
            value={formatCurrency(arTotal, true)}
            subtitle={ar91 > 0 ? `${formatCurrency(ar91, true)} 91+ days` : "No 91+ overdue"}
            status={ar91 > 0 ? 'critical' : arTotal > 50000 ? 'warning' : 'healthy'}
            icon={<Users size={18} />}
          />
          <KPICard
            title="A/P Total"
            value={formatCurrency(apTotal, true)}
            subtitle="Supplier payables"
            status={apAging && (apAging.totals.days61to90 + apAging.totals.days91plus) > 0 ? 'warning' : 'neutral'}
            icon={<Building2 size={18} />}
          />
          <KPICard
            title="PF Income (Latest)"
            value={formatCurrency(latestPFIncome, true)}
            subtitle={profitFirst?.latestWeek.weekLabel ?? "No PF data"}
            status="neutral"
            icon={<PiggyBank size={18} />}
          />
          <KPICard
            title="Active Alerts"
            value={String(criticalAlerts)}
            subtitle={`${alerts.filter(a => a.level === 'warning' && !a.resolved).length} warnings`}
            status={criticalAlerts > 0 ? 'critical' : 'healthy'}
            icon={<AlertTriangle size={18} />}
          />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L Summary Chart */}
        {plChartData.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
              P&L Summary
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={plChartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCurrency(v, true)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {plChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.value < 0 ? "var(--tec-red)" : i === 4 ? "var(--tec-green)" : "var(--tec-purple)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Balance Sheet Composition */}
        {bsChartData.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
              Balance Sheet Composition
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={bsChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {bsChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Insight box */}
      <div
        className="rounded-xl p-4 border"
        style={{
          background: "oklch(22% 0.16 310)",
          borderColor: "oklch(35% 0.18 310)",
          color: "oklch(90% 0.04 300)",
        }}
      >
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--tec-gold-light)", fontFamily: "'DM Serif Display', serif" }}>
          Tanya's Insight
        </h3>
        <p className="text-sm leading-relaxed opacity-90">
          {criticalAlerts > 0
            ? `There are ${criticalAlerts} critical issue${criticalAlerts > 1 ? 's' : ''} requiring immediate attention. Review the Alerts tab for full details and recommended actions.`
            : grossMargin > 0
            ? `Gross margin is at ${formatPercent(grossMargin)} — ${grossMargin >= 0.25 ? 'on target' : 'below the 25% benchmark'}. ${ar91 > 0 ? `A/R 91+ days totals ${formatCurrency(ar91)} — collections action required.` : 'A/R aging looks manageable.'}`
            : "Upload your QuickBooks reports to generate automated insights and alerts for this period."
          }
        </p>
      </div>
    </div>
  );
}
