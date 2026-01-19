import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { formatRupiah, getIndonesianMonth } from './payroll.js';

interface PayslipPdfData {
  company: {
    name: string;
    npwp: string;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    logoUrl?: string | null;
  };
  employee: {
    employeeNumber: string;
    fullName: string;
    nik: string;
    npwp?: string | null;
    department?: string | null;
    position?: string | null;
  };
  payslip: {
    gajiPokok: string;
    tunjanganTransport: string | null;
    tunjanganMakan: string | null;
    tunjanganKomunikasi: string | null;
    tunjanganJabatan: string | null;
    tunjanganLainnya: string | null;
    bonus: string | null;
    overtime: string | null;
    reimbursements: string | null;
    grossSalary: string;
    bpjsKesehatanEmployee: string;
    bpjsJhtEmployee: string;
    bpjsJpEmployee: string;
    bpjsKesehatanEmployer: string;
    bpjsJhtEmployer: string;
    bpjsJpEmployer: string;
    bpjsJkkEmployer: string;
    bpjsJkmEmployer: string;
    pph21: string;
    ptkpStatus: string;
    otherDeductions: string | null;
    totalDeductions: string;
    netSalary: string;
  };
  payrollRun: {
    periodMonth: number;
    periodYear: number;
  };
}

export async function generatePayslipPdf(data: PayslipPdfData): Promise<Uint8Array> {
  const { company, employee, payslip, payrollRun } = data;
  
  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;
  
  const drawText = (text: string, x: number, yPos: number, options: { font?: typeof font; size?: number; color?: ReturnType<typeof rgb> } = {}) => {
    page.drawText(text, {
      x,
      y: yPos,
      font: options.font || font,
      size: options.size || 10,
      color: options.color || rgb(0, 0, 0),
    });
  };
  
  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });
  };
  
  // Header - Company Info
  drawText(company.name, margin, y, { font: fontBold, size: 16 });
  y -= 18;
  drawText(`NPWP: ${company.npwp}`, margin, y, { size: 9 });
  y -= 12;
  if (company.address) {
    drawText(company.address, margin, y, { size: 9 });
    y -= 12;
  }
  if (company.city || company.province) {
    drawText(`${company.city || ''} ${company.province || ''}`.trim(), margin, y, { size: 9 });
    y -= 12;
  }
  
  y -= 10;
  drawLine(margin, y, width - margin, y);
  y -= 20;
  
  // Title
  const title = 'PAYSLIP';
  const titleWidth = fontBold.widthOfTextAtSize(title, 14);
  drawText(title, (width - titleWidth) / 2, y, { font: fontBold, size: 14 });
  y -= 15;
  
  const period = `Period: ${getIndonesianMonth(payrollRun.periodMonth)} ${payrollRun.periodYear}`;
  const periodWidth = font.widthOfTextAtSize(period, 10);
  drawText(period, (width - periodWidth) / 2, y, { size: 10 });
  y -= 25;
  
  drawLine(margin, y, width - margin, y);
  y -= 20;
  
  // Employee Info
  const labelX = margin;
  const valueX = margin + 100;
  
  drawText('Name', labelX, y);
  drawText(`: ${employee.fullName}`, valueX, y);
  y -= 14;
  
  drawText('Employee #', labelX, y);
  drawText(`: ${employee.employeeNumber}`, valueX, y);
  y -= 14;
  
  drawText('NIK', labelX, y);
  drawText(`: ${employee.nik}`, valueX, y);
  y -= 14;
  
  if (employee.npwp) {
    drawText('NPWP', labelX, y);
    drawText(`: ${employee.npwp}`, valueX, y);
    y -= 14;
  }
  
  drawText('PTKP Status', labelX, y);
  drawText(`: ${payslip.ptkpStatus}`, valueX, y);
  y -= 14;
  
  if (employee.position) {
    drawText('Position', labelX, y);
    drawText(`: ${employee.position}`, valueX, y);
    y -= 14;
  }
  
  if (employee.department) {
    drawText('Department', labelX, y);
    drawText(`: ${employee.department}`, valueX, y);
    y -= 14;
  }
  
  y -= 10;
  drawLine(margin, y, width - margin, y);
  y -= 20;
  
  // Two columns: Earnings (left) and Deductions (right)
  const leftCol = margin;
  const rightCol = width / 2 + 20;
  const amountLeftCol = leftCol + 130;
  const amountRightCol = rightCol + 110;
  
  // Headers
  drawText('EARNINGS', leftCol, y, { font: fontBold, size: 11 });
  drawText('DEDUCTIONS', rightCol, y, { font: fontBold, size: 11 });
  y -= 18;
  
  // Earnings
  let earningsY = y;
  
  drawText('Base Salary', leftCol, earningsY);
  drawText(formatRupiah(parseFloat(payslip.gajiPokok)), amountLeftCol, earningsY);
  earningsY -= 14;
  
  const allowances = [
    { label: 'Transport Allow.', value: payslip.tunjanganTransport },
    { label: 'Meal Allow.', value: payslip.tunjanganMakan },
    { label: 'Comm. Allow.', value: payslip.tunjanganKomunikasi },
    { label: 'Position Allow.', value: payslip.tunjanganJabatan },
    { label: 'Other Allow.', value: payslip.tunjanganLainnya },
    { label: 'Bonus', value: payslip.bonus },
    { label: 'Overtime', value: payslip.overtime },
    { label: 'Reimbursement', value: payslip.reimbursements },
  ];
  
  for (const t of allowances) {
    const val = parseFloat(t.value || '0');
    if (val > 0) {
      drawText(t.label, leftCol, earningsY);
      drawText(formatRupiah(val), amountLeftCol, earningsY);
      earningsY -= 14;
    }
  }
  
  // Deductions
  let deductionsY = y;
  
  drawText('BPJS Health', rightCol, deductionsY);
  drawText(formatRupiah(parseFloat(payslip.bpjsKesehatanEmployee)), amountRightCol, deductionsY);
  deductionsY -= 14;
  
  drawText('BPJS JHT', rightCol, deductionsY);
  drawText(formatRupiah(parseFloat(payslip.bpjsJhtEmployee)), amountRightCol, deductionsY);
  deductionsY -= 14;
  
  drawText('BPJS JP', rightCol, deductionsY);
  drawText(formatRupiah(parseFloat(payslip.bpjsJpEmployee)), amountRightCol, deductionsY);
  deductionsY -= 14;
  
  drawText('PPh 21 (Tax)', rightCol, deductionsY);
  drawText(formatRupiah(parseFloat(payslip.pph21)), amountRightCol, deductionsY);
  deductionsY -= 14;
  
  const otherDed = parseFloat(payslip.otherDeductions || '0');
  if (otherDed > 0) {
    drawText('Other Deductions', rightCol, deductionsY);
    drawText(formatRupiah(otherDed), amountRightCol, deductionsY);
    deductionsY -= 14;
  }
  
  // Use the lower Y position
  y = Math.min(earningsY, deductionsY) - 10;
  
  // Totals
  drawLine(leftCol, y, leftCol + 180, y);
  drawLine(rightCol, y, rightCol + 170, y);
  y -= 16;
  
  drawText('Total Earnings', leftCol, y, { font: fontBold });
  drawText(formatRupiah(parseFloat(payslip.grossSalary)), amountLeftCol, y, { font: fontBold });
  
  drawText('Total Deductions', rightCol, y, { font: fontBold });
  drawText(formatRupiah(parseFloat(payslip.totalDeductions)), amountRightCol, y, { font: fontBold });
  
  y -= 25;
  drawLine(margin, y, width - margin, y);
  y -= 25;
  
  // Take Home Pay
  const thpLabel = 'TAKE HOME PAY:';
  const thpValue = formatRupiah(parseFloat(payslip.netSalary));
  drawText(thpLabel, margin, y, { font: fontBold, size: 12 });
  drawText(thpValue, margin + 120, y, { font: fontBold, size: 12 });
  
  y -= 30;
  drawLine(margin, y, width - margin, y);
  y -= 20;
  
  // Employer contributions (informational)
  drawText('Employer Contributions (for reference):', margin, y, { size: 9, color: rgb(0.4, 0.4, 0.4) });
  y -= 12;
  
  const employerContribs = [
    `BPJS Health: ${formatRupiah(parseFloat(payslip.bpjsKesehatanEmployer))}`,
    `JHT: ${formatRupiah(parseFloat(payslip.bpjsJhtEmployer))}`,
    `JP: ${formatRupiah(parseFloat(payslip.bpjsJpEmployer))}`,
    `JKK: ${formatRupiah(parseFloat(payslip.bpjsJkkEmployer))}`,
    `JKM: ${formatRupiah(parseFloat(payslip.bpjsJkmEmployer))}`,
  ];
  
  drawText(employerContribs.join(' | '), margin, y, { size: 8, color: rgb(0.4, 0.4, 0.4) });
  
  y -= 40;
  
  // Payment date
  const today = new Date();
  const paymentDate = `${getIndonesianMonth(today.getMonth() + 1)} ${today.getDate()}, ${today.getFullYear()}`;
  drawText(`Payment Date: ${paymentDate}`, margin, y, { size: 9 });
  
  y -= 50;
  
  // Signature
  drawText('HR Manager', width - margin - 80, y);
  drawLine(width - margin - 100, y - 3, width - margin - 20, y - 3);
  
  // Footer
  drawText('This document is electronically generated and valid without signature.', margin, 40, { size: 8, color: rgb(0.5, 0.5, 0.5) });
  
  return pdfDoc.save();
}

