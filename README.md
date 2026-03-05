# Company Portal (Frontend)

Frontend for the Obelisk Company Portal - HR & Payroll management for Indonesian companies. Built with React, TypeScript, and Vite.

## Features

- 👥 **Employee Management** - Complete employee profiles with KTP upload
- 💰 **Payroll Processing** - Automated salary calculations with Indonesian tax compliance
- 📄 **Tax Reports** - Automated monthly SPT Masa PPh 21 generation
- 🏥 **BPJS Management** - Health and employment insurance tracking
- 💳 **Expense Management** - Employee expense submission and approval
- 📊 **Reports & Analytics** - Comprehensive payroll and tax reports
- 👤 **User Roles** - Admin, HR, Employee, and Accountant roles
- 📧 **Email Invitations** - Automated user onboarding
- 🔐 **Password Reset** - Forgot password flow via email

## Tech Stack
 
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Query
- React Router
- Framer Motion

## Project Structure

```
├── src/
│   ├── pages/        # Page components
│   ├── components/   # Reusable components
│   ├── contexts/     # React contexts (Auth, Theme, etc.)
│   └── lib/          # Utilities and API client
├── public/
├── index.html
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+

### Installation

1. Clone the repository
```bash
git clone https://github.com/Obelisk-Protocol/companyportal.git
cd companyportal
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

Create `.env`:
```
VITE_API_URL=https://your-api-url.com
```

4. Start development server
```bash
npm run dev
```

## Deployment (Cloudflare Pages)

- Connect GitHub repository
- **Root directory:** (leave empty - repo root is the app)
- **Build command:** `npm install && npm run build`
- **Output directory:** `dist`
- Set `VITE_API_URL` environment variable to your backend API URL

## License

MIT License - see [LICENSE](./LICENSE) for details.
