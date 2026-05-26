import { useReportStore } from "@/store/useReportStore";
import { KPICard } from "@/components/ui/KPICard";
import { formatCurrency } from "@/lib/formatters";
import { CreditCard } from "lucide-react";

export function DebtService() {
  const { balanceSheet } = useReportStore();

  const totalLiabilities = balanceSheet?.liabilities?.totalLiabilities ?? 0;
  const totalEquity = balanceSheet?.equity?.totalEquity ?? 1;
  const debtToEquity = balanceSheet ? totalLiabilities / Math.max(totalEquity, 1) : null;

  return (
    <div className="space-y-6">
      {/* Balance-sheet-derived metrics — available without a debt schedule */}
      {balanceSheet && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KPICard
            title="Total Liabilities"
            value={formatCurrency(totalLiabilities, true)}
            subtitle="From Balance Sheet"
            status="neutral"
            icon={<CreditCard size={18} />}
          />
          <KPICard
            title="Debt-to-Equity"
            value={debtToEquity !== null ? `${debtToEquity.toFixed(2)}x` : "—"}
            subtitle="Target: < 2.0x"
            status={debtToEquity === null ? 'neutral' : debtToEquity <= 2 ? 'healthy' : debtToEquity <= 3 ? 'warning' : 'critical'}
          />
          <KPICard
            title="DSCR"
            value="—"
            subtitle="Requires debt schedule"
            status="neutral"
          />
        </div>
      )}

      {/* Empty state */}
      <div className="bg-white rounded-xl border border-border p-10 shadow-sm flex flex-col items-center justify-center text-center gap-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "oklch(93% 0.04 310)" }}
        >
          <CreditCard size={24} style={{ color: "var(--tec-purple)" }} />
        </div>
        <h3 className="text-base font-semibold" style={{ color: "var(--tec-purple-deep)" }}>
          No debt schedule configured
        </h3>
        <p className="text-sm max-w-sm" style={{ color: "oklch(55% 0.06 300)" }}>
          Add your loan and debt obligation details to enable DSCR calculations, monthly payment tracking, and amortization analysis.
        </p>
        <p className="text-xs" style={{ color: "oklch(65% 0.05 300)" }}>
          Contact Tanya Easterling Consulting to configure your debt schedule.
        </p>
      </div>
    </div>
  );
}
