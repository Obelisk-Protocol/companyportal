# 🇮🇩 Indonesian Company Portal - Architecture

## Overview

A self-hosted payroll and HR management system for Indonesian PT (Perseroan Terbatas) companies, fully compliant with Indonesian tax and social security regulations.

---

## Tech Stack

| Layer | Technology | Hosting |
|-------|------------|---------|
| **Frontend** | React + TypeScript + Vite | Cloudflare Pages |
| **API Server** | Hono.js (TypeScript) | Railway |
| **Database** | PostgreSQL | Railway |
| **File Storage** | Cloudflare R2 | Cloudflare |
| **PDF Generation** | @react-pdf/renderer | Server-side |
| **Auth** | JWT + bcrypt | Self-managed |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE                                │
│  ┌─────────────────┐    ┌─────────────────────────────────┐     │
│  │  Pages (CDN)    │    │         R2 Bucket               │     │
│  │  React SPA      │    │  - Receipt images               │     │
│  │  Static Assets  │    │  - Payslip PDFs                 │     │
│  └────────┬────────┘    │  - Employee documents           │     │
│           │             └─────────────────────────────────┘     │
└───────────┼─────────────────────────────────────────────────────┘
            │ HTTPS
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RAILWAY                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Hono.js API                           │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │   Auth   │ │ Payroll  │ │ Expenses │ │ Reports  │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │                   PostgreSQL                             │    │
│  │  employees, payroll_runs, payslips, expenses, etc.      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Indonesian Payroll Compliance

### 1. PPh 21 (Income Tax) - Progressive Rates 2024

```
Annual Taxable Income (PKP)         Rate
─────────────────────────────────────────
≤ Rp 60,000,000                      5%
> Rp 60,000,000 - Rp 250,000,000    15%
> Rp 250,000,000 - Rp 500,000,000   25%
> Rp 500,000,000 - Rp 5,000,000,000 30%
> Rp 5,000,000,000                  35%
```

### 2. PTKP (Non-Taxable Income) - 2024

| Status | Annual PTKP |
|--------|-------------|
| TK/0 (Single, no dependents) | Rp 54,000,000 |
| TK/1 | Rp 58,500,000 |
| TK/2 | Rp 63,000,000 |
| TK/3 | Rp 67,500,000 |
| K/0 (Married, no dependents) | Rp 58,500,000 |
| K/1 | Rp 63,000,000 |
| K/2 | Rp 67,500,000 |
| K/3 | Rp 72,000,000 |

### 3. BPJS Kesehatan (Health Insurance)

| Component | Employee | Employer | Cap |
|-----------|----------|----------|-----|
| Kesehatan | 1% | 4% | Rp 12,000,000/month |

### 4. BPJS Ketenagakerjaan (Employment Insurance)

| Component | Employee | Employer | Cap |
|-----------|----------|----------|-----|
| JHT (Old Age Savings) | 2% | 3.7% | No cap |
| JP (Pension) | 1% | 2% | Rp 9,559,600/month (2024) |
| JKK (Work Accident) | 0% | 0.24-1.74% | No cap |
| JKM (Death Insurance) | 0% | 0.3% | No cap |

---

## Database Schema

### Core Tables

