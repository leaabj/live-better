import { expect, test, describe, beforeEach } from "bun:test";
import { Hono } from "hono";
import { createAuthRouter } from "./auth";
import { createTestDb, seedTestData } from "../db/test-db";
import { generateToken, hashPassword } from "../utils/auth";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Auth Routes - Integration Tests with Mock Database
 *
 * These tests verify actual database operations:
 * - User registration and duplicate prevention
 * - User login with password verification
 * - Profile retrieval and updates
 * - Data persistence and isolation
 */

describe("Auth Routes - Integration Tests", () => {
  let testDb: any;
  let testApp: Hono;

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    testDb = createTestDb();

    // Create app with test database
    testApp = new Hono();
    testApp.route("/api/auth", createAuthRouter(testDb));
  });

  describe("POST /api/auth/register", () => {
    test("creates user in database", async () => {
      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New User",
          email: "newuser@example.com",
          password: "password123",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user.name).toBe("New User");
      expect(data.data.user.email).toBe("newuser@example.com");
      expect(data.data.user.password).toBeUndefined(); // Password should not be in response
      expect(data.data.token).toBeDefined();

      // Verify user exists in database
      const dbUsers = await testDb.select().from(users);
      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].email).toBe("newuser@example.com");
      expect(dbUsers[0].password).not.toBe("password123"); // Should be hashed
    });

    test("prevents duplicate email registration", async () => {
      // Create first user
      const now = new Date();
      await testDb.insert(users).values({
        name: "Existing User",
        email: "existing@example.com",
        password: await hashPassword("password123"),
        createdAt: now,
        updatedAt: now,
      });

      // Try to register with same email
      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New User",
          email: "existing@example.com",
          password: "password456",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain("already exists");

      // Verify only one user in database
      const dbUsers = await testDb.select().from(users);
      expect(dbUsers).toHaveLength(1);
    });

    test("hashes password before storing", async () => {
      const plainPassword = "mySecurePassword123";

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: plainPassword,
        }),
      });

      await testApp.fetch(req);

      // Check password is hashed in database
      const dbUsers = await testDb.select().from(users);
      expect(dbUsers[0].password).not.toBe(plainPassword);
      expect(dbUsers[0].password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    test("sets default preferredTimeSlots", async () => {
      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      // Check in database
      const dbUsers = await testDb.select().from(users);
      expect(dbUsers[0].preferredTimeSlots).toBe(
        '["morning", "afternoon", "night"]',
      );
    });
  });

  describe("POST /api/auth/login", () => {
    test("logs in user with correct credentials", async () => {
      // Create user
      const hashedPassword = await hashPassword("password123");
      const now = new Date();
      await testDb.insert(users).values({
        name: "Test User",
        email: "test@example.com",
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe("test@example.com");
      expect(data.data.user.password).toBeUndefined();
      expect(data.data.token).toBeDefined();
    });

    test("rejects login with wrong password", async () => {
      // Create user
      const hashedPassword = await hashPassword("correctPassword");
      const now = new Date();
      await testDb.insert(users).values({
        name: "Test User",
        email: "test@example.com",
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongPassword",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid email or password");
    });

    test("rejects login with non-existent email", async () => {
      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: "password123",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid email or password");
    });
  });

  describe("GET /api/auth/profile", () => {
    test("retrieves user profile from database", async () => {
      // Create user
      const { testUser } = await seedTestData(testDb);
      const token = generateToken({
        userId: testUser.id,
        email: testUser.email,
      });

      const req = new Request("http://localhost/api/auth/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(testUser.id);
      expect(data.data.email).toBe(testUser.email);
      expect(data.data.name).toBe(testUser.name);
      expect(data.data.password).toBeUndefined();
    });

    test("parses preferredTimeSlots JSON", async () => {
      // Create user with custom time slots
      const hashedPassword = await hashPassword("password123");
      const now = new Date();
      const user = await testDb
        .insert(users)
        .values({
          name: "Test User",
          email: "test@example.com",
          password: hashedPassword,
          preferredTimeSlots: '["morning", "night"]',
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const token = generateToken({
        userId: user[0].id,
        email: user[0].email,
      });

      const req = new Request("http://localhost/api/auth/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(data.data.preferredTimeSlots).toEqual(["morning", "night"]);
    });

    test("returns 404 for non-existent user", async () => {
      // Create token for non-existent user
      const token = generateToken({
        userId: 9999,
        email: "nonexistent@example.com",
      });

      const req = new Request("http://localhost/api/auth/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe("PUT /api/auth/profile", () => {
    test("updates user profile in database", async () => {
      // Create user
      const { testUser } = await seedTestData(testDb);
      const token = generateToken({
        userId: testUser.id,
        email: testUser.email,
      });

      const req = new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: "Updated Name",
          userContext: "Updated context",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("Updated Name");
      expect(data.data.userContext).toBe("Updated context");

      // Verify in database
      const dbUser = await testDb
        .select()
        .from(users)
        .where(eq(users.id, testUser.id));
      expect(dbUser[0].name).toBe("Updated Name");
      expect(dbUser[0].userContext).toBe("Updated context");
    });

    test("updates preferredTimeSlots", async () => {
      // Create user
      const { testUser } = await seedTestData(testDb);
      const token = generateToken({
        userId: testUser.id,
        email: testUser.email,
      });

      const req = new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          preferredTimeSlots: ["afternoon", "night"],
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.preferredTimeSlots).toEqual(["afternoon", "night"]);

      // Verify in database (stored as JSON string)
      const dbUser = await testDb
        .select()
        .from(users)
        .where(eq(users.id, testUser.id));
      expect(dbUser[0].preferredTimeSlots).toBe('["afternoon","night"]');
    });

    test("allows partial updates", async () => {
      // Create user
      const { testUser } = await seedTestData(testDb);
      const token = generateToken({
        userId: testUser.id,
        email: testUser.email,
      });

      const originalName = testUser.name;

      const req = new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userContext: "Only updating context",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.name).toBe(originalName); // Name unchanged
      expect(data.data.userContext).toBe("Only updating context");
    });

    test("updates updatedAt timestamp", async () => {
      // Create user
      const { testUser } = await seedTestData(testDb);
      const token = generateToken({
        userId: testUser.id,
        email: testUser.email,
      });

      const originalUpdatedAt = testUser.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const req = new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
      });

      await testApp.fetch(req);

      // Verify updatedAt changed in database
      const dbUser = await testDb
        .select()
        .from(users)
        .where(eq(users.id, testUser.id));
      expect(dbUser[0].updatedAt).not.toEqual(originalUpdatedAt);
    });
  });

  describe("User Isolation", () => {
    test("users can only access their own profile", async () => {
      // Create two users
      const now = new Date();
      const user1 = await testDb
        .insert(users)
        .values({
          name: "User 1",
          email: "user1@example.com",
          password: await hashPassword("password123"),
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const user2 = await testDb
        .insert(users)
        .values({
          name: "User 2",
          email: "user2@example.com",
          password: await hashPassword("password123"),
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // User 1's token
      const token1 = generateToken({
        userId: user1[0].id,
        email: user1[0].email,
      });

      // Try to access profile
      const req = new Request("http://localhost/api/auth/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token1}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      // Should get user 1's profile, not user 2's
      expect(data.data.id).toBe(user1[0].id);
      expect(data.data.email).toBe("user1@example.com");
      expect(data.data.email).not.toBe("user2@example.com");
    });
  });

  describe("Error Handling & Edge Cases", () => {
    test("handles very long names gracefully", async () => {
      const longName = "A".repeat(1000);

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: longName,
          email: "longname@example.com",
          password: "password123",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      // Should either accept or reject gracefully
      expect([201, 400, 500]).toContain(res.status);
    });

    test("handles special characters in email", async () => {
      const now = new Date();
      const specialEmail = "test+tag@example.com";

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: specialEmail,
          password: "password123",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.user.email).toBe(specialEmail);
    });

    test("handles unicode characters in name", async () => {
      const unicodeName = "José García 日本語";

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: unicodeName,
          email: "unicode@example.com",
          password: "password123",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.user.name).toBe(unicodeName);
    });

    test("handles malformed JSON gracefully", async () => {
      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json",
      });

      const res = await testApp.fetch(req);

      // Should return error (400 or 500)
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test("handles empty request body", async () => {
      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Validation failed");
    });

    test("profile update handles null values correctly", async () => {
      const { testUser } = await seedTestData(testDb);
      const token = generateToken({
        userId: testUser.id,
        email: testUser.email,
      });

      const req = new Request("http://localhost/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userContext: null,
        }),
      });

      const res = await testApp.fetch(req);

      // Should handle null gracefully
      expect([200, 400]).toContain(res.status);
    });
  });
});
