# Admin Authentication Setup

## What We Added

✅ Login page at `/login`
✅ Protected admin dashboard (`/admin`)
✅ Protected reports page (`/reports`)
✅ Logout functionality
✅ User email display in header

## How to Create Admin Users

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/gwsuuowozacvqfhvgstm

2. Click **"Authentication"** in the left sidebar

3. Click **"Users"** tab

4. Click **"Add user"** button (top right)

5. Choose **"Create new user"**

6. Fill in:
   - **Email**: admin@emergency.com (or any email you want)
   - **Password**: Create a strong password (minimum 6 characters)
   - **Auto Confirm User**: ✅ Check this box (important!)

7. Click **"Create user"**

### Option 2: Using Sign Up Page (If you want to create one)

We can create a signup page later if needed, but for now, use the Supabase dashboard to create admin users manually.

## How to Login

1. Go to: `http://localhost:3000/login`

2. Enter the email and password you created

3. Click **"Sign In"**

4. You'll be redirected to the admin dashboard

## How It Works

- **Login page** (`/login`): Authenticates users with Supabase Auth
- **Admin pages** check for authentication on load
- If not logged in → redirected to `/login`
- If logged in → can access admin dashboard and reports
- **Logout button** signs out and redirects to login

## Testing

1. Try accessing `/admin` without logging in → should redirect to `/login`
2. Login with your admin credentials
3. You should see your email in the header
4. Click logout → should redirect back to login page

## Security Notes

- User page (`/`) is public (anyone can report emergencies)
- Admin pages (`/admin`, `/reports`) require authentication
- Passwords are handled securely by Supabase Auth
- Sessions are managed automatically
