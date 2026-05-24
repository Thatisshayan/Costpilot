import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY = process.env.ENCRYPTION_KEY || "default-secret-key-must-be-32-bytes!!"; // 32 bytes fallback

// Ensure key is 32 bytes
const ENCRYPTION_KEY = crypto.scryptSync(KEY, "salt", 32);

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const tag = cipher.getAuthTag();
  
  // Return IV + AuthTag + EncryptedText
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, tagHex, content] = encryptedText.split(":");
  
  if (!ivHex || !tagHex || !content) {
    throw new Error("Invalid encrypted text format");
  }
  
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(content, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
