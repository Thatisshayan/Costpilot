import crypto from "node:crypto";
import { logger } from "./logger";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * GCM decipher that only accepts the exact nonce and full 128-bit tag this module writes.
 * Without `authTagLength`, Node accepts truncated tags (down to 4 bytes), which makes
 * forging stored ciphertexts far cheaper. Malformed input is rejected before decryption.
 */
function gcmDecipher(key: Buffer, ivHex: string, tagHex: string) {
  const iv = strictHex(ivHex, IV_LENGTH, "IV");
  const tag = strictHex(tagHex, TAG_LENGTH, "authentication tag");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher;
}

function strictHex(value: string, bytes: number, label: string): Buffer {
  if (typeof value !== "string" || value.length !== bytes * 2 || !/^[0-9a-f]+$/i.test(value)) {
    throw new Error(`Invalid ${label}: expected ${bytes} bytes`);
  }
  return Buffer.from(value, "hex");
}

if (!process.env.KMS_MASTER_KEY && !process.env.ENCRYPTION_KEY) {
  logger.warn("KMS_MASTER_KEY not set — encryption will be insecure");
  throw new Error("KMS_MASTER_KEY or ENCRYPTION_KEY must be set");
}

// Master Key derivation
const KEY = process.env.KMS_MASTER_KEY || process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const MASTER_KEY = crypto.scryptSync(KEY, "kms-salt", 32);

// Old key derivation for backward compatibility fallback
const OLD_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const OLD_ENCRYPTION_KEY = crypto.scryptSync(OLD_KEY, "salt", 32);

interface KMSPayload {
  encryptedDek: string;
  dekIv: string;
  dekTag: string;
  secretIv: string;
  secretTag: string;
  encryptedSecret: string;
}

/**
 * Encrypt a text using simulated KMS envelope encryption (AES-256-GCM).
 * Generates a secure DEK per secret, encrypts the DEK with a local Master Key,
 * encrypts the secret with the DEK, and stores the resulting payload as a JSON string.
 */
export function encrypt(text: string): string {
  // 1. Generate secure DEK (32 bytes)
  const dek = crypto.randomBytes(32);

  // 2. Encrypt DEK with Master Key using AES-256-GCM
  const dekIv = crypto.randomBytes(IV_LENGTH);
  const cipherDek = crypto.createCipheriv(ALGORITHM, MASTER_KEY, dekIv);
  let encDek = cipherDek.update(dek);
  encDek = Buffer.concat([encDek, cipherDek.final()]);
  const dekTag = cipherDek.getAuthTag();

  // 3. Encrypt secret with DEK using AES-256-GCM
  const secretIv = crypto.randomBytes(IV_LENGTH);
  const cipherSecret = crypto.createCipheriv(ALGORITHM, dek, secretIv);
  let encSecret = cipherSecret.update(text, "utf8");
  encSecret = Buffer.concat([encSecret, cipherSecret.final()]);
  const secretTag = cipherSecret.getAuthTag();

  // 4. Return as JSON string
  const payload: KMSPayload = {
    encryptedDek: encDek.toString("hex"),
    dekIv: dekIv.toString("hex"),
    dekTag: dekTag.toString("hex"),
    secretIv: secretIv.toString("hex"),
    secretTag: secretTag.toString("hex"),
    encryptedSecret: encSecret.toString("hex"),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts a text encrypted with KMS envelope encryption.
 * Supports both JSON and 6-part colon-separated strings,
 * and falls back to old single-key decryption format (3-part colon-separated) for backward compatibility.
 */
export function decrypt(payloadStr: string): string {
  if (!payloadStr) {
    throw new Error("Empty payload cannot be decrypted");
  }

  // JSON envelope. Only a parse failure falls through; authentication or format errors in a
  // well-formed envelope are raised, never masked as "invalid format".
  if (payloadStr.trim().startsWith("{")) {
    let payload: KMSPayload | null = null;
    try {
      payload = JSON.parse(payloadStr) as KMSPayload;
    } catch {
      payload = null;
    }
    if (
      payload &&
      payload.encryptedDek &&
      payload.dekIv &&
      payload.dekTag &&
      payload.secretIv &&
      payload.secretTag &&
      payload.encryptedSecret
    ) {
      return decryptKMS(payload);
    }
  }

  // Check if it is colon-separated
  const parts = payloadStr.split(":");

  // New KMS 6-part colon-separated format
  if (parts.length === 6) {
    const [encryptedDek, dekIv, dekTag, secretIv, secretTag, encryptedSecret] = parts;
    return decryptKMS({
      encryptedDek,
      dekIv,
      dekTag,
      secretIv,
      secretTag,
      encryptedSecret,
    });
  }

  // Old single-key 3-part format: iv:tag:content
  if (parts.length === 3) {
    const [ivHex, tagHex, content] = parts;
    const decipher = gcmDecipher(OLD_ENCRYPTION_KEY, ivHex, tagHex);
    let decrypted = decipher.update(content, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  throw new Error("Invalid encrypted text or payload format");
}

/**
 * Helper to decrypt KMS envelope format
 */
function decryptKMS(payload: KMSPayload): string {
  // 1. Decrypt DEK with Master Key
  const decipherDek = gcmDecipher(MASTER_KEY, payload.dekIv, payload.dekTag);
  let dek = decipherDek.update(Buffer.from(payload.encryptedDek, "hex"));
  dek = Buffer.concat([dek, decipherDek.final()]);

  // 2. Decrypt Secret with DEK
  if (dek.length !== 32) throw new Error("Invalid data key length");
  const decipherSecret = gcmDecipher(dek, payload.secretIv, payload.secretTag);
  let secret = decipherSecret.update(Buffer.from(payload.encryptedSecret, "hex"), undefined, "utf8");
  secret += decipherSecret.final("utf8");

  return secret;
}
