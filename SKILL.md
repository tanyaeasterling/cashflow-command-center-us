# CaulCo Cashflow Command Center — Architecture & Extension Guide

**Version:** 1.0 · **Generated:** April 2026  
**Purpose:** This document is a complete technical audit of the CaulCo Cashflow Command Center codebase. It is written for an AI system (Claude or equivalent) that needs to understand, audit, extend, or adapt this application for new clients. No existing code is modified by this document.

---

## 1. App Overview

### Purpose

The CaulCo Cashflow Command Center is a **multi-tenant, role-gated financial analysis dashboard** built for Tanya Easterling Consulting (TEC). It ingests QuickBooks Online (QBO) report exports in multiple formats, parses them server-side, stores them in a MySQL database with per-client isolation, and renders a 13-tab analytical dashboard with real-time stress testing, alert generation, and PDF export.

The primary client is **CaulCo Inc.** (slug: `cauls`), a Grenada-based retail business with multiple inventory locations, active foreign import orders, VAT obligations, and a Profit First cash management system.

### Architectural Decisions

The application is built on the **Manus web-app template** (React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL). Key architectural decisions made during the build are as follows.

**tRPC over REST.** All client-server communication uses tRPC procedures. This gives end-to-end TypeScript type safety from the server parser output through to the React component that renders it, with no manual interface duplication.

**Server-side parsing.** All file parsing (CSV, Excel, PDF, DOCX) happens inside tRPC mutations on the Express server, not in the browser. This keeps parsing logic testable, keeps large libraries (SheetJS, pdf-parse, mammoth) out of the client bundle, and ensures raw file bytes are uploaded to S3 before parsing begins.

**Zustand for client state.** Parsed report data lives in a Zustand store (`useReportStore`) rather than React Query cache. This is intentional: the dashboard is a single-session analytical tool where data is loaded once per session, not refetched on a timer. Zustand provides simpler, more direct access across 13 tab components without prop drilling.

**One report slot per type.** The store enforces a one-active-report-per-type rule. Uploading a second Balance Sheet replaces the first both in the Zustand store (client) and in the `reports` table (server, via `superseded = true`). This prevents stale data from silently persisting across sessions.

**Static client config as the source of truth.** Client-specific constants (Profit First targets, ratio thresholds, role permissions, engagement flags, scheduling link) live in `shared/config/caulsConfig.ts`. The database `clients` table can store a JSON `config` blob that overrides this, but the static file is the authoritative fallback. This means the app works without a seeded database row.

**HTML export, not server-rendered PDF.** The `exportPDF` tRPC procedure generates a styled HTML string, uploads it to S3, and returns the URL. The client downloads it as a `.html` file. True PDF rendering (e.g., via Puppeteer or WeasyPrint) is a known future enhancement.

**Manus OAuth for authentication.** The app uses the Manus platform's built-in OAuth system. There is no custom login form or password management. Users must have a Manus account to access the dashboard.

---

## 2. File Structure

The project root is `/home/ubuntu/cauls-cashflow/`. All paths below are relative to that root.

