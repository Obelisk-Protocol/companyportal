import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, canAccessEmployee } from '../middleware/auth.js';
import { generatePayslipPdf } from '../utils/pdf.js';
import { uploadToR2, generateFileKey } from '../utils/r2.js';

const payslips = new Hono();

// Apply auth middleware to all routes
payslips.use('*', authMiddleware);

// GET /payslips/:id - Get payslip details
payslips.get('/:id', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  
  const [result] = await db
    .select({
      payslip: schema.payslips,
      employee: schema.employees,
      payrollRun: schema.payrollRuns,
    })
    .from(schema.payslips)
    .innerJoin(schema.employees, eq(schema.payslips.employeeId, schema.employees.id))
    .innerJoin(schema.payrollRuns, eq(schema.payslips.payrollRunId, schema.payrollRuns.id))
    .where(eq(schema.payslips.id, id))
    .limit(1);
  
  if (!result) {
    return c.json({ error: 'Payslip not found' }, 404);
  }
  
  // Check access
  if (!canAccessEmployee(c, result.payslip.employeeId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  // Get reimbursed expenses for this payslip
  const expenses = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.payslipId, id));
  
  return c.json({ ...result, expenses });
});

// GET /payslips/:id/pdf - Get/generate payslip PDF
payslips.get('/:id/pdf', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  
  const [result] = await db
    .select({
      payslip: schema.payslips,
      employee: schema.employees,
      payrollRun: schema.payrollRuns,
    })
    .from(schema.payslips)
    .innerJoin(schema.employees, eq(schema.payslips.employeeId, schema.employees.id))
    .innerJoin(schema.payrollRuns, eq(schema.payslips.payrollRunId, schema.payrollRuns.id))
    .where(eq(schema.payslips.id, id))
    .limit(1);
  
  if (!result) {
    return c.json({ error: 'Payslip not found' }, 404);
  }
  
  // Check access
  if (!canAccessEmployee(c, result.payslip.employeeId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  // If PDF already exists, return URL
  if (result.payslip.pdfUrl) {
    return c.json({ pdfUrl: result.payslip.pdfUrl });
  }
  
  // Get company info
  const [company] = await db.select().from(schema.companies).limit(1);
  
  // Generate PDF
  const pdfBytes = await generatePayslipPdf({
    company: company || {
      name: 'Company Name',
      npwp: 'XX.XXX.XXX.X-XXX.XXX',
      address: 'Company Address',
      city: 'City',
      province: 'Province',
    },
    employee: result.employee,
    payslip: result.payslip,
    payrollRun: result.payrollRun,
  });
  
  // Upload to R2
  const key = generateFileKey('payslips', `${result.employee.employeeNumber}-${result.payrollRun.periodYear}-${result.payrollRun.periodMonth}.pdf`);
  const { url } = await uploadToR2(pdfBytes, key, 'application/pdf');
  
  // Update payslip with PDF URL
  await db
    .update(schema.payslips)
    .set({ pdfUrl: url, updatedAt: new Date() })
    .where(eq(schema.payslips.id, id));
  
  return c.json({ pdfUrl: url });
});

// POST /payslips/:id/regenerate-pdf - Regenerate payslip PDF
payslips.post('/:id/regenerate-pdf', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  
  // Only admin/hr can regenerate
  if (user.role !== 'admin' && user.role !== 'hr') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  const [result] = await db
    .select({
      payslip: schema.payslips,
      employee: schema.employees,
      payrollRun: schema.payrollRuns,
    })
    .from(schema.payslips)
    .innerJoin(schema.employees, eq(schema.payslips.employeeId, schema.employees.id))
    .innerJoin(schema.payrollRuns, eq(schema.payslips.payrollRunId, schema.payrollRuns.id))
    .where(eq(schema.payslips.id, id))
    .limit(1);
  
  if (!result) {
    return c.json({ error: 'Payslip not found' }, 404);
  }
  
  // Get company info
  const [company] = await db.select().from(schema.companies).limit(1);
  
  // Generate PDF
  const pdfBytes = await generatePayslipPdf({
    company: company || {
      name: 'Company Name',
      npwp: 'XX.XXX.XXX.X-XXX.XXX',
      address: 'Company Address',
      city: 'City',
      province: 'Province',
    },
    employee: result.employee,
    payslip: result.payslip,
    payrollRun: result.payrollRun,
  });
  
  // Upload to R2
  const key = generateFileKey('payslips', `${result.employee.employeeNumber}-${result.payrollRun.periodYear}-${result.payrollRun.periodMonth}.pdf`);
  const { url } = await uploadToR2(pdfBytes, key, 'application/pdf');
  
  // Update payslip with new PDF URL
  await db
    .update(schema.payslips)
    .set({ pdfUrl: url, updatedAt: new Date() })
    .where(eq(schema.payslips.id, id));
  
  return c.json({ pdfUrl: url });
});

export default payslips;
