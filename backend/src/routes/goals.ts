import { Hono } from "hono";
import { db } from "../db";
import { goals, tasks, users } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { AIService } from "../services/ai";
import { authMiddleware, getAuthUser } from "../middleware/auth";

function validateTaskForInsertion(task: any) {
  const errors: string[] = [];

  if (!task.title || task.title.trim().length === 0) {
    errors.push("Title is required");
  }

  if (
    task.goalId !== undefined &&
    task.goalId !== null &&
    typeof task.goalId !== "number"
  ) {
    errors.push("goalId must be a number if provided");
  }

  if (!task.userId || typeof task.userId !== "number") {
    errors.push("Valid userId is required");
  }

  if (task.duration !== null && task.duration !== undefined) {
    if (
      typeof task.duration !== "number" ||
      task.duration < 5 ||
      task.duration > 480
    ) {
      errors.push("Duration must be between 5 and 480 minutes");
    }
  }

  if (
    task.timeSlot &&
    !["morning", "afternoon", "night"].includes(task.timeSlot)
  ) {
    errors.push("timeSlot must be morning, afternoon, or night");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const goalsRouter = new Hono();

// GET /api/goals (all)
goalsRouter.get("/", authMiddleware, async (c) => {
  try {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const userGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, user.userId))
      .orderBy(desc(goals.createdAt));

    return c.json({ success: true, data: userGoals });
  } catch (error) {
    return c.json({ success: false, error: "Failed to fetch goals" }, 500);
  }
});

// POST /api/goals - Create new goal
goalsRouter.post("/", authMiddleware, async (c) => {
  try {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { title, description } = body;

    if (!title) {
      return c.json({ success: false, error: "Title is required" }, 400);
    }

    const newGoal = await db
      .insert(goals)
      .values({
        title,
        description: description || null,
        userId: user.userId,
        updatedAt: new Date(),
      })
      .returning();

    return c.json({ success: true, data: newGoal[0] }, 201);
  } catch (error) {
    return c.json({ success: false, error: "Failed to create goal" }, 500);
  }
});

// GET /api/goals/:id (specific)
goalsRouter.get("/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid goal ID" }, 400);
    }

    const goal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, user.userId)))
      .limit(1);

    if (!goal.length) {
      return c.json(
        { success: false, error: "Goal not found or access denied" },
        404,
      );
    }

    return c.json({ success: true, data: goal[0] });
  } catch (error) {
    return c.json({ success: false, error: "Failed to fetch goal" }, 500);
  }
});

// PUT /api/goals/:id (update)
goalsRouter.put("/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { title, description } = body;
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid goal ID" }, 400);
    }

    // Verify user owns the goal
    const existingGoal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, user.userId)))
      .limit(1);

    if (!existingGoal.length) {
      return c.json(
        { success: false, error: "Goal not found or access denied" },
        404,
      );
    }

    const updatedGoal = await db
      .update(goals)
      .set({
        title: title || undefined,
        description: description !== undefined ? description : undefined,
        updatedAt: new Date(),
      })
      .where(eq(goals.id, id))
      .returning();

    return c.json({ success: true, data: updatedGoal[0] });
  } catch (error) {
    return c.json({ success: false, error: "Failed to update goal" }, 500);
  }
});

// DELETE /api/goals/:id
goalsRouter.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid goal ID" }, 400);
    }

    // Verify user owns the goal
    const existingGoal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, user.userId)))
      .limit(1);

    if (!existingGoal.length) {
      return c.json(
        { success: false, error: "Goal not found or access denied" },
        404,
      );
    }

    const deletedGoal = await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, user.userId)))
      .returning();

    return c.json({ success: true, message: "Goal deleted successfully" });
  } catch (error) {
    return c.json({ success: false, error: "Failed to delete goal" }, 500);
  }
});

/**
 * POST /api/goals/tasks/ai-create-all
 *
 * Generate AI-powered daily routine tasks from ALL user goals.
 * User preferences are automatically fetched from the user table.
 *
 * @queryParam userId - Required. The ID of the user whose goals to process
 *
 * @returns {Object} Generated daily routine with tasks, reasoning, and schedule
 * @returns {Object[]} data.tasks - Generated tasks with goal associations
 * @returns {string} data.reasoning - AI explanation of the schedule logic
 * @returns {number} data.totalGenerated - Number of tasks created
 * @returns {number} data.goalsProcessed - Number of goals considered
 * @returns {Object[]} data.dailySchedule - Optional minute-by-minute schedule
 *
 */
