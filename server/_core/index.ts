import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes, seedAdminUser } from "./oauth";
import { appRouter } from "../routers/index.ts";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getLocalFilePath } from "../storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Larger body limit for base64-encoded file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Seed the admin account on first boot if it does not exist
  await seedAdminUser();

  // Auth routes (login / logout handled via tRPC, login POST here)
  registerOAuthRoutes(app);

  // Serve locally-stored uploads at /api/files/*
  app.get("/api/files/*", (req, res) => {
    // Strip the /api/files/ prefix to get the storage key
    const key = (req.params as any)[0] as string;
    const filePath = getLocalFilePath(key);
    res.sendFile(filePath, err => {
      if (err) res.status(404).json({ error: "File not found" });
    });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Vite dev server (development) or static files (production)
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT ?? "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`\nCaulCo Cashflow Command Center running at http://localhost:${port}/\n`);
  });
}

startServer().catch(console.error);
