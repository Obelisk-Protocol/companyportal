import { Hono } from 'hono';
import { eq, and, between, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getIndonesianMonth, formatRupiah } from '../utils/payroll.js';
import { generateSPTMasaPPh21Pdf, generateBuktiPotong1721A1Pdf } from '../utils/pdf.js';
import { uploadToR2, generateFileKey } from '../utils/r2.js';

const reports = new Hono();

// Apply auth middleware to all routes
reports.use('*', authMiddleware);
reports.use('*', requireRole('admin', 'hr', 'accountant'));

// GET /reports/pph21/monthly - Monthly PPh 21 report
reports.get('/pph21/monthly', async (c) => {
  const month = parseInt(c.req.query('month') || String(new Date().getMonth() + 1));
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()));
  
  // Get payroll run for this period
  const [payrollRun] = await db
    .select()
    .from(schema.payrollRuns)
    .where(
      and(
        eq(schema.payrollRuns.periodMonth, month),
        eq(schema.payrollRuns.periodYear, year)
      )
    )
    .limit(1);
  
  if (!payrollRun) {
    return c.json({ error: 'No payroll run found for this period' }, 404);
  }
  
  // Get all payslips with employee info
  const payslips = await db
    .select({
      payslip: schema.payslips,
      employee: schema.employees,
    })
    .from(schema.payslips)
    .innerJoin(schema.employees, eq(schema.payslips.employeeId, schema.employees.id))
    .where(eq(schema.payslips.payrollRunId, payrollRun.id));
  
  // Calculate totals
  const totalPph21 = payslips.reduce((sum, p) => sum + parseFloat(p.payslip.pph21), 0);
  const totalGross = payslips.reduce((sum, p) => sum + parseFloat(p.payslip.grossSalary), 0);
  
  // Format report
  const report = {
    period: {
      month,
      year,
      monthName: getIndonesianMonth(month),
    },
    payrollRun: {
      id: payrollRun.id,
      status: payrollRun.status,
      calculatedAt: payrollRun.calculatedAt,
    },
    summary: {
      totalEmployees: payslips.length,
      totalGross,
      totalGrossFormatted: formatRupiah(totalGross),
      totalPph21,
      totalPph21Formatted: formatRupiah(totalPph21),
    },
    employees: payslips.map(({ payslip, employee }) => ({
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      nik: employee.nik,
      npwp: employee.npwp,
      ptkpStatus: payslip.ptkpStatus,
      grossSalary: parseFloat(payslip.grossSalary),
      grossSalaryFormatted: formatRupiah(parseFloat(payslip.grossSalary)),
      pph21: parseFloat(payslip.pph21),
      pph21Formatted: formatRupiah(parseFloat(payslip.pph21)),
    })),
  };
  
  return c.json(report);
});

