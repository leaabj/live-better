import { Hono } from "hono";
import { createGoalsRouter } from "./routes/goals";
import { createTasksRouter } from "./routes/tasks";
import { createAuthRouter } from "./routes/auth";
import { createMetricsRouter } from "./routes/metrics";
import { corsMiddleware } from "./middleware/cors";
import { metricsMiddleware } from "./middleware/metrics";
import { SERVER_CONFIG } from "./config/constants";

const app = new Hono();

// Metrics middleware (MUST be first to track all requests)
app.use("*", metricsMiddleware);

// CORS middleware
app.use("*", corsMiddleware);

// Health check
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// Metrics endpoint (Prometheus scraping)
app.route("/metrics", createMetricsRouter());

// Routes (using default production database)
app.route("/api/auth", createAuthRouter());
app.route("/api/goals", createGoalsRouter());
app.route("/api/tasks", createTasksRouter());

// Explicitly start the server with proper configuration
const server = Bun.serve({
  port: SERVER_CONFIG.PORT,
  fetch: app.fetch,
  idleTimeout: SERVER_CONFIG.IDLE_TIMEOUT,
});

console.log(`Server is running on http://localhost:${server.port}`);
