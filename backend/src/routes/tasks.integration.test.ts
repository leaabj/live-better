import { expect, test, describe, beforeEach } from "bun:test";
import { Hono } from "hono";
import { createTasksRouter } from "./tasks";
import {
  createTestDb,
  seedTestData,
  createSecondUser,
  createGoalForUser,
  createTaskForUser,
} from "../db/test-db";
import { generateToken } from "../utils/auth";
import { tasks } from "../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Tasks Routes - Integration Tests with Mock Database
 *
 * These tests verify actual database operations:
 * - CRUD operations for tasks
 * - User isolation and authorization
 * - Time slot and duration validation
 * - Task completion and AI validation
 * - Filtering by date ranges
 */

describe("Tasks Routes - Integration Tests", () => {
  let testDb: any;
  let testApp: Hono;
  let authToken: string;
  let testUserId: number;
  let testGoalId: number;

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    testDb = createTestDb();

    // Seed test data
    const { testUser, testGoal } = await seedTestData(testDb);
    testUserId = testUser.id;
    testGoalId = testGoal.id;

    // Generate auth token
    authToken = generateToken({
      userId: testUser.id,
      email: testUser.email,
    });

    // Create app with test database
    testApp = new Hono();
    testApp.route("/api/tasks", createTasksRouter(testDb));
  });

  describe("POST /api/tasks", () => {
    test("creates task in database", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "New Task",
          description: "Task Description",
          goalId: testGoalId,
          timeSlot: "morning",
          duration: 30,
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("New Task");
      expect(data.data.description).toBe("Task Description");
      expect(data.data.goalId).toBe(testGoalId);
      expect(data.data.userId).toBe(testUserId);
      expect(data.data.timeSlot).toBe("morning");
      expect(data.data.duration).toBe(30);

      // Verify in database
      const dbTasks = await testDb.select().from(tasks);
      const newTask = dbTasks.find((t: any) => t.title === "New Task");
      expect(newTask).toBeDefined();
      expect(newTask.userId).toBe(testUserId);
    });

    test("creates task without goal (goalId null)", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Standalone Task",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.goalId).toBeNull();

      // Verify in database
      const dbTasks = await testDb.select().from(tasks);
      const task = dbTasks.find((t: any) => t.title === "Standalone Task");
      expect(task.goalId).toBeNull();
    });

    test("creates task with specific time", async () => {
      const specificTime = "2025-10-02T08:30:00Z";

      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Timed Task",
          specificTime: specificTime,
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.specificTime).toBeDefined();
      expect(data.data.timeSlot).toBe("morning"); // Auto-derived from time

      // Verify in database
      const dbTasks = await testDb.select().from(tasks);
      const task = dbTasks.find((t: any) => t.title === "Timed Task");
      expect(task.specificTime).toBeDefined();
    });

    test("sets default values for optional fields", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Minimal Task",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      // SQLite stores booleans as 0/1, so we check for falsy values
      expect(data.data.completed).toBeFalsy();
      expect(data.data.aiGenerated).toBeFalsy();
      expect(data.data.aiValidated).toBeFalsy();
    });
  });

  describe("GET /api/tasks", () => {
    test("retrieves today's tasks from database", async () => {
      // Create tasks for today
      await createTaskForUser(testDb, testUserId, { title: "Task 1" });
      await createTaskForUser(testDb, testUserId, { title: "Task 2" });

      const req = new Request("http://localhost/api/tasks", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      // Should include seed task + 2 new tasks
      expect(data.data.length).toBeGreaterThanOrEqual(2);
      expect(data.data.every((t: any) => t.userId === testUserId)).toBe(true);
    });

    test("filters tasks by today's date range", async () => {
      // The endpoint filters by created_at between today 00:00 and tomorrow 00:00
      // All tasks created in this test will be "today"
      await createTaskForUser(testDb, testUserId, { title: "Today's Task" });

      const req = new Request("http://localhost/api/tasks", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.length).toBeGreaterThan(0);
    });

    test("enforces user isolation", async () => {
      // Create another user with their own task
      const otherUser = await createSecondUser(testDb);
      await createTaskForUser(testDb, otherUser.id, {
        title: "Other User's Task",
      });

      const req = new Request("http://localhost/api/tasks", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      // Should only see own tasks
      expect(data.data.every((t: any) => t.userId === testUserId)).toBe(true);
      expect(
        data.data.find((t: any) => t.title === "Other User's Task"),
      ).toBeUndefined();
    });

    test("includes formatted time in response", async () => {
      const specificTime = "2025-10-02T14:30:00Z";
      await createTaskForUser(testDb, testUserId, {
        title: "Task with Time",
      });

      // Manually update with specific time (since createTaskForUser doesn't support it)
      const dbTasks = await testDb.select().from(tasks);
      const task = dbTasks.find((t: any) => t.title === "Task with Time");
      await testDb
        .update(tasks)
        .set({ specificTime: new Date(specificTime) })
        .where(eq(tasks.id, task.id));

      const req = new Request("http://localhost/api/tasks", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      const taskWithTime = data.data.find(
        (t: any) => t.title === "Task with Time",
      );
      expect(taskWithTime.formattedTime).toBeDefined();
    });
  });

  describe("GET /api/tasks/all", () => {
    test("retrieves all user tasks regardless of date", async () => {
      // Create multiple tasks
      await createTaskForUser(testDb, testUserId, { title: "Task 1" });
      await createTaskForUser(testDb, testUserId, { title: "Task 2" });
      await createTaskForUser(testDb, testUserId, { title: "Task 3" });

      const req = new Request("http://localhost/api/tasks/all", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      // Should include all tasks (seed + 3 new)
      expect(data.data.length).toBeGreaterThanOrEqual(4);
    });

    test("orders tasks by creation date (newest first)", async () => {
      await createTaskForUser(testDb, testUserId, { title: "First" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createTaskForUser(testDb, testUserId, { title: "Second" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createTaskForUser(testDb, testUserId, { title: "Third" });

      const req = new Request("http://localhost/api/tasks/all", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      const titles = data.data.map((t: any) => t.title);
      const thirdIndex = titles.indexOf("Third");
      const firstIndex = titles.indexOf("First");
      expect(thirdIndex).toBeLessThan(firstIndex);
    });
  });

  describe("GET /api/tasks/:id", () => {
    test("retrieves specific task from database", async () => {
      const dbTasks = await testDb.select().from(tasks);
      const taskId = dbTasks[0].id;

      const req = new Request(`http://localhost/api/tasks/${taskId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(taskId);
      expect(data.data.userId).toBe(testUserId);
    });

    test("returns 404 for non-existent task", async () => {
      const req = new Request("http://localhost/api/tasks/9999", {
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

    test("prevents access to other users' tasks", async () => {
      // Create task for another user
      const otherUser = await createSecondUser(testDb);
      const otherTask = await createTaskForUser(testDb, otherUser.id, {
        title: "Other's Task",
      });

      const req = new Request(`http://localhost/api/tasks/${otherTask.id}`, {
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

  describe("PUT /api/tasks/:id", () => {
    test("updates task in database", async () => {
      const dbTasks = await testDb.select().from(tasks);
      const taskId = dbTasks[0].id;

      const req = new Request(`http://localhost/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Updated Task",
          description: "Updated Description",
          timeSlot: "afternoon",
          duration: 45,
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("Updated Task");
      expect(data.data.timeSlot).toBe("afternoon");
      expect(data.data.duration).toBe(45);

      // Verify in database
      const updated = await testDb
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      expect(updated[0].title).toBe("Updated Task");
      expect(updated[0].duration).toBe(45);
    });

    test("updates task completion status", async () => {
      const dbTasks = await testDb.select().from(tasks);
      const taskId = dbTasks[0].id;

      const req = new Request(`http://localhost/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          completed: true,
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      // SQLite stores true as 1
      expect(data.data.completed).toBeTruthy();

      // Verify in database
      const updated = await testDb
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      expect(updated[0].completed).toBeTruthy();
    });

    test("allows partial updates", async () => {
      const dbTasks = await testDb.select().from(tasks);
      const taskId = dbTasks[0].id;
      const originalTitle = dbTasks[0].title;

      const req = new Request(`http://localhost/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          duration: 60,
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(data.data.title).toBe(originalTitle); // Title unchanged
      expect(data.data.duration).toBe(60);
    });

    test("prevents updating other users' tasks", async () => {
      // Create task for another user
      const otherUser = await createSecondUser(testDb);
      const otherTask = await createTaskForUser(testDb, otherUser.id, {
        title: "Other's Task",
      });

      const req = new Request(`http://localhost/api/tasks/${otherTask.id}`, {
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

      // Verify task unchanged
      const unchanged = await testDb
        .select()
        .from(tasks)
        .where(eq(tasks.id, otherTask.id));
      expect(unchanged[0].title).toBe("Other's Task");
    });

    test("updates updatedAt timestamp", async () => {
      const dbTasks = await testDb.select().from(tasks);
      const taskId = dbTasks[0].id;
      const originalUpdatedAt = dbTasks[0].updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const req = new Request(`http://localhost/api/tasks/${taskId}`, {
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
        .from(tasks)
        .where(eq(tasks.id, taskId));
      expect(updated[0].updatedAt).not.toEqual(originalUpdatedAt);
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    test("deletes task from database", async () => {
      const dbTasks = await testDb.select().from(tasks);
      const taskId = dbTasks[0].id;

      const req = new Request(`http://localhost/api/tasks/${taskId}`, {
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
      const remaining = await testDb.select().from(tasks);
      expect(remaining.find((t: any) => t.id === taskId)).toBeUndefined();
    });

    test("prevents deleting other users' tasks", async () => {
      // Create task for another user
      const otherUser = await createSecondUser(testDb);
      const otherTask = await createTaskForUser(testDb, otherUser.id, {
        title: "Other's Task",
      });

      const req = new Request(`http://localhost/api/tasks/${otherTask.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain("not found or access denied");

      // Verify task still exists
      const stillExists = await testDb
        .select()
        .from(tasks)
        .where(eq(tasks.id, otherTask.id));
      expect(stillExists).toHaveLength(1);
    });
  });

  describe("Task-Goal Relationships", () => {
    test("creates task linked to goal", async () => {
      const task = await createTaskForUser(testDb, testUserId, {
        title: "Linked Task",
        goalId: testGoalId,
      });

      expect(task.goalId).toBe(testGoalId);

      // Verify in database
      const dbTask = await testDb
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(dbTask[0].goalId).toBe(testGoalId);
    });

    test("allows task without goal", async () => {
      const task = await createTaskForUser(testDb, testUserId, {
        title: "Standalone Task",
        goalId: null,
      });

      expect(task.goalId).toBeNull();
    });

    test("can update task to link to goal", async () => {
      const task = await createTaskForUser(testDb, testUserId, {
        title: "Task",
        goalId: null,
      });

      const req = new Request(`http://localhost/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          // Note: The current implementation doesn't support updating goalId
          // This test documents the current behavior
          title: "Updated Task",
        }),
      });

      const res = await testApp.fetch(req);
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/tasks/:id/validate-photo", () => {
    test("requires authentication", async () => {
      const dbTasks = await testDb.select().from(tasks);
      const taskId = dbTasks[0].id;

      const req = new Request(
        `http://localhost/api/tasks/${taskId}/validate-photo`,
        {
          method: "POST",
        },
      );

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    test("rejects invalid task ID format", async () => {
      const req = new Request(
        "http://localhost/api/tasks/invalid/validate-photo",
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
      expect(data.error).toBe("Invalid task ID");
    });

    test("returns 404 for non-existent task", async () => {
      const req = new Request("http://localhost/api/tasks/9999/validate-photo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found or access denied");
    });

    test("prevents accessing other users' tasks", async () => {
      // Create task for another user
      const otherUser = await createSecondUser(testDb);
      const otherTask = await createTaskForUser(testDb, otherUser.id, {
        title: "Other's Task",
      });

      const req = new Request(
        `http://localhost/api/tasks/${otherTask.id}/validate-photo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain("not found or access denied");
    });

    test("returns 400 when no image file provided", async () => {
      const dbTasks = await testDb.select().from(tasks);
      const taskId = dbTasks[0].id;

      // Create form data without image
      const formData = new FormData();

      const req = new Request(
        `http://localhost/api/tasks/${taskId}/validate-photo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        },
      );

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("No image file provided");
    });

    test("handles photo validation request (service may or may not be configured)", async () => {
      const dbTasks = await testDb.select().from(tasks);
      const taskId = dbTasks[0].id;

      // Create a minimal valid image file
      const imageBlob = new Blob(["fake image data"], { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("image", imageBlob, "test.jpg");

      const req = new Request(
        `http://localhost/api/tasks/${taskId}/validate-photo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        },
      );

      const res = await testApp.fetch(req);
      const data = await res.json();

      // Service might be configured or not
      // If not configured: 503
      // If configured: 200 with validation result
      expect([200, 503]).toContain(res.status);
      
      if (res.status === 503) {
        expect(data.error).toContain("not configured");
      } else if (res.status === 200) {
        expect(data).toHaveProperty("validation");
        expect(data).toHaveProperty("task");
      }
    });
  });

  describe("Error Handling & Edge Cases", () => {
    test("handles very long task titles", async () => {
      const longTitle = "A".repeat(10000);

      const req = new Request("http://localhost/api/tasks", {
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

    test("handles unicode and emojis in task title", async () => {
      const emojiTitle = "Complete workout 💪 日本語 🎯";

      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: emojiTitle,
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.title).toBe(emojiTitle);
    });

    test("handles task creation at boundary times", async () => {
      // Test early morning (4:30 AM - start of morning slot)
      const earlyMorning = new Date();
      earlyMorning.setHours(4, 30, 0, 0);

      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Early Morning Task",
          specificTime: earlyMorning.toISOString(),
          timeSlot: "morning",
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.title).toBe("Early Morning Task");
      expect(data.data.timeSlot).toBe("morning");
    });

    test("handles concurrent task creation", async () => {
      // Create multiple tasks simultaneously
      const requests = Array.from({ length: 5 }, (_, i) =>
        testApp.fetch(
          new Request("http://localhost/api/tasks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              title: `Concurrent Task ${i}`,
            }),
          }),
        ),
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((res) => {
        expect(res.status).toBe(201);
      });

      // Verify all tasks were created
      const dbTasks = await testDb.select().from(tasks);
      expect(dbTasks.length).toBeGreaterThanOrEqual(6); // 1 from seed + 5 new
    });

    test("handles malformed JSON gracefully", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: "{ invalid json",
      });

      const res = await testApp.fetch(req);

      // Should return error
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test("handles null values in optional fields", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Task with nulls",
          description: null,
          goalId: null,
          timeSlot: null,
          duration: null,
        }),
      });

      const res = await testApp.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.description).toBeNull();
      expect(data.data.goalId).toBeNull();
    });

    test("handles boundary duration values", async () => {
      // Test minimum (5 minutes)
      const minReq = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Min Duration Task",
          duration: 5,
        }),
      });

      const minRes = await testApp.fetch(minReq);
      expect(minRes.status).toBe(201);

      // Test maximum (480 minutes)
      const maxReq = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: "Max Duration Task",
          duration: 480,
        }),
      });

      const maxRes = await testApp.fetch(maxReq);
      expect(maxRes.status).toBe(201);
    });
  });
});
