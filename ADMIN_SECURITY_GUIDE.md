# PhishGuard Admin Security Guide

## 🔒 Overview

PhishGuard implements enterprise-grade security measures to protect admin access to the platform. This guide outlines all security features and best practices.

---

## 🛡️ Security Features

### 1. **Dedicated Admin Login Portal**
- **URL**: `/admin-login`
- Separate authentication endpoint from regular user login
- Enhanced security monitoring and logging
- Visual security indicators for users

### 2. **Rate Limiting Protection**
- **Maximum Attempts**: 5 failed login attempts
- **Lockout Duration**: 15 minutes
- **Attempt Window**: 5 minutes
- Automatic account lockout after max attempts exceeded
- Real-time remaining attempts display

### 3. **Password Security Requirements**
All admin passwords must meet the following criteria:
- ✅ Minimum 12 characters long
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ At least one special character (!@#$%^&*)
- ✅ Not a common or weak password
- ✅ Must be different from current password when changing

### 4. **Session-Based Access Control**
- Automatic session validation on every admin page
- Session tokens with unique identifiers
- Automatic session expiration
- Invalid session detection and logging

### 5. **Role-Based Access Control (RBAC)**
- Admin role verification on all protected routes
- Automatic redirect for non-admin users
- Real-time role checking via auth state listener
- Unauthorized access attempt logging

### 6. **Enhanced Authentication Flow**
```
User enters credentials
    ↓
Rate limit check
    ↓
Credential validation
    ↓
Admin role verification
    ↓
Session creation
    ↓
Default password check
    ↓
Admin dashboard access granted
```

---

## 🔑 Default Admin Credentials

### Initial Setup
After deployment, the system automatically creates a default admin account:

- **Email**: `admin@phishguard.com`
- **Password**: `AdminPass123!@`
- **Role**: admin

### ⚠️ CRITICAL SECURITY NOTICE

**You MUST change the default password immediately after first login!**

1. Log in with default credentials
2. Navigate to **Admin Dashboard → Settings tab**
3. Use the **"Change Admin Password"** form
4. Enter a strong, unique password meeting all security requirements

---

## 🚀 Accessing Admin Panel

### Step 1: Navigate to Admin Login
Visit: `https://your-domain.com/admin-login`

### Step 2: Enter Credentials
- Enter your admin email address
- Enter your admin password
- System will display remaining login attempts

### Step 3: Authentication
- System validates credentials
- Checks admin role
- Creates secure session
- Redirects to admin dashboard

### Step 4: First-Time Login (Default Credentials)
If using default credentials, you'll see a warning:
> ⚠️ **Action Required**: Change your default password immediately

---

## 🔐 Security Best Practices

### For Administrators

1. **Change Default Password Immediately**
   - Never use default credentials in production
   - Use a password manager to generate strong passwords

2. **Use Strong, Unique Passwords**
   - Mix of uppercase, lowercase, numbers, symbols
   - Avoid personal information
   - Don't reuse passwords from other services

3. **Monitor Login Attempts**
   - Check system logs regularly
   - Investigate failed login attempts
   - Report suspicious activity

4. **Secure Your Workstation**
   - Use up-to-date antivirus software
   - Enable firewall protection
   - Log out when stepping away

5. **Enable HTTPS**
   - Always access admin panel via HTTPS
   - Never enter credentials on HTTP connections
   - Verify SSL certificate is valid

### For System Administrators

1. **Regular Security Audits**
   - Review user access logs
   - Check for unauthorized access attempts
   - Monitor edge function logs

2. **Keep Dependencies Updated**
   - Regularly update npm packages
   - Monitor security advisories
   - Apply security patches promptly

3. **Backup Strategy**
   - Regular database backups
   - Secure backup storage
   - Test restore procedures

4. **Network Security**
   - Use firewall rules
   - Restrict admin access by IP (if possible)
   - Enable DDoS protection

---

## 🛠️ Security Features in Code

### AdminSecurityManager Class

Located in: `src/lib/admin-security.ts`

#### Key Methods:

**`isRateLimited(email: string)`**
- Checks if email is currently rate-limited
- Returns remaining lockout time if applicable

**`validateAdminLogin(email: string, password: string)`**
- Comprehensive login validation
- Rate limiting enforcement
- Admin role verification
- Default password detection

**`verifyAdminSession()`**
- Validates current user is admin
- Called on every protected route access

**`validatePasswordStrength(password: string)`**
- Enforces password complexity requirements
- Checks against common weak passwords

**`recordFailedAttempt(email: string)`**
- Logs failed login attempts
- Increments attempt counter
- Triggers lockout if needed

**`clearAttempts(email: string)`**
- Resets attempt counter on successful login

---

## 🔍 Monitoring & Logging

### What Gets Logged:

1. **Successful Logins**
   - Timestamp
   - User email
   - IP address (if available)

2. **Failed Login Attempts**
   - Timestamp
   - Email used
   - Failure reason
   - Remaining attempts

3. **Unauthorized Access Attempts**
   - Non-admin users trying to access admin routes
   - Console warnings with user info

4. **Security Events**
   - Password changes
   - Account lockouts
   - Session creation/destruction

### Viewing Logs:

Check browser console (F12) for security events:
```
✅ Admin access granted
⚠️ Unauthorized admin access attempt detected
🔒 Account locked due to too many attempts
```

---

## 🚨 Incident Response

### If Unauthorized Access is Detected:

1. **Immediate Actions**
   - Change admin password immediately
   - Review recent admin activity
   - Check for unauthorized changes

2. **Investigation**
   - Review security logs
   - Identify compromised credentials
   - Determine scope of breach

3. **Remediation**
   - Force password reset for all admins
   - Review and revoke suspicious sessions
   - Update security measures if needed

4. **Prevention**
   - Implement additional security layers
   - Train team on security best practices
   - Consider IP whitelisting

---

## 📊 Security Checklist

Use this checklist to ensure your admin panel is secure:

- [ ] Default admin password has been changed
- [ ] All admin users have strong, unique passwords
- [ ] HTTPS is enabled and certificate is valid
- [ ] Rate limiting is active and working
- [ ] Session timeouts are configured
- [ ] Security logs are being monitored
- [ ] Backup strategy is in place
- [ ] Dependencies are up to date
- [ ] Admin access is restricted (if possible)
- [ ] Team is trained on security practices

---

## 🆘 Troubleshooting

### "Too many login attempts"
**Problem**: Account is locked due to failed attempts
**Solution**: Wait 15 minutes, then try again with correct credentials

### "Access denied. Admin privileges required"
**Problem**: User account doesn't have admin role
**Solution**: Contact system administrator to upgrade account role

### "Invalid email or password"
**Problem**: Credentials are incorrect
**Solution**: 
1. Verify email address is correct
2. Check password (case-sensitive)
3. If forgot password, contact admin

### Can't access admin dashboard after login
**Problem**: Session not properly created
**Solution**:
1. Clear browser cookies
2. Log out and log back in
3. Try different browser
4. Check browser console for errors

---

## 📞 Support

For security-related questions or to report vulnerabilities:

- **Email**: security@phishguard.com
- **Emergency**: Contact system administrator immediately

---

## 🔄 Change Log

### Version 1.0.0
- Initial security implementation
- Rate limiting (5 attempts, 15-min lockout)
- Password requirements (12+ chars, complexity)
- Admin role verification
- Session-based access control
- Default password detection

---

**Last Updated**: December 2024
**Document Version**: 1.0.0
**System Version**: PhishGuard v1.0.0
