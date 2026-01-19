import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const company = new Hono();

// Apply auth middleware to all routes
company.use('*', authMiddleware);

// Company settings schema
const companySchema = z.object({
  name: z.string().min(2),
  npwp: z.string().min(10),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  logoUrl: z.string().url().optional(),
  jkkRiskLevel: z.number().min(0.24).max(1.74).optional(),
});

// GET /company - Get company settings
company.get('/', async (c) => {
  const [companyData] = await db.select().from(schema.companies).limit(1);
  
  if (!companyData) {
    return c.json({ error: 'Company not configured' }, 404);
  }
  
  return c.json(companyData);
});

// PUT /company - Update company settings
company.put('/', requireRole('admin'), zValidator('json', companySchema.partial()), async (c) => {
  const data = c.req.valid('json');
  
  // Check if company exists
  const [existing] = await db.select().from(schema.companies).limit(1);
  
  if (!existing) {
    // Create new company
    const [newCompany] = await db
      .insert(schema.companies)
      .values({
        name: data.name || 'My Company',
        npwp: data.npwp || '00.000.000.0-000.000',
        address: data.address,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        phone: data.phone,
        email: data.email,
        logoUrl: data.logoUrl,
        jkkRiskLevel: data.jkkRiskLevel ? String(data.jkkRiskLevel) : '0.24',
      })
      .returning();
    
    return c.json(newCompany, 201);
  }
  
  // Update existing
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name) updateData.name = data.name;
  if (data.npwp) updateData.npwp = data.npwp;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.province !== undefined) updateData.province = data.province;
  if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
  if (data.jkkRiskLevel !== undefined) updateData.jkkRiskLevel = String(data.jkkRiskLevel);
  
  const [updated] = await db
    .update(schema.companies)
    .set(updateData)
    .where(eq(schema.companies.id, existing.id))
    .returning();
  
  return c.json(updated);
});

// POST /company/setup - Initial company setup (public, one-time)
company.post('/setup', async (c) => {
  // Check if already configured
  const [existing] = await db.select().from(schema.companies).limit(1);
  
  if (existing) {
    return c.json({ error: 'Company already configured' }, 409);
  }
  
  const body = await c.req.json();
  
  const [newCompany] = await db
    .insert(schema.companies)
    .values({
      name: body.name || 'My Company',
      npwp: body.npwp || '00.000.000.0-000.000',
      address: body.address,
      city: body.city,
      province: body.province,
      postalCode: body.postalCode,
      phone: body.phone,
      email: body.email,
      jkkRiskLevel: '0.24',
    })
    .returning();
  
  return c.json(newCompany, 201);
});

export default company;
