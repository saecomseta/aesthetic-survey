
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Role = 'SUPER_ADMIN' | 'ADMIN' | null

interface AuthContextType {
  user: User | null
  role: Role
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let currentUserId: string | null = null

    async function fetchRole(userId: string) {
      if (!mounted) return
      console.log(`[Auth] 🔑 Fetching role for: ${userId}`)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .limit(1)
        
        if (mounted) {
          if (error || !data || data.length === 0) {
            setRole('ADMIN')
          } else {
            setRole(data[0].role as Role ?? 'ADMIN')
          }
          console.log(`[Auth] ✅ Role assigned: ${data?.[0]?.role || 'ADMIN'}`)
        }
      } catch (e) {
        if (mounted) setRole('ADMIN')
      } finally {
        // ALWAYS ensure loading finishes
        if (mounted) setLoading(false)
      }
    }

    // 1. Check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) {
        console.log('[Auth] 🟢 Session found on init')
        setUser(session.user)
        currentUserId = session.user.id
        // Start fetching role, but we can set loading to false IF it's not a super-admin-required page
        // Actually, to make it snappy, let's set loading to false and let the Guard handle role checks
        setLoading(false) 
        fetchRole(session.user.id)
      } else {
        console.log('[Auth] 🟡 No session on init')
        setLoading(false)
      }
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] 🔄 Event: ${event}`)
      if (!mounted) return

      if (session) {
        setUser(session.user)
        if (session.user.id !== currentUserId) {
          currentUserId = session.user.id
          setLoading(true)
          fetchRole(session.user.id)
        }
      } else {
        setUser(null)
        setRole(null)
        currentUserId = null
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
