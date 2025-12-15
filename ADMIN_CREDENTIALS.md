# 🔐 PhishGuard Admin Credentials

## Your Admin Login Information

### Email
```
admin@phishguard.com
```

### Password
```
AdminPass123!@
```

---

## ✅ How to Access Admin Dashboard

### Step 1: Go to Login Page
Navigate to: `https://phishguard-web-phishing-detector-eky2mdxr.sites.blink.new/login`

### Step 2: Enter Admin Credentials
- **Email**: `admin@phishguard.com`
- **Password**: `AdminPass123!@`

### Step 3: Click "Secure Admin Sign In"
You will be automatically redirected to the Admin Dashboard at `/admin`

---

## ⚠️ IMPORTANT Security Notes

### 🔴 Critical Actions Required

1. **CHANGE DEFAULT PASSWORD IMMEDIATELY**
   - After first login, go to Admin Dashboard → Settings → Change Password
   - Create a strong, unique password
   - Do NOT continue using default credentials in production

2. **Password Requirements**
   - Minimum 12 characters
   - At least one uppercase letter (A-Z)
   - At least one lowercase letter (a-z)
   - At least one number (0-9)
   - At least one special character (!@#$%^&*)
   - No common words or patterns
   - Example: `Phishing#Secure2024!`

---

## 🚀 What You Can Do as Admin

Once logged in, access these admin features:

### 1. **User Management Dashboard**
- View all registered users
- Edit user information
- Delete user accounts
- View user statistics and activity
- Monitor user registrations

### 2. **Scan Management**
- View all phishing scans across platform
- Filter by threat level (Safe, Suspicious, Dangerous)
- Filter by scan type (URL, Email, SMS, QR)
- View detailed scan analysis and indicators
- Delete individual or bulk scans
- Export scan data

### 3. **Analytics Dashboard**
- Real-time platform statistics
- Threat level distribution
- Scan type breakdown
- Top detected threats
- User activity metrics
- System performance metrics

### 4. **ML Model Management**
- **CSV Upload Training**: Train models with your datasets
  - Upload CSV files with phishing data
  - Select detection type (URL, Email, SMS, QR)
  - Monitor training progress
  - View model performance metrics

- **Kaggle Dataset Import**: Import datasets from Kaggle
  - Search for phishing datasets
  - Auto-download and process
  - Organize by detection type

- **Model Training**: Train specialized models
  - Character-CNN for URL detection
  - BiLSTM for SMS detection
  - Universal Sentence Encoder for Email detection
  - QR Code phishing analysis

- **Model Testing**: Validate model performance
  - Test against labeled datasets
  - View accuracy metrics
  - Compare model versions
  - Monitor training progress

- **Dataset Management**: Manage training datasets
  - View uploaded datasets
  - Check dataset statistics
  - Review training records
  - Track dataset versions

### 5. **System Settings**
- View platform configuration
- Monitor backend services status
- Check database schema
- View security settings
- Track edge functions status

---

## 🔧 Troubleshooting Login

### Problem: Login fails with "Invalid email or password"

**Solutions:**
1. **Check Email**: Ensure you entered `admin@phishguard.com` correctly
2. **Check Password**: Ensure you entered `AdminPass123!@` exactly (case-sensitive)
3. **Clear Browser Cache**:
   - Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
   - Clear cookies and cached data
   - Refresh the page
4. **Try Incognito Mode**: Open page in private/incognito window
5. **Check Admin Exists**: Browser console should show:
   - ✅ "Admin user already exists" OR
   - ✅ "Default admin user created successfully"

### Problem: Rate-limited (too many failed attempts)

**Solution:**
- Wait 15 minutes for the lockout to expire
- Failed attempts are tracked per email address
- Maximum 5 attempts within 5-minute window

### Problem: "Access denied. Admin privileges required."

**Solution:**
- Your account exists but doesn't have admin role
- Contact database administrator
- Or delete the user and let it recreate during initialization

---

## 📊 Admin Dashboard Features Overview

### User Management
```
Admin Dashboard
├── Users Section
│   ├── List all users
│   ├── View user details (email, name, role, status)
│   ├── Edit user information
│   ├── Delete users
│   └── User statistics
```

### Scan Management
```
Admin Dashboard
├── Scans Section
│   ├── View all scans
│   ├── Filter by type (URL, Email, SMS, QR)
│   ├── Filter by threat level
│   ├── View detailed analysis
│   ├── Delete scans
│   └── Export data
```

### Analytics
```
Admin Dashboard
├── Analytics Section
│   ├── Total scans
│   ├── Threat distribution
│   ├── Type breakdown
│   ├── Top threats
│   ├── User activity
│   └── System metrics
```

### ML Training
```
Admin Dashboard
├── ML Training Section
│   ├── CSV Upload & Training
│   ├── Kaggle Dataset Import
│   ├── Model Management
│   ├── Model Testing
│   ├── Dataset Management
│   └── Training history
```

---

## 🔐 Security Best Practices

### Do's ✅
- ✅ Change default password after first login
- ✅ Use strong, unique passwords (12+ characters)
- ✅ Keep admin credentials secure and confidential
- ✅ Log out after each session
- ✅ Update password every 90 days
- ✅ Monitor admin activity logs
- ✅ Enable browser autofill for secure password storage

### Don'ts ❌
- ❌ Never share admin credentials via email or chat
- ❌ Never hardcode credentials in code
- ❌ Never use simple or guessable passwords
- ❌ Never reuse passwords from other accounts
- ❌ Never leave session logged in unattended
- ❌ Never access admin from public WiFi without VPN
- ❌ Never write credentials in sticky notes or unencrypted files

---

## 📱 Session Management

### Session Timeout
- Admin sessions are monitored continuously
- Suspicious activity triggers automatic logout
- Idle sessions may expire after extended inactivity

### Multiple Logins
- Only one active admin session at a time
- Logging in from another device logs out previous session

### Account Lockout
- 5 failed login attempts within 5 minutes = 15-minute lockout
- Lockout time extends if attempts continue
- Contact support to reset lockout

---

## 🆘 Need Help?

### For Support:
1. **Visit**: `/contact-support` page
2. **Check**: [ADMIN_LOGIN_GUIDE.md](./ADMIN_LOGIN_GUIDE.md)
3. **Review**: [ADMIN_SECURITY_GUIDE.md](./ADMIN_SECURITY_GUIDE.md)
4. **Error Logs**: Check browser console (F12 → Console tab)

### Common Issues:

| Problem | Solution |
|---------|----------|
| Can't login | Check email/password spelling, clear cache |
| Account locked | Wait 15 minutes for lockout to expire |
| Forgot password | Use password reset link on login page |
| No admin exists | Reload app to trigger initialization |
| Role not admin | Contact database administrator |

---

## 📋 Initialization Verification

When you first load the app, check your browser console (F12) for these logs:

### ✅ Success Messages
```
🔍 Checking for existing admin users...
✅ Default admin user created successfully!
📧 Email: admin@phishguard.com
🔑 Password: AdminPass123!@
⚠️ IMPORTANT: Change the default password after first login!
```

### ✅ Already Exists
```
🔍 Checking for existing admin users...
✅ Admin user already exists. Skipping initialization.
```

---

## 🔄 After First Login

### Immediate Actions
1. ✅ Login with default credentials
2. ✅ Navigate to Settings
3. ✅ Change password to secure, unique password
4. ✅ Update profile information if needed
5. ✅ Review security settings

### Recommended Setup
1. Configure platform settings
2. Set up ML model training
3. Import datasets from Kaggle
4. Create backup admin account
5. Document any custom configurations

---

## 📞 Support Contacts

- **Email**: support@phishguard.com
- **Documentation**: See ADMIN_LOGIN_GUIDE.md
- **Security Issues**: Report immediately to admin panel
- **Bug Reports**: GitHub issues or support page

---

**Last Updated**: December 14, 2024  
**Status**: ✅ Active and Ready to Use
