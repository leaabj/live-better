

import { Context, Next } from "hono";
import { CORS_CONFIG, HTTP_STATUS } from "../config/constants";


export async function corsMiddleware(c: Context, next: Next) {
  // Set CORS headers
  c.header("Access-Control-Allow-Origin", CORS_CONFIG.ALLOWED_ORIGIN);
  c.header("Access-Control-Allow-Methods", CORS_CONFIG.ALLOWED_METHODS);
  c.header("Access-Control-Allow-Headers", CORS_CONFIG.ALLOWED_HEADERS);
  c.header("Access-Control-Allow-Credentials", CORS_CONFIG.ALLOW_CREDENTIALS);

  // Handle preflight requests
  if (c.req.method === "OPTIONS") {
    return c.text("", HTTP_STATUS.OK);
  }

  await next();
}
