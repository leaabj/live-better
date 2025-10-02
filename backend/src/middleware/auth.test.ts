import { expect, test, describe, beforeAll, mock } from "bun:test";
import { Hono } from "hono";
import { authMiddleware, getAuthUser } from "./auth";
import { generateToken, type JWTPayload } from "../utils/auth";

describe("auth middleware", () => {
  let app: Hono;

  beforeAll(() => {
    // Set up test environment variable
    process.env.JWT_SECRET = "test-secret-key-for-middleware-testing";
  });

  // Create a fresh app instance before each test
  const createTestApp = () => {
    const testApp = new Hono();

    // Protected route that uses authMiddleware
    testApp.get("/protected", authMiddleware, async (c) => {
      const user = getAuthUser(c);
      return c.json({
        success: true,
        message: "Access granted",
        user,
      });
    });

    // Public route for comparison
    testApp.get("/public", async (c) => {
      return c.json({ success: true, message: "Public access" });
    });

    return testApp;
  };

  describe("authMiddleware", () => {
    describe("successful authentication", () => {
      test("allows request with valid Bearer token", async () => {
        const app = createTestApp();
        const payload: JWTPayload = { userId: 1, email: "test@example.com" };
        const token = generateToken(payload);

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe("Access granted");
        expect(data.user.userId).toBe(1);
        expect(data.user.email).toBe("test@example.com");
      });

      test("sets user in context correctly", async () => {
        const app = createTestApp();
        const payload: JWTPayload = { userId: 42, email: "user@test.com" };
        const token = generateToken(payload);

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(data.user.userId).toBe(42);
        expect(data.user.email).toBe("user@test.com");
      });

      test("allows request with token containing special characters in email", async () => {
        const app = createTestApp();
        const payload: JWTPayload = {
          userId: 1,
          email: "test+tag@sub.example.com",
        };
        const token = generateToken(payload);

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.user.email).toBe("test+tag@sub.example.com");
      });
    });

    describe("missing authorization header", () => {
      test("blocks request without Authorization header", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/protected");
        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Authorization token required");
      });

      test("blocks request with empty Authorization header", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: "",
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Authorization token required");
      });
    });

    describe("malformed authorization header", () => {
      test("blocks request without 'Bearer ' prefix", async () => {
        const app = createTestApp();
        const payload: JWTPayload = { userId: 1, email: "test@example.com" };
        const token = generateToken(payload);

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: token, // Missing "Bearer " prefix
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Authorization token required");
      });

      test("blocks request with wrong auth scheme", async () => {
        const app = createTestApp();
        const payload: JWTPayload = { userId: 1, email: "test@example.com" };
        const token = generateToken(payload);

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: `Basic ${token}`, // Wrong scheme
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Authorization token required");
      });

      test("blocks request with lowercase 'bearer'", async () => {
        const app = createTestApp();
        const payload: JWTPayload = { userId: 1, email: "test@example.com" };
        const token = generateToken(payload);

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: `bearer ${token}`, // Lowercase
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Authorization token required");
      });

      test("blocks request with extra spaces in Bearer token", async () => {
        const app = createTestApp();
        const payload: JWTPayload = { userId: 1, email: "test@example.com" };
        const token = generateToken(payload);

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: `Bearer  ${token}`, // Extra space
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid or expired token");
      });
    });

    describe("invalid tokens", () => {
      test("blocks request with invalid token", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: "Bearer invalid.token.here",
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid or expired token");
      });

      test("blocks request with tampered token", async () => {
        const app = createTestApp();
        const payload: JWTPayload = { userId: 1, email: "test@example.com" };
        const token = generateToken(payload);
        const tamperedToken = token.slice(0, -5) + "xxxxx";

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: `Bearer ${tamperedToken}`,
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid or expired token");
      });

      test("blocks request with empty token", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: "Bearer ",
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        // Empty token after "Bearer " is treated as missing Authorization
        expect(data.error).toBe("Authorization token required");
      });

      test("blocks request with malformed JWT", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: "Bearer not.a.jwt",
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid or expired token");
      });

      test("blocks request with random string as token", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: "Bearer randomstringtoken",
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid or expired token");
      });

      test("blocks request with JSON as token", async () => {
        const app = createTestApp();
        const jsonToken = JSON.stringify({ userId: 1, email: "test@example.com" });

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: `Bearer ${jsonToken}`,
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid or expired token");
      });
    });

    describe("edge cases", () => {
      test("handles very long token gracefully", async () => {
        const app = createTestApp();
        const longToken = "a".repeat(10000);

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: `Bearer ${longToken}`,
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid or expired token");
      });

      test("handles token with special characters", async () => {
        const app = createTestApp();
        const specialToken = "token!@#$%^&*()";

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: `Bearer ${specialToken}`,
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid or expired token");
      });

      test("handles token with unicode characters", async () => {
        const app = createTestApp();
        // Use base64-encoded unicode to avoid HTTP header encoding issues
        const unicodeToken = Buffer.from("токен密码🔐").toString("base64");

        const req = new Request("http://localhost/protected", {
          headers: {
            Authorization: `Bearer ${unicodeToken}`,
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid or expired token");
      });
    });

    describe("public routes", () => {
      test("public routes work without authentication", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/public");
        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe("Public access");
      });
    });
  });

  describe("getAuthUser", () => {
    test("returns user from context when authenticated", async () => {
      const app = createTestApp();
      const payload: JWTPayload = { userId: 123, email: "user@example.com" };
      const token = generateToken(payload);

      const req = new Request("http://localhost/protected", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(data.user).toBeDefined();
      expect(data.user.userId).toBe(123);
      expect(data.user.email).toBe("user@example.com");
    });

    test("returns undefined when user not in context", async () => {
      const testApp = new Hono();

      testApp.get("/test", async (c) => {
        const user = getAuthUser(c);
        return c.json({ user });
      });

      const req = new Request("http://localhost/test");
      const res = await testApp.fetch(req);
      const data = await res.json();

      // Hono returns undefined for missing context values, not null
      expect(data.user).toBeUndefined();
    });

    test("preserves all user properties from token", async () => {
      const app = createTestApp();
      const payload: JWTPayload = {
        userId: 999,
        email: "complex.email+tag@sub.domain.com",
      };
      const token = generateToken(payload);

      const req = new Request("http://localhost/protected", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(data.user.userId).toBe(999);
      expect(data.user.email).toBe("complex.email+tag@sub.domain.com");
    });
  });

  describe("integration scenarios", () => {
    test("multiple requests with same token work correctly", async () => {
      const app = createTestApp();
      const payload: JWTPayload = { userId: 1, email: "test@example.com" };
      const token = generateToken(payload);

      // First request
      const req1 = new Request("http://localhost/protected", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res1 = await app.fetch(req1);
      expect(res1.status).toBe(200);

      // Second request with same token
      const req2 = new Request("http://localhost/protected", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res2 = await app.fetch(req2);
      expect(res2.status).toBe(200);
    });

    test("different tokens for different users work independently", async () => {
      const app = createTestApp();

      const user1: JWTPayload = { userId: 1, email: "user1@example.com" };
      const token1 = generateToken(user1);

      const user2: JWTPayload = { userId: 2, email: "user2@example.com" };
      const token2 = generateToken(user2);

      // Request with user1 token
      const req1 = new Request("http://localhost/protected", {
        headers: { Authorization: `Bearer ${token1}` },
      });
      const res1 = await app.fetch(req1);
      const data1 = await res1.json();

      expect(res1.status).toBe(200);
      expect(data1.user.userId).toBe(1);
      expect(data1.user.email).toBe("user1@example.com");

      // Request with user2 token
      const req2 = new Request("http://localhost/protected", {
        headers: { Authorization: `Bearer ${token2}` },
      });
      const res2 = await app.fetch(req2);
      const data2 = await res2.json();

      expect(res2.status).toBe(200);
      expect(data2.user.userId).toBe(2);
      expect(data2.user.email).toBe("user2@example.com");
    });

    test("switching from valid to invalid token fails correctly", async () => {
      const app = createTestApp();
      const payload: JWTPayload = { userId: 1, email: "test@example.com" };
      const validToken = generateToken(payload);

      // First request with valid token
      const req1 = new Request("http://localhost/protected", {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      const res1 = await app.fetch(req1);
      expect(res1.status).toBe(200);

      // Second request with invalid token
      const req2 = new Request("http://localhost/protected", {
        headers: { Authorization: "Bearer invalid.token" },
      });
      const res2 = await app.fetch(req2);
      expect(res2.status).toBe(401);
    });
  });
});
