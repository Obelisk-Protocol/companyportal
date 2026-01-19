import cron from 'node-cron';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { generateSPTMasaPPh21Pdf } from '../utils/pdf.js';
import { uploadToR2, generateFileKey } from '../utils/r2.js';
import { getIndonesianMonth } from '../utils/payroll.js';

/**
 * Generate SPT Masa PPh 21 report for a specific month/year
 */
async function generateMonthlySPTReport(month: number, year: number): Promise<void> {
  try {
    console.log(`[Report Scheduler] Generating SPT Masa PPh 21 for ${getIndonesianMonth(month)} ${year}...`);

    // Check if report already exists
    const [existing] = await db
      .select()
      .from(schema.generatedReports)
      .where(
        and(
          eq(schema.generatedReports.reportType, 'spt_masa_pph21'),
          eq(schema.generatedReports.periodMonth, month),
          eq(schema.generatedReports.periodYear, year)
        )
      )
      .limit(1);

    if (existing) {
      console.log(`[Report Scheduler] Report already exists for ${getIndonesianMonth(month)} ${year}, skipping...`);
      return;
    }

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
      console.log(`[Report Scheduler] No payroll run found for ${getIndonesianMonth(month)} ${year}, skipping...`);
      return;
    }

    // Get company info
    const [company] = await db.select().from(schema.companies).limit(1);
    if (!company) {
      console.log(`[Report Scheduler] Company information not found, skipping...`);
      return;
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

    if (payslips.length === 0) {
      console.log(`[Report Scheduler] No payslips found for ${getIndonesianMonth(month)} ${year}, skipping...`);
      return;
    }

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

    // Save to database
    await db.insert(schema.generatedReports).values({
      reportType: 'spt_masa_pph21',
      periodMonth: month,
      periodYear: year,
      pdfUrl: url,
      status: 'generated',
      generatedAt: new Date(),
    });

    console.log(`[Report Scheduler] ✅ Successfully generated SPT Masa PPh 21 for ${getIndonesianMonth(month)} ${year}`);
  } catch (error) {
    console.error(`[Report Scheduler] ❌ Error generating report for ${getIndonesianMonth(month)} ${year}:`, error);
  }
}

/**
 * Initialize the report scheduler
 * Runs on the 1st of each month at 2:00 AM to generate the previous month's report
 */
export function startReportScheduler(): void {
  console.log('[Report Scheduler] Starting automated report generation scheduler...');

  // Run on the 1st of each month at 2:00 AM
  // This generates the report for the previous month
  cron.schedule('0 2 1 * *', async () => {
    const now = new Date();
    // JavaScript months are 0-indexed, so we need to adjust
    const previousMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    console.log(`[Report Scheduler] Scheduled job triggered for ${getIndonesianMonth(previousMonth)} ${previousYear}`);
    await generateMonthlySPTReport(previousMonth, previousYear);
  });

  // Also run on server start to catch up on any missed reports
  // Check if we need to generate last month's report
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1; // Convert to 1-indexed
  
  // If it's past the 1st, generate last month's report if it doesn't exist
  if (currentDay > 1) {
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastYear = currentMonth === 1 ? now.getFullYear() - 1 : now.getFullYear();
    
    setTimeout(async () => {
      console.log(`[Report Scheduler] Checking for missed reports...`);
      await generateMonthlySPTReport(lastMonth, lastYear);
    }, 5000); // Wait 5 seconds after server start
  }

  console.log('[Report Scheduler] ✅ Scheduler started. Reports will be generated on the 1st of each month at 2:00 AM');
}
