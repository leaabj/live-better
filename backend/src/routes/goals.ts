import { Hono } from "hono";

const goalsRouter = new Hono();

// GET
goalsRouter.get("/", (c) => c.json({ success: true, data: [] }));

// POST
goalsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { title, userId } = body;

  if (!title || !userId) {
    return c.json(
      {
        success: false,
        error: "Title and userId are required",
      },
      400,
    );
  }

  return c.json(
    {
      success: true,
      data: { id: 1, title, userId },
    },
    201,
  );
});

// GET
goalsRouter.get("/:id", (c) => {
  const id = parseInt(c.req.param("id"));

  // Check if it's a valid ID (testing)
  if (isNaN(id) || id === 999) {
    return c.json(
      {
        success: false,
        error: "Goal not found",
      },
      404,
    );
  }

  // Return mock response
  return c.json({
    success: true,
    data: {
      id: 1,
      title: "Mock Goal",
      userId: "1",
    },
  });
});

// PUT
goalsRouter.put("/:id", (c) => {
  const id = parseInt(c.req.param("id"));

  // Check valid ID (testing)
  if (isNaN(id) || id === 999) {
    return c.json(
      {
        success: false,
        error: "Goal not found",
      },
      404,
    );
  }

  // Mock response
  return c.json({
    success: true,
    data: {
      id: 1,
      title: "Updated Goal",
      userId: "1",
    },
  });
});

// DELETE
goalsRouter.delete("/:id", (c) => {
  const id = parseInt(c.req.param("id"));

  if (isNaN(id) || id === 999) {
    return c.json(
      {
        success: false,
        error: "Goal not found",
      },
      404,
    );
  }

  return c.json({
    success: true,
    message: "Goal deleted successfully",
  });
});

export default goalsRouter;