// SPT Masa PPh 21 (Form 1721) - Monthly Tax Return
export interface SPTMasaPPh21Data {
  company: {
    name: string;
    npwp: string;
    address?: string | null;
    city?: string | null;
    province?: string | null;
  };
  period: {
    month: number;
    year: number;
  };
  summary: {
    totalEmployees: number;
    totalGross: number;
    totalPph21: number;
  };
  employees: Array<{
    employeeNumber: string;
    fullName: string;
    nik: string;
    npwp?: string | null;
    grossSalary: number;
    pph21: number;
  }>;
}

export async function generateSPTMasaPPh21Pdf(data: SPTMasaPPh21Data): Promise<Uint8Array> {
  const { company, period, summary, employees } = data;
  
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;
  
  const drawText = (text: string, x: number, yPos: number, options: { font?: typeof font; size?: number; color?: ReturnType<typeof rgb> } = {}) => {
    page.drawText(text, {
      x,
      y: yPos,
      font: options.font || font,
      size: options.size || 10,
      color: options.color || rgb(0, 0, 0),
    });
  };
  
  const drawLine = (x1: number, y1: number, x2: number, y2: number, thickness = 1) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color: rgb(0, 0, 0),
    });
  };
  
  // Header - Form Title
  drawText('SURAT PEMBERITAHUAN TAHUNAN (SPT) MASA', margin, y, { font: fontBold, size: 14 });
  y -= 18;
  drawText('PAJAK PENGHASILAN PASAL 21 DAN/ATAU PASAL 26', margin, y, { font: fontBold, size: 14 });
  y -= 18;
  drawText('FORMULIR 1721', margin, y, { font: fontBold, size: 12 });
  y -= 30;
  
  // Company Information
  drawLine(margin, y, width - margin, y);
  y -= 20;
  drawText('IDENTITAS PEMOTONG PAJAK', margin, y, { font: fontBold, size: 11 });
  y -= 20;
  
  drawText('Nama:', margin, y);
  drawText(company.name, margin + 80, y);
  y -= 16;
  
  drawText('NPWP:', margin, y);
  drawText(company.npwp, margin + 80, y);
  y -= 16;
  
  if (company.address) {
    drawText('Alamat:', margin, y);
    drawText(company.address, margin + 80, y);
    y -= 16;
  }
  
  if (company.city || company.province) {
    drawText('Kota/Provinsi:', margin, y);
    drawText(`${company.city || ''} ${company.province || ''}`.trim(), margin + 80, y);
    y -= 20;
  }
  
  drawLine(margin, y, width - margin, y);
  y -= 20;
  
  // Period
  drawText('MASA PAJAK:', margin, y, { font: fontBold, size: 11 });
  drawText(`${getIndonesianMonth(period.month)} ${period.year}`, margin + 100, y, { font: fontBold, size: 11 });
  y -= 30;
  
  // Summary Section
  drawText('RINGKASAN PEMOTONGAN PPh PASAL 21', margin, y, { font: fontBold, size: 11 });
  y -= 20;
  
  drawLine(margin, y, width - margin, y);
  y -= 16;
  
  drawText('Jumlah Karyawan:', margin, y);
  drawText(summary.totalEmployees.toString(), width - margin - 100, y, { font: fontBold });
  y -= 16;
  
  drawText('Total Penghasilan Bruto:', margin, y);
  drawText(formatRupiah(summary.totalGross), width - margin - 100, y, { font: fontBold });
  y -= 16;
  
  drawText('Total PPh 21 yang Dipotong:', margin, y);
  drawText(formatRupiah(summary.totalPph21), width - margin - 100, y, { font: fontBold, size: 12 });
  y -= 25;
  
  drawLine(margin, y, width - margin, y, 2);
  y -= 25;
  
  // Employee Details Table
  drawText('RINCIAN PEMOTONGAN PER KARYAWAN', margin, y, { font: fontBold, size: 11 });
  y -= 20;
  
  // Table Header
  const tableY = y;
  const col1 = margin;
  const col2 = margin + 120;
  const col3 = margin + 250;
  const col4 = margin + 380;
  const col5 = width - margin - 80;
  
  drawLine(col1, tableY, col1, tableY - 20);
  drawLine(col2, tableY, col2, tableY - 20);
  drawLine(col3, tableY, col3, tableY - 20);
  drawLine(col4, tableY, col4, tableY - 20);
  drawLine(col5, tableY, col5, tableY - 20);
  drawLine(width - margin, tableY, width - margin, tableY - 20);
  
  drawText('No', col1 + 5, tableY - 15, { font: fontBold, size: 9 });
  drawText('Nama', col2 + 5, tableY - 15, { font: fontBold, size: 9 });
  drawText('NIK', col3 + 5, tableY - 15, { font: fontBold, size: 9 });
  drawText('NPWP', col4 + 5, tableY - 15, { font: fontBold, size: 9 });
  drawText('PPh 21', col5 + 5, tableY - 15, { font: fontBold, size: 9 });
  
  y = tableY - 20;
  drawLine(margin, y, width - margin, y);
  y -= 20;
  
  // Employee rows
  let rowNum = 1;
  for (const emp of employees) {
    if (y < 100) {
      // New page if needed
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin - 20;
      drawText(`${rowNum}.`, col1 + 5, y, { size: 9 });
      drawText(emp.fullName.substring(0, 20), col2 + 5, y, { size: 9 });
      drawText(emp.nik, col3 + 5, y, { size: 9 });
      drawText(emp.npwp || '-', col4 + 5, y, { size: 9 });
      drawText(formatRupiah(emp.pph21), col5 + 5, y, { size: 9 });
      y -= 20;
    } else {
      drawText(`${rowNum}.`, col1 + 5, y, { size: 9 });
      drawText(emp.fullName.substring(0, 20), col2 + 5, y, { size: 9 });
      drawText(emp.nik, col3 + 5, y, { size: 9 });
      drawText(emp.npwp || '-', col4 + 5, y, { size: 9 });
      drawText(formatRupiah(emp.pph21), col5 + 5, y, { size: 9 });
      y -= 20;
    }
    rowNum++;
  }
  
  // Footer
  y = 100;
  drawLine(margin, y, width - margin, y);
  y -= 30;
  
  const today = new Date();
  drawText(`Dibuat pada: ${today.toLocaleDateString('id-ID')}`, margin, y, { size: 9 });
  
  drawText('Tanda Tangan Pemotong Pajak', width - margin - 150, y, { size: 9 });
  y -= 50;
  drawLine(width - margin - 150, y, width - margin - 20, y);
  
  return pdfDoc.save();
}

