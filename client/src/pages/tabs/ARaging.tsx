import { useReportStore } from "@/store/useReportStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { formatCurrency } from "@/lib/formatters";
import { Users, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export function ARaging() {
  const { arAging } = useReportStore();

  if (!arAging) {
    return (
      <EmptyState
        title="A/R Aging not loaded"
        description="Upload the Accounts Receivable Aging report from QuickBooks to view customer balances and overdue analysis."
        reportType="A/R Aging Detail (QBO)"
        icon={<Users size={24} style={{ color: "var(--tec-purple)" }} />}
      />
    );
  }

  const { rows, totals } = arAging;
  const overdue91 = totals.days91plus;
  const overdue31 = totals.days31to60 + totals.days61to90 + totals.days91plus;
  const criticalRows = rows.filter(r => r.days91plus > 0);

  // Chart data — top 10 customers by total
  const chartData = rows
    .filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(r => ({
      name: r.customer.length > 15 ? r.customer.slice(0, 15) + '…' : r.customer,
      Current: r.current,
      '1-30': r.days1to30,
      '31-60': r.days31to60,
      '61-90': r.days61to90,
      '91+': r.days91plus,
    }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total A/R" value={formatCurrency(totals.total, true)} status="neutral" icon={<Users size={18} />} />
        <KPICard title="Current" value={formatCurrency(totals.current, true)} status="healthy" />
        <KPICard
          title="31+ Days Overdue"
          value={formatCurrency(overdue31, true)}
          status={overdue31 > 5000 ? 'warning' : 'healthy'}
        />
        <KPICard
          title="91+ Days Overdue"
          value={formatCurrency(overdue91, true)}
          status={overdue91 > 0 ? 'critical' : 'healthy'}
          subtitle={overdue91 > 0 ? "Immediate action required" : "None"}
          icon={overdue91 > 0 ? <AlertTriangle size={18} /> : undefined}
        />
      </div>

      {/* Critical 91+ day customers */}
      {criticalRows.length > 0 && (
        <div
          className="rounded-xl p-4 border"
          style={{ background: "oklch(97% 0.02 25)", borderColor: "oklch(85% 0.08 25)" }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--tec-red)" }}>
            <AlertTriangle size={14} />
            Critical: 91+ Day Balances
          </h3>
          <div className="space-y-2">
            {criticalRows.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-red-100 last:border-0">
                <span className="text-sm font-medium" style={{ color: "var(--tec-purple-deep)" }}>{r.customer}</span>
                <span className="text-sm font-bold" style={{ color: "var(--tec-red)" }}>
                  {formatCurrency(r.days91plus)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stacked bar chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
            A/R Aging by Customer (Top 10)
          </h3>
          <div className="table-scroll-wrapper">
            <ResponsiveContainer width="100%" height={280} minWidth={500}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v, true)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Current" stackId="a" fill="var(--tec-green)" />
                <Bar dataKey="1-30" stackId="a" fill="var(--tec-gold)" />
                <Bar dataKey="31-60" stackId="a" fill="var(--tec-amber)" />
                <Bar dataKey="61-90" stackId="a" fill="oklch(55% 0.15 45)" />
                <Bar dataKey="91+" stackId="a" fill="var(--tec-red)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Full aging table */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--tec-purple-deep)" }}>
          Full A/R Aging Detail
        </h3>
        <div className="table-scroll-wrapper">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-semibold" style={{ color: "oklch(55% 0.06 300)" }}>Customer</th>
                <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: "oklch(55% 0.06 300)" }}>Current</th>
                <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: "oklch(55% 0.06 300)" }}>1-30</th>
                <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: "oklch(55% 0.06 300)" }}>31-60</th>
                <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: "oklch(55% 0.06 300)" }}>61-90</th>
                <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: "var(--tec-red)" }}>91+</th>
                <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: "oklch(55% 0.06 300)" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  style={{ background: r.days91plus > 0 ? "oklch(98% 0.01 25)" : undefined }}
                >
                  <td className="py-1.5 px-3 font-medium">{r.customer}</td>
                  <td className="py-1.5 px-3 text-right">{formatCurrency(r.current)}</td>
                  <td className="py-1.5 px-3 text-right">{formatCurrency(r.days1to30)}</td>
                  <td className="py-1.5 px-3 text-right">{formatCurrency(r.days31to60)}</td>
                  <td className="py-1.5 px-3 text-right">{formatCurrency(r.days61to90)}</td>
                  <td className="py-1.5 px-3 text-right font-semibold" style={{ color: r.days91plus > 0 ? "var(--tec-red)" : "inherit" }}>
                    {formatCurrency(r.days91plus)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-semibold">{formatCurrency(r.total)}</td>
                </tr>
              ))}
              <tr className="bg-muted/40 font-semibold border-t-2 border-border">
                <td className="py-2 px-3">TOTAL</td>
                <td className="py-2 px-3 text-right">{formatCurrency(totals.current)}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(totals.days1to30)}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(totals.days31to60)}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(totals.days61to90)}</td>
                <td className="py-2 px-3 text-right" style={{ color: totals.days91plus > 0 ? "var(--tec-red)" : "inherit" }}>
                  {formatCurrency(totals.days91plus)}
                </td>
                <td className="py-2 px-3 text-right" style={{ color: "var(--tec-purple)" }}>
                  {formatCurrency(totals.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
