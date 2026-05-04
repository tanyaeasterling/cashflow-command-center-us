export const ENV = {
  /** Secret used to sign session JWTs. Set JWT_SECRET in .env */
  cookieSecret: process.env.JWT_SECRET ?? "change-this-secret-in-production",

  /** MySQL connection string. Set DATABASE_URL in .env */
  databaseUrl: process.env.DATABASE_URL ?? "",

  /** Bootstrap admin credentials — used ONLY to seed the first admin account.
   *  After first login Tanya should set a real password via the admin panel.
   *  Set ADMIN_EMAIL and ADMIN_PASSWORD in Railway env vars. */
  adminEmail: process.env.ADMIN_EMAIL ?? "tanya@tanyaeasterling.com",
  adminPassword: process.env.ADMIN_PASSWORD ?? "change-me-on-first-login",
  adminName: process.env.ADMIN_NAME ?? "Tanya",

  /** Google OAuth — set in Railway env vars when credentials are ready.
   *  Leave blank to disable Google login (email/password still works). */
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:5173/api/auth/google/callback",

  /** Base URL of the app — used for OAuth redirects and email links */
  appUrl: process.env.APP_URL ?? "http://localhost:5173",

  /** Upload directory — set UPLOAD_DIR on Railway to a mounted volume path */
  uploadDir: process.env.UPLOAD_DIR ?? "",

  isProduction: process.env.NODE_ENV === "production",

  // ── Manus platform compatibility stubs ────────────────────────────────────
  // These were referenced by the Manus _core template files.
  // Stubbed to empty strings so those files compile without errors.
  // The LLM, image generation, map, notification, and voice routes are
  // not used in this application and can be removed in a future cleanup.
  forgeApiUrl: process.env.FORGE_API_URL ?? "",
  forgeApiKey: process.env.FORGE_API_KEY ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "admin",
};
