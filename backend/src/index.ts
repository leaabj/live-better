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

// Explicitly start the server with proper configuration
const server = Bun.serve({
  port: 3000,
  fetch: app.fetch,
  idleTimeout: 30, // 30 seconds timeout to prevent premature disconnections
});

console.log(`Server is running on http://localhost:${server.port}`);
