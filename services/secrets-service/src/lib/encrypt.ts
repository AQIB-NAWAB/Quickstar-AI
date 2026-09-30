/**
 * AES-256-GCM envelope encryption for the secrets vault.
 *
 * Stored format (base64): IV (12 bytes) | authTag (16 bytes) | ciphertext (N bytes)
 * The master key is supplied as a 32-byte hex string from ENCRYPTION_KEY env var.
 *
 * Two service replicas can decrypt as long as they share the same ENCRYPTION_KEY.
 * Rotation: re-encrypt every row with the new key, write new ciphertext + key_version.
 * The old key_version remains valid in DB rows until rotation completes.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm" as const;
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // bytes; 128-bit auth tag

/**
 * Encrypt plaintext to a base64 envelope string.
 * @param plaintext - UTF-8 secret value
 * @param masterKeyHex - 64-char hex string (32 bytes)
 */
export function encrypt(plaintext: string, masterKeyHex: string): string {
  const key = Buffer.from(masterKeyHex, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // envelope: iv || authTag || ciphertext
  const envelope = Buffer.concat([iv, authTag, encrypted]);
  return envelope.toString("base64");
}

/**
 * Decrypt a base64 envelope string back to plaintext.
 * @param envelope - base64 string produced by encrypt()
 * @param masterKeyHex - 64-char hex string (32 bytes)
 */
export function decrypt(envelope: string, masterKeyHex: string): string {
  const key = Buffer.from(masterKeyHex, "hex");
  const buf = Buffer.from(envelope, "base64");
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("secrets: ciphertext envelope is too short");
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