// GET /reports/pph21/annual - Annual PPh 21 summary
reports.get('/pph21/annual', async (c) => {
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()));
  
  // Get all payroll runs for this year
  const payrollRuns = await db
    .select()
    .from(schema.payrollRuns)
    .where(eq(schema.payrollRuns.periodYear, year));
  
  // Get all active employees
  const employees = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.status, 'active'));
  
  // Calculate annual totals per employee
  const employeeAnnuals = await Promise.all(
    employees.map(async (employee) => {
      const employeePayslips = await db
        .select()
        .from(schema.payslips)
        .innerJoin(schema.payrollRuns, eq(schema.payslips.payrollRunId, schema.payrollRuns.id))
        .where(
          and(
            eq(schema.payslips.employeeId, employee.id),
            eq(schema.payrollRuns.periodYear, year)
          )
        );
      
      const totalGross = employeePayslips.reduce((sum, p) => sum + parseFloat(p.payslips.grossSalary), 0);
      const totalPph21 = employeePayslips.reduce((sum, p) => sum + parseFloat(p.payslips.pph21), 0);
      const totalBpjs = employeePayslips.reduce((sum, p) => 
        sum + parseFloat(p.payslips.bpjsKesehatanEmployee) +
        parseFloat(p.payslips.bpjsJhtEmployee) +
        parseFloat(p.payslips.bpjsJpEmployee), 0);
      
      return {
        employee: {
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          fullName: employee.fullName,
          nik: employee.nik,
          npwp: employee.npwp,
          ptkpStatus: employee.ptkpStatus,
        },
        monthsWorked: employeePayslips.length,
        totalGross,
        totalGrossFormatted: formatRupiah(totalGross),
        totalPph21,
        totalPph21Formatted: formatRupiah(totalPph21),
        totalBpjsEmployee: totalBpjs,
        totalBpjsEmployeeFormatted: formatRupiah(totalBpjs),
      };
    })
  );
  
  // Company totals
  const companyTotalGross = employeeAnnuals.reduce((sum, e) => sum + e.totalGross, 0);
  const companyTotalPph21 = employeeAnnuals.reduce((sum, e) => sum + e.totalPph21, 0);
  
  return c.json({
    year,
    summary: {
      totalEmployees: employees.length,
      totalGross: companyTotalGross,
      totalGrossFormatted: formatRupiah(companyTotalGross),
      totalPph21: companyTotalPph21,
      totalPph21Formatted: formatRupiah(companyTotalPph21),
      payrollRunsCompleted: payrollRuns.filter(r => r.status === 'paid').length,
    },
    employees: employeeAnnuals,
  });
});

