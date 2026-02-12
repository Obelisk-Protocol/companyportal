import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { runWalletAudit } from '../utils/solanaAudit.js';

const grants = new Hono();

grants.use('*', authMiddleware);

// Only admin (and optionally hr) can manage grants
const grantAdmin = requireRole('admin', 'hr');

const createGrantSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'closed', 'archived']).default('draft'),
  currency: z.string().default('SOL'),
  expectedAmount: z.string().or(z.number()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const updateGrantSchema = createGrantSchema.partial();

const walletSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  label: z.string().optional(),
});

const deductionSchema = z.object({
  amount: z.string().or(z.number()),
  currency: z.string().default('SOL'),
  category: z.enum(['platform_fee', 'tax', 'operational', 'other']),
  description: z.string().optional(),
  deductedAt: z.string(),
});

const memberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'founder', 'viewer']),
});

// GET /grants/users-for-members - List users (id, email) for adding grant members (admin/hr)
grants.get('/users-for-members', grantAdmin, async (c) => {
  const users = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.isActive, true));
  return c.json(users);
});

// GET /grants - List grants
grants.get('/', grantAdmin, async (c) => {
  const status = c.req.query('status');
  let query = db
    .select()
    .from(schema.grants)
    .orderBy(desc(schema.grants.createdAt));
  if (status) {
    const rows = await db
      .select()
      .from(schema.grants)
      .where(eq(schema.grants.status, status as any))
      .orderBy(desc(schema.grants.createdAt));
    const enriched = await enrichGrantsList(rows);
    return c.json(enriched);
  }
  const rows = await query;
  const enriched = await enrichGrantsList(rows);
  return c.json(enriched);
});

async function enrichGrantsList(rows: typeof schema.grants.$inferSelect[]) {
  const result = [];
  for (const g of rows) {
    const [wallet] = await db.select().from(schema.grantWallets).where(eq(schema.grantWallets.grantId, g.id)).limit(1);
    const [latestAudit] = await db
      .select()
      .from(schema.walletAudits)
      .where(eq(schema.walletAudits.grantId, g.id))
      .orderBy(desc(schema.walletAudits.auditRunAt))
      .limit(1);
    const deductions = await db.select().from(schema.grantDeductions).where(eq(schema.grantDeductions.grantId, g.id));
    const totalDeductions = deductions.reduce((s, d) => s + parseFloat(String(d.amount)), 0);
    result.push({
      ...g,
      wallet: wallet ?? null,
      latestAudit: latestAudit ?? null,
      totalDeductions,
    });
  }
  return result;
}

// POST /grants - Create grant
grants.post('/', grantAdmin, zValidator('json', createGrantSchema), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const [grant] = await db
    .insert(schema.grants)
    .values({
      name: data.name,
      description: data.description ?? null,
      status: data.status,
      currency: data.currency,
      expectedAmount: data.expectedAmount != null ? String(data.expectedAmount) : null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      createdBy: user.userId,
    })
    .returning();
  return c.json(grant, 201);
});

// GET /grants/:id - Get grant with wallet, audits, deductions, members
grants.get('/:id', grantAdmin, async (c) => {
  const { id } = c.req.param();
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, id)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const [wallet] = await db.select().from(schema.grantWallets).where(eq(schema.grantWallets.grantId, id)).limit(1);
  const audits = await db
    .select()
    .from(schema.walletAudits)
    .where(eq(schema.walletAudits.grantId, id))
    .orderBy(desc(schema.walletAudits.auditRunAt));
  const deductions = await db.select().from(schema.grantDeductions).where(eq(schema.grantDeductions.grantId, id));
  const members = await db
    .select({
      id: schema.grantMembers.id,
      userId: schema.grantMembers.userId,
      role: schema.grantMembers.role,
      createdAt: schema.grantMembers.createdAt,
      user: {
        id: schema.users.id,
        email: schema.users.email,
      },
    })
    .from(schema.grantMembers)
    .innerJoin(schema.users, eq(schema.grantMembers.userId, schema.users.id))
    .where(eq(schema.grantMembers.grantId, id));

  const totalDeductions = deductions.reduce((s, d) => s + parseFloat(String(d.amount)), 0);
  const latestAudit = audits[0] ?? null;
  const fundsReceived = latestAudit ? parseFloat(String(latestAudit.totalInbound ?? 0)) : 0;
  const netForProject = fundsReceived - totalDeductions;

  return c.json({
    ...grant,
    wallet: wallet ?? null,
    audits,
    latestAudit,
    deductions,
    members: members.map((m) => ({ id: m.id, userId: m.userId, role: m.role, createdAt: m.createdAt, user: m.user })),
    summary: {
      totalDeductions,
      fundsReceived,
      netForProject,
    },
  });
});

