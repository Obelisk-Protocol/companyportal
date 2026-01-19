import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import { hashPassword } from '../utils/auth.js';

const { Pool } = pg;

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle(pool, { schema });

  console.log('🌱 Starting seed...');

  // Check if company exists
  const existingCompany = await db.select().from(schema.companies).limit(1);
  
  if (existingCompany.length === 0) {
    console.log('Creating company...');
    await db.insert(schema.companies).values({
      name: 'PT Example Indonesia',
      npwp: '00.000.000.0-000.000',
      address: 'Jl. Sudirman No. 1',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '10110',
      phone: '+62 21 1234567',
      email: 'admin@example.com',
      jkkRiskLevel: '0.24',
    });
    console.log('✅ Company created');
  }

  // Check if admin user exists
  const existingAdmin = await db.select().from(schema.users).limit(1);
  
  if (existingAdmin.length === 0) {
    console.log('Creating admin user...');
    
    // Create admin employee first
    const [adminEmployee] = await db.insert(schema.employees).values({
      employeeNumber: 'EMP0001',
      fullName: 'System Administrator',
      email: 'admin@example.com',
      nik: '0000000000000000',
      ptkpStatus: 'TK/0',
      joinDate: new Date().toISOString().split('T')[0],
      department: 'Management',
      position: 'Administrator',
      status: 'active',
    }).returning();
    
    // Create admin user
    const passwordHash = await hashPassword('admin123'); // Change this!
    
    await db.insert(schema.users).values({
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
      employeeId: adminEmployee.id,
      isActive: true,
    });
    
    console.log('✅ Admin user created');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('   ⚠️  Please change the password after first login!');
  }

  console.log('🌱 Seed complete!');
  
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
