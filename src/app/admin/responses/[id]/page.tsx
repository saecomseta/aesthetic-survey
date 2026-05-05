
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  ArrowLeft, User, Phone, CalendarDays, AlertCircle, CheckCircle2,
  Sparkles, AlertTriangle, Clock, FileText
} from 'lucide-react'
import { formatPhoneNumber } from '@/lib/format'

// LITERALLY IMPORT THE ENGINE & DATA
import { calculateStandardResult } from '@/utils/standardEngine'
import { calculateFirstSessionDecision, calculateProfileAnalysis } from '@/utils/firstSessionEngine'
import { CONDITION_DISPLAY_MAP, ZONE_DISPLAY_MAP, CAUSE_LABEL_MAP_EN } from '@/utils/standardData'

const RISK_DETAILS: Record<string, { label: string; desc: string; color: string; bg: string; text: string }> = {
  'R1': { label: 'R1 STABLE', desc: '자유로운 관리 접근 가능 (STABLE)', color: 'border-green-200/20', bg: 'bg-green-500/10', text: 'text-green-200' },
  'R2': { label: 'R2 CAUTION', desc: '강도 하향 및 보수적 접근 (CAUTION)', color: 'border-yellow-200/20', bg: 'bg-yellow-500/10', text: 'text-yellow-200' },
  'R3': { label: 'R3 REACTIVE', desc: '압출/박리 보류, 진정 우선 (REACTIVE)', color: 'border-orange-200/20', bg: 'bg-orange-500/10', text: 'text-orange-200' },
  'R4': { label: 'R4 HIGH RISK', desc: '무조건 안정화, 적극적 개입 금지 (HIGH RISK)', color: 'border-red-200/20', bg: 'bg-red-500/10', text: 'text-red-200' }
}

const renderMixedLabel = (text: string, mainClass: string = "text-lg", subClass: string = "text-[11px]") => {
  if (!text.includes('(')) return <span className={mainClass}>{text}</span>;
  const [eng, kor] = text.split('(');
  const korClean = kor.replace(')', '');
  return (
    <div className="flex flex-col leading-tight">
      <span className={`${mainClass} font-bold tracking-tight uppercase`}>{eng.trim()}</span>
      <span className={`${subClass} opacity-60 font-medium`}>{korClean.trim()}</span>
    </div>
  );
};

// 1. OUTER WRAPPER (Handles Auth Guard)
export default function ResponseDetailPage() {
  return (
    <AdminGuard>
      <ResponseDetailContent />
    </AdminGuard>
  )
}

