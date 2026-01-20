import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and, or } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { uploadToR2, generateFileKey } from '../utils/r2.js';
import { PDFDocument, StandardFonts, rgb, PDFImage } from 'pdf-lib';

const contracts = new Hono();

// Apply auth middleware to all routes
contracts.use('*', authMiddleware);

// Signature field schema
const signatureFieldSchema = z.object({
  pageIndex: z.number().int().min(0), // Which page (0-indexed)
  x: z.number().min(0), // X position in points
  y: z.number().min(0), // Y position in points
  width: z.number().min(0).optional().default(200), // Field width
  height: z.number().min(0).optional().default(80), // Field height
  label: z.string().optional(), // Optional label like "Client Signature" or "Company Signature"
});

// Contract schema (for JSON body - documentUrl will come from file upload)
const createContractSchema = z.object({
  companyId: z.string().uuid().optional(),
  individualClientId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  contractCategory: z.enum(['client', 'employee']).default('client'),
  title: z.string().min(2),
  description: z.string().optional(),
  contractType: z.enum(['service', 'consulting', 'maintenance', 'retainer', 'project', 'employment', 'nda', 'confidentiality', 'other']).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  value: z.number().min(0).optional(),
  currency: z.string().default('IDR'),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  documentUrl: z.string().url().optional(), // Can be provided if uploading separately
  // Signature fields configuration (DocuSign-style)
  signatureFields: z.object({
    clientSignatureField: signatureFieldSchema.optional(),
    employeeSignatureField: signatureFieldSchema.optional(),
    companySignatureField: signatureFieldSchema.optional(),
  }).optional(),
});

const updateContractSchema = createContractSchema.partial();

// GET /contracts - List contracts (filtered by role)
contracts.get('/', async (c) => {
  const user = c.get('user');
  const category = c.req.query('category'); // 'client' or 'employee'
  
  const conditions: any[] = [];
  
  // Clients can only see their own contracts
  if (user.role === 'client') {
    if (user.companyId) {
      conditions.push(eq(schema.contracts.companyId, user.companyId));
    } else if (user.individualClientId) {
      conditions.push(eq(schema.contracts.individualClientId, user.individualClientId));
    } else {
      return c.json([]);
    }
    conditions.push(eq(schema.contracts.contractCategory, 'client'));
  }
  // Employees can only see their own contracts
  else if (user.role === 'employee' && user.employeeId) {
    conditions.push(eq(schema.contracts.employeeId, user.employeeId));
    conditions.push(eq(schema.contracts.contractCategory, 'employee'));
  }
  // Admin/HR/Accountant can see all contracts, optionally filtered by category
  
  if (category) {
    conditions.push(eq(schema.contracts.contractCategory, category as any));
  }
  
  let allContracts;
  if (conditions.length > 0) {
    allContracts = await db
      .select()
      .from(schema.contracts)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions)!)
      .orderBy(desc(schema.contracts.createdAt));
  } else {
    allContracts = await db
      .select()
      .from(schema.contracts)
      .orderBy(desc(schema.contracts.createdAt));
  }
  
  // Enrich with client/employee information
  const enriched = await Promise.all(allContracts.map(async (contract) => {
    let client = null;
    let employee = null;
    
    if (contract.companyId) {
      const [company] = await db
        .select()
        .from(schema.crmCompanies)
        .where(eq(schema.crmCompanies.id, contract.companyId))
        .limit(1);
      client = company ? { ...company, type: 'company' } : null;
    } else if (contract.individualClientId) {
      const [individual] = await db
        .select()
        .from(schema.individualClients)
        .where(eq(schema.individualClients.id, contract.individualClientId))
        .limit(1);
      client = individual ? { ...individual, type: 'individual' } : null;
    } else if (contract.employeeId) {
      const [emp] = await db
        .select()
        .from(schema.employees)
        .where(eq(schema.employees.id, contract.employeeId))
        .limit(1);
      employee = emp ? { ...emp, type: 'employee' } : null;
    }
    
    return { ...contract, client, employee };
  }));
  
  return c.json(enriched);
});

