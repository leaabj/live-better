import { Hono } from "hono";
import { db } from "../db";
import { tasks } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { AIService } from "../services/ai";

const tasksRouter = new Hono();

// Convert to minutes since midnight
function timeToMinutes(timeStr: string): number {
  const [time, period] = timeStr.trim().split(" ");
  const [hours, minutes] = time.split(":").map(Number);

  let totalMinutes = hours * 60 + minutes;
  if (period?.toUpperCase() === "PM" && hours !== 12) {
    totalMinutes += 720; // 12 hours
  }
  if (period?.toUpperCase() === "AM" && hours === 12) {
    totalMinutes = 0;
  }

  return totalMinutes;
}

// determine time slot from specific time
function getTimeSlotFromTime(timeStr: string): string {
  const minutes = timeToMinutes(timeStr);

  if (minutes >= 270 && minutes < 720) return "morning"; // 4:30 AM - 12:00 PM
  if (minutes >= 720 && minutes < 1080) return "afternoon"; // 12:00 PM - 6:00 PM
  return "night"; // 6:00 PM - 12:00 AM
}

function validateTimeSlot(timeSlot: string, specificTime: string): boolean {
  if (!timeSlot || !specificTime) return true;

  const minutes = timeToMinutes(specificTime);

  switch (timeSlot) {
    case "morning":
      return minutes >= 270 && minutes < 720;
    case "afternoon":
      return minutes >= 720 && minutes < 1080;
    case "night":
      return minutes >= 1080 && minutes < 1440;
    default:
      return false;
  }
}

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
    const {
      title,
      description,
      goalId,
      userId,
      timeSlot: requestBodyTimeSlot,
      specificTime: requestBodySpecificTime,
      duration,
      aiGenerated,
      fixed,
    } = body;

    let timeSlot = requestBodyTimeSlot;
    let specificTime = requestBodySpecificTime;

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

    // Validate specificTime format
    if (specificTime && !/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(specificTime)) {
      return c.json(
        {
          success: false,
          error: "specificTime must be in format like '8:00 AM' or '2:30 PM'",
        },
        400,
      );
    }

    // Add timeSlot if not provided
    if (specificTime && !timeSlot) {
      timeSlot = getTimeSlotFromTime(specificTime);
    }

    // Validate specificTime within timeSlot
    if (timeSlot && specificTime) {
      if (!validateTimeSlot(timeSlot, specificTime)) {
        return c.json(
          {
            success: false,
            error: `Time ${specificTime} doesn't match ${timeSlot} time slot`,
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

    // Auto-set fixed to false if no time information provided (for AI rescheduling)
    let finalFixed = fixed !== undefined ? fixed : true; // default to true
    if (!specificTime) {
      finalFixed = false;
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
        fixed: finalFixed,
        completed: false,
        aiValidated: false,
      })
      .returning();

    // Reschedule user's flexible tasks after successful task creation
    if (newTask[0]) {
      // Run rescheduling in background (don't await to avoid delaying response)
      AIService.rescheduleUserTasks(parseInt(userId)).catch((error) => {
        console.error("Background rescheduling failed:", error);
      });
    }

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
      timeSlot: requestBodyTimeSlot,
      specificTime: requestBodySpecificTime,
      duration,
      aiValidated,
      fixed,
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

    // set timeSlot if not provided
    if (specificTime && !timeSlot) {
      // Get current timeSlot from database if not in request
      timeSlot = getTimeSlotFromTime(specificTime);
    }

    // Validate specificTime within timeSlot
    if (timeSlot && specificTime) {
      if (!validateTimeSlot(timeSlot, specificTime)) {
        return c.json(
          {
            success: false,
            error: `Time ${specificTime} doesn't match ${timeSlot} time slot`,
          },
          400,
        );
      }
    }

    // Validate duration if provided
    if (duration !== undefined && (duration < 5 || duration > 480)) {
      return c.json(
        {
          success: false,
          error: "duration must be between 5 and 480 minutes",
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

    // Auto-set fixed to false if no time information provided (for AI rescheduling)
    let finalFixed;
    if (fixed !== undefined) {
      finalFixed = fixed;
    } else if (!specificTime) {
      // If no time info provided and no explicit fixed value, set to false
      finalFixed = false;
    } else {
      // Keep existing fixed value
      finalFixed = undefined;
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
        fixed: finalFixed,
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
