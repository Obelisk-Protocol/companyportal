import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const me = new Hono();

// Apply auth middleware to all routes
me.use('*', authMiddleware);

// Profile update schema
const profileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankAccountName: z.string().optional().nullable(),
  ktpUrl: z.string().optional().nullable(),
});

// Password change schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// GET /me - Get current user profile
me.get('/', async (c) => {
  const user = c.get('user');
  
  // Get user data
  const [userData] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.userId))
    .limit(1);
  
  if (!userData) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  // Get employee data if linked
  let employeeData = null;
  if (userData.employeeId) {
    const [emp] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, userData.employeeId))
      .limit(1);
    employeeData = emp;
  }
  
  return c.json({
    user: {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      isActive: userData.isActive,
      lastLogin: userData.lastLogin,
      createdAt: userData.createdAt,
    },
    employee: employeeData,
  });
});

// PUT /me - Update current user's employee profile
me.put('/', zValidator('json', profileSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');
  
  if (!user.employeeId) {
    return c.json({ error: 'No employee profile linked to this account' }, 400);
  }
  
  const [updated] = await db
    .update(schema.employees)
    .set({
      fullName: data.fullName,
      phone: data.phone,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      bankAccountName: data.bankAccountName,
      ktpUrl: data.ktpUrl,
      updatedAt: new Date(),
    })
    .where(eq(schema.employees.id, user.employeeId))
    .returning();
  
  if (!updated) {
    return c.json({ error: 'Employee not found' }, 404);
  }
  
  return c.json(updated);
});

// PUT /me/password - Change password
me.put('/password', zValidator('json', passwordSchema), async (c) => {
  const user = c.get('user');
  const { currentPassword, newPassword } = c.req.valid('json');
  
  // Get current user
  const [userData] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.userId))
    .limit(1);
  
  if (!userData) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, userData.passwordHash);
  if (!isValidPassword) {
    return c.json({ error: 'Current password is incorrect' }, 401);
  }
  
  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);
  
  // Update password
  await db
    .update(schema.users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, user.userId));
  
  return c.json({ message: 'Password updated successfully' });
});

export default me;
