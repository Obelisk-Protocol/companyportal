-- Add signature fields to contracts table for DocuSign-style signature placement
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "signature_fields" jsonb;
--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "client_signature" jsonb;
--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "employee_signature" jsonb;
--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "company_signature" jsonb;
