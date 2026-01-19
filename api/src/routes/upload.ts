import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { uploadToR2, generateFileKey, getUploadPresignedUrl } from '../utils/r2.js';

const upload = new Hono();

// Apply auth middleware to all routes
upload.use('*', authMiddleware);

// POST /upload/receipt - Upload receipt image
upload.post('/receipt', async (c) => {
  const user = c.get('user');
  
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF' }, 400);
  }
  
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return c.json({ error: 'File too large. Maximum size is 5MB' }, 400);
  }
  
  // Read file
  const buffer = await file.arrayBuffer();
  
  // Generate key and upload
  const key = generateFileKey('receipts', file.name);
  const result = await uploadToR2(new Uint8Array(buffer), key, file.type);
  
  return c.json(result);
});

// POST /upload/avatar - Upload avatar image
upload.post('/avatar', async (c) => {
  const user = c.get('user');
  
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP' }, 400);
  }
  
  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return c.json({ error: 'File too large. Maximum size is 2MB' }, 400);
  }
  
  // Read file
  const buffer = await file.arrayBuffer();
  
  // Generate key and upload
  const key = generateFileKey('avatars', file.name);
  const result = await uploadToR2(new Uint8Array(buffer), key, file.type);
  
  return c.json(result);
});

// POST /upload/ktp - Upload KTP image
upload.post('/ktp', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF' }, 400);
  }
  
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return c.json({ error: 'File too large. Maximum size is 5MB' }, 400);
  }
  
  // Read file
  const buffer = await file.arrayBuffer();
  
  // Generate key and upload
  const key = generateFileKey('ktp', file.name);
  const result = await uploadToR2(new Uint8Array(buffer), key, file.type);
  
  return c.json(result);
});

// POST /upload/logo - Upload company logo
upload.post('/logo', async (c) => {
  const user = c.get('user');
  
  // Only admin can upload company logo
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }
  
  // Validate file type (images only)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, SVG' }, 400);
  }
  
  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return c.json({ error: 'File too large. Maximum size is 2MB' }, 400);
  }
  
  // Read file
  const buffer = await file.arrayBuffer();
  
  // Generate key and upload
  const key = generateFileKey('logos', file.name);
  const result = await uploadToR2(new Uint8Array(buffer), key, file.type);
  
  return c.json(result);
});

// POST /upload/document - Upload general document
upload.post('/document', async (c) => {
  const user = c.get('user');
  
  // Only admin/HR can upload documents
  if (user.role !== 'admin' && user.role !== 'hr') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type' }, 400);
  }
  
  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return c.json({ error: 'File too large. Maximum size is 10MB' }, 400);
  }
  
  // Read file
  const buffer = await file.arrayBuffer();
  
  // Generate key and upload
  const key = generateFileKey('documents', file.name);
  const result = await uploadToR2(new Uint8Array(buffer), key, file.type);
  
  return c.json(result);
});

// GET /upload/presign - Get presigned URL for direct upload
upload.get('/presign', async (c) => {
  const filename = c.req.query('filename');
  const contentType = c.req.query('contentType');
  const folder = c.req.query('folder') || 'uploads';
  
  if (!filename || !contentType) {
    return c.json({ error: 'filename and contentType are required' }, 400);
  }
  
  const key = generateFileKey(folder, filename);
  const uploadUrl = await getUploadPresignedUrl(key, contentType);
  
  return c.json({
    uploadUrl,
    key,
    publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
  });
});

export default upload;
