import { expect, test, describe } from "bun:test";
import { Hono } from "hono";
import authRouter from "./auth";

/**
 * Auth Routes Integration Tests
 * 
 * Note: These tests focus on validation, error handling, and route structure.
 * Full database integration tests would require a test database setup.
 * 
 * What we test:
 * - Request/response structure
 * - Input validation (Zod schemas)
 * - Error handling and status codes
 * - Route accessibility
 */

describe("auth routes - validation and structure", () => {
  let app: Hono;

  // Create app instance before each test
  const createTestApp = () => {
    const testApp = new Hono();
    testApp.route("/api/auth", authRouter);
    return testApp;
  };

  describe("POST /api/auth/register", () => {
    describe("input validation", () => {
      test("rejects registration with short name (< 2 characters)", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "T",
            email: "test@example.com",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Validation failed");
        expect(data.details).toBeDefined();
        expect(Array.isArray(data.details)).toBe(true);
      });

      test("rejects registration with invalid email format", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "invalid-email",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Validation failed");
        expect(data.details).toBeDefined();
      });

      test("rejects registration with short password (< 6 characters)", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            password: "12345",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Validation failed");
      });

      test("rejects registration with missing name", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
      });

      test("rejects registration with missing email", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
      });

      test("rejects registration with missing password", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
      });

      test("rejects registration with all fields missing", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Validation failed");
        expect(data.details.length).toBeGreaterThan(0);
      });

      test("rejects registration with multiple validation errors", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "T", // Too short
            email: "invalid", // Invalid format
            password: "123", // Too short
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.details.length).toBe(3); // All three fields should have errors
      });

      test("accepts valid registration data format", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        // Will fail at database level, but validation passes
        // Status will be 500 (database error) not 400 (validation error)
        expect(res.status).not.toBe(400);
      });

      test("accepts name with special characters", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "O'Brien-Smith",
            email: "test@example.com",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);

        // Should not be a validation error (400)
        expect(res.status).not.toBe(400);
      });

      test("accepts email with plus sign", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test+tag@example.com",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);

        // Should not be a validation error (400)
        expect(res.status).not.toBe(400);
      });

      test("accepts email with subdomain", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@mail.example.com",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);

        // Should not be a validation error (400)
        expect(res.status).not.toBe(400);
      });

      test("accepts minimum valid name (2 characters)", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Jo",
            email: "jo@example.com",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);

        // Should not be a validation error (400)
        expect(res.status).not.toBe(400);
      });

      test("accepts minimum valid password (6 characters)", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            password: "pass12",
          }),
        });

        const res = await app.fetch(req);

        // Should not be a validation error (400)
        expect(res.status).not.toBe(400);
      });
    });

    describe("request structure", () => {
      test("requires Content-Type: application/json", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            password: "password123",
          }),
          // No Content-Type header
        });

        const res = await app.fetch(req);

        // Should handle missing Content-Type gracefully
        expect(res.status).toBeGreaterThanOrEqual(400);
      });

      test("returns JSON response", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "T", // Invalid to trigger error response
            email: "test@example.com",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);
        const contentType = res.headers.get("Content-Type");

        expect(contentType).toContain("application/json");
      });

      test("only accepts POST method", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/register", {
          method: "GET",
        });

        const res = await app.fetch(req);

        expect(res.status).toBe(404); // Route not found for GET
      });
    });
  });

  describe("POST /api/auth/login", () => {
    describe("input validation", () => {
      test("rejects login with invalid email format", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "not-an-email",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Validation failed");
      });

      test("rejects login with empty password", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "test@example.com",
            password: "",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
      });

      test("rejects login with missing email", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: "password123",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
      });

      test("rejects login with missing password", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "test@example.com",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
      });

      test("accepts minimum password length (1 character)", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "test@example.com",
            password: "p",
          }),
        });

        const res = await app.fetch(req);

        // Should not be a validation error (400)
        expect(res.status).not.toBe(400);
      });

      test("accepts valid login data format", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);

        // Should not be a validation error (400)
        expect(res.status).not.toBe(400);
      });
    });

    describe("request structure", () => {
      test("returns JSON response", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "invalid",
            password: "password123",
          }),
        });

        const res = await app.fetch(req);
        const contentType = res.headers.get("Content-Type");

        expect(contentType).toContain("application/json");
      });

      test("only accepts POST method", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/login", {
          method: "GET",
        });

        const res = await app.fetch(req);

        expect(res.status).toBe(404); // Route not found for GET
      });
    });
  });

  describe("GET /api/auth/profile", () => {
    test("requires authentication", async () => {
      const app = createTestApp();

      const req = new Request("http://localhost/api/auth/profile", {
        method: "GET",
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Authorization token required");
    });

    test("rejects request without Bearer prefix", async () => {
      const app = createTestApp();

      const req = new Request("http://localhost/api/auth/profile", {
        method: "GET",
        headers: {
          Authorization: "sometoken",
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    test("rejects request with invalid token", async () => {
      const app = createTestApp();

      const req = new Request("http://localhost/api/auth/profile", {
        method: "GET",
        headers: {
          Authorization: "Bearer invalid.token.here",
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe("PUT /api/auth/profile", () => {
    test("requires authentication", async () => {
      const app = createTestApp();

      const req = new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Name",
        }),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    describe("input validation (when authenticated)", () => {
      // Note: These tests will fail at auth level, but we test the route exists
      test("accepts empty update object", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer fake.token",
          },
          body: JSON.stringify({}),
        });

        const res = await app.fetch(req);

        // Will fail at auth (401), not validation (400)
        expect(res.status).toBe(401);
      });
    });
  });

  describe("route structure", () => {
    test("all auth routes are under /api/auth", async () => {
      const app = createTestApp();

      // Test that routes are properly prefixed
      const routes = [
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/profile",
      ];

      for (const route of routes) {
        const req = new Request(`http://localhost${route}`, {
          method: route === "/api/auth/profile" ? "GET" : "POST",
          headers: { "Content-Type": "application/json" },
          body: route !== "/api/auth/profile" ? JSON.stringify({}) : undefined,
        });

        const res = await app.fetch(req);

        // Should not be 404 (route exists)
        expect(res.status).not.toBe(404);
      }
    });
  });
});
