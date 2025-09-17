import { Hono } from "hono";
import { db } from "../db";
import { tasks } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

const tasksRouter = new Hono();

// GET /api/tasks
tasksRouter.get("/", async (c) => {
  try {
    const { searchParams } = new URL(c.req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return c.json({ success: false, error: "userId required" }, 400);
    }

    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, parseInt(userId)))
      .orderBy(desc(tasks.createdAt));

    return c.json({ success: true, data: userTasks });
  } catch (error) {
    return c.json({ success: false, error: "Failed to fetch tasks" }, 500);
  }
});

// POST /api/tasks
tasksRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { title, description, goalId, userId, timeSlot, aiGenerated } = body;

    if (!title || !userId || !goalId) {
      return c.json(
        { success: false, error: "Title, userId, and goalId are required" },
        400,
      );
    }

    // Validate timeSlot
    const validTimeSlots = ["morning", "afternoon", "night"];
    if (timeSlot && !validTimeSlots.includes(timeSlot)) {
      return c.json(
        {
          success: false,
          error: "timeSlot must be morning, afternoon, or night",
        },
        400,
      );
    }

    const newTask = await db
      .insert(tasks)
      .values({
        title,
        description: description || null,
        goalId: parseInt(goalId),
        userId: parseInt(userId),
        timeSlot: timeSlot || null,
        aiGenerated: aiGenerated || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return c.json({ success: true, data: newTask[0] }, 201);
  } catch (error) {
    return c.json({ success: false, error: "Failed to create task" }, 500);
  }
});

export default tasksRouter;