```
cauls-cashflow/
├── SKILL.md                          ← This document
├── todo.md                           ← Feature tracking checklist
├── package.json                      ← Dependencies and scripts
├── tsconfig.json                     ← TypeScript configuration
├── vite.config.ts                    ← Vite build config (client)
├── vitest.config.ts                  ← Test runner configuration
├── drizzle.config.ts                 ← Drizzle ORM config (DB URL, schema path)
│
├── drizzle/
│   ├── schema.ts                     ← All DB table definitions (source of truth)
│   ├── relations.ts                  ← Drizzle relation helpers
│   ├── 0000_wakeful_skrulls.sql      ← Initial migration (users table)
│   └── 0001_magical_garia.sql        ← Feature migration (clients, reports, alerts, pf_snapshots)
│
├── shared/
│   ├── const.ts                      ← Cookie name and other shared constants
│   ├── types.ts                      ← Re-exports from shared/types/*
│   ├── config/
│   │   └── caulsConfig.ts            ← ALL client-specific constants (replace for new clients)
│   └── types/
│       ├── reports.ts                ← TypeScript interfaces for all 15 report data shapes
│       ├── alerts.ts                 ← Alert, AlertLevel, AlertCategory types
│       └── ratios.ts                 ← RatioResult, RatiosData types
│
├── server/
│   ├── db.ts                         ← Drizzle instance + user upsert helpers
│   ├── storage.ts                    ← S3 storagePut/storageGet wrappers
│   ├── routers.ts                    ← Top-level tRPC router composition
│   ├── auth.logout.test.ts           ← Template auth test (always passes)
│   ├── cashflow.test.ts              ← Domain unit tests (25 tests)
│   │
│   ├── routers/
│   │   ├── reports.ts                ← upload, list, delete, exportPDF procedures
│   │   ├── alerts.ts                 ← generate, list, resolve, clear procedures
│   │   ├── users.ts                  ← list, me, updateRole procedures (RBAC)
│   │   └── clientsRouter.ts          ← get procedure (DB + static config merge)
│   │
│   ├── parsers/
│   │   ├── detectReportType.ts       ← Filename + content pattern matcher → ReportType
│   │   ├── parseCSV.ts               ← QBO CSV normaliser (strips headers, parses rows)
│   │   ├── parseExcel.ts             ← SheetJS wrapper → ExcelSheet[] with formula values
│   │   ├── parsePDF.ts               ← pdf-parse wrapper → string[] of lines
│   │   ├── parseDocx.ts              ← mammoth wrapper → string[] of lines
│   │   ├── parseBalanceSheet.ts      ← CSV rows → BalanceSheetData
│   │   ├── parseProfitLoss.ts        ← CSV rows → ProfitLossData
│   │   ├── parseARaging.ts           ← CSV rows → ARAgingData
│   │   ├── parseAPaging.ts           ← CSV rows → APAgingData
│   │   ├── parseProfitFirst.ts       ← Excel sheets (Week 1–10) → ProfitFirstData
│   │   ├── parseSalesByProduct.ts    ← CSV rows → SalesByProductData
│   │   ├── parseBankStatement.ts     ← CSV rows → BankStatementData
│   │   ├── parseCashFlows.ts         ← CSV rows → CashFlowsData
│   │   ├── parsePLByMonth.ts         ← CSV rows → PLByMonth/PLComparison data
│   │   └── parseSupplierBalance.ts   ← CSV rows → SupplierBalance data
│   │
│   └── analysis/
│       ├── alertGenerator.ts         ← generateAlerts(AlertInput) → Alert[]
│       ├── ratioCalculations.ts      ← calculateRatios(RatioInputs) → RatiosData
│       ├── stressTest.ts             ← runStressTest(StressTestInputs) → StressTestResult
│       └── trendAnalysis.ts          ← MoM, YoY, PF weekly, linear slope utilities
│
└── client/
    ├── index.html                    ← HTML shell (Google Fonts: DM Sans, DM Serif Display)
    └── src/
        ├── main.tsx                  ← React root, tRPC provider, QueryClient
        ├── App.tsx                   ← Routes: / and /dashboard → Dashboard, /404 → NotFound
        ├── index.css                 ← Global CSS variables (TEC brand tokens, Tailwind base)
        │
        ├── lib/
        │   ├── trpc.ts               ← createTRPCReact<AppRouter> binding
        │   └── formatters.ts         ← formatCurrency, formatPercent, formatDate helpers
        │
        ├── store/
        │   ├── useReportStore.ts     ← Zustand: parsed report data + alerts + duplicate state
        │   └── useUIStore.ts         ← Zustand: activeTab, isUploading, sidebarOpen
        │
        ├── components/
        │   ├── layout/
        │   │   ├── Header.tsx        ← Sticky header: TEC branding, client badge, schedule copy, logout
        │   │   ├── TabBar.tsx        ← 13-tab horizontal scroll bar with data-dot indicators
        │   │   ├── UploadZone.tsx    ← Drag-drop file upload with duplicate banner
        │   │   └── LoadedFilesBar.tsx ← Horizontal pill list of loaded files with remove action
        │   └── ui/
        │       ├── KPICard.tsx       ← Reusable metric card (label, value, delta, status colour)
        │       └── EmptyState.tsx    ← Reusable empty-state prompt with upload CTA
        │
        └── pages/
            ├── Dashboard.tsx         ← Auth guard + layout shell + TabContent switch
            ├── Home.tsx              ← Redirects to /dashboard (unused landing page)
            ├── NotFound.tsx          ← 404 page
            └── tabs/
                ├── Overview.tsx      ← 8 KPIs, P&L chart, BS pie, engagement flags, Tanya's Insight
                ├── CashPosition.tsx  ← Cash KPIs, bank statement chart, cash flow waterfall
                ├── ProfitFirst.tsx   ← 15 bucket cards, allocation bar, weekly trend chart
                ├── ARaging.tsx       ← Customer aging table, stacked bar chart, 91+ highlight
                ├── APaging.tsx       ← Supplier aging table, horizontal bar chart
                ├── VATForensics.tsx  ← VAT collected/paid/suspense/at-port KPIs, detail table
                ├── Inventory.tsx     ← Location cards with GMROI/days cover, value chart
                ├── RealRevenue.tsx   ← Revenue waterfall, margin trend, PF real revenue bucket
                ├── DebtService.tsx   ← Debt schedule table, DSCR KPI, paydown projection
                ├── StressTest.tsx    ← 5 sliders, 6 KPI cards, base-vs-stress bar chart
                ├── AlertsTab.tsx     ← Filterable alert list with resolve action
                ├── Reports.tsx       ← Upload zone, loaded-files list, PDF export, report checklist
                └── Settings.tsx      ← User profile, permissions, client config, user management
```

