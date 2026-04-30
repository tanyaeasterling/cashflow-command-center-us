import { useReportStore } from "@/store/useReportStore";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertTriangle, Info, CheckCircle, X, RefreshCw, Zap } from "lucide-react";
import type { Alert } from "../../../../shared/types/alerts";

const LEVEL_CONFIG = {
  critical: {
    icon: <AlertTriangle size={16} />,
    color: "var(--tec-red)",
    bg: "oklch(97% 0.02 25)",
    border: "oklch(85% 0.08 25)",
    badge: "badge-critical",
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    color: "var(--tec-amber)",
    bg: "oklch(97% 0.02 65)",
    border: "oklch(85% 0.08 65)",
    badge: "badge-warning",
  },
  info: {
    icon: <Info size={16} />,
    color: "oklch(50% 0.12 240)",
    bg: "oklch(97% 0.02 240)",
    border: "oklch(85% 0.06 240)",
    badge: "badge-info",
  },
};

function AlertCard({ alert, onResolve }: { alert: Alert; onResolve: (id: string) => void }) {
  const config = LEVEL_CONFIG[alert.level];

  return (
    <div
      className="rounded-xl border p-4 flex items-start gap-3 transition-opacity"
      style={{
        background: config.bg,
        borderColor: config.border,
        borderLeft: `4px solid ${config.color}`,
        opacity: alert.resolved ? 0.5 : 1,
      }}
    >
      <span style={{ color: config.color, flexShrink: 0, marginTop: 1 }}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${config.badge}`}
            >
              {alert.level.toUpperCase()}
            </span>
            <span className="text-xs font-medium" style={{ color: "oklch(55% 0.06 300)" }}>
              {alert.category}
            </span>
          </div>
          {!alert.resolved && (
            <button
              onClick={() => onResolve(alert.id)}
              className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
              title="Mark resolved"
            >
              <X size={13} style={{ color: "oklch(60% 0.05 300)" }} />
            </button>
          )}
        </div>
        <p className="text-sm font-semibold mt-1" style={{ color: "var(--tec-purple-deep)" }}>{alert.title}</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: "oklch(45% 0.06 300)" }}>{alert.detail}</p>
        {alert.resolved && (
          <span className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--tec-green)" }}>
            <CheckCircle size={11} /> Resolved
          </span>
        )}
      </div>
    </div>
  );
}

export function AlertsTab() {
  const { alerts, setAlerts, resolveAlert } = useReportStore();
  const generateMutation = trpc.alerts.generate.useMutation();

  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync({ clientSlug: 'cauls' });
      if (result.alerts) {
        setAlerts(result.alerts.map(a => ({
          ...a,
          id: String(Math.random()),
          resolved: false,
          generatedAt: new Date().toISOString(),
        })));
      }
      toast.success(`Generated ${result.count} alert${result.count !== 1 ? 's' : ''}`);
    } catch {
      toast.error("Failed to generate alerts");
    }
  };

  const handleResolve = (id: string) => {
    resolveAlert(id);
    toast.info("Alert marked as resolved");
  };

  const active = alerts.filter(a => !a.resolved);
  const resolved = alerts.filter(a => a.resolved);
  const critical = active.filter(a => a.level === 'critical');
  const warnings = active.filter(a => a.level === 'warning');
  const infos = active.filter(a => a.level === 'info');

  return (
    <div className="space-y-6">
      {/* Header with generate button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg" style={{ fontFamily: "'DM Serif Display', serif", color: "var(--tec-purple-deep)" }}>
            Alert Dashboard
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "oklch(55% 0.06 300)" }}>
            {active.length} active alert{active.length !== 1 ? 's' : ''} — {critical.length} critical, {warnings.length} warnings
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: "var(--tec-purple)",
            color: "oklch(97% 0.005 300)",
            opacity: generateMutation.isPending ? 0.7 : 1,
          }}
        >
          {generateMutation.isPending
            ? <RefreshCw size={14} className="animate-spin" />
            : <Zap size={14} />
          }
          {generateMutation.isPending ? "Analyzing…" : "Run Alert Analysis"}
        </button>
      </div>

      {/* Summary badges */}
      {active.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {critical.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold badge-critical">
              <AlertTriangle size={13} />
              {critical.length} Critical
            </div>
          )}
          {warnings.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold badge-warning">
              <AlertTriangle size={13} />
              {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
            </div>
          )}
          {infos.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold badge-info">
              <Info size={13} />
              {infos.length} Info
            </div>
          )}
        </div>
      )}

      {/* No alerts state */}
      {alerts.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: "oklch(93% 0.04 310)" }}
          >
            <Zap size={24} style={{ color: "var(--tec-purple)" }} />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: "var(--tec-purple-deep)" }}>
            No alerts generated yet
          </h3>
          <p className="text-sm max-w-sm" style={{ color: "oklch(55% 0.06 300)" }}>
            Upload financial reports and click "Run Alert Analysis" to automatically detect issues across A/R aging, VAT, cash position, and margins.
          </p>
        </div>
      )}

      {/* Critical alerts */}
      {critical.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--tec-red)" }}>
            <AlertTriangle size={14} /> Critical Issues
          </h3>
          <div className="space-y-3">
            {critical.map(a => <AlertCard key={a.id} alert={a} onResolve={handleResolve} />)}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--tec-amber)" }}>
            <AlertTriangle size={14} /> Warnings
          </h3>
          <div className="space-y-3">
            {warnings.map(a => <AlertCard key={a.id} alert={a} onResolve={handleResolve} />)}
          </div>
        </div>
      )}

      {/* Info */}
      {infos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "oklch(50% 0.12 240)" }}>
            <Info size={14} /> Informational
          </h3>
          <div className="space-y-3">
            {infos.map(a => <AlertCard key={a.id} alert={a} onResolve={handleResolve} />)}
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "oklch(55% 0.06 300)" }}>
            <CheckCircle size={14} /> Resolved ({resolved.length})
          </h3>
          <div className="space-y-2">
            {resolved.map(a => <AlertCard key={a.id} alert={a} onResolve={handleResolve} />)}
          </div>
        </div>
      )}
    </div>
  );
}
