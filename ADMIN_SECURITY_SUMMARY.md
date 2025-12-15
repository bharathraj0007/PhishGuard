# 🔒 PhishGuard Admin Security - Quick Reference

## ✅ Security Features Implemented

### 1. Dedicated Admin Login Portal
- **Access URL**: `/admin-login`
- Separate from regular user login
- Enhanced security UI with indicators
- Real-time attempt counter

### 2. Rate Limiting Protection
```
Max Attempts: 5
Attempt Window: 5 minutes
Lockout Duration: 15 minutes
```

### 3. Password Requirements
✓ Minimum 12 characters  
✓ Uppercase letter (A-Z)  
✓ Lowercase letter (a-z)  
✓ Number (0-9)  
✓ Special character (!@#$%^&*)  
✓ Not common/weak password  

### 4. Admin Role Verification
- Every admin route checks user role
- Session validation on all requests
- Automatic redirect for unauthorized access
- Security event logging

### 5. Password Change Interface
- Located in Admin Dashboard → Settings
- Real-time password strength validation
- Secure password change flow
- Confirmation required

---

## 🚀 Quick Start Guide

### First-Time Admin Access

1. **Navigate to Admin Login**
   ```
   https://your-app-url.com/admin-login
   ```

2. **Use Default Credentials**
   - Email: `admin@phishguard.com`
   - Password: `AdminPass123!@`

3. **Change Password Immediately**
   - Go to Admin Dashboard → Settings tab
   - Find "Change Admin Password" section
   - Enter current password
   - Create strong new password
   - Confirm new password
   - Click "Change Password"

### Regular Admin Login

1. Visit `/admin-login`
2. Enter your admin email and password
3. Click "Secure Admin Sign In"
4. Access granted to admin dashboard

---

## 🛡️ Security Workflow

```
User visits /admin-login
       ↓
Enters credentials
       ↓
Rate limit check (< 5 attempts?)
       ↓
Credential validation
       ↓
Admin role verification
       ↓
Session creation
       ↓
Default password check
       ↓
Access granted to /admin
```

---

## ⚠️ Important Warnings

### Default Password Warning
If using default credentials, you'll see:
```
⚠️ Action Required: Change your default password 
immediately in Admin Settings > Change Password
```

### Rate Limit Warning
After 3 failed attempts:
```
Warning: 2 attempts remaining before account lockout
```

### Account Lockout
After 5 failed attempts:
```
Too many login attempts. Please try again in 15 minutes.
```

---

## 🔐 Security Components

### Frontend Components
- `AdminLoginPage.tsx` - Secure admin login UI
- `AdminRoute.tsx` - Protected route wrapper
- `AdminPasswordChange.tsx` - Password change interface
- `admin-security.ts` - Security logic

### Security Manager Methods
- `validateAdminLogin()` - Main authentication
- `isRateLimited()` - Rate limit checker
- `verifyAdminSession()` - Session validator
- `validatePasswordStrength()` - Password validator
- `recordFailedAttempt()` - Attempt tracker

---

## 📊 Security Monitoring

### Console Logs to Watch
```javascript
✅ Admin access granted
⚠️ Unauthorized admin access attempt detected
🔒 Account locked due to too many attempts
🔑 Password changed successfully
```

### What Gets Logged
- Login attempts (success/failure)
- Unauthorized access attempts
- Password changes
- Session validations
- Rate limit triggers

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Account locked | Wait 15 minutes, retry with correct password |
| Access denied | Verify user has 'admin' role in database |
| Can't login | Check credentials are correct (case-sensitive) |
| Session expired | Log out and log back in |

---

## 📝 Security Checklist

Before going live, ensure:

- [ ] Default password changed
- [ ] HTTPS enabled
- [ ] Rate limiting tested
- [ ] Password requirements enforced
- [ ] Unauthorized access blocked
- [ ] Security logs working
- [ ] Admin role properly assigned
- [ ] Session validation active

---

## 🔄 Configuration

### Modify Rate Limits
Edit `src/lib/admin-security.ts`:
```typescript
const MAX_LOGIN_ATTEMPTS = 5          // Change max attempts
const LOCKOUT_DURATION_MS = 15 * 60 * 1000  // Change lockout time
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000     // Change attempt window
```

### Modify Password Requirements
Edit `validatePasswordStrength()` in `admin-security.ts`

---

## 📞 Need Help?

- **Full Documentation**: See `ADMIN_SECURITY_GUIDE.md`
- **Security Issue**: Contact security@phishguard.com
- **Technical Support**: Check browser console for error details

---

**System Version**: PhishGuard v1.0.0  
**Last Updated**: December 2024  
**Security Level**: Enterprise Grade 🛡️
