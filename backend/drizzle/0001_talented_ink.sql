ALTER TABLE "tasks" ADD COLUMN "photo_validation_attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "photo_validation_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "photo_last_upload_at" timestamp;