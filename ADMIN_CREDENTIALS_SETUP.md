# Admin Credentials Setup Guide

## Overview
PhishGuard has admin access controls built in. The system supports role-based access where users with the "admin" role can access the `/admin` dashboard to manage users, datasets, models, and system settings.

## Demo Credentials

### Admin Account
**Email:** `admin@phishguard.com`  
**Password:** `AdminPass123!@#`  
**Role:** Administrator  
**Access Level:** Full system access

**Capabilities:**
- User Management (create, update, delete users)
- Dataset Management (upload, organize, delete datasets)
- Model Management (train, test, deploy ML models)
- Scan Monitoring (view all user scans)
- System Settings (configure system parameters)
- Analytics Dashboard (view system-wide statistics)

### Standard User Account (Demo)
**Email:** `demo@phishguard.com`  
**Password:** `DemoPass123!@`  
**Role:** Standard User  
**Access Level:** Limited to personal dashboard and phishing detection features

**Capabilities:**
- Run phishing scans (URL, Email, SMS, QR Code)
- View personal scan history
- Access insights and analytics for own scans
- Dashboard access

---

## How to Login

### Step 1: Navigate to Login
1. Go to the PhishGuard application
2. Click "Sign In" button in the navigation or go to `/login`

### Step 2: View Demo Credentials
1. On the login page, click "View Demo Credentials"
2. A modal will appear showing all available demo credentials
3. Select either Admin or User demo credentials

### Step 3: Auto-fill or Manual Entry
**Option A - Auto-fill:**
- Click "Use These Credentials" button
- Credentials will be automatically populated in the login form

**Option B - Manual Entry:**
- Copy the email using the copy button
- Copy the password using the copy button
- Paste them into the login form

### Step 4: Sign In
1. Click "Sign In" button
2. Wait for authentication (typically <2 seconds)
3. You'll be redirected to the appropriate dashboard

---

## Admin Dashboard Access

### Accessing Admin Panel
Once logged in with admin credentials:
1. Click your profile in the navigation
2. You'll see "Admin Dashboard" option
3. Or navigate directly to `/admin`

### Admin Dashboard Sections

#### 1. **Overview Tab**
- System statistics
- User count, scan count, model performance
- Recent activity and alerts

#### 2. **Users Tab**
- View all registered users
- Manage user roles
- Activate/deactivate accounts
- Delete users if needed

#### 3. **Scans Tab**
- Monitor all system scans across all users
- View scan details and threat levels
- Analyze phishing detection patterns
- Export scan data

#### 4. **Datasets Tab**
- Upload new training datasets
- Manage existing datasets
- Set active datasets for training
- View dataset statistics

#### 5. **Models Tab**
- View trained model versions
- Start new model training
- Test model performance
- Activate/deactivate models
- View model metrics and accuracy

#### 6. **Settings Tab**
- Configure system parameters
- Set model training parameters
- Manage threat level thresholds
- Configure notification settings

---

## Creating New Admin Users

### Via Dashboard (Manual)
1. Login as admin
2. Go to Admin > Users tab
3. Click "Add New User"
4. Fill in details
5. Set role to "Admin"
6. Save

### Via API/Direct Database (For Developers)
```sql
-- Create new admin user
INSERT INTO users (
  id, 
  email, 
  email_verified, 
  password_hash, 
  display_name, 
  role, 
  is_active, 
  created_at, 
  updated_at
) VALUES (
  'admin_user_new_id',
  'newadmin@phishguard.com',
  1,
  'password_hash_here',
  'New Admin Name',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);
```

---

## Security Notes

⚠️ **Important:**
- Demo credentials are for testing and development only
- Do NOT use in production environments
- Do NOT share credentials publicly
- Change default credentials before deploying to production
- Each admin account should have a unique, strong password
- Regularly audit user access and permissions
- Monitor admin activity logs
- Use principle of least privilege when assigning roles

---

## Troubleshooting

### Can't access admin panel?
1. Verify you're logged in with admin credentials
2. Check that your account has "admin" role in the database
3. Clear browser cache and try again
4. Check browser console for any errors

### Forgot password?
1. Go to login page
2. Click "Forgot Password"
3. Enter your email address
4. Follow reset link in your email

### Two accounts showing same email?
- Database prevents duplicate emails
- If signup fails with "email already exists", that account already exists
- Use password reset if you forgot the password

### Admin role not working?
1. Verify the `role` field in users table is set to 'admin'
2. Re-login after role change
3. Clear browser local storage: DevTools > Application > Clear storage

---

## Database Schema

Admin-related user fields in the `users` table:

```
users:
  - id (TEXT, Primary Key)
  - email (TEXT, NOT NULL, UNIQUE)
  - display_name (TEXT)
  - role (TEXT) - values: 'admin', 'user'
  - is_active (INTEGER) - 1 = active, 0 = inactive
  - created_at (TEXT)
  - updated_at (TEXT)
```

---

## API Endpoints Used by Admin Dashboard

- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/scans` - List all scans
- `GET /api/datasets` - List datasets
- `POST /api/models/train` - Start model training
- `GET /api/models` - List models
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update settings

---

## For Development

### Testing Admin Features
```bash
# Login with admin credentials
Email: admin@phishguard.com
Password: AdminPass123!@#

# Then navigate to /admin
# All admin features should be available
```

### Enabling Role-Based Access Control
Admin access is controlled via `ProtectedRoute` component with `requireAdmin` prop:

```tsx
<Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
```

The component checks:
1. User is authenticated
2. User's role is 'admin'
3. If not admin, shows access denied message

---

## Support

For issues or questions:
- Email: support@phishguard.com
- Documentation: `/documentation`
- Contact: `/contact-support`
