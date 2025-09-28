import { Hono } from "hono";
import { db } from "../db";
import { tasks } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { AIService } from "../services/ai";
import {
  getTimeSlotFromTimestamp,
  validateTimestampInTimeSlot,
  formatTimestampToTime,
} from "../utils/time";

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
      .orderBy(tasks.id); // Order by ID for stable positioning

    // Format tasks with human-readable time strings
    const formattedTasks = userTasks.map((task) => ({
      ...task,
      formattedTime: task.specificTime
        ? formatTimestampToTime(task.specificTime)
        : null,
    }));

    return c.json({ success: true, data: formattedTasks });
  } catch (error) {
    return c.json({ success: false, error: "Failed to fetch tasks" }, 500);
  }
});

// POST /api/tasks
tasksRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      title,
      description,
      goalId,
      userId,
      timeSlot: requestBodyTimeSlot,
      specificTime: requestBodySpecificTime,
      duration,
      aiGenerated,
    } = body;

    let timeSlot = requestBodyTimeSlot;
    let specificTime = requestBodySpecificTime;

    if (!title || !userId) {
      return c.json(
        { success: false, error: "Title and userId are required" },
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

    // Validate specificTime - now only accepts Date objects or ISO timestamp strings
    let specificTimeTimestamp: Date | null = null;
    if (specificTime) {
      if (specificTime instanceof Date) {
        specificTimeTimestamp = specificTime;
      } else if (typeof specificTime === "string") {
        // Only accept ISO 8601 timestamp strings
        specificTimeTimestamp = new Date(specificTime);
        if (isNaN(specificTimeTimestamp.getTime())) {
          return c.json(
            {
              success: false,
              error:
                "specificTime must be a valid ISO 8601 timestamp (e.g., '2024-01-01T08:00:00Z')",
            },
            400,
          );
        }
      } else {
        return c.json(
          {
            success: false,
            error: "specificTime must be a Date object or ISO timestamp string",
          },
          400,
        );
      }
    }

    // Add timeSlot if not provided
    if (specificTimeTimestamp && !timeSlot) {
      timeSlot = getTimeSlotFromTimestamp(specificTimeTimestamp);
    }

    // Validate specificTime within timeSlot
    if (timeSlot && specificTimeTimestamp) {
      if (!validateTimestampInTimeSlot(timeSlot, specificTimeTimestamp)) {
        return c.json(
          {
            success: false,
            error: `Time ${formatTimestampToTime(specificTimeTimestamp)} doesn't match ${timeSlot} time slot`,
          },
          400,
        );
      }
    }

    // Validate duration
    if (duration && (duration < 5 || duration > 480)) {
      return c.json(
        {
          success: false,
          error: "duration must be between 5 and 480 minutes",
        },
        400,
      );
    }

    const newTask = await db
      .insert(tasks)
      .values({
        title,
        description: description || null,
        goalId: goalId ? parseInt(goalId) : null, // Allow null goalId
        userId: parseInt(userId),
        timeSlot: timeSlot || null,
        specificTime: specificTimeTimestamp || null,
        duration: duration || null,
        aiGenerated: aiGenerated !== undefined ? aiGenerated : false,
        completed: false,
        aiValidated: false,
      })
      .returning();

    // Format the response with both timestamp and formatted time string
    const responseData = {
      ...newTask[0],
      formattedTime: newTask[0].specificTime
        ? formatTimestampToTime(newTask[0].specificTime)
        : null,
    };

    return c.json({ success: true, data: responseData }, 201);
  } catch (error) {
    return c.json(
      { success: false, error: "Failed to create task", message: error },
      500,
    );
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
      timeSlot: requestBodyTimeSlot,
      specificTime: requestBodySpecificTime,
      duration,
      aiValidated,
    } = body;

    let timeSlot = requestBodyTimeSlot;
    let specificTime = requestBodySpecificTime;

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

    let specificTimeTimestamp: Date | null = null;
    if (specificTime) {
      if (specificTime instanceof Date) {
        specificTimeTimestamp = specificTime;
      } else if (typeof specificTime === "string") {
        // Only accept ISO 8601 timestamp strings
        specificTimeTimestamp = new Date(specificTime);
        if (isNaN(specificTimeTimestamp.getTime())) {
          return c.json(
            {
              success: false,
              error:
                "specificTime must be a valid ISO 8601 timestamp (e.g., '2024-01-01T08:00:00Z')",
            },
            400,
          );
        }
      } else {
        return c.json(
          {
            success: false,
            error: "specificTime must be a Date object or ISO timestamp string",
          },
          400,
        );
      }
    }

    // Skip validation if only updating completion status
    const isCompletionOnlyUpdate =
      completed !== undefined &&
      title === undefined &&
      description === undefined &&
      timeSlot === undefined &&
      specificTime === undefined &&
      duration === undefined;

    if (!isCompletionOnlyUpdate && specificTimeTimestamp && !timeSlot) {
      // Get current timeSlot from database if not in request
      timeSlot = getTimeSlotFromTimestamp(specificTimeTimestamp);
    }

    if (!isCompletionOnlyUpdate && timeSlot && specificTimeTimestamp) {
      if (!validateTimestampInTimeSlot(timeSlot, specificTimeTimestamp)) {
        return c.json(
          {
            success: false,
            error: `Time ${formatTimestampToTime(specificTimeTimestamp)} doesn't match ${timeSlot} time slot`,
          },
          400,
        );
      }
    }

    if (!isCompletionOnlyUpdate) {
      // Validate duration if provided
      if (duration !== undefined && duration < 0) {
        return c.json(
          {
            success: false,
            error: "duration must be 0 or greater",
          },
          400,
        );
      }
    }

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
        specificTime:
          specificTime !== undefined ? specificTimeTimestamp : undefined,
        duration: duration !== undefined ? duration : undefined,
        aiValidated: aiValidated !== undefined ? aiValidated : undefined,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    const responseData = {
      ...updatedTask[0],
      formattedTime: updatedTask[0].specificTime
        ? formatTimestampToTime(updatedTask[0].specificTime)
        : null,
    };

    return c.json({ success: true, data: responseData });
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
