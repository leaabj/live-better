/**
 * Metrics Route
 * Exposes Prometheus metrics endpoint
 */

import { Hono } from "hono";
import { getMetrics, getMetricsContentType } from "../services/metrics";

/**
 * Create metrics router
 * 
 * Endpoints:
 * - GET /metrics - Returns Prometheus metrics in text format
 * 
 * Note: This endpoint is NOT protected by authentication
 * Prometheus needs open access to scrape metrics
 */
export function createMetricsRouter() {
  const router = new Hono();

  /**
   * GET /metrics
   * 
   * Returns all application metrics in Prometheus exposition format
   * 
   * Response format:
   * - Content-Type: text/plain; version=0.0.4; charset=utf-8
   * - Body: Prometheus metrics in text format
   * 
   * Example output:
   * ```
   * # HELP livebetter_http_requests_total Total number of HTTP requests
   * # TYPE livebetter_http_requests_total counter
   * livebetter_http_requests_total{method="GET",route="/api/goals",status="200"} 42
   * 
   * # HELP livebetter_http_request_duration_seconds Duration of HTTP requests in seconds
   * # TYPE livebetter_http_request_duration_seconds histogram
   * livebetter_http_request_duration_seconds_bucket{le="0.005",method="GET",route="/api/goals"} 10
   * livebetter_http_request_duration_seconds_bucket{le="0.01",method="GET",route="/api/goals"} 25
   * ...
   * ```
   * 
   * @returns Prometheus metrics in text format
   */
  router.get("/", async (c) => {
    try {
      // Get metrics from registry
      const metrics = await getMetrics();

      // Set proper content type for Prometheus
      const contentType = getMetricsContentType();

      // Return metrics
      return c.text(metrics, 200, {
        "Content-Type": contentType,
      });
    } catch (error) {
      console.error("Error generating metrics:", error);
      return c.text("Error generating metrics", 500);
    }
  });

  /**
   * Optional: Health check endpoint for the metrics service
   * Can be used to verify metrics collection is working
   */
  router.get("/health", (c) => {
    return c.json({
      status: "ok",
      message: "Metrics service is running",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
