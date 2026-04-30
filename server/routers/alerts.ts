import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { alertsTable, clients, reports } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateAlerts } from "../analysis/alertGenerator";
import type {
  ARAgingData, APAgingData, BalanceSheetData,
  ProfitLossData, ProfitFirstData,
} from "../../shared/types/reports";

export const alertsRouter = router({
  list: protectedProcedure
    .input(z.object({ clientSlug: z.string().default('cauls') }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const clientRows = await db.select().from(clients).where(eq(clients.slug, input.clientSlug)).limit(1);
      const clientId = clientRows[0]?.id;
      if (!clientId) return [];

      return db.select().from(alertsTable)
        .where(and(eq(alertsTable.clientId, clientId), eq(alertsTable.resolved, false)))
        .orderBy(desc(alertsTable.generatedAt));
    }),

  generate: protectedProcedure
    .input(z.object({ clientSlug: z.string().default('cauls') }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database unavailable');

      const clientRows = await db.select().from(clients).where(eq(clients.slug, input.clientSlug)).limit(1);
      const clientId = clientRows[0]?.id;
      if (!clientId) return { count: 0 };

      // Load latest reports of each type
      const allReports = await db.select().from(reports)
        .where(and(eq(reports.clientId, clientId), eq(reports.superseded, false)));

      const getReport = (type: string) =>
        allReports.find(r => r.reportType === type)?.parsedData;

      const alerts = generateAlerts({
        arAging: getReport('ARaging') as ARAgingData | undefined,
        apAging: getReport('APaging') as APAgingData | undefined,
        balanceSheet: getReport('BalanceSheet') as BalanceSheetData | undefined,
        profitLoss: getReport('ProfitLoss') as ProfitLossData | undefined,
        profitFirst: getReport('ProfitFirst') as ProfitFirstData | undefined,
      });

      // Clear old unresolved alerts and insert new ones
      await db.delete(alertsTable).where(
        and(eq(alertsTable.clientId, clientId), eq(alertsTable.resolved, false))
      );

      if (alerts.length > 0) {
        await db.insert(alertsTable).values(
          alerts.map(a => ({
            clientId,
            level: a.level,
            category: a.category ?? 'DataMissing',
            title: a.title,
            detail: a.detail,
          }))
        );
      }

      return { count: alerts.length, alerts };
    }),

  resolve: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database unavailable');
      await db.update(alertsTable).set({ resolved: true }).where(eq(alertsTable.id, input.alertId));
      return { success: true };
    }),
});
