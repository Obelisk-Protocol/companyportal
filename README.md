# Company Portal

A comprehensive HR and payroll management system for Indonesian companies, built with React, TypeScript, and Hono.js.

## Features

- 👥 **Employee Management** - Complete employee profiles with KTP upload
- 💰 **Payroll Processing** - Automated salary calculations with Indonesian tax compliance
- 📄 **Tax Reports** - Automated monthly SPT Masa PPh 21 generation
- 🏥 **BPJS Management** - Health and employment insurance tracking
- 💳 **Expense Management** - Employee expense submission and approval
- 📊 **Reports & Analytics** - Comprehensive payroll and tax reports
- 👤 **User Roles** - Admin, HR, Employee, and Accountant roles
- 📧 **Email Invitations** - Automated user onboarding

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Query
- React Router

### Backend
- Hono.js
- PostgreSQL (Drizzle ORM)
- Cloudflare R2 (Storage)
- Resend (Email)
- PDF-lib (Document generation)

### Deployment
- Cloudflare Pages (Frontend)
- Railway (Backend API)
- Cloudflare R2 (File Storage)

## Project Structure

```
Company-portal/
├── api/                 # Backend API server
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── db/         # Database schema and migrations
│   │   ├── utils/      # Utilities (PDF, payroll, etc.)
│   │   └── services/   # Background services (scheduler)
│   └── package.json
├── web/                 # Frontend React app
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   └── lib/        # Utilities and API client
│   └── package.json
└── DEPLOYMENT.md        # Deployment guide
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Cloudflare account (for R2 storage)
- Resend account (for emails)

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd Company-portal
```

2. Install dependencies
```bash
# Frontend
cd web
npm install

# Backend
cd ../api
npm install
```

3. Set up environment variables

**Frontend (`web/.env`):**
```
VITE_API_URL=http://localhost:3000
```

**Backend (`api/.env`):**
```
DATABASE_URL=postgresql://user:password@localhost:5432/company_portal
JWT_SECRET=your-secret-key
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_PUBLIC_URL=https://your-r2-url.com
RESEND_API_KEY=your-resend-key
FROM_EMAIL=Your Company <noreply@yourdomain.com>
FRONTEND_URL=http://localhost:5173
PORT=3000
```

4. Set up database
```bash
cd api
npm run db:push
```

5. Start development servers
```bash
# Backend (from api/)
npm run dev

# Frontend (from web/)
npm run dev
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

**Frontend (Cloudflare Pages):**
- Connect GitHub repository
- Build command: `cd web && npm install && npm run build`
- Output directory: `web/dist`
- Set `VITE_API_URL` environment variable

**Backend (Railway):**
- Connect GitHub repository
- Root directory: `api`
- Start command: `npm start`
- Add all environment variables from Railway dashboard

## Indonesian Tax Compliance

This system implements:
- ✅ PPh 21 (Income Tax) calculations
- ✅ PTKP (Tax Status) handling
- ✅ BPJS Kesehatan (Health Insurance)
- ✅ BPJS Ketenagakerjaan (Employment Insurance)
- ✅ SPT Masa PPh 21 (Monthly Tax Return) - Auto-generated
- ✅ Bukti Potong 1721-A1 (Withholding Slip)

## License

Private - All rights reserved
