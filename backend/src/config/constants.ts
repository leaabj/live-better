/**
 * Application Constants
 * Centralized location for all magic numbers and configuration values
 */

// Server Configuration
export const SERVER_CONFIG = {
  PORT: 3000,
  IDLE_TIMEOUT: 30,
} as const;

// CORS Configuration
export const CORS_CONFIG = {
  ALLOWED_ORIGIN: "http://localhost:3001",
  ALLOWED_METHODS: "GET, POST, PUT, DELETE, OPTIONS",
  ALLOWED_HEADERS: "Content-Type, Authorization",
  ALLOW_CREDENTIALS: "true",
} as const;

// Time Slot Definitions (in minutes since midnight)
export const TIME_SLOTS = {
  MORNING: {
    NAME: "morning" as const,
    START: 270, // 4:30 AM
    END: 720,   // 12:00 PM
  },
  AFTERNOON: {
    NAME: "afternoon" as const,
    START: 720,  // 12:00 PM
    END: 1080,   // 6:00 PM
  },
  NIGHT: {
    NAME: "night" as const,
    START: 1080, // 6:00 PM
    END: 1440,   // 12:00 AM (next day)
  },
} as const;

// Valid time slot names
export const VALID_TIME_SLOTS = [
  TIME_SLOTS.MORNING.NAME,
  TIME_SLOTS.AFTERNOON.NAME,
  TIME_SLOTS.NIGHT.NAME,
] as const;

export type TimeSlot = typeof VALID_TIME_SLOTS[number];

// Task Configuration
export const TASK_CONFIG = {
  MIN_DURATION: 5,      // Minimum task duration in minutes
  MAX_DURATION: 480,    // Maximum task duration in minutes (8 hours)
} as const;

// Authentication Configuration
export const AUTH_CONFIG = {
  BCRYPT_SALT_ROUNDS: 10,
  JWT_EXPIRATION: "7d",
  MIN_JWT_SECRET_LENGTH: 32,
} as const;

// AI Configuration
export const AI_CONFIG = {
  MODEL: "gpt-4o-2024-08-06",
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.7,
  DAILY_GENERATION_LIMIT: 1,
} as const;

// Photo Validation Configuration
export const PHOTO_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"],
  VISION_MODEL: "gpt-4o",
  MAX_VALIDATION_ATTEMPTS: 3,
} as const;

// Database Configuration
export const DB_CONFIG = {
  QUERY_TIMEOUT: 30000, // 30 seconds
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  INVALID_CREDENTIALS: "Invalid credentials",
  USER_EXISTS: "User already exists",
  USER_NOT_FOUND: "User not found",
  GOAL_NOT_FOUND: "Goal not found",
  TASK_NOT_FOUND: "Task not found",
  INVALID_TIME_SLOT: "Invalid time slot",
  INVALID_DURATION: `Duration must be between ${TASK_CONFIG.MIN_DURATION} and ${TASK_CONFIG.MAX_DURATION} minutes`,
  DAILY_LIMIT_REACHED: "Daily AI generation limit reached",
  INVALID_PHOTO: "Invalid photo format or size",
  DATABASE_ERROR: "Database operation failed",
  VALIDATION_ERROR: "Validation failed",
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  USER_CREATED: "User created successfully",
  LOGIN_SUCCESS: "Login successful",
  GOAL_CREATED: "Goal created successfully",
  GOAL_UPDATED: "Goal updated successfully",
  GOAL_DELETED: "Goal deleted successfully",
  TASK_CREATED: "Task created successfully",
  TASK_UPDATED: "Task updated successfully",
  TASK_DELETED: "Task deleted successfully",
  PHOTO_VALIDATED: "Photo validated successfully",
} as const;
