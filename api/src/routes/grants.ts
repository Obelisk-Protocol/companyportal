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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'grant';
}

async function resolveGrantId(idOrSlug: string): Promise<string | null> {
  if (UUID_REGEX.test(idOrSlug)) {
    const [g] = await db.select({ id: schema.grants.id }).from(schema.grants).where(eq(schema.grants.id, idOrSlug)).limit(1);
    return g?.id ?? null;
  }
  const [g] = await db.select({ id: schema.grants.id }).from(schema.grants).where(eq(schema.grants.slug, idOrSlug)).limit(1);
  return g?.id ?? null;
}

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
  let slug = slugFromName(data.name);
  let n = 2;
  while (true) {
    const [existing] = await db.select({ id: schema.grants.id }).from(schema.grants).where(eq(schema.grants.slug, slug)).limit(1);
    if (!existing) break;
    slug = `${slugFromName(data.name)}-${n}`;
    n++;
  }
  const [grant] = await db
    .insert(schema.grants)
    .values({
      name: data.name,
      slug,
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

// GET /grants/:idOrSlug - Get grant with wallet, audits, deductions, members (id or slug)
grants.get('/:idOrSlug', grantAdmin, async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);

  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, grantId)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const [wallet] = await db.select().from(schema.grantWallets).where(eq(schema.grantWallets.grantId, grantId)).limit(1);
  const audits = await db
    .select()
    .from(schema.walletAudits)
    .where(eq(schema.walletAudits.grantId, grantId))
    .orderBy(desc(schema.walletAudits.auditRunAt));
  const deductions = await db.select().from(schema.grantDeductions).where(eq(schema.grantDeductions.grantId, grantId));
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
    .where(eq(schema.grantMembers.grantId, grantId));

  const latestAudit = audits[0] ?? null;
  // Per-currency so we don't mix SOL and USDC
  const totalDeductionsSol = deductions
    .filter((d) => (d.currency || 'SOL') === 'SOL')
    .reduce((s, d) => s + parseFloat(String(d.amount)), 0);
  const totalDeductionsUsdc = deductions
    .filter((d) => (d.currency || '') === 'USDC')
    .reduce((s, d) => s + parseFloat(String(d.amount)), 0);
  const fundsReceivedSol = latestAudit ? parseFloat(String(latestAudit.totalInbound ?? 0)) : 0;
  const fundsReceivedUsdc = latestAudit && latestAudit.balanceUsdc != null ? parseFloat(String(latestAudit.balanceUsdc)) : null;
  const netSol = fundsReceivedSol - totalDeductionsSol;
  const netUsdc = fundsReceivedUsdc != null ? fundsReceivedUsdc - totalDeductionsUsdc : null;

  return c.json({
    ...grant,
    wallet: wallet ?? null,
    audits,
    latestAudit,
    deductions,
    members: members.map((m) => ({ id: m.id, userId: m.userId, role: m.role, createdAt: m.createdAt, user: m.user })),
    summary: {
      fundsReceivedSol,
      fundsReceivedUsdc,
      totalDeductionsSol,
      totalDeductionsUsdc,
      netSol,
      netUsdc,
    },
  });
});

// PUT /grants/:idOrSlug - Update grant
grants.put('/:idOrSlug', grantAdmin, zValidator('json', updateGrantSchema), async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);

  const data = c.req.valid('json');
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, grantId)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name != null) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.status != null) update.status = data.status;
  if (data.currency != null) update.currency = data.currency;
  if (data.expectedAmount !== undefined) update.expectedAmount = data.expectedAmount != null ? String(data.expectedAmount) : null;
  if (data.startDate !== undefined) update.startDate = data.startDate ?? null;
  if (data.endDate !== undefined) update.endDate = data.endDate ?? null;

  if (data.name != null && data.name !== grant.name) {
    let slug = slugFromName(data.name);
    let n = 2;
    while (true) {
      const [existing] = await db.select({ id: schema.grants.id }).from(schema.grants).where(eq(schema.grants.slug, slug)).limit(1);
      if (!existing || existing.id === grantId) break;
      slug = `${slugFromName(data.name)}-${n}`;
      n++;
    }
    update.slug = slug;
  }

  const [updated] = await db.update(schema.grants).set(update as any).where(eq(schema.grants.id, grantId)).returning();
  return c.json(updated);
});

// POST /grants/:idOrSlug/wallet - Set or update grant wallet
grants.post('/:idOrSlug/wallet', grantAdmin, zValidator('json', walletSchema), async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);

  const data = c.req.valid('json');
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, grantId)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const [existing] = await db.select().from(schema.grantWallets).where(eq(schema.grantWallets.grantId, grantId)).limit(1);
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
      grantId,
      walletAddress: data.walletAddress,
      label: data.label ?? null,
    })
    .returning();
  return c.json(created, 201);
});

