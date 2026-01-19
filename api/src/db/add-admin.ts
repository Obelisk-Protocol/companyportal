import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import * as schema from './schema.js';
import { hashPassword } from '../utils/auth.js';

const { Pool } = pg;

async function addAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });

  const EMAIL = 'architect@obeliskprotocol.io';
  const PASSWORD = '12212332';

  console.log('🔧 Adding admin user...');

  try {
    // Check if user already exists
    const existingUser = await db.select().from(schema.users)
      .where(eq(schema.users.email, EMAIL))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log('⚠️  User already exists! Updating password...');
      const passwordHash = await hashPassword(PASSWORD);
      await db.update(schema.users)
        .set({ passwordHash })
        .where(eq(schema.users.email, EMAIL));
      console.log('✅ Password updated');
    } else {
      // Check if employee exists
      let employee = await db.select().from(schema.employees)
        .where(eq(schema.employees.email, EMAIL))
        .limit(1);
      
      if (employee.length === 0) {
        // Create employee with unique number
        const timestamp = Date.now().toString().slice(-6);
        [employee[0]] = await db.insert(schema.employees).values({
          employeeNumber: `ARCH${timestamp}`,
          fullName: 'Architect',
          email: EMAIL,
          nik: '0000000000000002',
          ptkpStatus: 'TK/0',
          joinDate: new Date().toISOString().split('T')[0],
          department: 'Management',
          position: 'Administrator',
          status: 'active',
        }).returning();
        console.log('✅ Employee created');
      } else {
        console.log('✅ Employee already exists');
      }

      // Create user
      const passwordHash = await hashPassword(PASSWORD);
      await db.insert(schema.users).values({
        email: EMAIL,
        passwordHash,
        role: 'admin',
        employeeId: employee[0].id,
        isActive: true,
      });
      console.log('✅ User created');
    }
    
    console.log('');
    console.log(`   Email: ${EMAIL}`);
    console.log(`   Password: ${PASSWORD}`);
    console.log('');
    console.log('🎉 Done! You can now log in.');

  } catch (error) {
    console.error('Error:', error);
  }

  await pool.end();
}

addAdmin();
