import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminUser, type AdminUser } from './admin';

/**
 * Higher-order function to protect API routes with admin authentication
 * Usage: export const GET = withAdminAuth(async (request, adminUser) => { ... });
 */
export function withAdminAuth<T extends unknown[]>(
  handler: (request: NextRequest, adminUser: AdminUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Check if user is authenticated admin
      const adminUser = await getCurrentAdminUser(request);
      
      if (!adminUser) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Admin authentication required',
            code: 'ADMIN_AUTH_REQUIRED'
          },
          { status: 401 }
        );
      }

      // Call the original handler with admin user
      return await handler(request, adminUser, ...args);
      
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware for checking admin permissions
 */
export function requireAdminPermission(permission: string) {
  return function<T extends unknown[]>(
    handler: (request: NextRequest, adminUser: AdminUser, ...args: T) => Promise<NextResponse>
  ) {
    return withAdminAuth(async (request: NextRequest, adminUser: AdminUser, ...args: T) => {
      // For now, all admins have all permissions
      // In the future, implement granular permission checking
      const hasPermission = adminUser.role === 'admin' || adminUser.role === 'super_admin';
      
      if (!hasPermission) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            required: permission
          },
          { status: 403 }
        );
      }

      return await handler(request, adminUser, ...args);
    });
  };
}

/**
 * Get admin user from request for manual authentication
 */
export async function getAdminFromRequest(request: NextRequest): Promise<{
  success: boolean;
  admin?: AdminUser;
  error?: string;
}> {
  try {
    const adminUser = await getCurrentAdminUser(request);
    
    if (!adminUser) {
      return {
        success: false,
        error: 'Admin authentication required'
      };
    }

    return {
      success: true,
      admin: adminUser
    };
    
  } catch (error) {
    console.error('Error getting admin from request:', error);
    return {
      success: false,
      error: 'Authentication error'
    };
  }
}

/**
 * Standard API response for admin endpoints
 */
export class AdminApiResponse {
  static success<T>(data: T, message?: string) {
    return NextResponse.json({
      success: true,
      data,
      message
    });
  }

  static error(error: string, code?: string, status: number = 400) {
    return NextResponse.json({
      success: false,
      error,
      code
    }, { status });
  }

  static unauthorized(message = 'Admin authentication required') {
    return NextResponse.json({
      success: false,
      error: message,
      code: 'ADMIN_AUTH_REQUIRED'
    }, { status: 401 });
  }

  static forbidden(message = 'Insufficient permissions') {
    return NextResponse.json({
      success: false,
      error: message,
      code: 'INSUFFICIENT_PERMISSIONS'
    }, { status: 403 });
  }

  static notFound(message = 'Resource not found') {
    return NextResponse.json({
      success: false,
      error: message,
      code: 'NOT_FOUND'
    }, { status: 404 });
  }

  static serverError(message = 'Internal server error') {
    return NextResponse.json({
      success: false,
      error: message,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
