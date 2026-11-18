ALTER TABLE "expenses" DROP CONSTRAINT "expenses_source_known";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_platform_id_platforms_id_fk";
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "platform_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_anchor_day" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "auto_record" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "last_recorded_date" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_workspace_idx" ON "subscriptions" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_source_known" CHECK ("expenses"."source" IN ('manual', 'import', 'sync', 'subscription'));--> statement-breakpoint
-- Normalize free-form values from the earlier, unvalidated subscriptions route before the checks.
UPDATE "subscriptions" SET "plan_type" = 'monthly' WHERE "plan_type" NOT IN ('weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
UPDATE "subscriptions" SET "status" = CASE WHEN "status" IN ('expired', 'canceled', 'inactive') THEN 'cancelled' ELSE 'active' END WHERE "status" NOT IN ('active', 'trial', 'paused', 'cancelled');--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_cycle_known" CHECK ("subscriptions"."plan_type" IN ('weekly', 'monthly', 'quarterly', 'yearly'));--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_status_known" CHECK ("subscriptions"."status" IN ('active', 'trial', 'paused', 'cancelled'));