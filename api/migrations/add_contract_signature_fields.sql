-- Migration: Add signature fields to contracts table
-- Run this migration to add the new signature-related columns

-- Add signature fields columns
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS signature_fields JSONB,
ADD COLUMN IF NOT EXISTS client_signature JSONB,
ADD COLUMN IF NOT EXISTS employee_signature JSONB,
ADD COLUMN IF NOT EXISTS company_signature JSONB;

-- Note: The old 'signature' column (if it exists) can be removed or left for backwards compatibility
-- ALTER TABLE contracts DROP COLUMN IF EXISTS signature;
