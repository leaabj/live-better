import { Hono } from "hono";
import { db } from "../db";
import { goals, tasks } from "../db/schema";
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

// POST /goals/:id/tasks/ai-create
goalsRouter.post("/:id/tasks/ai-create", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { searchParams } = new URL(c.req.url);
    const userId = searchParams.get("userId");
    const body = await c.req.json();
    const { userContext } = body;

    if (isNaN(id) || !userId) {
      return c.json(
        { success: false, error: "Invalid goal ID or userId required" },
        400,
      );
    }

    // Get goal info
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

    // Generate AI tasks
    const generatedTasks = await AIService.generateTasksFromGoal({
      goalTitle: goal[0].title,
      goalDescription: goal[0].description || undefined,
      targetDate: goal[0].targetDate || undefined,
      userContext,
    });

    const savedTasks = [];
    for (const taskData of generatedTasks.tasks) {
      const newTask = await db
        .insert(tasks)
        .values({
          title: taskData.title,
          description: taskData.description || null,
          goalId: id,
          userId: parseInt(userId),
          timeSlot: taskData.timeSlot || null,
          aiGenerated: true,
          completed: false,
          aiValidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      savedTasks.push(newTask[0]);
    }

    return c.json({
      success: true,
      data: {
        tasks: savedTasks,
        reasoning: generatedTasks.reasoning,
        totalGenerated: savedTasks.length,
      },
    });
  } catch (error) {
    console.error("AI Task Creation Error:", error);
    return c.json({ success: false, error: "Failed to create AI tasks" }, 500);
  }
});

export default goalsRouter;
