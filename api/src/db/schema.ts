import { pgTable, uuid, text, timestamp, decimal, integer, date, boolean, jsonb, index } from 'drizzle-orm/pg-core';

// Company settings
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  npwp: text('npwp').notNull(),
  address: text('address'),
  city: text('city'),
  province: text('province'),
  postalCode: text('postal_code'),
  phone: text('phone'),
  email: text('email'),
  logoUrl: text('logo_url'),
  jkkRiskLevel: decimal('jkk_risk_level', { precision: 4, scale: 2 }).default('0.24'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Users (authentication)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().$type<'admin' | 'hr' | 'employee' | 'accountant'>(),
  employeeId: uuid('employee_id').references(() => employees.id),
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Employees (HR data)
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Basic Info
  employeeNumber: text('employee_number').unique().notNull(),
  fullName: text('full_name').notNull(),
  email: text('email').unique().notNull(),
  phone: text('phone'),
  
  // Identity
  nik: text('nik').notNull(), // KTP number (16 digits)
  npwp: text('npwp'), // Personal tax ID
  
  // Tax Status
  ptkpStatus: text('ptkp_status').notNull().default('TK/0').$type<
    'TK/0' | 'TK/1' | 'TK/2' | 'TK/3' | 'K/0' | 'K/1' | 'K/2' | 'K/3' | 'K/I/0' | 'K/I/1' | 'K/I/2' | 'K/I/3'
  >(),
  
  // BPJS
  bpjsKesehatanNumber: text('bpjs_kesehatan_number'),
  bpjsKetenagakerjaanNumber: text('bpjs_ketenagakerjaan_number'),
  
  // Employment
  joinDate: date('join_date').notNull(),
  department: text('department'),
  position: text('position'),
  employmentType: text('employment_type').default('permanent').$type<'permanent' | 'contract' | 'probation'>(),
  
  // Bank Details
  bankName: text('bank_name'),
  bankAccountNumber: text('bank_account_number'),
  bankAccountName: text('bank_account_name'),
  
  // Address
  address: text('address'),
  city: text('city'),
  province: text('province'),
  postalCode: text('postal_code'),
  
  // Status
  status: text('status').default('active').$type<'active' | 'inactive' | 'terminated'>(),
  terminationDate: date('termination_date'),
  
  // Avatar
  avatarUrl: text('avatar_url'),
  
  // KTP (ID Card image)
  ktpUrl: text('ktp_url'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_employees_status').on(table.status),
]);

