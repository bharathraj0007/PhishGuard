# PhishGuard Default Admin Credentials

## 🔐 Default Admin Account

PhishGuard automatically creates a default administrator account on first startup if no admin user exists in the database.

### Default Credentials

```
Email:    admin@phishguard.com
Password: AdminPass123!@
```

## 🚀 How to Login

1. **Navigate to Login Page**: https://phishguard-web-phishing-detector-eky2mdxr.sites.blink.new/login

2. **Enter Default Credentials**:
   - Email: `admin@phishguard.com`
   - Password: `AdminPass123!@`

3. **Automatic Redirect**: Upon successful login, you'll be automatically redirected to the Admin Dashboard at `/admin`

## ⚠️ Security Best Practices

### IMPORTANT: Change Default Password

For security reasons, you should change the default admin password after your first login:

1. Login with default credentials
2. Navigate to Admin Dashboard → Settings (or User Profile)
3. Change your password to a strong, unique password
4. Update your email address if needed

### Recommended Password Requirements

- Minimum 12 characters
- Mix of uppercase and lowercase letters
- Include numbers and special characters
- Avoid common words or patterns
- Don't reuse passwords from other accounts

## 🔧 How It Works

### Automatic Initialization

The default admin account is created automatically when:

1. The app starts for the first time
2. No admin users exist in the database
3. The initialization runs in the background via `src/lib/init-admin.ts`

### Implementation Details

```typescript
// Default credentials defined in src/lib/init-admin.ts
export const DEFAULT_ADMIN_CREDENTIALS = {
  email: 'admin@phishguard.com',
  password: 'AdminPass123!@',
  displayName: 'PhishGuard Admin'
}
```

### Initialization Function

The `initializeDefaultAdmin()` function:
- Checks if any admin users exist
- Creates default admin if none found
- Logs the process to browser console
- Runs automatically on app startup in `App.tsx`

## 🛠️ Manual Admin Setup

If you prefer to create a custom admin account instead of using defaults:

1. **Visit Admin Setup Page**: `/admin-setup`
2. **Fill in Custom Details**:
   - Admin name
   - Email address
   - Strong password
3. **Create Account**

The setup page will only allow admin creation if no admin users exist.

## 🔍 Troubleshooting

### Can't Login with Default Credentials

**Problem**: Login fails with 401 Unauthorized

**Solutions**:

1. **Check Database**: Verify admin user exists
   ```sql
   SELECT id, email, role FROM users WHERE role = 'admin';
   ```

2. **Check Browser Console**: Look for initialization logs
   - ✅ "Admin user already exists" 
   - ✅ "Default admin user created successfully"
   - ❌ Error messages

3. **Clear Auth State**: Logout and try again
   - Clear browser cookies/localStorage
   - Refresh the page
   - Try logging in again

4. **Manual Admin Creation**: Use `/admin-setup` page
   - Visit the admin setup page
   - Create admin with custom credentials

### Admin Already Exists

If you see "Admin user already exists" in the console but still can't login:

1. **Password Reset**: Use the forgot password flow (if implemented)
2. **Database Reset**: Delete the existing admin user and let the app recreate it
   ```sql
   DELETE FROM users WHERE email = 'admin@phishguard.com';
   ```
3. **Refresh Page**: Reload the app to trigger re-initialization

## 📋 Admin Features

Once logged in as admin, you have access to:

### User Management
- View all registered users
- Edit user details (email, name, role, verification)
- Delete user accounts
- View user statistics

### Scan Management
- View all phishing scans across the platform
- Filter by threat level and scan type
- View detailed scan analysis
- Delete individual or bulk scans
- Monitor threat statistics

### System Settings
- Platform configuration
- Backend services status
- Database schema overview
- Security settings
- Edge functions status (9 active functions)

## 🔒 Security Notes

1. **Production Deployment**: Always change default credentials before deploying to production
2. **Access Control**: Only share admin credentials with trusted administrators
3. **Audit Logs**: Monitor admin actions in production environments
4. **Regular Updates**: Update admin passwords regularly (every 90 days recommended)
5. **Two-Factor Auth**: Consider implementing 2FA for admin accounts (future enhancement)

## 📚 Related Documentation

- [Admin Login Guide](./ADMIN_LOGIN_GUIDE.md) - Complete admin login walkthrough
- [Backend API](./BACKEND_API.md) - Admin API endpoints
- [Backend Complete](./BACKEND_COMPLETE.md) - Full backend documentation

## 🆘 Support

If you continue to have issues with admin access:

1. **Check Console Logs**: Open browser DevTools → Console tab
2. **Review Errors**: Look for authentication or initialization errors
3. **Contact Support**: Visit `/contact-support` for assistance
4. **GitHub Issues**: Report bugs on the project repository

---

**Last Updated**: December 7, 2024
**Version**: 1.0.0