---

## 3. Component Inventory

### Layout Components

| Component | File | Props | State Owned | State Read | Renders |
|---|---|---|---|---|---|
| `Header` | `layout/Header.tsx` | none | `copied: boolean` | `useAuth().user`, `useUIStore.sidebarOpen` | TEC brand bar, client badge, schedule-copy button, logout |
| `TabBar` | `layout/TabBar.tsx` | none | none | `useUIStore.activeTab`, `useReportStore.*` | 13 sticky tab buttons with data dots and alert count badge |
| `UploadZone` | `layout/UploadZone.tsx` | none | `isDragging`, `uploads: UploadState[]` | `useReportStore.duplicateBanner` | Drag-drop zone, duplicate banner, per-file status list |
| `LoadedFilesBar` | `layout/LoadedFilesBar.tsx` | none | none | `useReportStore.uploadedFiles` | Horizontal scrollable pill list of loaded files |

### UI Primitives

| Component | File | Props | Renders |
|---|---|---|---|
| `KPICard` | `ui/KPICard.tsx` | `label`, `value`, `delta?`, `status?: 'healthy'|'warning'|'critical'|'neutral'`, `icon?`, `prefix?`, `suffix?` | Metric card with coloured status border |
| `EmptyState` | `ui/EmptyState.tsx` | `title`, `description`, `icon?` | Centred empty-state box with upload prompt |

### Page Components

| Component | File | Auth Required | Primary Data Sources |
|---|---|---|---|
| `Dashboard` | `pages/Dashboard.tsx` | Yes (redirects to login) | `useAuth`, `useUIStore.activeTab` |
| `Overview` | `tabs/Overview.tsx` | Via Dashboard | `balanceSheet`, `profitLoss`, `arAging`, `apAging`, `profitFirst`, `alerts` |
| `CashPosition` | `tabs/CashPosition.tsx` | Via Dashboard | `balanceSheet`, `cashFlows`, `bankStatement` |
| `ProfitFirst` | `tabs/ProfitFirst.tsx` | Via Dashboard | `profitFirst` |
| `ARaging` | `tabs/ARaging.tsx` | Via Dashboard | `arAging` |
| `APaging` | `tabs/APaging.tsx` | Via Dashboard | `apAging` |
| `VATForensics` | `tabs/VATForensics.tsx` | Via Dashboard | `vatSummary`, `vatDetail`, `balanceSheet` |
| `Inventory` | `tabs/Inventory.tsx` | Via Dashboard | `salesByProduct`, `balanceSheet` |
| `RealRevenue` | `tabs/RealRevenue.tsx` | Via Dashboard | `profitLoss`, `profitFirst` |
| `DebtService` | `tabs/DebtService.tsx` | Via Dashboard | `balanceSheet`, `profitLoss` |
| `StressTest` | `tabs/StressTest.tsx` | Via Dashboard | `profitLoss`, `balanceSheet`, `arAging` (optional) |
| `AlertsTab` | `tabs/AlertsTab.tsx` | Via Dashboard | `alerts` |
| `Reports` | `tabs/Reports.tsx` | Via Dashboard | `uploadedFiles`, `alerts`, `trpc.reports.exportPDF` |
| `Settings` | `tabs/Settings.tsx` | Via Dashboard | `useAuth().user`, `trpc.users.list`, `trpc.users.updateRole` |

---

## 4. State Shape

There are two Zustand stores. Neither store is persisted to localStorage; all state resets on page refresh.

### `useReportStore` (`client/src/store/useReportStore.ts`)

This is the primary application store. It holds all parsed financial data for the current session.

| Field | Type | Default | Description |
|---|---|---|---|
| `uploadedFiles` | `UploadedFile[]` | `[]` | Registry of all files uploaded this session |
| `balanceSheet` | `BalanceSheetData \| null` | `null` | Parsed Balance Sheet data |
| `profitLoss` | `ProfitLossData \| null` | `null` | Parsed Profit & Loss data |
| `arAging` | `ARAgingData \| null` | `null` | Parsed A/R Aging data |
| `apAging` | `APAgingData \| null` | `null` | Parsed A/P Aging data |
| `vatDetail` | `VATDetailData \| null` | `null` | Parsed VAT Detail data |
| `vatSummary` | `VATSummaryData \| null` | `null` | Parsed VAT Summary data |
| `profitFirst` | `ProfitFirstData \| null` | `null` | Parsed Profit First weekly data |
| `salesByProduct` | `SalesByProductData \| null` | `null` | Parsed Sales by Product data |
| `cashFlows` | `CashFlowsData \| null` | `null` | Parsed Cash Flow Statement data |
| `bankStatement` | `BankStatementData \| null` | `null` | Parsed Bank Statement data |
| `alerts` | `Alert[]` | `[]` | Generated alerts for the current session |
| `duplicateBanner` | `{ reportType: ReportType; oldFilename: string } \| null` | `null` | Active duplicate-replacement notification |

