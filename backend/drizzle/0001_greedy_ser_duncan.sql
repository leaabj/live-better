ALTER TABLE "users" ADD COLUMN "user_context" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_time_budget" integer DEFAULT 8;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_time_slots" text DEFAULT '["morning", "afternoon", "night"]';