import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

// Master Key derivation
const KEY = process.env.KMS_MASTER_KEY || process.env.ENCRYPTION_KEY || "default-secret-key-must-be-32-bytes!!";
const MASTER_KEY = crypto.scryptSync(KEY, "kms-salt", 32);

// Old key derivation for backward compatibility fallback
const OLD_KEY = process.env.ENCRYPTION_KEY || "default-secret-key-must-be-32-bytes!!";
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

  // Check if it is a JSON string
  if (payloadStr.trim().startsWith("{")) {
    try {
      const payload: KMSPayload = JSON.parse(payloadStr);
      if (
        payload.encryptedDek &&
        payload.dekIv &&
        payload.dekTag &&
        payload.secretIv &&
        payload.secretTag &&
        payload.encryptedSecret
      ) {
        return decryptKMS(payload);
      }
    } catch (e) {
      // If parsing failed but it starts with '{', let's bubble up error or try colon splitting if it contains them
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
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, OLD_ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
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
  const decipherDek = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, Buffer.from(payload.dekIv, "hex"));
  decipherDek.setAuthTag(Buffer.from(payload.dekTag, "hex"));
  let dek = decipherDek.update(Buffer.from(payload.encryptedDek, "hex"));
  dek = Buffer.concat([dek, decipherDek.final()]);

  // 2. Decrypt Secret with DEK
  const decipherSecret = crypto.createDecipheriv(ALGORITHM, dek, Buffer.from(payload.secretIv, "hex"));
  decipherSecret.setAuthTag(Buffer.from(payload.secretTag, "hex"));
  let secret = decipherSecret.update(Buffer.from(payload.encryptedSecret, "hex"), undefined, "utf8");
  secret += decipherSecret.final("utf8");

  return secret;
}
