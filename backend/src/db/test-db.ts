import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { hashPassword } from "../utils/auth";

/**
 * Creates an in-memory SQLite database for testing
 * Schema matches PostgreSQL production schema
 * 
 * Note: SQLite uses INTEGER for BOOLEAN (0 = false, 1 = true)
 * Drizzle ORM handles the conversion automatically
 */
export function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });

  // Create tables matching your PostgreSQL schema
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      user_context TEXT,
      preferred_time_slots TEXT DEFAULT '["morning", "afternoon", "night"]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      time_slot TEXT,
      specific_time TEXT,
      duration INTEGER,
      ai_generated INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      ai_validated INTEGER DEFAULT 0,
      ai_validation_response TEXT,
      validation_timestamp TEXT,
      photo_validation_attempts INTEGER DEFAULT 0,
      photo_validation_status TEXT DEFAULT 'pending',
      photo_last_upload_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (goal_id) REFERENCES goals(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Indexes matching PostgreSQL schema
    CREATE INDEX idx_tasks_goalId ON tasks(goal_id);
    CREATE INDEX idx_tasks_userId ON tasks(user_id);
    CREATE INDEX idx_tasks_completed ON tasks(completed);
    CREATE INDEX idx_tasks_goalId_completed ON tasks(goal_id, completed);
    CREATE INDEX idx_tasks_goalId_timeSlot ON tasks(goal_id, time_slot);
  `);

  return db;
}

/**
 * Seeds test database with sample data
 * Returns created test entities for use in tests
 */
export async function seedTestData(db: any) {
  // Create test user with hashed password
  const hashedPassword = await hashPassword("password123");
  const now = new Date();

  const testUser = await db
    .insert(schema.users)
    .values({
      name: "Test User",
      email: "test@example.com",
      password: hashedPassword,
      userContext: "Test user context",
      preferredTimeSlots: '["morning", "afternoon"]',
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Create test goal
  const testGoal = await db
    .insert(schema.goals)
    .values({
      userId: testUser[0].id,
      title: "Test Goal",
      description: "Test Description",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Create test task
  const testTask = await db
    .insert(schema.tasks)
    .values({
      goalId: testGoal[0].id,
      userId: testUser[0].id,
      title: "Test Task",
      description: "Test task description",
      timeSlot: "morning",
      duration: 30,
      aiGenerated: false,
      completed: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return {
    testUser: testUser[0],
    testGoal: testGoal[0],
    testTask: testTask[0],
  };
}

/**
 * Creates a second test user for isolation testing
 */
export async function createSecondUser(db: any) {
  const hashedPassword = await hashPassword("password456");
  const now = new Date();

  const user = await db
    .insert(schema.users)
    .values({
      name: "Other User",
      email: "other@example.com",
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return user[0];
}

/**
 * Creates a goal for a specific user
 */
export async function createGoalForUser(
  db: any,
  userId: number,
  title: string = "Test Goal",
  description?: string,
) {
  const now = new Date();
  const goal = await db
    .insert(schema.goals)
    .values({
      userId,
      title,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return goal[0];
}

/**
 * Creates a task for a specific user and optional goal
 */
export async function createTaskForUser(
  db: any,
  userId: number,
  taskData: {
    title?: string;
    goalId?: number | null;
    timeSlot?: string;
    duration?: number;
    completed?: boolean;
    aiGenerated?: boolean;
  } = {},
) {
  const now = new Date();
  const task = await db
    .insert(schema.tasks)
    .values({
      userId,
      title: taskData.title || "Test Task",
      goalId: taskData.goalId !== undefined ? taskData.goalId : null,
      timeSlot: taskData.timeSlot || null,
      duration: taskData.duration || null,
      completed: taskData.completed || false,
      aiGenerated: taskData.aiGenerated || false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return task[0];
}
