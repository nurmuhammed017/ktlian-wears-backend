import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from './jwt';
import { getUserById, isUserAdmin } from '@/lib/db/queries';
import type { User } from '@/lib/db/schema';

export interface AdminUser extends User {
  role: 'admin' | 'super_admin';
}

/**
 * Get the current authenticated user from the request
 */
export async function getCurrentUser(request?: NextRequest): Promise<User | null> {
  try {
    let token: string | undefined;

    if (request) {
      // For API routes - get from request cookies
      token = request.cookies.get('auth_token')?.value;
    } else {
      // For server components - get from cookies() function
      const cookieStore = await cookies();
      token = cookieStore.get('auth_token')?.value;
    }

    if (!token) {
      return null;
    }

    // Verify the JWT token
    const payload = verifyToken(token);
    if (!payload || typeof payload.userId !== 'string') {
      return null;
    }

    // Get user from database
    const user = await getUserById(payload.userId);
    return user || null;

  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get the current authenticated admin user
 * Returns null if user is not authenticated or not an admin
 */
export async function getCurrentAdminUser(request?: NextRequest): Promise<AdminUser | null> {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return null;
    }

    // Check if user has admin role
    const userIsAdmin = await isUserAdmin(user.id);
    if (!userIsAdmin) {
      return null;
    }

    // Type assertion - we know user is admin at this point
    return user as AdminUser;

  } catch (error) {
    console.error('Error getting current admin user:', error);
    return null;
  }
}

/**
 * Check if the current user is an admin
 */
export async function isCurrentUserAdmin(request?: NextRequest): Promise<boolean> {
  try {
    const adminUser = await getCurrentAdminUser(request);
    return adminUser !== null;
  } catch (error) {
    console.error('Error checking if current user is admin:', error);
    return false;
  }
}

/**
 * Require admin authentication - throws error if not admin
 * Use this in API routes that require admin access
 */
export async function requireAdmin(request: NextRequest): Promise<AdminUser> {
  const adminUser = await getCurrentAdminUser(request);
  
  if (!adminUser) {
    throw new Error('Admin access required');
  }
  
  return adminUser;
}

/**
 * Check if user has specific admin permissions
 * For future expansion - different admin levels
 */
export function hasAdminPermission(user: AdminUser, permission: string): boolean {
  // For now, all admins have all permissions
  // In the future, you could implement granular permissions
  switch (permission) {
    case 'manage_products':
    case 'manage_users':
    case 'manage_orders':
    case 'view_analytics':
      return user.role === 'admin' || user.role === 'super_admin';
    
    case 'manage_admins':
    case 'system_settings':
      return user.role === 'super_admin';
    
    default:
      return false;
  }
}

/**
 * Admin session info for frontend use
 */
export interface AdminSession {
  user: AdminUser;
  permissions: string[];
  isAdmin: true;
}

/**
 * Get admin session info
 */
export async function getAdminSession(request?: NextRequest): Promise<AdminSession | null> {
  const adminUser = await getCurrentAdminUser(request);
  
  if (!adminUser) {
    return null;
  }

  // Get all permissions for this admin
  const permissions = [
    'manage_products',
    'manage_users', 
    'manage_orders',
    'view_analytics'
  ];

  if (adminUser.role === 'super_admin') {
    permissions.push('manage_admins', 'system_settings');
  }

  return {
    user: adminUser,
    permissions,
    isAdmin: true
  };
}
