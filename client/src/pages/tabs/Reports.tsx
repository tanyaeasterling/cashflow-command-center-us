import { useReportStore } from "@/store/useReportStore";
import { UploadZone } from "@/components/layout/UploadZone";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { FileText, Download, Loader2, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { CLIENT_CONFIG } from "../../../../shared/config/usConfig";

export function Reports() {
  const { uploadedFiles, balanceSheet, profitLoss, arAging, apAging, alerts } = useReportStore();
  const exportMutation = trpc.reports.exportPDF.useMutation();

  const handleExportPDF = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        clientSlug: CLIENT_CONFIG.clientSlug,
        includeCharts: true,
      });

      // Create download link
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      link.click();
      toast.success("PDF report downloaded");
    } catch {
      toast.error("Failed to generate PDF report");
    }
  };

  const criticalCount = alerts.filter(a => a.level === 'critical' && !a.resolved).length;
  const warningCount = alerts.filter(a => a.level === 'warning' && !a.resolved).length;

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--tec-purple-deep)", fontFamily: "'DM Serif Display', serif" }}>
          Upload Financial Reports
        </h2>
        <p className="text-xs mb-4" style={{ color: "oklch(55% 0.06 300)" }}>
          Drag and drop or click to upload. Supports CSV, XLSX, XLS, PDF, DOCX.
          QuickBooks report types are auto-detected.
        </p>
        <UploadZone />
      </div>

      {/* Loaded files */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--tec-purple-deep)" }}>
            Loaded Reports ({uploadedFiles.length})
          </h3>
          <div className="space-y-2">
            {uploadedFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{ borderColor: "oklch(88% 0.005 300)", background: "oklch(99% 0.002 300)" }}
              >
                <FileText size={16} style={{ color: "var(--tec-purple)", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--tec-purple-deep)" }}>
                    {file.filename}
                  </p>
                  <p className="text-xs" style={{ color: "oklch(55% 0.06 300)" }}>
                    {file.reportType} · {new Date(file.uploadedAt).toLocaleString()}
                  </p>
                </div>
                <CheckCircle size={14} style={{ color: "var(--tec-green)", flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF Export */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--tec-purple-deep)" }}>
              Export Findings Report
            </h3>
            <p className="text-xs mt-1" style={{ color: "oklch(55% 0.06 300)" }}>
              Generates a branded PDF with executive summary, critical findings, recommended actions, and TEC contact footer.
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            disabled={exportMutation.isPending || uploadedFiles.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
            style={{
              background: uploadedFiles.length === 0 ? "oklch(88% 0.005 300)" : "var(--tec-purple)",
              color: uploadedFiles.length === 0 ? "oklch(60% 0.05 300)" : "oklch(97% 0.005 300)",
              cursor: uploadedFiles.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {exportMutation.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <Download size={14} />
            }
            {exportMutation.isPending ? "Generating…" : "Export Report"}
          </button>
        </div>

        {/* Report preview summary */}
        {uploadedFiles.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold mb-3" style={{ color: "oklch(55% 0.06 300)" }}>
              REPORT WILL INCLUDE
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tec-purple-deep)" }}>
                <CheckCircle size={12} style={{ color: "var(--tec-green)" }} />
                TEC Branding & Executive Summary
              </div>
              {balanceSheet && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tec-purple-deep)" }}>
                  <CheckCircle size={12} style={{ color: "var(--tec-green)" }} />
                  Balance Sheet — Total Assets: {formatCurrency(balanceSheet.assets.totalAssets, true)}
                </div>
              )}
              {profitLoss && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tec-purple-deep)" }}>
                  <CheckCircle size={12} style={{ color: "var(--tec-green)" }} />
                  P&L — Gross Margin: {formatPercent(profitLoss.grossMargin)}
                </div>
              )}
              {arAging && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tec-purple-deep)" }}>
                  <CheckCircle size={12} style={{ color: "var(--tec-green)" }} />
                  A/R Aging — Total: {formatCurrency(arAging.totals.total, true)}
                </div>
              )}
              {criticalCount > 0 && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tec-red)" }}>
                  <AlertTriangle size={12} />
                  {criticalCount} Critical Alert{criticalCount > 1 ? 's' : ''}
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tec-amber)" }}>
                  <AlertTriangle size={12} />
                  {warningCount} Warning{warningCount > 1 ? 's' : ''}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tec-purple-deep)" }}>
                <Info size={12} style={{ color: "oklch(50% 0.12 240)" }} />
                Recommended Actions & Next Steps
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tec-purple-deep)" }}>
                <CheckCircle size={12} style={{ color: "var(--tec-green)" }} />
                TEC Contact Footer — {CLIENT_CONFIG.schedulingLink}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supported report types */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--tec-purple-deep)" }}>
          Upload Checklist — US QBO Reports
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { type: 'Profit & Loss (CSV)', status: !!profitLoss },
            { type: 'Balance Sheet — Accrual (CSV)', status: !!balanceSheet },
            { type: 'Balance Sheet — Cash (CSV)', status: false },
            { type: 'A/R Aging Summary (CSV)', status: !!arAging },
            { type: 'A/P Aging Summary (CSV)', status: !!apAging },
            { type: 'Statement of Cash Flows (CSV)', status: false },
            { type: 'Sales by Product/Service Summary (CSV)', status: false },
            { type: 'Profit First Allocation Tracker (XLSX)', status: false },
          ].map(({ type, status }) => (
            <div key={type} className="flex items-center gap-2 text-xs py-1">
              {status
                ? <CheckCircle size={12} style={{ color: "var(--tec-green)" }} />
                : <div className="w-3 h-3 rounded-full border border-border" />
              }
              <span style={{ color: status ? "var(--tec-purple-deep)" : "oklch(60% 0.05 300)" }}>
                {type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
