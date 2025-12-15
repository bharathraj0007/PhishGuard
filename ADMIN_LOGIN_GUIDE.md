# PhishGuard Admin Login Guide

## 🔐 How to Access the Admin Dashboard

PhishGuard uses a **role-based authentication system** where admin users can access the admin dashboard by logging in through the regular login page. The system automatically detects admin credentials and redirects to the appropriate dashboard.

---

## 📍 Admin Login Process

### Option 1: Using Demo Admin Credentials (Recommended for Testing)

1. **Navigate to Login Page**
   - Go to: `https://phishguard-web-phishing-detector-eky2mdxr.sites.blink.new/login`
   - Or click the "Login" button in the navbar

2. **Access Demo Credentials**
   - Click the "View Demo Credentials" button on the login page
   - A dialog will open showing all available demo accounts

3. **Select Admin Demo Account**
   - Find the **"Admin Demo"** section (marked with "Administrator" role)
   - Credentials:
     - **Email**: `admin@phishguard.com`
     - **Password**: `AdminPass123!@`

4. **Auto-Fill Credentials**
   - Click the "Use These Credentials" button
   - The email and password fields will be automatically filled

5. **Sign In**
   - Click the "Sign In" button
   - The system will authenticate and automatically redirect you to `/admin`

---

### Option 2: Manual Login with Admin Credentials

1. **Go to Login Page**: `/login`

2. **Enter Admin Credentials**:
   - Email: `admin@phishguard.com`
   - Password: `AdminPass123!@`

3. **Click Sign In**
   - System authenticates your credentials
   - Checks your user role in the database
   - **If role = 'admin'** → Redirects to `/admin` (Admin Dashboard)
   - **If role = 'user'** → Redirects to `/dashboard` (User Dashboard)

---

## 🎯 Demo Credentials Available

### 1. Admin Demo (Full Access)
- **Email**: `admin@phishguard.com`
- **Password**: `AdminPass123!@`
- **Role**: Administrator
- **Access**: Full admin dashboard with all features
- **Redirect**: `/admin`

### 2. Support Demo (Limited Access)
- **Email**: `demo@phishguard.com`
- **Password**: `DemoPass123!@`
- **Role**: Support Agent
- **Access**: Standard user dashboard
- **Redirect**: `/dashboard`

### 3. User Demo (Standard Access)
- **Email**: `user@phishguard.com`
- **Password**: `UserPass123!@`
- **Role**: Standard User
- **Access**: Basic scanning and history
- **Redirect**: `/dashboard`

---

## 🔒 Authentication Flow

```
User Login (/login)
    ↓
Enter Credentials
    ↓
Authenticate with Blink SDK
    ↓
Fetch User Info (blink.auth.me())
    ↓
Check User Role
    ↓
┌──────────────────────┬──────────────────────┐
│   role = 'admin'     │   role = 'user'      │
│   ↓                  │   ↓                  │
│   Redirect to        │   Redirect to        │
│   /admin             │   /dashboard         │
└──────────────────────┴──────────────────────┘
```

---

## 🛡️ Admin Dashboard Features

Once logged in as admin, you'll have access to:

### 1. **Users Tab** - User Management
- View all registered users
- Search and filter users
- Edit user details (email, name, role, verification)
- Delete users
- View user statistics

### 2. **Scans Tab** - Scan Management
- View all phishing scans across the platform
- Filter by threat level and scan type
- View detailed scan analysis
- Delete individual or bulk scans
- Monitor threat statistics

### 3. **Settings Tab** - System Information
- Platform details and version
- Backend services status
- Database schema visualization
- Security configuration
- Edge functions monitoring

---

## 🔧 Technical Implementation

### Authentication Configuration (`src/lib/blink.ts`)
```typescript
export const blink = createClient({
  projectId: 'phishguard-web-phishing-detector-eky2mdxr',
  authRequired: false,
  auth: { 
    mode: 'headless',
    roles: {
      admin: {
        permissions: ['*']  // Full permissions
      },
      user: {
        permissions: ['scans.read', 'scans.create']
      }
    }
  }
})
```

### Login Logic (`src/pages/LoginPage.tsx`)
```typescript
await blink.auth.signInWithEmail(email, password)

// Get user info to check role
const user = await blink.auth.me()

// Redirect based on user role
if (user?.role === 'admin') {
  navigate('/admin')
} else {
  navigate('/dashboard')
}
```

### Protected Admin Routes (`src/components/AdminRoute.tsx`)
```typescript
// Only allows users with 'admin' role
// Non-admin users are redirected to home page
```

---

## 🚀 Quick Access URLs

- **Home**: `https://phishguard-web-phishing-detector-eky2mdxr.sites.blink.new/`
- **Login**: `https://phishguard-web-phishing-detector-eky2mdxr.sites.blink.new/login`
- **Admin Dashboard**: `https://phishguard-web-phishing-detector-eky2mdxr.sites.blink.new/admin`
  - (Requires admin authentication)
- **User Dashboard**: `https://phishguard-web-phishing-detector-eky2mdxr.sites.blink.new/dashboard`
  - (Requires user authentication)

---

## ❓ Troubleshooting

### Problem: "Cannot access /admin page"
**Solution**: Make sure you're logged in with admin credentials. Only users with `role = 'admin'` can access the admin dashboard.

### Problem: "Redirected to home page when accessing /admin"
**Solution**: This means your account doesn't have admin role. Use the admin demo credentials: `admin@phishguard.com` / `AdminPass123!@`

### Problem: "Demo credentials not working"
**Solution**: 
1. Make sure the accounts exist in the database
2. Check that the password is exactly: `AdminPass123!@`
3. Verify email is: `admin@phishguard.com`

### Problem: "Logged in but no /Admin/ link in navbar"
**Solution**: The admin link only appears for users with admin role. Check your account role in the database.

---

## 📊 Creating Custom Admin Accounts

To create a new admin account:

1. **Sign up normally** through `/signup`
2. **Update role in database**:
   - Go to database → `users` table
   - Find your user by email
   - Update `role` field to `'admin'`
3. **Sign out and sign in again**
4. You'll now be redirected to `/admin` on login

---

## 🔐 Security Notes

- Admin credentials are stored securely in the database
- All admin API calls require JWT authentication
- Admin routes are protected by role-based access control (RBAC)
- Unauthorized access attempts are logged and redirected
- Demo credentials are for testing purposes only

---

## 📞 Support

For issues with admin access, contact:
- **Email**: support@phishguard.com
- **Emergency Hotline**: +1 (555) 789-4560
- **Live Chat**: Available 24/7

---

**Last Updated**: 2025-12-07
