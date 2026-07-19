CREATE TABLE "audit_deltas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"audit_a_id" uuid NOT NULL,
	"audit_b_id" uuid NOT NULL,
	"score_change" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "stripe_subscription_item_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "plan" text DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "monthly_quota" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "white_label_config" jsonb;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "usage" ADD COLUMN "audit_id" uuid;--> statement-breakpoint
ALTER TABLE "usage" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "audit_deltas" ADD CONSTRAINT "audit_deltas_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_deltas" ADD CONSTRAINT "audit_deltas_audit_a_id_audits_id_fk" FOREIGN KEY ("audit_a_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_deltas" ADD CONSTRAINT "audit_deltas_audit_b_id_audits_id_fk" FOREIGN KEY ("audit_b_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_delta_site_idx" ON "audit_deltas" USING btree ("site_id");--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_client_idx" ON "audits" USING btree ("client_id");