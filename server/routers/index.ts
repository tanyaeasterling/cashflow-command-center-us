import { router } from "../_core/trpc";
import { reportsRouter } from "./reports";
import { alertsRouter } from "./alerts";
import { usersRouter } from "./users";
import { clientsRouter } from "./clientsRouter";

export const appRouter = router({
  reports: reportsRouter,
  alerts: alertsRouter,
  users: usersRouter,
  clients: clientsRouter,
});

export type AppRouter = typeof appRouter;
