import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { generateInvoicePdf } from '../utils/pdf.js';
import { uploadToR2, generateFileKey } from '../utils/r2.js';

const invoices = new Hono();

// Apply auth middleware to all routes
invoices.use('*', authMiddleware);

// Invoice line item schema
const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
});

// Invoice schema
const createInvoiceSchema = z.object({
  companyId: z.string().uuid().optional(),
  individualClientId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
  currency: z.string().default('IDR'),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

const updateInvoiceSchema = createInvoiceSchema.partial();

// GET /invoices - List invoices (filtered by role)
invoices.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const clientId = c.req.query('clientId');
  const clientType = c.req.query('clientType'); // 'company' or 'individual'
  
  const conditions: any[] = [];
  
  // Clients can only see their own invoices
  if (user.role === 'client') {
    if (user.companyId) {
      conditions.push(eq(schema.invoices.companyId, user.companyId));
    } else if (user.individualClientId) {
      conditions.push(eq(schema.invoices.individualClientId, user.individualClientId));
    } else {
      return c.json([]);
    }
  } else if (clientId && clientType) {
    // Admin/HR filtering by client
    if (clientType === 'company') {
      conditions.push(eq(schema.invoices.companyId, clientId));
    } else {
      conditions.push(eq(schema.invoices.individualClientId, clientId));
    }
  }
  
  if (status) {
    conditions.push(eq(schema.invoices.paymentStatus, status as any));
  }
  
  let allInvoices;
  if (conditions.length > 0) {
    allInvoices = await db
      .select()
      .from(schema.invoices)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions)!)
      .orderBy(desc(schema.invoices.invoiceDate));
  } else {
    allInvoices = await db
      .select()
      .from(schema.invoices)
      .orderBy(desc(schema.invoices.invoiceDate));
  }
  
  // Enrich with client information
  const enriched = await Promise.all(allInvoices.map(async (invoice) => {
    let client = null;
    if (invoice.companyId) {
      const [company] = await db
        .select()
        .from(schema.crmCompanies)
        .where(eq(schema.crmCompanies.id, invoice.companyId))
        .limit(1);
      client = company ? { ...company, type: 'company' } : null;
    } else if (invoice.individualClientId) {
      const [individual] = await db
        .select()
        .from(schema.individualClients)
        .where(eq(schema.individualClients.id, invoice.individualClientId))
        .limit(1);
      client = individual ? { ...individual, type: 'individual' } : null;
    }
    
    return { ...invoice, client };
  }));
  
  return c.json(enriched);
});

// GET /invoices/:id - Get invoice details
invoices.get('/:id', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  
  const [invoice] = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, id))
    .limit(1);
  
  if (!invoice) {
    return c.json({ error: 'Invoice not found' }, 404);
  }
  
  // Check access
  if (user.role === 'client') {
    if (user.companyId && invoice.companyId !== user.companyId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (user.individualClientId && invoice.individualClientId !== user.individualClientId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }
  
  // Get client info
  let client = null;
  if (invoice.companyId) {
    const [company] = await db
      .select()
      .from(schema.crmCompanies)
      .where(eq(schema.crmCompanies.id, invoice.companyId))
      .limit(1);
    client = company ? { ...company, type: 'company' } : null;
  } else if (invoice.individualClientId) {
    const [individual] = await db
      .select()
      .from(schema.individualClients)
      .where(eq(schema.individualClients.id, invoice.individualClientId))
      .limit(1);
    client = individual ? { ...individual, type: 'individual' } : null;
  }
  
  // Get contract if linked
  let contract = null;
  if (invoice.contractId) {
    const [contractData] = await db
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.id, invoice.contractId))
      .limit(1);
    contract = contractData;
  }
  
  return c.json({ ...invoice, client, contract });
});

