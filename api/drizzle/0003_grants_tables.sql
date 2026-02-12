-- Grants (transparency for Superteam / grantors)
CREATE TABLE IF NOT EXISTS "grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "currency" text DEFAULT 'SOL',
  "expected_amount" numeric(20, 9),
  "start_date" date,
  "end_date" date,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_grants_status" ON "grants" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_grants_created_by" ON "grants" ("created_by");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grant_wallets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "grant_id" uuid NOT NULL REFERENCES "grants"("id") ON DELETE CASCADE,
  "wallet_address" text NOT NULL,
  "label" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_grant_wallets_grant" ON "grant_wallets" ("grant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_audits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "grant_id" uuid NOT NULL REFERENCES "grants"("id") ON DELETE CASCADE,
  "wallet_address" text NOT NULL,
  "audit_run_at" timestamp with time zone NOT NULL,
  "total_inbound" numeric(20, 9) DEFAULT '0',
  "total_outbound" numeric(20, 9) DEFAULT '0',
  "balance_at_audit" numeric(20, 9),
  "transaction_count" integer DEFAULT 0,
  "raw_data" jsonb,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_audits_grant" ON "wallet_audits" ("grant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_audits_run_at" ON "wallet_audits" ("audit_run_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grant_deductions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "grant_id" uuid NOT NULL REFERENCES "grants"("id") ON DELETE CASCADE,
  "amount" numeric(20, 9) NOT NULL,
  "currency" text DEFAULT 'SOL',
  "category" text NOT NULL,
  "description" text,
  "deducted_at" date NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_grant_deductions_grant" ON "grant_deductions" ("grant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grant_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "grant_id" uuid NOT NULL REFERENCES "grants"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_grant_members_grant" ON "grant_members" ("grant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_grant_members_user" ON "grant_members" ("user_id");
