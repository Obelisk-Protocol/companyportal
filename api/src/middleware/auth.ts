import { Context, Next } from 'hono';
import { verifyAccessToken, JWTPayload } from '../utils/auth.js';

// Extend Hono context with user
declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

/**
 * Authentication middleware - requires valid JWT
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }
  
  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(token);
  
  if (!payload) {
    return c.json({ error: 'Unauthorized - Invalid or expired token' }, 401);
  }
  
  c.set('user', payload);
  await next();
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...roles: ('admin' | 'hr' | 'employee' | 'accountant' | 'client')[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Forbidden - Insufficient permissions' }, 403);
    }
    
    await next();
  };
}

/**
 * Check if user can access employee data
 * Admins and HR can access all, employees can only access their own
 */
export function canAccessEmployee(c: Context, employeeId: string): boolean {
  const user = c.get('user');
  
  if (user.role === 'admin' || user.role === 'hr' || user.role === 'accountant') {
    return true;
  }
  
  return user.employeeId === employeeId;
}
