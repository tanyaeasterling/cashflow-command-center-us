import { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { KPICard } from "@/components/ui/KPICard";
import { formatCurrency } from "@/lib/formatters";
import { Receipt, AlertTriangle, CheckCircle } from "lucide-react";

const SALES_TAX_WARNING_THRESHOLD = 5000;

const FILING_FREQUENCIES = ["Monthly", "Quarterly", "Annual"] as const;
type FilingFrequency = typeof FILING_FREQUENCIES[number];

export function SalesTax() {
  const { balanceSheet } = useReportStore();
  const [filingFrequency, setFilingFrequency] = useState<FilingFrequency>("Quarterly");
  const [filingNote, setFilingNote] = useState("");

  const salesTaxPayable = balanceSheet?.salesTaxPayable ?? null;

  const status =
    salesTaxPayable === null ? "unknown"
    : salesTaxPayable === 0 ? "zero"
    : salesTaxPayable > SALES_TAX_WARNING_THRESHOLD ? "warning"
    : "stable";

  return (
    <div className="space-y-6 max-w-2xl">
      <div
        className="rounded-xl p-4 border flex items-start gap-3"
        style={{ background: "oklch(22% 0.16 310)", borderColor: "oklch(35% 0.18 310)" }}
      >
        <Receipt size={20} style={{ color: "var(--tec-gold)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--tec-gold-light)", fontFamily: "'DM Serif Display', serif" }}>
            Sales Tax Visibility
          </h3>
          <p className="text-xs mt-1" style={{ color: "oklch(75% 0.05 300)" }}>
            Tracks your Sales Tax Payable balance from the Balance Sheet. Upload an accrual-basis
            Balance Sheet to populate with live data.
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          title="Sales Tax Payable"
          value={salesTaxPayable !== null ? formatCurrency(salesTaxPayable) : "—"}
          subtitle={salesTaxPayable !== null ? "From Balance Sheet" : "Upload Balance Sheet"}
          status={status === "warning" ? "critical" : status === "zero" || status === "stable" ? "healthy" : "neutral"}
          icon={<Receipt size={18} />}
        />
        <KPICard
          title="Filing Frequency"
          value={filingFrequency}
          subtitle="Client-tracked setting"
          status="neutral"
        />
      </div>

      {/* Status card */}
      {salesTaxPayable !== null && (
        <div
          className="rounded-xl p-4 border flex items-start gap-3"
          style={{
            background: status === "warning" ? "oklch(97% 0.02 25)" : "oklch(97% 0.02 155)",
            borderColor: status === "warning" ? "oklch(85% 0.08 25)" : "oklch(85% 0.08 155)",
          }}
        >
          {status === "warning"
            ? <AlertTriangle size={16} style={{ color: "var(--tec-red)", flexShrink: 0, marginTop: 1 }} />
            : <CheckCircle size={16} style={{ color: "var(--tec-green)", flexShrink: 0, marginTop: 1 }} />
          }
          <p className="text-xs" style={{ color: status === "warning" ? "oklch(35% 0.12 25)" : "oklch(35% 0.12 155)" }}>
            {status === "warning"
              ? `Sales Tax Payable of ${formatCurrency(salesTaxPayable)} exceeds the $${SALES_TAX_WARNING_THRESHOLD.toLocaleString()} threshold. Verify your current filing period is up to date and that no payments are overdue.`
              : status === "zero"
              ? "Sales Tax Payable is zero. Confirm this is accurate for your filing period — zero balance may indicate payments are current or that tax is not being collected."
              : `Sales Tax Payable of ${formatCurrency(salesTaxPayable)} is within normal range. Continue monitoring each period.`
            }
          </p>
        </div>
      )}

      {/* Filing frequency setting */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--tec-purple-deep)" }}>
          Filing Frequency
        </h3>
        <div className="flex gap-2">
          {FILING_FREQUENCIES.map(freq => (
            <button
              key={freq}
              onClick={() => setFilingFrequency(freq)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                background: filingFrequency === freq ? "var(--tec-purple)" : "transparent",
                color: filingFrequency === freq ? "oklch(97% 0.005 300)" : "var(--tec-purple-deep)",
                borderColor: filingFrequency === freq ? "var(--tec-purple)" : "oklch(80% 0.05 300)",
              }}
            >
              {freq}
            </button>
          ))}
        </div>
      </div>

      {/* Notes field */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--tec-purple-deep)" }}>
          Filing Notes
        </h3>
        <textarea
          value={filingNote}
          onChange={e => setFilingNote(e.target.value)}
          placeholder="Note filing due dates, jurisdictions, or compliance reminders here…"
          rows={4}
          className="w-full text-sm rounded-lg border border-border p-3 resize-none"
          style={{ color: "var(--tec-purple-deep)", outline: "none" }}
        />
      </div>
    </div>
  );
}
