import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Note: Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Fallback to anon (will fail for admin tasks)
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is missing' }, { status: 500 })
    }

    // 1. Get all profiles with role ADMIN
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'ADMIN')

    if (profileError) throw profileError

    // 2. Get all users from Auth to match emails
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    if (authError) throw authError

    // 3. Merge data
    const managers = profiles.map(p => {
      const authUser = authData.users.find(u => u.id === p.id)
      return {
        ...p,
        email: authUser?.email || 'N/A',
        nickname: p.nickname || 'N/A' // Use nickname directly from profiles table
      }
    })

    return NextResponse.json({ success: true, managers })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, email, password, nickname, action } = body

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
    }

    if (action === 'create') {
      // 1. Create User in Auth
      const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: password || '123456',
        email_confirm: true,
        user_metadata: { role: 'ADMIN', nickname: nickname }
      })

      if (authError) throw authError

      // 2. Create Profile with nickname
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({ id: userData.user.id, role: 'ADMIN', nickname: nickname })

      if (profileError) throw profileError

      return NextResponse.json({ success: true })
    }

    if (action === 'reset') {
      // Reset password to '123456'
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: '123456'
      })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'INVALID ACTION' }, { status: 400 })

  } catch (error: any) {
    console.error('Admin Management Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
