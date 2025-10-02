import { expect, test, describe } from "bun:test";
import { Hono } from "hono";
import tasksRouter from "./tasks";
import { generateToken } from "../utils/auth";

/**
 * Tasks Routes Integration Tests
 * 
 * Note: These tests focus on authentication, validation, and route structure.
 * Full database integration tests would require a test database setup.
 * 
 * What we test:
 * - Authentication requirements
 * - Input validation
 * - Time slot validation
 * - Duration validation
 * - Error handling and status codes
 */

describe("tasks routes - validation and structure", () => {
  const createTestApp = () => {
    const testApp = new Hono();
    testApp.route("/api/tasks", tasksRouter);
    return testApp;
  };

  const createAuthToken = () => {
    return generateToken({ userId: 1, email: "test@example.com" });
  };

  describe("GET /api/tasks", () => {
    describe("authentication", () => {
      test("requires authentication", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/tasks", {
          method: "GET",
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
      });

      test("accepts valid token", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(401);
      });
    });

    describe("response structure", () => {
      test("returns JSON response", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);
        const contentType = res.headers.get("Content-Type");

        expect(contentType).toContain("application/json");
      });
    });
  });

  describe("GET /api/tasks/all", () => {
    describe("authentication", () => {
      test("requires authentication", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/tasks/all", {
          method: "GET",
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
      });

      test("accepts valid token", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks/all", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(401);
      });
    });
  });

  describe("POST /api/tasks", () => {
    describe("authentication", () => {
      test("requires authentication", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Test Task",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
      });
    });

    describe("input validation", () => {
      test("rejects request without title", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            description: "Task without title",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Title is required");
      });

      test("rejects request with empty title", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
      });

      test("accepts request with title only", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
          }),
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
        expect(res.status).not.toBe(401);
      });

      test("accepts request with all fields", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            description: "Test Description",
            goalId: 1,
            timeSlot: "morning",
            specificTime: new Date().toISOString(),
            duration: 30,
          }),
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });
    });

    describe("time slot validation", () => {
      test("rejects invalid time slot", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            timeSlot: "invalid",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain("timeSlot");
      });

      test("accepts 'morning' time slot", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            timeSlot: "morning",
          }),
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });

      test("accepts 'afternoon' time slot", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            timeSlot: "afternoon",
          }),
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });

      test("accepts 'night' time slot", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            timeSlot: "night",
          }),
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });
    });

    describe("duration validation", () => {
      test("rejects duration below 5 minutes", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            duration: 4,
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain("duration");
      });

      test("rejects duration above 480 minutes", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            duration: 481,
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
      });

      test("accepts minimum duration (5 minutes)", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            duration: 5,
          }),
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });

      test("accepts maximum duration (480 minutes)", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            duration: 480,
          }),
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });

      test("accepts typical duration (30 minutes)", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            duration: 30,
          }),
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });
    });

    describe("specific time validation", () => {
      test("accepts valid ISO 8601 timestamp", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            specificTime: "2025-10-02T08:00:00Z",
          }),
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });

      test("rejects invalid timestamp format", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Test Task",
            specificTime: "invalid-date",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
      });
    });
  });

  describe("GET /api/tasks/:id", () => {
    describe("authentication", () => {
      test("requires authentication", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/tasks/1", {
          method: "GET",
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
      });
    });

    describe("parameter validation", () => {
      test("rejects invalid task ID format", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks/invalid", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid task ID");
      });

      test("accepts numeric task ID", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks/123", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });
    });
  });

  describe("PUT /api/tasks/:id", () => {
    describe("authentication", () => {
      test("requires authentication", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/tasks/1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Updated Task",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
      });
    });

    describe("parameter validation", () => {
      test("rejects invalid task ID format", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks/invalid", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Updated Task",
          }),
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid task ID");
      });
    });

    describe("input validation", () => {
      test("accepts completion status update", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks/1", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            completed: true,
          }),
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });

      test("accepts partial update (title only)", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks/1", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "Updated Title",
          }),
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    describe("authentication", () => {
      test("requires authentication", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/tasks/1", {
          method: "DELETE",
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
      });
    });

    describe("parameter validation", () => {
      test("rejects invalid task ID format", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks/invalid", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid task ID");
      });

      test("accepts numeric task ID", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks/123", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);

        expect(res.status).not.toBe(400);
      });
    });
  });

  describe("POST /api/tasks/:id/validate-photo", () => {
    describe("authentication", () => {
      test("requires authentication", async () => {
        const app = createTestApp();

        const req = new Request("http://localhost/api/tasks/1/validate-photo", {
          method: "POST",
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
      });
    });

    describe("parameter validation", () => {
      test("rejects invalid task ID format", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks/invalid/validate-photo", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Invalid task ID");
      });
    });

    describe("route accessibility", () => {
      test("route exists and is accessible with auth", async () => {
        const app = createTestApp();
        const token = createAuthToken();

        const req = new Request("http://localhost/api/tasks/1/validate-photo", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const res = await app.fetch(req);

        // Should not be 401 (auth passed)
        // May be 400 (no image), 404 (task not found), or 500 (service issues)
        expect(res.status).not.toBe(401);
      });
    });
  });
});
