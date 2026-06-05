import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";

describe("Encryption Utility", () => {
  let encrypt: typeof import("../encryption").encrypt;
  let decrypt: typeof import("../encryption").decrypt;

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY = "test-key-32-bytes-long-for-aes-256-gcm!";
    const mod = await import("../encryption");
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
  });

  it("should encrypt and decrypt round trip correctly", () => {
    const plaintext = "my-secret-api-key-sk-proj-abc123";
    const encrypted = encrypt(plaintext);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertexts for different inputs", () => {
    const enc1 = encrypt("input-one");
    const enc2 = encrypt("input-two");
    expect(enc1).not.toBe(enc2);
  });

  it("should produce different ciphertexts for same input due to random IV", () => {
    const enc1 = encrypt("same-data");
    const enc2 = encrypt("same-data");
    expect(enc1).not.toBe(enc2);
  });

  it("should throw on decrypt with invalid format", () => {
    expect(() => decrypt("not-valid-format")).toThrow();
  });

  it("should throw on tampered ciphertext", () => {
    const encrypted = encrypt("important-data");
    const parts = encrypted.split(":");
    const tampered = parts.map((p, i) =>
      i === parts.length - 1
        ? p.substring(0, p.length - 1) + (p.endsWith("a") ? "b" : "a")
        : p
    ).join(":");
    expect(() => decrypt(tampered)).toThrow();
  });
});