**Actions:**

`setReport(type, data, file)` — Replaces or appends a file in `uploadedFiles` keyed by `reportType`. Writes `data` into the corresponding named slot via `getReportKey()`. Sets `duplicateBanner` if a file of the same type already existed; auto-clears the banner after 5 seconds.

`removeReport(type)` — Removes the file from `uploadedFiles` and nulls the corresponding named slot.

`setAlerts(alerts)` — Replaces the entire alerts array.

`resolveAlert(id)` — Sets `resolved: true` on a single alert by ID.

`clearDuplicateBanner()` — Nulls the duplicate banner immediately.

`clearAll()` — Resets all fields to their defaults.

**Important limitation:** The `getReportKey()` function only maps 10 of the 15 declared `ReportType` values to named store slots. The five types without dedicated slots — `PLByMonth`, `PLComparison`, `SupplierBalance`, `CostInForm`, and `Unknown` — are retained in `uploadedFiles` but their parsed data is not accessible to tab components via the store.

### `useUIStore` (`client/src/store/useUIStore.ts`)

This store manages navigation and upload UI state.

| Field | Type | Default | Description |
|---|---|---|---|
| `activeTab` | `TabId` | `'overview'` | Currently visible tab |
| `isUploading` | `boolean` | `false` | Whether a file upload is in progress |
| `uploadProgress` | `number` | `0` | Upload progress percentage (0–100) |
| `sidebarOpen` | `boolean` | `false` | Mobile sidebar open state |

**`TabId` union:** `'overview' | 'cash' | 'profit-first' | 'ar-aging' | 'ap-aging' | 'vat' | 'inventory' | 'real-revenue' | 'debt-service' | 'stress-test' | 'alerts' | 'reports' | 'settings'`

---

## 5. Data Contracts

### File Upload Contract

The `UploadZone` component sends files to `trpc.reports.upload` with the following payload:

| Field | Type | Required | Notes |
|---|---|---|---|
| `filename` | `string` | Yes | Original filename including extension |
| `mimeType` | `string` | Yes | Browser-reported MIME type; falls back to `'application/octet-stream'` |
| `base64Data` | `string` | Yes | Full file contents encoded as base64 |
| `clientSlug` | `string` | No | Defaults to `'cauls'` — hardcoded in `UploadZone.tsx` |

**Constraints enforced client-side:** Maximum file size is **20 MB**. Files over this limit are rejected before upload with a toast error. Accepted extensions are `.csv`, `.xlsx`, `.xls`, `.pdf`, `.docx`.

**Server response shape:**

```ts
{
  id: number;           // DB row ID in the reports table
  reportType: ReportType;
  filename: string;
  storageUrl: string;   // S3 URL of the raw uploaded file
  parsedData: unknown;  // Typed output from the relevant parser
  wasSuperseded: true;  // Always true — even for first uploads (known bug)
}
```

> **Note:** `wasSuperseded` is always returned as `true` regardless of whether a previous file existed. This is a bug in `server/routers/reports.ts` line 112. The client does not currently use this field, so there is no visible impact, but it should be corrected to `wasSuperseded: !!existingCount` for accuracy.

### Parser Input/Output Contracts

Each parser receives either `ParsedCSVRow[]` (from `parseCSV.ts`), `ExcelSheet[]` (from `parseExcel.ts`), or `string[]` of lines (from `parsePDF.ts` / `parseDocx.ts`).

| Parser | Input | Output Type | Key Fields |
|---|---|---|---|
| `parseBalanceSheet` | `ParsedCSVRow[]` | `BalanceSheetData` | `assets`, `liabilities`, `equity`, `vatSuspense`, `stampTaxProvision` |
| `parseProfitLoss` | `ParsedCSVRow[]` | `ProfitLossData` | `totalIncome`, `totalCOGS`, `grossProfit`, `grossMargin`, `netIncome`, `netMargin` |
| `parseARaging` | `ParsedCSVRow[]` | `ARAgingData` | `rows[].customer`, `rows[].days91plus`, `totals` |
| `parseAPaging` | `ParsedCSVRow[]` | `APAgingData` | `rows[].supplier`, `rows[].days91plus`, `totals` |
| `parseProfitFirst` | `ExcelSheet[]` | `ProfitFirstData` | `weeks[]`, `latestWeek`, `bucketNames` |
| `parseSalesByProduct` | `ParsedCSVRow[]` | `SalesByProductData` | `rows[].product`, `rows[].qty`, `rows[].amount` |
| `parseBankStatement` | `ParsedCSVRow[]` | `BankStatementData` | `rows[].date`, `rows[].debit`, `rows[].credit`, `rows[].balance` |
| `parseCashFlows` | `ParsedCSVRow[]` | `CashFlowsData` | `operating`, `investing`, `financing`, `netChange` |

