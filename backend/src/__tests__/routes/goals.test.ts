import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import goalsRouter from "../../routes/goals";

describe("Goals API - User Isolation", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/goals", goalsRouter);
  });

  describe("GET /api/goals", () => {
    it("should return 400 when userId is missing", async () => {
      const response = await app.request("/api/goals");
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("userId required");
    });

    it("should return 200 and empty array when no goals exist for user", async () => {
      const response = await app.request("/api/goals?userId=999");
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it("should return user's goals when they exist", async () => {
      // First create a goal
      await app.request("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Goal",
          userId: "1",
        }),
      });

      const response = await app.request("/api/goals?userId=1");
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].userId).toBe(1);
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
    it("should return 400 when userId is missing", async () => {
      const response = await app.request("/api/goals/1");
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Invalid goal ID or userId required");
    });

    it("should return 404 when goal does not exist", async () => {
      const response = await app.request("/api/goals/999?userId=1");
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Goal not found or access denied");
    });

    it("should return goal when it exists and user owns it", async () => {
      // First create a goal
      const createResponse = await app.request("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Goal to Get",
          userId: "1",
        }),
      });

      const createdGoal = await createResponse.json();
      const goalId = createdGoal.data.id;

      const response = await app.request(`/api/goals/${goalId}?userId=1`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(goalId);
      expect(body.data.userId).toBe(1);
    });

    it("should return 404 when user tries to access goal they don't own", async () => {
      // Create a goal for user 1
      const createResponse = await app.request("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "User 1 Goal",
          userId: "1",
        }),
      });

      const createdGoal = await createResponse.json();
      const goalId = createdGoal.data.id;

      // Try to access with user 2
      const response = await app.request(`/api/goals/${goalId}?userId=2`);
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Goal not found or access denied");
    });
  });

  describe("PUT /api/goals/:id", () => {
    it("should return 400 when userId is missing", async () => {
      const response = await app.request("/api/goals/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Goal" }),
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Invalid goal ID or userId required");
    });

    it("should return 404 when goal does not exist", async () => {
      const response = await app.request("/api/goals/999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Goal", userId: "1" }),
      });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Goal not found or access denied");
    });

    it("should update goal when user owns it", async () => {
      // First create a goal
      const createResponse = await app.request("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Goal to Update",
          userId: "1",
        }),
      });

      const createdGoal = await createResponse.json();
      const goalId = createdGoal.data.id;

      const response = await app.request(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Updated Goal",
          description: "Updated description",
          userId: "1",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe("Updated Goal");
      expect(body.data.description).toBe("Updated description");
    });

    it("should return 404 when user tries to update goal they don't own", async () => {
      // Create a goal for user 1
      const createResponse = await app.request("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "User 1 Goal",
          userId: "1",
        }),
      });

      const createdGoal = await createResponse.json();
      const goalId = createdGoal.data.id;

      // Try to update with user 2
      const response = await app.request(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Hacked Update",
          userId: "2",
        }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Goal not found or access denied");
    });
  });

  describe("DELETE /api/goals/:id", () => {
    it("should return 400 when userId is missing", async () => {
      const response = await app.request("/api/goals/1", {
        method: "DELETE",
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Invalid goal ID or userId required");
    });

    it("should return 404 when goal does not exist", async () => {
      const response = await app.request("/api/goals/999?userId=1", {
        method: "DELETE",
      });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Goal not found or access denied");
    });

    it("should delete goal when user owns it", async () => {
      // First create a goal
      const createResponse = await app.request("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Goal to Delete",
          userId: "1",
        }),
      });

      const createdGoal = await createResponse.json();
      const goalId = createdGoal.data.id;

      const response = await app.request(`/api/goals/${goalId}?userId=1`, {
        method: "DELETE",
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe("Goal deleted successfully");

      // Verify goal is deleted
      const getResponse = await app.request(`/api/goals/${goalId}?userId=1`);
      expect(getResponse.status).toBe(404);
    });

    it("should return 404 when user tries to delete goal they don't own", async () => {
      // Create a goal for user 1
      const createResponse = await app.request("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "User 1 Goal",
          userId: "1",
        }),
      });

      const createdGoal = await createResponse.json();
      const goalId = createdGoal.data.id;

      // Try to delete with user 2
      const response = await app.request(`/api/goals/${goalId}?userId=2`, {
        method: "DELETE",
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Goal not found or access denied");
    });
  });
});
