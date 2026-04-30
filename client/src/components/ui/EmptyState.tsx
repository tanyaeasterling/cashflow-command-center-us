import { Upload, FileText } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

interface EmptyStateProps {
  title: string;
  description: string;
  reportType?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, reportType, icon }: EmptyStateProps) {
  const { setActiveTab } = useUIStore();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: "oklch(93% 0.04 310)" }}
      >
        {icon ?? <FileText size={24} style={{ color: "var(--tec-purple)" }} />}
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: "var(--tec-purple-deep)" }}>
        {title}
      </h3>
      <p className="text-sm max-w-sm" style={{ color: "oklch(55% 0.06 300)" }}>
        {description}
        {reportType && (
          <span className="block mt-1 font-medium" style={{ color: "var(--tec-purple)" }}>
            Expected: {reportType}
          </span>
        )}
      </p>
      <button
        onClick={() => setActiveTab('reports')}
        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: "var(--tec-purple)",
          color: "oklch(97% 0.005 300)",
        }}
      >
        <Upload size={14} />
        Upload Report
      </button>
    </div>
  );
}