// GET /contracts/:id - Get contract details
contracts.get('/:id', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  
  const [contract] = await db
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.id, id))
    .limit(1);
  
  if (!contract) {
    return c.json({ error: 'Contract not found' }, 404);
  }
  
  // Check access
  if (user.role === 'client') {
    if (user.companyId && contract.companyId !== user.companyId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (user.individualClientId && contract.individualClientId !== user.individualClientId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
  } else if (user.role === 'employee' && user.employeeId) {
    if (contract.employeeId !== user.employeeId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }
  
  // Get client/employee info
  let client = null;
  let employee = null;
  
  if (contract.companyId) {
    const [company] = await db
      .select()
      .from(schema.crmCompanies)
      .where(eq(schema.crmCompanies.id, contract.companyId))
      .limit(1);
    client = company ? { ...company, type: 'company' } : null;
  } else if (contract.individualClientId) {
    const [individual] = await db
      .select()
      .from(schema.individualClients)
      .where(eq(schema.individualClients.id, contract.individualClientId))
      .limit(1);
    client = individual ? { ...individual, type: 'individual' } : null;
  } else if (contract.employeeId) {
    const [emp] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, contract.employeeId))
      .limit(1);
    employee = emp ? { ...emp, type: 'employee' } : null;
  }
  
  return c.json({ ...contract, client, employee });
});

// POST /contracts - Create new contract (Admin/HR only)
contracts.post('/', requireRole('admin', 'hr'), zValidator('json', createContractSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');
  
  // Validate that a reference is provided
  if (!data.companyId && !data.individualClientId && !data.employeeId) {
    return c.json({ error: 'Either companyId, individualClientId, or employeeId is required' }, 400);
  }
  
  // Set contract category based on reference
  const contractCategory = data.employeeId ? 'employee' : 'client';
  
  // Generate contract number
  const year = new Date().getFullYear();
  const contractCount = await db
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.contractNumber, `CONTRACT-${year}-${String(1).padStart(4, '0')}`));
  
  // Find next available number
  let contractNumber = '';
  for (let i = 1; i <= 9999; i++) {
    const num = `CONTRACT-${year}-${String(i).padStart(4, '0')}`;
    const existing = await db
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.contractNumber, num))
      .limit(1);
    if (existing.length === 0) {
      contractNumber = num;
      break;
    }
  }
  
  if (!contractNumber) {
    return c.json({ error: 'Failed to generate contract number' }, 500);
  }
  
  try {
    const [contract] = await db
      .insert(schema.contracts)
      .values({
        companyId: data.companyId || null,
        individualClientId: data.individualClientId || null,
        employeeId: data.employeeId || null,
        contractCategory,
        title: data.title,
        description: data.description,
        contractType: data.contractType,
        contractNumber,
        startDate: data.startDate,
        endDate: data.endDate || null,
        value: data.value ? String(data.value) : null,
        currency: data.currency,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        documentUrl: data.documentUrl || null,
        signatureFields: data.signatureFields ? JSON.parse(JSON.stringify(data.signatureFields)) : null,
        status: 'draft',
        createdBy: user.userId,
      })
      .returning();
    
    return c.json(contract, 201);
  } catch (error: any) {
    console.error('Error creating contract:', error);
    
    // Check if it's a database schema error
    if (error?.message?.includes('column') || error?.code === '42703') {
      return c.json({ 
        error: 'Database schema is out of date. Please run migrations to add signature fields columns (signatureFields, clientSignature, employeeSignature, companySignature) to the contracts table.' 
      }, 500);
    }
    
    return c.json({ 
      error: error?.message || 'Failed to create contract' 
    }, 500);
  }
});