// PUT /grants/:id - Update grant
grants.put('/:id', grantAdmin, zValidator('json', updateGrantSchema), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, id)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name != null) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.status != null) update.status = data.status;
  if (data.currency != null) update.currency = data.currency;
  if (data.expectedAmount !== undefined) update.expectedAmount = data.expectedAmount != null ? String(data.expectedAmount) : null;
  if (data.startDate !== undefined) update.startDate = data.startDate ?? null;
  if (data.endDate !== undefined) update.endDate = data.endDate ?? null;

  const [updated] = await db.update(schema.grants).set(update as any).where(eq(schema.grants.id, id)).returning();
  return c.json(updated);
});

// POST /grants/:id/wallet - Set or update grant wallet
grants.post('/:id/wallet', grantAdmin, zValidator('json', walletSchema), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, id)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const [existing] = await db.select().from(schema.grantWallets).where(eq(schema.grantWallets.grantId, id)).limit(1);
  if (existing) {
    const [updated] = await db
      .update(schema.grantWallets)
      .set({
        walletAddress: data.walletAddress,
        label: data.label ?? existing.label,
        updatedAt: new Date(),
      })
      .where(eq(schema.grantWallets.id, existing.id))
      .returning();
    return c.json(updated);
  }
  const [created] = await db
    .insert(schema.grantWallets)
    .values({
      grantId: id,
      walletAddress: data.walletAddress,
      label: data.label ?? null,
    })
    .returning();
  return c.json(created, 201);
});

// POST /grants/:id/audit - Run on-chain audit
grants.post('/:id/audit', grantAdmin, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, id)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const [wallet] = await db.select().from(schema.grantWallets).where(eq(schema.grantWallets.grantId, id)).limit(1);
  if (!wallet) return c.json({ error: 'Grant has no wallet. Set wallet first.' }, 400);

  const result = await runWalletAudit(wallet.walletAddress);
  if (result.error) {
    return c.json({ error: result.error }, 400);
  }

  const [audit] = await db
    .insert(schema.walletAudits)
    .values({
      grantId: id,
      walletAddress: wallet.walletAddress,
      auditRunAt: new Date(),
      totalInbound: String(result.totalInbound),
      totalOutbound: String(result.totalOutbound),
      balanceAtAudit: result.balanceAtAudit != null ? String(result.balanceAtAudit) : null,
      transactionCount: result.transactionCount,
      rawData: result.rawData ?? null,
      createdBy: user.userId,
    })
    .returning();
  return c.json(audit, 201);
});

// GET /grants/:id/audits - List audit history
grants.get('/:id/audits', grantAdmin, async (c) => {
  const { id } = c.req.param();
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, id)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);
  const audits = await db
    .select()
    .from(schema.walletAudits)
    .where(eq(schema.walletAudits.grantId, id))
    .orderBy(desc(schema.walletAudits.auditRunAt));
  return c.json(audits);
});

// GET /grants/:id/deductions - List deductions
grants.get('/:id/deductions', grantAdmin, async (c) => {
  const { id } = c.req.param();
  const deductions = await db.select().from(schema.grantDeductions).where(eq(schema.grantDeductions.grantId, id));
  return c.json(deductions);
});