// POST /invoices - Create new invoice (Admin/HR only)
invoices.post('/', requireRole('admin', 'hr'), zValidator('json', createInvoiceSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');
  
  // Validate that either companyId or individualClientId is provided
  if (!data.companyId && !data.individualClientId) {
    return c.json({ error: 'Either companyId or individualClientId is required' }, 400);
  }
  
  // Calculate totals
  const subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal * data.taxRate) / 100;
  const total = subtotal + taxAmount - data.discount;
  
  // Generate invoice number
  const year = new Date().getFullYear();
  let invoiceNumber = '';
  for (let i = 1; i <= 9999; i++) {
    const num = `INV-${year}-${String(i).padStart(4, '0')}`;
    const existing = await db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.invoiceNumber, num))
      .limit(1);
    if (existing.length === 0) {
      invoiceNumber = num;
      break;
    }
  }
  
  if (!invoiceNumber) {
    return c.json({ error: 'Failed to generate invoice number' }, 500);
  }
  
  const [invoice] = await db
    .insert(schema.invoices)
    .values({
      companyId: data.companyId || null,
      individualClientId: data.individualClientId || null,
      contractId: data.contractId || null,
      invoiceNumber,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      lineItems: data.lineItems,
      subtotal: String(subtotal),
      taxRate: String(data.taxRate),
      taxAmount: String(taxAmount),
      discount: String(data.discount),
      total: String(total),
      currency: data.currency,
      paymentTerms: data.paymentTerms,
      notes: data.notes,
      internalNotes: data.internalNotes,
      paymentStatus: 'pending',
      createdBy: user.userId,
    })
    .returning();
  
  // Generate PDF
  try {
    // Get company info
    const [company] = await db.select().from(schema.companies).limit(1);
    if (!company) {
      throw new Error('Company information not found');
    }
    
    // Get client info
    let client: any = null;
    if (data.companyId) {
      const [clientCompany] = await db
        .select()
        .from(schema.crmCompanies)
        .where(eq(schema.crmCompanies.id, data.companyId))
        .limit(1);
      client = clientCompany ? {
        name: clientCompany.name,
        address: clientCompany.address,
        city: clientCompany.city,
        province: clientCompany.province,
        email: clientCompany.email,
        phone: clientCompany.phone,
        npwp: clientCompany.npwp,
        solanaWallet: clientCompany.solanaWallet,
      } : null;
    } else if (data.individualClientId) {
      const [individual] = await db
        .select()
        .from(schema.individualClients)
        .where(eq(schema.individualClients.id, data.individualClientId))
        .limit(1);
      client = individual ? {
        name: individual.fullName,
        address: individual.address,
        city: individual.city,
        province: individual.province,
        email: individual.email,
        phone: individual.phone,
        npwp: individual.npwp,
        solanaWallet: individual.solanaWallet,
      } : null;
    }
    
    if (!client) {
      throw new Error('Client information not found');
    }
    
    const pdfBytes = await generateInvoicePdf({
      company: {
        name: company.name,
        npwp: company.npwp,
        address: company.address,
        city: company.city,
        province: company.province,
        phone: company.phone,
        email: company.email,
        logoUrl: company.logoUrl,
        solanaWallet: company.solanaWallet,
      },
      client,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        lineItems: invoice.lineItems as any,
        subtotal: invoice.subtotal,
        taxRate: invoice.taxRate || '0',
        taxAmount: invoice.taxAmount || '0',
        discount: invoice.discount || '0',
        total: invoice.total,
        currency: invoice.currency || 'IDR',
        paymentTerms: invoice.paymentTerms || null,
        notes: invoice.notes || null,
        paymentStatus: invoice.paymentStatus || 'pending',
        paidAmount: invoice.paidAmount || null,
      },
    });
    
    const key = generateFileKey('invoices', `${invoiceNumber}.pdf`);
    const uploadResult = await uploadToR2(pdfBytes, key, 'application/pdf');
    
    // Update invoice with PDF URL
    await db
      .update(schema.invoices)
      .set({ pdfUrl: uploadResult.url })
      .where(eq(schema.invoices.id, invoice.id));
    
    invoice.pdfUrl = uploadResult.url;
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
  }
  
  return c.json(invoice, 201);
});

