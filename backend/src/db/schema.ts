import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  index,
} from "drizzle-orm/pg-core";

// User
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  userContext: text("user_context"),
  preferredTimeSlots: text("preferred_time_slots").default(
    '["morning", "afternoon", "night"]',
  ),
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

    // time and duration (from AI schedule)
    specificTime: text("specific_time"), // e.g., "8:00 AM", "2:30 PM"
    duration: integer("duration"), // duration in minutes, e.g., 30, 45, 60

    aiGenerated: boolean("ai_generated").notNull().default(false),
    fixed: boolean("fixed").default(false), // Tasks marked as fixed won't be moved during rescheduling

    completed: boolean("completed").default(false),
    aiValidated: boolean("ai_validated").default(false),
    aiValidationResponse: text("ai_validation_response"),
    validationTimestamp: timestamp("validation_timestamp"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    idxTasksGoalId: index("idx_tasks_goalId").on(table.goalId),
    idxTasksUserId: index("idx_tasks_userId").on(table.userId),
    idxTasksCompleted: index("idx_tasks_completed").on(table.completed),
    idxTasksGoalIdCompleted: index("idx_tasks_goalId_completed").on(
      table.goalId,
      table.completed,
    ),
    idxTasksGoalIdTimeSlot: index("idx_tasks_goalId_timeSlot").on(
      table.goalId,
      table.timeSlot,
    ),
  }),
);
