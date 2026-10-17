import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const encoded = process.env.ENCRYPTION_KEY;
  if (!encoded) throw new Error("ENCRYPTION_KEY is not configured.");

  // Accept exactly 32 raw UTF-8 bytes or 64 hexadecimal characters.
  const key =
    /^[0-9a-fA-F]{64}$/.test(encoded) ? Buffer.from(encoded, "hex") : Buffer.from(encoded, "utf8");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes (or 64 hex characters).");
  return key;
}

/** Format: v1.base64url(iv).base64url(authTag).base64url(ciphertext) */
export function encryptText(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptText(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Encrypted value has an unsupported format.");
  const [, ivText, tagText, ciphertextText] = parts;
  const iv = Buffer.from(ivText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  const ciphertext = Buffer.from(ciphertextText, "base64url");
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) throw new Error("Encrypted value is malformed.");

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
