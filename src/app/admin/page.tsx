'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

export default function AdminGatePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [surveyId, setSurveyId] = useState('default')

  useEffect(() => {
    const fetchFirstSurvey = async () => {
      const { data } = await supabase
        .from('surveys')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single()
      
      if (data) {
        setSurveyId(data.id)
      }
    }
    fetchFirstSurvey()
  }, [])

  const surveyUrl = user ? `/survey/${surveyId}?admin_id=${user.id}` : `/survey/${surveyId}`

  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#7A5B44] relative flex flex-col items-center justify-center overflow-hidden font-sans">
        
        {/* Center Hero */}
        <div className="relative z-10 w-full max-w-2xl px-6 animate-in fade-in zoom-in-95 duration-1000 delay-300 flex items-center justify-center">
          <Link href={surveyUrl} target="_blank" className="relative group block cursor-pointer">
            <Image 
              src="/main.png" 
              alt="SomeGood" 
              width={800} 
              height={800} 
              priority
              className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-[1.02]"
            />
          </Link>
        </div>

        {/* Footer Brand */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">
          <Link href="/admin/main" className="block group cursor-pointer p-4">
            <Image 
              src="/logo.png" 
              alt="Manage" 
              width={100} 
              height={40} 
              className="h-10 w-auto object-contain opacity-50 transition-all duration-700 group-hover:opacity-100 group-hover:scale-110"
            />
          </Link>
        </div>

      </main>
    </AdminGuard>
  )
}
