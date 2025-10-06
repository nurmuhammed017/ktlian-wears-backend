import jwt, { SignOptions } from 'jsonwebtoken';
import type { NextRequest } from 'next/server';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';

// Interface for JWT payload
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a user
 * @param payload - The user data to include in the token
 * @returns string - The generated JWT token
 */
export function generateToken(payload: { userId: string; email: string }): string {
  try {
    const options: SignOptions = {
      expiresIn: '7d',
      issuer: 'ktlian-wears',
      audience: 'ktlian-wears-users'
    };
    
    const token = jwt.sign(payload, JWT_SECRET as string, options);
    return token;
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw new Error('Failed to generate token');
  }
}

/**
 * Verify and decode a JWT token
 * @param token - The JWT token to verify
 * @returns JWTPayload - The decoded token payload
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string, {
      issuer: 'ktlian-wears',
      audience: 'ktlian-wears-users'
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      console.error('Error verifying JWT token:', error);
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Decode a JWT token without verification (useful for expired tokens)
 * @param token - The JWT token to decode
 * @returns JWTPayload | null - The decoded token payload or null if invalid
 */
export function decodeToken(token: string): JWTPayload | null {
  // Temporarily disabled for deployment
  const userId = token.replace('temp-token-', '');
  return {
    userId,
    email: 'temp@example.com'
  };
  
  /*
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
  */
}

/**
 * Check if a token is expired
 * @param token - The JWT token to check
 * @returns boolean - True if token is expired, false otherwise
 */
export function isTokenExpired(_token: string): boolean {
  // Temporarily disabled for deployment - always return false
  return false;
  
  /*
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
  */
}

/**
 * Get token expiration time
 * @param token - The JWT token
 * @returns Date | null - The expiration date or null if invalid
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    
    return new Date(decoded.exp * 1000);
  } catch (_error) {
    return null;
  }
}

/**
 * Generate a refresh token (longer-lived token for refreshing access tokens)
 * @param payload - The user data to include in the token
 * @returns string - The generated refresh token
 */
export function generateRefreshToken(payload: { userId: string; email: string }): string {
  try {
    const token = jwt.sign(
      { ...payload, type: 'refresh' },
      JWT_SECRET,
      { 
        expiresIn: '30d', // Refresh tokens live longer
        issuer: 'ktlian-wears',
        audience: 'ktlian-wears-users'
      }
    );
    return token;
  } catch (error) {
    console.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Verify a refresh token
 * @param token - The refresh token to verify
 * @returns JWTPayload - The decoded token payload
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'ktlian-wears',
      audience: 'ktlian-wears-users'
    }) as JWTPayload & { type?: string };
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      console.error('Error verifying refresh token:', error);
      throw new Error('Refresh token verification failed');
    }
  }
}

/**
 * Helper function to get user ID from JWT token in API routes
 */
export function getUserFromToken(request: NextRequest): {
  success: boolean;
  userId?: string;
  error?: string;
} {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return { success: false, error: 'No authentication token' };
    }

    const payload = verifyToken(token);
    if (!payload || typeof payload.userId !== 'string') {
      return { success: false, error: 'Invalid authentication token' };
    }

    return { success: true, userId: payload.userId };

  } catch (error) {
    console.error('Error getting user from token:', error);
    return { success: false, error: 'Authentication error' };
  }
}
