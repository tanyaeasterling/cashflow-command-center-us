import { useReportStore } from "@/store/useReportStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { formatCurrency } from "@/lib/formatters";
import { Receipt, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export function VATForensics() {
  const { vatSummary, vatDetail, balanceSheet } = useReportStore();

  if (!vatSummary && !vatDetail) {
    return (
      <EmptyState
        title="VAT data not loaded"
        description="Upload the VAT Tax Detail or VAT Summary report from QuickBooks to perform forensic trace and allocation gap analysis."
        reportType="VAT Tax Detail (QBO)"
        icon={<Receipt size={24} style={{ color: "var(--tec-purple)" }} />}
      />
    );
  }

  const vatSuspense = balanceSheet?.vatSuspense ?? 0;
  const vatAtPort = vatSummary?.vatAtPort ?? 0;
  const vatCollected = vatSummary?.vatCollected ?? 0;
  const vatPaid = vatSummary?.vatPaid ?? 0;
  const netVATDue = vatSummary?.netVATDue ?? 0;

  // FIXED: safe guard on currentLiabilities which may be undefined from parser
  const currentLiabilities = balanceSheet?.liabilities?.currentLiabilities ?? [];
  const vatBSAccount = currentLiabilities.find(l => /vat/i.test(l.name))?.amount ?? 0;
  const allocationGap = vatCollected - vatBSAccount;

  const flags = [
    {
      label: "VAT Suspense Account",
      value: formatCurrency(vatSuspense),
      status: vatSuspense > 1000 ? 'critical' : 'healthy',
      detail: vatSuspense > 1000
        ? "Balance requires full forensic trace - likely misallocated import VAT"
        : "No significant suspense balance",
    },
    {
      label: "VAT at Port (Import VAT)",
      value: formatCurrency(vatAtPort),
      status: vatAtPort < 100 ? 'critical' : 'healthy',
      detail: vatAtPort < 100
        ? "Near zero - VAT paid on imports likely coded to wrong bucket"
        : "Import VAT appears correctly allocated",
    },
    {
      label: "Allocation Gap",
      value: formatCurrency(Math.abs(allocationGap)),
      status: Math.abs(allocationGap) > vatBSAccount * 0.2 ? 'warning' : 'healthy',
      detail: allocationGap > 0
        ? `VAT collected (${formatCurrency(vatCollected)}) exceeds BS account (${formatCurrency(vatBSAccount)}) - review allocation`
        : "Allocation appears consistent with Balance Sheet",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="VAT Collected" value={formatCurrency(vatCollected, true)} status="neutral" icon={<Receipt size={18} />} />
        <KPICard title="VAT Paid (Input)" value={formatCurrency(vatPaid, true)} status="neutral" />
        <KPICard
          title="VAT at Port"
          value={formatCurrency(vatAtPort, true)}
          status={vatAtPort < 100 ? 'critical' : 'healthy'}
          subtitle={vatAtPort < 100 ? "Possible misallocation" : "On target"}
        />
        <KPICard title="Net VAT Due" value={formatCurrency(netVATDue, true)} status={netVATDue > 0 ? 'warning' : 'healthy'} />
      </div>

      {vatSuspense > 1000 && (
        <div className="rounded-xl p-4 border" style={{ background: "oklch(97% 0.02 25)", borderColor: "oklch(85% 0.08 25)" }}>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--tec-red)" }}>
            <AlertTriangle size={14} />
            CRITICAL: VAT Suspense Account - {formatCurrency(vatSuspense)}
          </h3>
          <p className="text-sm" style={{ color: "oklch(40% 0.08 25)" }}>
            The VAT Suspense account has a balance of {formatCurrency(vatSuspense)}. This requires a full forensic trace
            to identify all misallocated transactions. Common cause: VAT paid on imports (VAT at Port) being coded to
            the Payables bucket instead of the VAT bucket.
          </p>
          <div className="mt-3 space-y-1">
            <p className="text-xs font-semibold" style={{ color: "var(--tec-red)" }}>Recommended Actions:</p>
            <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: "oklch(40% 0.08 25)" }}>
              <li>Run VAT Tax Detail report for full period - upload here</li>
              <li>Filter for transactions coded to VAT Suspense</li>
              <li>Reclassify import VAT entries to correct VAT bucket</li>
              <li>Reconcile suspense account to zero</li>
            </ol>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg mb-3" style={{ fontFamily: "'DM Serif Display', serif", color: "var(--tec-purple-deep)" }}>
          Forensic Audit Flags
        </h2>
        <div className="space-y-3">
          {flags.map((flag, i) => {
            const Icon = flag.status === 'healthy' ? CheckCircle : flag.status === 'critical' ? XCircle : AlertTriangle;
            const color = flag.status === 'healthy' ? "var(--tec-green)" : flag.status === 'critical' ? "var(--tec-red)" : "var(--tec-amber)";
            return (
              <div
                key={i}
                className="rounded-xl border p-4 flex items-start gap-3"
                style={{ background: "oklch(100% 0 0)", borderColor: "oklch(88% 0.005 300)", borderLeft: `4px solid ${color}` }}
              >
                <Icon size={18} style={{ color, flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--tec-purple-deep)" }}>{flag.label}</span>
                    <span className="text-sm font-bold" style={{ color }}>{flag.value}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "oklch(55% 0.06 300)" }}>{flag.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {vatDetail && vatDetail.rows.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--tec-purple-deep)" }}>
            VAT Transaction Detail ({vatDetail.rows.length} transactions)
          </h3>
          <div className="table-scroll-wrapper">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  {['Date', 'Type', 'Name', 'Tax Code', 'Tax Amount', 'Taxable Amount'].map(h => (
                    <th key={h} className={`py-2 px-2 font-semibold ${['Date','Type','Name'].includes(h) ? 'text-left' : 'text-right'}`}
                      style={{ color: "oklch(55% 0.06 300)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vatDetail.rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-1 px-2">{r.date}</td>
                    <td className="py-1 px-2">{r.txnType}</td>
                    <td className="py-1 px-2 max-w-[150px] truncate">{r.name}</td>
                    <td className="py-1 px-2">{r.taxCode}</td>
                    <td className="py-1 px-2 text-right">{formatCurrency(r.taxAmount)}</td>
                    <td className="py-1 px-2 text-right">{formatCurrency(r.taxableAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vatDetail.rows.length > 50 && (
              <p className="text-xs mt-2 text-center" style={{ color: "oklch(55% 0.06 300)" }}>
                Showing 50 of {vatDetail.rows.length} transactions
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
