import { Hono } from "hono";
import goalsRouter from "./routes/goals";
import tasksRouter from "./routes/tasks";

const app = new Hono();

// Health check
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// Routes
app.route("/api/goals", goalsRouter);
app.route("/api/tasks", tasksRouter);

export default app;
