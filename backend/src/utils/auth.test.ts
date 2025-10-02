import { expect, test, describe, beforeAll } from "bun:test";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  type JWTPayload,
} from "./auth";

describe("auth utilities", () => {
  // Set up test environment variable before all tests
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret-key-for-testing-only-do-not-use-in-production";
  });

  describe("hashPassword", () => {
    test("hashes password successfully", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
      expect(typeof hash).toBe("string");
    });

    test("generates different hashes for same password (salt)", async () => {
      const password = "testPassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt uses random salt
      expect(hash1.length).toBe(hash2.length);
    });

    test("hashes different passwords differently", async () => {
      const password1 = "testPassword123";
      const password2 = "differentPassword456";
      const hash1 = await hashPassword(password1);
      const hash2 = await hashPassword(password2);

      expect(hash1).not.toBe(hash2);
    });

    test("handles empty password", async () => {
      const password = "";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(20);
    });

    test("handles long password", async () => {
      const password = "a".repeat(100);
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(20);
    });

    test("handles special characters in password", async () => {
      const password = "P@ssw0rd!#$%^&*()";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(20);
    });

    test("handles unicode characters in password", async () => {
      const password = "пароль密码🔐";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(20);
    });
  });

  describe("verifyPassword", () => {
    test("verifies correct password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test("rejects incorrect password", async () => {
      const password = "testPassword123";
      const wrongPassword = "wrongPassword456";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    test("rejects empty password against valid hash", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("", hash);

      expect(isValid).toBe(false);
    });

    test("verifies empty password if it was hashed", async () => {
      const password = "";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test("is case-sensitive", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("testpassword123", hash);

      expect(isValid).toBe(false);
    });

    test("rejects password with extra characters", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("testPassword123!", hash);

      expect(isValid).toBe(false);
    });

    test("rejects password with missing characters", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("testPassword12", hash);

      expect(isValid).toBe(false);
    });

    test("handles special characters correctly", async () => {
      const password = "P@ssw0rd!#$%^&*()";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test("handles unicode characters correctly", async () => {
      const password = "пароль密码🔐";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test("rejects against invalid hash format", async () => {
      const password = "testPassword123";
      const invalidHash = "not-a-valid-bcrypt-hash";
      const isValid = await verifyPassword(password, invalidHash);

      expect(isValid).toBe(false);
    });
  });

  describe("generateToken", () => {
    test("generates valid JWT token", () => {
      const payload: JWTPayload = { userId: 1, email: "test@example.com" };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT has 3 parts: header.payload.signature
    });

    test("generates different tokens for different payloads", () => {
      const payload1: JWTPayload = { userId: 1, email: "test1@example.com" };
      const payload2: JWTPayload = { userId: 2, email: "test2@example.com" };
      const token1 = generateToken(payload1);
      const token2 = generateToken(payload2);

      expect(token1).not.toBe(token2);
    });

    test("generates different tokens for same payload (due to timestamp)", async () => {
      const payload: JWTPayload = { userId: 1, email: "test@example.com" };
      const token1 = generateToken(payload);
      
      // Wait at least 1 second to ensure different 'iat' (issued at) timestamp
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const token2 = generateToken(payload);

      expect(token1).not.toBe(token2); // Different due to 'iat' (issued at) claim
    });

    test("includes userId in token", () => {
      const payload: JWTPayload = { userId: 42, email: "test@example.com" };
      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded?.userId).toBe(42);
    });

    test("includes email in token", () => {
      const payload: JWTPayload = { userId: 1, email: "user@example.com" };
      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded?.email).toBe("user@example.com");
    });

    test("handles large userId", () => {
      const payload: JWTPayload = { userId: 999999999, email: "test@example.com" };
      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded?.userId).toBe(999999999);
    });

    test("handles special characters in email", () => {
      const payload: JWTPayload = { userId: 1, email: "test+tag@sub.example.com" };
      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded?.email).toBe("test+tag@sub.example.com");
    });
  });

  describe("verifyToken", () => {
    test("verifies valid token", () => {
      const payload: JWTPayload = { userId: 1, email: "test@example.com" };
      const token = generateToken(payload);
      const verified = verifyToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(1);
      expect(verified?.email).toBe("test@example.com");
    });

    test("returns null for invalid token", () => {
      const invalidToken = "invalid.token.here";
      const verified = verifyToken(invalidToken);

      expect(verified).toBeNull();
    });

    test("returns null for tampered token", () => {
      const payload: JWTPayload = { userId: 1, email: "test@example.com" };
      const token = generateToken(payload);
      const tamperedToken = token.slice(0, -5) + "xxxxx";
      const verified = verifyToken(tamperedToken);

      expect(verified).toBeNull();
    });

    test("returns null for empty token", () => {
      const verified = verifyToken("");

      expect(verified).toBeNull();
    });

    test("returns null for malformed token (missing parts)", () => {
      const verified = verifyToken("only.two");

      expect(verified).toBeNull();
    });

    test("returns null for token with wrong signature", () => {
      const payload: JWTPayload = { userId: 1, email: "test@example.com" };
      const token = generateToken(payload);
      
      // Split token and replace signature
      const parts = token.split(".");
      const wrongSignature = "wrongSignatureHere";
      const tokenWithWrongSig = `${parts[0]}.${parts[1]}.${wrongSignature}`;
      
      const verified = verifyToken(tokenWithWrongSig);

      expect(verified).toBeNull();
    });

    test("preserves all payload fields", () => {
      const payload: JWTPayload = { userId: 123, email: "user@test.com" };
      const token = generateToken(payload);
      const verified = verifyToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(123);
      expect(verified?.email).toBe("user@test.com");
    });

    test("includes standard JWT claims", () => {
      const payload: JWTPayload = { userId: 1, email: "test@example.com" };
      const token = generateToken(payload);
      const verified = verifyToken(token) as any;

      expect(verified).not.toBeNull();
      expect(verified?.exp).toBeDefined(); // Expiration time
      expect(verified?.iat).toBeDefined(); // Issued at time
    });

    test("token expires after 7 days (check exp claim)", () => {
      const payload: JWTPayload = { userId: 1, email: "test@example.com" };
      const token = generateToken(payload);
      const verified = verifyToken(token) as any;

      expect(verified).not.toBeNull();
      
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      
      // Token should expire approximately 7 days from now
      expect(verified?.exp).toBeGreaterThan(now);
      expect(verified?.exp).toBeLessThanOrEqual(now + sevenDaysInSeconds + 10); // +10 for timing tolerance
    });
  });

  describe("integration: hash and verify workflow", () => {
    test("complete password verification workflow", async () => {
      const originalPassword = "mySecurePassword123!";
      
      // Step 1: Hash the password
      const hashedPassword = await hashPassword(originalPassword);
      
      // Step 2: Verify correct password
      const isCorrect = await verifyPassword(originalPassword, hashedPassword);
      expect(isCorrect).toBe(true);
      
      // Step 3: Verify incorrect password
      const isIncorrect = await verifyPassword("wrongPassword", hashedPassword);
      expect(isIncorrect).toBe(false);
    });
  });

  describe("integration: token generation and verification workflow", () => {
    test("complete token workflow", () => {
      const user: JWTPayload = { userId: 42, email: "user@example.com" };
      
      // Step 1: Generate token
      const token = generateToken(user);
      expect(token).toBeDefined();
      
      // Step 2: Verify token
      const verified = verifyToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(42);
      expect(verified?.email).toBe("user@example.com");
      
      // Step 3: Verify tampered token fails
      const tamperedToken = token.slice(0, -5) + "xxxxx";
      const verifiedTampered = verifyToken(tamperedToken);
      expect(verifiedTampered).toBeNull();
    });
  });

  describe("edge cases and error handling", () => {
    test("verifyPassword handles non-bcrypt hash gracefully", async () => {
      const password = "testPassword123";
      const fakeHash = "this-is-not-a-bcrypt-hash";
      const isValid = await verifyPassword(password, fakeHash);

      expect(isValid).toBe(false);
    });

    test("verifyToken handles random strings gracefully", () => {
      const randomString = "aGVsbG8gd29ybGQ="; // base64 encoded "hello world"
      const verified = verifyToken(randomString);

      expect(verified).toBeNull();
    });

    test("verifyToken handles JSON-like strings gracefully", () => {
      const jsonString = '{"userId": 1, "email": "test@example.com"}';
      const verified = verifyToken(jsonString);

      expect(verified).toBeNull();
    });
  });
});
