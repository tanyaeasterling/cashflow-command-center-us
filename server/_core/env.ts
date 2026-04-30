export const ENV = {
  /** Secret used to sign session JWTs. Set JWT_SECRET in .env. */
  cookieSecret: process.env.JWT_SECRET ?? "change-this-secret-in-production",

  /** MySQL connection string. Set DATABASE_URL in .env. */
  databaseUrl: process.env.DATABASE_URL ?? "",

  /** Password required to log in. Set ADMIN_PASSWORD in .env. */
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin",

  /** Display name for the admin user. */
  adminName: process.env.ADMIN_NAME ?? "Tanya",

  /** Email for the admin user. */
  adminEmail: process.env.ADMIN_EMAIL ?? "info@aaumedical.net",

  isProduction: process.env.NODE_ENV === "production",
};
