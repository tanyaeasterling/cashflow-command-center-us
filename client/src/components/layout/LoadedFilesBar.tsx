import { X, FileText } from "lucide-react";
import { useReportStore } from "@/store/useReportStore";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ReportType } from "../../../../shared/types/reports";

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BalanceSheet:   { bg: "oklch(93% 0.04 310)", text: "oklch(30% 0.18 310)", border: "oklch(80% 0.08 310)" },
  ProfitLoss:     { bg: "oklch(94% 0.04 155)", text: "oklch(30% 0.12 155)", border: "oklch(80% 0.08 155)" },
  ARaging:        { bg: "oklch(95% 0.04 25)",  text: "oklch(35% 0.16 25)",  border: "oklch(82% 0.08 25)"  },
  APaging:        { bg: "oklch(96% 0.04 65)",  text: "oklch(35% 0.12 65)",  border: "oklch(82% 0.08 65)"  },
  VATDetail:      { bg: "oklch(95% 0.03 240)", text: "oklch(35% 0.12 240)", border: "oklch(82% 0.06 240)" },
  VATSummary:     { bg: "oklch(95% 0.03 240)", text: "oklch(35% 0.12 240)", border: "oklch(82% 0.06 240)" },
  ProfitFirst:    { bg: "oklch(94% 0.04 75)",  text: "oklch(35% 0.14 75)",  border: "oklch(82% 0.08 75)"  },
  SalesByProduct: { bg: "oklch(94% 0.03 200)", text: "oklch(35% 0.10 200)", border: "oklch(82% 0.06 200)" },
  CashFlows:      { bg: "oklch(94% 0.04 155)", text: "oklch(30% 0.12 155)", border: "oklch(80% 0.08 155)" },
  BankStatement:  { bg: "oklch(93% 0.03 280)", text: "oklch(35% 0.10 280)", border: "oklch(82% 0.06 280)" },
};

const TYPE_LABELS: Partial<Record<ReportType, string>> = {
  BalanceSheet: 'Balance Sheet',
  ProfitLoss: 'P&L',
  ARaging: 'A/R Aging',
  APaging: 'A/P Aging',
  VATDetail: 'VAT Detail',
  VATSummary: 'VAT Summary',
  ProfitFirst: 'Profit First',
  SalesByProduct: 'Sales by Product',
  CashFlows: 'Cash Flows',
  BankStatement: 'Bank Statement',
};

export function LoadedFilesBar() {
  const { uploadedFiles } = useReportStore();
  const removeReport = useReportStore(s => s.removeReport);
  const deleteMutation = trpc.reports.delete.useMutation();

  if (uploadedFiles.length === 0) return null;

  const handleRemove = async (file: typeof uploadedFiles[0]) => {
    if (file.dbId) {
      try {
        await deleteMutation.mutateAsync({ reportId: file.dbId });
      } catch {
        // ignore — still remove from local store
      }
    }
    // Properly remove from store (clears both uploadedFiles entry and report data)
    removeReport(file.reportType);
    toast.info(`${TYPE_LABELS[file.reportType] ?? file.reportType} removed`);
  };

  return (
    <div
      className="px-4 py-2 flex items-center gap-2 overflow-x-auto tab-bar-scroll"
      style={{
        background: "oklch(99% 0.003 300)",
        borderBottom: "1px solid oklch(90% 0.005 300)",
      }}
    >
      <span className="text-xs font-medium shrink-0" style={{ color: "oklch(55% 0.06 300)" }}>
        Loaded:
      </span>
      {uploadedFiles.map(file => {
        const colors = TYPE_COLORS[file.reportType] ?? { bg: "oklch(94% 0.02 300)", text: "oklch(40% 0.05 300)", border: "oklch(85% 0.04 300)" };
        const label = TYPE_LABELS[file.reportType] ?? file.reportType;

        return (
          <div
            key={file.id}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0 group"
            style={{
              background: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
            }}
          >
            <FileText size={10} />
            <span className="max-w-[120px] truncate" title={file.filename}>{label}</span>
            <button
              onClick={() => handleRemove(file)}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:opacity-70"
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
