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
    goalId: integer("goal_id").references(() => goals.id), // Made nullable - tasks can exist without goals
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),

    // task info
    title: text("title").notNull(),
    description: text("description"),
    timeSlot: text("time_slot"), // morning, afternoon, night

    // time and duration (from AI schedule)
    specificTime: timestamp("specific_time"), // timestamp with timezone for specific time of day
    duration: integer("duration"), // duration in minutes, e.g., 30, 45, 60

    aiGenerated: boolean("ai_generated").notNull().default(false),

    completed: boolean("completed").default(false),
    aiValidated: boolean("ai_validated").default(false),
    aiValidationResponse: text("ai_validation_response"),
    validationTimestamp: timestamp("validation_timestamp"),

    // Photo validation fields (privacy-focused - no photo storage)
    photoValidationAttempts: integer("photo_validation_attempts").default(0), // Number of validation attempts
    photoValidationStatus: text("photo_validation_status").default("pending"), // pending, validated, failed
    photoLastUploadAt: timestamp("photo_last_upload_at"), // When the photo was last attempted

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    idxTasksGoalId: index("idx_tasks_goalId").on(table.goalId), // Index will handle nulls automatically
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
