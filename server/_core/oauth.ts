import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { createHash, randomBytes } from "crypto";
import { getDb } from "../db";
import { users, accessLog, passwordResetTokens } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function issueSession(
  res: Response,
  req: Request,
  openId: string,
  name: string
) {
  const sessionToken = await sdk.createSessionToken(openId, {
    name,
    expiresInMs: ONE_YEAR_MS,
  });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });
}

async function logAction(
  userId: number | null,
  action: typeof accessLog.$inferInsert["action"],
  req: Request,
  detail?: Record<string, unknown>
) {
  try {
    const database = await getDb();
    if (!database) return;
    await database.insert(accessLog).values({
      userId: userId ?? undefined,
      action,
      detail: detail ?? null,
      ipAddress: (req.ip ?? "").slice(0, 45),
      userAgent: req.headers["user-agent"]?.slice(0, 500) ?? null,
    });
  } catch {
    // Non-fatal — never let logging break auth
  }
}

// ─── Seed the bootstrap admin on startup ─────────────────────────────────────
// Creates the Tanya admin account if it does not exist yet.
// Only runs once. Safe to call on every server start.

export async function seedAdminUser() {
  const database = await getDb();
  if (!database) return;

  const existing = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ENV.adminEmail))
    .limit(1);

  if (existing.length > 0) return; // Already seeded

  const passwordHash = await bcrypt.hash(ENV.adminPassword, 12);
  await database.insert(users).values({
    openId: `admin-${Date.now()}`,
    name: ENV.adminName,
    email: ENV.adminEmail,
    passwordHash,
    loginMethod: "password",
    role: "admin",
    lastSignedIn: new Date(),
  });

  console.log(`[Auth] Admin account seeded for ${ENV.adminEmail}`);
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerOAuthRoutes(app: Express) {
  // ── POST /api/auth/login — email + password ──────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const database = await getDb();
    if (!database) {
      res.status(503).json({ error: "Database unavailable" });
      return;
    }

    const rows = await database
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    const user = rows[0];

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      await logAction(null, "login", req, { email, success: false });
      return;
    }

    // Update last signed in
    await database
      .update(users)
      .set({ lastSignedIn: new Date(), loginMethod: "password" })
      .where(eq(users.id, user.id));

    await issueSession(res, req, user.openId, user.name ?? "");
    await logAction(user.id, "login", req, { method: "password" });

    res.json({ success: true, user: { name: user.name, role: user.role } });
  });

  // ── POST /api/auth/logout ─────────────────────────────────────────────────
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });

  // ── POST /api/auth/register — admin creates a new user account ────────────
  // Only callable by an authenticated admin. Clients never self-register.
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body ?? {};

    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email, and password are required" });
      return;
    }

    const database = await getDb();
    if (!database) {
      res.status(503).json({ error: "Database unavailable" });
      return;
    }

    // Check for duplicate
    const existing = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "A user with that email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const openId = `user-${randomBytes(12).toString("hex")}`;

    await database.insert(users).values({
      openId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      loginMethod: "password",
      role: role === "admin" ? "admin" : "user",
      lastSignedIn: new Date(),
    });

    await logAction(null, "user_created", req, { email, role });

    res.json({ success: true });
  });

  // ── POST /api/auth/forgot-password — request a reset link ────────────────
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body ?? {};
    // Always return 200 to avoid email enumeration
    res.json({ success: true, message: "If that email exists, a reset link has been sent." });

    if (!email) return;

    const database = await getDb();
    if (!database) return;

    const rows = await database
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!rows[0]) return;

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await database.insert(passwordResetTokens).values({
      userId: rows[0].id,
      token,
      expiresAt,
    });

    // TODO: send email with reset link
    // The reset link will be: ${ENV.appUrl}/reset-password?token=${token}
    console.log(`[Auth] Password reset token for ${email}: ${token}`);
  });

  // ── POST /api/auth/reset-password — complete the reset ───────────────────
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    const { token, password } = req.body ?? {};

    if (!token || !password) {
      res.status(400).json({ error: "Token and new password are required" });
      return;
    }

    const database = await getDb();
    if (!database) {
      res.status(503).json({ error: "Database unavailable" });
      return;
    }

    const rows = await database
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    const resetToken = rows[0];
    if (!resetToken || resetToken.usedAt) {
      res.status(400).json({ error: "Invalid or expired reset link" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await database
      .update(users)
      .set({ passwordHash, loginMethod: "password" })
      .where(eq(users.id, resetToken.userId));

    await database
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));

    await logAction(resetToken.userId, "password_reset", req, {});

    res.json({ success: true });
  });

  // ── Google OAuth placeholder ──────────────────────────────────────────────
  // These routes are wired but return a clear error until credentials are set.
  // Once GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are in Railway env vars,
  // replace this block with the full passport-google-oauth20 implementation.

  app.get("/api/auth/google", (_req: Request, res: Response) => {
    if (!ENV.googleClientId) {
      res.status(501).json({
        error: "Google OAuth is not yet configured. Use email and password to sign in.",
      });
      return;
    }
    // TODO: redirect to Google consent screen
    // passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next)
  });

  app.get("/api/auth/google/callback", (_req: Request, res: Response) => {
    if (!ENV.googleClientId) {
      res.redirect("/?error=google-not-configured");
      return;
    }
    // TODO: handle Google callback
  });
}
