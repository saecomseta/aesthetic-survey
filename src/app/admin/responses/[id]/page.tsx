'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, User, Phone, CalendarDays } from 'lucide-react'
import { formatPhoneNumber } from '@/lib/format'
import ReactMarkdown from 'react-markdown'

export default function ResponseDetailPage() {
  const params = useParams()
  const [response, setResponse] = useState<any>(null)
  const [survey, setSurvey] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    // 1. Fetch Response
    const { data: resData } = await supabase
      .from('responses')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!resData) {
      setLoading(false)
      return
    }
    setResponse(resData)

    // 2. Fetch Survey & Questions
    const [surveyRes, qRes] = await Promise.all([
      supabase.from('surveys').select('*').eq('id', resData.survey_id).single(),
      supabase.from('questions').select('*').eq('survey_id', resData.survey_id).order('order', { ascending: true })
    ])

    if (surveyRes.data) setSurvey(surveyRes.data)
    if (qRes.data) setQuestions(qRes.data)

    setLoading(false)
  }

  if (loading) return <AdminGuard requireSuperAdmin={true}><div className="p-12 text-center text-primary-500 animate-pulse font-medium">데이터를 분석 중입니다...</div></AdminGuard>
  
  if (!response) return (
    <AdminGuard requireSuperAdmin={true}>
      <div className="p-12 text-center text-red-500">요청하신 데이터를 찾을 수 없습니다.</div>
    </AdminGuard>
  )

  return (
    <AdminGuard requireSuperAdmin={true}>
      <div className="max-w-4xl mx-auto p-4 lg:p-10 pb-20">
        <Link href="/admin/responses" className="text-gray-500 hover:text-primary-700 font-medium flex items-center gap-2 mb-8 transition-colors w-fit p-2 -ml-2 rounded hover:bg-white border border-transparent hover:border-beige-200">
          <ArrowLeft className="w-5 h-5"/> 통합 데이터 목록으로
        </Link>

        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-beige-200 overflow-hidden mb-8">
          <div className="bg-primary-600 h-3 w-full"></div>
          <div className="p-8">
            <h1 className="text-3xl font-light text-primary-800 mb-2">{survey?.title || '설문지 데이터'} 상세 보기</h1>
            <p className="text-gray-500 text-sm">제출 일시: {new Date(response.submitted_at).toLocaleString()}</p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-beige-100 flex items-center gap-4">
            <div className="bg-primary-50 p-3 rounded-full text-primary-600"><User className="w-5 h-5"/></div>
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">성함</p><p className="font-medium text-gray-900 text-lg">{response.patient_name || '-'}</p></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-beige-100 flex items-center gap-4">
            <div className="bg-primary-50 p-3 rounded-full text-primary-600"><User className="w-5 h-5"/></div>
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">성별</p><p className="font-medium text-gray-900 text-lg">{response.patient_gender === 'M' ? '남성' : response.patient_gender === 'F' ? '여성' : '-'}</p></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-beige-100 flex items-center gap-4">
            <div className="bg-primary-50 p-3 rounded-full text-primary-600"><Phone className="w-5 h-5"/></div>
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">연락처</p><p className="font-medium text-gray-900 text-lg">{response.patient_phone ? formatPhoneNumber(response.patient_phone) : '-'}</p></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-beige-100 flex items-center gap-4">
            <div className="bg-primary-50 p-3 rounded-full text-primary-600"><CalendarDays className="w-5 h-5"/></div>
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">연령대</p><p className="font-medium text-gray-900 text-lg">{response.patient_age_group || '-'}</p></div>
          </div>
        </div>

        {/* Unified Diagnosis Result */}
        {((response.space_results && response.space_results.length > 0) || (response.sector_results && Object.keys(response.sector_results).length > 0)) && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-primary-900 mb-5 flex items-center gap-2">
              <span className="w-2 h-6 bg-primary-600 rounded-full inline-block"></span> 
              최종 진단 결과
            </h2>
            <div className="space-y-6">
              {response.space_results && response.space_results.length > 0 ? (
                // 스페이스 결과가 있을 경우 (최우선)
                response.space_results.map((res: any, idx: number) => (
                  <div key={`space-${idx}`} className="bg-white p-8 rounded-[2rem] border border-primary-200 shadow-sm relative overflow-hidden transition-shadow hover:shadow-md">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-400"></div>
                    <div className="absolute top-6 right-6">
                      <span className="bg-primary-100 text-primary-700 font-bold px-3 py-1 rounded-full text-sm shadow-sm border border-primary-200">단일 통합 진단 소견</span>
                    </div>
                    <h3 className="text-xl font-bold text-primary-900 mb-4 w-[75%] pl-3">{res.title}</h3>
                    <div className="text-gray-800 leading-relaxed font-medium whitespace-pre-wrap pl-3 prose prose-primary max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                      <ReactMarkdown>{res.script}</ReactMarkdown>
                    </div>
                  </div>
                ))
              ) : (
                // 스페이스 결과가 없을 경우 개별 섹터 노출 (통일된 UI)
                Object.entries(response.sector_results as Record<string, any>).map(([sId, res]) => {
                  if (!res.script || !res.script.trim()) return null;
                  return (
                    <div key={`sector-${sId}`} className="bg-white p-8 rounded-[2rem] border border-primary-200 shadow-sm relative overflow-hidden transition-shadow hover:shadow-md">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-400"></div>
                      <div className="absolute top-6 right-6">
                        <span className="bg-primary-50 text-primary-700 font-bold px-3 py-1 rounded-full text-sm shadow-sm border border-primary-100">{res.score} 점</span>
                      </div>
                      <h3 className="text-xl font-bold text-primary-900 mb-4 w-[75%] pl-3">{res.title}</h3>
                      <div className="text-gray-800 leading-relaxed font-medium whitespace-pre-wrap pl-3 prose prose-primary max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                        <ReactMarkdown>{res.script}</ReactMarkdown>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Raw Answers */}
        <div className="bg-white rounded-3xl border border-beige-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-beige-100 bg-beige-50/50">
            <h2 className="text-lg font-medium text-gray-800">원본 문답 상세 내역</h2>
          </div>
          <div className="p-8 space-y-6">
            {questions.length === 0 ? <p className="text-gray-400">문항 정보를 불러올 수 없습니다.</p> : questions.map((q, idx) => {
              const answer = response.answers[q.id]
              let displayAnswer = '-'
              if (answer) {
                if (Array.isArray(answer)) displayAnswer = answer.join(', ')
                else displayAnswer = answer
              }
              return (
                <div key={q.id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-primary-600 mb-2">Q{idx + 1}. {q.content}</p>
                  <div className="bg-gray-50 px-5 py-4 rounded-xl border border-gray-100 text-gray-800 whitespace-pre-wrap font-medium">{displayAnswer}</div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </AdminGuard>
  )
}