// 2. INNER CONTENT (Handles Data Fetching & Premium UI)
function ResponseDetailContent() {
  const params = useParams()
  const { user } = useAuth()
  const [response, setResponse] = useState<any>(null)
  const [survey, setSurvey] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedId, setFetchedId] = useState<string | null>(null)

  useEffect(() => {
    let id = params.id as string
    if (!id && typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/')
      id = parts[parts.length - 1]
    }
    
    if (id && user && id !== fetchedId) {
      setFetchedId(id)
      fetchData(id)
    }
  }, [params.id, user, fetchedId])

  const fetchData = async (id: string) => {
    try {
      setLoading(true)
      const { data: resDataArray, error: resError } = await supabase
        .from('responses')
        .select('*, surveys(title)')
        .eq('id', id)
        .limit(1)

      if (resError) throw resError
      if (!resDataArray || resDataArray.length === 0) throw new Error('데이터를 찾을 수 없습니다.')

      const resData = resDataArray[0]
      setResponse(resData)
      if (resData.surveys) setSurvey(resData.surveys)

      // Background fetches
      const profilePromise = resData.admin_id 
        ? supabase.from('profiles').select('nickname').eq('id', resData.admin_id).single()
        : Promise.resolve({ data: null })
      const questionsPromise = resData.survey_id
        ? supabase.from('questions').select('*').eq('survey_id', resData.survey_id).order('order', { ascending: true })
        : Promise.resolve({ data: null })

      Promise.all([profilePromise, questionsPromise]).then(([pRes, qRes]) => {
        if (pRes.data) setResponse((prev: any) => ({ ...prev, profiles: pRes.data }))
        if (qRes.data) setQuestions(qRes.data || [])
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg">
      <div className="animate-pulse flex flex-col items-center gap-8">
        <div className="w-16 h-16 border-4 border-white/5 border-t-brand-text rounded-full animate-spin"></div>
        <div className="text-brand-text font-black tracking-[0.5em] uppercase text-sm">LOADING REPORT...</div>
      </div>
    </div>
  )

  if (error || !response) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-6 text-center">
      <div className="max-w-md w-full glass-card p-12 rounded-[2rem] border-white/10">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-brand-text mb-4 uppercase tracking-widest">REPORT UNAVAILABLE</h2>
        <p className="text-brand-text/50 text-sm mb-8">{error || '정보를 불러올 수 없습니다.'}</p>
        <Link href="/admin/main" className="block w-full py-5 bg-brand-text text-brand-dark rounded-2xl font-black uppercase tracking-widest">Back to Dashboard</Link>
      </div>
    </div>
  )

  // CALCULATIONS
  const rawAnswers = response.answers?.answers || response.answers || {}
  const patientInfo = response.answers?.patientInfo || { 
    name: response.patient_name || '고객', 
    gender: response.patient_gender || '여',
    birthDate: response.patient_age_group?.match(/\((.*?)\)/)?.[1] || '1990-01-01'
  }
  
  // Always recalculate to ensure latest translation logic applies to old records
  const standardResult = calculateStandardResult(rawAnswers.zone || [], rawAnswers.conditions || [], rawAnswers.coreConditions || [])
  const firstSessionDecision = response.sector_results?.firstSessionDecision || calculateFirstSessionDecision({
    symptoms: rawAnswers.conditions || [],
    primaryCause: standardResult?.mainReaction || '일반 관리',
    riskGrade: rawAnswers.riskGrade || 'R1',
    ageGroup: response.patient_age_group?.split(' ')[0] || '미지정',
    skinThickness: rawAnswers.skinThickness || '보통',
    tissueType: rawAnswers.tissueType || '보통',
    pigmentHigh: rawAnswers.pigmentHigh || false,
    historyOfEasyMarking: rawAnswers.historyOfEasyMarking || false
  })

  return (
    <div className="min-h-screen bg-brand-bg p-4 py-12 md:p-10 font-sans text-brand-text">
      <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-1000">
        
        {/* ADMIN NAV & INFO BAR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <Link href="/admin/main" className="flex items-center gap-2 text-brand-text/40 hover:text-brand-text transition-all group font-black text-[10px] uppercase tracking-[0.3em]">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> BACK TO DASHBOARD
          </Link>
          <div className="flex items-center gap-8 bg-white/5 px-8 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="text-center">
              <p className="text-[8px] text-brand-text/30 font-black uppercase tracking-widest mb-0.5">SUBMITTED AT</p>
              <p className="text-[11px] font-bold">{new Date(response.submitted_at).toLocaleString()}</p>
            </div>
            <div className="w-[1px] h-6 bg-white/10" />
            <div className="text-center">
              <p className="text-[8px] text-brand-text/30 font-black uppercase tracking-widest mb-0.5">MANAGER</p>
              <p className="text-[11px] font-black text-brand-light">{response.profiles?.nickname || 'Unknown'}</p>
            </div>
          </div>
        </div>

        {/* HEADER SECTION (SAME AS PUBLIC) */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/10 px-6 py-2 rounded-full border border-white/10 text-brand-text text-[10px] font-black uppercase tracking-[0.3em] shadow-sm mb-4">
            <Sparkles className="w-4 h-4 text-brand-text/50" /> SOMEGOOD STANDARD
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-brand-text tracking-tighter uppercase leading-[0.9]">
            {patientInfo.name}&apos;S<br />
            <span className="text-3xl md:text-5xl tracking-tight opacity-90">SKIN ANALYSIS DOSSIER</span>
          </h1>
          <p className="text-brand-text/40 tracking-[0.4em] uppercase text-[10px]">Professional Aesthetic Diagnostic Report</p>
        </div>

        {/* 01. DIAGNOSIS SUMMARY (SAME AS PUBLIC) */}
        <section className="glass-card rounded-[3rem] overflow-hidden border-white/10">
          <div className="bg-black/20 p-8 md:p-16">
            <h2 className="text-2xl font-black mb-10 flex items-center gap-4 uppercase tracking-wider">
              <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[12px] font-black border border-white/20">01</span>
              DIAGNOSIS SUMMARY
            </h2>
            <div className="space-y-10">
              <div className="bg-white/5 rounded-[2rem] p-10 md:p-14 border border-white/10 backdrop-blur-xl text-center">
                <div className="space-y-6">
                  <p className="text-2xl md:text-4xl font-black text-brand-light leading-tight uppercase tracking-tight">
                    {standardResult.diagnosticSummaryEn}
                  </p>
                  <div className="w-12 h-[1px] bg-white/10 mx-auto"></div>
                  <p className="text-sm md:text-lg text-brand-text/50 font-medium leading-relaxed max-w-2xl mx-auto">
                    “{patientInfo.name}님의 현재 피부 상태는 {standardResult.diagnosticSummary}”
                  </p>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/5 italic">
                <h4 className="text-brand-text/30 text-[10px] font-black uppercase tracking-[0.3em] mb-3">PROFILE ANALYSIS</h4>
                <p className="text-sm text-brand-text/80 leading-relaxed">
                  “{calculateProfileAnalysis(response.patient_age_group?.split(' ')[0] || '미지정', response.patient_gender || '여')}”
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-[2rem] p-8 border border-white/5">
                  <h4 className="text-brand-text/30 text-[10px] font-black mb-6 uppercase tracking-[0.3em]">PRIMARY SYMPTOMS</h4>
                  <ul className="space-y-4">
                    {standardResult.selectedConditions.map((c: string, i: number) => (
                      <li key={i} className="flex items-center gap-3 text-brand-text/90 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-text/30"></div>
                        {renderMixedLabel(CONDITION_DISPLAY_MAP[c] || c, "text-sm", "text-[10px]")}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/5 rounded-[2rem] p-8 border border-white/5">
                  <h4 className="text-brand-text/30 text-[10px] font-black mb-6 uppercase tracking-[0.3em]">CORE CAUSES</h4>
                  <div className="space-y-8">
                    {standardResult.causes.map((cause: any, i: number) => (
                      <div key={i}>
                        <div className="font-black text-brand-text mb-2 uppercase tracking-tight">{CAUSE_LABEL_MAP_EN[cause.label] || cause.label}</div>
                        <div className="text-[13px] text-brand-text/50 leading-relaxed font-medium whitespace-pre-line">{cause.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`p-10 md:p-16 ${standardResult.isHighRisk ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
              <div className="flex flex-col items-center gap-4 flex-shrink-0">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center border-2 ${standardResult.isHighRisk ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-green-500/20 border-green-500/30 text-green-300'}`}>
                  {standardResult.isHighRisk ? <AlertTriangle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] ${standardResult.isHighRisk ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                  CONFIRMED
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-x-4 mb-4">
                  <h3 className={`text-2xl font-black ${standardResult.isHighRisk ? 'text-red-200' : 'text-green-200'} uppercase tracking-tight`}>
                    {standardResult.isHighRisk ? 'HIGH RISK DETECTED: CAUTION REQUIRED' : 'NORMAL CONDITION: STABLE & READY'}
                  </h3>
                  <div className={`inline-block px-4 py-1.5 rounded-xl text-[11px] font-black mt-4 md:mt-0 uppercase tracking-widest ${RISK_DETAILS[rawAnswers.riskGrade || 'R1'].bg} ${RISK_DETAILS[rawAnswers.riskGrade || 'R1'].text} border ${RISK_DETAILS[rawAnswers.riskGrade || 'R1'].color}`}>
                    {RISK_DETAILS[rawAnswers.riskGrade || 'R1'].label}
                  </div>
                </div>
                <p className="text-xs font-black text-brand-text/30 mb-4 uppercase tracking-[0.2em]">
                  {standardResult.isHighRisk ? '고위험군 판정: 정밀 관리 주의' : '정상군 판정: 관리 가능'}
                </p>
                <p className="text-brand-text/70 leading-relaxed max-w-xl font-medium">
                  {standardResult.isHighRisk
                    ? '현재 피부는 자극 시 반응이 급격히 확대될 수 있는 고위험군 요소가 포함되어 있습니다. 무리한 개입보다는 단계적 안정화와 비침습적 접근이 최우선입니다.'
                    : '현재 피부는 특별한 열감이나 확산 징후가 없는 안정적인 상태입니다. 설계된 방향에 따라 정상적인 관리 진행이 풍부한 효과를 낼 수 있습니다.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 02. MANAGEMENT STRATEGY (SAME AS PUBLIC) */}
        <section className="glass-card rounded-[3rem] p-10 md:p-16 border-white/10">
          <h2 className="text-2xl font-black text-brand-text mb-12 flex items-center gap-4 uppercase tracking-wider">
            <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[12px] font-black border border-white/20">02</span>
            MANAGEMENT STRATEGY
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-10">
              <div>
                <h4 className="text-[10px] font-black text-brand-text/30 mb-6 uppercase tracking-[0.3em]">RECOMMENDED FOCUS</h4>
                <div className="flex flex-wrap gap-3">
                  {standardResult.conclusions.map((conc: string, i: number) => (
                    <div key={i} className="bg-white/5 text-brand-text px-6 py-4 rounded-2xl border border-white/10 font-black shadow-sm">
                      {renderMixedLabel(conc, "text-sm", "text-[10px]")}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-brand-text/30 mb-6 uppercase tracking-[0.3em]">CORE APPROACH</h4>
                <p className="text-brand-text/80 leading-relaxed text-lg font-medium">
                  본 관리는 <span className="text-brand-light font-black underline decoration-brand-light/30 underline-offset-8">‘{standardResult.mainReaction} 개선’</span>과
                  {standardResult.secondaryReaction && <span className="text-brand-light font-black underline decoration-brand-light/30 underline-offset-8"> ‘{standardResult.secondaryReaction} 완화’</span>}를 중심으로 설계되었습니다.
                  단순 제거가 아닌 구조적 정상화를 지향합니다.
                </p>
              </div>
            </div>
            <div className="bg-black/10 rounded-[2.5rem] p-10 border border-white/5 flex flex-col justify-center text-center">
              <p className="text-brand-text/40 italic text-xl leading-relaxed font-light">
                “피부 상태를 고려하지 않은 강한 개입은 오히려 부작용을 유도할 수 있습니다. 전문가의 기준에 따라 안전하고 확실한 순서를 지킵니다.”
              </p>
            </div>
          </div>
        </section>

        {/* 03. 1ST SESSION OPTIMIZATION (SAME AS PUBLIC) */}
        {firstSessionDecision && (
          <section className="glass-card rounded-[3.5rem] p-12 md:p-20 border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-brand-light/5 rounded-full -ml-48 -mt-48 blur-[100px]"></div>

            <div className="relative z-10 space-y-16">
              <div className="text-center">
                <div className="inline-flex items-center gap-3 bg-brand-text text-brand-dark px-6 py-2 rounded-full text-[10px] font-black tracking-[0.5em] uppercase mb-8 shadow-2xl">
                  <Sparkles className="w-4 h-4" /> 1ST SESSION OPTIMIZATION
                </div>
                <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10 space-y-8 backdrop-blur-sm">
                  <div>
                    <h4 className="text-[10px] font-black text-brand-text/30 uppercase tracking-[0.3em] mb-4">OPTIMIZED DIRECTION</h4>
                    <div className="font-black text-brand-light tracking-tight leading-tight">
                      {renderMixedLabel(firstSessionDecision.primaryTarget, "text-lg", "text-xs")}
                    </div>
                  </div>
                  <div className="pt-8 border-t border-white/5 italic text-brand-text/60 leading-relaxed text-lg md:text-xl">
                    {renderMixedLabel(firstSessionDecision.internalInterpretation?.replace(/[“”]/g, '') || '', "text-lg", "text-sm")}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
                  <div className="bg-red-500/10 p-10 rounded-[2.5rem] border border-red-500/20">
                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5" /> CONTRAINDICATIONS
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {firstSessionDecision.restrictions.map((res: string, i: number) => (
                        <div key={i} className="bg-white/10 text-red-100 px-6 py-3 rounded-xl border border-white/10 shadow-sm">
                          {renderMixedLabel(res, "text-[13px] font-black", "text-[10px]")}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-green-500/10 p-10 rounded-[2.5rem] border border-green-500/20">
                    <h4 className="text-[10px] font-black text-green-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5" /> SUCCESS CRITERIA
                    </h4>
                    <ul className="space-y-4">
                      {firstSessionDecision.nextStepConditions.map((cond: string, i: number) => (
                        <li key={i} className="flex items-start gap-6 text-green-100/70">
                          <div className="w-2 h-2 rounded-full bg-green-400/50 mt-1.5 shadow-[0_0_10px_rgba(74,222,128,0.5)]" /> 
                          <div className="flex-1 text-left">
                            {renderMixedLabel(cond, "text-sm font-bold", "text-xs")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* RAW LOG (ADMIN ONLY) */}
        <div className="pt-20 border-t border-white/10">
          <h3 className="text-[10px] font-black text-brand-text/30 mb-8 uppercase tracking-[0.4em] flex items-center gap-3">
            <FileText className="w-4 h-4" /> Raw Q&A Log (Admin Only)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questions.map((q, idx) => {
              const ans = rawAnswers?.[q.id] || rawAnswers?.[idx] // Fallback to index if needed
              if (!ans) return null
              return (
                <div key={q.id} className="p-6 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-brand-text/20 mb-2 uppercase tracking-widest">Q{idx + 1}. {q.content}</p>
                  <p className="text-sm text-brand-text/80 font-bold leading-relaxed">{Array.isArray(ans) ? ans.join(', ') : String(ans)}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* FOOTER MESSAGE */}
        <div className="pt-20 text-center pb-20">
          <p className="text-xl md:text-2xl font-medium leading-relaxed max-w-3xl mx-auto italic text-brand-text/40 mb-8 uppercase tracking-tight">
            Your transformation is more than just a result;<br />
            it is the beginning of a journey designed with deep skin understanding.
          </p>
          <p className="text-2xl md:text-3xl font-light leading-relaxed max-w-2xl mx-auto italic text-brand-text/60 mb-12">
            {patientInfo.name}님의 변화는 단순한 결과가 아닌,<br />
            피부를 깊이 이해하고 설계한 여정의 시작입니다.
          </p>
          <p className="text-4xl md:text-6xl font-black tracking-[0.4em] text-white/5 uppercase mb-4 leading-none">SOMEGOOD</p>
          <p className="text-[10px] font-black tracking-[0.6em] text-white/20 uppercase">Freedom Begins with Clear Body Skin</p>
        </div>

      </div>
    </div>
  )
}