// GET /reports/bpjs/monthly - Monthly BPJS report
reports.get('/bpjs/monthly', async (c) => {
  const month = parseInt(c.req.query('month') || String(new Date().getMonth() + 1));
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()));
  
  const [payrollRun] = await db
    .select()
    .from(schema.payrollRuns)
    .where(
      and(
        eq(schema.payrollRuns.periodMonth, month),
        eq(schema.payrollRuns.periodYear, year)
      )
    )
    .limit(1);
  
  if (!payrollRun) {
    return c.json({ error: 'No payroll run found for this period' }, 404);
  }
  
  const payslips = await db
    .select({
      payslip: schema.payslips,
      employee: schema.employees,
    })
    .from(schema.payslips)
    .innerJoin(schema.employees, eq(schema.payslips.employeeId, schema.employees.id))
    .where(eq(schema.payslips.payrollRunId, payrollRun.id));
  
  // Calculate BPJS totals
  const bpjsKesehatan = {
    employee: payslips.reduce((sum, p) => sum + parseFloat(p.payslip.bpjsKesehatanEmployee), 0),
    employer: payslips.reduce((sum, p) => sum + parseFloat(p.payslip.bpjsKesehatanEmployer), 0),
  };
  
  const bpjsJht = {
    employee: payslips.reduce((sum, p) => sum + parseFloat(p.payslip.bpjsJhtEmployee), 0),
    employer: payslips.reduce((sum, p) => sum + parseFloat(p.payslip.bpjsJhtEmployer), 0),
  };
  
  const bpjsJp = {
    employee: payslips.reduce((sum, p) => sum + parseFloat(p.payslip.bpjsJpEmployee), 0),
    employer: payslips.reduce((sum, p) => sum + parseFloat(p.payslip.bpjsJpEmployer), 0),
  };
  
  const bpjsJkk = payslips.reduce((sum, p) => sum + parseFloat(p.payslip.bpjsJkkEmployer), 0);
  const bpjsJkm = payslips.reduce((sum, p) => sum + parseFloat(p.payslip.bpjsJkmEmployer), 0);
  
  return c.json({
    period: {
      month,
      year,
      monthName: getIndonesianMonth(month),
    },
    summary: {
      totalEmployees: payslips.length,
      bpjsKesehatan: {
        ...bpjsKesehatan,
        total: bpjsKesehatan.employee + bpjsKesehatan.employer,
        employeeFormatted: formatRupiah(bpjsKesehatan.employee),
        employerFormatted: formatRupiah(bpjsKesehatan.employer),
        totalFormatted: formatRupiah(bpjsKesehatan.employee + bpjsKesehatan.employer),
      },
      bpjsKetenagakerjaan: {
        jht: {
          ...bpjsJht,
          total: bpjsJht.employee + bpjsJht.employer,
          employeeFormatted: formatRupiah(bpjsJht.employee),
          employerFormatted: formatRupiah(bpjsJht.employer),
          totalFormatted: formatRupiah(bpjsJht.employee + bpjsJht.employer),
        },
        jp: {
          ...bpjsJp,
          total: bpjsJp.employee + bpjsJp.employer,
          employeeFormatted: formatRupiah(bpjsJp.employee),
          employerFormatted: formatRupiah(bpjsJp.employer),
          totalFormatted: formatRupiah(bpjsJp.employee + bpjsJp.employer),
        },
        jkk: {
          employer: bpjsJkk,
          employerFormatted: formatRupiah(bpjsJkk),
        },
        jkm: {
          employer: bpjsJkm,
          employerFormatted: formatRupiah(bpjsJkm),
        },
      },
      grandTotal: {
        employee: bpjsKesehatan.employee + bpjsJht.employee + bpjsJp.employee,
        employer: bpjsKesehatan.employer + bpjsJht.employer + bpjsJp.employer + bpjsJkk + bpjsJkm,
        employeeFormatted: formatRupiah(bpjsKesehatan.employee + bpjsJht.employee + bpjsJp.employee),
        employerFormatted: formatRupiah(bpjsKesehatan.employer + bpjsJht.employer + bpjsJp.employer + bpjsJkk + bpjsJkm),
      },
    },
    employees: payslips.map(({ payslip, employee }) => ({
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      bpjsKesehatanNumber: employee.bpjsKesehatanNumber,
      bpjsKetenagakerjaanNumber: employee.bpjsKetenagakerjaanNumber,
      grossSalary: parseFloat(payslip.grossSalary),
      kesehatan: {
        employee: parseFloat(payslip.bpjsKesehatanEmployee),
        employer: parseFloat(payslip.bpjsKesehatanEmployer),
      },
      jht: {
        employee: parseFloat(payslip.bpjsJhtEmployee),
        employer: parseFloat(payslip.bpjsJhtEmployer),
      },
      jp: {
        employee: parseFloat(payslip.bpjsJpEmployee),
        employer: parseFloat(payslip.bpjsJpEmployer),
      },
      jkk: parseFloat(payslip.bpjsJkkEmployer),
      jkm: parseFloat(payslip.bpjsJkmEmployer),
    })),
  });
});

// GET /reports/payroll-summary - Payroll summary report
reports.get('/payroll-summary', async (c) => {
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()));
  
  const payrollRuns = await db
    .select()
    .from(schema.payrollRuns)
    .where(eq(schema.payrollRuns.periodYear, year))
    .orderBy(schema.payrollRuns.periodMonth);
  
  const monthlyData = payrollRuns.map(run => ({
    month: run.periodMonth,
    monthName: getIndonesianMonth(run.periodMonth),
    status: run.status,
    totalGross: parseFloat(run.totalGross || '0'),
    totalGrossFormatted: formatRupiah(parseFloat(run.totalGross || '0')),
    totalDeductions: parseFloat(run.totalDeductions || '0'),
    totalDeductionsFormatted: formatRupiah(parseFloat(run.totalDeductions || '0')),
    totalNet: parseFloat(run.totalNet || '0'),
    totalNetFormatted: formatRupiah(parseFloat(run.totalNet || '0')),
    totalPph21: parseFloat(run.totalPph21 || '0'),
    totalPph21Formatted: formatRupiah(parseFloat(run.totalPph21 || '0')),
    totalBpjsEmployee: parseFloat(run.totalBpjsEmployee || '0'),
    totalBpjsEmployeeFormatted: formatRupiah(parseFloat(run.totalBpjsEmployee || '0')),
    totalBpjsEmployer: parseFloat(run.totalBpjsEmployer || '0'),
    totalBpjsEmployerFormatted: formatRupiah(parseFloat(run.totalBpjsEmployer || '0')),
  }));
  
  // Annual totals
  const annualTotals = {
    totalGross: monthlyData.reduce((sum, m) => sum + m.totalGross, 0),
    totalNet: monthlyData.reduce((sum, m) => sum + m.totalNet, 0),
    totalPph21: monthlyData.reduce((sum, m) => sum + m.totalPph21, 0),
    totalBpjsEmployee: monthlyData.reduce((sum, m) => sum + m.totalBpjsEmployee, 0),
    totalBpjsEmployer: monthlyData.reduce((sum, m) => sum + m.totalBpjsEmployer, 0),
  };
  
  return c.json({
    year,
    monthlyData,
    annualTotals: {
      ...annualTotals,
      totalGrossFormatted: formatRupiah(annualTotals.totalGross),
      totalNetFormatted: formatRupiah(annualTotals.totalNet),
      totalPph21Formatted: formatRupiah(annualTotals.totalPph21),
      totalBpjsEmployeeFormatted: formatRupiah(annualTotals.totalBpjsEmployee),
      totalBpjsEmployerFormatted: formatRupiah(annualTotals.totalBpjsEmployer),
    },
  });
});

