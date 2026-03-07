/**
 * AES-256-GCM encryption for sensitive data (e.g. user DB connection strings).
 * Uses Node/Bun crypto (not Web Crypto) so it works in server runtimes.
 * ENCRYPTION_KEY: use 64 hex chars, or any string – then derived via SHA-256 to 32 bytes.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getKey(envKey: string): Buffer {
  if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
    return Buffer.from(envKey, "hex");
  }
  return createHash("sha256").update(envKey, "utf8").digest();
}

export async function encrypt(plainText: string, envKey: string): Promise<string> {
  const key = getKey(envKey);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv, { authTagLength: TAG_LEN });
  const enc = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64url");
}

export async function decrypt(base64url: string, envKey: string): Promise<string> {
  const key = getKey(envKey);
  const combined = Buffer.from(base64url, "base64url");
  const iv = combined.subarray(0, IV_LEN);
  const tag = combined.subarray(combined.length - TAG_LEN);
  const cipher = combined.subarray(IV_LEN, combined.length - TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  return decipher.update(cipher) + decipher.final("utf8");
}
