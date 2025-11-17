/**
 * Metrics Middleware
 * Automatically tracks HTTP request metrics for all routes
 */

import { Context, Next } from "hono";
import { recordHttpRequest } from "../services/metrics";

/**
 * Middleware to track HTTP request metrics
 * 
 * This middleware:
 * - Records request duration
 * - Tracks status codes
 * - Counts total requests by method and route
 * - Identifies errors (4xx, 5xx)
 * 
 * @example
 * app.use("*", metricsMiddleware);
 */
export async function metricsMiddleware(c: Context, next: Next) {
  // Record start time
  const startTime = performance.now();

  // Get request details
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;

  // Normalize route path to avoid high cardinality
  // Replace IDs and dynamic segments with placeholders
  const route = normalizePath(path);

  try {
    // Continue to next middleware/handler
    await next();
  } finally {
    // Calculate duration in seconds
    const durationMs = performance.now() - startTime;
    const durationSeconds = durationMs / 1000;

    // Get response status code
    const statusCode = c.res.status;

    // Record metrics
    recordHttpRequest(method, route, statusCode, durationSeconds);
  }
}

/**
 * Normalize path to reduce cardinality
 * Replaces dynamic segments (IDs, UUIDs) with placeholders
 * 
 * Examples:
 * - /api/goals/123 -> /api/goals/:id
 * - /api/tasks/abc-def-456 -> /api/tasks/:id
 * - /api/users/profile -> /api/users/profile (no change)
 * 
 * @param path - The request path
 * @returns Normalized path with placeholders
 */
function normalizePath(path: string): string {
  // Skip normalization for static paths
  if (path === "/" || path === "/metrics" || path === "/health") {
    return path;
  }

  // Split path into segments
  const segments = path.split("/").filter(Boolean);

  // Normalize each segment
  const normalized = segments.map((segment, index) => {
    // Check if segment looks like an ID
    // Patterns: numeric (123), UUID (abc-def-123), alphanumeric (abc123)
    if (isIdSegment(segment)) {
      return ":id";
    }

    // Keep static segments as-is
    return segment;
  });

  return "/" + normalized.join("/");
}

/**
 * Check if a path segment looks like an ID
 * 
 * Matches:
 * - Pure numbers: 123, 456789
 * - UUIDs: 550e8400-e29b-41d4-a716-446655440000
 * - Alphanumeric IDs: abc123, task_456
 * 
 * Does NOT match:
 * - Common route names: profile, all, create, update, delete
 * - API endpoints: auth, goals, tasks
 * 
 * @param segment - Path segment to check
 * @returns True if segment looks like an ID
 */
function isIdSegment(segment: string): boolean {
  // List of known static segments (not IDs)
  const staticSegments = [
    "api",
    "auth",
    "goals",
    "tasks",
    "users",
    "profile",
    "all",
    "create",
    "update",
    "delete",
    "login",
    "register",
    "logout",
    "validate-photo",
    "ai-create-all",
    "daily-limit-check",
  ];

  // If it's a known static segment, it's not an ID
  if (staticSegments.includes(segment.toLowerCase())) {
    return false;
  }

  // Check if it's a pure number
  if (/^\d+$/.test(segment)) {
    return true;
  }

  // Check if it's a UUID pattern
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment
    )
  ) {
    return true;
  }

  // Check if it's an alphanumeric ID (mixed letters and numbers)
  // Must have at least one digit and be longer than 3 chars
  if (segment.length > 3 && /\d/.test(segment) && /[a-zA-Z]/.test(segment)) {
    return true;
  }

  // Check if it's a long alphanumeric string (likely an ID)
  if (segment.length > 10 && /^[a-zA-Z0-9_-]+$/.test(segment)) {
    return true;
  }

  return false;
}

/**
 * Optional: Middleware to skip metrics for specific routes
 * Useful for health checks or internal endpoints
 * 
 * @example
 * app.use("/health", skipMetrics);
 * app.get("/health", (c) => c.text("OK"));
 */
export function skipMetrics(c: Context, next: Next) {
  // Set a flag to skip metrics
  c.set("skipMetrics", true);
  return next();
}

/**
 * Export helper for testing
 */
export { normalizePath, isIdSegment };