**Missing or malformed data behaviour:** If a parser throws, the `upload` procedure catches the error, logs it, and stores `{ error: 'Parse failed', raw: textContent.slice(0, 500) }` as `parsedData`. The upload still succeeds and the file is stored in S3. The client receives this error object as `parsedData` and writes it into the Zustand store slot, which means the tab component will receive a non-null but invalid object. Tab components do not currently validate the shape of store data before rendering, which can cause silent rendering failures on malformed uploads.

### Alert Generation Contract

`generateAlerts(input: AlertInput)` accepts all inputs as optional. It is safe to call with an empty object and will return only `DataMissing` INFO alerts.

```ts
interface AlertInput {
  arAging?: ARAgingData;
  apAging?: APAgingData;
  balanceSheet?: BalanceSheetData;
  profitLoss?: ProfitLossData;
  vatSummary?: VATSummaryData;
  profitFirst?: ProfitFirstData;
  inventory?: InventoryData;
  weeklyExpenses?: number;
}
```

The `alerts.generate` tRPC procedure calls `generateAlerts` with whatever data is currently in the database for the client, then bulk-inserts the results into `alerts_log` and returns them.

---

## 6. Scoring and Calculation Logic

### Financial Ratios (`server/analysis/ratioCalculations.ts`)

All ratios are computed by `calculateRatios(inputs: RatioInputs)`. Thresholds are loaded from `CLIENT_CONFIG.ratioThresholds`.

| Ratio | Formula | Unit | Direction | Healthy | Warning |
|---|---|---|---|---|---|
| GMROI | `grossProfit / inventory.totalValue` | x | Higher better | ≥ 2.0 | ≥ 1.5 |
| A/R Days | `(arAging.totals.total / totalIncome) × 365` | days | Lower better | ≤ 14 | ≤ 30 |
| A/P Days | `(apAging.totals.total / totalCOGS) × 365` | days | Lower better | ≤ 45 | ≤ 60 |
| Gross Margin | `profitLoss.grossMargin × 100` | % | Higher better | ≥ 25% | ≥ 20% |
| Inventory Turnover | `totalCOGS / inventory.totalValue` | x | Higher better | ≥ 6 | ≥ 4 |
| Current Ratio | `sum(currentAssets) / sum(currentLiabilities)` | ratio | Higher better | ≥ 2.0 | ≥ 1.2 |
| Debt-to-Equity | `totalLiabilities / totalEquity` | ratio | Lower better | ≤ 1.0 | ≤ 2.0 |
| Net Margin | `profitLoss.netMargin × 100` | % | Higher better | ≥ 10% | ≥ 5% |

A ratio returns `status: 'unknown'` when any required input is null or zero. Ratios are not currently surfaced in a dedicated tab; they are computed inline in the Overview and Reports tabs.

### Alert Rules (`server/analysis/alertGenerator.ts`)

Alerts are generated in priority order: CRITICAL first, then WARNING, then INFO.

**CRITICAL rules:**

| Rule | Condition | Category |
|---|---|---|
| A/R 91+ per customer | Any `ARAgingRow.days91plus > 0` (non-total row) | `AR` |
| VAT Suspense | `balanceSheet.vatSuspense > 1000` | `VAT` |
| VAT at Port near zero | `vatSummary.vatAtPort < 100` AND `foreignOrdersActive = true` | `VAT` |
| Payables bucket negative | `profitFirst.latestWeek.buckets['Payables'] < 0` | `ProfitFirst` |
| Cash below 2-week threshold | `cash < weeklyExpenses × 2` | `Cash` |

**WARNING rules:**

| Rule | Condition | Category |
|---|---|---|
| Stamp Tax gap | `stampTaxProvision > stampTaxAllocated × 1.5` | `StampTax` |
| VAT allocation gap | `vatCollected > vatBSAccount × 1.8` | `VAT` |
| Inventory GMROI by location | `loc.gmroi < 1.5` per location | `Inventory` |
| High-value zero-turnover inventory | `loc.value > 250000` AND `loc.turnover === 0` | `Inventory` |
| Net margin below 15% | `profitLoss.netMargin < 0.15` | `Revenue` |
| Rent bucket below 18% | `rentBucket / totalIncome < 0.18` | `ProfitFirst` |
| A/R overdue 31+ | `(days31to60 + days61to90 + days91plus) > 5000` | `AR` |
| A/P 61+ days | `(days61to90 + days91plus) > 0` | `AP` |

**INFO rules (data missing):** Triggered when `profitFirst`, `profitLoss`, `apAging`, or `vatSummary` are absent from the input.

### Stress Test (`tabs/StressTest.tsx`)

