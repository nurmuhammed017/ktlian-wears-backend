import { NextResponse } from 'next/server';
import { getCurrentUser } from './session';

/**
 * Middleware to check if user is authenticated
 * @param request - The incoming request
 * @returns NextResponse or null if authenticated
 */
export async function requireAuth(/* request: NextRequest */): Promise<NextResponse | null> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return null; // User is authenticated, continue
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * Middleware to check if user is NOT authenticated (for login/register pages)
 * @param request - The incoming request
 * @returns NextResponse or null if not authenticated
 */
export async function requireGuest(/* request: NextRequest */): Promise<NextResponse | null> {
  try {
    const user = await getCurrentUser();
    
    if (user) {
      return NextResponse.json(
        { error: 'Already authenticated' },
        { status: 400 }
      );
    }
    
    return null; // User is not authenticated, continue
  } catch (error) {
    console.error('Guest middleware error:', error);
    return null; // Allow access on error
  }
}

/**
 * Get authenticated user from request (for optional auth)
 * @param request - The incoming request
 * @returns User object or null
 */
export async function getAuthUser(/* request: NextRequest */) {
  try {
    return await getCurrentUser();
  } catch (error) {
    console.error('Get auth user error:', error);
    return null;
  }
}
