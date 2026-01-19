import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requireRole, canAccessEmployee } from '../middleware/auth.js';

const expenses = new Hono();

// Apply auth middleware to all routes
expenses.use('*', authMiddleware);

// Create expense schema
const expenseSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  amount: z.number().positive(),
  category: z.enum(['transport', 'meals', 'accommodation', 'supplies', 'training', 'medical', 'other']),
  expenseDate: z.string(),
  receiptUrl: z.string().optional(),
  employeeId: z.string().optional(), // Allow admin/hr to specify employee
});

// Review expense schema
const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().optional(),
});

// GET /expenses - List expenses (filtered by role)
expenses.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const employeeId = c.req.query('employeeId');
  
  let query = db
    .select({
      expense: schema.expenses,
      employee: schema.employees,
    })
    .from(schema.expenses)
    .innerJoin(schema.employees, eq(schema.expenses.employeeId, schema.employees.id))
    .orderBy(desc(schema.expenses.createdAt));
  
  // Filter by role
  if (user.role === 'employee') {
    // Employees can only see their own expenses
    const result = await db
      .select({
        expense: schema.expenses,
        employee: schema.employees,
      })
      .from(schema.expenses)
      .innerJoin(schema.employees, eq(schema.expenses.employeeId, schema.employees.id))
      .where(eq(schema.expenses.employeeId, user.employeeId!))
      .orderBy(desc(schema.expenses.createdAt));
    
    return c.json(result);
  }
  
  // Admin/HR can see all
  const result = await query;
  return c.json(result);
});

// GET /expenses/pending - Get pending expenses for review
expenses.get('/pending', requireRole('admin', 'hr'), async (c) => {
  const result = await db
    .select({
      expense: schema.expenses,
      employee: schema.employees,
    })
    .from(schema.expenses)
    .innerJoin(schema.employees, eq(schema.expenses.employeeId, schema.employees.id))
    .where(eq(schema.expenses.status, 'pending'))
    .orderBy(desc(schema.expenses.createdAt));
  
  return c.json(result);
});

// GET /expenses/:id - Get expense details
expenses.get('/:id', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  
  const [result] = await db
    .select({
      expense: schema.expenses,
      employee: schema.employees,
    })
    .from(schema.expenses)
    .innerJoin(schema.employees, eq(schema.expenses.employeeId, schema.employees.id))
    .where(eq(schema.expenses.id, id))
    .limit(1);
  
  if (!result) {
    return c.json({ error: 'Expense not found' }, 404);
  }
  
  // Check access
  if (user.role === 'employee' && result.expense.employeeId !== user.employeeId) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  return c.json(result);
});

// POST /expenses - Submit new expense
expenses.post('/', zValidator('json', expenseSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');
  
  // Determine which employeeId to use
  let targetEmployeeId: string;
  
  if (data.employeeId && (user.role === 'admin' || user.role === 'hr')) {
    // Admin/HR can create expenses for any employee
    targetEmployeeId = data.employeeId;
    
    // Verify employee exists
    const [employee] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, targetEmployeeId))
      .limit(1);
    
    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }
  } else {
    // Employees can only create expenses for themselves
    if (!user.employeeId) {
      return c.json({ error: 'No employee profile linked to this user' }, 400);
    }
    targetEmployeeId = user.employeeId;
  }
  
  const [expense] = await db
    .insert(schema.expenses)
    .values({
      employeeId: targetEmployeeId,
      title: data.title,
      description: data.description,
      amount: String(data.amount),
      category: data.category,
      expenseDate: data.expenseDate,
      receiptUrl: data.receiptUrl,
      status: 'pending',
    })
    .returning();
  
  return c.json(expense, 201);
});

// PUT /expenses/:id - Update expense (only if pending)
expenses.put('/:id', zValidator('json', expenseSchema.partial()), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const data = c.req.valid('json');
  
  // Get existing expense
  const [existing] = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.id, id))
    .limit(1);
  
  if (!existing) {
    return c.json({ error: 'Expense not found' }, 404);
  }
  
  // Check ownership
  if (user.role === 'employee' && existing.employeeId !== user.employeeId) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  // Can only update pending expenses
  if (existing.status !== 'pending') {
    return c.json({ error: 'Can only update pending expenses' }, 400);
  }
  
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount) updateData.amount = String(data.amount);
  if (data.category) updateData.category = data.category;
  if (data.expenseDate) updateData.expenseDate = data.expenseDate;
  if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl;
  
  const [expense] = await db
    .update(schema.expenses)
    .set(updateData)
    .where(eq(schema.expenses.id, id))
    .returning();
  
  return c.json(expense);
});

// DELETE /expenses/:id - Delete expense (only if pending)
expenses.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  
  const [existing] = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.id, id))
    .limit(1);
  
  if (!existing) {
    return c.json({ error: 'Expense not found' }, 404);
  }
  
  // Check ownership
  if (user.role === 'employee' && existing.employeeId !== user.employeeId) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  // Can only delete pending expenses
  if (existing.status !== 'pending') {
    return c.json({ error: 'Can only delete pending expenses' }, 400);
  }
  
  await db.delete(schema.expenses).where(eq(schema.expenses.id, id));
  
  return c.json({ message: 'Expense deleted' });
});

// POST /expenses/:id/review - Approve or reject expense
expenses.post('/:id/review', requireRole('admin', 'hr'), zValidator('json', reviewSchema), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const data = c.req.valid('json');
  
  const [existing] = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.id, id))
    .limit(1);
  
  if (!existing) {
    return c.json({ error: 'Expense not found' }, 404);
  }
  
  if (existing.status !== 'pending') {
    return c.json({ error: 'Expense has already been reviewed' }, 400);
  }
  
  const [expense] = await db
    .update(schema.expenses)
    .set({
      status: data.status,
      reviewedBy: user.userId,
      reviewedAt: new Date(),
      reviewNotes: data.reviewNotes,
      updatedAt: new Date(),
    })
    .where(eq(schema.expenses.id, id))
    .returning();
  
  return c.json(expense);
});

export default expenses;
