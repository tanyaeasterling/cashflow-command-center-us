import { describe, expect, it } from "vitest";

// ─── Parser tests ─────────────────────────────────────────────────────────────

describe("detectReportType", () => {
  it("detects Balance Sheet from filename", async () => {
    const { detectReportType } = await import("./parsers/detectReportType");
    const result = detectReportType("Balance_Sheet_2024.csv");
    expect(result.reportType).toBe("BalanceSheet");
  });

  it("detects P&L from filename", async () => {
    const { detectReportType } = await import("./parsers/detectReportType");
    const result = detectReportType("Profit_and_Loss_Q4.csv");
    expect(result.reportType).toBe("ProfitLoss");
  });

  it("detects A/R Aging from filename", async () => {
    const { detectReportType } = await import("./parsers/detectReportType");
    const result = detectReportType("AR_Aging_Detail.csv");
    expect(result.reportType).toBe("ARaging");
  });

  it("detects A/P Aging from filename", async () => {
    const { detectReportType } = await import("./parsers/detectReportType");
    const result = detectReportType("AP_Aging_Detail.csv");
    expect(result.reportType).toBe("APaging");
  });

  it("detects VAT Detail from filename", async () => {
    const { detectReportType } = await import("./parsers/detectReportType");
    const result = detectReportType("VAT_Tax_Detail.csv");
    expect(result.reportType).toBe("VATDetail");
  });

  it("detects Profit First from filename", async () => {
    const { detectReportType } = await import("./parsers/detectReportType");
    // PF Allocation matches the pf.?allocation pattern
    const result = detectReportType("PF_Allocation_Week10.xlsx");
    expect(result.reportType).toBe("ProfitFirst");
  });

  it("returns Unknown for unrecognised filename", async () => {
    const { detectReportType } = await import("./parsers/detectReportType");
    const result = detectReportType("random_document.pdf");
    expect(result.reportType).toBe("Unknown");
  });
});

// ─── CSV Parser tests ─────────────────────────────────────────────────────────

