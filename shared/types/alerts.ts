export type AlertLevel = 'critical' | 'warning' | 'info';

export type AlertCategory =
  | 'AR'
  | 'AP'
  | 'VAT'
  | 'ProfitFirst'
  | 'Cash'
  | 'Inventory'
  | 'Revenue'
  | 'StampTax'
  | 'DataMissing';

export interface Alert {
  id: string;
  level: AlertLevel;
  category: AlertCategory;
  title: string;
  detail: string;
  generatedAt: string;
  resolved: boolean;
  reportId?: number;
}
