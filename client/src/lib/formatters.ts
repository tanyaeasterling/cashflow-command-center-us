import { CLIENT_CONFIG } from "../../../shared/config/usConfig";

export function formatCurrency(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined) return "—";
  const symbol = CLIENT_CONFIG.currencySymbol;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (compact && abs >= 1_000_000) {
    return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (compact && abs >= 1_000) {
    return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
  }

  return `${sign}${symbol}${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function getStatusColor(status: 'healthy' | 'warning' | 'critical' | 'unknown'): string {
  switch (status) {
    case 'healthy':  return 'var(--tec-green)';
    case 'warning':  return 'var(--tec-amber)';
    case 'critical': return 'var(--tec-red)';
    default:         return 'oklch(60% 0.05 300)';
  }
}

export function getAlertLevelColor(level: 'critical' | 'warning' | 'info'): string {
  switch (level) {
    case 'critical': return 'var(--tec-red)';
    case 'warning':  return 'var(--tec-amber)';
    case 'info':     return 'oklch(50% 0.12 240)';
  }
}
