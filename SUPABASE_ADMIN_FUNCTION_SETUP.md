# Setup Supabase Edge Function for Admin Creation

## Step 1: Create Edge Function in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/gwsuuowozacvqfhvgstm

2. Click **"Edge Functions"** in the left sidebar

3. Click **"Create a new function"**

4. Name it: `create-admin-user`

5. Paste this code:

```javascript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { email, password, role } = await req.json()

    // Validate inputs
    if (!email || !password || !role) {
      throw new Error('Email, password, and role are required')
    }

    // Check if requester is super admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the requester is a super admin
    const { data: { user } } = await supabaseClient.auth.getUser()
    
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { data: profile } = await supabaseClient
      .from('admin_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      throw new Error('Only super admins can create admin users')
    }

    // Create the new user using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (createError) throw createError

    // Create admin profile
    const { error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .insert([
        {
          user_id: newUser.user.id,
          email: email,
          role: role
        }
      ])

    if (profileError) throw profileError

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: newUser.user.id, email: newUser.user.email },
        message: 'Admin user created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
```

6. Click **"Deploy"**

## Step 2: Get Your Service Role Key

1. In Supabase Dashboard, go to **Settings** → **API**
2. Find **"service_role"** key (NOT the anon key)
3. Copy it (keep it secret!)
4. The edge function will use it automatically

## Step 3: Test the Function

The function is now deployed at:
`https://gwsuuowozacvqfhvgstm.supabase.co/functions/v1/create-admin-user`

## Done!

Now the "Add Admin" button in your app will work directly without going to Supabase!
