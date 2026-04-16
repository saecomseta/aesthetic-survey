'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, User, Phone, CalendarDays, ChevronLeft, ChevronRight, Send, AlertTriangle, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPhoneNumber } from '@/lib/format'
import ReactMarkdown from 'react-markdown'
import { ZONES, CONDITION_MAP as ALL_CONDITIONS } from '@/utils/standardData'
import { calculateStandardResult, StandardResult } from '@/utils/standardEngine'

type Slide =
  | { type: 'info' }
  | { type: 'step1' } // Zone selection
  | { type: 'step2' } // Condition selection

function SurveyContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const adminId = searchParams.get('admin_id')

  const [survey, setSurvey] = useState<any>(null)
  const [patientInfo, setPatientInfo] = useState({ name: '', phone: '', birthDate: '', gender: '' })
  const [answers, setAnswers] = useState<Record<string, any>>({ zone: '', conditions: [] })
  const [standardResult, setStandardResult] = useState<StandardResult | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // UI state
  const [step, setStep] = useState(0)
  const slides: Slide[] = [{ type: 'info' }, { type: 'step1' }, { type: 'step2' }]
  
  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    // We still fetch survey title for context, but ignore its dynamic structure
    const { data: sData, error: sErr } = await supabase
      .from('surveys')
      .select('id, title, is_active')
      .eq('id', params.id)
      .single()

    if (sErr || !sData || !sData.is_active) {
      if (!sData) {
        setLoading(false)
        return
      }
    }
    setSurvey(sData)
    setLoading(false)
  }

  const handleZoneSelect = (zone: string) => {
    setAnswers(prev => ({ ...prev, zone }))
    setError('')
    setTimeout(() => goNext(), 300)
  }

  const handleConditionToggle = (condition: string) => {
    setAnswers(prev => {
      const current = prev.conditions as string[]
      if (current.includes(condition)) {
        return { ...prev, conditions: current.filter(c => c !== condition) }
      }
      return { ...prev, conditions: [...current, condition] }
    })
  }

  const goNext = () => {
    setError('')
    const currentSlide = slides[step]

    if (currentSlide.type === 'info') {
      if (!patientInfo.name.trim() || !patientInfo.phone.trim() || !patientInfo.birthDate || !patientInfo.gender) {
        setError('성함, 연락처, 생년월일, 성별을 모두 입력/선택해주세요.')
        return
      }
    } else if (currentSlide.type === 'step1') {
      if (!answers.zone) {
        setError('진단받으실 부위를 선택해주세요.')
        return
      }
    } else if (currentSlide.type === 'step2') {
      if (answers.conditions.length === 0) {
        setError('현재 상태에 해당하는 항목을 하나 이상 선택해주세요.')
        return
      }
    }

    if (step < slides.length - 1) {
      setStep(s => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      handleSubmit()
    }
  }

  const goPrev = () => {
    setError('')
    if (step > 0) setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    const result = calculateStandardResult(answers.zone, answers.conditions)
    setStandardResult(result)

    // Calculate Age for DB record (legacy format compatibility)
    const birthDateObj = new Date(patientInfo.birthDate)
    const today = new Date()
    let age = today.getFullYear() - birthDateObj.getFullYear()
    const storedAgeStr = `${Math.floor(age/10)*10}대 (${patientInfo.birthDate})`

    const { error: submitErr } = await supabase
      .from('responses')
      .insert({
        survey_id: survey?.id || params.id,
        admin_id: adminId || null,
        patient_name: patientInfo.name,
        patient_phone: patientInfo.phone,
        patient_gender: patientInfo.gender,
        patient_age_group: storedAgeStr,
        answers: { patientInfo, answers },
        sector_results: { standardResult: result },
        space_results: [{ 
          title: 'SOMEGOOD STANDARD 리포트', 
          result 
        }]
      })

    if (submitErr) {
      console.error(submitErr)
      setError('제출 중 오류가 발생했습니다. 다시 시도해주세요.')
      setSubmitting(false)
    } else {
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-beige-50">
      <div className="animate-pulse text-primary-500 font-medium text-lg">SOMEGOOD STANDARD 로딩 중...</div>
    </div>
  )

  if (!survey) return (
    <div className="min-h-screen flex items-center justify-center bg-beige-50 p-6 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-beige-200 shadow-sm">
        <h1 className="text-xl font-medium text-gray-900 mb-2">설문 진행 불가</h1>
        <p className="text-gray-500">유효하지 않은 설문 링크입니다.</p>
      </div>
    </div>
  )

  if (submitted && standardResult) return (
    <div className="min-h-screen bg-beige-50 p-4 py-12 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
        <div className="text-center space-y-2">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                  <h4 className="text-primary-300 text-sm font-bold mb-3 uppercase tracking-wider">관찰되는 주 증상</h4>
                  <ul className="space-y-2">
                    {standardResult.selectedConditions.map((c, i) => (
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
                    {standardResult.causes.map((cause, i) => (
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
                  {standardResult.conclusions.map((conc, i) => (
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

        {/* PAGE 3: Brand Message */}
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

        <div className="flex justify-center pt-8">
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-white text-primary-800 rounded-2xl border border-primary-200 font-medium hover:bg-primary-50 transition"
          >
            새로운 설문 시작하기
          </button>
        </div>
      </div>
    </div>
  )

  const currentSlide = slides[step]
  const progressPercent = Math.round((step / (slides.length - 1)) * 100) || 0

  return (
    <div className="min-h-screen bg-beige-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-beige-200 sticky top-0 z-20">
        <div className="h-1.5 w-full bg-gray-100">
          <div 
            className="h-full bg-primary-500 transition-all duration-500 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="p-4 flex items-center justify-between max-w-3xl mx-auto w-full">
          <h1 className="text-lg font-medium text-primary-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-400" />
            SOMEGOOD STANDARD
          </h1>
          <span className="text-sm font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
            {step + 1} / 3 단계
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full p-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl mb-6 text-sm animate-in fade-in slide-in-from-top-4 text-center">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {/* 1. Basic Info */}
            {currentSlide.type === 'info' && (
              <div className="bg-white rounded-3xl shadow-sm border border-primary-100 p-8 md:p-10 space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-light text-primary-800 mb-2">당신에 대해 알려주세요</h2>
                  <p className="text-gray-400 text-sm">표준화된 정밀 진단을 위한 준비 단계입니다.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase ml-1">성함</span>
                    <input type="text" placeholder="홍길동" className="w-full border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 transition" value={patientInfo.name} onChange={e=>setPatientInfo({...patientInfo, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase ml-1">연락처</span>
                    <input type="tel" placeholder="010-0000-0000" className="w-full border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 transition" value={patientInfo.phone} onChange={e=>setPatientInfo({...patientInfo, phone: formatPhoneNumber(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase ml-1">생년월일</span>
                    <input type="date" className="w-full border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 transition" value={patientInfo.birthDate} onChange={e=>setPatientInfo({...patientInfo, birthDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase ml-1">성별</span>
                    <div className="flex gap-2">
                      {['M', 'F'].map(g => (
                        <button key={g} onClick={() => setPatientInfo({...patientInfo, gender: g})} className={`flex-1 py-4 rounded-2xl border font-medium transition ${patientInfo.gender === g ? 'border-primary-500 bg-primary-50 text-primary-800 shadow-sm' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                          {g === 'M' ? '남성' : '여성'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Step 1: Zone Selection */}
            {currentSlide.type === 'step1' && (
              <div className="bg-white rounded-3xl shadow-sm border border-primary-100 p-8 md:p-10">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-light text-primary-800 mb-2">STEP 1. 관리가 필요한 부위</h2>
                  <p className="text-gray-400 text-sm">진단 기준이 되는 6개 구역 중 하나를 선택해주세요.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ZONES.map((zone, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleZoneSelect(zone)}
                      className={`text-left p-5 rounded-2xl border-2 transition ${answers.zone === zone ? 'border-primary-500 bg-primary-50 text-primary-900 shadow-md' : 'border-gray-50 bg-gray-50/50 hover:border-primary-200 text-gray-600'}`}
                    >
                      <span className="text-xs font-bold text-primary-300 block mb-1">AREA 0{i+1}</span>
                      <span className="text-lg font-medium">{zone}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Step 2: Condition Selection */}
            {currentSlide.type === 'step2' && (
              <div className="bg-white rounded-3xl shadow-sm border border-primary-100 p-8 md:p-10">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-light text-primary-800 mb-2">STEP 2. 현재 관찰되는 반응</h2>
                  <p className="text-gray-400 text-sm">해당되는 모든 병변을 선택해주세요 (중복 가능)</p>
                </div>
                
                <div className="space-y-8">
                  {Object.entries(
                    Object.keys(ALL_CONDITIONS).reduce((acc, name) => {
                      const cat = ALL_CONDITIONS[name].category;
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(name);
                      return acc;
                    }, {} as Record<string, string[]>)
                  ).map(([cat, items], idx) => (
                    <div key={idx} className="space-y-3">
                      <h4 className="text-sm font-bold text-primary-400 uppercase tracking-widest ml-1">{cat}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {items.map((item, i) => {
                          const isSelected = answers.conditions.includes(item);
                          return (
                            <button
                              key={i}
                              onClick={() => handleConditionToggle(item)}
                              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${isSelected ? 'border-primary-400 bg-primary-50 text-primary-900 shadow-sm' : 'border-gray-50 bg-gray-50/30 text-gray-500'}`}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-200'}`}>
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <span className="text-[15px] font-medium">{item}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white border-t border-gray-100 p-4 sticky bottom-0 z-20">
        <div className="max-w-2xl mx-auto flex gap-4">
          <button onClick={goPrev} disabled={step === 0 || submitting} className="flex-1 py-4 flex items-center justify-center gap-2 bg-gray-50 text-gray-500 rounded-2xl font-medium disabled:opacity-30">
            <ChevronLeft className="w-5 h-5"/> 이전
          </button>
          <button onClick={goNext} disabled={submitting} className="flex-[2] py-4 flex items-center justify-center gap-2 bg-primary-900 text-white rounded-2xl font-medium shadow-lg hover:bg-black transition">
            {step === slides.length - 1 ? (submitting ? '제출 중...' : '결과 리포트 생성') : <>다음 단계 <ChevronRight className="w-5 h-5"/></>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SurveyContent />
    </Suspense>
  )
}
