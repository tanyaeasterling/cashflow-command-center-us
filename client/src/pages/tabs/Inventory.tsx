import { useReportStore } from "@/store/useReportStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { formatCurrency } from "@/lib/formatters";
import { Package } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export function Inventory() {
  const { balanceSheet, profitLoss, salesByProduct } = useReportStore();

  const inventoryValue =
    balanceSheet?.assets.currentAssets.find(a => /inventory/i.test(a.name))?.amount ?? null;

  const cogs = profitLoss?.totalCOGS ?? null;

  const turnover = inventoryValue && cogs && inventoryValue > 0
    ? cogs / inventoryValue
    : null;

  const daysInventory = turnover && turnover > 0
    ? 365 / turnover
    : null;

  const topProducts = salesByProduct?.rows
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10) ?? null;

  if (!balanceSheet && !salesByProduct) {
    return (
      <EmptyState
        title="No inventory data loaded"
        description="Upload your Balance Sheet (accrual basis) and Sales by Product/Service Summary to populate inventory metrics."
        icon={<Package size={24} style={{ color: "var(--tec-purple)" }} />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Inventory Value"
          value={inventoryValue !== null ? formatCurrency(inventoryValue, true) : "—"}
          subtitle="Balance Sheet — Current Assets"
          status="neutral"
          icon={<Package size={18} />}
        />
        <KPICard
          title="Inventory Turnover"
          value={turnover !== null ? `${turnover.toFixed(1)}x` : "—"}
          subtitle="COGS ÷ Inventory Value"
          status={turnover === null ? "neutral" : turnover >= 6 ? "healthy" : turnover >= 4 ? "warning" : "critical"}
        />
        <KPICard
          title="Days of Inventory"
          value={daysInventory !== null ? `${daysInventory.toFixed(0)} days` : "—"}
          subtitle="(Inventory ÷ COGS) × 365"
          status={daysInventory === null ? "neutral" : daysInventory <= 61 ? "healthy" : daysInventory <= 91 ? "warning" : "critical"}
        />
        <KPICard
          title="Top Products"
          value={topProducts ? String(topProducts.length) : "—"}
          subtitle="From Sales by Product report"
          status="neutral"
        />
      </div>

      {/* Top products table */}
      {topProducts ? (
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--tec-purple-deep)" }}>
            Top 10 Products by Revenue
          </h3>
          <div className="table-scroll-wrapper">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-border">
                  {['Product', 'Qty', 'Revenue', '% of Total'].map(h => (
                    <th
                      key={h}
                      className={`py-2 px-3 text-xs font-semibold ${h === 'Product' ? 'text-left' : 'text-right'}`}
                      style={{ color: "oklch(55% 0.06 300)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProducts.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium truncate max-w-[200px]">{row.product}</td>
                    <td className="py-2 px-3 text-right">{row.qty.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(row.amount)}</td>
                    <td className="py-2 px-3 text-right" style={{ color: "var(--tec-purple)" }}>
                      {row.percentOfTotal.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className="rounded-lg px-4 py-3 text-xs border flex items-center gap-2"
          style={{ background: "oklch(96% 0.02 240)", borderColor: "oklch(85% 0.06 240)", color: "oklch(40% 0.10 240)" }}
        >
          <Package size={12} />
          Upload a Sales by Product/Service Summary (CSV) to see top products by revenue.
        </div>
      )}

      {/* Revenue bar chart */}
      {topProducts && topProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
            Revenue by Product
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts.slice(0, 8)} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
              <XAxis dataKey="product" tick={{ fontSize: 10 }} tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {topProducts.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "var(--tec-purple)" : i < 3 ? "var(--tec-gold)" : "oklch(70% 0.08 310)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