// POST /grants/:idOrSlug/audit - Run on-chain audit
grants.post('/:idOrSlug/audit', grantAdmin, async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);

  const user = c.get('user');
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, grantId)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const [wallet] = await db.select().from(schema.grantWallets).where(eq(schema.grantWallets.grantId, grantId)).limit(1);
  if (!wallet) return c.json({ error: 'Grant has no wallet. Set wallet first.' }, 400);

  const result = await runWalletAudit(wallet.walletAddress);
  if (result.error) {
    return c.json({ error: result.error }, 400);
  }

  const [audit] = await db
    .insert(schema.walletAudits)
    .values({
      grantId,
      walletAddress: wallet.walletAddress,
      auditRunAt: new Date(),
      totalInbound: String(result.totalInbound),
      totalOutbound: String(result.totalOutbound),
      balanceAtAudit: result.balanceAtAudit != null ? String(result.balanceAtAudit) : null,
      balanceUsdc: result.balanceUsdc != null ? String(result.balanceUsdc) : null,
      transactionCount: result.transactionCount,
      rawData: result.rawData ?? null,
      createdBy: user.userId,
    })
    .returning();
  return c.json(audit, 201);
});

// GET /grants/:idOrSlug/audits - List audit history
grants.get('/:idOrSlug/audits', grantAdmin, async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);
  const audits = await db
    .select()
    .from(schema.walletAudits)
    .where(eq(schema.walletAudits.grantId, grantId))
    .orderBy(desc(schema.walletAudits.auditRunAt));
  return c.json(audits);
});

// GET /grants/:idOrSlug/deductions - List deductions
grants.get('/:idOrSlug/deductions', grantAdmin, async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);
  const deductions = await db.select().from(schema.grantDeductions).where(eq(schema.grantDeductions.grantId, grantId));
  return c.json(deductions);
});

// POST /grants/:idOrSlug/deductions - Add deduction
grants.post('/:idOrSlug/deductions', grantAdmin, zValidator('json', deductionSchema), async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);

  const data = c.req.valid('json');
  const user = c.get('user');
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, grantId)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const amount = typeof data.amount === 'number' ? String(data.amount) : data.amount;
  const [deduction] = await db
    .insert(schema.grantDeductions)
    .values({
      grantId,
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

// PUT /grants/:idOrSlug/deductions/:deductionId - Update deduction
grants.put('/:idOrSlug/deductions/:deductionId', grantAdmin, zValidator('json', deductionSchema.partial()), async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const deductionId = c.req.param('deductionId');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);

  const data = c.req.valid('json');
  const [existing] = await db
    .select()
    .from(schema.grantDeductions)
    .where(and(eq(schema.grantDeductions.grantId, grantId), eq(schema.grantDeductions.id, deductionId)))
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

// DELETE /grants/:idOrSlug/deductions/:deductionId
grants.delete('/:idOrSlug/deductions/:deductionId', grantAdmin, async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const deductionId = c.req.param('deductionId');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);

  const [existing] = await db
    .select()
    .from(schema.grantDeductions)
    .where(and(eq(schema.grantDeductions.grantId, grantId), eq(schema.grantDeductions.id, deductionId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Deduction not found' }, 404);
  await db.delete(schema.grantDeductions).where(eq(schema.grantDeductions.id, deductionId));
  return c.json({ ok: true });
});

// GET /grants/:idOrSlug/members - List members
grants.get('/:idOrSlug/members', grantAdmin, async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);
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
    .where(eq(schema.grantMembers.grantId, grantId));
  return c.json(members);
});

// POST /grants/:idOrSlug/members - Add member
grants.post('/:idOrSlug/members', grantAdmin, zValidator('json', memberSchema), async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);

  const data = c.req.valid('json');
  const [grant] = await db.select().from(schema.grants).where(eq(schema.grants.id, grantId)).limit(1);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);

  const [existing] = await db
    .select()
    .from(schema.grantMembers)
    .where(and(eq(schema.grantMembers.grantId, grantId), eq(schema.grantMembers.userId, data.userId)))
    .limit(1);
  if (existing) return c.json({ error: 'User already a member' }, 400);

  const [member] = await db
    .insert(schema.grantMembers)
    .values({
      grantId,
      userId: data.userId,
      role: data.role,
    })
    .returning();
  return c.json(member, 201);
});

// DELETE /grants/:idOrSlug/members/:userId
grants.delete('/:idOrSlug/members/:userId', grantAdmin, async (c) => {
  const idOrSlug = c.req.param('idOrSlug');
  const userId = c.req.param('userId');
  const grantId = await resolveGrantId(idOrSlug);
  if (!grantId) return c.json({ error: 'Grant not found' }, 404);

  const [existing] = await db
    .select()
    .from(schema.grantMembers)
    .where(and(eq(schema.grantMembers.grantId, grantId), eq(schema.grantMembers.userId, userId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Member not found' }, 404);
  await db.delete(schema.grantMembers).where(eq(schema.grantMembers.id, existing.id));
  return c.json({ ok: true });
});

export default grants;
