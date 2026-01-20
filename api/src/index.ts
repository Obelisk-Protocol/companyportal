import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Routes
import auth from './routes/auth.js';
import employees from './routes/employees.js';
import payroll from './routes/payroll.js';
import payslips from './routes/payslips.js';
import expenses from './routes/expenses.js';
import invitations from './routes/invitations.js';
import reports from './routes/reports.js';
import upload from './routes/upload.js';
import company from './routes/company.js';
import users from './routes/users.js';
import me from './routes/me.js';
import crm from './routes/crm.js';
import contracts from './routes/contracts.js';
import invoices from './routes/invoices.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
// CORS configuration - allow multiple origins for production and development
const frontendUrl = process.env.FRONTEND_URL || 'https://companyportal.pages.dev';
const allowedOrigins = [
  frontendUrl,
  'https://companyportal.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Remove duplicates
const uniqueOrigins = [...new Set(allowedOrigins)];

app.use('*', cors({
  origin: uniqueOrigins,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400, // 24 hours
}));

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    name: 'Company Portal API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.route('/api/auth', auth);
app.route('/api/employees', employees);
app.route('/api/payroll', payroll);
app.route('/api/payslips', payslips);
app.route('/api/expenses', expenses);
app.route('/api/invitations', invitations);
app.route('/api/reports', reports);
app.route('/api/upload', upload);
app.route('/api/company', company);
app.route('/api/users', users);
app.route('/api/me', me);
app.route('/api/crm', crm);
app.route('/api/contracts', contracts);
app.route('/api/invoices', invoices);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  
  // Log full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error stack:', err.stack);
  }
  
  // Check for database schema errors
  const errorMessage = err.message || '';
  if (errorMessage.includes('column') || errorMessage.includes('42703') || errorMessage.includes('does not exist')) {
    return c.json({ 
      error: 'Database schema error',
      message: 'The database schema is out of date. Please run migrations to add the required columns (signatureFields, clientSignature, employeeSignature, companySignature) to the contracts table.',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, 500);
  }
  
  return c.json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  }, 500);
});

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

// Start automated report scheduler
import { startReportScheduler } from './services/reportScheduler.js';
startReportScheduler();

export default app;
