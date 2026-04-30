import { useReportStore } from "@/store/useReportStore";
import { KPICard } from "@/components/ui/KPICard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/formatters";
import { Banknote } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export function CashPosition() {
  const { balanceSheet } = useReportStore();

  if (!balanceSheet) {
    return (
      <EmptyState
        title="Balance Sheet not loaded"
        description="Upload the Balance Sheet report to view cash position, sub-accounts, and liquidity analysis."
        reportType="Balance Sheet (QBO)"
        icon={<Banknote size={24} style={{ color: "var(--tec-purple)" }} />}
      />
    );
  }

  const cash = balanceSheet.assets.currentAssets.find(a => /cash/i.test(a.name))?.amount ?? 0;
  const totalCurrentAssets = balanceSheet.assets.currentAssets.reduce((s, a) => s + a.amount, 0);
  const totalCurrentLiabilities = balanceSheet.liabilities.currentLiabilities.reduce((s, l) => s + l.amount, 0);
  const currentRatio = totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : null;
  const pfSubAccounts = balanceSheet.pfSubAccounts ?? [];
  const vatSuspense = balanceSheet.vatSuspense ?? 0;
  const stampTax = balanceSheet.stampTaxProvision ?? 0;

  const currentAssetsChartData = balanceSheet.assets.currentAssets
    .filter(a => a.amount !== 0)
    .map(a => ({ name: a.name.length > 20 ? a.name.slice(0, 20) + '…' : a.name, value: a.amount }));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Cash on Hand"
          value={formatCurrency(cash, true)}
          status={cash > 50000 ? 'healthy' : cash > 20000 ? 'warning' : 'critical'}
          icon={<Banknote size={18} />}
        />
        <KPICard
          title="Total Current Assets"
          value={formatCurrency(totalCurrentAssets, true)}
          status="neutral"
        />
        <KPICard
          title="Current Liabilities"
          value={formatCurrency(totalCurrentLiabilities, true)}
          status="neutral"
        />
        <KPICard
          title="Current Ratio"
          value={currentRatio !== null ? currentRatio.toFixed(2) + 'x' : '—'}
          subtitle="Target: > 2.0x"
          status={currentRatio === null ? 'neutral' : currentRatio >= 2 ? 'healthy' : currentRatio >= 1.2 ? 'warning' : 'critical'}
        />
      </div>

      {/* Current Assets Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
            Current Assets Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={currentAssetsChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v, true)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {currentAssetsChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.value < 0 ? "var(--tec-red)" : "var(--tec-purple)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PF Sub-accounts */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--tec-purple-deep)" }}>
            Profit First Sub-Accounts
          </h3>
          {pfSubAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No PF sub-accounts detected in Balance Sheet.</p>
          ) : (
            <div className="space-y-2">
              {pfSubAccounts.map((acct, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm" style={{ color: "var(--tec-purple-deep)" }}>{acct.name}</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: acct.balance < 0 ? "var(--tec-red)" : "var(--tec-purple)" }}
                  >
                    {formatCurrency(acct.balance)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* VAT Suspense & Stamp Tax */}
          {(vatSuspense > 0 || stampTax > 0) && (
            <div className="mt-4 pt-3 border-t border-border space-y-2">
              {vatSuspense > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--tec-red)" }}>VAT Suspense</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--tec-red)" }}>
                    {formatCurrency(vatSuspense)}
                  </span>
                </div>
              )}
              {stampTax > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--tec-amber)" }}>Stamp Tax Provision</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--tec-amber)" }}>
                    {formatCurrency(stampTax)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full Balance Sheet table */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--tec-purple-deep)" }}>
          Balance Sheet Summary — As of {balanceSheet.asOfDate || 'Latest Period'} ({balanceSheet.basis} Basis)
        </h3>
        <div className="table-scroll-wrapper">
          <table className="w-full text-sm">
            <tbody>
              <tr className="bg-muted/40">
                <td className="py-1.5 px-3 font-semibold" style={{ color: "var(--tec-purple-deep)" }} colSpan={2}>ASSETS</td>
              </tr>
              {balanceSheet.assets.currentAssets.map((item, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1 px-3 pl-6 text-sm">{item.name}</td>
                  <td className="py-1 px-3 text-right font-medium" style={{ color: item.amount < 0 ? "var(--tec-red)" : "inherit" }}>
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/20 font-semibold">
                <td className="py-1.5 px-3">Total Assets</td>
                <td className="py-1.5 px-3 text-right" style={{ color: "var(--tec-purple)" }}>
                  {formatCurrency(balanceSheet.assets.totalAssets)}
                </td>
              </tr>
              <tr className="bg-muted/40">
                <td className="py-1.5 px-3 font-semibold" style={{ color: "var(--tec-purple-deep)" }} colSpan={2}>LIABILITIES</td>
              </tr>
              {balanceSheet.liabilities.currentLiabilities.map((item, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1 px-3 pl-6 text-sm">{item.name}</td>
                  <td className="py-1 px-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              <tr className="bg-muted/20 font-semibold">
                <td className="py-1.5 px-3">Total Liabilities</td>
                <td className="py-1.5 px-3 text-right" style={{ color: "var(--tec-red)" }}>
                  {formatCurrency(balanceSheet.liabilities.totalLiabilities)}
                </td>
              </tr>
              <tr className="bg-muted/20 font-semibold border-t-2 border-border">
                <td className="py-1.5 px-3">Total Equity</td>
                <td className="py-1.5 px-3 text-right" style={{ color: "var(--tec-green)" }}>
                  {formatCurrency(balanceSheet.equity.totalEquity)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
