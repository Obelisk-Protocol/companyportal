import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { calculatePayslip, type PTKPStatus } from '../utils/payroll.js';

const payroll = new Hono();

// Apply auth middleware to all routes
payroll.use('*', authMiddleware);

// Create payroll run schema
const createPayrollSchema = z.object({
  periodMonth: z.number().min(1).max(12),
  periodYear: z.number().min(2020).max(2100),
  notes: z.string().optional(),
});

// GET /payroll/runs - List payroll runs
payroll.get('/runs', requireRole('admin', 'hr'), async (c) => {
  const runs = await db
    .select()
    .from(schema.payrollRuns)
    .orderBy(desc(schema.payrollRuns.periodYear), desc(schema.payrollRuns.periodMonth));
  
  return c.json(runs);
});

// POST /payroll/runs - Create new payroll run
payroll.post('/runs', requireRole('admin', 'hr'), zValidator('json', createPayrollSchema), async (c) => {
  const data = c.req.valid('json');
  
  // Check for existing run
  const [existing] = await db
    .select()
    .from(schema.payrollRuns)
    .where(
      and(
        eq(schema.payrollRuns.periodMonth, data.periodMonth),
        eq(schema.payrollRuns.periodYear, data.periodYear)
      )
    )
    .limit(1);
  
  if (existing) {
    return c.json({ error: 'Payroll run already exists for this period' }, 409);
  }
  
  const [run] = await db
    .insert(schema.payrollRuns)
    .values({
      periodMonth: data.periodMonth,
      periodYear: data.periodYear,
      notes: data.notes,
      status: 'draft',
    })
    .returning();
  
  return c.json(run, 201);
});

// GET /payroll/runs/:id - Get payroll run details
payroll.get('/runs/:id', requireRole('admin', 'hr'), async (c) => {
  const { id } = c.req.param();
  
  const [run] = await db
    .select()
    .from(schema.payrollRuns)
    .where(eq(schema.payrollRuns.id, id))
    .limit(1);
  
  if (!run) {
    return c.json({ error: 'Payroll run not found' }, 404);
  }
  
  return c.json(run);
});

// POST /payroll/runs/:id/calculate - Calculate payroll for all employees
payroll.post('/runs/:id/calculate', requireRole('admin', 'hr'), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  
  // Get payroll run
  const [run] = await db
    .select()
    .from(schema.payrollRuns)
    .where(eq(schema.payrollRuns.id, id))
    .limit(1);
  
  if (!run) {
    return c.json({ error: 'Payroll run not found' }, 404);
  }
  
  if (run.status !== 'draft') {
    return c.json({ error: 'Payroll run is not in draft status' }, 400);
  }
  
  // Get all active employees
  const activeEmployees = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.status, 'active'));
  
  // Get company settings for JKK rate
  const [company] = await db.select().from(schema.companies).limit(1);
  const jkkRate = company?.jkkRiskLevel ? parseFloat(company.jkkRiskLevel) / 100 : 0.0024;
  
  // Get approved expenses for this period for reimbursement
  const approvedExpenses = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.status, 'approved'));
  
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalPph21 = 0;
  let totalBpjsEmployee = 0;
  let totalBpjsEmployer = 0;
  
  // Delete existing payslips for this run (if recalculating)
  await db.delete(schema.payslips).where(eq(schema.payslips.payrollRunId, id));
  
  for (const employee of activeEmployees) {
    // Get latest salary components
    const [salary] = await db
      .select()
      .from(schema.salaryComponents)
      .where(eq(schema.salaryComponents.employeeId, employee.id))
      .orderBy(desc(schema.salaryComponents.effectiveDate))
      .limit(1);
    
    if (!salary) {
      continue; // Skip employees without salary components
    }
    
    // Calculate reimbursements for this employee
    const employeeExpenses = approvedExpenses.filter(e => e.employeeId === employee.id);
    const reimbursementTotal = employeeExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    // Calculate payslip
    const calculation = calculatePayslip(
      {
        gajiPokok: parseFloat(salary.gajiPokok),
        tunjanganTransport: parseFloat(salary.tunjanganTransport || '0'),
        tunjanganMakan: parseFloat(salary.tunjanganMakan || '0'),
        tunjanganKomunikasi: parseFloat(salary.tunjanganKomunikasi || '0'),
        tunjanganJabatan: parseFloat(salary.tunjanganJabatan || '0'),
        tunjanganLainnya: parseFloat(salary.tunjanganLainnya || '0'),
        reimbursements: reimbursementTotal,
      },
      employee.ptkpStatus as PTKPStatus,
      jkkRate
    );
    
    // Insert payslip
    const [payslip] = await db
      .insert(schema.payslips)
      .values({
        payrollRunId: id,
        employeeId: employee.id,
        gajiPokok: String(calculation.earnings.gajiPokok),
        tunjanganTransport: String(calculation.earnings.tunjanganTransport),
        tunjanganMakan: String(calculation.earnings.tunjanganMakan),
        tunjanganKomunikasi: String(calculation.earnings.tunjanganKomunikasi),
        tunjanganJabatan: String(calculation.earnings.tunjanganJabatan),
        tunjanganLainnya: String(calculation.earnings.tunjanganLainnya),
        bonus: '0',
        overtime: '0',
        reimbursements: String(reimbursementTotal),
        grossSalary: String(calculation.grossSalary),
        bpjsKesehatanEmployee: String(calculation.bpjs.employee.kesehatan),
        bpjsJhtEmployee: String(calculation.bpjs.employee.jht),
        bpjsJpEmployee: String(calculation.bpjs.employee.jp),
        bpjsKesehatanEmployer: String(calculation.bpjs.employer.kesehatan),
        bpjsJhtEmployer: String(calculation.bpjs.employer.jht),
        bpjsJpEmployer: String(calculation.bpjs.employer.jp),
        bpjsJkkEmployer: String(calculation.bpjs.employer.jkk),
        bpjsJkmEmployer: String(calculation.bpjs.employer.jkm),
        pph21: String(calculation.pph21.monthlyTax),
        ptkpStatus: employee.ptkpStatus,
        otherDeductions: '0',
        totalDeductions: String(calculation.totalDeductions),
        netSalary: String(calculation.netSalary),
      })
      .returning();
    
    // Mark expenses as reimbursed
    for (const expense of employeeExpenses) {
      await db
        .update(schema.expenses)
        .set({ 
          status: 'reimbursed', 
          payslipId: payslip.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.expenses.id, expense.id));
    }
    
    // Accumulate totals
    totalGross += calculation.grossSalary;
    totalDeductions += calculation.totalDeductions;
    totalNet += calculation.netSalary;
    totalPph21 += calculation.pph21.monthlyTax;
    totalBpjsEmployee += calculation.bpjs.employee.total;
    totalBpjsEmployer += calculation.bpjs.employer.total;
  }
  
  // Update payroll run
  const [updatedRun] = await db
    .update(schema.payrollRuns)
    .set({
      status: 'calculated',
      totalGross: String(totalGross),
      totalDeductions: String(totalDeductions),
      totalNet: String(totalNet),
      totalPph21: String(totalPph21),
      totalBpjsEmployee: String(totalBpjsEmployee),
      totalBpjsEmployer: String(totalBpjsEmployer),
      calculatedAt: new Date(),
      calculatedBy: user.userId,
      updatedAt: new Date(),
    })
    .where(eq(schema.payrollRuns.id, id))
    .returning();
  
  return c.json({
    run: updatedRun,
    employeesProcessed: activeEmployees.length,
  });
});

