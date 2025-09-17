import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import tasksRouter from "../../routes/tasks";

describe("Tasks API", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/tasks", tasksRouter);
  });

  describe("GET /api/tasks", () => {
    it("should return 400 when userId is missing", async () => {
      const response = await app.request("/api/tasks");
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("userId required");
    });

    it("should return 200 and empty array when no tasks exist", async () => {
      const response = await app.request("/api/tasks?userId=1");
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });
  });

  describe("POST /api/tasks", () => {
    it("should return 400 when required fields are missing", async () => {
      const response = await app.request("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "1" }), // missing title, goalId
      });
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid timeSlot", async () => {
      const response = await app.request("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Task",
          userId: "1",
          goalId: "1",
          timeSlot: "invalid",
        }),
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain(
        "timeSlot must be morning, afternoon, or night",
      );
    });
  });
});