describe("parseQBOCSV", () => {
  it("parses a simple CSV buffer", async () => {
    const { parseQBOCSV } = await import("./parsers/parseCSV");
    const csv = `Date,Description,Amount\n2024-01-01,Sales,1000\n2024-01-02,Expense,-200`;
    const result = parseQBOCSV(Buffer.from(csv, "utf-8"));
    expect(result.rows.length).toBe(2);
    expect(result.rows[0]?.Date).toBe("2024-01-01");
  });

  it("handles QBO header quirks (extra blank rows)", async () => {
    const { parseQBOCSV } = await import("./parsers/parseCSV");
    const csv = `\n\nBalance Sheet\n\nDate,Description,Amount\n2024-01-01,Sales,1000`;
    const result = parseQBOCSV(Buffer.from(csv, "utf-8"));
    // Should find the data row
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── A/R Aging Parser tests ───────────────────────────────────────────────────

describe("parseARaging", () => {
  it("parses A/R aging rows correctly", async () => {
    const { parseARaging } = await import("./parsers/parseARaging");
    const rows = [
      { Customer: "Acme Corp", Current: "500", "1 - 30": "200", "31 - 60": "100", "61 - 90": "50", "> 90": "300", Total: "1150" },
      { Customer: "Beta Ltd", Current: "0", "1 - 30": "0", "31 - 60": "0", "61 - 90": "0", "> 90": "800", Total: "800" },
      // Parser uses the TOTAL row for totals
      { Customer: "TOTAL", Current: "500", "1 - 30": "200", "31 - 60": "100", "61 - 90": "50", "> 90": "1100", Total: "1950" },
    ];
    const result = parseARaging(rows);
    expect(result.rows.length).toBe(2);
    expect(result.totals.days91plus).toBe(1100);
    expect(result.totals.total).toBe(1950);
  });

  it("identifies 91+ day balances", async () => {
    const { parseARaging } = await import("./parsers/parseARaging");
    const rows = [
      { Customer: "Overdue Corp", Current: "0", "1 - 30": "0", "31 - 60": "0", "61 - 90": "0", "> 90": "5000", Total: "5000" },
    ];
    const result = parseARaging(rows);
    expect(result.rows[0]?.days91plus).toBe(5000);
  });
});

// ─── A/P Aging Parser tests ───────────────────────────────────────────────────

describe("parseAPaging", () => {
  it("parses A/P aging rows correctly", async () => {
    const { parseAPaging } = await import("./parsers/parseAPaging");
    const rows = [
      { Supplier: "Vendor A", Current: "1000", "1 - 30": "500", "31 - 60": "0", "61 - 90": "0", "> 90": "0", Total: "1500" },
      // Parser uses the TOTAL row for totals
      { Supplier: "TOTAL", Current: "1000", "1 - 30": "500", "31 - 60": "0", "61 - 90": "0", "> 90": "0", Total: "1500" },
    ];
    const result = parseAPaging(rows);
    expect(result.rows.length).toBe(1);
    expect(result.totals.total).toBe(1500);
  });
});

// ─── Alert Generator tests ────────────────────────────────────────────────────

describe("generateAlerts", () => {
  it("generates CRITICAL alert for 91+ day A/R", async () => {
    const { generateAlerts } = await import("./analysis/alertGenerator");
    const alerts = generateAlerts({
      arAging: {
        asOfDate: "2024-01-31",
        rows: [{ customer: "Overdue Corp", current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days91plus: 5000, total: 5000 }],
        totals: { customer: "TOTAL", current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days91plus: 5000, total: 5000 },
      },
    });
    const critical = alerts.filter(a => a.level === "critical" && a.category === "AR");
    expect(critical.length).toBeGreaterThan(0);
  });

  it("generates WARNING for low gross margin", async () => {
    const { generateAlerts } = await import("./analysis/alertGenerator");
    const alerts = generateAlerts({
      profitLoss: {
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        basis: "Cash",
        income: [{ name: "Sales", amount: 100000 }],
        totalIncome: 100000,
        costOfGoods: [{ name: "COGS", amount: 85000 }],
        totalCOGS: 85000,
        grossProfit: 15000,
        grossMargin: 0.15,
        expenses: [{ name: "Rent", amount: 5000 }],
        totalExpenses: 5000,
        netIncome: 10000,
        netMargin: 0.10,
      },
    });
    const marginAlerts = alerts.filter(a => a.category === "Revenue");
    expect(marginAlerts.length).toBeGreaterThan(0);
  });

  it("generates INFO alert when no data is provided", async () => {
    const { generateAlerts } = await import("./analysis/alertGenerator");
    const alerts = generateAlerts({});
    const infoAlerts = alerts.filter(a => a.level === "info");
    expect(infoAlerts.length).toBeGreaterThan(0);
  });

  it("generates VAT suspense alert when balance is high", async () => {
    const { generateAlerts } = await import("./analysis/alertGenerator");
    const alerts = generateAlerts({
      balanceSheet: {
        asOfDate: "2024-01-31",
        basis: "Cash",
        assets: {
          currentAssets: [{ name: "Cash", amount: 50000 }],
          fixedAssets: [],
          otherAssets: [],
          totalAssets: 50000,
        },
        liabilities: {
          currentLiabilities: [{ name: "VAT Suspense", amount: 8000 }],
          longTermLiabilities: [],
          totalLiabilities: 8000,
        },
        equity: { items: [], totalEquity: 42000 },
        vatSuspense: 8000,
      },
    });
    const vatAlerts = alerts.filter(a => a.category === "VAT");
    expect(vatAlerts.length).toBeGreaterThan(0);
  });
});

// ─── Auth logout test (existing) ──────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { appRouter } = await import("./routers");
    const { COOKIE_NAME } = await import("../shared/const");
    type CookieCall = { name: string; options: Record<string, unknown> };
    const clearedCookies: CookieCall[] = [];

    const ctx = {
      user: {
        id: 1, openId: "test-user", email: "test@example.com", name: "Test",
        loginMethod: "manus", role: "user" as const,
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as Parameters<typeof appRouter.createCaller>[0]["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as Parameters<typeof appRouter.createCaller>[0]["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

// ─── Trend Analysis tests ─────────────────────────────────────────────────────

describe("trendAnalysis", () => {
  it("calcMoMTrend returns correct changePercent", async () => {
    const { calcMoMTrend } = await import("./analysis/trendAnalysis");
    const data = [
      { label: "Jan", value: 100000 },
      { label: "Feb", value: 110000 },
      { label: "Mar", value: 99000 },
    ];
    const result = calcMoMTrend(data);
    expect(result.points.length).toBe(3);
    // Feb vs Jan: +10%
    expect(result.points[1]?.changePercent).toBeCloseTo(10, 1);
    // Mar vs Feb: ~-10%
    expect(result.points[2]?.changePercent).toBeCloseTo(-10, 0);
    expect(result.trend).toBe("down");
  });

  it("calcMoMTrend handles empty input", async () => {
    const { calcMoMTrend } = await import("./analysis/trendAnalysis");
    const result = calcMoMTrend([]);
    expect(result.points).toHaveLength(0);
    expect(result.trend).toBe("flat");
  });

  it("calcYoYTrend computes year-over-year change", async () => {
    const { calcYoYTrend } = await import("./analysis/trendAnalysis");
    const current = [10000, 12000, 11000];
    const prior   = [9000,  10000, 10000];
    const labels  = ["Jan", "Feb", "Mar"];
    const result = calcYoYTrend(current, prior, labels);
    expect(result.latestValue).toBe(33000);
    expect(result.latestChangeAbs).toBe(4000);
    expect(result.trend).toBe("up");
  });

  it("calcYoYTrend handles zero prior year", async () => {
    const { calcYoYTrend } = await import("./analysis/trendAnalysis");
    const result = calcYoYTrend([5000], [0], ["Jan"]);
    expect(result.latestChangePercent).toBeNull();
    expect(result.latestChangeAbs).toBe(5000);
  });

  it("calcPFWeeklyTrends returns per-bucket results", async () => {
    const { calcPFWeeklyTrends } = await import("./analysis/trendAnalysis");
    const weeks = [
      { label: "Week 1", buckets: { Payables: 50000, VAT: 3000 } },
      { label: "Week 2", buckets: { Payables: 52000, VAT: 3100 } },
    ];
    const result = calcPFWeeklyTrends(weeks);
    expect(result["Payables"]).toBeDefined();
    expect(result["VAT"]).toBeDefined();
    expect(result["Payables"]?.trend).toBe("up");
  });

  it("calcLinearSlope returns positive for upward series", async () => {
    const { calcLinearSlope } = await import("./analysis/trendAnalysis");
    const slope = calcLinearSlope([10, 20, 30, 40, 50]);
    expect(slope).toBeGreaterThan(0);
  });

  it("calcLinearSlope returns 0 for flat series", async () => {
    const { calcLinearSlope } = await import("./analysis/trendAnalysis");
    const slope = calcLinearSlope([100, 100, 100]);
    expect(slope).toBe(0);
  });
});
