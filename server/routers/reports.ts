// ─── CSV/Excel/Text parser dispatch ──────────────────────────────────────────
function dispatchCSVParser(reportType: string, rows: Record<string, string>[]): unknown {
  switch (reportType) {
    case "BalanceSheet":    return parseBalanceSheet(rows);
    case "ProfitLoss":      return parseProfitLoss(rows);
    case "ARaging":         return parseARaging(rows);
    case "APaging":         return parseAPaging(rows);
    case "SalesByProduct":  return parseSalesByProduct(rows);
    case "BankStatement":   return parseBankStatement(rows);
    case "CashFlows":       return parseCashFlows(rows);
    case "SupplierBalance": return parseSupplierBalance(rows);
    default:                return { rows };
  }
}

function dispatchExcelParser(
  reportType: string,
  result: ReturnType<typeof parseExcelFile>
): unknown {
  const firstSheet = result.sheets[0];
  const rawRows = (firstSheet?.rows ?? []) as Record<string, string>[];
  switch (reportType) {
    case "ProfitFirst":     return parseProfitFirst(result.sheets);
    case "BalanceSheet":    return parseBalanceSheet(rawRows);
    case "ProfitLoss":      return parseProfitLoss(rawRows);
    case "ARaging":         return parseARaging(rawRows);
    case "APaging":         return parseAPaging(rawRows);
    case "SalesByProduct":  return parseSalesByProduct(rawRows);
    case "BankStatement":   return parseBankStatement(rawRows);
    case "CashFlows":       return parseCashFlows(rawRows);
    case "SupplierBalance": return parseSupplierBalance(rawRows);
    default:                return { sheets: result.sheetNames };
  }
}

function dispatchTextParser(reportType: string, lines: string[]): unknown {
  switch (reportType) {
    case "CashFlows":       return parseCashFlows(lines.map(l => ({ "": l })));
    default:                return { lines: lines.slice(0, 50) };
  }
}
