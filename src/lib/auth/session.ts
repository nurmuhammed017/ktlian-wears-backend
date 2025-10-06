import { generateToken, verifyToken } from './jwt';
import { getUserById } from '@/lib/db/queries';
import type { User } from '@/lib/db/schema';
import { cookies } from 'next/headers';

// Session configuration
const SESSION_COOKIE_NAME = 'auth-session';

/**
 * Create a new session for a user using JWT only
 * @param user - The user to create a session for
 * @returns Promise<{ token: string }> - The session token
 */
export async function createUserSession(user: User): Promise<{ token: string }> {
  try {
    // Generate JWT token with user data
    const token = generateToken({
      userId: user.id,
      email: user.email
    });

    return { token };
  } catch (error) {
    console.error('Error creating user session:', error);
    throw new Error('Failed to create session');
  }
}

/**
 * Validate a session token and return user data
 * @param token - The session token to validate
 * @returns Promise<{ user: User } | null> - User data or null if invalid
 */
export async function validateSession(token: string): Promise<{ user: User } | null> {
  try {
    // Verify JWT token
    const jwtPayload = verifyToken(token);
    
    // Get user from database to ensure they still exist
    const user = await getUserById(jwtPayload.userId);
    
    if (!user) {
      return null;
    }

    return { user };
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
}

/**
 * Invalidate a session (logout) - just clear the cookie
 * @param token - The session token to invalidate (not used in JWT-only approach)
 * @returns Promise<boolean> - Always returns true
 */
export async function invalidateSession(_token: string): Promise<boolean> {
  try {
    // In JWT-only approach, we just clear the cookie
    // The token itself remains valid until expiration
    clearSessionCookie();
    return true;
  } catch (error) {
    console.error('Error invalidating session:', error);
    return false;
  }
}

/**
 * Invalidate all sessions for a user - not applicable in JWT-only approach
 * @param userId - The user ID to invalidate sessions for
 * @returns Promise<boolean> - Always returns true
 */
export async function invalidateUserSessions(_userId: string): Promise<boolean> {
  try {
    // In JWT-only approach, we can't invalidate all sessions
    // They will expire naturally based on JWT expiration
    return true;
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
    return false;
  }
}

/**
 * Clean up expired sessions - not applicable in JWT-only approach
 * @returns Promise<boolean> - Always returns true
 */
export async function cleanupExpiredSessions(): Promise<boolean> {
  try {
    // In JWT-only approach, sessions expire automatically
    return true;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return false;
  }
}

/**
 * Set session cookie in the browser
 * @param token - The session token to set
 */
export function setSessionCookie(token: string): void {
  // Temporarily disabled for deployment
  console.log('Setting session cookie (disabled):', token);
  
  /*
  try {
    const cookieStore = cookies();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    });
  } catch (error) {
    console.error('Error setting session cookie:', error);
    throw new Error('Failed to set session cookie');
  }
  */
}

/**
 * Get session token from cookie
 * @returns string | null - The session token or null if not found
 */
export async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);
    return token?.value || null;
  } catch (error) {
    console.error('Error getting session token:', error);
    return null;
  }
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    console.error('Error clearing session cookie:', error);
    throw new Error('Failed to clear session cookie');
  }
}

/**
 * Get current authenticated user from session
 * @returns Promise<User | null> - The authenticated user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = await getSessionToken();
    
    if (!token) {
      return null;
    }

    const sessionData = await validateSession(token);
    return sessionData?.user || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns Promise<boolean> - True if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Refresh a session (extend expiration)
 * @param token - The current session token
 * @returns Promise<{ token: string } | null> - New session data or null if failed
 */
export async function refreshSession(token: string): Promise<{ token: string } | null> {
  try {
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return null;
    }

    // Create new session with same user
    const newSessionData = await createUserSession(sessionData.user);
    return newSessionData;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return null;
  }
}

/**
 * Get session with user data (for backward compatibility)
 * @param token - The session token
 * @returns Promise<{ user: User; session: { token: string } } | null> - User and session data or null if invalid
 */
export async function getSessionWithUser(token: string): Promise<{ user: User; session: { token: string } } | null> {
  try {
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return null;
    }

    return {
      user: sessionData.user,
      session: { token }
    };
  } catch (error) {
    console.error('Error getting session with user:', error);
    return null;
  }
}
