import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { generateInvitationToken, getInvitationExpiry } from '../utils/auth.js';
import { sendInvitationEmail } from '../utils/email.js';

const invitations = new Hono();

// Apply auth middleware to all routes (except public token validation)
invitations.use('*', authMiddleware);

// Create invitation schema
const createInvitationSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['admin', 'hr', 'employee', 'accountant']).default('employee'),
});

// GET /invitations - List all invitations
invitations.get('/', requireRole('admin', 'hr'), async (c) => {
  const allInvitations = await db
    .select()
    .from(schema.invitations)
    .orderBy(desc(schema.invitations.createdAt));
  
  return c.json(allInvitations);
});

// POST /invitations - Create new invitation
invitations.post('/', requireRole('admin', 'hr'), zValidator('json', createInvitationSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');
  
  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, data.email))
    .limit(1);
  
  if (existingUser) {
    return c.json({ error: 'User with this email already exists' }, 409);
  }
  
  // Check if pending invitation exists
  const [existingInvitation] = await db
    .select()
    .from(schema.invitations)
    .where(eq(schema.invitations.email, data.email))
    .limit(1);
  
  if (existingInvitation && existingInvitation.status === 'pending') {
    return c.json({ error: 'Pending invitation already exists for this email' }, 409);
  }
  
  // Generate token
  const token = generateInvitationToken();
  const expiresAt = getInvitationExpiry();
  
  const [invitation] = await db
    .insert(schema.invitations)
    .values({
      email: data.email,
      name: data.name,
      role: data.role,
      token,
      status: 'pending',
      invitedBy: user.userId,
      expiresAt,
    })
    .returning();
  
  // Get inviter's name for the email
  let inviterName: string | undefined;
  if (user.employeeId) {
    const [employee] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, user.employeeId))
      .limit(1);
    inviterName = employee?.fullName;
  }
  
  // Send invitation email
  const emailResult = await sendInvitationEmail(
    data.email,
    data.name,
    data.role,
    token,
    inviterName
  );
  
  const invitationLink = `${process.env.FRONTEND_URL || 'https://companyportal.pages.dev'}/accept-invitation/${token}`;
  
  return c.json({
    invitation,
    invitationLink,
    emailSent: emailResult.success,
    emailError: emailResult.error,
  }, 201);
});

// GET /invitations/:id - Get invitation details
invitations.get('/:id', requireRole('admin', 'hr'), async (c) => {
  const { id } = c.req.param();
  
  const [invitation] = await db
    .select()
    .from(schema.invitations)
    .where(eq(schema.invitations.id, id))
    .limit(1);
  
  if (!invitation) {
    return c.json({ error: 'Invitation not found' }, 404);
  }
  
  return c.json(invitation);
});

// DELETE /invitations/:id - Cancel invitation
invitations.delete('/:id', requireRole('admin', 'hr'), async (c) => {
  const { id } = c.req.param();
  
  const [invitation] = await db
    .select()
    .from(schema.invitations)
    .where(eq(schema.invitations.id, id))
    .limit(1);
  
  if (!invitation) {
    return c.json({ error: 'Invitation not found' }, 404);
  }
  
  if (invitation.status !== 'pending') {
    return c.json({ error: 'Can only cancel pending invitations' }, 400);
  }
  
  await db
    .update(schema.invitations)
    .set({ 
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(eq(schema.invitations.id, id));
  
  return c.json({ message: 'Invitation cancelled' });
});

// POST /invitations/:id/resend - Resend invitation with new token
invitations.post('/:id/resend', requireRole('admin', 'hr'), async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  
  const [invitation] = await db
    .select()
    .from(schema.invitations)
    .where(eq(schema.invitations.id, id))
    .limit(1);
  
  if (!invitation) {
    return c.json({ error: 'Invitation not found' }, 404);
  }
  
  if (invitation.status === 'accepted') {
    return c.json({ error: 'Invitation has already been accepted' }, 400);
  }
  
  // Generate new token and expiry
  const token = generateInvitationToken();
  const expiresAt = getInvitationExpiry();
  
  const [updated] = await db
    .update(schema.invitations)
    .set({
      token,
      status: 'pending',
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.invitations.id, id))
    .returning();
  
  // Get inviter's name for the email
  let inviterName: string | undefined;
  if (user.employeeId) {
    const [employee] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, user.employeeId))
      .limit(1);
    inviterName = employee?.fullName;
  }
  
  // Send invitation email
  const emailResult = await sendInvitationEmail(
    updated.email,
    updated.name,
    updated.role,
    token,
    inviterName
  );
  
  const invitationLink = `${process.env.FRONTEND_URL || 'https://companyportal.pages.dev'}/accept-invitation/${token}`;
  
  return c.json({
    invitation: updated,
    invitationLink,
    emailSent: emailResult.success,
    emailError: emailResult.error,
  });
});

export default invitations;
