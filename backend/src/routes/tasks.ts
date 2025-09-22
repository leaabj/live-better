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
    const { title, description, goalId, userId, timeSlot, specificTime, duration, aiGenerated } = body;

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

    // Validate specificTime format (optional validation)
    if (specificTime && !/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(specificTime)) {
      return c.json(
        {
          success: false,
          error: "specificTime must be in format like '8:00 AM' or '2:30 PM'",
        },
        400,
      );
    }

    // Validate duration (optional, between 5 and 240 minutes)
    if (duration && (duration < 5 || duration > 240)) {
      return c.json(
        {
          success: false,
          error: "duration must be between 5 and 240 minutes",
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
        specificTime: specificTime || null,
        duration: duration || null,
        aiGenerated: aiGenerated !== undefined ? aiGenerated : false,
        completed: false,
        aiValidated: false,
      })
      .returning();

    return c.json({ success: true, data: newTask[0] }, 201);
  } catch (error) {
    return c.json({ success: false, error: "Failed to create task" }, 500);
  }
});

// GET /api/tasks/:id
tasksRouter.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { searchParams } = new URL(c.req.url);
    const userId = searchParams.get("userId");

    if (isNaN(id) || !userId) {
      return c.json(
        { success: false, error: "Invalid task ID or userId required" },
        400,
      );
    }

    const task = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, parseInt(userId))))
      .limit(1);

    if (!task.length) {
      return c.json(
        { success: false, error: "Task not found or access denied" },
        404,
      );
    }

    return c.json({ success: true, data: task[0] });
  } catch (error) {
    return c.json({ success: false, error: "Failed to fetch task" }, 500);
  }
});

// PUT
 tasksRouter.put("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { 
      userId, 
      title, 
      description, 
      completed, 
      timeSlot, 
      specificTime, 
      duration, 
      aiValidated 
    } = body;

    if (isNaN(id) || !userId) {
      return c.json(
        { success: false, error: "Invalid task ID or userId required" },
        400,
      );
    }

    // Validate timeSlot if provided
    if (timeSlot) {
      const validTimeSlots = ["morning", "afternoon", "night"];
      if (!validTimeSlots.includes(timeSlot)) {
        return c.json(
          {
            success: false,
            error: "timeSlot must be morning, afternoon, or night",
          },
          400,
        );
      }
    }

    // Validate specificTime format if provided
    if (specificTime && !/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(specificTime)) {
      return c.json(
        {
          success: false,
          error: "specificTime must be in format like '8:00 AM' or '2:30 PM'",
        },
        400,
      );
    }

    // Validate duration if provided
    if (duration !== undefined && (duration < 5 || duration > 240)) {
      return c.json(
        {
          success: false,
          error: "duration must be between 5 and 240 minutes",
        },
        400,
      );
    }

    // Verify user owns the task
    const existingTask = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, parseInt(userId))))
      .limit(1);

    if (!existingTask.length) {
      return c.json(
        { success: false, error: "Task not found or access denied" },
        404,
      );
    }

    const updatedTask = await db
      .update(tasks)
      .set({
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        completed: completed !== undefined ? completed : undefined,
        timeSlot: timeSlot !== undefined ? timeSlot : undefined,
        specificTime: specificTime !== undefined ? specificTime : undefined,
        duration: duration !== undefined ? duration : undefined,
        aiValidated: aiValidated !== undefined ? aiValidated : undefined,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    return c.json({ success: true, data: updatedTask[0] });
  } catch (error) {
    return c.json({ success: false, error: "Failed to update task" }, 500);
  }
});

// DELETE
tasksRouter.delete("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { searchParams } = new URL(c.req.url);
    const userId = searchParams.get("userId");

    if (isNaN(id) || !userId) {
      return c.json(
        { success: false, error: "Invalid task ID or userId required" },
        400,
      );
    }

    // Verify user owns the task
    const existingTask = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, parseInt(userId))))
      .limit(1);

    if (!existingTask.length) {
      return c.json(
        { success: false, error: "Task not found or access denied" },
        404,
      );
    }

    const deletedTask = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, parseInt(userId))))
      .returning();

    return c.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    return c.json({ success: false, error: "Failed to delete task" }, 500);
  }
});

export default tasksRouter;
