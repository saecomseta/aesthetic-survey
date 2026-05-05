'use client'

import AdminGuard from '@/components/AdminGuard'
import LogicViewer from '@/components/LogicViewer'

export default function AdminLogicPage() {
  return (
    <AdminGuard requireSuperAdmin={true}>
      <main className="min-h-screen w-full bg-[#7A5B44] font-sans">
        <LogicViewer />
      </main>
    </AdminGuard>
  )
}
