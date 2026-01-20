import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { 
  hashPassword, 
  verifyPassword, 
  generateAccessToken, 
  generateRefreshToken,
  generateInvitationToken,
  getInvitationExpiry
} from '../utils/auth.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const auth = new Hono();

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Register from invitation schema
const registerSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  // Employee details (optional for accountants and clients)
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  nik: z.string().length(16).optional(),
  npwp: z.string().optional(),
  ptkpStatus: z.enum(['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3', 'K/I/0', 'K/I/1', 'K/I/2', 'K/I/3']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  ktpUrl: z.string().optional(),
});

// POST /auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  
  // Find user
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  
  if (!user || !user.isActive) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  
  // Verify password
  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  
  // Generate tokens
  const accessToken = await generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role as 'admin' | 'hr' | 'employee' | 'accountant' | 'client',
    employeeId: user.employeeId || undefined,
    companyId: user.companyId || undefined,
    individualClientId: user.individualClientId || undefined,
  });
  
  const { token: refreshToken, expiresAt } = await generateRefreshToken();
  
  // Save refresh token
  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt,
  });
  
  // Update last login
  await db
    .update(schema.users)
    .set({ lastLogin: new Date() })
    .where(eq(schema.users.id, user.id));
  
  return c.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      companyId: user.companyId,
      individualClientId: user.individualClientId,
    },
  });
});

// POST /auth/refresh
auth.post('/refresh', async (c) => {
  const body = await c.req.json();
  const { refreshToken } = body;
  
  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400);
  }
  
  // Find refresh token
  const [tokenRecord] = await db
    .select()
    .from(schema.refreshTokens)
    .where(eq(schema.refreshTokens.token, refreshToken))
    .limit(1);
  
  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }
  
  // Get user
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, tokenRecord.userId))
    .limit(1);
  
  if (!user || !user.isActive) {
    return c.json({ error: 'User not found or inactive' }, 401);
  }
  
  // Generate new access token
  const accessToken = await generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role as 'admin' | 'hr' | 'employee' | 'accountant' | 'client',
    employeeId: user.employeeId || undefined,
    companyId: user.companyId || undefined,
    individualClientId: user.individualClientId || undefined,
  });
  
  // Optionally rotate refresh token
  const { token: newRefreshToken, expiresAt } = await generateRefreshToken();
  
  await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.id, tokenRecord.id));
  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    token: newRefreshToken,
    expiresAt,
  });
  
  return c.json({
    accessToken,
    refreshToken: newRefreshToken,
  });
});

// POST /auth/logout
auth.post('/logout', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { refreshToken } = body;
  
  if (refreshToken) {
    await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.token, refreshToken));
  }
  
  return c.json({ message: 'Logged out successfully' });
});

// GET /auth/me - Get current user
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  
  // Get full user data including employee info
  const [userData] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.userId))
    .limit(1);
  
  if (!userData) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  let employee = null;
  if (userData.employeeId) {
    const [emp] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, userData.employeeId))
      .limit(1);
    employee = emp;
  }
  
  return c.json({
    id: userData.id,
    email: userData.email,
    role: userData.role,
    employeeId: userData.employeeId || undefined,
    employee: employee || undefined,
  });
});

// GET /auth/invitation/:token - Validate invitation token
auth.get('/invitation/:token', async (c) => {
  const { token } = c.req.param();
  
  const [invitation] = await db
    .select()
    .from(schema.invitations)
    .where(
      and(
        eq(schema.invitations.token, token),
        eq(schema.invitations.status, 'pending')
      )
    )
    .limit(1);
  
  if (!invitation) {
    return c.json({ error: 'Invalid invitation' }, 404);
  }
  
  if (invitation.expiresAt < new Date()) {
    await db
      .update(schema.invitations)
      .set({ status: 'expired' })
      .where(eq(schema.invitations.id, invitation.id));
    return c.json({ error: 'Invitation expired' }, 410);
  }
  
  return c.json({
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
  });
});

// POST /auth/register - Register from invitation
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const data = c.req.valid('json');
  
  // Find invitation
  const [invitation] = await db
    .select()
    .from(schema.invitations)
    .where(
      and(
        eq(schema.invitations.token, data.token),
        eq(schema.invitations.status, 'pending')
      )
    )
    .limit(1);
  
  if (!invitation) {
    return c.json({ error: 'Invalid invitation' }, 404);
  }
  
  if (invitation.expiresAt < new Date()) {
    return c.json({ error: 'Invitation expired' }, 410);
  }
  
  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, invitation.email))
    .limit(1);
  
  if (existingUser) {
    return c.json({ error: 'User already exists' }, 409);
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // For accountants and clients, skip employee creation
  let employeeId: string | null = null;
  let companyId: string | null = null;
  let individualClientId: string | null = null;
  
  if (invitation.role === 'client') {
    // Link to CRM client - no employee creation needed
    companyId = invitation.companyId || null;
    individualClientId = invitation.individualClientId || null;
  } else if (invitation.role !== 'accountant') {
    // Validate required fields for employees
    if (!data.fullName) {
      return c.json({ error: 'Full name is required' }, 400);
    }
    if (!data.nik || data.nik.length !== 16) {
      return c.json({ error: 'NIK is required and must be 16 digits' }, 400);
    }

    // Generate employee number - find the highest number and increment
    const allEmployees = await db
      .select({ employeeNumber: schema.employees.employeeNumber })
      .from(schema.employees);
    
    let maxNumber = 0;
    for (const emp of allEmployees) {
      const match = emp.employeeNumber.match(/^EMP(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    const employeeNumber = `EMP${String(maxNumber + 1).padStart(4, '0')}`;

    // Create employee
    const [employee] = await db
      .insert(schema.employees)
      .values({
        employeeNumber,
        fullName: data.fullName,
        email: invitation.email,
        phone: data.phone,
        nik: data.nik!,
        npwp: data.npwp,
        ptkpStatus: data.ptkpStatus || 'TK/0',
        address: data.address,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountName: data.bankAccountName,
        ktpUrl: data.ktpUrl,
        joinDate: new Date().toISOString().split('T')[0],
        status: 'active',
      })
      .returning();

    employeeId = employee.id;
  }

  // Create user
  const [user] = await db
    .insert(schema.users)
    .values({
      email: invitation.email,
      passwordHash,
      role: invitation.role,
      employeeId,
      companyId,
      individualClientId,
      isActive: true,
    })
    .returning();
  
  // Update invitation
  await db
    .update(schema.invitations)
    .set({
      status: 'accepted',
      acceptedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(schema.invitations.id, invitation.id));
  
  // Generate tokens
  const accessToken = await generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role as 'admin' | 'hr' | 'employee' | 'accountant' | 'client',
    employeeId: employeeId || undefined,
  });
  
  const { token: refreshToken, expiresAt } = await generateRefreshToken();
  
  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt,
  });
  
  return c.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: employeeId || null,
      companyId: companyId || null,
      individualClientId: individualClientId || null,
    },
  }, 201);
});

export default auth;
