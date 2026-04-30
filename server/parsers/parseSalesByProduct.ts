import type { SalesByProductData, SalesByProductRow } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

export function parseSalesByProduct(rows: Record<string, string>[], meta?: { periodStart?: string; periodEnd?: string }): SalesByProductData {
  const productRows: SalesByProductRow[] = [];
  let totalSales = 0;

  for (const row of rows) {
    const product = row['Product/Service'] ?? row['Product'] ?? row['Item'] ?? row['Name'] ?? '';
    if (!product || /^total/i.test(product)) continue;

    const qty = parseQBOAmount(row['Qty'] ?? row['Quantity'] ?? row['Units'] ?? '0');
    const amount = parseQBOAmount(row['Amount'] ?? row['Sales'] ?? row['Total'] ?? '0');
    if (amount === 0 && qty === 0) continue;

    productRows.push({ product, qty, amount, percentOfTotal: 0 });
    totalSales += amount;
  }

  // Calculate percentages
  for (const r of productRows) {
    r.percentOfTotal = totalSales > 0 ? (r.amount / totalSales) * 100 : 0;
  }

  // Sort by amount descending
  productRows.sort((a, b) => b.amount - a.amount);

  return {
    periodStart: meta?.periodStart ?? '',
    periodEnd: meta?.periodEnd ?? '',
    rows: productRows,
    totalSales,
  };
}
