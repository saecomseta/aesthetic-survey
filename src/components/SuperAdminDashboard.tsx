'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Plus, ClipboardList, Clock, ArrowRight, ShieldAlert } from 'lucide-react'

export default function SuperAdminDashboard() {
  const [surveys, setSurveys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSurveys()
  }, [])

  const fetchSurveys = async () => {
    const { data, error } = await supabase
      .from('surveys')
      .select('*, responses(count)')
      .order('created_at', { ascending: false })

    if (data) setSurveys(data)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-light text-primary-700"><span className="font-bold">SomeGood</span> 마스터 대시보드</h1>
            <span className="bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border border-red-200">
              <ShieldAlert className="w-3 h-3" />
              최고 관리자
            </span>
          </div>
          <p className="text-gray-500">모든 고객 설문, 진단 데이터 및 시스템 설정을 관리합니다.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleSignOut}
            className="px-4 py-2 text-primary-600 border border-transparent hover:border-beige-200 hover:bg-beige-50 rounded-lg transition-colors font-medium text-sm"
          >
            로그아웃
          </button>
          <Link
            href="/admin/responses"
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors shadow-sm font-medium"
          >
            전체 통합 데이터 보기
          </Link>
          <Link 
            href="/admin/surveys/new" 
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-5 h-5" />
            새 설문 만들기
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-pulse text-primary-500">설문 목록을 불러오는 중...</div>
        </div>
      ) : surveys.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-beige-200 flex flex-col items-center shadow-sm">
          <div className="bg-beige-50 p-6 rounded-full mb-6">
            <ClipboardList className="w-10 h-10 text-primary-500" />
          </div>
          <h3 className="text-2xl font-light text-primary-800 mb-2">생성된 설문지가 없습니다</h3>
          <p className="text-gray-500 mb-8 max-w-sm">첫 번째 프리미엄 설문지를 작성하고 고객을 맞이하세요.</p>
          <Link 
            href="/admin/surveys/new" 
            className="px-8 py-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-all shadow-md hover:shadow-lg font-medium inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            설문지 생성
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map(survey => (
            <Link 
              href={`/admin/surveys/${survey.id}`} 
              key={survey.id}
              className="bg-white group rounded-2xl p-6 border border-beige-200 hover:border-primary-300 hover:shadow-md transition-all flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${survey.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                  {survey.is_active ? '활성 (운영 중)' : '비활성 (마감)'}
                </span>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2 line-clamp-2 leading-snug">{survey.title}</h3>
              
              <div className="mt-auto pt-6 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1.5 opacity-80">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(survey.created_at).toLocaleDateString()}</span>
                </div>
                <div className="font-medium text-primary-700 bg-beige-100 px-3 py-1.5 rounded-lg border border-beige-200">
                  총 {survey.responses[0]?.count || 0}건 응답
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
