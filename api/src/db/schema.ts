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
  solanaWallet: text('solana_wallet'), // Solana wallet address for crypto payments
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Users (authentication)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().$type<'admin' | 'hr' | 'employee' | 'accountant' | 'client'>(),
  employeeId: uuid('employee_id').references(() => employees.id),
  // CRM client links
  companyId: uuid('company_id').references(() => crmCompanies.id),
  individualClientId: uuid('individual_client_id').references(() => individualClients.id),
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

// Invitations (defined after CRM tables for references)
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('employee').$type<'admin' | 'hr' | 'employee' | 'accountant' | 'client'>(),
  token: text('token').unique().notNull(),
  
  // Link to CRM clients (for client invitations) - references added after table definitions
  companyId: uuid('company_id'),
  individualClientId: uuid('individual_client_id'),
  
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

// CRM: Client Companies
export const crmCompanies = pgTable('crm_companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Company Information
  name: text('name').notNull(), // Trading name
  legalName: text('legal_name'), // Legal/registered name
  companyType: text('company_type').$type<'PT' | 'CV' | 'Firma' | 'UD' | 'Other'>(),
  
  // Tax & Registration
  npwp: text('npwp'), // Tax ID
  nib: text('nib'), // Business Identification Number
  
  // Contact Information
  address: text('address'),
  city: text('city'),
  province: text('province'),
  postalCode: text('postal_code'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  
  // Business Details
  industry: text('industry'), // Industry/sector
  size: integer('size'), // Employee count
  
  // Payment Information
  solanaWallet: text('solana_wallet'), // Solana wallet address for crypto payments
  
  // Status
  status: text('status').default('active').$type<'active' | 'inactive' | 'prospect' | 'lead'>(),
  registrationDate: date('registration_date'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_crm_companies_status').on(table.status),
  index('idx_crm_companies_name').on(table.name),
]);

// CRM: Individual Clients
export const individualClients = pgTable('individual_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Personal Information
  fullName: text('full_name').notNull(),
  nik: text('nik'), // ID Card Number (16 digits)
  npwp: text('npwp'), // Personal tax ID (if applicable)
  
  // Contact Information
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  province: text('province'),
  postalCode: text('postal_code'),
  
  // Additional Details
  dateOfBirth: date('date_of_birth'),
  occupation: text('occupation'),
  
  // Payment Information
  solanaWallet: text('solana_wallet'), // Solana wallet address for crypto payments
  
  // Status
  status: text('status').default('active').$type<'active' | 'inactive' | 'prospect'>(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_individual_clients_status').on(table.status),
  index('idx_individual_clients_name').on(table.fullName),
]);

// CRM: Company Contacts
export const companyContacts = pgTable('company_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => crmCompanies.id, { onDelete: 'cascade' }),
  
  // Contact Details
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  position: text('position'), // Role (CEO, CFO, HR Manager, etc.)
  
  // Flags
  isPrimary: boolean('is_primary').default(false),
  
  // Notes
  notes: text('notes'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_company_contacts_company').on(table.companyId),
]);

// Contracts - Agreements between company and clients/employees
export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Reference to either client (company/individual) or employee
  companyId: uuid('company_id').references(() => crmCompanies.id, { onDelete: 'cascade' }),
  individualClientId: uuid('individual_client_id').references(() => individualClients.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
  
  // Contract type indicator
  contractCategory: text('contract_category').default('client').$type<'client' | 'employee'>(),
  
  // Contract details
  title: text('title').notNull(),
  contractNumber: text('contract_number').unique().notNull(), // e.g., CONTRACT-2024-001
  description: text('description'),
  contractType: text('contract_type').$type<'service' | 'consulting' | 'maintenance' | 'retainer' | 'project' | 'employment' | 'nda' | 'confidentiality' | 'other'>(),
  
  // Terms
  startDate: date('start_date').notNull(),
  endDate: date('end_date'), // null for open-ended contracts
  value: decimal('value', { precision: 15, scale: 2 }), // Total contract value (optional for employee contracts)
  currency: text('currency').default('IDR'),
  paymentTerms: text('payment_terms'), // e.g., "Net 30", "50% upfront, 50% on completion"
  
  // Status and signing
  status: text('status').default('draft').$type<'draft' | 'sent' | 'signed' | 'active' | 'expired' | 'terminated' | 'cancelled'>(),
  
  // Document
  documentUrl: text('document_url'), // PDF of the contract
  signedDocumentUrl: text('signed_document_url'), // PDF with signatures
  
  // Signing information (for clients)
  signedByClientAt: timestamp('signed_by_client_at', { withTimezone: true }),
  signedByClientUserId: uuid('signed_by_client_user_id').references(() => users.id),
  
  // Signing information (for employees)
  signedByEmployeeAt: timestamp('signed_by_employee_at', { withTimezone: true }),
  signedByEmployeeUserId: uuid('signed_by_employee_user_id').references(() => users.id),
  
  // Company signing
  signedByCompanyAt: timestamp('signed_by_company_at', { withTimezone: true }),
  signedByCompanyUserId: uuid('signed_by_company_user_id').references(() => users.id),
  
  // Signature fields (DocuSign-style) - designated positions for signatures
  signatureFields: jsonb('signature_fields'), // { clientSignatureField?: { pageIndex, x, y, width, height, label }, companySignatureField?: { pageIndex, x, y, width, height, label } }
  
  // Signature data (stored as JSON) - can be from client or employee
  clientSignature: jsonb('client_signature'), // { name, signature (base64), signedAt, ipAddress }
  employeeSignature: jsonb('employee_signature'), // { name, signature (base64), signedAt, ipAddress }
  companySignature: jsonb('company_signature'), // { name, signature (base64), signedAt, ipAddress, signedByUserId }
  
  // Notes and metadata
  notes: text('notes'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_contracts_company').on(table.companyId),
  index('idx_contracts_individual').on(table.individualClientId),
  index('idx_contracts_employee').on(table.employeeId),
  index('idx_contracts_status').on(table.status),
  index('idx_contracts_number').on(table.contractNumber),
  index('idx_contracts_category').on(table.contractCategory),
]);

// Invoices - Bills sent to clients
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Client reference (either company or individual)
  companyId: uuid('company_id').references(() => crmCompanies.id, { onDelete: 'cascade' }),
  individualClientId: uuid('individual_client_id').references(() => individualClients.id, { onDelete: 'cascade' }),
  
  // Invoice details
  invoiceNumber: text('invoice_number').unique().notNull(), // e.g., INV-2024-001
  invoiceDate: date('invoice_date').notNull(),
  dueDate: date('due_date').notNull(),
  
  // Reference to contract (optional)
  contractId: uuid('contract_id').references(() => contracts.id),
  
  // Line items stored as JSON
  lineItems: jsonb('line_items').notNull(), // Array of { description, quantity, unitPrice, amount }
  
  // Totals
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'), // e.g., 11 for 11%
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).default('0'),
  discount: decimal('discount', { precision: 15, scale: 2 }).default('0'),
  total: decimal('total', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').default('IDR'),
  
  // Payment information
  paymentTerms: text('payment_terms'), // e.g., "Net 30", "Due on receipt"
  paymentStatus: text('payment_status').default('pending').$type<'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'>(),
  paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }).default('0'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  
  // Payment method (if paid)
  paymentMethod: text('payment_method').$type<'bank_transfer' | 'cash' | 'crypto' | 'other'>(),
  paymentReference: text('payment_reference'), // Transaction ID, reference number, etc.
  
  // Document
  pdfUrl: text('pdf_url'), // Generated PDF invoice
  
  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'), // Only visible to admin/HR
  
  // Metadata
  createdBy: uuid('created_by').notNull().references(() => users.id),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_invoices_company').on(table.companyId),
  index('idx_invoices_individual').on(table.individualClientId),
  index('idx_invoices_contract').on(table.contractId),
  index('idx_invoices_status').on(table.paymentStatus),
  index('idx_invoices_number').on(table.invoiceNumber),
  index('idx_invoices_date').on(table.invoiceDate),
]);

