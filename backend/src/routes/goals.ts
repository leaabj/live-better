import { Hono } from "hono";
import { db } from "../db";
import { goals, tasks, users } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { AIService } from "../services/ai";

const goalsRouter = new Hono();

// GET /api/goals (all)
goalsRouter.get("/", async (c) => {
  try {
    const { searchParams } = new URL(c.req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return c.json({ success: false, error: "userId required" }, 400);
    }

    const userGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, parseInt(userId)))
      .orderBy(desc(goals.createdAt));

    return c.json({ success: true, data: userGoals });
  } catch (error) {
    return c.json({ success: false, error: "Failed to fetch goals" }, 500);
  }
});

// POST /api/goals - Create new goal
goalsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { title, description, targetDate, userId } = body;

    if (!title || !userId) {
      return c.json(
        { success: false, error: "Title and userId are required" },
        400,
      );
    }

    const newGoal = await db
      .insert(goals)
      .values({
        title,
        description: description || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        userId,
        updatedAt: new Date(),
      })
      .returning();

    return c.json({ success: true, data: newGoal[0] }, 201);
  } catch (error) {
    return c.json({ success: false, error: "Failed to create goal" }, 500);
  }
});

// GET /api/goals/:id (specific)
goalsRouter.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { searchParams } = new URL(c.req.url);
    const userId = searchParams.get("userId");

    if (isNaN(id) || !userId) {
      return c.json(
        { success: false, error: "Invalid goal ID or userId required" },
        400,
      );
    }

    const goal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, parseInt(userId))))
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
goalsRouter.put("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { title, description, targetDate, userId } = body;

    if (isNaN(id) || !userId) {
      return c.json(
        { success: false, error: "Invalid goal ID or userId required" },
        400,
      );
    }

    // Verify user owns the goal
    const existingGoal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, parseInt(userId))))
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
        targetDate: targetDate ? new Date(targetDate) : undefined,
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
goalsRouter.delete("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { searchParams } = new URL(c.req.url);
    const userId = searchParams.get("userId");

    if (isNaN(id) || !userId) {
      return c.json(
        { success: false, error: "Invalid goal ID or userId required" },
        400,
      );
    }

    // Verify user owns the goal
    const existingGoal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, parseInt(userId))))
      .limit(1);

    if (!existingGoal.length) {
      return c.json(
        { success: false, error: "Goal not found or access denied" },
        404,
      );
    }

    const deletedGoal = await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, parseInt(userId))))
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
goalsRouter.post("/tasks/ai-create-all", async (c) => {
  try {
    const { searchParams } = new URL(c.req.url);
    const userId = searchParams.get("userId");

    // Validate user
    if (!userId) {
      return c.json({ success: false, error: "userId required" }, 400);
    }

    // Get user data with preferences
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    if (!userData.length) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    const user = userData[0];

    // Get all user goals
    const userGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, parseInt(userId)))
      .orderBy(desc(goals.createdAt));

    if (!userGoals.length) {
      return c.json({ success: false, error: "No goals found for user" }, 404);
    }

    // Generate AI tasks for all goals using user data from database
    const generatedTasks = await AIService.generateTasksFromAllGoals({
      goals: userGoals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        description: goal.description || undefined,
        targetDate: goal.targetDate || undefined,
      })),
      userData: {
        userContext: user.userContext,
        dailyTimeBudget: user.dailyTimeBudget,
        preferredTimeSlots: user.preferredTimeSlots,
      },
    });

    // Validate that all generated tasks have goal IDs that belong to the current user
    const validGoalIds = new Set(userGoals.map(goal => goal.id));
    const invalidTasks = generatedTasks.tasks.filter(task => !validGoalIds.has(task.goalId));
    
    if (invalidTasks.length > 0) {
      console.error('Invalid goal IDs in generated tasks:', invalidTasks.map(t => t.goalId));
      return c.json({ 
        success: false, 
        error: `Generated tasks contain invalid goal IDs: ${invalidTasks.map(t => t.goalId).join(', ')}` 
      }, 500);
    }

    // Save all tasks in transaction for atomicity
    const savedTasks = await db.transaction(async (tx) => {
      const tasksToInsert = generatedTasks.tasks.map((task) => ({
        title: task.title,
        description: task.description || null,
        goalId: task.goalId, // Track which goal this belongs to
        userId: parseInt(userId),
        timeSlot: task.timeSlot || null,
        specificTime: task.specificTime || null, // e.g., "8:00 AM"
        duration: task.duration || null, // duration in minutes
        aiGenerated: true,
        aiValidated: false,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      return await tx.insert(tasks).values(tasksToInsert).returning();
    });

    return c.json({
      success: true,
      data: {
        tasks: savedTasks,
        reasoning: generatedTasks.reasoning,
        totalGenerated: savedTasks.length,
        goalsProcessed: userGoals.length,
        dailySchedule: generatedTasks.dailySchedule,
      },
    });
  } catch (error) {
    console.error("Bulk AI Task Creation Error:", error);
    return c.json({ success: false, error: "Failed to create AI tasks" }, 500);
  }
});

export default goalsRouter;
