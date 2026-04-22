'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { 
  ArrowLeft, User, Phone, CalendarDays, AlertCircle, CheckCircle2, 
  Sparkles, AlertTriangle, Clock, FileText, ChevronLeft
} from 'lucide-react'
import { formatPhoneNumber } from '@/lib/format'
import { motion, AnimatePresence } from 'framer-motion'

// LITERALLY IMPORT THE ENGINE (Same as survey page)
import { calculateStandardResult } from '@/utils/standardEngine'
import { calculateFirstSessionDecision, calculateProfileAnalysis } from '@/utils/firstSessionEngine'

export default function ResponseDetailPage() {
  const { user, role } = useAuth()
  const params = useParams()
  const [response, setResponse] = useState<any>(null)
  const [survey, setSurvey] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    try {
      const { data: resData, error: resError } = await supabase
        .from('responses')
        .select('*')
        .eq('id', params.id)
        .single()

      if (resError || !resData) {
        setLoading(false)
        return
      }

      // Fetch Profile separately
      let mergedData = resData
      if (resData.admin_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, nickname')
          .eq('id', resData.admin_id)
          .single()
        if (profileData) mergedData = { ...resData, profiles: profileData }
      }
      setResponse(mergedData)

      // Fetch Survey & Questions
      const surveyId = resData.survey_id
      if (surveyId) {
        const [sRes, qRes] = await Promise.all([
          supabase.from('surveys').select('*').eq('id', surveyId).single(),
          supabase.from('questions').select('*').eq('survey_id', surveyId).order('order', { ascending: true })
        ])
        if (sRes.data) setSurvey(sRes.data)
        if (qRes.data) setQuestions(qRes.data)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <AdminGuard><div className="p-20 text-center text-primary-500 animate-pulse font-medium">리포트를 불러오는 중입니다...</div></AdminGuard>
  if (!response) return <AdminGuard><div className="p-20 text-center text-red-500">데이터를 찾을 수 없습니다.</div></AdminGuard>

  // --- RECALCULATE RESULT ON THE FLY (Mirror of survey finish screen logic) ---
  const rawAnswers = response.answers?.answers || response.answers || {}
  const patientInfo = response.answers?.patientInfo || { 
    name: response.patient_name, 
    gender: response.patient_gender,
    birthDate: response.patient_age_group?.match(/\((.*?)\)/)?.[1] || '1990-01-01'
  }
  
  const zone = rawAnswers.zone || []
  const conditions = rawAnswers.conditions || []
  const coreConditions = rawAnswers.coreConditions || []
  
  const standardResult = calculateStandardResult(zone, conditions, coreConditions)
  
  const birthDateObj = new Date(patientInfo.birthDate)
  const ageGroup = `${Math.floor((new Date().getFullYear() - birthDateObj.getFullYear()) / 10) * 10}대`

  const firstSessionDecision = calculateFirstSessionDecision({
    symptoms: conditions,
    primaryCause: standardResult.mainReaction,
    riskGrade: rawAnswers.riskGrade || 'R1',
    ageGroup: ageGroup,
    skinThickness: rawAnswers.skinThickness || '보통',
    tissueType: rawAnswers.tissueType || '보통',
    pigmentHigh: rawAnswers.pigmentHigh || false,
    historyOfEasyMarking: rawAnswers.historyOfEasyMarking || false
  })

  // Header helpers
  const submittedAt = new Date(response.submitted_at).toLocaleString()
  const surveyTitle = survey?.title || 'Main Survey'
  const managerName = response.profiles?.nickname || 'Unknown'

  return (
    <AdminGuard>
      <div className="max-w-4xl mx-auto p-4 lg:p-10 pb-40 font-sans bg-beige-50/30 min-h-screen">
        
        {/* Simple Navigation */}
        <Link href="/admin/responses" className="text-gray-400 hover:text-primary-700 font-medium flex items-center gap-2 mb-8 transition-all w-fit group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform"/>
          <span className="text-sm">목록으로 리턴</span>
        </Link>

        {/* --- SIMPLE HEADER (Requested Metadata) --- */}
        <div className="bg-white rounded-3xl border border-beige-200 p-8 md:p-10 mb-12 shadow-sm">
           <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
              <div className="space-y-1">
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">제출 일시</p>
                 <p className="text-sm font-medium text-gray-700">{submittedAt}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">참여 설문지</p>
                 <p className="text-sm font-medium text-gray-700">{surveyTitle}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">담당 매니저</p>
                 <p className="text-sm font-bold text-primary-700">{managerName}</p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-beige-50">
              <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">성함</p><p className="font-bold text-gray-900">{response.patient_name || '-'}</p></div>
              <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">연락처</p><p className="font-bold text-gray-900">{response.patient_phone ? formatPhoneNumber(response.patient_phone) : '-'}</p></div>
              <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">성별</p><p className="font-bold text-gray-900">{response.patient_gender === 'M' || response.patient_gender === '남' ? '남성' : '여성'}</p></div>
              <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">연령대</p><p className="font-bold text-gray-900">{response.patient_age_group || '-'}</p></div>
           </div>
        </div>

        {/* --- THE COMPLETE INTEGRATED REPORT (Literally all sections from survey completion view) --- */}
        <div className="space-y-12 animate-in fade-in duration-700">
          
          <div className="text-center space-y-2 mb-10">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-primary-200 text-primary-600 text-sm font-semibold shadow-sm mb-4">
              <Sparkles className="w-4 h-4" /> SOMEGOOD STANDARD
            </div>
            <h1 className="text-4xl font-light text-primary-900">{patientInfo.name}님의 피부 진단 리포트</h1>
            <p className="text-gray-400">Freedom Begins with Clear Body Skin</p>
          </div>

          {/* PAGE 1: Diagnosis Summary */}
          <section className="bg-white rounded-[2.5rem] shadow-xl border border-primary-100 overflow-hidden">
            <div className="bg-primary-900 p-8 md:p-12 text-white">
              <h2 className="text-2xl font-light mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">01</span>
                현재 피부 진단 요약
              </h2>
              <div className="space-y-6">
                <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                  <p className="text-xl md:text-2xl leading-relaxed font-light">
                    “{patientInfo.name}님의 현재 피부 상태는<br/>
                    <span className="font-semibold text-primary-200">{standardResult.diagnosticSummary}</span>”
                  </p>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 backdrop-blur-sm">
                  <h4 className="text-primary-300 text-[10px] font-bold uppercase tracking-widest mb-2">테마별 분석</h4>
                  <p className="text-sm text-white/80 leading-relaxed italic">
                    “{calculateProfileAnalysis(ageGroup, patientInfo.gender)}”
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                    <h4 className="text-primary-300 text-sm font-bold mb-3 uppercase tracking-wider">관찰되는 주 증상</h4>
                    <ul className="space-y-2">
                      {standardResult.selectedConditions.map((c: string, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-white/90">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-400"></div>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                    <h4 className="text-primary-300 text-sm font-bold mb-3 uppercase tracking-wider">핵심 원인 요인</h4>
                    <div className="space-y-4">
                      {standardResult.causes.map((cause: any, i: number) => (
                        <div key={i}>
                          <div className="font-semibold text-white mb-1">{cause.label}</div>
                          <div className="text-sm text-white/60 leading-relaxed">{cause.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`p-8 md:p-12 ${standardResult.isHighRisk ? 'bg-red-50' : 'bg-primary-50/30'}`}>
              <div className="flex items-start gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${standardResult.isHighRisk ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {standardResult.isHighRisk ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className={`text-lg font-bold mb-1 ${standardResult.isHighRisk ? 'text-red-900' : 'text-primary-900'}`}>
                    {standardResult.isHighRisk ? '리스크 점검: 주의 필요' : '관리 진행 상의 리스크: 낮음'}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {standardResult.isHighRisk 
                      ? '현재 피부는 자극 시 반응이 급격히 확대될 수 있는 고위험군 요소가 포함되어 있습니다. 무리한 관리보다는 안정화와 비개입적 접근이 최우선입니다.' 
                      : '현재 피부는 특별한 열감이나 확산 징후가 없는 안정적인 상태입니다. 설계된 방향에 따라 정상적인 관리 진행이 풍부한 효과를 낼 수 있습니다.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* PAGE 2: Strategy */}
          <section className="bg-white rounded-[2.5rem] shadow-xl border border-primary-100 p-8 md:p-12">
            <h2 className="text-2xl font-light text-primary-900 mb-10 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">02</span>
              맞춤 관리 방향 & 전략
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div>
                  <h4 className="text-sm font-bold text-primary-400 mb-4 uppercase tracking-widest">권장 관리 방향</h4>
                  <div className="flex flex-wrap gap-2">
                    {standardResult.conclusions.map((conc: string, i: number) => (
                      <div key={i} className="bg-primary-50 text-primary-800 px-5 py-3 rounded-2xl border border-primary-100 font-semibold shadow-sm">
                        {conc}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary-400 mb-4 uppercase tracking-widest">주요 접근 방식</h4>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    본 관리는 <span className="text-primary-700 font-bold">‘{standardResult.mainReaction} 개선’</span>과 
                    {standardResult.secondaryReaction && <span className="text-primary-700 font-bold"> ‘{standardResult.secondaryReaction} 완화’</span>}를 중심으로 설계되었습니다.
                    병변을 단순히 제거하는 것이 아니라, 원인이 되는 구조적 요인을 정상화하여 재발을 방지하는 것이 핵심입니다.
                  </p>
                </div>
              </div>
              <div className="bg-beige-50 rounded-3xl p-8 border border-beige-100 flex flex-col justify-center">
                <p className="text-primary-900/70 italic text-center text-lg leading-relaxed">
                  “피부 상태를 고려하지 않은 강한 개입은 오히려 부작용과 색소 잔흔을 유도할 수 있습니다. 썸굿은 전문가의 기준에 따라 안전하고 확실한 순서를 지킵니다.”
                </p>
              </div>
            </div>
          </section>

          {/* PAGE 3: 1st Session Optimized Plan */}
          {firstSessionDecision && (
            <section className="bg-white rounded-[2.5rem] shadow-xl border border-primary-100 overflow-hidden">
              <div className="bg-primary-50 p-8 md:p-12 border-b border-primary-100">
                <h2 className="text-2xl font-light text-primary-900 mb-2 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary-900 flex items-center justify-center text-sm font-bold text-white">03</span>
                  1회차 최적화 솔루션
                </h2>
                <p className="text-gray-500">SOMEGOOD STANDARD 알고리즘이 제안하는 첫 회차 최우선 방향입니다.</p>
              </div>
              
              <div className="p-8 md:p-12 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-primary-400 uppercase tracking-widest mb-3">1차 우선 목표</h4>
                      <div className="text-3xl font-bold text-primary-900">{firstSessionDecision.primaryTarget}</div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-primary-400 uppercase tracking-widest mb-3">1회차 접근 방향</h4>
                      <div className="text-xl font-medium text-primary-700 bg-primary-50 px-5 py-3 rounded-2xl inline-block">
                        {firstSessionDecision.direction}
                      </div>
                    </div>
                  </div>
                  <div className="bg-beige-50 rounded-3xl p-8 border border-beige-100 italic text-primary-800 leading-relaxed font-light">
                    “{firstSessionDecision.internalInterpretation}”
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                  <div>
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> 1회차 제한 항목
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {firstSessionDecision.restrictions.map((res: string, i: number) => (
                        <span key={i} className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm font-semibold border border-red-100">
                          {res}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-green-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> 다음 단계 진입 조건
                    </h4>
                    <ul className="space-y-2">
                      {firstSessionDecision.nextStepConditions.map((cond: string, i: number) => (
                        <li key={i} className="flex items-center gap-3 text-gray-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="text-sm font-medium">{cond}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* PAGE 4: Brand Message */}
          <section className="bg-primary-900 rounded-[2.5rem] shadow-2xl p-12 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10 space-y-8">
              <p className="text-xl md:text-2xl font-light leading-relaxed max-w-2xl mx-auto">
                {patientInfo.name}님의 변화는 단순한 관리의 결과가 아닌,<br/>
                피부를 깊이 이해하고 방향을 설계한 결과입니다.
              </p>
              <div className="w-12 h-0.5 bg-primary-400 mx-auto"></div>
              <p className="text-lg text-primary-200">
                SOMEGOOD STANDARD는 시작보다 끝을 더 중요하게 생각합니다.<br/>
                그리고 그 끝까지 함께합니다.
              </p>
              <div className="pt-6">
                <p className="text-3xl font-light tracking-widest text-white/40 uppercase">Freedom Begins with Clear Body Skin</p>
              </div>
            </div>
          </section>

          {/* ADMIN EXTRA: Full Q&A Log */}
          <div className="pt-20 border-t border-beige-200">
             <h3 className="text-lg font-bold text-gray-800 mb-8 flex items-center gap-2">
               <FileText className="w-5 h-5 text-gray-400"/> 원본 문답 기록
             </h3>
             <div className="space-y-4">
                {questions.map((q, idx) => {
                  const ans = rawAnswers?.[q.id] || response.answers?.[q.id]
                  if (!ans) return null;
                  return (
                    <div key={q.id} className="p-6 bg-white rounded-2xl border border-gray-100 flex gap-6">
                      <div className="text-xs font-bold text-gray-300">Q{idx+1}</div>
                      <div className="flex-1">
                         <p className="text-sm font-bold text-gray-700 mb-2">{q.content}</p>
                         <p className="text-sm text-primary-600 font-medium bg-primary-50 p-3 rounded-xl border border-primary-50">
                           {Array.isArray(ans) ? ans.join(', ') : String(ans)}
                         </p>
                      </div>
                    </div>
                  )
                })}
             </div>
          </div>

        </div>
      </div>
    </AdminGuard>
  )
}
