import { Hono } from "hono";
import goalsRouter from "./routes/goals";
import tasksRouter from "./routes/tasks";

const app = new Hono();

// CORS middleware
app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "http://localhost:3001");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  c.header("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (c.req.method === "OPTIONS") {
    return c.text("", 200);
  }

  await next();
});

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
  idleTimeout: 30,
});

console.log(`Server is running on http://localhost:${server.port}`);
