import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requireRole, canAccessEmployee } from '../middleware/auth.js';

const employees = new Hono();

// Apply auth middleware to all routes
employees.use('*', authMiddleware);

// Employee create/update schema
const employeeSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  nik: z.string().length(16),
  npwp: z.string().optional(),
  ptkpStatus: z.enum(['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3', 'K/I/0', 'K/I/1', 'K/I/2', 'K/I/3']).default('TK/0'),
  bpjsKesehatanNumber: z.string().optional(),
  bpjsKetenagakerjaanNumber: z.string().optional(),
  joinDate: z.string(),
  department: z.string().optional(),
  position: z.string().optional(),
  employmentType: z.enum(['permanent', 'contract', 'probation']).default('permanent'),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
});

// Salary components schema
const salarySchema = z.object({
  gajiPokok: z.number().positive(),
  tunjanganTransport: z.number().min(0).default(0),
  tunjanganMakan: z.number().min(0).default(0),
  tunjanganKomunikasi: z.number().min(0).default(0),
  tunjanganJabatan: z.number().min(0).default(0),
  tunjanganLainnya: z.number().min(0).default(0),
  effectiveDate: z.string(),
});

// GET /employees - List all employees
employees.get('/', requireRole('admin', 'hr'), async (c) => {
  const allEmployees = await db
    .select()
    .from(schema.employees)
    .orderBy(desc(schema.employees.createdAt));
  
  return c.json(allEmployees);
});

// GET /employees/:id - Get employee details
employees.get('/:id', async (c) => {
  const { id } = c.req.param();
  
  if (!canAccessEmployee(c, id)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  const [employee] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, id))
    .limit(1);
  
  if (!employee) {
    return c.json({ error: 'Employee not found' }, 404);
  }
  
  return c.json(employee);
});

// POST /employees - Create employee (admin only)
employees.post('/', requireRole('admin', 'hr'), zValidator('json', employeeSchema), async (c) => {
  const data = c.req.valid('json');
  
  // Check for existing email
  const [existing] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.email, data.email))
    .limit(1);
  
  if (existing) {
    return c.json({ error: 'Employee with this email already exists' }, 409);
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

  const [employee] = await db
    .insert(schema.employees)
    .values({
      employeeNumber,
      ...data,
      status: 'active',
    })
    .returning();
  
  return c.json(employee, 201);
});

// PUT /employees/:id - Update employee
employees.put('/:id', requireRole('admin', 'hr'), zValidator('json', employeeSchema.partial()), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  
  const [employee] = await db
    .update(schema.employees)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(schema.employees.id, id))
    .returning();
  
  if (!employee) {
    return c.json({ error: 'Employee not found' }, 404);
  }
  
  return c.json(employee);
});

// DELETE /employees/:id - Soft delete (terminate) employee
employees.delete('/:id', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  
  const [employee] = await db
    .update(schema.employees)
    .set({
      status: 'terminated',
      terminationDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date(),
    })
    .where(eq(schema.employees.id, id))
    .returning();
  
  if (!employee) {
    return c.json({ error: 'Employee not found' }, 404);
  }
  
  return c.json({ message: 'Employee terminated', employee });
});

// DELETE /employees/:id/permanent - Hard delete employee and associated data
employees.delete('/:id/permanent', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  
  // Check if employee exists
  const [employee] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, id))
    .limit(1);
  
  if (!employee) {
    return c.json({ error: 'Employee not found' }, 404);
  }
  
  try {
    // Delete associated user account first
    await db
      .delete(schema.users)
      .where(eq(schema.users.employeeId, id));
    
    // Delete salary components
    await db
      .delete(schema.salaryComponents)
      .where(eq(schema.salaryComponents.employeeId, id));
    
    // Delete expenses
    await db
      .delete(schema.expenses)
      .where(eq(schema.expenses.employeeId, id));
    
    // Delete payslips
    await db
      .delete(schema.payslips)
      .where(eq(schema.payslips.employeeId, id));
    
    // Delete the employee
    await db
      .delete(schema.employees)
      .where(eq(schema.employees.id, id));
    
    return c.json({ message: 'Employee and all associated data permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting employee:', error);
    return c.json({ error: 'Failed to delete employee. They may have related records.' }, 500);
  }
});

// GET /employees/:id/salary - Get current salary components
employees.get('/:id/salary', async (c) => {
  const { id } = c.req.param();
  
  if (!canAccessEmployee(c, id)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  const [salary] = await db
    .select()
    .from(schema.salaryComponents)
    .where(eq(schema.salaryComponents.employeeId, id))
    .orderBy(desc(schema.salaryComponents.effectiveDate))
    .limit(1);
  
  if (!salary) {
    return c.json({ error: 'No salary components found' }, 404);
  }
  
  return c.json(salary);
});

// PUT /employees/:id/salary - Update salary components
employees.put('/:id/salary', requireRole('admin', 'hr'), zValidator('json', salarySchema), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  
  // Check if employee exists
  const [employee] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, id))
    .limit(1);
  
  if (!employee) {
    return c.json({ error: 'Employee not found' }, 404);
  }
  
  // Insert new salary record (history is preserved)
  const [salary] = await db
    .insert(schema.salaryComponents)
    .values({
      employeeId: id,
      gajiPokok: String(data.gajiPokok),
      tunjanganTransport: String(data.tunjanganTransport),
      tunjanganMakan: String(data.tunjanganMakan),
      tunjanganKomunikasi: String(data.tunjanganKomunikasi),
      tunjanganJabatan: String(data.tunjanganJabatan),
      tunjanganLainnya: String(data.tunjanganLainnya),
      effectiveDate: data.effectiveDate,
    })
    .returning();
  
  return c.json(salary);
});

// GET /employees/:id/salary/history - Get salary history
employees.get('/:id/salary/history', requireRole('admin', 'hr'), async (c) => {
  const { id } = c.req.param();
  
  const history = await db
    .select()
    .from(schema.salaryComponents)
    .where(eq(schema.salaryComponents.employeeId, id))
    .orderBy(desc(schema.salaryComponents.effectiveDate));
  
  return c.json(history);
});

// GET /employees/:id/payslips - Get employee payslips
employees.get('/:id/payslips', async (c) => {
  const { id } = c.req.param();
  
  if (!canAccessEmployee(c, id)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  const payslips = await db
    .select({
      payslip: schema.payslips,
      payrollRun: schema.payrollRuns,
    })
    .from(schema.payslips)
    .innerJoin(schema.payrollRuns, eq(schema.payslips.payrollRunId, schema.payrollRuns.id))
    .where(eq(schema.payslips.employeeId, id))
    .orderBy(desc(schema.payrollRuns.periodYear), desc(schema.payrollRuns.periodMonth));
  
  return c.json(payslips);
});

export default employees;
