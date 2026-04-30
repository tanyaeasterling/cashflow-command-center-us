import { useReportStore } from "@/store/useReportStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { formatCurrency } from "@/lib/formatters";
import { Building2, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export function APaging() {
  const { apAging } = useReportStore();

  if (!apAging) {
    return (
      <EmptyState
        title="A/P Aging not loaded"
        description="Upload the Accounts Payable Aging report from QuickBooks to view supplier balances and payment risk analysis."
        reportType="A/P Aging Detail (QBO)"
        icon={<Building2 size={24} style={{ color: "var(--tec-purple)" }} />}
      />
    );
  }

  const { rows, totals } = apAging;
  const overdue61 = totals.days61to90 + totals.days91plus;
  const riskRows = rows.filter(r => r.days61to90 > 0 || r.days91plus > 0);

  const chartData = rows
    .filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(r => ({
      name: r.supplier.length > 15 ? r.supplier.slice(0, 15) + '…' : r.supplier,
      Current: r.current,
      '1-30': r.days1to30,
      '31-60': r.days31to60,
      '61-90': r.days61to90,
      '91+': r.days91plus,
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total A/P" value={formatCurrency(totals.total, true)} status="neutral" icon={<Building2 size={18} />} />
        <KPICard title="Current" value={formatCurrency(totals.current, true)} status="healthy" />
        <KPICard title="31-60 Days" value={formatCurrency(totals.days31to60, true)} status={totals.days31to60 > 0 ? 'warning' : 'healthy'} />
        <KPICard
          title="61+ Days (Risk)"
          value={formatCurrency(overdue61, true)}
          status={overdue61 > 0 ? 'critical' : 'healthy'}
          subtitle={overdue61 > 0 ? "Supplier relationship risk" : "None"}
          icon={overdue61 > 0 ? <AlertTriangle size={18} /> : undefined}
        />
      </div>

      {riskRows.length > 0 && (
        <div
          className="rounded-xl p-4 border"
          style={{ background: "oklch(97% 0.02 65)", borderColor: "oklch(85% 0.08 65)" }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--tec-amber)" }}>
            <AlertTriangle size={14} />
            Supplier Relationship Risk: 61+ Day Balances
          </h3>
          <div className="space-y-2">
            {riskRows.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-amber-100 last:border-0">
                <span className="text-sm font-medium" style={{ color: "var(--tec-purple-deep)" }}>{r.supplier}</span>
                <span className="text-sm font-bold" style={{ color: "var(--tec-amber)" }}>
                  {formatCurrency(r.days61to90 + r.days91plus)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
            A/P Aging by Supplier (Top 10)
          </h3>
          <div className="table-scroll-wrapper">
            <ResponsiveContainer width="100%" height={280} minWidth={500}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v, true)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Current" stackId="a" fill="var(--tec-green)" />
                <Bar dataKey="1-30" stackId="a" fill="var(--tec-gold)" />
                <Bar dataKey="31-60" stackId="a" fill="var(--tec-amber)" />
                <Bar dataKey="61-90" stackId="a" fill="oklch(55% 0.15 45)" />
                <Bar dataKey="91+" stackId="a" fill="var(--tec-red)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--tec-purple-deep)" }}>
          Full A/P Aging Detail
        </h3>
        <div className="table-scroll-wrapper">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                {['Supplier', 'Current', '1-30', '31-60', '61-90', '91+', 'Total'].map(h => (
                  <th key={h} className={`py-2 px-3 text-xs font-semibold ${h === 'Supplier' ? 'text-left' : 'text-right'}`}
                    style={{ color: h === '91+' ? "var(--tec-red)" : "oklch(55% 0.06 300)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  style={{ background: (r.days61to90 + r.days91plus) > 0 ? "oklch(98% 0.01 65)" : undefined }}>
                  <td className="py-1.5 px-3 font-medium">{r.supplier}</td>
                  <td className="py-1.5 px-3 text-right">{formatCurrency(r.current)}</td>
                  <td className="py-1.5 px-3 text-right">{formatCurrency(r.days1to30)}</td>
                  <td className="py-1.5 px-3 text-right">{formatCurrency(r.days31to60)}</td>
                  <td className="py-1.5 px-3 text-right" style={{ color: r.days61to90 > 0 ? "var(--tec-amber)" : "inherit" }}>
                    {formatCurrency(r.days61to90)}
                  </td>
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