// POST /payroll/runs/:id/approve - Approve payroll
payroll.post('/runs/:id/approve', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  
  const [run] = await db
    .select()
    .from(schema.payrollRuns)
    .where(eq(schema.payrollRuns.id, id))
    .limit(1);
  
  if (!run) {
    return c.json({ error: 'Payroll run not found' }, 404);
  }
  
  if (run.status !== 'calculated') {
    return c.json({ error: 'Payroll run must be calculated before approval' }, 400);
  }
  
  const [updatedRun] = await db
    .update(schema.payrollRuns)
    .set({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: user.userId,
      updatedAt: new Date(),
    })
    .where(eq(schema.payrollRuns.id, id))
    .returning();
  
  return c.json(updatedRun);
});

// POST /payroll/runs/:id/pay - Mark payroll as paid
payroll.post('/runs/:id/pay', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  
  const [run] = await db
    .select()
    .from(schema.payrollRuns)
    .where(eq(schema.payrollRuns.id, id))
    .limit(1);
  
  if (!run) {
    return c.json({ error: 'Payroll run not found' }, 404);
  }
  
  if (run.status !== 'approved') {
    return c.json({ error: 'Payroll run must be approved before marking as paid' }, 400);
  }
  
  const [updatedRun] = await db
    .update(schema.payrollRuns)
    .set({
      status: 'paid',
      paidAt: new Date(),
      paidBy: user.userId,
      updatedAt: new Date(),
    })
    .where(eq(schema.payrollRuns.id, id))
    .returning();
  
  return c.json(updatedRun);
});

// GET /payroll/runs/:id/payslips - Get all payslips for a run
payroll.get('/runs/:id/payslips', requireRole('admin', 'hr'), async (c) => {
  const { id } = c.req.param();
  
  const payslips = await db
    .select({
      payslip: schema.payslips,
      employee: schema.employees,
    })
    .from(schema.payslips)
    .innerJoin(schema.employees, eq(schema.payslips.employeeId, schema.employees.id))
    .where(eq(schema.payslips.payrollRunId, id))
    .orderBy(schema.employees.fullName);
  
  return c.json(payslips);
});

export default payroll;
