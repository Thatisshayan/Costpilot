import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { encrypt, decrypt } from "../../../artifacts/api-server/src/lib/kms-vault";

describe("KMS Simulated Envelope Encryption (AES-256-GCM)", () => {
  const SECRET_TEXT = "super-secret-api-key-123456";

  it("should successfully encrypt and decrypt a secret", () => {
    const encrypted = encrypt(SECRET_TEXT);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(SECRET_TEXT);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(SECRET_TEXT);
  });

  it("should generate a valid JSON payload containing the envelope metadata", () => {
    const encrypted = encrypt(SECRET_TEXT);
    
    // Should be valid JSON
    let parsed: any;
    expect(() => {
      parsed = JSON.parse(encrypted);
    }).not.toThrow();

    expect(parsed).toBeDefined();
    expect(parsed.encryptedDek).toBeDefined();
    expect(parsed.dekIv).toBeDefined();
    expect(parsed.dekTag).toBeDefined();
    expect(parsed.secretIv).toBeDefined();
    expect(parsed.secretTag).toBeDefined();
    expect(parsed.encryptedSecret).toBeDefined();

    // Verify lengths (hex representation)
    expect(parsed.dekIv.length).toBe(24); // 12 bytes IV
    expect(parsed.dekTag.length).toBe(32); // 16 bytes Auth Tag
    expect(parsed.secretIv.length).toBe(24); // 12 bytes IV
    expect(parsed.secretTag.length).toBe(32); // 16 bytes Auth Tag
  });

  it("should generate a unique DEK and unique IVs for each encryption call (provenance / distinct payloads)", () => {
    const enc1 = encrypt(SECRET_TEXT);
    const enc2 = encrypt(SECRET_TEXT);

    const p1 = JSON.parse(enc1);
    const p2 = JSON.parse(enc2);

    // DEKs, IVs, tags, and encrypted outputs should all be cryptographically unique per call
    expect(p1.encryptedDek).not.toBe(p2.encryptedDek);
    expect(p1.dekIv).not.toBe(p2.dekIv);
    expect(p1.secretIv).not.toBe(p2.secretIv);
    expect(p1.encryptedSecret).not.toBe(p2.encryptedSecret);
  });

  it("should successfully decrypt old format single-key (3-part colon-separated) for backward compatibility", () => {
    // Generate old format encrypted text manually using the old key parameters
    const oldAlgorithm = "aes-256-gcm";
    const oldKey = process.env.ENCRYPTION_KEY || "default-secret-key-must-be-32-bytes!!";
    const oldEncryptionKey = crypto.scryptSync(oldKey, "salt", 32);
    
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(oldAlgorithm, oldEncryptionKey, iv);
    let content = cipher.update(SECRET_TEXT, "utf8", "hex");
    content += cipher.final("hex");
    const tag = cipher.getAuthTag();

    const oldFormatPayload = `${iv.toString("hex")}:${tag.toString("hex")}:${content}`;

    // Should decrypt the old format flawlessly
    const decrypted = decrypt(oldFormatPayload);
    expect(decrypted).toBe(SECRET_TEXT);
  });

  it("should support new KMS format when serialized as a 6-part colon-separated string", () => {
    // Manually serialize from a valid encryption
    const encryptedJson = encrypt(SECRET_TEXT);
    const p = JSON.parse(encryptedJson);
    
    const colonSeparatedPayload = `${p.encryptedDek}:${p.dekIv}:${p.dekTag}:${p.secretIv}:${p.secretTag}:${p.encryptedSecret}`;

    // Should decrypt the colon separated KMS format flawlessly
    const decrypted = decrypt(colonSeparatedPayload);
    expect(decrypted).toBe(SECRET_TEXT);
  });

  it("should throw errors on invalid payload structure or tampered inputs", () => {
    expect(() => decrypt("")).toThrow("Empty payload cannot be decrypted");
    expect(() => decrypt("invalid-unencrypted-string")).toThrow("Invalid encrypted text or payload format");
    
    const validJson = encrypt(SECRET_TEXT);
    const p = JSON.parse(validJson);

    // Tamper with the encrypted secret (e.g. change last character of hex)
    const originalSecret = p.encryptedSecret;
    const tamperedSecret = originalSecret.substring(0, originalSecret.length - 1) + (originalSecret.endsWith("0") ? "1" : "0");
    p.encryptedSecret = tamperedSecret;

    expect(() => decrypt(JSON.stringify(p))).toThrow();
  });
});
