import { Hono } from "hono";
import goalsRouter from "./routes/goals";

const app = new Hono();

// Health check
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// Goal routes
app.route("/api/goals", goalsRouter);

export default app;