// PUT /contracts/:id - Update contract (Admin/HR only)
contracts.put('/:id', requireRole('admin', 'hr'), zValidator('json', updateContractSchema), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  
  const [contract] = await db
    .update(schema.contracts)
    .set({
      ...data,
      value: data.value ? String(data.value) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(schema.contracts.id, id))
    .returning();
  
  if (!contract) {
    return c.json({ error: 'Contract not found' }, 404);
  }
  
  return c.json(contract);
});

// POST /contracts/:id/send - Send contract to client (changes status to 'sent')
contracts.post('/:id/send', requireRole('admin', 'hr'), async (c) => {
  const { id } = c.req.param();
  
  const [contract] = await db
    .update(schema.contracts)
    .set({
      status: 'sent',
      updatedAt: new Date(),
    })
    .where(eq(schema.contracts.id, id))
    .returning();
  
  if (!contract) {
    return c.json({ error: 'Contract not found' }, 404);
  }
  
  return c.json(contract);
});

// POST /contracts/:id/sign - Sign contract (Client or Employee)
contracts.post('/:id/sign', requireRole('client', 'employee'), zValidator('json', z.object({
  signature: z.string(), // Base64 encoded signature image
  name: z.string().min(2),
})), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const data = c.req.valid('json');
  
  const [contract] = await db
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.id, id))
    .limit(1);
  
  if (!contract) {
    return c.json({ error: 'Contract not found' }, 404);
  }
  
  // Verify user owns this contract
  if (user.role === 'client') {
    if (user.companyId && contract.companyId !== user.companyId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (user.individualClientId && contract.individualClientId !== user.individualClientId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (contract.contractCategory !== 'client') {
      return c.json({ error: 'This is not a client contract' }, 403);
    }
  } else if (user.role === 'employee') {
    if (!user.employeeId || contract.employeeId !== user.employeeId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (contract.contractCategory !== 'employee') {
      return c.json({ error: 'This is not an employee contract' }, 403);
    }
  }
  
  if (contract.status !== 'sent') {
    return c.json({ error: 'Contract must be sent before signing' }, 400);
  }
  
  // Store signature data
  const signatureData = {
    name: data.name,
    signature: data.signature,
    signedAt: new Date().toISOString(),
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
    signerType: user.role === 'client' ? 'client' : 'employee',
  };
  
  // Generate signed PDF (if document exists) - using designated signature fields
  let signedDocumentUrl = contract.documentUrl || contract.signedDocumentUrl;
  if (contract.documentUrl || contract.signedDocumentUrl) {
    try {
      // Use existing signed PDF if available, otherwise use original
      const pdfUrl = contract.signedDocumentUrl || contract.documentUrl;
      const response = await fetch(pdfUrl!);
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Get signature field configuration
      const signatureFields = contract.signatureFields as any;
      let signatureField: any = null;
      
      if (user.role === 'client') {
        signatureField = signatureFields?.clientSignatureField;
      } else if (user.role === 'employee') {
        signatureField = signatureFields?.employeeSignatureField;
      }
      
      // If no designated field, use default position on last page
      const pageIndex = signatureField?.pageIndex ?? pages.length - 1;
      const page = pages[Math.min(pageIndex, pages.length - 1)];
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Calculate signature position (default to bottom right if no field specified)
      const sigWidth = signatureField?.width ?? 200;
      const sigHeight = signatureField?.height ?? 80;
      let sigX = signatureField?.x ?? (pageWidth - sigWidth - 50);
      let sigY = signatureField?.y ?? 100;
      
      // PDF coordinates start from bottom-left, so adjust Y
      sigY = pageHeight - sigY - sigHeight;
      
      // Draw signature box (border)
      page.drawRectangle({
        x: sigX,
        y: sigY,
        width: sigWidth,
        height: sigHeight,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
      });
      
      // Draw signature image if provided
      if (data.signature && data.signature.startsWith('data:image')) {
        const base64Data = data.signature.split(',')[1];
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        let signatureImage: PDFImage;
        if (data.signature.includes('image/png')) {
          signatureImage = await pdfDoc.embedPng(imageBytes);
        } else if (data.signature.includes('image/jpeg') || data.signature.includes('image/jpg')) {
          signatureImage = await pdfDoc.embedJpg(imageBytes);
        } else {
          signatureImage = await pdfDoc.embedPng(imageBytes);
        }
        
        // Draw signature image within the field
        const imgHeight = Math.min(sigHeight * 0.6, 50);
        const imgWidth = (signatureImage.width / signatureImage.height) * imgHeight;
        const imgX = sigX + 10;
        const imgY = sigY + sigHeight - imgHeight - 10;
        
        page.drawImage(signatureImage, {
          x: imgX,
          y: imgY,
          width: imgWidth,
          height: imgHeight,
        });
      }
      
      // Add name and date text
      const label = signatureField?.label || (user.role === 'client' ? 'Client Signature' : 'Employee Signature');
      page.drawText(label, {
        x: sigX + 10,
        y: sigY + 10,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      page.drawText(`Name: ${data.name}`, {
        x: sigX + 10,
        y: sigY - 15,
        size: 8,
        font,
      });
      
      page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: sigX + 10,
        y: sigY - 28,
        size: 8,
        font,
      });
      
      // Save signed PDF
      const signedPdfBytes = await pdfDoc.save();
      const key = generateFileKey('contracts', `signed-${contract.contractNumber}-${Date.now()}.pdf`);
      const uploadResult = await uploadToR2(signedPdfBytes, key, 'application/pdf');
      signedDocumentUrl = uploadResult.url;
    } catch (error) {
      console.error('Error generating signed PDF:', error);
    }
  }
  
  // Update contract
  const updateData: any = {
    status: 'signed',
    signedDocumentUrl,
    updatedAt: new Date(),
  };
  
  if (user.role === 'client') {
    updateData.clientSignature = signatureData;
    updateData.signedByClientAt = new Date();
    updateData.signedByClientUserId = user.userId;
  } else if (user.role === 'employee') {
    updateData.employeeSignature = signatureData;
    updateData.signedByEmployeeAt = new Date();
    updateData.signedByEmployeeUserId = user.userId;
  }
  
  const [updated] = await db
    .update(schema.contracts)
    .set(updateData)
    .where(eq(schema.contracts.id, id))
    .returning();
  
  return c.json(updated);
});

// POST /contracts/:id/company-sign - Company signs contract (Admin/HR only)
contracts.post('/:id/company-sign', requireRole('admin', 'hr'), zValidator('json', z.object({
  signature: z.string(), // Base64 encoded signature image
  name: z.string().min(2),
})), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const data = c.req.valid('json');
  
  const [contract] = await db
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.id, id))
    .limit(1);
  
  if (!contract) {
    return c.json({ error: 'Contract not found' }, 404);
  }
  
  if (contract.status !== 'signed') {
    return c.json({ error: 'Client/Employee must sign first' }, 400);
  }
  
  // Store company signature data
  const companySignatureData = {
    name: data.name,
    signature: data.signature,
    signedAt: new Date().toISOString(),
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
    signedByUserId: user.userId,
  };
  
  // Generate signed PDF with company signature
  let signedDocumentUrl = contract.signedDocumentUrl || contract.documentUrl;
  if (signedDocumentUrl) {
    try {
      const response = await fetch(signedDocumentUrl);
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Get company signature field configuration
      const signatureFields = contract.signatureFields as any;
      const companySignatureField = signatureFields?.companySignatureField;
      
      // Use designated field or default position
      const pageIndex = companySignatureField?.pageIndex ?? pages.length - 1;
      const page = pages[Math.min(pageIndex, pages.length - 1)];
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      const sigWidth = companySignatureField?.width ?? 200;
      const sigHeight = companySignatureField?.height ?? 80;
      let sigX = companySignatureField?.x ?? 50; // Default to left side for company
      let sigY = companySignatureField?.y ?? 100;
      sigY = pageHeight - sigY - sigHeight;
      
      // Draw signature box
      page.drawRectangle({
        x: sigX,
        y: sigY,
        width: sigWidth,
        height: sigHeight,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
      });
      
      // Draw signature image
      if (data.signature && data.signature.startsWith('data:image')) {
        const base64Data = data.signature.split(',')[1];
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        let signatureImage: PDFImage;
        if (data.signature.includes('image/png')) {
          signatureImage = await pdfDoc.embedPng(imageBytes);
        } else if (data.signature.includes('image/jpeg') || data.signature.includes('image/jpg')) {
          signatureImage = await pdfDoc.embedJpg(imageBytes);
        } else {
          signatureImage = await pdfDoc.embedPng(imageBytes);
        }
        
        const imgHeight = Math.min(sigHeight * 0.6, 50);
        const imgWidth = (signatureImage.width / signatureImage.height) * imgHeight;
        const imgX = sigX + 10;
        const imgY = sigY + sigHeight - imgHeight - 10;
        
        page.drawImage(signatureImage, {
          x: imgX,
          y: imgY,
          width: imgWidth,
          height: imgHeight,
        });
      }
      
      // Add company signature label and info
      const label = companySignatureField?.label || 'Company Signature';
      page.drawText(label, {
        x: sigX + 10,
        y: sigY + 10,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      page.drawText(`Name: ${data.name}`, {
        x: sigX + 10,
        y: sigY - 15,
        size: 8,
        font,
      });
      
      page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: sigX + 10,
        y: sigY - 28,
        size: 8,
        font,
      });
      
      // Save signed PDF
      const signedPdfBytes = await pdfDoc.save();
      const key = generateFileKey('contracts', `fully-signed-${contract.contractNumber}-${Date.now()}.pdf`);
      const uploadResult = await uploadToR2(signedPdfBytes, key, 'application/pdf');
      signedDocumentUrl = uploadResult.url;
    } catch (error) {
      console.error('Error adding company signature to PDF:', error);
    }
  }
  
  const [updated] = await db
    .update(schema.contracts)
    .set({
      status: 'active',
      companySignature: companySignatureData,
      signedByCompanyAt: new Date(),
      signedByCompanyUserId: user.userId,
      signedDocumentUrl,
      updatedAt: new Date(),
    })
    .where(eq(schema.contracts.id, id))
    .returning();
  
  return c.json(updated);
});

