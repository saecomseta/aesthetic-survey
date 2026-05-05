import { AuthProvider } from '@/components/AuthProvider'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-beige-50">
        {children}
      </div>
    </AuthProvider>
  )
}
