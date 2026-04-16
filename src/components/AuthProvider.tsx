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
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
        
        if (mounted) {
          setRole(data?.role as Role ?? null)
        }
      } catch (error) {
        console.error('Error fetching role', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          if (mounted) setUser(session.user)
          currentUserId = session.user.id
          await fetchRole(session.user.id)
        } else {
          if (mounted) setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching session', error)
        if (mounted) setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
        if (session?.user) {
          // fetch role if we don't have it or if user changed
          if (session.user.id !== currentUserId) {
            currentUserId = session.user.id
            setLoading(true)
            await fetchRole(session.user.id)
          }
        } else {
          currentUserId = null
          setRole(null)
          setLoading(false)
        }
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