// POST /contracts/:id/place-signature-fields - Place signature fields on contract PDF (Admin/HR only)
contracts.post('/:id/place-signature-fields', requireRole('admin', 'hr'), zValidator('json', z.object({
  signatureFields: z.object({
    clientSignatureField: signatureFieldSchema.optional(),
    employeeSignatureField: signatureFieldSchema.optional(),
    companySignatureField: signatureFieldSchema.optional(),
  }),
})), async (c) => {
  const { id } = c.req.param();
  const { signatureFields } = c.req.valid('json');
  
  const [contract] = await db
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.id, id))
    .limit(1);
  
  if (!contract) {
    return c.json({ error: 'Contract not found' }, 404);
  }
  
  if (!contract.documentUrl) {
    return c.json({ error: 'Contract must have a document URL first' }, 400);
  }
  
  // Update contract with signature fields
  const [updated] = await db
    .update(schema.contracts)
    .set({
      signatureFields,
      updatedAt: new Date(),
    })
    .where(eq(schema.contracts.id, id))
    .returning();
  
  return c.json(updated);
});

// DELETE /contracts/:id - Delete contract (Admin only)
contracts.delete('/:id', requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  
  await db.delete(schema.contracts).where(eq(schema.contracts.id, id));
  
  return c.json({ message: 'Contract deleted' });
});

export default contracts;
