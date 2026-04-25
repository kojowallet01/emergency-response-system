# User Management System

## ✅ What We Added

### Admin Management Page (`/manage-admins`)
- **View all admin users** in a clean table
- **Edit admin roles** with one click
- **Remove admin users** (except super admins)
- **Color-coded role badges** (Fire=Red, Medical=Blue, Crime=Orange, Super Admin=Green)
- **Super admin only access** - Regular admins can't access this page

### Features

1. **Admin List Table**
   - Email address
   - Current role with color badge
   - Creation date
   - User ID (first 8 characters)
   - Action buttons (Edit/Remove)

2. **Edit Role**
   - Click "Edit Role" button
   - Select new role from dropdown
   - Changes save immediately
   - Confirmation message

3. **Remove Admin**
   - Click "Remove" button
   - Confirmation dialog
   - Admin removed from system
   - Cannot remove super admins (safety feature)

4. **Add New Admin**
   - Click "+ Add Admin" button
   - Shows instructions for creating user in Supabase
   - Guides through the process

## How to Use

### Access Admin Management
1. **Login as super admin** (`kojowallet01@gmail.com` or your super admin account)
2. **Look for "👥 Manage Admins"** button in the header (blue button)
3. **Click it** to go to admin management page

### View All Admins
- See complete list of all admin users
- View their roles, emails, and creation dates
- Color-coded badges for easy identification

### Change an Admin's Role
1. Find the admin in the table
2. Click **"Edit Role"** button
3. Select new role from dropdown:
   - Fire
   - Medical
   - Crime
   - Super Admin
4. Role updates immediately
5. Click **"Cancel"** to abort

### Remove an Admin
1. Find the admin in the table
2. Click **"Remove"** button (red)
3. Confirm in the dialog
4. Admin is removed from system
5. **Note**: Cannot remove super admins

### Add a New Admin

**Method 1: Via Supabase Dashboard (Current)**
1. Go to Supabase: https://supabase.com/dashboard/project/gwsuuowozacvqfhvgstm
2. Click **Authentication** → **Users**
3. Click **"Add user"** → **"Create new user"**
4. Enter:
   - Email: `newadmin@example.com`
   - Password: Choose a strong password
   - ✅ Check "Auto Confirm User"
5. Click **"Create user"**
6. **Copy the User ID** (UUID)
7. Go to **Table Editor** → **admin_profiles**
8. Click **"Insert"** → **"Insert row"**
9. Fill in:
   - **user_id**: Paste the UUID
   - **email**: Same email as step 4
   - **role**: Choose (fire, medical, crime, or super_admin)
10. Click **"Save"**
11. Refresh the Manage Admins page

## Role Descriptions

### Fire Admin
- **Access**: Only fire emergencies
- **Color**: Red badge
- **Permissions**: View, respond, resolve fire reports

### Medical Admin
- **Access**: Only medical emergencies
- **Color**: Blue badge
- **Permissions**: View, respond, resolve medical reports

### Crime Admin
- **Access**: Only crime emergencies
- **Color**: Orange badge
- **Permissions**: View, respond, resolve crime reports

### Super Admin
- **Access**: ALL emergencies + admin management
- **Color**: Green badge
- **Permissions**: 
  - View all emergency types
  - Manage other admins
  - Change roles
  - Remove admins
  - Full system access

## Security Features

### Access Control
- Only super admins can access `/manage-admins`
- Regular admins redirected to dashboard
- Authentication required for all actions

### Safety Measures
- Cannot remove super admin accounts
- Confirmation dialogs for destructive actions
- Role changes logged (via Supabase)
- User IDs displayed for audit trail

### Best Practices
1. **Limit super admins**: Only give super admin to trusted users
2. **Regular audits**: Review admin list periodically
3. **Remove inactive admins**: Clean up old accounts
4. **Strong passwords**: Enforce when creating users
5. **Role principle**: Give minimum necessary permissions

## Current Admins

Based on your setup:
- `fire@emergency.com` - Fire Admin
- `medical@emergency.com` - Medical Admin
- `crime@emergency.com` - Crime Admin
- `kojowallet01@gmail.com` - Super Admin

## Future Enhancements (Optional)

Want more user management features?
- **Activity logs**: Track who did what and when
- **Bulk operations**: Add/remove multiple admins at once
- **Email invitations**: Send invite links to new admins
- **Password reset**: Allow admins to reset their passwords
- **Two-factor authentication**: Extra security layer
- **Session management**: See active sessions, force logout
- **Audit trail**: Complete history of all admin actions
- **Role permissions**: Granular control over what each role can do
- **Admin groups**: Organize admins into teams
- **Notifications**: Alert when admins are added/removed

## Troubleshooting

### "Access denied: Super admin only"
- You're not logged in as a super admin
- Check your role in the admin_profiles table
- Login with super admin account

### Can't see "Manage Admins" button
- Button only appears for super admins
- Check if you're logged in with correct account
- Verify your role in database

### Error updating role
- Check Supabase connection
- Verify admin_profiles table permissions
- Check browser console for errors

### Can't remove admin
- Super admins cannot be removed (by design)
- Check if you have permission
- Verify the admin exists in database
