import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, or, like } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { generateInvitationToken, getInvitationExpiry } from '../utils/auth.js';
import { sendInvitationEmail } from '../utils/email.js';

const crm = new Hono();

// Apply auth middleware to all routes
crm.use('*', authMiddleware);

// Company schema
const companySchema = z.object({
  name: z.string().min(2),
  legalName: z.string().optional(),
  companyType: z.enum(['PT', 'CV', 'Firma', 'UD', 'Other']).optional(),
  npwp: z.string().optional(),
  nib: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().optional(),
  size: z.number().int().min(0).optional(),
  solanaWallet: z.string().optional(), // Solana wallet address
  status: z.enum(['active', 'inactive', 'prospect', 'lead']).default('active'),
  registrationDate: z.string().optional(),
});

// Individual client schema
const individualClientSchema = z.object({
  fullName: z.string().min(2),
  nik: z.string().length(16).optional().or(z.literal('')),
  npwp: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  dateOfBirth: z.string().optional(),
  occupation: z.string().optional(),
  solanaWallet: z.string().optional(), // Solana wallet address
  status: z.enum(['active', 'inactive', 'prospect']).default('active'),
});

// Company contact schema
const companyContactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  position: z.string().optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
});

// ==================== COMPANIES ====================

// GET /crm/clients/companies - List all companies
crm.get('/clients/companies', requireRole('admin', 'hr', 'accountant'), async (c) => {
  const status = c.req.query('status');
  const search = c.req.query('search');
  
  let query = db.select().from(schema.crmCompanies).orderBy(desc(schema.crmCompanies.createdAt));
  
  // Apply filters if provided
  const conditions: any[] = [];
  if (status) {
    conditions.push(eq(schema.crmCompanies.status, status as any));
  }
  if (search) {
    conditions.push(
      or(
        like(schema.crmCompanies.name, `%${search}%`),
        like(schema.crmCompanies.legalName || '', `%${search}%`),
        like(schema.crmCompanies.email || '', `%${search}%`)
      )!
    );
  }
  
  if (conditions.length > 0) {
    const companies = await db
      .select()
      .from(schema.crmCompanies)
      .where(conditions.length === 1 ? conditions[0] : or(...conditions)!)
      .orderBy(desc(schema.crmCompanies.createdAt));
    return c.json(companies);
  }
  
  const companies = await query;
  return c.json(companies);
});

// GET /crm/clients/companies/:id - Get company details
crm.get('/clients/companies/:id', requireRole('admin', 'hr', 'accountant'), async (c) => {
  const { id } = c.req.param();
  
  const [company] = await db
    .select()
    .from(schema.crmCompanies)
    .where(eq(schema.crmCompanies.id, id))
    .limit(1);
  
  if (!company) {
    return c.json({ error: 'Company not found' }, 404);
  }
  
  // Get company contacts
  const contacts = await db
    .select()
    .from(schema.companyContacts)
    .where(eq(schema.companyContacts.companyId, id))
    .orderBy(desc(schema.companyContacts.isPrimary), desc(schema.companyContacts.createdAt));
  
  return c.json({ ...company, contacts });
});

// POST /crm/clients/companies - Create new company
crm.post('/clients/companies', requireRole('admin', 'hr'), zValidator('json', companySchema), async (c) => {
  const data = c.req.valid('json');
  
  // Check for duplicate email if provided
  if (data.email) {
    const [existing] = await db
      .select()
      .from(schema.crmCompanies)
      .where(eq(schema.crmCompanies.email, data.email))
      .limit(1);
    
    if (existing) {
      return c.json({ error: 'Company with this email already exists' }, 409);
    }
  }
  
  const [company] = await db
    .insert(schema.crmCompanies)
    .values({
      name: data.name,
      legalName: data.legalName,
      companyType: data.companyType,
      npwp: data.npwp,
      nib: data.nib,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      phone: data.phone,
      email: data.email || null,
      website: data.website || null,
      industry: data.industry,
      size: data.size,
      solanaWallet: data.solanaWallet || null,
      status: data.status,
      registrationDate: data.registrationDate || null,
    })
    .returning();
  
  return c.json(company, 201);
});

// PUT /crm/clients/companies/:id - Update company
crm.put('/clients/companies/:id', requireRole('admin', 'hr'), zValidator('json', companySchema.partial()), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  
  const [company] = await db
    .update(schema.crmCompanies)
    .set({
      ...data,
      email: data.email || null,
      website: data.website || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.crmCompanies.id, id))
    .returning();
  
  if (!company) {
    return c.json({ error: 'Company not found' }, 404);
  }
  
  return c.json(company);
});

