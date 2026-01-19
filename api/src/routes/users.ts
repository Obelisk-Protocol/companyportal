import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const users = new Hono();

// Apply auth middleware - admin only for all routes
users.use('*', authMiddleware);

// GET /users - List all users
users.get('/', requireRole('admin'), async (c) => {
  const allUsers = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      role: schema.users.role,
      isActive: schema.users.isActive,
      lastLogin: schema.users.lastLogin,
      createdAt: schema.users.createdAt,
      employeeId: schema.users.employeeId,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt));

  // Get employee names for users that have one
  const usersWithEmployees = await Promise.all(
    allUsers.map(async (user) => {
      let employeeName = null;
      if (user.employeeId) {
        const [employee] = await db
          .select({ fullName: schema.employees.fullName })
          .from(schema.employees)
          .where(eq(schema.employees.id, user.employeeId))
          .limit(1);
        employeeName = employee?.fullName;
      }
      return { ...user, employeeName };
    })
  );

  return c.json(usersWithEmployees);
});

// DELETE /users/:id - Delete a user
users.delete('/:id', requireRole('admin'), async (c) => {
  const currentUser = c.get('user');
  const { id } = c.req.param();

  // Prevent self-deletion
  if (id === currentUser.userId) {
    return c.json({ error: 'Cannot delete your own account' }, 400);
  }

  // Check user exists
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  try {
    // Delete refresh tokens first
    await db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.userId, id));

    // Update invitations to remove reference (set invitedBy to current admin)
    await db
      .update(schema.invitations)
      .set({ invitedBy: currentUser.userId })
      .where(eq(schema.invitations.invitedBy, id));

    // Delete the user
    await db
      .delete(schema.users)
      .where(eq(schema.users.id, id));

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user. They may have related records.' }, 500);
  }
});

// PUT /users/:id/toggle-active - Toggle user active status
users.put('/:id/toggle-active', requireRole('admin'), async (c) => {
  const currentUser = c.get('user');
  const { id } = c.req.param();

  // Prevent self-deactivation
  if (id === currentUser.userId) {
    return c.json({ error: 'Cannot deactivate your own account' }, 400);
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const [updated] = await db
    .update(schema.users)
    .set({ 
      isActive: !user.isActive,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, id))
    .returning();

  return c.json(updated);
});

export default users;
