'use client'

import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/components/AuthProvider'
import AdminQRDashboard from '@/components/AdminQRDashboard'
import SuperAdminDashboard from '@/components/SuperAdminDashboard'

export default function AdminPage() {
  const { user, role, loading } = useAuth()

  if (loading || !user) return null // Handled by AdminGuard

  return (
    <AdminGuard>
      <main className="min-h-screen w-full bg-[#7A5B44] font-sans">
        {role === 'SUPER_ADMIN' ? (
          <SuperAdminDashboard />
        ) : (
          <AdminQRDashboard user={user} />
        )}
      </main>
    </AdminGuard>
  )
}
