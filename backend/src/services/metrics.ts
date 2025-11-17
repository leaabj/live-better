/**
 * Prometheus Metrics Service
 * Provides comprehensive application monitoring with custom and default metrics
 */

import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

/**
 * Initialize default metrics collection
 * Collects: CPU, memory, event loop lag, heap size, etc.
 */
collectDefaultMetrics({
  prefix: "livebetter_",
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ============================================================================
// HTTP Metrics
// ============================================================================

/**
 * Total HTTP requests counter
 * Labels: method (GET, POST, etc.), route, status (200, 404, etc.)
 */
export const httpRequestsTotal = new Counter({
  name: "livebetter_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

/**
 * HTTP request duration histogram
 * Labels: method, route
 * Buckets optimized for API response times (5ms to 10s)
 */
export const httpRequestDuration = new Histogram({
  name: "livebetter_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

/**
 * HTTP errors counter
 * Labels: method, route, error_type
 */
export const httpErrorsTotal = new Counter({
  name: "livebetter_http_errors_total",
  help: "Total number of HTTP errors",
  labelNames: ["method", "route", "error_type"],
});

// ============================================================================
// Authentication Metrics
// ============================================================================

/**
 * Authentication attempts counter
 * Labels: type (login, register), result (success, failure)
 */
export const authAttemptsTotal = new Counter({
  name: "livebetter_auth_attempts_total",
  help: "Total number of authentication attempts",
  labelNames: ["type", "result"],
});

/**
 * Active sessions gauge
 * Tracks currently authenticated users
 */
export const activeSessions = new Gauge({
  name: "livebetter_active_sessions",
  help: "Number of active user sessions",
});

// ============================================================================
// Business Metrics - Goals
// ============================================================================

/**
 * Goals created counter
 */
export const goalsCreatedTotal = new Counter({
  name: "livebetter_goals_created_total",
  help: "Total number of goals created",
});

/**
 * Goals completed counter
 */
export const goalsCompletedTotal = new Counter({
  name: "livebetter_goals_completed_total",
  help: "Total number of goals completed",
});

/**
 * Goals deleted counter
 */
export const goalsDeletedTotal = new Counter({
  name: "livebetter_goals_deleted_total",
  help: "Total number of goals deleted",
});

/**
 * Active goals gauge
 * Labels: completed (true, false)
 */
export const activeGoals = new Gauge({
  name: "livebetter_active_goals",
  help: "Number of active goals",
  labelNames: ["completed"],
});

// ============================================================================
// Business Metrics - Tasks
// ============================================================================

/**
 * Tasks created counter
 * Labels: time_slot (morning, afternoon, night), ai_generated (true, false)
 */
export const tasksCreatedTotal = new Counter({
  name: "livebetter_tasks_created_total",
  help: "Total number of tasks created",
  labelNames: ["time_slot", "ai_generated"],
});

/**
 * Tasks completed counter
 * Labels: time_slot
 */
export const tasksCompletedTotal = new Counter({
  name: "livebetter_tasks_completed_total",
  help: "Total number of tasks completed",
  labelNames: ["time_slot"],
});

/**
 * Tasks deleted counter
 */
export const tasksDeletedTotal = new Counter({
  name: "livebetter_tasks_deleted_total",
  help: "Total number of tasks deleted",
});

/**
 * Active tasks gauge
 * Labels: time_slot, completed (true, false)
 */
export const activeTasks = new Gauge({
  name: "livebetter_active_tasks",
  help: "Number of active tasks",
  labelNames: ["time_slot", "completed"],
});

/**
 * Task duration histogram
 * Tracks the duration assigned to tasks (in minutes)
 */
export const taskDurationMinutes = new Histogram({
  name: "livebetter_task_duration_minutes",
  help: "Duration of tasks in minutes",
  labelNames: ["time_slot"],
  buckets: [5, 15, 30, 60, 120, 240, 480],
});

// ============================================================================
// AI Metrics
// ============================================================================

/**
 * AI generation requests counter
 * Labels: result (success, failure, limit_reached)
 */
export const aiGenerationsTotal = new Counter({
  name: "livebetter_ai_generations_total",
  help: "Total number of AI task generation requests",
  labelNames: ["result"],
});

/**
 * AI generation duration histogram
 * Tracks how long AI generations take
 */
export const aiGenerationDuration = new Histogram({
  name: "livebetter_ai_generation_duration_seconds",
  help: "Duration of AI task generation in seconds",
  buckets: [0.5, 1, 2, 5, 10, 15, 30],
});

/**
 * AI tokens used counter
 * Tracks total tokens consumed
 */
export const aiTokensUsed = new Counter({
  name: "livebetter_ai_tokens_used_total",
  help: "Total number of AI tokens used",
  labelNames: ["model"],
});

// ============================================================================
// Photo Validation Metrics
// ============================================================================

/**
 * Photo validation attempts counter
 * Labels: result (success, failure, invalid_format)
 */
export const photoValidationsTotal = new Counter({
  name: "livebetter_photo_validations_total",
  help: "Total number of photo validation attempts",
  labelNames: ["result"],
});

/**
 * Photo validation duration histogram
 */
export const photoValidationDuration = new Histogram({
  name: "livebetter_photo_validation_duration_seconds",
  help: "Duration of photo validation in seconds",
  buckets: [0.5, 1, 2, 5, 10],
});

/**
 * Photo size histogram
 * Tracks uploaded photo sizes in bytes
 */
export const photoSizeBytes = new Histogram({
  name: "livebetter_photo_size_bytes",
  help: "Size of uploaded photos in bytes",
  buckets: [100000, 500000, 1000000, 5000000, 10000000], // 100KB to 10MB
});

// ============================================================================
// Database Metrics
// ============================================================================

/**
 * Database query duration histogram
 * Labels: operation (select, insert, update, delete), table
 */
export const dbQueryDuration = new Histogram({
  name: "livebetter_db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "table"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

/**
 * Database errors counter
 * Labels: operation, table, error_type
 */
export const dbErrorsTotal = new Counter({
  name: "livebetter_db_errors_total",
  help: "Total number of database errors",
  labelNames: ["operation", "table", "error_type"],
});

/**
 * Active database connections gauge
 */
export const dbConnectionsActive = new Gauge({
  name: "livebetter_db_connections_active",
  help: "Number of active database connections",
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all metrics in Prometheus format
 * Used by the /metrics endpoint
 */
export async function getMetrics(): Promise<string> {
  return await register.metrics();
}

/**
 * Get metrics content type
 * Required for Prometheus scraping
 */
export function getMetricsContentType(): string {
  return register.contentType;
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  register.clear();
}

/**
 * Reset all metrics to zero (useful for testing)
 */
export function resetMetrics(): void {
  register.resetMetrics();
}

// ============================================================================
// Helper Functions for Common Operations
// ============================================================================

/**
 * Record an HTTP request
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number
): void {
  httpRequestsTotal.inc({ method, route, status: statusCode.toString() });
  httpRequestDuration.observe({ method, route }, durationSeconds);

  // Track errors (4xx and 5xx)
  if (statusCode >= 400) {
    const errorType = statusCode >= 500 ? "server_error" : "client_error";
    httpErrorsTotal.inc({ method, route, error_type: errorType });
  }
}

/**
 * Record an authentication attempt
 */
export function recordAuthAttempt(type: "login" | "register", success: boolean): void {
  const result = success ? "success" : "failure";
  authAttemptsTotal.inc({ type, result });
}

/**
 * Record a database query
 */
export function recordDbQuery(
  operation: "select" | "insert" | "update" | "delete",
  table: string,
  durationSeconds: number
): void {
  dbQueryDuration.observe({ operation, table }, durationSeconds);
}

/**
 * Record a database error
 */
export function recordDbError(
  operation: string,
  table: string,
  errorType: string
): void {
  dbErrorsTotal.inc({ operation, table, error_type: errorType });
}

/**
 * Record AI generation
 */
export function recordAiGeneration(
  result: "success" | "failure" | "limit_reached",
  durationSeconds?: number
): void {
  aiGenerationsTotal.inc({ result });
  if (durationSeconds !== undefined) {
    aiGenerationDuration.observe(durationSeconds);
  }
}

/**
 * Record photo validation
 */
export function recordPhotoValidation(
  result: "success" | "failure" | "invalid_format",
  durationSeconds?: number,
  sizeBytes?: number
): void {
  photoValidationsTotal.inc({ result });
  if (durationSeconds !== undefined) {
    photoValidationDuration.observe(durationSeconds);
  }
  if (sizeBytes !== undefined) {
    photoSizeBytes.observe(sizeBytes);
  }
}

// Export the registry for advanced use cases
export { register };
