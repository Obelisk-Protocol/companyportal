import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  console.log('🔧 Running database migrations...');
  
  // Check if contracts table exists first
  const tableCheck = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'contracts'
    );
  `);
  
  const db = drizzle(pool);
  if (!tableCheck.rows[0]?.exists) {
    console.log('⚠️  Contracts table does not exist, running full migrations...');
    try {
      await migrate(db, { migrationsFolder: './drizzle' });
      console.log('✅ Drizzle migrations complete!');
    } catch (err) {
      console.error('❌ Drizzle migrator failed:', err);
      throw err;
    }
  } else {
    console.log('✅ Contracts table exists.');
    // Apply only grants tables if missing (avoid re-running full migrator which would recreate existing tables)
    const grantsCheck = await pool.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'grants');
    `);
    if (!grantsCheck.rows[0]?.exists) {
      console.log('📋 Grants table missing, applying grants migration...');
      const grantsStatements = [
        `CREATE TABLE IF NOT EXISTS "grants" (
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
        )`,
        `CREATE INDEX IF NOT EXISTS "idx_grants_status" ON "grants" ("status")`,
        `CREATE INDEX IF NOT EXISTS "idx_grants_created_by" ON "grants" ("created_by")`,
        `CREATE TABLE IF NOT EXISTS "grant_wallets" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "grant_id" uuid NOT NULL REFERENCES "grants"("id") ON DELETE CASCADE,
          "wallet_address" text NOT NULL,
          "label" text,
          "created_at" timestamp with time zone DEFAULT now(),
          "updated_at" timestamp with time zone DEFAULT now()
        )`,
        `CREATE INDEX IF NOT EXISTS "idx_grant_wallets_grant" ON "grant_wallets" ("grant_id")`,
        `CREATE TABLE IF NOT EXISTS "wallet_audits" (
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
        )`,
        `CREATE INDEX IF NOT EXISTS "idx_wallet_audits_grant" ON "wallet_audits" ("grant_id")`,
        `CREATE INDEX IF NOT EXISTS "idx_wallet_audits_run_at" ON "wallet_audits" ("audit_run_at")`,
        `CREATE TABLE IF NOT EXISTS "grant_deductions" (
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
        )`,
        `CREATE INDEX IF NOT EXISTS "idx_grant_deductions_grant" ON "grant_deductions" ("grant_id")`,
        `CREATE TABLE IF NOT EXISTS "grant_members" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "grant_id" uuid NOT NULL REFERENCES "grants"("id") ON DELETE CASCADE,
          "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "role" text NOT NULL,
          "created_at" timestamp with time zone DEFAULT now()
        )`,
        `CREATE INDEX IF NOT EXISTS "idx_grant_members_grant" ON "grant_members" ("grant_id")`,
        `CREATE INDEX IF NOT EXISTS "idx_grant_members_user" ON "grant_members" ("user_id")`,
      ];
      for (const sql of grantsStatements) {
        await pool.query(sql);
      }
      console.log('✅ Grants tables created.');
    } else {
      console.log('✓ Grants table already exists.');
    }
  }
  
  // Always ensure signature fields exist (manual migration)
  try {
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contracts' 
      AND column_name IN ('signature_fields', 'client_signature', 'employee_signature', 'company_signature')
    `);
    
    const existingColumns = checkResult.rows.map((r: any) => r.column_name);
    console.log(`📋 Existing signature columns: ${existingColumns.length > 0 ? existingColumns.join(', ') : 'none'}`);
    
    const neededColumns = [
      { name: 'signature_fields', sql: 'ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "signature_fields" jsonb;' },
      { name: 'client_signature', sql: 'ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "client_signature" jsonb;' },
      { name: 'employee_signature', sql: 'ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "employee_signature" jsonb;' },
      { name: 'company_signature', sql: 'ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "company_signature" jsonb;' },
    ];
    
    for (const col of neededColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`📝 Adding missing column: ${col.name}...`);
        await pool.query(col.sql);
        console.log(`✅ Added ${col.name}`);
      } else {
        console.log(`✓ ${col.name} already exists`);
      }
    }
  } catch (err) {
    // If columns already exist, that's fine
    if (err instanceof Error && (err.message.includes('already exists') || err.message.includes('duplicate'))) {
      console.log('⚠️  Columns may already exist, continuing...');
    } else {
      console.error('❌ Manual migration failed:', err);
      throw err;
    }
  }
  
  console.log('✅ All migrations complete!');
  
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
