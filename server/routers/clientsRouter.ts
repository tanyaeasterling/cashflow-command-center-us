import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { clients } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { CLIENT_CONFIG } from "../../shared/config/caulsConfig";

export const clientsRouter = router({
  // Get client config (merges DB record with static caulsConfig defaults)
  get: protectedProcedure
    .input(z.object({ clientSlug: z.string().default('cauls') }))
    .query(async ({ input }) => {
      const db = await getDb();

      if (db) {
        const rows = await db
          .select()
          .from(clients)
          .where(eq(clients.slug, input.clientSlug))
          .limit(1);

        if (rows[0]) {
          return {
            id: rows[0].id,
            name: rows[0].name,
            slug: rows[0].slug,
            config: rows[0].config ?? {},
            // Merge with static defaults
            staticConfig: CLIENT_CONFIG,
          };
        }
      }

      // Fallback: return static config only
      return {
        id: null,
        name: CLIENT_CONFIG.clientName,
        slug: CLIENT_CONFIG.clientSlug,
        config: {},
        staticConfig: CLIENT_CONFIG,
      };
    }),
});
