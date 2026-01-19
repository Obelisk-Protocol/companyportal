// Indonesian Payroll Calculation Utilities

export type PTKPStatus = 
  | 'TK/0' | 'TK/1' | 'TK/2' | 'TK/3' 
  | 'K/0' | 'K/1' | 'K/2' | 'K/3'
  | 'K/I/0' | 'K/I/1' | 'K/I/2' | 'K/I/3';

// PTKP values (annual) - 2024
export const PTKP: Record<PTKPStatus, number> = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0': 58_500_000,
  'K/1': 63_000_000,
  'K/2': 67_500_000,
  'K/3': 72_000_000,
  'K/I/0': 112_500_000,
  'K/I/1': 117_000_000,
  'K/I/2': 121_500_000,
  'K/I/3': 126_000_000,
};

// Progressive tax brackets (2024)
const TAX_BRACKETS = [
  { limit: 60_000_000, rate: 0.05 },
  { limit: 250_000_000, rate: 0.15 },
  { limit: 500_000_000, rate: 0.25 },
  { limit: 5_000_000_000, rate: 0.30 },
  { limit: Infinity, rate: 0.35 },
];

// BPJS Rates
export const BPJS_RATES = {
  kesehatan: {
    employee: 0.01,
    employer: 0.04,
    cap: 12_000_000, // Monthly salary cap
  },
  jht: {
    employee: 0.02,
    employer: 0.037,
    cap: null, // No cap
  },
  jp: {
    employee: 0.01,
    employer: 0.02,
    cap: 9_559_600, // 2024 cap
  },
  jkk: {
    employee: 0,
    employer: 0.0024, // Default rate (varies by industry 0.24% - 1.74%)
    cap: null,
  },
  jkm: {
    employee: 0,
    employer: 0.003,
    cap: null,
  },
};

export interface PPh21Input {
  grossMonthly: number;
  ptkpStatus: PTKPStatus;
  bpjsDeductions: number; // Employee BPJS deductions are tax-deductible
}

export interface PPh21Result {
  annualGross: number;
  biayaJabatan: number;
  bpjsDeductible: number;
  nettoAnnual: number;
  ptkp: number;
  pkpAnnual: number;
  annualTax: number;
  monthlyTax: number;
}

/**
 * Calculate PPh 21 (Indonesian Income Tax)
 * Uses TER (Tarif Efektif Rata-rata) method for simplicity
 */
export function calculatePPh21(input: PPh21Input): PPh21Result {
  const { grossMonthly, ptkpStatus, bpjsDeductions } = input;
  
  // Annualize income
  const annualGross = grossMonthly * 12;
  
  // Biaya jabatan (occupational expense deduction) - 5% max Rp 6,000,000/year
  const biayaJabatan = Math.min(annualGross * 0.05, 6_000_000);
  
  // BPJS employee contributions are tax-deductible
  const bpjsDeductible = bpjsDeductions * 12;
  
  // Netto income
  const nettoAnnual = annualGross - biayaJabatan - bpjsDeductible;
  
  // Penghasilan Kena Pajak (taxable income)
  const ptkp = PTKP[ptkpStatus] || PTKP['TK/0'];
  const pkpAnnual = Math.max(0, nettoAnnual - ptkp);
  
  // Calculate progressive tax
  let annualTax = 0;
  let remaining = pkpAnnual;
  let previousLimit = 0;
  
  for (const bracket of TAX_BRACKETS) {
    const bracketAmount = Math.min(remaining, bracket.limit - previousLimit);
    if (bracketAmount <= 0) break;
    annualTax += bracketAmount * bracket.rate;
    remaining -= bracketAmount;
    previousLimit = bracket.limit;
  }
  
  // Monthly tax
  const monthlyTax = Math.round(annualTax / 12);
  
  return {
    annualGross,
    biayaJabatan,
    bpjsDeductible,
    nettoAnnual,
    ptkp,
    pkpAnnual,
    annualTax,
    monthlyTax,
  };
}

