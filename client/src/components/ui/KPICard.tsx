import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  status?: 'healthy' | 'warning' | 'critical' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export function KPICard({ title, value, subtitle, trend, trendLabel, status = 'neutral', icon, className = '' }: KPICardProps) {
  const statusColors = {
    healthy:  { accent: "var(--tec-green)",  bg: "oklch(97% 0.02 155)" },
    warning:  { accent: "var(--tec-amber)",  bg: "oklch(97% 0.02 65)"  },
    critical: { accent: "var(--tec-red)",    bg: "oklch(97% 0.02 25)"  },
    neutral:  { accent: "var(--tec-purple)", bg: "oklch(100% 0 0)"     },
  };

  const colors = statusColors[status];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? "var(--tec-green)" : trend === 'down' ? "var(--tec-red)" : "oklch(60% 0.05 300)";

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${className}`}
      style={{
        background: colors.bg,
        borderColor: "oklch(88% 0.005 300)",
        borderLeft: `4px solid ${colors.accent}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide truncate" style={{ color: "oklch(55% 0.06 300)" }}>
            {title}
          </p>
          <p className="text-2xl font-semibold mt-1 leading-none" style={{ color: "var(--tec-purple-deep)", fontFamily: "'DM Serif Display', serif" }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-1 truncate" style={{ color: "oklch(55% 0.06 300)" }}>
              {subtitle}
            </p>
          )}
          {trend && trendLabel && (
            <div className="flex items-center gap-1 mt-1.5">
              <TrendIcon size={11} style={{ color: trendColor }} />
              <span className="text-xs" style={{ color: trendColor }}>{trendLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className="p-2 rounded-lg shrink-0"
            style={{ background: `${colors.accent}20`, color: colors.accent }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
