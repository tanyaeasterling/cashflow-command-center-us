import { parseQBOAmount } from "./parseCSV";

export interface SupplierBalanceRow {
  supplier: string;
  balance: number;
  currency?: string;
}

export interface SupplierBalanceData {
  asOfDate: string;
  rows: SupplierBalanceRow[];
  totalBalance: number;
}

export function parseSupplierBalance(rows: Record<string, string>[], meta?: { asOfDate?: string }): SupplierBalanceData {
  const balanceRows: SupplierBalanceRow[] = [];
  let totalBalance = 0;

  for (const row of rows) {
    const supplier = row['Vendor'] ?? row['Supplier'] ?? row['Name'] ?? '';
    if (!supplier || /^total/i.test(supplier)) continue;

    const balance = parseQBOAmount(row['Balance'] ?? row['Amount'] ?? row['Total'] ?? '0');
    const currency = row['Currency'] ?? row['Curr'] ?? undefined;

    balanceRows.push({ supplier, balance, currency });
    totalBalance += balance;
  }

  // Sort by balance descending
  balanceRows.sort((a, b) => b.balance - a.balance);

  return {
    asOfDate: meta?.asOfDate ?? '',
    rows: balanceRows,
    totalBalance,
  };
}
