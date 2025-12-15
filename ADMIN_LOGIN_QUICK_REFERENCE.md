# Admin Login - Quick Reference Guide

## 🚀 Quick Start

### Access Admin Login Page
```
URL: http://localhost:5173/admin-login
```

### Default Admin Credentials
```
Email:    admin@phishguard.com
Password: AdminPass123!@
```

### After Login
- You'll be redirected to `/admin` (Admin Dashboard)
- A warning will appear about changing the default password
- Change password in Admin Settings

---

## Login Process

### 1. Navigate to Admin Login
Click "Admin" in navbar or go to `/admin-login`

### 2. Enter Credentials
- **Email:** `admin@phishguard.com`
- **Password:** `AdminPass123!@` (click eye icon to show/hide)

### 3. Click "Secure Admin Sign In"
System verifies credentials and checks admin role

### 4. Access Granted ✓
Redirected to Admin Dashboard

### 5. Change Default Password ⚠️
Go to Admin Settings → Change Password

---

## Security Features

### Rate Limiting
- **Max Attempts:** 5
- **Window:** 5 minutes
- **Lockout:** 15 minutes after max attempts
- **Display:** "Attempts remaining: X" shown below password

### Password Requirements
After changing password, must meet:
- ✓ Minimum 12 characters
- ✓ At least 1 UPPERCASE letter
- ✓ At least 1 lowercase letter
- ✓ At least 1 number
- ✓ At least 1 special character (!@#$%^&*)

### Default Credentials Detection
- System detects if you're using default credentials
- Shows warning: "Change your default password immediately"
- You can proceed but should change password ASAP

---

## Troubleshooting

### "Invalid email or password"
- Check email spelling: `admin@phishguard.com`
- Check password spelling: `AdminPass123!@`
- Make sure Caps Lock is OFF

### "Too many login attempts"
- You've exceeded 5 failed attempts
- Account locked for 15 minutes
- Try again after lockout period

### "Access denied. Admin privileges required."
- Your account doesn't have admin role
- Contact system administrator
- Only users with `role='admin'` can access

### "Please verify your email first"
- Email not verified in system
- Contact administrator to verify email
- Or check email for verification link

---

## Admin Features

Once logged in as admin, you can:

✓ View Admin Dashboard  
✓ Manage Users  
✓ View Analytics  
✓ Manage ML Models  
✓ Import Datasets  
✓ Change Password  
✓ Configure System Settings  
✓ View Scan History  

---

## Database Queries (For Debugging)

### Check if admin user exists
```sql
SELECT * FROM users WHERE email = 'admin@phishguard.com'
```

### View all admin users
```sql
SELECT id, email, display_name, role FROM users WHERE role = 'admin'
```

### Check user role
```sql
SELECT email, role FROM users WHERE email = 'admin@phishguard.com'
```

### Update user to admin (if needed)
```sql
UPDATE users SET role = 'admin', email_verified = 1 
WHERE email = 'admin@phishguard.com'
```

---

## File Reference

### Key Files
- **Login Page:** `src/pages/AdminLoginPage.tsx`
- **Security Module:** `src/lib/admin-security.ts`
- **Route Protection:** `src/components/AdminRoute.tsx`
- **Initialization:** `src/lib/init-admin.ts`

### Configuration
- **Blink SDK:** `src/lib/blink.ts` (headless mode enabled)
- **Routes:** `src/App.tsx` (admin routes configured)

---

## API Endpoints (Blink Auth)

### Sign In
```typescript
await blink.auth.signInWithEmail(email, password)
```

### Get Current User
```typescript
const user = await blink.auth.me()
// Returns: { id, email, role, displayName, ... }
```

### Sign Out
```typescript
await blink.auth.signOut()
```

### Verify Admin Session
```typescript
const isAdmin = await adminSecurity.verifyAdminSession()
```

---

## Security Checklist

Before production deployment:
- [ ] Change default admin password
- [ ] Review `DEFAULT_ADMIN_CREDENTIALS` in `src/lib/init-admin.ts`
- [ ] Set up backup admin account
- [ ] Enable audit logging
- [ ] Configure HTTPS
- [ ] Test rate limiting
- [ ] Test failed login attempts
- [ ] Verify role checking works
- [ ] Test session timeout
- [ ] Document admin recovery procedure

---

## Rate Limiting Details

| Metric | Value |
|--------|-------|
| Max Attempts | 5 |
| Reset Window | 5 minutes |
| Lockout Duration | 15 minutes |
| Tracking | Per email address |
| Display | "Attempts remaining: X" |

### Example Timeline
```
Attempt 1 (FAIL) → Remaining: 4
Attempt 2 (FAIL) → Remaining: 3
Attempt 3 (FAIL) → Remaining: 2 ⚠️ Warning shown
Attempt 4 (FAIL) → Remaining: 1 ⚠️ Strong warning
Attempt 5 (FAIL) → Account locked for 15 minutes
Attempt 6 (DURING LOCKOUT) → "Too many attempts" error
After 15 minutes → Counter resets, can try again
```

---

## Default Password Security

### Why It Exists
- Automatic first-time setup
- No manual admin creation required
- Everyone can get started immediately

### Why You Should Change It
- Default password is documented
- Anyone could theoretically log in
- Security best practice

### How to Change
1. Log in with default credentials
2. Go to Admin Settings (in dashboard)
3. Click "Change Password"
4. Enter current password: `AdminPass123!@`
5. Enter new password (must meet requirements)
6. Confirm new password
7. Click "Save"

---

## Session Management

### Session Token
- Created after successful login
- Stored in browser localStorage (via Blink SDK)
- Automatically sent with requests
- Auto-refreshes when expired

### Session Verification
- Checked on every navigation
- Verified in AdminRoute component
- Continuous monitoring via `onAuthStateChanged()`

### Session Timeout
- Controlled by Blink SDK
- Typically 24 hours (configurable)
- Auto-logout if idle for extended period

### Manual Logout
- Click "Sign Out" in admin dashboard
- Clears session token
- Redirects to home page

---

## Common Admin Tasks

### View Dashboard
1. Log in at `/admin-login`
2. Automatically redirected to `/admin`

### Manage Users
1. Dashboard → Users tab
2. View, edit, or delete users
3. Change user roles

### View Scan Analytics
1. Dashboard → Analytics tab
2. View phishing detection statistics
3. Export reports

### Train ML Models
1. Dashboard → ML Training tab
2. Select training dataset
3. Configure model parameters
4. Start training

### Change Password
1. Dashboard → Settings
2. Click "Change Password"
3. Enter old password
4. Enter new password
5. Confirm new password

---

## Contact & Support

### Issues?
- Check "Troubleshooting" section above
- Review logs in browser console (F12)
- Contact: support@phishguard.com

### Documentation
- Full guide: `ADMIN_LOGIN_VERIFICATION_COMPLETE.md`
- Admin setup: `ADMIN_LOGIN_GUIDE.md`
- Security info: `ADMIN_SECURITY_GUIDE.md`

---

**Version:** 1.0  
**Last Updated:** December 15, 2024