// DELETE /crm/clients/companies/:id - Soft delete company
crm.delete('/clients/companies/:id', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  
  const [company] = await db
    .update(schema.crmCompanies)
    .set({
      status: 'inactive',
      updatedAt: new Date(),
    })
    .where(eq(schema.crmCompanies.id, id))
    .returning();
  
  if (!company) {
    return c.json({ error: 'Company not found' }, 404);
  }
  
  return c.json({ message: 'Company deactivated', company });
});

// ==================== INDIVIDUAL CLIENTS ====================

// GET /crm/clients/individuals - List all individual clients
crm.get('/clients/individuals', requireRole('admin', 'hr', 'accountant'), async (c) => {
  const status = c.req.query('status');
  const search = c.req.query('search');
  
  let conditions: any[] = [];
  if (status) {
    conditions.push(eq(schema.individualClients.status, status as any));
  }
  if (search) {
    conditions.push(
      or(
        like(schema.individualClients.fullName, `%${search}%`),
        like(schema.individualClients.email || '', `%${search}%`),
        like(schema.individualClients.nik || '', `%${search}%`)
      )!
    );
  }
  
  const clients = await db
    .select()
    .from(schema.individualClients)
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : or(...conditions)!) : undefined)
    .orderBy(desc(schema.individualClients.createdAt));
  
  return c.json(clients);
});

// GET /crm/clients/individuals/:id - Get individual client details
crm.get('/clients/individuals/:id', requireRole('admin', 'hr', 'accountant'), async (c) => {
  const { id } = c.req.param();
  
  const [client] = await db
    .select()
    .from(schema.individualClients)
    .where(eq(schema.individualClients.id, id))
    .limit(1);
  
  if (!client) {
    return c.json({ error: 'Client not found' }, 404);
  }
  
  return c.json(client);
});

// POST /crm/clients/individuals - Create new individual client
crm.post('/clients/individuals', requireRole('admin', 'hr'), zValidator('json', individualClientSchema), async (c) => {
  const data = c.req.valid('json');
  
  // Check for duplicate email if provided
  if (data.email) {
    const [existing] = await db
      .select()
      .from(schema.individualClients)
      .where(eq(schema.individualClients.email, data.email))
      .limit(1);
    
    if (existing) {
      return c.json({ error: 'Client with this email already exists' }, 409);
    }
  }
  
  // Check for duplicate NIK if provided
  if (data.nik) {
    const [existing] = await db
      .select()
      .from(schema.individualClients)
      .where(eq(schema.individualClients.nik, data.nik))
      .limit(1);
    
    if (existing) {
      return c.json({ error: 'Client with this NIK already exists' }, 409);
    }
  }
  
  const [client] = await db
    .insert(schema.individualClients)
    .values({
      fullName: data.fullName,
      nik: data.nik || null,
      npwp: data.npwp || null,
      email: data.email || null,
      phone: data.phone,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      dateOfBirth: data.dateOfBirth || null,
      occupation: data.occupation,
      solanaWallet: data.solanaWallet || null,
      status: data.status,
    })
    .returning();
  
  return c.json(client, 201);
});

// PUT /crm/clients/individuals/:id - Update individual client
crm.put('/clients/individuals/:id', requireRole('admin', 'hr'), zValidator('json', individualClientSchema.partial()), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  
  const [client] = await db
    .update(schema.individualClients)
    .set({
      ...data,
      email: data.email || null,
      nik: data.nik || null,
      npwp: data.npwp || null,
      solanaWallet: data.solanaWallet !== undefined ? (data.solanaWallet || null) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(schema.individualClients.id, id))
    .returning();
  
  if (!client) {
    return c.json({ error: 'Client not found' }, 404);
  }
  
  return c.json(client);
});

// DELETE /crm/clients/individuals/:id - Soft delete individual client
crm.delete('/clients/individuals/:id', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  
  const [client] = await db
    .update(schema.individualClients)
    .set({
      status: 'inactive',
      updatedAt: new Date(),
    })
    .where(eq(schema.individualClients.id, id))
    .returning();
  
  if (!client) {
    return c.json({ error: 'Client not found' }, 404);
  }
  
  return c.json({ message: 'Client deactivated', client });
});

// ==================== COMPANY CONTACTS ====================

