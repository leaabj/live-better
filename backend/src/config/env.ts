/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and valid
 */

import { AUTH_CONFIG } from "./constants";

interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  OPENAI_API_KEY: string;
  NODE_ENV: "development" | "production" | "test";
}

/**
 * Validates and returns environment variables
 * Throws an error if any required variable is missing or invalid
 * In test mode, returns defaults for missing values
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = [];
  const isTest = process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";

  // Check DATABASE_URL
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    if (!isTest) errors.push("DATABASE_URL is required");
  } else if (!DATABASE_URL.startsWith("postgresql://") && !DATABASE_URL.startsWith("postgres://")) {
    if (!isTest) errors.push("DATABASE_URL must be a valid PostgreSQL connection string");
  }

  // Check JWT_SECRET
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    if (!isTest) errors.push("JWT_SECRET is required");
  } else if (JWT_SECRET.length < AUTH_CONFIG.MIN_JWT_SECRET_LENGTH) {
    if (!isTest) errors.push(`JWT_SECRET must be at least ${AUTH_CONFIG.MIN_JWT_SECRET_LENGTH} characters long`);
  }

  // Check OPENAI_API_KEY (optional in tests)
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY && !isTest) {
    errors.push("OPENAI_API_KEY is required");
  } else if (OPENAI_API_KEY && !OPENAI_API_KEY.startsWith("sk-") && !isTest) {
    errors.push("OPENAI_API_KEY must be a valid OpenAI API key");
  }

  // Determine NODE_ENV
  const NODE_ENV = (process.env.NODE_ENV || "development") as EnvConfig["NODE_ENV"];
  if (!["development", "production", "test"].includes(NODE_ENV)) {
    errors.push("NODE_ENV must be development, production, or test");
  }

  // If there are errors, throw them (unless in test mode)
  if (errors.length > 0 && !isTest) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }

  return {
    DATABASE_URL: DATABASE_URL || "postgresql://test:test@localhost:5432/test",
    JWT_SECRET: JWT_SECRET || "test-jwt-secret-minimum-32-characters-long",
    OPENAI_API_KEY: OPENAI_API_KEY || "sk-test-key",
    NODE_ENV,
  };
}

/**
 * Validated environment configuration
 * Use this instead of process.env for type safety
 */
export const env = validateEnv();
