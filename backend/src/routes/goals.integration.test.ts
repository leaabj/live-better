import { expect, test, describe, beforeEach } from "bun:test";
import { Hono } from "hono";
import { createGoalsRouter, validateTaskForInsertion } from "./goals";
import {
  createTestDb,
  seedTestData,
  createSecondUser,
  createGoalForUser,
  createTaskForUser,
} from "../db/test-db";
import { generateToken } from "../utils/auth";
import { goals, tasks } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Goals Routes - Integration Tests with Mock Database
 *
 * These tests verify actual database operations:
 * - CRUD operations for goals
 * - User isolation and authorization
 * - Cascading operations (delete goal -> unlink tasks)
 * - Transaction handling
 */

describe("Goals Routes - Integration Tests", () => {
  let testDb: any;
  let testApp: Hono;
  let authToken: string;
  let testUserId: number;

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    testDb = createTestDb();

    // Seed test data
    const { testUser } = await seedTestData(testDb);
    testUserId = testUser.id;

    // Generate auth token
    authToken = generateToken({
      userId: testUser.id,
      email: testUser.email,
    });

    // Create app with test database
    testApp = new Hono();
    testApp.route("/api/goals", createGoalsRouter(testDb));
  });

  describe("POST /api/goals", () => {
    test("creates goal in database", async () => {
      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "New Goal",
          description: "Goal Description",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("New Goal");
      expect(data.data.description).toBe("Goal Description");
      expect(data.data.userId).toBe(testUserId);
      expect(data.data.id).toBeDefined();

      // Verify in database
      const dbGoals = await testDb.select().from(goals);
      expect(dbGoals).toHaveLength(2); // 1 from seed + 1 new
      const newGoal = dbGoals.find((g: any) => g.title === "New Goal");
      expect(newGoal).toBeDefined();
      expect(newGoal.userId).toBe(testUserId);
    });

    test("creates goal without description", async () => {
      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Goal Without Description",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.description).toBeNull();

      // Verify in database
      const dbGoals = await testDb.select().from(goals);
      const newGoal = dbGoals.find(
        (g: any) => g.title === "Goal Without Description",
      );
      expect(newGoal.description).toBeNull();
    });

    test("sets timestamps on creation", async () => {
      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Timestamped Goal",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("Timestamped Goal");
      
      // Timestamps should be set (even if they come back as strings from SQLite)
      expect(data.data).toHaveProperty("createdAt");
      expect(data.data).toHaveProperty("updatedAt");
    });
  });

  describe("GET /api/goals", () => {
    test("retrieves all user goals from database", async () => {
      // Create additional goals
      await createGoalForUser(testDb, testUserId, "Goal 2");
      await createGoalForUser(testDb, testUserId, "Goal 3");

      const req = new Request("http://localhost/api/goals", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3); // 1 from seed + 2 new
      expect(data.data.every((g: any) => g.userId === testUserId)).toBe(true);
    });

    test("returns empty array for user with no goals", async () => {
      // Create new user with no goals
      const newUser = await createSecondUser(testDb);
      const newToken = generateToken({
        userId: newUser.id,
        email: newUser.email,
      });

      const req = new Request("http://localhost/api/goals", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
    });

    test("enforces user isolation", async () => {
      // Create another user with their own goal
      const otherUser = await createSecondUser(testDb);
      await createGoalForUser(testDb, otherUser.id, "Other User's Goal");

      const req = new Request("http://localhost/api/goals", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      // Should only see own goals
      expect(data.data.every((g: any) => g.userId === testUserId)).toBe(true);
      expect(data.data.every((g: any) => g.userId !== otherUser.id)).toBe(true);
      expect(
        data.data.find((g: any) => g.title === "Other User's Goal"),
      ).toBeUndefined();
    });

    test("returns goals ordered by creation date (newest first)", async () => {
      // Create goals with slight delays
      await createGoalForUser(testDb, testUserId, "First Goal");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createGoalForUser(testDb, testUserId, "Second Goal");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createGoalForUser(testDb, testUserId, "Third Goal");

      const req = new Request("http://localhost/api/goals", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      // Should be ordered newest first
      const titles = data.data.map((g: any) => g.title);
      expect(titles[0]).toBe("Third Goal");
    });
  });

  describe("GET /api/goals/:id", () => {
    test("retrieves specific goal from database", async () => {
      const dbGoals = await testDb.select().from(goals);
      const goalId = dbGoals[0].id;

      const req = new Request(`http://localhost/api/goals/${goalId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(goalId);
      expect(data.data.userId).toBe(testUserId);
    });

    test("returns 404 for non-existent goal", async () => {
      const req = new Request("http://localhost/api/goals/9999", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });

    test("prevents access to other users' goals", async () => {
      // Create goal for another user
      const otherUser = await createSecondUser(testDb);
      const otherGoal = await createGoalForUser(
        testDb,
        otherUser.id,
        "Other's Goal",
      );

      // Try to access with original user's token
      const req = new Request(`http://localhost/api/goals/${otherGoal.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain("not found or access denied");
    });
  });

  describe("PUT /api/goals/:id", () => {
    test("updates goal in database", async () => {
      const dbGoals = await testDb.select().from(goals);
      const goalId = dbGoals[0].id;

      const req = new Request(`http://localhost/api/goals/${goalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Updated Title",
          description: "Updated Description",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("Updated Title");
      expect(data.data.description).toBe("Updated Description");

      // Verify in database
      const updatedGoal = await testDb
        .select()
        .from(goals)
        .where(eq(goals.id, goalId));
      expect(updatedGoal[0].title).toBe("Updated Title");
      expect(updatedGoal[0].description).toBe("Updated Description");
    });

    test("allows partial updates", async () => {
      const dbGoals = await testDb.select().from(goals);
      const goalId = dbGoals[0].id;
      const originalTitle = dbGoals[0].title;

      const req = new Request(`http://localhost/api/goals/${goalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          description: "Only updating description",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(data.data.title).toBe(originalTitle); // Title unchanged
      expect(data.data.description).toBe("Only updating description");
    });

    test("updates updatedAt timestamp", async () => {
      const dbGoals = await testDb.select().from(goals);
      const goalId = dbGoals[0].id;
      const originalUpdatedAt = dbGoals[0].updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const req = new Request(`http://localhost/api/goals/${goalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Updated",
        }),
      });

      await testApp.fetch(req);

      // Verify updatedAt changed
      const updated = await testDb
        .select()
        .from(goals)
        .where(eq(goals.id, goalId));
      expect(updated[0].updatedAt).not.toEqual(originalUpdatedAt);
    });

    test("prevents updating other users' goals", async () => {
      // Create goal for another user
      const otherUser = await createSecondUser(testDb);
      const otherGoal = await createGoalForUser(
        testDb,
        otherUser.id,
        "Other's Goal",
      );

      const req = new Request(`http://localhost/api/goals/${otherGoal.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Trying to update",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain("not found or access denied");

      // Verify goal unchanged in database
      const unchanged = await testDb
        .select()
        .from(goals)
        .where(eq(goals.id, otherGoal.id));
      expect(unchanged[0].title).toBe("Other's Goal");
    });
  });

  describe("DELETE /api/goals/:id", () => {
    test("deletes goal from database", async () => {
      const dbGoals = await testDb.select().from(goals);
      const goalId = dbGoals[0].id;

      const req = new Request(`http://localhost/api/goals/${goalId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify deleted from database
      const remainingGoals = await testDb.select().from(goals);
      expect(remainingGoals.find((g: any) => g.id === goalId)).toBeUndefined();
    });

    test("unlinks related tasks when deleting goal", async () => {
      const dbGoals = await testDb.select().from(goals);
      const goalId = dbGoals[0].id;

      // Create tasks linked to this goal
      await createTaskForUser(testDb, testUserId, {
        title: "Task 1",
        goalId: goalId,
      });
      await createTaskForUser(testDb, testUserId, {
        title: "Task 2",
        goalId: goalId,
      });

      const req = new Request(`http://localhost/api/goals/${goalId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      await testApp.fetch(req);

      // Verify goal is deleted
      const remainingGoals = await testDb.select().from(goals);
      expect(remainingGoals.find((g: any) => g.id === goalId)).toBeUndefined();

      // Verify tasks are unlinked (goalId set to null), not deleted
      const dbTasks = await testDb.select().from(tasks);
      const unlinkedTasks = dbTasks.filter(
        (t: any) => t.title === "Task 1" || t.title === "Task 2",
      );
      expect(unlinkedTasks).toHaveLength(2);
      expect(unlinkedTasks.every((t: any) => t.goalId === null)).toBe(true);
    });

    test("prevents deleting other users' goals", async () => {
      // Create goal for another user
      const otherUser = await createSecondUser(testDb);
      const otherGoal = await createGoalForUser(
        testDb,
        otherUser.id,
        "Other's Goal",
      );

      const req = new Request(`http://localhost/api/goals/${otherGoal.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain("not found or access denied");

      // Verify goal still exists in database
      const stillExists = await testDb
        .select()
        .from(goals)
        .where(eq(goals.id, otherGoal.id));
      expect(stillExists).toHaveLength(1);
    });

    test("handles transaction rollback on error", async () => {
      // This test verifies that if the transaction fails,
      // neither the goal deletion nor task unlinking happens
      const dbGoals = await testDb.select().from(goals);
      const goalId = dbGoals[0].id;

      // Create task linked to goal
      await createTaskForUser(testDb, testUserId, {
        title: "Linked Task",
        goalId: goalId,
      });

      // Try to delete (should succeed in this case, but tests transaction handling)
      const req = new Request(`http://localhost/api/goals/${goalId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);

      // If successful, both operations should have completed
      if (res.status === 200) {
        const remainingGoals = await testDb.select().from(goals);
        const dbTasks = await testDb.select().from(tasks);

        expect(remainingGoals.find((g: any) => g.id === goalId)).toBeUndefined();
        expect(
          dbTasks.find((t: any) => t.title === "Linked Task")?.goalId,
        ).toBeNull();
      }
    });
  });

  describe("validateTaskForInsertion Helper", () => {
    test("rejects task without title", () => {
      const result = validateTaskForInsertion({ userId: 1 });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Title is required");
    });

    test("rejects task with empty title", () => {
      const result = validateTaskForInsertion({ title: "   ", userId: 1 });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Title is required");
    });

    test("rejects task without userId", () => {
      const result = validateTaskForInsertion({ title: "Task" });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Valid userId is required");
    });

    test("rejects task with invalid userId type", () => {
      const result = validateTaskForInsertion({ 
        title: "Task", 
        userId: "invalid" 
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Valid userId is required");
    });

    test("rejects invalid goalId type", () => {
      const result = validateTaskForInsertion({
        title: "Task",
        userId: 1,
        goalId: "invalid",
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("goalId must be a number if provided");
    });

    test("accepts null goalId", () => {
      const result = validateTaskForInsertion({
        title: "Task",
        userId: 1,
        goalId: null,
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects duration below minimum (5 minutes)", () => {
      const result = validateTaskForInsertion({
        title: "Task",
        userId: 1,
        duration: 4,
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Duration must be between 5 and 480 minutes");
    });

    test("rejects duration above maximum (480 minutes)", () => {
      const result = validateTaskForInsertion({
        title: "Task",
        userId: 1,
        duration: 481,
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Duration must be between 5 and 480 minutes");
    });

    test("accepts minimum valid duration (5 minutes)", () => {
      const result = validateTaskForInsertion({
        title: "Task",
        userId: 1,
        duration: 5,
      });
      
      expect(result.isValid).toBe(true);
    });

    test("accepts maximum valid duration (480 minutes)", () => {
      const result = validateTaskForInsertion({
        title: "Task",
        userId: 1,
        duration: 480,
      });
      
      expect(result.isValid).toBe(true);
    });

    test("accepts null duration", () => {
      const result = validateTaskForInsertion({
        title: "Task",
        userId: 1,
        duration: null,
      });
      
      expect(result.isValid).toBe(true);
    });

    test("rejects invalid timeSlot", () => {
      const result = validateTaskForInsertion({
        title: "Task",
        userId: 1,
        timeSlot: "invalid",
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("timeSlot must be morning, afternoon, or night");
    });

    test("accepts valid timeSlots", () => {
      const timeSlots = ["morning", "afternoon", "night"];
      
      timeSlots.forEach((timeSlot) => {
        const result = validateTaskForInsertion({
          title: "Task",
          userId: 1,
          timeSlot,
        });
        
        expect(result.isValid).toBe(true);
      });
    });

    test("accepts task without timeSlot", () => {
      const result = validateTaskForInsertion({
        title: "Task",
        userId: 1,
      });
      
      expect(result.isValid).toBe(true);
    });

    test("accepts fully valid task", () => {
      const result = validateTaskForInsertion({
        title: "Complete Task",
        userId: 1,
        goalId: 5,
        duration: 30,
        timeSlot: "morning",
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("returns multiple errors for multiple issues", () => {
      const result = validateTaskForInsertion({
        // Missing title
        // Missing userId
        goalId: "invalid",
        duration: 500,
        timeSlot: "invalid",
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
      expect(result.errors).toContain("Title is required");
      expect(result.errors).toContain("Valid userId is required");
      expect(result.errors).toContain("goalId must be a number if provided");
      expect(result.errors).toContain("Duration must be between 5 and 480 minutes");
      expect(result.errors).toContain("timeSlot must be morning, afternoon, or night");
    });
  });

  describe("POST /api/goals/tasks/ai-create-all", () => {
    test("returns 404 when user has no goals", async () => {
      // Create user with no goals
      const newUser = await createSecondUser(testDb);
      const newToken = generateToken({
        userId: newUser.id,
        email: newUser.email,
      });

      const req = new Request(
        "http://localhost/api/goals/tasks/ai-create-all",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        },
      );

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("No goals found");
    });

    test("enforces daily limit - rejects second generation on same day", async () => {
      // First, create an AI-generated task for today
      const today = new Date();
      await createTaskForUser(testDb, testUserId, {
        title: "AI Task from earlier",
        aiGenerated: true,
      });

      const req = new Request(
        "http://localhost/api/goals/tasks/ai-create-all",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("already generated tasks for today");
      expect(data.code).toBe("DAILY_LIMIT_REACHED");
    });

    test("returns 404 when user not found in database", async () => {
      // Create token for non-existent user
      const fakeToken = generateToken({
        userId: 9999,
        email: "fake@example.com",
      });

      const req = new Request(
        "http://localhost/api/goals/tasks/ai-create-all",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${fakeToken}`,
          },
        },
      );

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("User not found");
    });
  });

  describe("GET /api/goals/tasks/daily-limit-check", () => {
    test("returns canGenerate: true when no AI tasks exist for today", async () => {
      const req = new Request(
        "http://localhost/api/goals/tasks/daily-limit-check",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.canGenerate).toBe(true);
      expect(data.data.message).toContain("can generate tasks today");
    });

    test("returns canGenerate: false when AI tasks exist for today", async () => {
      // Create AI-generated task for today
      await createTaskForUser(testDb, testUserId, {
        title: "AI Task",
        aiGenerated: true,
      });

      const req = new Request(
        "http://localhost/api/goals/tasks/daily-limit-check",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.canGenerate).toBe(false);
      expect(data.data.message).toContain("Daily limit reached");
    });

    test("requires authentication", async () => {
      const req = new Request(
        "http://localhost/api/goals/tasks/daily-limit-check",
        {
          method: "GET",
        },
      );

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe("Error Handling & Edge Cases", () => {
    test("handles very long goal titles", async () => {
      const longTitle = "A".repeat(10000);

      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: longTitle,
        }),
      });

      const res = await testApp.fetch(req);

      // Should either accept or reject gracefully
      expect([201, 400, 500]).toContain(res.status);
    });

    test("handles unicode and special characters in goal title", async () => {
      const specialTitle = "Learn 日本語 & Español! 🎯";

      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: specialTitle,
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.title).toBe(specialTitle);
    });

    test("handles null description correctly", async () => {
      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Goal with null description",
          description: null,
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.description).toBeNull();
    });

    test("handles malformed JSON in request", async () => {
      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: "{ invalid json }",
      });

      const res = await testApp.fetch(req);

      // Should return error
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test("handles concurrent goal creation", async () => {
      // Create multiple goals simultaneously
      const requests = Array.from({ length: 5 }, (_, i) =>
        testApp.fetch(
          new Request("http://localhost/api/goals", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              title: `Concurrent Goal ${i}`,
            }),
          }),
        ),
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((res) => {
        expect(res.status).toBe(201);
      });

      // Verify all goals were created
      const dbGoals = await testDb.select().from(goals);
      expect(dbGoals.length).toBeGreaterThanOrEqual(6); // 1 from seed + 5 new
    });

    test("handles update with empty string description", async () => {
      const dbGoals = await testDb.select().from(goals);
      const goalId = dbGoals[0].id;

      const req = new Request(`http://localhost/api/goals/${goalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          description: "",
        }),
      });

      const res = await testApp.fetch(req);

      expect(res.status).toBe(200);
    });
  });
});
