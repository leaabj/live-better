import { Context, Next } from 'hono';
import { verifyToken, JWTPayload } from '../utils/auth';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Authorization token required' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }

  // Add user info to context
  c.set('user', payload);
  await next();
};

// Helper to get authenticated user from context
export const getAuthUser = (c: Context): JWTPayload | null => {
  return c.get('user') as JWTPayload;
};