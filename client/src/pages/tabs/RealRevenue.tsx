import { useReportStore } from "@/store/useReportStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export function RealRevenue() {
  const { profitLoss } = useReportStore();

  if (!profitLoss) {
    return (
      <EmptyState
        title="P&L not loaded"
        description="Upload the Profit & Loss report to view real revenue analysis, margin breakdown, and expense composition."
        reportType="Profit & Loss (QBO)"
        icon={<TrendingUp size={24} style={{ color: "var(--tec-purple)" }} />}
      />
    );
  }

  const {
    totalIncome, totalCOGS, grossProfit, grossMargin,
    totalExpenses, netIncome, netMargin,
    income: incomeLines, expenses: expenseLines,
  } = profitLoss;
  const period = `${profitLoss.periodStart} – ${profitLoss.periodEnd}`;

  // Real Revenue = Gross Revenue - Returns/Refunds
  const returns = incomeLines.find(l => /return|refund/i.test(l.name))?.amount ?? 0;
  const realRevenue = totalIncome - Math.abs(returns);

  // Expense breakdown chart
  const expenseData = expenseLines
    .filter(e => e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map(e => ({
      name: e.name.length > 18 ? e.name.slice(0, 18) + '…' : e.name,
      value: e.amount,
    }));

  // Income sources chart
  const incomeData = incomeLines
    .filter(l => l.amount > 0)
    .map(l => ({ name: l.name.length > 20 ? l.name.slice(0, 20) + '…' : l.name, value: l.amount }));

  const PIE_COLORS = [
    "var(--tec-purple)", "var(--tec-gold)", "var(--tec-green)",
    "var(--tec-amber)", "var(--tec-red)", "oklch(50% 0.12 240)",
    "oklch(55% 0.10 180)", "oklch(60% 0.08 120)",
  ];

  const waterfallData = [
    { name: 'Revenue', value: totalIncome, fill: "var(--tec-purple)" },
    { name: 'COGS', value: -totalCOGS, fill: "var(--tec-red)" },
    { name: 'Gross Profit', value: grossProfit, fill: "var(--tec-green)" },
    { name: 'Expenses', value: -totalExpenses, fill: "var(--tec-amber)" },
    { name: 'Net Income', value: netIncome, fill: netIncome >= 0 ? "var(--tec-green)" : "var(--tec-red)" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(totalIncome, true)}
          subtitle={period ?? "Current Period"}
          status="neutral"
          icon={<TrendingUp size={18} />}
        />
        <KPICard
          title="Real Revenue"
          value={formatCurrency(realRevenue, true)}
          subtitle={returns > 0 ? `After ${formatCurrency(Math.abs(returns), true)} returns` : "No returns"}
          status="neutral"
        />
        <KPICard
          title="Gross Margin"
          value={formatPercent(grossMargin)}
          subtitle={`GP: ${formatCurrency(grossProfit, true)}`}
          status={grossMargin >= 0.25 ? 'healthy' : grossMargin >= 0.20 ? 'warning' : 'critical'}
        />
        <KPICard
          title="Net Margin"
          value={formatPercent(netMargin)}
          subtitle={`Net: ${formatCurrency(netIncome, true)}`}
          status={netIncome > 0 ? 'healthy' : 'critical'}
        />
      </div>

      {/* Waterfall chart */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
          P&L Waterfall — {period ?? "Current Period"}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={waterfallData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCurrency(v, true)} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {waterfallData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expense breakdown + Income sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {expenseData.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
              Expense Breakdown (Top 8)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={expenseData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v, true)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="var(--tec-amber)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {incomeData.length > 1 && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
              Revenue Sources
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={incomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {incomeData.map((_, i) => (
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

      {/* Full P&L table */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--tec-purple-deep)" }}>
          Profit & Loss Statement — {period ?? "Current Period"}
        </h3>
        <div className="table-scroll-wrapper">
          <table className="w-full text-sm">
            <tbody>
              <tr className="bg-muted/40">
                <td className="py-1.5 px-3 font-semibold" style={{ color: "var(--tec-purple-deep)" }} colSpan={2}>INCOME</td>
              </tr>
              {incomeLines.map((l, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1 px-3 pl-6 text-sm">{l.name}</td>
                  <td className="py-1 px-3 text-right font-medium" style={{ color: l.amount < 0 ? "var(--tec-red)" : "inherit" }}>
                    {formatCurrency(l.amount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/20 font-semibold">
                <td className="py-1.5 px-3">Total Income</td>
                <td className="py-1.5 px-3 text-right" style={{ color: "var(--tec-purple)" }}>{formatCurrency(totalIncome)}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-1.5 px-3 font-semibold">Cost of Goods Sold</td>
                <td className="py-1.5 px-3 text-right font-semibold" style={{ color: "var(--tec-red)" }}>{formatCurrency(totalCOGS)}</td>
              </tr>
              <tr className="bg-muted/20 font-semibold">
                <td className="py-1.5 px-3">Gross Profit</td>
                <td className="py-1.5 px-3 text-right" style={{ color: "var(--tec-green)" }}>{formatCurrency(grossProfit)}</td>
              </tr>
              <tr className="bg-muted/40">
                <td className="py-1.5 px-3 font-semibold" style={{ color: "var(--tec-purple-deep)" }} colSpan={2}>EXPENSES</td>
              </tr>
              {expenseLines.map((l, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1 px-3 pl-6 text-sm">{l.name}</td>
                  <td className="py-1 px-3 text-right font-medium">{formatCurrency(l.amount)}</td>
                </tr>
              ))}
              <tr className="bg-muted/20 font-semibold">
                <td className="py-1.5 px-3">Total Expenses</td>
                <td className="py-1.5 px-3 text-right" style={{ color: "var(--tec-amber)" }}>{formatCurrency(totalExpenses)}</td>
              </tr>
              <tr className="bg-muted/40 font-bold border-t-2 border-border">
                <td className="py-2 px-3">Net Income</td>
                <td className="py-2 px-3 text-right" style={{ color: netIncome >= 0 ? "var(--tec-green)" : "var(--tec-red)" }}>
                  {formatCurrency(netIncome)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
