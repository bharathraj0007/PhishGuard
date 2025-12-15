/**
 * Admin Security Module
 * Provides secure authentication and access control for admin users
 */

import { blink } from './blink'

// Rate limiting configuration for admin login attempts
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000 // 5 minute window

interface LoginAttempt {
  timestamp: number
  count: number
  lockedUntil?: number
}

class AdminSecurityManager {
  private loginAttempts: Map<string, LoginAttempt> = new Map()
  private adminSessionTokens: Set<string> = new Set()

  /**
   * Check if an email is rate-limited
   */
  isRateLimited(email: string): { limited: boolean; retryAfter?: number } {
    const attempt = this.loginAttempts.get(email.toLowerCase())
    
    if (!attempt) {
      return { limited: false }
    }

    // Check if account is locked
    if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
      const retryAfter = Math.ceil((attempt.lockedUntil - Date.now()) / 1000)
      return { limited: true, retryAfter }
    }

    // Check if within attempt window
    if (Date.now() - attempt.timestamp > ATTEMPT_WINDOW_MS) {
      // Reset attempts if window has passed
      this.loginAttempts.delete(email.toLowerCase())
      return { limited: false }
    }

    // Check if max attempts exceeded
    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = attempt.timestamp + LOCKOUT_DURATION_MS
      attempt.lockedUntil = lockedUntil
      this.loginAttempts.set(email.toLowerCase(), attempt)
      const retryAfter = Math.ceil((lockedUntil - Date.now()) / 1000)
      return { limited: true, retryAfter }
    }

    return { limited: false }
  }

  /**
   * Record a failed login attempt
   */
  recordFailedAttempt(email: string): void {
    const key = email.toLowerCase()
    const existing = this.loginAttempts.get(key)
    
    if (!existing || Date.now() - existing.timestamp > ATTEMPT_WINDOW_MS) {
      this.loginAttempts.set(key, {
        timestamp: Date.now(),
        count: 1
      })
    } else {
      existing.count++
      existing.timestamp = Date.now()
      this.loginAttempts.set(key, existing)
    }
  }

  /**
   * Clear login attempts after successful login
   */
  clearAttempts(email: string): void {
    this.loginAttempts.delete(email.toLowerCase())
  }

  /**
   * Validate admin credentials with enhanced security
   */
  async validateAdminLogin(email: string, password: string): Promise<{
    success: boolean
    error?: string
    user?: any
    requirePasswordChange?: boolean
  }> {
    // Check rate limiting
    const rateLimitCheck = this.isRateLimited(email)
    if (rateLimitCheck.limited) {
      return {
        success: false,
        error: `Too many login attempts. Please try again in ${Math.ceil((rateLimitCheck.retryAfter || 0) / 60)} minutes.`
      }
    }

    try {
      // Attempt authentication
      const result = await blink.auth.signInWithEmail(email, password)
      
      if (!result) {
        this.recordFailedAttempt(email)
        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // Ensure tokens are ready before reading session user
      try {
        await blink.auth.getValidToken()
      } catch {
        // best-effort
      }

      // Verify user is admin
      const user = await blink.auth.me()

      // Get role from users table (most reliable)
      let effectiveRole = await this.getRoleFromUsersTable(user?.id, user?.email)
      if (!effectiveRole && user?.role) {
        effectiveRole = user.role
      }

      if (!user || effectiveRole !== 'admin') {
        // Sign out non-admin user
        try {
          await blink.auth.signOut()
        } catch {
          // best-effort
        }
        this.recordFailedAttempt(email)
        return {
          success: false,
          error: 'Access denied. Admin privileges required.'
        }
      }

      // Clear failed attempts
      this.clearAttempts(email)

      // Check if using default credentials
      const isDefaultPassword = this.isUsingDefaultCredentials(email)
      
      return {
        success: true,
        user: { ...user, role: effectiveRole },
        requirePasswordChange: isDefaultPassword
      }
    } catch (error: any) {
      this.recordFailedAttempt(email)
      
      const errorMessage = error?.message || error?.toString() || 'Authentication failed'
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return { success: false, error: 'Invalid email or password' }
      } else if (errorMessage.includes('credentials')) {
        return { success: false, error: 'Invalid email or password' }
      } else if (errorMessage.includes('verified')) {
        return { success: false, error: 'Please verify your email first' }
      } else if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        return { success: false, error: 'No account found with this email' }
      }
      
      return {
        success: false,
        error: 'Authentication failed. Please try again.'
      }
    }
  }

  /**
   * Check if user is using default admin credentials
   */
  isUsingDefaultCredentials(email: string): boolean {
    const defaultEmails = [
      'admin@phishguard.com',
      'admin@example.com',
      'administrator@phishguard.com'
    ]
    return defaultEmails.includes(email.toLowerCase())
  }

  /**
   * Verify admin session is valid
   */
  async verifyAdminSession(): Promise<boolean> {
    try {
      const user = await blink.auth.me()
      if (!user) return false
      
      // Get role from users table (most reliable)
      let effectiveRole = await this.getRoleFromUsersTable(user?.id, user?.email)
      if (!effectiveRole && user?.role) {
        effectiveRole = user.role
      }
      
      return effectiveRole === 'admin'
    } catch {
      return false
    }
  }

  /**
   * Create admin session token
   */
  createSessionToken(userId: string): string {
    const token = `admin_${userId}_${Date.now()}_${Math.random().toString(36)}`
    this.adminSessionTokens.add(token)
    return token
  }

  /**
   * Validate admin session token
   */
  validateSessionToken(token: string): boolean {
    return this.adminSessionTokens.has(token)
  }

  /**
   * Remove admin session token
   */
  removeSessionToken(token: string): void {
    this.adminSessionTokens.delete(token)
  }

  /**
   * Get remaining login attempts
   */
  getRemainingAttempts(email: string): number {
    const attempt = this.loginAttempts.get(email.toLowerCase())
    if (!attempt) return MAX_LOGIN_ATTEMPTS
    if (Date.now() - attempt.timestamp > ATTEMPT_WINDOW_MS) return MAX_LOGIN_ATTEMPTS
    return Math.max(0, MAX_LOGIN_ATTEMPTS - attempt.count)
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { valid: boolean; error?: string } {
    if (password.length < 12) {
      return { valid: false, error: 'Password must be at least 12 characters long' }
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter' }
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one lowercase letter' }
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one number' }
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one special character' }
    }

    // Check for common weak passwords
    const weakPasswords = ['password', 'admin', 'phishguard', '123456', 'qwerty']
    if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
      return { valid: false, error: 'Password is too common. Choose a stronger password.' }
    }
    
    return { valid: true }
  }

  private async getRoleFromUsersTable(userId?: string, email?: string): Promise<string | undefined> {
    try {
      if (!userId && !email) return undefined

      const filters: Record<string, any> = {}
      if (userId) filters.id = userId
      else if (email) filters.email = email

      const rows = await blink.db.list('users', { filters, limit: 1 })
      const row = rows?.[0] as any
      return row?.role
    } catch {
      return undefined
    }
  }
}

// Export singleton instance
export const adminSecurity = new AdminSecurityManager()
