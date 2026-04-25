# Role-Based Access Control Setup

## Step 1: Create Admin Profiles Table in Supabase

1. Go to your Supabase project: https://supabase.com/dashboard/project/gwsuuowozacvqfhvgstm

2. Click **"SQL Editor"** in the left sidebar

3. Click **"New query"**

4. Copy and paste ONLY this SQL (don't include the reports table):

```sql
-- Create admin_profiles table
CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('fire', 'medical', 'crime', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON admin_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Allow insert for authenticated users (for first-time setup)
CREATE POLICY "Allow insert for authenticated users"
  ON admin_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

5. Click **"Run"** to execute the query

## Step 2: Create Admin Users

1. Go to **Authentication → Users** in Supabase

2. Click **"Add user"** → **"Create new user"**

3. Create these users (one at a time):
   - Email: `fire@emergency.com`, Password: (your choice), ✅ Auto Confirm User
   - Email: `medical@emergency.com`, Password: (your choice), ✅ Auto Confirm User
   - Email: `crime@emergency.com`, Password: (your choice), ✅ Auto Confirm User
   - Email: `admin@emergency.com`, Password: (your choice), ✅ Auto Confirm User

## Step 3: Assign Roles to Users

### Method 1: Using Table Editor (Easiest)

1. Go to **Table Editor** in Supabase
2. Click on **admin_profiles** table
3. Click **"Insert"** → **"Insert row"**
4. For each user, add a row:
   - **user_id**: Copy from Authentication → Users (click on user to see their UUID)
   - **email**: The user's email
   - **role**: Choose one: `fire`, `medical`, `crime`, or `super_admin`

### Method 2: Using SQL

After creating the users, get their UUIDs from Authentication → Users, then run:

```sql
-- Replace 'USER_ID_HERE' with actual UUIDs from auth.users

-- Fire Admin
INSERT INTO admin_profiles (user_id, email, role)
VALUES ('USER_ID_HERE', 'fire@emergency.com', 'fire');

-- Medical Admin
INSERT INTO admin_profiles (user_id, email, role)
VALUES ('USER_ID_HERE', 'medical@emergency.com', 'medical');

-- Crime Admin
INSERT INTO admin_profiles (user_id, email, role)
VALUES ('USER_ID_HERE', 'crime@emergency.com', 'crime');

-- Super Admin (can see everything)
INSERT INTO admin_profiles (user_id, email, role)
VALUES ('USER_ID_HERE', 'admin@emergency.com', 'super_admin');
```

## Step 4: Test the System

1. Login as `fire@emergency.com` → Should only see fire emergencies
2. Login as `medical@emergency.com` → Should only see medical emergencies
3. Login as `crime@emergency.com` → Should only see crime emergencies
4. Login as `admin@emergency.com` → Should see ALL emergencies

## Roles Explained

- **fire**: Can only view and manage fire emergencies (🔥)
- **medical**: Can only view and manage medical emergencies (🏥)
- **crime**: Can only view and manage crime emergencies (🚔)
- **super_admin**: Can view and manage ALL emergency types

## How It Works

- When an admin logs in, the system fetches their role from `admin_profiles`
- Reports are filtered based on the admin's role
- Stats only show counts for their assigned emergency type
- Super admins bypass all filters and see everything
- The header shows the admin's role (e.g., "Fire Admin" or "Super Admin")
