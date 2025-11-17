import { Hono } from "hono";
import { db as defaultDb } from "../db";
import { goals, tasks, users } from "../db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { AIService } from "../services/ai";
import { authMiddleware, getAuthUser } from "../middleware/auth";
import { validateTaskData } from "../utils/validation";
import { ErrorResponse, SuccessResponse } from "../utils/errors";
import { AI_CONFIG } from "../config/constants";
import {
  goalsCreatedTotal,
  goalsDeletedTotal,
  recordAiGeneration,
} from "../services/metrics";

// Re-export for backward compatibility with tests
export const validateTaskForInsertion = validateTaskData;


export function createGoalsRouter(db = defaultDb) {
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

    const now = new Date();
    const newGoal = await db
      .insert(goals)
      .values({
        title,
        description: description || null,
        userId: user.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Track goal creation
    goalsCreatedTotal.inc();

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

    // Use a transaction to ensure both operations succeed or fail together
    const result = await db.transaction(async (tx) => {
      // Verify user owns the goal
      const existingGoal = await tx
        .select()
        .from(goals)
        .where(and(eq(goals.id, id), eq(goals.userId, user.userId)))
        .limit(1);

      if (!existingGoal.length) {
        throw new Error("Goal not found or access denied");
      }

      // set goalId to null for all related tasks
      await tx
        .update(tasks)
        .set({
          goalId: null,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.goalId, id), eq(tasks.userId, user.userId)));

      //  delete the goal
      const deletedGoal = await tx
        .delete(goals)
        .where(and(eq(goals.id, id), eq(goals.userId, user.userId)))
        .returning();

      return deletedGoal;
    });

    // Track goal deletion
    goalsDeletedTotal.inc();

    return c.json({
      success: true,
      message:
        "Goal deleted successfully. Related tasks have been unlinked from the goal.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Goal not found or access denied"
    ) {
      return c.json({ success: false, error: error.message }, 404);
    }
    console.error("Error deleting goal:", error);
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

    // Check if user already has AI-generated tasks from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingTasksToday = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.userId),
          eq(tasks.aiGenerated, true),
          gte(tasks.createdAt, today),
          lte(tasks.createdAt, tomorrow),
        ),
      )
      .limit(1);

    if (existingTasksToday.length > 0) {
      // Track AI generation limit reached
      recordAiGeneration("limit_reached");
      return c.json(
        {
          success: false,
          error:
            "You have already generated tasks for today. You can only generate AI tasks once per day.",
          code: "DAILY_LIMIT_REACHED",
        },
        400,
      );
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

    // Track AI generation start time
    const aiStartTime = performance.now();

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

    // Track successful AI generation
    const aiDuration = (performance.now() - aiStartTime) / 1000;
    recordAiGeneration("success", aiDuration);

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
    // Track failed AI generation
    recordAiGeneration("failure");
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

/**
 * GET /api/goals/tasks/daily-limit-check
 *
 * Check if user has already generated AI tasks today.
 * This endpoint only checks the daily limit without generating any tasks.
 *
 * @returns {Object} Daily limit status
 * @returns {boolean} data.canGenerate - Whether user can generate tasks today
 * @returns {string} data.message - Status message
 */
goalsRouter.get("/tasks/daily-limit-check", authMiddleware, async (c) => {
  try {
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Check if user already has AI-generated tasks from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingTasksToday = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.userId),
          eq(tasks.aiGenerated, true),
          gte(tasks.createdAt, today),
          lte(tasks.createdAt, tomorrow),
        ),
      )
      .limit(1);

    const canGenerate = existingTasksToday.length === 0;

    return c.json({
      success: true,
      data: {
        canGenerate,
        message: canGenerate
          ? "You can generate tasks today"
          : "Daily limit reached. You have already generated tasks for today.",
      },
    });
  } catch (error) {
    console.error("[ERROR] Daily limit check error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to check daily limit",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

  return goalsRouter;
}

// Default export for production use
export default createGoalsRouter();
