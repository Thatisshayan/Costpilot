CREATE TABLE "import_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" integer,
	"file_name" text NOT NULL,
	"row_count" integer NOT NULL,
	"inserted_count" integer NOT NULL,
	"skipped_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"undone_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "import_batch_id" integer;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batches_workspace_idx" ON "import_batches" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "import_batches_user_idx" ON "import_batches" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_import_batch_idx" ON "expenses" USING btree ("import_batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_workspace_external_unique" ON "expenses" USING btree ("workspace_id","source","external_id") WHERE "expenses"."workspace_id" IS NOT NULL AND "expenses"."external_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_personal_external_unique" ON "expenses" USING btree ("user_id","source","external_id") WHERE "expenses"."workspace_id" IS NULL AND "expenses"."external_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_source_known" CHECK ("expenses"."source" IN ('manual', 'import'));