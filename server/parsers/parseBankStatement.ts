import type { BankStatementData, BankStatementRow } from "../../shared/types/reports";
import { parseQBOAmount } from "./parseCSV";

export function parseBankStatement(rows: Record<string, string>[], meta?: { periodStart?: string; periodEnd?: string }): BankStatementData {
  const statementRows: BankStatementRow[] = [];

  for (const row of rows) {
    const date = row['Date'] ?? row['date'] ?? '';
    const description = row['Description'] ?? row['Memo'] ?? row['Payee'] ?? row['Name'] ?? '';
    if (!date && !description) continue;

    const debit = parseQBOAmount(row['Debit'] ?? row['Withdrawals'] ?? row['Out'] ?? '0');
    const credit = parseQBOAmount(row['Credit'] ?? row['Deposits'] ?? row['In'] ?? '0');
    const balance = parseQBOAmount(row['Balance'] ?? row['Running Balance'] ?? '0');

    statementRows.push({ date, description, debit, credit, balance });
  }

  const openingBalance = statementRows[0]?.balance ?? 0;
  const closingBalance = statementRows[statementRows.length - 1]?.balance ?? 0;
  const totalDebits = statementRows.reduce((s, r) => s + r.debit, 0);
  const totalCredits = statementRows.reduce((s, r) => s + r.credit, 0);

  return {
    accountName: '',
    periodStart: meta?.periodStart ?? '',
    periodEnd: meta?.periodEnd ?? '',
    rows: statementRows,
    openingBalance,
    closingBalance,
  };
}
