'use client'

import AdminGuard from '@/components/AdminGuard'
import LogicViewer from '@/components/LogicViewer'

export default function AdminLogicPage() {
  return (
    <AdminGuard requireSuperAdmin={true}>
      <LogicViewer />
    </AdminGuard>
  )
}