// --- Grants (transparency for Superteam / grantors) ---

// Grant - one per funding round/project
export const grants = pgTable('grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(), // URL-friendly: creatix-events-grant
  description: text('description'),
  status: text('status').default('draft').$type<'draft' | 'active' | 'closed' | 'archived'>(),
  currency: text('currency').default('SOL'),
  expectedAmount: decimal('expected_amount', { precision: 20, scale: 9 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_grants_status').on(table.status),
  index('idx_grants_created_by').on(table.createdBy),
  index('idx_grants_slug').on(table.slug),
]);

// Grant wallet - the wallet that received funds (one per grant for v1)
export const grantWallets = pgTable('grant_wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  grantId: uuid('grant_id').notNull().references(() => grants.id, { onDelete: 'cascade' }),
  walletAddress: text('wallet_address').notNull(),
  label: text('label'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_grant_wallets_grant').on(table.grantId),
]);

// Wallet audit - on-chain snapshot per audit run
export const walletAudits = pgTable('wallet_audits', {
  id: uuid('id').primaryKey().defaultRandom(),
  grantId: uuid('grant_id').notNull().references(() => grants.id, { onDelete: 'cascade' }),
  walletAddress: text('wallet_address').notNull(),
  auditRunAt: timestamp('audit_run_at', { withTimezone: true }).notNull(),
  totalInbound: decimal('total_inbound', { precision: 20, scale: 9 }).default('0'),
  totalOutbound: decimal('total_outbound', { precision: 20, scale: 9 }).default('0'),
  balanceAtAudit: decimal('balance_at_audit', { precision: 20, scale: 9 }),
  balanceUsdc: decimal('balance_usdc', { precision: 20, scale: 6 }),
  transactionCount: integer('transaction_count').default(0),
  rawData: jsonb('raw_data'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_wallet_audits_grant').on(table.grantId),
  index('idx_wallet_audits_run_at').on(table.auditRunAt),
]);

// Grant deduction - fees, tax, operational
export const grantDeductions = pgTable('grant_deductions', {
  id: uuid('id').primaryKey().defaultRandom(),
  grantId: uuid('grant_id').notNull().references(() => grants.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 20, scale: 9 }).notNull(),
  currency: text('currency').default('SOL'),
  category: text('category').notNull().$type<'platform_fee' | 'tax' | 'operational' | 'other'>(),
  description: text('description'),
  deductedAt: date('deducted_at').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_grant_deductions_grant').on(table.grantId),
]);

// Grant member - founders/owners (existing users)
export const grantMembers = pgTable('grant_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  grantId: uuid('grant_id').notNull().references(() => grants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().$type<'owner' | 'founder' | 'viewer'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_grant_members_grant').on(table.grantId),
  index('idx_grant_members_user').on(table.userId),
]);