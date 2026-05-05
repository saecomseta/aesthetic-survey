
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

interface AdminGuardProps {
  children: React.ReactNode
  requireSuperAdmin?: boolean
}

export default function AdminGuard({ children, requireSuperAdmin = false }: AdminGuardProps) {
  const { user, role, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Optimization: Allow rendering if we have a user and don't strictly need a super-admin check.
  const isAuthorized = user && (!requireSuperAdmin || role === 'SUPER_ADMIN')
  const shouldShowContent = isAuthorized

  useEffect(() => {
    // Only redirect if loading is definitely finished and still no user
    if (!loading && !user && pathname !== '/admin/login') {
      router.push('/admin/login')
    }
    // Redirect if role is determined and not super admin (when required)
    if (!loading && user && requireSuperAdmin && role !== 'SUPER_ADMIN' && role !== null) {
      router.push('/admin/main')
    }
  }, [user, role, loading, requireSuperAdmin, router, pathname])

  if (shouldShowContent) {
    return <>{children}</>
  }

  // Show loading only when we absolutely don't know who the user is
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#7A5B44]">
      <div className="flex flex-col items-center gap-6">
        <div className="w-10 h-10 border-4 border-white/5 border-t-white/60 rounded-full animate-spin"></div>
        <div className="text-white/30 font-bold uppercase tracking-[0.4em] text-[9px] animate-pulse">
          Authenticating...
        </div>
      </div>
    </div>
  )
}
