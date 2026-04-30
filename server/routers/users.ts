import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, userProfiles, clients } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { CLIENT_CONFIG } from "../../shared/config/caulsConfig";

// ─── Admin guard middleware ───────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// ─── Helper: resolve clientId from slug ──────────────────────────────────────
async function getClientId(slug: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ id: clients.id }).from(clients).where(eq(clients.slug, slug)).limit(1);
  return rows[0]?.id ?? null;
}

export const usersRouter = router({
  // List all users for a client (admin only)
  list: adminProcedure
    .input(z.object({ clientSlug: z.string().default('cauls') }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const clientId = await getClientId(input.clientSlug);
      if (!clientId) return [];

      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
          tecRole: userProfiles.tecRole,
          fullName: userProfiles.fullName,
        })
        .from(users)
        .leftJoin(
          userProfiles,
          and(
            eq(userProfiles.userId, users.id),
            eq(userProfiles.clientId, clientId),
          ),
        );

      return rows.map(r => ({
        ...r,
        tecRole: r.tecRole ?? 'bookkeeper',
        permissions: CLIENT_CONFIG.rolePermissions[r.tecRole ?? 'bookkeeper'] ?? CLIENT_CONFIG.rolePermissions['bookkeeper'],
      }));
    }),

  // Get current user's profile and permissions
  me: protectedProcedure
    .input(z.object({ clientSlug: z.string().default('cauls') }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const clientId = await getClientId(input.clientSlug);

      let tecRole = 'bookkeeper';
      if (db && clientId) {
        const profileRows = await db
          .select({ tecRole: userProfiles.tecRole })
          .from(userProfiles)
          .where(
            and(
              eq(userProfiles.userId, ctx.user.id),
              eq(userProfiles.clientId, clientId),
            ),
          )
          .limit(1);
        tecRole = profileRows[0]?.tecRole ?? 'bookkeeper';
      }

      // Owner of the Manus project gets admin role automatically
      if (ctx.user.role === 'admin') tecRole = 'admin';

      const permissions = CLIENT_CONFIG.rolePermissions[tecRole] ?? CLIENT_CONFIG.rolePermissions['bookkeeper']!;

      return {
        user: ctx.user,
        tecRole,
        permissions,
        clientSlug: input.clientSlug,
      };
    }),

  // Update a user's TEC role (admin only)
  updateRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      clientSlug: z.string().default('cauls'),
      tecRole: z.enum(['admin', 'owner', 'bookkeeper', 'accountant']),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const clientId = await getClientId(input.clientSlug);
      if (!clientId) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });

      await db
        .insert(userProfiles)
        .values({
          userId: input.userId,
          clientId,
          tecRole: input.tecRole,
        })
        .onDuplicateKeyUpdate({ set: { tecRole: input.tecRole } });

      return { success: true, userId: input.userId, tecRole: input.tecRole };
    }),
});
