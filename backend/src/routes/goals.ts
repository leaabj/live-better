import { Hono } from "hono";
import { db } from "../db";
import { goals } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

const goalsRouter = new Hono();

// GET /api/goals (all)
goalsRouter.get("/", async (c) => {
  try {
    // For now, we'll skip auth and return all goals
    // Later we'll add: userId: c.get('user').id
    const allGoals = await db
      .select()
      .from(goals)
      .orderBy(desc(goals.createdAt));

    return c.json({ success: true, data: allGoals });
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

    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid goal ID" }, 400);
    }

    const goal = await db.select().from(goals).where(eq(goals.id, id)).limit(1);

    if (!goal.length) {
      return c.json({ success: false, error: "Goal not found" }, 404);
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
    const { title, description, targetDate } = body;

    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid goal ID" }, 400);
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

    if (!updatedGoal.length) {
      return c.json({ success: false, error: "Goal not found" }, 404);
    }

    return c.json({ success: true, data: updatedGoal[0] });
  } catch (error) {
    return c.json({ success: false, error: "Failed to update goal" }, 500);
  }
});

// DELETE /api/goals/:id
goalsRouter.delete("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid goal ID" }, 400);
    }

    const deletedGoal = await db
      .delete(goals)
      .where(eq(goals.id, id))
      .returning();

    if (!deletedGoal.length) {
      return c.json({ success: false, error: "Goal not found" }, 404);
    }

    return c.json({ success: true, message: "Goal deleted successfully" });
  } catch (error) {
    return c.json({ success: false, error: "Failed to delete goal" }, 500);
  }
});

export default goalsRouter;