> **Important:** The visible stress test simulator in the `StressTest` tab is implemented entirely client-side in React with `useMemo`. It does **not** call the server-side `runStressTest` function in `server/analysis/stressTest.ts`. The two implementations use different input parameters and different projection models.

The client-side model uses 5 sliders:

| Slider | Range | Default | Effect |
|---|---|---|---|
| Revenue Change | −50% to +50% | 0% | Scales `baseRevenue` |
| COGS Change | −30% to +30% | 0% | Scales `baseCOGS` |
| Expense Change | −30% to +30% | 0% | Scales `baseExpenses` |
| A/R Collection Days | 30–120 days | 45 days | Adjusts effective cash via `baseAR × (45 / arCollectionDays)` |
| Cash Reserve Target | 1–6 months | 3 months | Sets reserve target = `stressedExpenses × cashReserveMonths` |

Fallback values when no store data is loaded: `baseRevenue = 250,000`, `baseCOGS = 150,000`, `baseExpenses = 60,000`, `baseCash = 50,000`, `baseAR = 80,000`.

Profit First allocations in the stress output use simplified fixed percentages: Profit 5%, Owner Pay 35%, Tax 15%, OpEx 45%.

The server-side `runStressTest` model projects 12 weekly periods with collection delay, inventory build drain, and per-bucket PF health scoring. It is not currently called from any UI component and exists as a utility for future server-side scenario analysis.

### Profit First Bucket Targets (`shared/config/caulsConfig.ts`)

All 15 buckets and their percentage targets are defined in `CLIENT_CONFIG.profitFirstTargets`. Targets are expressed as percentages of gross income (not net).

| Bucket | Target % | Notes |
|---|---|---|
| Payables | 75% | Foreign + local suppliers |
| VAT | 4% | From Vend sales report |
| StampTax | 0.8% | |
| RealRevenue | 18% | Net after all obligations |
| DebtPaydown | 8% | Of real revenue |
| CapEx | 5% | Asset upgrade debt not yet modeled |
| Compensation | 20% | Of real revenue |
| Operating | 15% | Of real revenue |
| Payroll | 30% | Of real revenue |
| Rent | 20% | Currently running at 15% — correction required |
| Taxes | 3% | |
| Vault | 1% | |
| Profit | 1% | |
| Marketing | 1.5% | |
| Charity | 0.5% | |

---

## 7. Hardcoded Assumptions

The following values, labels, and logic are specific to CaulCo Inc. and **must be changed** when adapting this application for a new client.

### In `shared/config/caulsConfig.ts` (the designated change point)

Every field in `CLIENT_CONFIG` is client-specific. The full list is documented in Section 6 above. Key fields to update for a new client:

- `clientName`, `clientSlug`, `ownerName`, `consultantName`, `firmName`
- `schedulingLink` — the 17hats or Calendly URL
- `locations` — inventory location names
- `currency` and `currencySymbol` — currently `'XCD'` and `'EC$'`
- `fiscalYearStart` — currently `'January'`
- `profitFirstTargets` — all 15 bucket percentages
- `engagementFlags` — the 8 CaulCo-specific engagement notes shown in the Overview banner
- `ratioThresholds` — all 8 ratio benchmarks
- `rolePermissions` — permission matrix for all 4 roles

### In `server/analysis/alertGenerator.ts`

- **Line 81:** `const foreignOrdersActive = true;` — This is hardcoded to `true` because CaulCo always has active foreign import orders. For a client without foreign orders, this should be `false` or driven from config, otherwise the "VAT at Port near zero" CRITICAL alert will always fire.
- **Line 43:** `fmt()` formats all currency as `EC$`. This should reference `CLIENT_CONFIG.currencySymbol`.
- **Line 163:** Net margin warning threshold is hardcoded at `0.15` (15%), which is the CaulCo Profit First real revenue target. This should reference `CLIENT_CONFIG.ratioThresholds.netMargin.warning`.
- **Line 177:** Rent bucket warning threshold is hardcoded at `0.18` (18%). This should reference `CLIENT_CONFIG.profitFirstTargets['Rent'].target * 0.9` or a dedicated config field.

### In `server/routers/reports.ts`

- **Line 34:** `clientSlug: z.string().default('cauls')` — The default client slug is hardcoded. This is safe for single-client deployments but must be made dynamic for true multi-tenancy.
- **Line 79:** `db.insert(clients).values({ name: 'CaulCo Inc.', slug: 'cauls' })` — If no client row exists in the database, the server auto-creates one with CaulCo's name and slug. This must be updated for new clients.
- **Line 207 (exportPDF):** The HTML report footer hardcodes `"Tanya Easterling Consulting"` and `CLIENT_CONFIG.schedulingLink`. These are already in config but the footer string should be verified when adapting.

### In `client/src/components/layout/UploadZone.tsx`