// Bukti Potong PPh 21 - Form 1721-A1 (Yearly Withholding Slip)
export interface BuktiPotong1721A1Data {
  company: {
    name: string;
    npwp: string;
    address?: string | null;
    city?: string | null;
    province?: string | null;
  };
  employee: {
    employeeNumber: string;
    fullName: string;
    nik: string;
    npwp?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    ptkpStatus: string;
  };
  year: number;
  annualData: {
    totalGross: number;
    totalPph21: number;
    monthsWorked: number;
    monthlyBreakdown: Array<{
      month: number;
      grossSalary: number;
      pph21: number;
    }>;
  };
}

export async function generateBuktiPotong1721A1Pdf(data: BuktiPotong1721A1Data): Promise<Uint8Array> {
  const { company, employee, year, annualData } = data;
  
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;
  
  const drawText = (text: string, x: number, yPos: number, options: { font?: typeof font; size?: number; color?: ReturnType<typeof rgb> } = {}) => {
    page.drawText(text, {
      x,
      y: yPos,
      font: options.font || font,
      size: options.size || 10,
      color: options.color || rgb(0, 0, 0),
    });
  };
  
  const drawLine = (x1: number, y1: number, x2: number, y2: number, thickness = 1) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color: rgb(0, 0, 0),
    });
  };
  
  // Header - Form Title
  drawText('BUKTI PEMOTONGAN PAJAK PENGHASILAN', margin, y, { font: fontBold, size: 14 });
  y -= 18;
  drawText('PASAL 21 UNTUK WAJIB PAJAK TERTENTU', margin, y, { font: fontBold, size: 14 });
  y -= 18;
  drawText('FORMULIR 1721-A1', margin, y, { font: fontBold, size: 12 });
  y -= 30;
  
  drawLine(margin, y, width - margin, y);
  y -= 25;
  
  // Company Information (Pemotong Pajak)
  drawText('A. IDENTITAS PEMOTONG PAJAK', margin, y, { font: fontBold, size: 11 });
  y -= 20;
  
  drawText('1. Nama:', margin + 20, y);
  drawText(company.name, margin + 100, y);
  y -= 16;
  
  drawText('2. NPWP:', margin + 20, y);
  drawText(company.npwp, margin + 100, y);
  y -= 16;
  
  if (company.address) {
    drawText('3. Alamat:', margin + 20, y);
    drawText(company.address, margin + 100, y);
    y -= 16;
  }
  
  if (company.city || company.province) {
    drawText('4. Kota/Provinsi:', margin + 20, y);
    drawText(`${company.city || ''} ${company.province || ''}`.trim(), margin + 100, y);
    y -= 25;
  }
  
  drawLine(margin, y, width - margin, y);
  y -= 25;
  
  // Employee Information (Penerima Penghasilan)
  drawText('B. IDENTITAS PENERIMA PENGHASILAN', margin, y, { font: fontBold, size: 11 });
  y -= 20;
  
  drawText('1. Nama:', margin + 20, y);
  drawText(employee.fullName, margin + 100, y);
  y -= 16;
  
  drawText('2. NIK:', margin + 20, y);
  drawText(employee.nik, margin + 100, y);
  y -= 16;
  
  drawText('3. NPWP:', margin + 20, y);
  drawText(employee.npwp || '-', margin + 100, y);
  y -= 16;
  
  drawText('4. Status PTKP:', margin + 20, y);
  drawText(employee.ptkpStatus, margin + 100, y);
  y -= 16;
  
  if (employee.address) {
    drawText('5. Alamat:', margin + 20, y);
    drawText(employee.address, margin + 100, y);
    y -= 16;
  }
  
  y -= 20;
  drawLine(margin, y, width - margin, y);
  y -= 25;
  
  // Tax Year
  drawText(`C. TAHUN PAJAK: ${year}`, margin, y, { font: fontBold, size: 11 });
  y -= 30;
  
  // Annual Summary
  drawText('D. RINGKASAN PEMOTONGAN PPh PASAL 21', margin, y, { font: fontBold, size: 11 });
  y -= 25;
  
  drawText('1. Jumlah Bulan Bekerja:', margin + 20, y);
  drawText(`${annualData.monthsWorked} bulan`, width - margin - 100, y);
  y -= 18;
  
  drawText('2. Total Penghasilan Bruto:', margin + 20, y);
  drawText(formatRupiah(annualData.totalGross), width - margin - 100, y, { font: fontBold });
  y -= 18;
  
  drawText('3. Total PPh 21 yang Dipotong:', margin + 20, y);
  drawText(formatRupiah(annualData.totalPph21), width - margin - 100, y, { font: fontBold, size: 12 });
  y -= 30;
  
  drawLine(margin, y, width - margin, y, 2);
  y -= 25;
  
  // Monthly Breakdown
  drawText('E. RINCIAN BULANAN', margin, y, { font: fontBold, size: 11 });
  y -= 20;
  
  // Table Header
  const tableY = y;
  const col1 = margin + 20;
  const col2 = margin + 150;
  const col3 = width - margin - 150;
  const col4 = width - margin;
  
  drawText('Bulan', col1, tableY - 15, { font: fontBold, size: 9 });
  drawText('Penghasilan Bruto', col2, tableY - 15, { font: fontBold, size: 9 });
  drawText('PPh 21 Dipotong', col3, tableY - 15, { font: fontBold, size: 9 });
  
  y = tableY - 20;
  drawLine(margin, y, width - margin, y);
  y -= 20;
  
  // Monthly rows
  for (const monthData of annualData.monthlyBreakdown) {
    if (y < 100) {
      // New page if needed
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin - 20;
    }
    
    drawText(getIndonesianMonth(monthData.month), col1, y, { size: 9 });
    drawText(formatRupiah(monthData.grossSalary), col2, y, { size: 9 });
    drawText(formatRupiah(monthData.pph21), col3, y, { size: 9 });
    y -= 18;
  }
  
  // Total row
  y -= 5;
  drawLine(margin, y, width - margin, y);
  y -= 18;
  
  drawText('TOTAL', col1, y, { font: fontBold, size: 10 });
  drawText(formatRupiah(annualData.totalGross), col2, y, { font: fontBold, size: 10 });
  drawText(formatRupiah(annualData.totalPph21), col3, y, { font: fontBold, size: 10 });
  
  y -= 50;
  drawLine(margin, y, width - margin, y);
  y -= 30;
  
  // Signature
  const today = new Date();
  drawText(`Jakarta, ${today.toLocaleDateString('id-ID')}`, margin, y, { size: 9 });
  y -= 50;
  
  drawText('Pemotong Pajak', margin, y, { size: 9 });
  drawText('Penerima Penghasilan', width - margin - 150, y, { size: 9 });
  y -= 50;
  
  drawLine(margin, y, margin + 150, y);
  drawLine(width - margin - 150, y, width - margin, y);
  
  return pdfDoc.save();
}
