import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
} from "drizzle-orm/pg-core";

// User
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Goals
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: timestamp("target_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Plans
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id")
    .references(() => goals.id)
    .notNull(),
  date: timestamp("date").notNull(),
  aiGenerated: boolean("ai_generated").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .references(() => plans.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  timeSlot: text("time_slot"), // morning, afternoon, night
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Validations
export const validations = pgTable("validations", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .references(() => tasks.id)
    .notNull(),
  photoUrl: text("photo_url").notNull(),
  passed: boolean("passed").notNull(),
  feedback: text("feedback"),
  aiScore: text("ai_score"),
  createdAt: timestamp("created_at").defaultNow(),
});
