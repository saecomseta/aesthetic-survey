'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

interface AdminGuardProps {
  children: React.ReactNode
  requireSuperAdmin?: boolean
}

export default function AdminGuard({ children, requireSuperAdmin = false }: AdminGuardProps) {
  const { user, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/admin/login')
      } else if (requireSuperAdmin && role !== 'SUPER_ADMIN') {
        router.push('/admin') // Redirect to normal admin dashboard if unauthorized
      }
    }
  }, [user, role, loading, requireSuperAdmin, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-beige-50">
      <div className="animate-pulse text-primary-500">Authenticating...</div>
    </div>
  )

  if (!user) return null
  if (requireSuperAdmin && role !== 'SUPER_ADMIN') return null

  return <>{children}</>
}