```sql
-- Company settings
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  npwp TEXT NOT NULL,                    -- Tax ID
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  jkk_risk_level DECIMAL(4,2) DEFAULT 0.24,  -- JKK rate based on industry
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (authentication)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'hr', 'employee')),
  employee_id UUID REFERENCES employees(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees (HR data)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  employee_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- Identity
  nik TEXT NOT NULL,                     -- KTP number (16 digits)
  npwp TEXT,                             -- Personal tax ID
  
  -- Tax Status
  ptkp_status TEXT NOT NULL DEFAULT 'TK/0' 
    CHECK (ptkp_status IN ('TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3','K/I/0','K/I/1','K/I/2','K/I/3')),
  
  -- BPJS
  bpjs_kesehatan_number TEXT,
  bpjs_ketenagakerjaan_number TEXT,
  
  -- Employment
  join_date DATE NOT NULL,
  department TEXT,
  position TEXT,
  employment_type TEXT DEFAULT 'permanent' 
    CHECK (employment_type IN ('permanent', 'contract', 'probation')),
  
  -- Bank Details
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  termination_date DATE,
  
  -- Avatar
  avatar_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Components
CREATE TABLE salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  
  -- Base Salary
  gaji_pokok DECIMAL(15,2) NOT NULL,     -- Basic salary
  
  -- Allowances (Tunjangan)
  tunjangan_transport DECIMAL(15,2) DEFAULT 0,
  tunjangan_makan DECIMAL(15,2) DEFAULT 0,
  tunjangan_komunikasi DECIMAL(15,2) DEFAULT 0,
  tunjangan_jabatan DECIMAL(15,2) DEFAULT 0,
  tunjangan_lainnya DECIMAL(15,2) DEFAULT 0,
  
  effective_date DATE NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(employee_id, effective_date)
);

-- Payroll Runs (monthly batch)
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  
  status TEXT DEFAULT 'draft' 
    CHECK (status IN ('draft', 'calculated', 'approved', 'paid')),
  
  total_gross DECIMAL(15,2),
  total_deductions DECIMAL(15,2),
  total_net DECIMAL(15,2),
  total_pph21 DECIMAL(15,2),
  total_bpjs_employee DECIMAL(15,2),
  total_bpjs_employer DECIMAL(15,2),
  
  notes TEXT,
  
  calculated_at TIMESTAMPTZ,
  calculated_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(period_month, period_year)
);

-- Individual Payslips
CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  
  -- Earnings
  gaji_pokok DECIMAL(15,2) NOT NULL,
  tunjangan_transport DECIMAL(15,2) DEFAULT 0,
  tunjangan_makan DECIMAL(15,2) DEFAULT 0,
  tunjangan_komunikasi DECIMAL(15,2) DEFAULT 0,
  tunjangan_jabatan DECIMAL(15,2) DEFAULT 0,
  tunjangan_lainnya DECIMAL(15,2) DEFAULT 0,
  bonus DECIMAL(15,2) DEFAULT 0,
  overtime DECIMAL(15,2) DEFAULT 0,
  
  gross_salary DECIMAL(15,2) NOT NULL,
  
  -- BPJS Employee Deductions
  bpjs_kesehatan_employee DECIMAL(15,2) NOT NULL,
  bpjs_jht_employee DECIMAL(15,2) NOT NULL,
  bpjs_jp_employee DECIMAL(15,2) NOT NULL,
  
  -- BPJS Employer Contributions (for records)
  bpjs_kesehatan_employer DECIMAL(15,2) NOT NULL,
  bpjs_jht_employer DECIMAL(15,2) NOT NULL,
  bpjs_jp_employer DECIMAL(15,2) NOT NULL,
  bpjs_jkk_employer DECIMAL(15,2) NOT NULL,
  bpjs_jkm_employer DECIMAL(15,2) NOT NULL,
  
  -- Tax
  pph21 DECIMAL(15,2) NOT NULL,
  ptkp_status TEXT NOT NULL,
  
  -- Other Deductions
  other_deductions DECIMAL(15,2) DEFAULT 0,
  deduction_notes TEXT,
  
  -- Totals
  total_deductions DECIMAL(15,2) NOT NULL,
  net_salary DECIMAL(15,2) NOT NULL,
  
  -- PDF
  pdf_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(payroll_run_id, employee_id)
);

-- Expenses / Reimbursements
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  category TEXT NOT NULL 
    CHECK (category IN ('transport', 'meals', 'accommodation', 'supplies', 'training', 'medical', 'other')),
  
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
  
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Link to payroll for reimbursement
  payslip_id UUID REFERENCES payslips(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'hr', 'employee')),
  token TEXT UNIQUE NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  invited_by UUID NOT NULL REFERENCES users(id),
  accepted_by UUID REFERENCES users(id),
  
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_payroll_runs_period ON payroll_runs(period_year, period_month);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_payroll_run ON payslips(payroll_run_id);
CREATE INDEX idx_expenses_employee ON expenses(employee_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
```

