// Local/volume disk storage.
// In production (Railway), set UPLOAD_DIR to your mounted volume path.
// In development it defaults to <project-root>/data/uploads.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveUploadDir(): string {
  // Allow Railway (or any host) to set an explicit upload directory
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  // Default: two levels up from server/ → project root, then data/uploads
  return path.resolve(__dirname, "../../data/uploads");
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const uploadDir = resolveUploadDir();
  const filePath = path.join(uploadDir, key);

  ensureDir(path.dirname(filePath));

  const buffer =
    typeof data === "string"
      ? Buffer.from(data, "utf-8")
      : Buffer.from(data as Uint8Array);

  fs.writeFileSync(filePath, buffer);

  const url = `/api/files/${key}`;
  return { key, url };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/api/files/${key}` };
}

/** Resolve a storage key to its absolute path on disk. */
export function getLocalFilePath(relKey: string): string {
  const key = normalizeKey(relKey);
  return path.join(resolveUploadDir(), key);
}