// GET /crm/companies/:id/contacts - Get company contacts
crm.get('/companies/:id/contacts', requireRole('admin', 'hr', 'accountant'), async (c) => {
  const { id } = c.req.param();
  
  const contacts = await db
    .select()
    .from(schema.companyContacts)
    .where(eq(schema.companyContacts.companyId, id))
    .orderBy(desc(schema.companyContacts.isPrimary), desc(schema.companyContacts.createdAt));
  
  return c.json(contacts);
});

// POST /crm/companies/:id/contacts - Add contact to company
crm.post('/companies/:id/contacts', requireRole('admin', 'hr'), zValidator('json', companyContactSchema), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  
  // Verify company exists
  const [company] = await db
    .select()
    .from(schema.crmCompanies)
    .where(eq(schema.crmCompanies.id, id))
    .limit(1);
  
  if (!company) {
    return c.json({ error: 'Company not found' }, 404);
  }
  
  // If setting as primary, unset other primary contacts
  if (data.isPrimary) {
    await db
      .update(schema.companyContacts)
      .set({ isPrimary: false })
      .where(eq(schema.companyContacts.companyId, id));
  }
  
  const [contact] = await db
    .insert(schema.companyContacts)
    .values({
      companyId: id,
      name: data.name,
      email: data.email || null,
      phone: data.phone,
      position: data.position,
      isPrimary: data.isPrimary,
      notes: data.notes,
    })
    .returning();
  
  return c.json(contact, 201);
});

// PUT /crm/contacts/:id - Update contact
crm.put('/contacts/:id', requireRole('admin', 'hr'), zValidator('json', companyContactSchema.partial()), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  
  // Get contact to find company
  const [existing] = await db
    .select()
    .from(schema.companyContacts)
    .where(eq(schema.companyContacts.id, id))
    .limit(1);
  
  if (!existing) {
    return c.json({ error: 'Contact not found' }, 404);
  }
  
  // If setting as primary, unset other primary contacts
  if (data.isPrimary) {
    await db
      .update(schema.companyContacts)
      .set({ isPrimary: false })
      .where(eq(schema.companyContacts.companyId, existing.companyId));
  }
  
  const [contact] = await db
    .update(schema.companyContacts)
    .set({
      ...data,
      email: data.email || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.companyContacts.id, id))
    .returning();
  
  return c.json(contact);
});

// DELETE /crm/contacts/:id - Delete contact
crm.delete('/contacts/:id', requireRole('admin', 'hr'), async (c) => {
  const { id } = c.req.param();
  
  await db.delete(schema.companyContacts).where(eq(schema.companyContacts.id, id));
  
  return c.json({ message: 'Contact deleted' });
});

// ==================== UNIFIED CLIENT LIST ====================

// GET /crm/clients - Get all clients (companies + individuals)
crm.get('/clients', requireRole('admin', 'hr', 'accountant'), async (c) => {
  const status = c.req.query('status');
  const search = c.req.query('search');
  const type = c.req.query('type'); // 'company' or 'individual'
  
  const results: any[] = [];
  
  // Get companies
  if (!type || type === 'company') {
    let companyConditions: any[] = [];
    if (status) {
      companyConditions.push(eq(schema.crmCompanies.status, status as any));
    }
    if (search) {
      companyConditions.push(
        or(
          like(schema.crmCompanies.name, `%${search}%`),
          like(schema.crmCompanies.legalName || '', `%${search}%`),
          like(schema.crmCompanies.email || '', `%${search}%`)
        )!
      );
    }
    
    const companies = await db
      .select()
      .from(schema.crmCompanies)
      .where(companyConditions.length > 0 ? (companyConditions.length === 1 ? companyConditions[0] : or(...companyConditions)!) : undefined)
      .orderBy(desc(schema.crmCompanies.createdAt));
    
    results.push(...companies.map(c => ({ ...c, clientType: 'company' })));
  }
  
  // Get individual clients
  if (!type || type === 'individual') {
    let individualConditions: any[] = [];
    if (status) {
      individualConditions.push(eq(schema.individualClients.status, status as any));
    }
    if (search) {
      individualConditions.push(
        or(
          like(schema.individualClients.fullName, `%${search}%`),
          like(schema.individualClients.email || '', `%${search}%`),
          like(schema.individualClients.nik || '', `%${search}%`)
        )!
      );
    }
    
    const individuals = await db
      .select()
      .from(schema.individualClients)
      .where(individualConditions.length > 0 ? (individualConditions.length === 1 ? individualConditions[0] : or(...individualConditions)!) : undefined)
      .orderBy(desc(schema.individualClients.createdAt));
    
    results.push(...individuals.map(i => ({ ...i, clientType: 'individual' })));
  }
  
  // Sort by created date
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return c.json(results);
});

