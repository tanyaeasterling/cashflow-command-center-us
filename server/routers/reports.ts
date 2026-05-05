import { z } from "zod";
import { createHash } from "crypto";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { reports, alertsTable, clients, accessLog } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { detectReportType } from "../parsers/detectReportType";
import { parseQBOCSV } from "../parsers/parseCSV";
import { parseExcelFile } from "../parsers/parseExcel";
import { parsePDFFile } from "../parsers/parsePDF";
import { parseDocxFile } from "../parsers/parseDocx";
import { parseARaging } from "../parsers/parseARaging";
import { parseAPaging } from "../parsers/parseAPaging";
import { parseBalanceSheet } from "../parsers/parseBalanceSheet";
import { parseProfitLoss } from "../parsers/parseProfitLoss";
import { parseProfitFirst } from "../parsers/parseProfitFirst";
import { parseSalesByProduct } from "../parsers/parseSalesByProduct";
import { parseBankStatement } from "../parsers/parseBankStatement";
import { parseCashFlows } from "../parsers/parseCashFlows";
import { parseSupplierBalance } from "../parsers/parseSupplierBalance";
import { storagePut } from "../storage";
import { runStressTest } from "../analysis/stressTest";
import { nanoid } from "nanoid";
import type {
  BalanceSheetData, ProfitLossData, ARAgingData, APAgingData,
} from "../../shared/types/reports";
import { CLIENT_CONFIG } from "../../shared/config/caulsConfig";