// PUT /invoices/:id - Update invoice (Admin/HR only)
invoices.put('/:id', requireRole('admin', 'hr'), zValidator('json', updateInvoiceSchema), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  
  const [existing] = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, id))
    .limit(1);
  
  if (!existing) {
    return c.json({ error: 'Invoice not found' }, 404);
  }
  
  // Recalculate totals if line items changed
  let subtotal = parseFloat(existing.subtotal);
  let taxAmount = parseFloat(existing.taxAmount || '0');
  let total = parseFloat(existing.total);
  
  if (data.lineItems) {
    subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = data.taxRate !== undefined ? data.taxRate : parseFloat(existing.taxRate || '0');
    taxAmount = (subtotal * taxRate) / 100;
    const discount = data.discount !== undefined ? data.discount : parseFloat(existing.discount || '0');
    total = subtotal + taxAmount - discount;
  } else if (data.taxRate !== undefined || data.discount !== undefined) {
    const taxRate = data.taxRate !== undefined ? data.taxRate : parseFloat(existing.taxRate || '0');
    taxAmount = (subtotal * taxRate) / 100;
    const discount = data.discount !== undefined ? data.discount : parseFloat(existing.discount || '0');
    total = subtotal + taxAmount - discount;
  }
  
  const [invoice] = await db
    .update(schema.invoices)
    .set({
      ...data,
      lineItems: data.lineItems ? data.lineItems : undefined,
      subtotal: data.lineItems || data.taxRate !== undefined || data.discount !== undefined ? String(subtotal) : undefined,
      taxRate: data.taxRate !== undefined ? String(data.taxRate) : undefined,
      taxAmount: data.lineItems || data.taxRate !== undefined || data.discount !== undefined ? String(taxAmount) : undefined,
      discount: data.discount !== undefined ? String(data.discount) : undefined,
      total: data.lineItems || data.taxRate !== undefined || data.discount !== undefined ? String(total) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(schema.invoices.id, id))
    .returning();
  
  // Regenerate PDF if invoice changed
  if (data.lineItems || data.taxRate !== undefined || data.discount !== undefined) {
    try {
      // Get company info
      const [company] = await db.select().from(schema.companies).limit(1);
      if (!company) {
        throw new Error('Company information not found');
      }
      
      // Get client info
      let client: any = null;
      if (invoice.companyId) {
        const [clientCompany] = await db
          .select()
          .from(schema.crmCompanies)
          .where(eq(schema.crmCompanies.id, invoice.companyId))
          .limit(1);
        client = clientCompany ? {
          name: clientCompany.name,
          address: clientCompany.address,
          city: clientCompany.city,
          province: clientCompany.province,
          email: clientCompany.email,
          phone: clientCompany.phone,
          npwp: clientCompany.npwp,
          solanaWallet: clientCompany.solanaWallet,
        } : null;
      } else if (invoice.individualClientId) {
        const [individual] = await db
          .select()
          .from(schema.individualClients)
          .where(eq(schema.individualClients.id, invoice.individualClientId))
          .limit(1);
        client = individual ? {
          name: individual.fullName,
          address: individual.address,
          city: individual.city,
          province: individual.province,
          email: individual.email,
          phone: individual.phone,
          npwp: individual.npwp,
          solanaWallet: individual.solanaWallet,
        } : null;
      }
      
      if (!client) {
        throw new Error('Client information not found');
      }
      
      const pdfBytes = await generateInvoicePdf({
        company: {
          name: company.name,
          npwp: company.npwp,
          address: company.address,
          city: company.city,
          province: company.province,
          phone: company.phone,
          email: company.email,
          logoUrl: company.logoUrl,
          solanaWallet: company.solanaWallet,
        },
        client,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        lineItems: (data.lineItems || invoice.lineItems) as any,
        subtotal: String(subtotal),
        taxRate: String(data.taxRate !== undefined ? data.taxRate : parseFloat(existing.taxRate || '0')),
        taxAmount: String(taxAmount),
        discount: String(data.discount !== undefined ? data.discount : parseFloat(existing.discount || '0')),
        total: String(total),
        currency: invoice.currency || 'IDR',
        paymentTerms: invoice.paymentTerms || null,
        notes: invoice.notes || null,
        paymentStatus: invoice.paymentStatus || 'pending',
        paidAmount: invoice.paidAmount || null,
      },
      });
      
      const key = generateFileKey('invoices', `${invoice.invoiceNumber}-${Date.now()}.pdf`);
      const uploadResult = await uploadToR2(pdfBytes, key, 'application/pdf');
      
      await db
        .update(schema.invoices)
        .set({ pdfUrl: uploadResult.url })
        .where(eq(schema.invoices.id, invoice.id));
      
      invoice.pdfUrl = uploadResult.url;
    } catch (error) {
      console.error('Error regenerating invoice PDF:', error);
    }
  }
  
  return c.json(invoice);
});

// POST /invoices/:id/mark-paid - Mark invoice as paid (Admin/HR only)
invoices.post('/:id/mark-paid', requireRole('admin', 'hr'), zValidator('json', z.object({
  paidAmount: z.number().min(0),
  paymentMethod: z.enum(['bank_transfer', 'cash', 'crypto', 'other']).optional(),
  paymentReference: z.string().optional(),
})), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  
  const [invoice] = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, id))
    .limit(1);
  
  if (!invoice) {
    return c.json({ error: 'Invoice not found' }, 404);
  }
  
  const total = parseFloat(invoice.total);
  const paidAmount = data.paidAmount;
  const existingPaid = parseFloat(invoice.paidAmount || '0');
  const newPaidAmount = existingPaid + paidAmount;
  
  let paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled' = 'pending';
  if (newPaidAmount >= total) {
    paymentStatus = 'paid';
  } else if (newPaidAmount > 0) {
    paymentStatus = 'partial';
  }
  
  const [updated] = await db
    .update(schema.invoices)
    .set({
      paidAmount: String(newPaidAmount),
      paymentStatus,
      paidAt: paymentStatus === 'paid' ? new Date() : undefined,
      paymentMethod: data.paymentMethod,
      paymentReference: data.paymentReference,
      updatedAt: new Date(),
    })
    .where(eq(schema.invoices.id, id))
    .returning();
  
  return c.json(updated);
});

// GET /invoices/:id/pdf - Get invoice PDF
invoices.get('/:id/pdf', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  
  const [invoice] = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, id))
    .limit(1);
  
  if (!invoice) {
    return c.json({ error: 'Invoice not found' }, 404);
  }
  
  // Check access
  if (user.role === 'client') {
    if (user.companyId && invoice.companyId !== user.companyId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (user.individualClientId && invoice.individualClientId !== user.individualClientId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }
  
  if (!invoice.pdfUrl) {
    return c.json({ error: 'PDF not generated yet' }, 404);
  }
  
  return c.json({ pdfUrl: invoice.pdfUrl });
});

// DELETE /invoices/:id - Delete invoice (Admin only)
invoices.delete('/:id', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  
  await db.delete(schema.invoices).where(eq(schema.invoices.id, id));
  
  return c.json({ message: 'Invoice deleted' });
});

export default invoices;