- **Line 48:** `clientSlug: 'cauls'` — The client slug is hardcoded in the upload mutation payload. For multi-tenant use, this should be derived from the authenticated user's profile via `trpc.users.me`.

### In `client/src/pages/tabs/Settings.tsx`

- **Line ~95:** `VAT Rate: 16%` — This is hardcoded as a display string in the client configuration summary card. It is not used in any calculation. It should be moved to `CLIENT_CONFIG`.

### In `server/analysis/stressTest.ts`

- **Lines 40–56:** `PF_TARGETS` is a local copy of all 15 Profit First bucket percentages. It duplicates `CLIENT_CONFIG.profitFirstTargets` and will drift if config is updated. It should import from config instead.

### In `client/src/pages/tabs/StressTest.tsx`

- **Lines 80–84:** Fallback base values (`baseRevenue = 250000`, `baseCOGS = 150000`, `baseExpenses = 60000`, `baseCash = 50000`, `baseAR = 80000`) are hardcoded illustrative figures for CaulCo's approximate scale. These should be replaced with client-appropriate defaults or removed in favour of requiring data upload before enabling the stress test.

---

## 8. Known Limitations and TODOs

### Functional Gaps

**`wasSuperseded` always returns `true`.** In `server/routers/reports.ts`, the `upload` procedure returns `wasSuperseded: true` unconditionally (line 112). The correct value should be whether a previous active report of the same type existed before the upload.

**5 report types have no store slot.** `PLByMonth`, `PLComparison`, `SupplierBalance`, `CostInForm`, and `Unknown` are parsed and stored in the database but have no dedicated field in `useReportStore`. Their parsed data is accessible only via `uploadedFiles[n].parsedData` (untyped) and is not rendered in any tab.

**Stress Test tab does not call the server model.** The `StressTest` tab uses a simplified client-side calculation. The more complete `server/analysis/stressTest.ts` model (12-week projection with collection delay and inventory drain) is not wired to any UI.

**Export produces HTML, not PDF.** `trpc.reports.exportPDF` generates a styled HTML file and returns its S3 URL. The client downloads it as a `.html` file. The UI labels this "PDF Export" which is misleading. True PDF generation requires a headless browser (Puppeteer) or a server-side PDF library.

**Notification toggles are local-only.** The `notifyOnUpload` and `notifyOnAlert` toggles in the Settings tab save to local React state with a success toast, but do not persist to the database or trigger any backend notification logic.

**Inventory tab uses proxy data.** The Inventory tab derives inventory data from the Balance Sheet's `pfSubAccounts` field and Sales by Product, not from a dedicated inventory report type. There is no `InventoryData` parser wired in the upload dispatch.

**`tecRole` vs `user.role` mismatch in Settings.** The Settings tab derives the displayed permissions from `user.role` (the generic Manus platform role: `'user'` or `'admin'`), not from the tenant-specific `tecRole` (`'admin' | 'owner' | 'bookkeeper' | 'accountant'`). A user with `tecRole = 'owner'` will see `user` permissions in the Settings display unless they are also a Manus admin.

**Admin guard uses global role.** The `adminProcedure` middleware in `server/routers/users.ts` checks `ctx.user.role === 'admin'` (global Manus role), not the tenant `tecRole`. This means a user who is a TEC `admin` for one client but not a global Manus admin cannot manage users via the UI.

### Parser Edge Cases Not Handled

- QBO CSV files with non-standard encoding (Windows-1252, UTF-16) may fail silently.
- Profit First Excel files with sheet names other than `Week 1` through `Week 10` or `NEW FORMAT` are not detected.
- PDFs with scanned (image-only) pages produce empty line arrays and will parse as `Unknown`.
- Multi-currency QBO exports (amounts with currency codes appended) are not handled by the numeric parsing in CSV parsers.

### Performance

- Large Excel files (>5 MB, many sheets) may cause the upload mutation to time out. SheetJS is synchronous and blocks the Node.js event loop during parsing.
- Base64 encoding large files in the browser doubles memory usage. Files near the 20 MB limit may cause out-of-memory errors on low-RAM devices.

---

## 9. Extension Guide

### Adapting for a New Client

The application is designed so that a new client requires changes to **one file** plus a database seed. Follow these steps:

**Step 1: Create a new config file.**

Copy `shared/config/caulsConfig.ts` to `shared/config/<newClientSlug>Config.ts`. Update every field: `clientName`, `clientSlug`, `ownerName`, `consultantName`, `firmName`, `schedulingLink`, `locations`, `currency`, `currencySymbol`, `fiscalYearStart`, `profitFirstTargets`, `engagementFlags`, `ratioThresholds`, and `rolePermissions`.

**Step 2: Update the config import.**

In every file that imports `CLIENT_CONFIG` from `caulsConfig.ts`, update the import path to the new config file. The affected files are:

- `server/analysis/alertGenerator.ts`
- `server/analysis/ratioCalculations.ts`
- `server/analysis/stressTest.ts` (currently uses a local copy — fix this first)
- `server/routers/reports.ts`
- `server/routers/users.ts`
- `server/routers/clientsRouter.ts`
- `client/src/components/layout/Header.tsx`
- `client/src/pages/tabs/Settings.tsx`
- `client/src/pages/tabs/Overview.tsx`

For a multi-client deployment, replace the static import with a dynamic lookup keyed by `clientSlug`.

**Step 3: Fix the hardcoded `clientSlug = 'cauls'` defaults.**

Update the default value in:
- `server/routers/reports.ts` (upload, list, exportPDF procedures)
- `server/routers/users.ts` (list, me, updateRole procedures)
- `server/routers/clientsRouter.ts` (get procedure)
- `client/src/components/layout/UploadZone.tsx` (upload mutation payload)
- `client/src/pages/tabs/Reports.tsx` (exportPDF mutation payload)

For a single-client deployment, simply change `'cauls'` to the new slug. For multi-client, derive the slug from the authenticated user's profile via `trpc.users.me`.

**Step 4: Seed the database.**

```sql
INSERT INTO clients (name, slug) VALUES ('<Client Name>', '<new-slug>');
```

Without this row, the app falls back to the static config and auto-creates a row with CaulCo's name on first upload.

**Step 5: Fix the `foreignOrdersActive` flag.**

In `server/analysis/alertGenerator.ts` line 81, change `const foreignOrdersActive = true` to `const foreignOrdersActive = CLIENT_CONFIG.foreignOrdersActive ?? false` and add the field to the config interface.

### Adding a New Report Type

To add support for a new QBO report type (e.g., `PayrollSummary`):

1. Add `'PayrollSummary'` to the `ReportType` union in `shared/types/reports.ts`.
2. Define a `PayrollSummaryData` interface in `shared/types/reports.ts`.
3. Add detection patterns to `FILENAME_PATTERNS` and `CONTENT_PATTERNS` in `server/parsers/detectReportType.ts`.
4. Create `server/parsers/parsePayrollSummary.ts` that accepts `ParsedCSVRow[]` and returns `PayrollSummaryData`.
5. Add a case to `dispatchCSVParser` (and `dispatchExcelParser` if applicable) in `server/routers/reports.ts`.
6. Add `payrollSummary: PayrollSummaryData | null` to `ReportStore` in `client/src/store/useReportStore.ts`.
7. Add `'PayrollSummary': 'payrollSummary'` to `getReportKey()` in the same file.
8. Create `client/src/pages/tabs/PayrollSummary.tsx` and add it to the `TabContent` switch in `Dashboard.tsx`.
9. Add the tab to the `TABS` array in `TabBar.tsx`.
10. Add the tab ID to the `TabId` union in `useUIStore.ts`.
11. Write unit tests in `server/cashflow.test.ts`.

### Adding a New Alert Rule

1. Open `server/analysis/alertGenerator.ts`.
2. Add the rule inside `generateAlerts()` in the appropriate section (CRITICAL, WARNING, or INFO).
3. Use `makeAlert(level, category, title, detail)` to construct the alert.
4. If the rule requires a new data input, add it to the `AlertInput` interface.
5. Add a test case to `server/cashflow.test.ts`.

### Adding a New Financial Ratio

1. Add the ratio field to `RatiosData` in `shared/types/ratios.ts`.
2. Add threshold values to `ratioThresholds` in `shared/config/caulsConfig.ts`.
3. Implement the calculation in `server/analysis/ratioCalculations.ts` using the `makeRatio` helper.
4. Add the ratio to the return object of `calculateRatios`.
5. Render the ratio in the relevant tab using `KPICard`.

### Enabling True PDF Export

Replace the HTML string generation in `server/routers/reports.ts` (`exportPDF` procedure) with a Puppeteer-based renderer:

```ts
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(htmlContent);
const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
await browser.close();
const { url } = await storagePut(`exports/${clientSlug}/${nanoid()}.pdf`, pdfBuffer, 'application/pdf');
```

Note: Puppeteer adds approximately 300 MB to the server's memory footprint and requires Chromium to be available in the deployment environment.

### Enabling Multi-Tenant Client Switching

The current architecture supports multiple clients in the database but the UI always sends `clientSlug: 'cauls'`. To enable a client switcher:

1. Add a `currentClientSlug` field to `useUIStore`.
2. Call `trpc.users.me` on login to get the user's assigned `clientSlug`.
3. Pass `currentClientSlug` from the store to all tRPC mutation/query inputs that accept `clientSlug`.
4. Add a client selector dropdown to the `Header` component (visible only to `admin` role users).

---

*This document was generated by auditing the full codebase at commit `4501de81`. It reflects the state of the application as of April 2026.*