// POST /grants/:id/deductions - Add deduction
grants.post('/:id/deductions', grantAdmin, zValidator('json', deductionSchema), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  const user = c.get('user');
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, id)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const amount = typeof data.amount === 'number' ? String(data.amount) : data.amount;
  const [deduction] = await db
    .insert(schema.grantDeductions)
    .values({
      grantId: id,
      amount,
      currency: data.currency,
      category: data.category,
      description: data.description ?? null,
      deductedAt: data.deductedAt,
      createdBy: user.userId,
    })
    .returning();
  return c.json(deduction, 201);
});

// PUT /grants/:id/deductions/:deductionId - Update deduction
grants.put('/:id/deductions/:deductionId', grantAdmin, zValidator('json', deductionSchema.partial()), async (c) => {
  const { id, deductionId } = c.req.param();
  const data = c.req.valid('json');
  const [existing] = await db
    .select()
    .from(schema.grantDeductions)
    .where(and(eq(schema.grantDeductions.grantId, id), eq(schema.grantDeductions.id, deductionId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Deduction not found' }, 404);

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.amount !== undefined) update.amount = typeof data.amount === 'number' ? String(data.amount) : data.amount;
  if (data.currency !== undefined) update.currency = data.currency;
  if (data.category !== undefined) update.category = data.category;
  if (data.description !== undefined) update.description = data.description;
  if (data.deductedAt !== undefined) update.deductedAt = data.deductedAt;

  const [updated] = await db
    .update(schema.grantDeductions)
    .set(update as any)
    .where(eq(schema.grantDeductions.id, deductionId))
    .returning();
  return c.json(updated);
});

// DELETE /grants/:id/deductions/:deductionId
grants.delete('/:id/deductions/:deductionId', grantAdmin, async (c) => {
  const { id, deductionId } = c.req.param();
  const [existing] = await db
    .select()
    .from(schema.grantDeductions)
    .where(and(eq(schema.grantDeductions.grantId, id), eq(schema.grantDeductions.id, deductionId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Deduction not found' }, 404);
  await db.delete(schema.grantDeductions).where(eq(schema.grantDeductions.id, deductionId));
  return c.json({ ok: true });
});

// GET /grants/:id/members - List members
grants.get('/:id/members', grantAdmin, async (c) => {
  const { id } = c.req.param();
  const members = await db
    .select({
      id: schema.grantMembers.id,
      userId: schema.grantMembers.userId,
      role: schema.grantMembers.role,
      createdAt: schema.grantMembers.createdAt,
      email: schema.users.email,
    })
    .from(schema.grantMembers)
    .innerJoin(schema.users, eq(schema.grantMembers.userId, schema.users.id))
    .where(eq(schema.grantMembers.grantId, id));
  return c.json(members);
});

// POST /grants/:id/members - Add member
grants.post('/:id/members', grantAdmin, zValidator('json', memberSchema), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, id)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const [existing] = await db
    .select()
    .from(schema.grantMembers)
    .where(and(eq(schema.grantMembers.grantId, id), eq(schema.grantMembers.userId, data.userId)))
    .limit(1);
  if (existing) return c.json({ error: 'User already a member' }, 400);

  const [member] = await db
    .insert(schema.grantMembers)
    .values({
      grantId: id,
      userId: data.userId,
      role: data.role,
    })
    .returning();
  return c.json(member, 201);
});

// DELETE /grants/:id/members/:userId
grants.delete('/:id/members/:userId', grantAdmin, async (c) => {
  const { id, userId } = c.req.param();
  const [existing] = await db
    .select()
    .from(schema.grantMembers)
    .where(and(eq(schema.grantMembers.grantId, id), eq(schema.grantMembers.userId, userId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Member not found' }, 404);
  await db.delete(schema.grantMembers).where(eq(schema.grantMembers.id, existing.id));
  return c.json({ ok: true });
});

export default grants;
