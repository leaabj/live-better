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

// Tasks
export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),

    // relationships
    goalId: integer("goal_id")
      .references(() => goals.id)
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),

    // task info
    title: text("title").notNull(),
    description: text("description"),
    timeSlot: text("time_slot"), // morning, afternoon, night

    aiGenerated: boolean("ai_generated").notNull().default(false),

    completed: boolean("completed").default(false),
    aiValidated: boolean("ai_validated").default(false),
    aiValidationResponse: text("ai_validation_response"),
    validationTimestamp: timestamp("validation_timestamp"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    // Indexes for performance optimization
    {
      name: "idx_tasks_goalId",
      columns: [table.goalId],
    },
    {
      name: "idx_tasks_userId",
      columns: [table.userId],
    },
    {
      name: "idx_tasks_completed",
      columns: [table.completed],
    },
    {
      name: "idx_tasks_goalId_completed",
      columns: [table.goalId, table.completed],
    },
    {
      name: "idx_tasks_goalId_timeSlot",
      columns: [table.goalId, table.timeSlot],
    },
  ],
);