goalsRouter.post("/tasks/ai-create-all", authMiddleware, async (c) => {
  try {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    if (!userData.length) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    const userRecord = userData[0];

    const userGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, user.userId))
      .orderBy(desc(goals.createdAt));

    if (!userGoals.length) {
      return c.json({ success: false, error: "No goals found for user" }, 404);
    }

    const generatedTasks = await AIService.generateDailySchedule({
      goals: userGoals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        description: goal.description || undefined,
      })),
      userData: {
        userContext: userRecord.userContext,
        preferredTimeSlots: userRecord.preferredTimeSlots,
      },
    });

    const uniqueTasks = generatedTasks.tasks.filter(
      (task, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.title === task.title &&
            t.goalId === task.goalId &&
            t.specificTime === task.specificTime,
        ),
    );
    const allTasks = uniqueTasks;

    const validGoalIds = new Set(userGoals.map((goal) => goal.id));
    const invalidTasks = allTasks.filter(
      (task) => !validGoalIds.has(task.goalId),
    );

    if (invalidTasks.length > 0) {
      console.error(
        "Invalid goal IDs in generated tasks:",
        invalidTasks.map((t) => t.goalId),
      );
      return c.json(
        {
          success: false,
          error: `Generated tasks contain invalid goal IDs: ${invalidTasks.map((t) => t.goalId).join(", ")}`,
        },
        500,
      );
    }

    let savedTasks = [];
    try {
      savedTasks = await db.transaction(async (tx) => {
        const tasksToInsert = allTasks.map((task, index) => {
          // Validate and clamp duration to match database constraints (5-480 minutes)
          const validatedDuration = task.duration
            ? Math.min(Math.max(task.duration, 5), 480)
            : null;

          return {
            title: task.title,
            description: task.description || null,
            goalId: task.goalId,
            userId: user.userId,
            timeSlot: task.timeSlot || null,
            specificTime: task.specificTime || null,
            duration: validatedDuration,
            aiGenerated: true,
            aiValidated: false,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });

        // Insert tasks one by one to better handle any validation errors
        const results = [];
        const failedTasks: Array<{ task: any; errors: string[] }> = [];

        for (const taskToInsert of tasksToInsert) {
          try {
            const validation = validateTaskForInsertion(taskToInsert);
            if (!validation.isValid) {
              failedTasks.push({
                task: taskToInsert,
                errors: validation.errors,
              });
              continue;
            }

            const result = await tx
              .insert(tasks)
              .values(taskToInsert)
              .returning();
            if (result && result.length > 0) {
              results.push(result[0]);
            } else {
              failedTasks.push({
                task: taskToInsert,
                errors: ["No result returned from database insertion"],
              });
            }
          } catch (insertError) {
            failedTasks.push({
              task: taskToInsert,
              errors: [
                insertError instanceof Error
                  ? insertError.message
                  : "Unknown database error",
              ],
            });
            // Continue with other tasks even if one fails
            continue;
          }
        }

        // Log summary of failures for debugging (only if there are failures)
        if (failedTasks.length > 0) {
          console.warn(
            `[WARN] ${failedTasks.length} tasks failed to save out of ${tasksToInsert.length} attempted`,
          );
          failedTasks.forEach((failed, index) => {
            console.warn(`[FAIL] Task ${index + 1}:`, failed.task);
            console.warn(`[FAIL] Errors:`, failed.errors);
          });
        }

        return results;
      });
    } catch (error) {
      console.error("[ERROR] Failed to save tasks:", error);
      throw error;
    }

    return c.json({
      success: true,
      data: {
        tasks: savedTasks,
        reasoning: generatedTasks.reasoning,
        totalGenerated: savedTasks.length,
        goalsProcessed: userGoals.length,
        attemptedTasks: allTasks.length,
        failedTasks: allTasks.length - savedTasks.length,
      },
    });
  } catch (error) {
    console.error("[ERROR] Bulk AI Task Creation Error:", error);
    if (error instanceof Error) {
      console.error("[ERROR] Error details:", error.message);
      console.error("[ERROR] Error stack:", error.stack);
    }
    return c.json(
      {
        success: false,
        error: "Failed to create AI tasks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

export default goalsRouter;