---

## API Structure (Hono.js)

```
/api
├── /auth
│   ├── POST   /login              # Login with email/password
│   ├── POST   /logout             # Logout (invalidate token)
│   ├── POST   /refresh            # Refresh JWT token
│   └── POST   /reset-password     # Password reset flow
│
├── /employees
│   ├── GET    /                   # List all employees
│   ├── POST   /                   # Create employee
│   ├── GET    /:id                # Get employee details
│   ├── PUT    /:id                # Update employee
│   ├── DELETE /:id                # Soft delete employee
│   ├── GET    /:id/salary         # Get salary components
│   ├── PUT    /:id/salary         # Update salary components
│   └── GET    /:id/payslips       # Get employee payslips
│
├── /payroll
│   ├── GET    /runs               # List payroll runs
│   ├── POST   /runs               # Create new payroll run
│   ├── GET    /runs/:id           # Get payroll run details
│   ├── POST   /runs/:id/calculate # Calculate payroll
│   ├── POST   /runs/:id/approve   # Approve payroll
│   ├── POST   /runs/:id/pay       # Mark as paid
│   └── GET    /runs/:id/payslips  # Get all payslips for run
│
├── /payslips
│   ├── GET    /:id                # Get payslip details
│   ├── GET    /:id/pdf            # Download payslip PDF
│   └── POST   /:id/regenerate-pdf # Regenerate PDF
│
├── /expenses
│   ├── GET    /                   # List expenses (with filters)
│   ├── POST   /                   # Submit expense
│   ├── GET    /:id                # Get expense details
│   ├── PUT    /:id                # Update expense (if pending)
│   ├── DELETE /:id                # Delete expense (if pending)
│   ├── POST   /:id/approve        # Approve expense
│   └── POST   /:id/reject         # Reject expense
│
├── /reports
│   ├── GET    /pph21/monthly      # Monthly PPh 21 report
│   ├── GET    /pph21/annual       # Annual PPh 21 summary
│   ├── GET    /bpjs/monthly       # Monthly BPJS report
│   ├── GET    /bukti-potong/:year # Generate Bukti Potong 1721-A1
│   └── GET    /payroll-summary    # Payroll summary report
│
├── /invitations
│   ├── GET    /                   # List invitations
│   ├── POST   /                   # Create invitation
│   ├── GET    /:token             # Validate invitation token
│   ├── POST   /:token/accept      # Accept invitation
│   └── DELETE /:id                # Cancel invitation
│
├── /company
│   ├── GET    /                   # Get company settings
│   └── PUT    /                   # Update company settings
│
└── /upload
    └── POST   /receipt            # Upload receipt to R2
```

---

## Frontend Structure

```
/src
├── /components
│   ├── /ui                    # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Table.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── /layout
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── /employees
│   │   ├── EmployeeList.tsx
│   │   ├── EmployeeForm.tsx
│   │   └── EmployeeCard.tsx
│   ├── /payroll
│   │   ├── PayrollRunList.tsx
│   │   ├── PayrollCalculator.tsx
│   │   └── PayslipView.tsx
│   ├── /expenses
│   │   ├── ExpenseList.tsx
│   │   ├── ExpenseForm.tsx
│   │   └── ExpenseReview.tsx
│   └── /reports
│       ├── PPh21Report.tsx
│       ├── BPJSReport.tsx
│       └── PayrollSummary.tsx
│
├── /pages
│   ├── /auth
│   │   ├── Login.tsx
│   │   └── AcceptInvitation.tsx
│   ├── /dashboard
│   │   └── Dashboard.tsx
│   ├── /employees
│   │   ├── Employees.tsx
│   │   └── EmployeeDetail.tsx
│   ├── /payroll
│   │   ├── PayrollRuns.tsx
│   │   └── PayrollDetail.tsx
│   ├── /expenses
│   │   ├── Expenses.tsx
│   │   └── MyExpenses.tsx
│   ├── /reports
│   │   └── Reports.tsx
│   └── /settings
│       └── Settings.tsx
│
├── /hooks
│   ├── useAuth.ts
│   ├── useEmployees.ts
│   ├── usePayroll.ts
│   └── useExpenses.ts
│
├── /lib
│   ├── api.ts                 # API client
│   ├── auth.ts                # Auth utilities
│   ├── payroll-calculator.ts  # PPh21 & BPJS calculations
│   └── utils.ts               # Formatters, helpers
│
├── /types
│   └── index.ts               # TypeScript types
│
├── App.tsx
└── main.tsx
```

