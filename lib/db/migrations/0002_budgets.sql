CREATE TABLE "budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" integer,
	"project_id" integer,
	"name" text NOT NULL,
	"period" text DEFAULT 'monthly' NOT NULL,
	"currency" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"thresholds" smallint[] DEFAULT '{50,80,100}'::smallint[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_amount_positive" CHECK ("budgets"."amount" > 0),
	CONSTRAINT "budgets_currency_iso" CHECK ("budgets"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "budgets_period_monthly" CHECK ("budgets"."period" = 'monthly'),
	CONSTRAINT "budgets_name_length" CHECK (char_length("budgets"."name") BETWEEN 1 AND 80),
	CONSTRAINT "budgets_thresholds_count" CHECK (cardinality("budgets"."thresholds") BETWEEN 1 AND 5)
);
--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_workspace_unique" ON "budgets" USING btree ("workspace_id",coalesce("project_id", 0),"currency") WHERE "budgets"."workspace_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_personal_unique" ON "budgets" USING btree ("user_id",coalesce("project_id", 0),"currency") WHERE "budgets"."workspace_id" IS NULL;--> statement-breakpoint
CREATE INDEX "budgets_project_idx" ON "budgets" USING btree ("project_id");