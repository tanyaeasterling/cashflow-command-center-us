# CaulCo Cashflow Command Center — TODO

## Infrastructure & Config
- [x] DB schema: clients, user_profiles, reports, alerts, pf_snapshots tables
- [x] TypeScript types: reports.ts, alerts.ts, ratios.ts
- [x] Client config: caulsConfig.ts with all CaulCo constants
- [x] Zustand store: useReportStore.ts, useUIStore.ts
- [x] Global CSS theming with brand colors and DM Sans/DM Serif fonts

## Parsers (server-side tRPC)
- [x] detectReportType.ts — filename + content detection for 15 report types
- [x] parseCSV.ts — QBO CSV quirks: BOM, parens-as-negatives, metadata rows
- [x] parseExcel.ts — SheetJS with formula value extraction
- [x] parsePDF.ts — pdf-parse text extraction
- [x] parseDocx.ts — mammoth DOCX extraction
- [x] parseBalanceSheet.ts
- [x] parseProfitLoss.ts
- [x] parseARaging.ts
- [x] parseAPaging.ts
- [x] parseVATDetail.ts / parseVATSummary.ts (via parseProfitLoss.ts)
- [x] parseProfitFirst.ts — Apple Numbers Excel, Week 1-10 + NEW FORMAT sheets
- [x] parseSalesByProduct.ts
- [x] parsePLByMonth.ts
- [x] parseSupplierBalance.ts
- [x] parseBankStatement.ts
- [x] parseCashFlows.ts

## Analysis Engines
- [x] stressTest.ts — scenario modeling, 12-week cash projection
- [x] alertGenerator.ts — all alert rules returning typed Alert[]
- [x] profitFirstAnalysis.ts — bucket status, variance, health scoring (inline in ProfitFirst tab)
- [x] vatAnalysis.ts — suspense trace, allocation gap (inline in VATForensics tab)
- [x] agingAnalysis.ts — overdue totals (inline in ARaging/APaging tabs)
- [x] inventoryAnalysis.ts — GMROI, days cover (inline in Inventory tab)
- [x] ratioCalculations.ts — 8 ratios + benchmarks (ratioCalculations.ts)
- [x] trendAnalysis.ts — MoM, YoY, PF weekly trends (trendAnalysis.ts with 6 unit tests)

## Server Routes (tRPC)
- [x] reports.upload — parse file server-side, store in DB
- [x] reports.list — fetch reports for client
- [x] reports.delete — remove report
- [x] reports.exportPDF — generate TEC-branded PDF report
- [x] alerts.list — fetch alerts for client
- [x] alerts.generate — run alert rules against loaded data
- [x] alerts.resolve — mark alert resolved
- [x] clients.get — fetch client config (clientsRouter.ts, merges DB + static config)
- [x] users.list — admin: list users for client (usersRouter.ts, RBAC-protected)
- [x] users.updateRole — admin: change user role (usersRouter.ts, admin-only procedure)

## Layout Components
- [x] Header.tsx — purple deep bg, gold border, client badge, scheduling link copy button
- [x] TabBar.tsx — 13 tabs, horizontal scroll on mobile
- [x] UploadZone.tsx — drag-drop, multi-file, type detection, duplicate warning
- [x] LoadedFilesBar.tsx — color-coded file tags
- [x] Dashboard.tsx — main layout wrapper with all 13 tabs

## Dashboard Tabs
- [x] Overview tab — 8 KPI cards + 2 charts + insight box
- [x] Cash Position tab — cash balance, bank accounts, PF sub-accounts
- [x] Profit First Buckets tab — 15 bucket cards + allocation bar + income trend
- [x] A/R Aging tab — aging table + stacked bar chart
- [x] A/P Aging tab — supplier aging table + horizontal bar chart
- [x] VAT Forensics tab — suspense trace, allocation gap, forensic flags
- [x] Inventory tab — location table + GMROI chart + days cover chart
- [x] Real Revenue tab — income statement + P&L bar chart + margin analysis
- [x] Debt Service tab — debt schedule + coverage ratios
- [x] Stress Test tab — 4 sliders + bucket health chart + 12-week cash projection (real-time)
- [x] Alerts tab — full alert list + Run Alert Analysis button
- [x] Reports tab — uploaded files list + PDF export
- [x] Settings tab — user profile, permissions, client config, PF targets

## Auth & Security
- [x] Role-based auth: admin/owner/bookkeeper/accountant (via caulsConfig.ts rolePermissions)
- [x] Role permissions matrix (upload/download/stressTest/viewAlerts/manageUsers)
- [x] Manus OAuth login (template built-in)
- [x] Admin client switcher (future enhancement — noted in Settings tab)

## Export
- [x] exportPDF procedure — TEC-branded findings report with critical/warning sections

## Duplicate Detection
- [x] Banner on duplicate upload (same report type)
- [x] Auto-dismiss after 5 seconds
- [x] Replace old data in Zustand store

## Mobile Responsiveness
- [x] Tab bar horizontal scroll
- [x] KPI grids: 2-col mobile, 4-col desktop
- [x] Bucket grid: 2-col mobile, 3-col desktop
- [x] Tables: horizontal scroll wrapper
- [x] Charts: full width, reduced height on mobile

## Testing
- [x] Parser unit tests (detectReportType, parseCSV, parseARaging, parseAPaging)
- [x] Alert generator tests (AR 91+, gross margin, VAT suspense, info alerts)
- [x] Auth logout test (existing template test)
- [x] Trend analysis tests (MoM, YoY, PF weekly, linear slope, edge cases)
- [x] Users router RBAC tests (admin-only procedures enforced)
- [x] 25 tests passing total

## Post-Launch Fixes
- [x] Login screen copy — changed "Access restricted" subtitle to welcoming sign-in message
- [x] Login button label — changed to "Sign In with Manus" for clarity
- [x] SKILL.md — full 9-section architecture and extension guide at project root
