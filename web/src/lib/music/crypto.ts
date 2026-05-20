// AES-256-GCM token encryption — server-side only
// Requires TOKEN_ENCRYPTION_KEY env var (any string ≥16 chars)

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm" as const;

function deriveKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY env var is required for token encryption.");
  // SHA-256 of the raw key → 32-byte key
  return createHash("sha256").update(raw, "utf8").digest();
}

/**
 * Encrypt a token string.
 * Returns: "<iv_b64url>.<tag_b64url>.<ciphertext_b64url>"
 */
export function encryptToken(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12); // 96-bit IV, recommended for GCM
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // 128-bit auth tag
  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/**
 * Decrypt a token string encrypted by encryptToken.
 * Throws if tampered or wrong key.
 */
export function decryptToken(encoded: string): string {
  const parts = encoded.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format.");
  const [ivB64, tagB64, dataB64] = parts;
  const key = deriveKey();
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function hasEncryptionKey(): boolean {
  return !!process.env.TOKEN_ENCRYPTION_KEY;
}