// GET /reports/pph21/monthly/pdf - Generate SPT Masa PPh 21 PDF
reports.get('/pph21/monthly/pdf', async (c) => {
  const month = parseInt(c.req.query('month') || String(new Date().getMonth() + 1));
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()));
  
  // Get payroll run for this period
  const [payrollRun] = await db
    .select()
    .from(schema.payrollRuns)
    .where(
      and(
        eq(schema.payrollRuns.periodMonth, month),
        eq(schema.payrollRuns.periodYear, year)
      )
    )
    .limit(1);
  
  if (!payrollRun) {
    return c.json({ error: 'No payroll run found for this period' }, 404);
  }
  
  // Get company info
  const [company] = await db.select().from(schema.companies).limit(1);
  if (!company) {
    return c.json({ error: 'Company information not found' }, 404);
  }
  
  // Get all payslips with employee info
  const payslips = await db
    .select({
      payslip: schema.payslips,
      employee: schema.employees,
    })
    .from(schema.payslips)
    .innerJoin(schema.employees, eq(schema.payslips.employeeId, schema.employees.id))
    .where(eq(schema.payslips.payrollRunId, payrollRun.id));
  
  // Calculate totals
  const totalPph21 = payslips.reduce((sum, p) => sum + parseFloat(p.payslip.pph21), 0);
  const totalGross = payslips.reduce((sum, p) => sum + parseFloat(p.payslip.grossSalary), 0);
  
  // Generate PDF
  const pdfBytes = await generateSPTMasaPPh21Pdf({
    company: {
      name: company.name,
      npwp: company.npwp,
      address: company.address,
      city: company.city,
      province: company.province,
    },
    period: { month, year },
    summary: {
      totalEmployees: payslips.length,
      totalGross,
      totalPph21,
    },
    employees: payslips.map(({ payslip, employee }) => ({
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      nik: employee.nik,
      npwp: employee.npwp,
      grossSalary: parseFloat(payslip.grossSalary),
      pph21: parseFloat(payslip.pph21),
    })),
  });
  
  // Upload to R2
  const key = generateFileKey('tax-forms', `SPT-Masa-PPh21-${year}-${String(month).padStart(2, '0')}.pdf`);
  const { url } = await uploadToR2(pdfBytes, key, 'application/pdf');
  
  return c.json({ pdfUrl: url });
});