// ==================== CLIENT INVITATIONS ====================

// POST /crm/clients/companies/:id/invite - Send invitation to company
crm.post('/clients/companies/:id/invite', requireRole('admin', 'hr'), zValidator('json', z.object({
  email: z.string().email(),
  name: z.string().min(2),
})), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const data = c.req.valid('json');
  
  // Verify company exists
  const [company] = await db
    .select()
    .from(schema.crmCompanies)
    .where(eq(schema.crmCompanies.id, id))
    .limit(1);
  
  if (!company) {
    return c.json({ error: 'Company not found' }, 404);
  }
  
  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, data.email))
    .limit(1);
  
  if (existingUser) {
    return c.json({ error: 'User with this email already exists' }, 409);
  }
  
  // Check if pending invitation exists
  const [existingInvitation] = await db
    .select()
    .from(schema.invitations)
    .where(eq(schema.invitations.email, data.email))
    .limit(1);
  
  if (existingInvitation && existingInvitation.status === 'pending') {
    return c.json({ error: 'Pending invitation already exists for this email' }, 409);
  }
  
  // Generate token
  const token = generateInvitationToken();
  const expiresAt = getInvitationExpiry();
  
  const [invitation] = await db
    .insert(schema.invitations)
    .values({
      email: data.email,
      name: data.name,
      role: 'client',
      token,
      status: 'pending',
      companyId: id,
      invitedBy: user.userId,
      expiresAt,
    })
    .returning();
  
  // Get inviter's name for the email
  let inviterName: string | undefined;
  if (user.employeeId) {
    const [employee] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, user.employeeId))
      .limit(1);
    inviterName = employee?.fullName;
  }
  
  // Send invitation email
  const emailResult = await sendInvitationEmail(
    data.email,
    data.name,
    'Client',
    token,
    inviterName
  );
  
  const invitationLink = `${process.env.FRONTEND_URL || 'https://companyportal.pages.dev'}/accept-invitation/${token}`;
  
  return c.json({
    invitation,
    invitationLink,
    emailSent: emailResult.success,
    emailError: emailResult.error,
  }, 201);
});

// POST /crm/clients/individuals/:id/invite - Send invitation to individual client
crm.post('/clients/individuals/:id/invite', requireRole('admin', 'hr'), zValidator('json', z.object({
  email: z.string().email().optional(),
})), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const data = c.req.valid('json');
  
  // Get individual client
  const [client] = await db
    .select()
    .from(schema.individualClients)
    .where(eq(schema.individualClients.id, id))
    .limit(1);
  
  if (!client) {
    return c.json({ error: 'Client not found' }, 404);
  }
  
  // Use provided email or client's email
  const email = data.email || client.email;
  if (!email) {
    return c.json({ error: 'Email is required' }, 400);
  }
  
  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  
  if (existingUser) {
    return c.json({ error: 'User with this email already exists' }, 409);
  }
  
  // Check if pending invitation exists
  const [existingInvitation] = await db
    .select()
    .from(schema.invitations)
    .where(eq(schema.invitations.email, email))
    .limit(1);
  
  if (existingInvitation && existingInvitation.status === 'pending') {
    return c.json({ error: 'Pending invitation already exists for this email' }, 409);
  }
  
  // Generate token
  const token = generateInvitationToken();
  const expiresAt = getInvitationExpiry();
  
  const [invitation] = await db
    .insert(schema.invitations)
    .values({
      email,
      name: client.fullName,
      role: 'client',
      token,
      status: 'pending',
      individualClientId: id,
      invitedBy: user.userId,
      expiresAt,
    })
    .returning();
  
  // Get inviter's name for the email
  let inviterName: string | undefined;
  if (user.employeeId) {
    const [employee] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, user.employeeId))
      .limit(1);
    inviterName = employee?.fullName;
  }
  
  // Send invitation email
  const emailResult = await sendInvitationEmail(
    email,
    client.fullName,
    'Client',
    token,
    inviterName
  );
  
  const invitationLink = `${process.env.FRONTEND_URL || 'https://companyportal.pages.dev'}/accept-invitation/${token}`;
  
  return c.json({
    invitation,
    invitationLink,
    emailSent: emailResult.success,
    emailError: emailResult.error,
  }, 201);
});

export default crm;