export const reportsRouter = router({
  upload: protectedProcedure
    .input(z.object({
      filename: z.string(),
      mimeType: z.string(),
      base64Data: z.string(),
      clientSlug: z.string().default("cauls"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const buffer = Buffer.from(input.base64Data, "base64");
      const fileHash = createHash("sha256").update(buffer).digest("hex");
      const fileKey = `reports/${input.clientSlug}/${nanoid()}-${input.filename}`;
      const { url: storageUrl } = await storagePut(fileKey, buffer, input.mimeType);

      let textContent: string | undefined;
      if (input.mimeType.includes("text") || input.mimeType.includes("csv")) {
        textContent = buffer.toString("utf-8");
      }
      const { reportType } = detectReportType(input.filename, textContent);

      let parsedData: unknown = null;
      try {
        if (input.mimeType.includes("csv") || input.filename.endsWith(".csv")) {
          const csvResult = parseQBOCSV(buffer);
          parsedData = dispatchCSVParser(reportType, csvResult.rows);
        } else if (input.filename.match(/\.(xlsx|xls)$/i)) {
          const excelResult = parseExcelFile(buffer);
          parsedData = dispatchExcelParser(reportType, excelResult);
        } else if (input.mimeType.includes("pdf") || input.filename.endsWith(".pdf")) {
          const pdfResult = await parsePDFFile(buffer);
          parsedData = dispatchTextParser(reportType, pdfResult.lines);
        } else if (input.filename.endsWith(".docx")) {
          const docxResult = await parseDocxFile(buffer);
          parsedData = dispatchTextParser(reportType, docxResult.lines);
        }
      } catch (err) {
        console.error("[Parser] Error parsing file:", err);
        parsedData = { error: "Parse failed", raw: textContent?.slice(0, 500) };
      }

      const clientRows = await db.select().from(clients)
        .where(eq(clients.slug, input.clientSlug)).limit(1);
      let clientId = clientRows[0]?.id;
      if (!clientId) {
        const ins = await db.insert(clients)
          .values({ name: "CaulCo Inc.", slug: "cauls" });
        clientId = Number((ins as unknown as { insertId: number }).insertId);
      }

      const existingRows = await db.select({ id: reports.id }).from(reports)
        .where(and(
          eq(reports.clientId, clientId),
          eq(reports.reportType, reportType),
          eq(reports.superseded, false),
        ));
      const wasSuperseded = existingRows.length > 0;

      if (wasSuperseded) {
        await db.update(reports)
          .set({ superseded: true })
          .where(and(
            eq(reports.clientId, clientId),
            eq(reports.reportType, reportType),
            eq(reports.superseded, false),
          ));
      }

      const inserted = await db.insert(reports).values({
        clientId,
        reportType,
        filename: input.filename,
        mimeType: input.mimeType,
        fileSizeBytes: buffer.length,
        fileHash,
        uploadedBy: ctx.user.id,
        storageUrl,
        parsedData: parsedData as Record<string, unknown>,
        superseded: false,
      });

      const reportId = Number((inserted as unknown as { insertId: number }).insertId);

      await db.insert(accessLog).values({
        userId: ctx.user.id,
        clientId,
        action: "upload",
        detail: {
          reportId,
          reportType,
          filename: input.filename,
          fileSizeBytes: buffer.length,
          fileHash,
          wasSuperseded,
        },
      }).catch(() => { /* non-fatal */ });

      return {
        id: reportId,
        reportType,
        filename: input.filename,
        storageUrl,
        parsedData,
        wasSuperseded,
      };
    }),

  list: protectedProcedure
    .input(z.object({ clientSlug: z.string().default("cauls") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const clientRows = await db.select().from(clients)
        .where(eq(clients.slug, input.clientSlug)).limit(1);
      const clientId = clientRows[0]?.id;
      if (!clientId) return [];
      return db.select().from(reports)
        .where(and(eq(reports.clientId, clientId), eq(reports.superseded, false)))
        .orderBy(desc(reports.uploadedAt));
    }),

  delete: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.update(reports).set({ superseded: true })
        .where(eq(reports.id, input.reportId));
      return { success: true };
    }),

  runStressTest: protectedProcedure
    .input(z.object({
      clientSlug: z.string().default("cauls"),
      revenueChangePct: z.number().min(-50).max(50).default(0),
      expenseChangePct: z.number().min(-30).max(30).default(0),
      collectionDelayWeeks: z.number().min(0).max(8).default(0),
      inventoryBuildPct: z.number().min(0).max(50).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const clientRows = await db.select().from(clients)
        .where(eq(clients.slug, input.clientSlug)).limit(1);
      const clientId = clientRows[0]?.id;
      if (!clientId) return null;
      const allReports = await db.select().from(reports)
        .where(and(eq(reports.clientId, clientId), eq(reports.superseded, false)));
      const getReport = (type: string) =>
        allReports.find(r => r.reportType === type)?.parsedData;
      const pl = getReport("ProfitLoss") as ProfitLossData | undefined;
      const bs = getReport("BalanceSheet") as BalanceSheetData | undefined;
      const baseMonthlyRevenue = pl?.totalIncome ?? 0;
      const baseMonthlyExpenses = (pl?.totalExpenses ?? 0) + (pl?.totalCOGS ?? 0);
      const currentAssets = bs?.assets?.currentAssets ?? [];
      const currentCash = currentAssets.find((a: {name: string; amount: number}) => /cash/i.test(a.name))?.amount ?? 0;
      return runStressTest({
        baseWeeklyRevenue: baseMonthlyRevenue / 4,
        baseWeeklyExpenses: baseMonthlyExpenses / 4,
        currentCash,
        revenueChangePct: input.revenueChangePct,
        expenseChangePct: input.expenseChangePct,
        collectionDelayWeeks: input.collectionDelayWeeks,
        inventoryBuildPct: input.inventoryBuildPct,
      });
    }),

  exportPDF: protectedProcedure
    .input(z.object({
      clientSlug: z.string().default("cauls"),
      includeCharts: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const clientRows = await db.select().from(clients)
        .where(eq(clients.slug, input.clientSlug)).limit(1);
      const clientId = clientRows[0]?.id;
      const allReports = clientId
        ? await db.select().from(reports)
            .where(and(eq(reports.clientId, clientId), eq(reports.superseded, false)))
        : [];
      const getReport = (type: string) =>
        allReports.find(r => r.reportType === type)?.parsedData;
      const bs = getReport("BalanceSheet") as BalanceSheetData | undefined;
      const pl = getReport("ProfitLoss") as ProfitLossData | undefined;
      const ar = getReport("ARaging") as ARAgingData | undefined;
      const ap = getReport("APaging") as APAgingData | undefined;
      const activeAlerts = clientId
        ? await db.select().from(alertsTable)
            .where(and(eq(alertsTable.clientId, clientId), eq(alertsTable.resolved, false)))
        : [];
      const criticals = activeAlerts.filter(a => a.level === "critical");
      const warnings = activeAlerts.filter(a => a.level === "warning");
      const now = new Date().toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>TEC Cashflow Findings Report</title>
<style>
  body { font-family: 'Georgia', serif; margin: 0; padding: 40px; color: #1a0a2e; background: white; }
  .header { border-bottom: 3px solid #b8860b; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 28px; margin: 0 0 4px; color: #1a0a2e; }
  .header .subtitle { font-size: 13px; color: #666; font-family: sans-serif; }
  .section { margin-bottom: 28px; }
  .section h2 { font-size: 18px; color: #1a0a2e; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; font-family: sans-serif; }
  .kpi-value { font-size: 22px; font-weight: bold; color: #1a0a2e; margin-top: 4px; }
  .alert-box { border-radius: 8px; padding: 14px; margin-bottom: 10px; }
  .alert-critical { background: #fef2f2; border-left: 4px solid #dc2626; }
  .alert-warning { background: #fffbeb; border-left: 4px solid #d97706; }
  .alert-title { font-weight: bold; font-size: 13px; margin-bottom: 4px; font-family: sans-serif; }
  .alert-detail { font-size: 12px; color: #555; font-family: sans-serif; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #b8860b; font-family: sans-serif; font-size: 11px; color: #666; }
  .footer strong { color: #1a0a2e; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: sans-serif; }
  th { background: #f3f4f6; padding: 8px; text-align: left; font-weight: 600; }
  td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
</style>
</head>
<body>
<div class="header">
  <h1>Cashflow Findings Report</h1>
  <div class="subtitle">Tanya Easterling Consulting - ${CLIENT_CONFIG.clientName} - Generated ${now}</div>
</div>
<div class="section">
  <h2>Executive Summary</h2>
  <div class="kpi-grid">
    ${bs ? `<div class="kpi-box"><div class="kpi-label">Total Assets</div><div class="kpi-value">$${(bs.assets.totalAssets / 1000).toFixed(0)}K</div></div>` : ""}
    ${pl ? `<div class="kpi-box"><div class="kpi-label">Gross Margin</div><div class="kpi-value">${(pl.grossMargin * 100).toFixed(1)}%</div></div>` : ""}
    ${pl ? `<div class="kpi-box"><div class="kpi-label">Net Income</div><div class="kpi-value">$${(pl.netIncome / 1000).toFixed(0)}K</div></div>` : ""}
    ${ar ? `<div class="kpi-box"><div class="kpi-label">A/R Total</div><div class="kpi-value">$${(ar.totals.total / 1000).toFixed(0)}K</div></div>` : ""}
    ${ap ? `<div class="kpi-box"><div class="kpi-label">A/P Total</div><div class="kpi-value">$${(ap.totals.total / 1000).toFixed(0)}K</div></div>` : ""}
    <div class="kpi-box"><div class="kpi-label">Active Alerts</div><div class="kpi-value">${criticals.length + warnings.length}</div></div>
  </div>
</div>
${criticals.length > 0 ? `<div class="section"><h2>Critical Issues</h2>${criticals.map(a => `<div class="alert-box alert-critical"><div class="alert-title">${a.title}</div><div class="alert-detail">${a.detail}</div></div>`).join("")}</div>` : ""}
${warnings.length > 0 ? `<div class="section"><h2>Warnings</h2>${warnings.map(a => `<div class="alert-box alert-warning"><div class="alert-title">${a.title}</div><div class="alert-detail">${a.detail}</div></div>`).join("")}</div>` : ""}
<div class="section">
  <h2>Recommended Actions</h2>
  <ol style="font-family:sans-serif;font-size:13px;line-height:1.8;">
    ${criticals.map(a => `<li><strong>${a.category}:</strong> ${a.title}</li>`).join("")}
    ${warnings.map(a => `<li>${a.title}</li>`).join("")}
    ${criticals.length + warnings.length === 0 ? "<li>No critical actions required at this time.</li>" : ""}
  </ol>
</div>
<div class="footer">
  <strong>Tanya Easterling Consulting</strong><br>
  Schedule a review: ${CLIENT_CONFIG.schedulingLink}<br>
  This report was generated automatically by the CaulCo Cashflow Command Center.
</div>
</body>
</html>`;
      const pdfKey = `exports/${input.clientSlug}/findings-${Date.now()}.html`;
      const { url } = await storagePut(pdfKey, Buffer.from(htmlContent, "utf-8"), "text/html");
      return {
        url,
        filename: `TEC-Findings-${now.replace(/\s/g, "-")}.html`,
        generatedAt: new Date().toISOString(),
      };
    }),
});

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
