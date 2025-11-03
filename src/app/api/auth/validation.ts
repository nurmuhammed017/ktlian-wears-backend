import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .transform((email) => email.trim());

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

/**
 * Name validation schema
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .transform((name) => name.trim());

/**
 * User registration validation schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
});

/**
 * User login validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Password reset request validation schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset validation schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Change password validation schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

/**
 * Update profile validation schema
 */
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
});

/**
 * Type definitions for validation schemas
 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Validate email format
 * @param email - The email to validate
 * @returns object with validation result and error message
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  try {
    emailSchema.parse(email);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      return { isValid: false, error: firstError?.message || 'Invalid email' };
    }
    return { isValid: false, error: 'Invalid email format' };
  }
}

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns object with validation result and error messages
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  try {
    passwordSchema.parse(password);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        isValid: false, 
        errors: error.issues?.map((err: unknown) => (err as { message: string }).message) || ['Invalid password format']
      };
    }
    return { isValid: false, errors: ['Invalid password format'] };
  }
}

/**
 * Validate name format
 * @param name - The name to validate
 * @returns object with validation result and error message
 */
export function validateName(name: string): { isValid: boolean; error?: string } {
  try {
    nameSchema.parse(name);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      return { isValid: false, error: firstError?.message || 'Invalid name' };
    }
    return { isValid: false, error: 'Invalid name format' };
  }
}

/**
 * Sanitize user input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns string - The sanitized input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Check if password contains common weak patterns
 * @param password - The password to check
 * @returns object with check result and warnings
 */
export function checkPasswordCommonPatterns(password: string): { 
  isSecure: boolean; 
  warnings: string[] 
} {
  const warnings: string[] = [];
  
  // Common passwords list (simplified)
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    warnings.push('Password contains common words or patterns');
  }
  
  // Check for keyboard patterns
  const keyboardPatterns = ['qwerty', 'asdf', 'zxcv', '1234', '4321'];
  if (keyboardPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    warnings.push('Password contains keyboard patterns');
  }
  
  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    warnings.push('Password contains repeated characters');
  }
  
  // Check for dictionary words (simplified check)
  if (/^[a-zA-Z]+$/.test(password) && password.length < 12) {
    warnings.push('Password appears to be a dictionary word');
  }
  
  return {
    isSecure: warnings.length === 0,
    warnings
  };
}

/**
 * Generate password strength score
 * @param password - The password to score
 * @returns object with score (0-100) and feedback
 */
export function getPasswordStrengthScore(password: string): {
  score: number;
  feedback: string;
  color: 'red' | 'orange' | 'yellow' | 'green';
} {
  let score = 0;
  
  // Length scoring
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  
  // Character variety scoring
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
  
  // Complexity scoring
  if (password.length > 0) {
    const uniqueChars = new Set(password).size;
    const uniqueRatio = uniqueChars / password.length;
    score += Math.floor(uniqueRatio * 15);
  }
  
  // Check for common patterns (penalty)
  const patternCheck = checkPasswordCommonPatterns(password);
  if (!patternCheck.isSecure) {
    score -= 20;
  }
  
  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));
  
  // Generate feedback
  let feedback: string;
  let color: 'red' | 'orange' | 'yellow' | 'green';
  
  if (score < 30) {
    feedback = 'Very weak password';
    color = 'red';
  } else if (score < 50) {
    feedback = 'Weak password';
    color = 'orange';
  } else if (score < 70) {
    feedback = 'Fair password';
    color = 'yellow';
  } else if (score < 90) {
    feedback = 'Good password';
    color = 'green';
  } else {
    feedback = 'Excellent password';
    color = 'green';
  }
  
  return { score, feedback, color };
}
