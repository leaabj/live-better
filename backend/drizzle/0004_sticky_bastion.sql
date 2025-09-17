ALTER TABLE "plans" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "validations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "plans" CASCADE;--> statement-breakpoint
DROP TABLE "validations" CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_plan_id_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "ai_generated" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "ai_validated" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "ai_validation_response" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "validation_timestamp" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "plan_id";