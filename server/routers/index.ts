import { router, publicProcedure } from "../_core/trpc";
import { reportsRouter } from "./reports";
import { alertsRouter } from "./alerts";
import { usersRouter } from "./users";
import { clientsRouter } from "./clientsRouter";
import { systemRouter } from "../_core/systemRouter";
import { COOKIE_NAME } from "../../shared/const";

const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ?? null;
  }),
  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, { path: "/" });
    return { success: true };
  }),
});

export const appRouter = router({
  auth: authRouter,
  reports: reportsRouter,
  alerts: alertsRouter,
  users: usersRouter,
  clients: clientsRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