// Salary Components
export const salaryComponents = pgTable('salary_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  
  // Base Salary
  gajiPokok: decimal('gaji_pokok', { precision: 15, scale: 2 }).notNull(),
  
  // Allowances (Tunjangan)
  tunjanganTransport: decimal('tunjangan_transport', { precision: 15, scale: 2 }).default('0'),
  tunjanganMakan: decimal('tunjangan_makan', { precision: 15, scale: 2 }).default('0'),
  tunjanganKomunikasi: decimal('tunjangan_komunikasi', { precision: 15, scale: 2 }).default('0'),
  tunjanganJabatan: decimal('tunjangan_jabatan', { precision: 15, scale: 2 }).default('0'),
  tunjanganLainnya: decimal('tunjangan_lainnya', { precision: 15, scale: 2 }).default('0'),
  
  effectiveDate: date('effective_date').notNull(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Payroll Runs (monthly batch)
export const payrollRuns = pgTable('payroll_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  periodMonth: integer('period_month').notNull(),
  periodYear: integer('period_year').notNull(),
  
  status: text('status').default('draft').$type<'draft' | 'calculated' | 'approved' | 'paid'>(),
  
  totalGross: decimal('total_gross', { precision: 15, scale: 2 }),
  totalDeductions: decimal('total_deductions', { precision: 15, scale: 2 }),
  totalNet: decimal('total_net', { precision: 15, scale: 2 }),
  totalPph21: decimal('total_pph21', { precision: 15, scale: 2 }),
  totalBpjsEmployee: decimal('total_bpjs_employee', { precision: 15, scale: 2 }),
  totalBpjsEmployer: decimal('total_bpjs_employer', { precision: 15, scale: 2 }),
  
  notes: text('notes'),
  
  calculatedAt: timestamp('calculated_at', { withTimezone: true }),
  calculatedBy: uuid('calculated_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: uuid('approved_by').references(() => users.id),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  paidBy: uuid('paid_by').references(() => users.id),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_payroll_runs_period').on(table.periodYear, table.periodMonth),
]);

// Individual Payslips
export const payslips = pgTable('payslips', {
  id: uuid('id').primaryKey().defaultRandom(),
  payrollRunId: uuid('payroll_run_id').notNull().references(() => payrollRuns.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  
  // Earnings
  gajiPokok: decimal('gaji_pokok', { precision: 15, scale: 2 }).notNull(),
  tunjanganTransport: decimal('tunjangan_transport', { precision: 15, scale: 2 }).default('0'),
  tunjanganMakan: decimal('tunjangan_makan', { precision: 15, scale: 2 }).default('0'),
  tunjanganKomunikasi: decimal('tunjangan_komunikasi', { precision: 15, scale: 2 }).default('0'),
  tunjanganJabatan: decimal('tunjangan_jabatan', { precision: 15, scale: 2 }).default('0'),
  tunjanganLainnya: decimal('tunjangan_lainnya', { precision: 15, scale: 2 }).default('0'),
  bonus: decimal('bonus', { precision: 15, scale: 2 }).default('0'),
  overtime: decimal('overtime', { precision: 15, scale: 2 }).default('0'),
  reimbursements: decimal('reimbursements', { precision: 15, scale: 2 }).default('0'),
  
  grossSalary: decimal('gross_salary', { precision: 15, scale: 2 }).notNull(),
  
  // BPJS Employee Deductions
  bpjsKesehatanEmployee: decimal('bpjs_kesehatan_employee', { precision: 15, scale: 2 }).notNull(),
  bpjsJhtEmployee: decimal('bpjs_jht_employee', { precision: 15, scale: 2 }).notNull(),
  bpjsJpEmployee: decimal('bpjs_jp_employee', { precision: 15, scale: 2 }).notNull(),
  
  // BPJS Employer Contributions (for records)
  bpjsKesehatanEmployer: decimal('bpjs_kesehatan_employer', { precision: 15, scale: 2 }).notNull(),
  bpjsJhtEmployer: decimal('bpjs_jht_employer', { precision: 15, scale: 2 }).notNull(),
  bpjsJpEmployer: decimal('bpjs_jp_employer', { precision: 15, scale: 2 }).notNull(),
  bpjsJkkEmployer: decimal('bpjs_jkk_employer', { precision: 15, scale: 2 }).notNull(),
  bpjsJkmEmployer: decimal('bpjs_jkm_employer', { precision: 15, scale: 2 }).notNull(),
  
  // Tax
  pph21: decimal('pph21', { precision: 15, scale: 2 }).notNull(),
  ptkpStatus: text('ptkp_status').notNull(),
  
  // Other Deductions
  otherDeductions: decimal('other_deductions', { precision: 15, scale: 2 }).default('0'),
  deductionNotes: text('deduction_notes'),
  
  // Totals
  totalDeductions: decimal('total_deductions', { precision: 15, scale: 2 }).notNull(),
  netSalary: decimal('net_salary', { precision: 15, scale: 2 }).notNull(),
  
  // PDF
  pdfUrl: text('pdf_url'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_payslips_employee').on(table.employeeId),
  index('idx_payslips_payroll_run').on(table.payrollRunId),
]);

// Expenses / Reimbursements
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  
  title: text('title').notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  category: text('category').notNull().$type<'transport' | 'meals' | 'accommodation' | 'supplies' | 'training' | 'medical' | 'other'>(),
  
  expenseDate: date('expense_date').notNull(),
  receiptUrl: text('receipt_url'),
  
  status: text('status').default('pending').$type<'pending' | 'approved' | 'rejected' | 'reimbursed'>(),
  
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNotes: text('review_notes'),
  
  // Link to payroll for reimbursement
  payslipId: uuid('payslip_id').references(() => payslips.id),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_expenses_employee').on(table.employeeId),
  index('idx_expenses_status').on(table.status),
]);

// Invitations
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('employee').$type<'admin' | 'hr' | 'employee' | 'accountant'>(),
  token: text('token').unique().notNull(),
  
  status: text('status').default('pending').$type<'pending' | 'accepted' | 'expired' | 'cancelled'>(),
  
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  acceptedBy: uuid('accepted_by').references(() => users.id),
  
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Audit Log
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_audit_log_entity').on(table.entityType, table.entityId),
]);

// Refresh Tokens
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Generated Reports (automated monthly tax reports)
export const generatedReports = pgTable('generated_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportType: text('report_type').notNull().$type<'spt_masa_pph21' | 'bukti_potong_1721a1'>(),
  periodMonth: integer('period_month').notNull(),
  periodYear: integer('period_year').notNull(),
  pdfUrl: text('pdf_url').notNull(),
  employeeId: uuid('employee_id').references(() => employees.id), // null for company-wide reports
  status: text('status').default('generated').$type<'generated' | 'submitted' | 'archived'>(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_generated_reports_period').on(table.periodYear, table.periodMonth),
  index('idx_generated_reports_type').on(table.reportType),
]);