---

## PPh 21 Calculation Logic

```typescript
// Indonesian tax calculation
interface PPh21Input {
  grossMonthly: number;
  ptkpStatus: string;
  monthsWorked: number;  // For partial year calculation
}

// PTKP values (annual)
const PTKP = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0':  58_500_000,
  'K/1':  63_000_000,
  'K/2':  67_500_000,
  'K/3':  72_000_000,
};

// Progressive tax brackets
const TAX_BRACKETS = [
  { limit: 60_000_000, rate: 0.05 },
  { limit: 250_000_000, rate: 0.15 },
  { limit: 500_000_000, rate: 0.25 },
  { limit: 5_000_000_000, rate: 0.30 },
  { limit: Infinity, rate: 0.35 },
];

function calculatePPh21(input: PPh21Input): number {
  const { grossMonthly, ptkpStatus, monthsWorked } = input;
  
  // Annualize income
  const grossAnnual = grossMonthly * 12;
  
  // Biaya jabatan (occupational expense deduction) - 5% max Rp 6,000,000/year
  const biayaJabatan = Math.min(grossAnnual * 0.05, 6_000_000);
  
  // Netto income
  const nettoAnnual = grossAnnual - biayaJabatan;
  
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
  
  // Monthly tax (proportional to months worked for partial year)
  const monthlyTax = annualTax / 12;
  
  return Math.round(monthlyTax);
}
```

---

## BPJS Calculation Logic

```typescript
const BPJS_RATES = {
  kesehatan: {
    employee: 0.01,
    employer: 0.04,
    cap: 12_000_000,  // Monthly salary cap
  },
  jht: {
    employee: 0.02,
    employer: 0.037,
    cap: null,  // No cap
  },
  jp: {
    employee: 0.01,
    employer: 0.02,
    cap: 9_559_600,  // 2024 cap
  },
  jkk: {
    employee: 0,
    employer: 0.0024,  // Default rate (varies by industry)
    cap: null,
  },
  jkm: {
    employee: 0,
    employer: 0.003,
    cap: null,
  },
};

function calculateBPJS(grossSalary: number, jkkRate: number = 0.0024) {
  const kesehatanBase = Math.min(grossSalary, BPJS_RATES.kesehatan.cap);
  const jpBase = Math.min(grossSalary, BPJS_RATES.jp.cap);
  
  return {
    employee: {
      kesehatan: Math.round(kesehatanBase * BPJS_RATES.kesehatan.employee),
      jht: Math.round(grossSalary * BPJS_RATES.jht.employee),
      jp: Math.round(jpBase * BPJS_RATES.jp.employee),
    },
    employer: {
      kesehatan: Math.round(kesehatanBase * BPJS_RATES.kesehatan.employer),
      jht: Math.round(grossSalary * BPJS_RATES.jht.employer),
      jp: Math.round(jpBase * BPJS_RATES.jp.employer),
      jkk: Math.round(grossSalary * jkkRate),
      jkm: Math.round(grossSalary * BPJS_RATES.jkm.employer),
    },
  };
}
```

---

## Payslip PDF Template

