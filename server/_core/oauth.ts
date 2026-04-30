import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

export function registerOAuthRoutes(app: Express) {
  // POST /api/auth/login — password-based login (no Manus OAuth required)
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { password } = req.body ?? {};

    if (!password || password !== ENV.adminPassword) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    const openId = "admin";
    const now = new Date();

    // Upsert the admin user so the DB row always exists
    await db.upsertUser({
      openId,
      name: ENV.adminName,
      email: ENV.adminEmail,
      loginMethod: "password",
      lastSignedIn: now,
    });

    const sessionToken = await sdk.createSessionToken(openId, {
      name: ENV.adminName,
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, {
      ...cookieOptions,
      maxAge: ONE_YEAR_MS,
    });
    res.json({ success: true });
  });
}
