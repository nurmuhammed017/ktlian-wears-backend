interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  isAllowed(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.store[identifier];

    // Clean up expired records
    if (record && now > record.resetTime) {
      delete this.store[identifier];
    }

    if (!this.store[identifier]) {
      // First request in window
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      };
    }

    if (this.store[identifier].count >= this.config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: this.store[identifier].resetTime,
      };
    }

    // Increment count
    this.store[identifier].count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - this.store[identifier].count,
      resetTime: this.store[identifier].resetTime,
    };
  }

  // Clean up expired records (call periodically)
  cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    });
  }
}

// Create rate limiters for different endpoints
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per 15 minutes
});

export const generalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

// Rate limiting middleware for API routes
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return function rateLimitMiddleware(identifier: string) {
    const result = limiter.isAllowed(identifier);
    
    if (!result.allowed) {
      throw new Error('Rate limit exceeded');
    }
    
    return result;
  };
}

// Get client identifier (IP address or user ID)
export function getClientIdentifier(request: Request): string {
  // In a real application, you'd get the IP address from the request
  // For now, we'll use a simple hash of the user agent
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return userAgent.split(' ').slice(0, 3).join(' '); // Use first 3 parts of user agent
}

// Clean up expired records every 5 minutes
setInterval(() => {
  authRateLimiter.cleanup();
  generalRateLimiter.cleanup();
}, 5 * 60 * 1000);
