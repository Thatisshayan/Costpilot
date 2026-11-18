CREATE TABLE "provider_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform_id" integer NOT NULL,
	"metric" text NOT NULL,
	"value" numeric(18, 6) NOT NULL,
	"taken_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_source_known";--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "provider_config" jsonb;--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "last_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "last_sync_status" text;--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "last_sync_error" text;--> statement-breakpoint
ALTER TABLE "provider_snapshots" ADD CONSTRAINT "provider_snapshots_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "provider_snapshots_platform_metric_idx" ON "provider_snapshots" USING btree ("platform_id","metric","taken_at");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_source_known" CHECK ("expenses"."source" IN ('manual', 'import', 'sync'));