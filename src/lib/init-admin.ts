import { blink } from './blink'

// Default admin credentials
export const DEFAULT_ADMIN_CREDENTIALS = {
  email: 'admin@phishguard.com',
  password: 'AdminPass123!@',
  displayName: 'PhishGuard Admin'
}

/**
 * Initialize default admin user if no admin exists
 * This runs automatically on app startup
 */
export async function initializeDefaultAdmin(): Promise<boolean> {
  try {
    console.log('🔍 Checking for existing admin users...')
    
    // Check if any admin user exists
    try {
      const result = await blink.db.sql<{ count: number }>(`
        SELECT COUNT(*) as count FROM users WHERE role = 'admin'
      `)
      const adminCount = result.rows?.[0]?.count || 0
      
      if (adminCount > 0) {
        console.log('✅ Admin user already exists. Skipping initialization.')
        return false
      }
    } catch (dbError) {
      console.log('⚠️ Database check failed:', dbError)
    }
    
    // Check if admin email already exists
    try {
      const existingUser = await blink.db.sql<{ id: string; role: string; email_verified: number }>(`
        SELECT id, role, email_verified FROM users WHERE email = ?
      `, [DEFAULT_ADMIN_CREDENTIALS.email])
      
      const user = existingUser.rows?.[0]
      
      if (user) {
        // User exists, update to admin if needed
        if (user.role !== 'admin' || !user.email_verified) {
          await blink.db.sql(
            `UPDATE users SET role = 'admin', email_verified = 1 WHERE email = ?`,
            [DEFAULT_ADMIN_CREDENTIALS.email]
          )
          console.log('✅ Existing user promoted to admin with verified email!')
          return true
        }
        console.log('✅ Admin user already exists with proper role and verification.')
        return false
      }
    } catch (checkError) {
      console.log('⚠️ Could not check existing user:', checkError)
    }
    
    console.log('⚠️ No admin user found. Creating default admin...')
    
    try {
      // Create admin user through Blink Auth
      const adminUser = await blink.auth.signUp({
        email: DEFAULT_ADMIN_CREDENTIALS.email,
        password: DEFAULT_ADMIN_CREDENTIALS.password,
        displayName: DEFAULT_ADMIN_CREDENTIALS.displayName,
        role: 'admin'
      })
      
      if (!adminUser) {
        console.error('❌ Failed to create default admin user')
        return false
      }

      // Ensure role is admin and email is verified in database
      await blink.db.sql(
        `UPDATE users SET role = 'admin', email_verified = 1 WHERE email = ?`,
        [DEFAULT_ADMIN_CREDENTIALS.email]
      )
      
      console.log('✅ Default admin user created successfully!')
      console.log('📧 Email:', DEFAULT_ADMIN_CREDENTIALS.email)
      console.log('🔑 Password:', DEFAULT_ADMIN_CREDENTIALS.password)
      console.log('⚠️ IMPORTANT: Change the default password after first login!')
      
      return true
    } catch (signupError: any) {
      const errorMsg = signupError?.message || signupError?.toString() || 'Unknown error'
      console.error('❌ Error during admin signup:', errorMsg)
      
      // If email already exists, try to update role
      if (errorMsg.includes('already exists') || errorMsg.includes('already registered') || errorMsg.includes('EMAIL_ALREADY_EXISTS')) {
        try {
          await blink.db.sql(
            `UPDATE users SET role = 'admin', email_verified = 1 WHERE email = ?`,
            [DEFAULT_ADMIN_CREDENTIALS.email]
          )
          console.log('✅ Existing user promoted to admin!')
          return true
        } catch (updateError) {
          console.error('❌ Failed to update user role:', updateError)
        }
      }
      return false
    }
  } catch (error) {
    console.error('❌ Error initializing default admin:', error)
    return false
  }
}

/**
 * Check if default admin credentials are being used
 * Returns true if the user should be prompted to change password
 */
export function isUsingDefaultCredentials(email: string): boolean {
  return email.toLowerCase() === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase()
}
