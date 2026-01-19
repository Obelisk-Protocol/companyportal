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

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
// CORS configuration - allow multiple origins for production and development
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [frontendUrl, 'http://localhost:5173'];

app.use('*', cors({
  origin: (origin) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return frontendUrl;
    // Check if origin matches any allowed origin
    const isAllowed = allowedOrigins.some(allowed => {
      try {
        const originUrl = new URL(origin);
        const allowedUrl = new URL(allowed);
        return originUrl.origin === allowedUrl.origin;
      } catch {
        return origin === allowed;
      }
    });
    return isAllowed ? origin : frontendUrl;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
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

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
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