// GET /reports/pph21/bukti-potong/:employeeId/pdf - Generate Bukti Potong 1721-A1 PDF
reports.get('/pph21/bukti-potong/:employeeId/pdf', async (c) => {
  const { employeeId } = c.req.param();
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()));
  
  // Get employee
  const [employee] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, employeeId))
    .limit(1);
  
  if (!employee) {
    return c.json({ error: 'Employee not found' }, 404);
  }
  
  // Get company info
  const [company] = await db.select().from(schema.companies).limit(1);
  if (!company) {
    return c.json({ error: 'Company information not found' }, 404);
  }
  
  // Get all payslips for this employee in this year
  const payslips = await db
    .select({
      payslip: schema.payslips,
      payrollRun: schema.payrollRuns,
    })
    .from(schema.payslips)
    .innerJoin(schema.payrollRuns, eq(schema.payslips.payrollRunId, schema.payrollRuns.id))
    .where(
      and(
        eq(schema.payslips.employeeId, employeeId),
        eq(schema.payrollRuns.periodYear, year)
      )
    )
    .orderBy(schema.payrollRuns.periodMonth);
  
  if (payslips.length === 0) {
    return c.json({ error: 'No payslip data found for this employee and year' }, 404);
  }
  
  // Calculate annual totals
  const totalGross = payslips.reduce((sum, p) => sum + parseFloat(p.payslip.grossSalary), 0);
  const totalPph21 = payslips.reduce((sum, p) => sum + parseFloat(p.payslip.pph21), 0);
  
  // Generate PDF
  const pdfBytes = await generateBuktiPotong1721A1Pdf({
    company: {
      name: company.name,
      npwp: company.npwp,
      address: company.address,
      city: company.city,
      province: company.province,
    },
    employee: {
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      nik: employee.nik,
      npwp: employee.npwp,
      address: employee.address,
      city: employee.city,
      province: employee.province,
      ptkpStatus: employee.ptkpStatus,
    },
    year,
    annualData: {
      totalGross,
      totalPph21,
      monthsWorked: payslips.length,
      monthlyBreakdown: payslips.map(({ payslip, payrollRun }) => ({
        month: payrollRun.periodMonth,
        grossSalary: parseFloat(payslip.grossSalary),
        pph21: parseFloat(payslip.pph21),
      })),
    },
  });
  
  // Upload to R2
  const key = generateFileKey('tax-forms', `Bukti-Potong-1721-A1-${employee.employeeNumber}-${year}.pdf`);
  const { url } = await uploadToR2(pdfBytes, key, 'application/pdf');
  
  return c.json({ pdfUrl: url });
});

// GET /reports/generated - List all generated reports
reports.get('/generated', async (c) => {
  const reportType = c.req.query('type') as 'spt_masa_pph21' | 'bukti_potong_1721a1' | undefined;
  const year = c.req.query('year') ? parseInt(c.req.query('year')!) : undefined;

  let conditions: any[] = [];

  if (reportType) {
    conditions.push(eq(schema.generatedReports.reportType, reportType));
  }

  if (year) {
    conditions.push(eq(schema.generatedReports.periodYear, year));
  }

  const generatedReports = await db
    .select()
    .from(schema.generatedReports)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(schema.generatedReports.periodYear, schema.generatedReports.periodMonth);

  return c.json(generatedReports);
});

// GET /reports/generated/:id - Get a specific generated report
reports.get('/generated/:id', async (c) => {
  const { id } = c.req.param();

  const [report] = await db
    .select()
    .from(schema.generatedReports)
    .where(eq(schema.generatedReports.id, id))
    .limit(1);

  if (!report) {
    return c.json({ error: 'Report not found' }, 404);
  }

  return c.json(report);
});

// PUT /reports/generated/:id/status - Update report status (e.g., mark as submitted)
reports.put('/generated/:id/status', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { status } = body;

  if (!['generated', 'submitted', 'archived'].includes(status)) {
    return c.json({ error: 'Invalid status' }, 400);
  }

  const [updated] = await db
    .update(schema.generatedReports)
    .set({
      status,
      submittedAt: status === 'submitted' ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(schema.generatedReports.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Report not found' }, 404);
  }

  return c.json(updated);
});

export default reports;
