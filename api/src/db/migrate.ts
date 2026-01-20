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
  
  if (!tableCheck.rows[0]?.exists) {
    console.log('⚠️  Contracts table does not exist, running full migrations...');
    try {
      const db = drizzle(pool);
      await migrate(db, { migrationsFolder: './drizzle' });
      console.log('✅ Drizzle migrations complete!');
    } catch (err) {
      console.error('❌ Drizzle migrator failed:', err);
      throw err;
    }
  } else {
    console.log('✅ Contracts table exists, checking for missing columns...');
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
