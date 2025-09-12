// TODO:
// Test for GET /api/goals
// Test for POST /api/goals
// Test for GET /api/goals/:id
// Test for PUT /api/goals/:id
// Test for DELETE /api/goals/:id

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import goalsRouter from "../../routes/goals"; // should fail

describe("Goals API - TDD Red Phase", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/goals", goalsRouter);
  });

  describe("GET /api/goals", () => {
    it("should return 200 and empty array when no goals exist", async () => {
      const response = await app.request("/api/goals");
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it("should return all goals when goals exist", async () => {
      // This will fail because routes don't exist
      const response = await app.request("/api/goals");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/goals", () => {
    it("should return 400 when title is missing", async () => {
      const response = await app.request("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "1" }),
      });
      expect(response.status).toBe(400);
    });

    it("should return 400 when userId is missing", async () => {
      const response = await app.request("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test Goal" }),
      });
      expect(response.status).toBe(400);
    });

    it("should return 201 when goal is created successfully", async () => {
      const response = await app.request("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Goal",
          userId: "1",
        }),
      });
      expect(response.status).toBe(201);
    });
  });

  describe("GET /api/goals/:id", () => {
    it("should return 404 when goal does not exist", async () => {
      const response = await app.request("/api/goals/999");
      expect(response.status).toBe(404);
    });

    it("should return goal when it exists", async () => {
      const response = await app.request("/api/goals/1");
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/goals/:id", () => {
    it("should return 404 when goal does not exist", async () => {
      const response = await app.request("/api/goals/999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      });
      expect(response.status).toBe(404);
    });

    it("should update goal when it exists", async () => {
      const response = await app.request("/api/goals/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Goal" }),
      });
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/goals/:id", () => {
    it("should return 404 when goal does not exist", async () => {
      const response = await app.request("/api/goals/999", {
        method: "DELETE",
      });
      expect(response.status).toBe(404);
    });

    it("should delete goal when it exists", async () => {
      const response = await app.request("/api/goals/1", {
        method: "DELETE",
      });
      expect(response.status).toBe(200);
    });
  });
});