```
┌────────────────────────────────────────────────────────────────┐
│  [COMPANY LOGO]                                                │
│  PT COMPANY NAME                                               │
│  NPWP: XX.XXX.XXX.X-XXX.XXX                                   │
│  Address Line 1, City, Province                                │
├────────────────────────────────────────────────────────────────┤
│                        SLIP GAJI                               │
│                    Periode: Januari 2024                       │
├────────────────────────────────────────────────────────────────┤
│  Nama         : John Doe                                       │
│  NIK          : 1234567890123456                               │
│  NPWP         : XX.XXX.XXX.X-XXX.XXX                          │
│  Status PTKP  : K/1                                            │
│  Jabatan      : Software Engineer                              │
│  Departemen   : Engineering                                    │
├────────────────────────────────────────────────────────────────┤
│  PENDAPATAN                           POTONGAN                 │
│  ───────────────────────────          ──────────────────────── │
│  Gaji Pokok      : Rp 10,000,000      BPJS Kesehatan: Rp 80,000│
│  Tunj. Transport : Rp  1,000,000      BPJS JHT      : Rp200,000│
│  Tunj. Makan     : Rp    500,000      BPJS JP       : Rp 95,596│
│  Tunj. Jabatan   : Rp  1,500,000      PPh 21        : Rp341,667│
│                                                                │
│  Total Pendapatan: Rp 13,000,000      Total Potongan: Rp717,263│
├────────────────────────────────────────────────────────────────┤
│  TAKE HOME PAY: Rp 12,282,737                                  │
├────────────────────────────────────────────────────────────────┤
│  Kontribusi Perusahaan (untuk informasi):                      │
│  BPJS Kesehatan: Rp 320,000 | JHT: Rp 481,000 | JP: Rp 191,192│
│  JKK: Rp 31,200 | JKM: Rp 39,000                              │
├────────────────────────────────────────────────────────────────┤
│  Tanggal Pembayaran: 25 Januari 2024                           │
│                                                                │
│  [Digital Signature]                                           │
│  HR Manager                                                    │
└────────────────────────────────────────────────────────────────┘
```

---

## Deployment

### Railway Setup

1. **Create PostgreSQL Database**
   - Railway dashboard → New Project → Provision PostgreSQL
   - Copy `DATABASE_URL` connection string

2. **Deploy API Server**
   - Connect GitHub repo
   - Set environment variables:
     ```
     DATABASE_URL=postgresql://...
     JWT_SECRET=your-secret-key
     CLOUDFLARE_ACCOUNT_ID=xxx
     CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
     CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
     CLOUDFLARE_R2_BUCKET_NAME=companyportal
     CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxx.r2.dev
     ```

### Cloudflare Setup

1. **Pages (Frontend)**
   - Connect GitHub repo
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variables:
     ```
     VITE_API_URL=https://your-api.railway.app
     ```

2. **R2 Bucket** ✅ (Already configured)
   - Bucket: `companyportal`
   - Public access enabled

---

## Security Considerations

1. **Authentication**
   - JWT tokens with short expiry (15 min)
   - Refresh tokens stored securely
   - Password hashing with bcrypt (cost 12)

2. **Authorization**
   - Role-based access control (admin, hr, employee)
   - Employees can only view their own data
   - Admin/HR can manage all data

3. **Data Protection**
   - All API endpoints require authentication
   - Sensitive data encrypted at rest
   - HTTPS enforced everywhere

4. **Audit Trail**
   - All changes logged with user, timestamp, old/new values
   - Critical for tax audits

---

## Project Structure

```
/Company-portal
├── /api                       # Hono.js API server (deploys to Railway)
│   ├── /src
│   │   ├── /routes
│   │   ├── /services
│   │   ├── /db
│   │   ├── /utils
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── /web                       # React frontend (deploys to Cloudflare Pages)
│   ├── /src
│   ├── /public
│   ├── package.json
│   └── vite.config.ts
│
├── /shared                    # Shared types and utilities
│   └── /types
│
├── architecture.md            # This file
├── .env                       # Environment variables
└── README.md
```

---

## Next Steps

1. ✅ Architecture document (this file)
2. ⬜ Initialize API project (Hono.js)
3. ⬜ Initialize Web project (React + Vite)
4. ⬜ Set up database schema
5. ⬜ Implement authentication
6. ⬜ Build employee management
7. ⬜ Build payroll calculator
8. ⬜ Build expense management
9. ⬜ Build PDF generation
10. ⬜ Build reports
11. ⬜ Deploy to Railway + Cloudflare