export interface BPJSInput {
  grossSalary: number;
  jkkRate?: number; // Company-specific JKK rate (0.24% - 1.74%)
}

export interface BPJSResult {
  employee: {
    kesehatan: number;
    jht: number;
    jp: number;
    total: number;
  };
  employer: {
    kesehatan: number;
    jht: number;
    jp: number;
    jkk: number;
    jkm: number;
    total: number;
  };
}

/**
 * Calculate BPJS contributions
 */
export function calculateBPJS(input: BPJSInput): BPJSResult {
  const { grossSalary, jkkRate = 0.0024 } = input;
  
  // Capped bases
  const kesehatanBase = Math.min(grossSalary, BPJS_RATES.kesehatan.cap);
  const jpBase = Math.min(grossSalary, BPJS_RATES.jp.cap);
  
  const employee = {
    kesehatan: Math.round(kesehatanBase * BPJS_RATES.kesehatan.employee),
    jht: Math.round(grossSalary * BPJS_RATES.jht.employee),
    jp: Math.round(jpBase * BPJS_RATES.jp.employee),
    total: 0,
  };
  employee.total = employee.kesehatan + employee.jht + employee.jp;
  
  const employer = {
    kesehatan: Math.round(kesehatanBase * BPJS_RATES.kesehatan.employer),
    jht: Math.round(grossSalary * BPJS_RATES.jht.employer),
    jp: Math.round(jpBase * BPJS_RATES.jp.employer),
    jkk: Math.round(grossSalary * jkkRate),
    jkm: Math.round(grossSalary * BPJS_RATES.jkm.employer),
    total: 0,
  };
  employer.total = employer.kesehatan + employer.jht + employer.jp + employer.jkk + employer.jkm;
  
  return { employee, employer };
}

export interface SalaryComponents {
  gajiPokok: number;
  tunjanganTransport: number;
  tunjanganMakan: number;
  tunjanganKomunikasi: number;
  tunjanganJabatan: number;
  tunjanganLainnya: number;
  bonus?: number;
  overtime?: number;
  reimbursements?: number;
}

export interface PayslipCalculation {
  // Earnings
  earnings: SalaryComponents;
  grossSalary: number;
  
  // BPJS
  bpjs: BPJSResult;
  
  // Tax
  pph21: PPh21Result;
  
  // Other deductions
  otherDeductions: number;
  
  // Totals
  totalDeductions: number;
  netSalary: number;
}

/**
 * Calculate complete payslip
 */
export function calculatePayslip(
  components: SalaryComponents,
  ptkpStatus: PTKPStatus,
  jkkRate: number = 0.0024,
  otherDeductions: number = 0
): PayslipCalculation {
  // Calculate gross
  const grossSalary = 
    components.gajiPokok +
    components.tunjanganTransport +
    components.tunjanganMakan +
    components.tunjanganKomunikasi +
    components.tunjanganJabatan +
    components.tunjanganLainnya +
    (components.bonus || 0) +
    (components.overtime || 0) +
    (components.reimbursements || 0);
  
  // Calculate BPJS
  const bpjs = calculateBPJS({ grossSalary, jkkRate });
  
  // Calculate PPh 21
  const pph21 = calculatePPh21({
    grossMonthly: grossSalary,
    ptkpStatus,
    bpjsDeductions: bpjs.employee.total,
  });
  
  // Total deductions
  const totalDeductions = bpjs.employee.total + pph21.monthlyTax + otherDeductions;
  
  // Net salary
  const netSalary = grossSalary - totalDeductions;
  
  return {
    earnings: components,
    grossSalary,
    bpjs,
    pph21,
    otherDeductions,
    totalDeductions,
    netSalary,
  };
}

/**
 * Format currency to Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get month name in English
 */
export function getIndonesianMonth(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}
