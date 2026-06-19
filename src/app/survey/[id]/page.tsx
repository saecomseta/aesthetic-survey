'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, User, Phone, CalendarDays, ChevronLeft, ChevronRight, Send, AlertTriangle, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPhoneNumber } from '@/lib/format'
import ReactMarkdown from 'react-markdown'
import { ZONES, CONDITION_MAP as ALL_CONDITIONS, FIRST_SESSION_LOGIC, BACKGROUND_GUIDE_DATA, CONDITION_DISPLAY_MAP, ZONE_DISPLAY_MAP, CAUSE_LABEL_MAP_EN } from '@/utils/standardData'
import { calculateStandardResult, StandardResult, calculateRiskGrade } from '@/utils/standardEngine'
import { calculateFirstSessionDecision, calculateProfileAnalysis } from '@/utils/firstSessionEngine'

type Slide =
  | { type: 'info' }
  | { type: 'step1' }
  | { type: 'step2' }
  | { type: 'step2-conclusion' }
  | { type: 'step3' }
  | { type: 'step4-background' }
  | { type: 'step-hormone' }
  | { type: 'stop' }
  | { type: 'step4' }
  | { type: 'step5-first-session' }

interface SurveyAnswers {
  zone: string[];
  conditions: string[];
  coreConditions: string[];
  primaryCause: string;
  riskGrade: string;
  skinThickness: string;
  tissueType: string;
  pigmentHigh: boolean;
  historyOfEasyMarking: boolean;
  hormonalIssues: string[];
}

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

function SurveyContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const adminId = searchParams.get('admin_id')

  const [survey, setSurvey] = useState<any>(null)
  const [patientInfo, setPatientInfo] = useState({ name: '', phone: '', birthDate: '', gender: '' })
  const [answers, setAnswers] = useState<SurveyAnswers>({
    zone: [],
    conditions: [],
    coreConditions: [],
    primaryCause: '',
    riskGrade: 'R1',
    skinThickness: '보통',
    tissueType: '보통',
    pigmentHigh: false,
    historyOfEasyMarking: false,
    hormonalIssues: []
  })
  const [standardResult, setStandardResult] = useState<StandardResult | null>(null)
  const [firstSessionDecision, setFirstSessionDecision] = useState<any>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // UI state
  const [step, setStep] = useState(0)
  const slides: Slide[] = [
    { type: 'info' },
    { type: 'step1' },
    { type: 'step2' },
    { type: 'step4-background' },
    { type: 'step-hormone' },
    { type: 'step3' },
    { type: 'stop' },
    { type: 'step4' },
    { type: 'step5-first-session' }
  ]

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    try {
      const { data: sData, error: sErr } = await supabase
        .from('surveys')
        .select('id, title, is_active')
        .eq('id', params.id)
        .single()

      if (sErr || !sData) {
        setSurvey({ id: params.id, title: 'SOMEGOOD STANDARD', is_active: true })
      } else {
        setSurvey(sData)
      }
    } catch (err) {
      setSurvey({ id: params.id, title: 'SOMEGOOD STANDARD', is_active: true })
    } finally {
      setLoading(false)
    }
  }

  const handleZoneSelect = (zone: string) => {
    setAnswers(prev => {
      const current = prev.zone as string[];
      if (current.includes(zone)) {
        return { ...prev, zone: current.filter(z => z !== zone) };
      }
      return { ...prev, zone: [...current, zone] };
    });
    setError('');
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
        setError('PLEASE FILL IN ALL REQUIRED FIELDS.')
        return
      }
    } else if (currentSlide.type === 'step1') {
      if (answers.zone.length === 0) {
        setError('PLEASE SELECT AT LEAST ONE TARGET ZONE.')
        return
      }
    } else if (currentSlide.type === 'step2') {
      if (answers.conditions.length === 0) {
        setError('PLEASE SELECT AT LEAST ONE CONDITION.')
        return
      }
      // Calculate result immediately after conditions are selected
      const result = calculateStandardResult(answers.zone, answers.conditions, [])
      setStandardResult(result)
      if (!answers.primaryCause && result.causes.length > 0) {
        setAnswers(prev => ({ ...prev, primaryCause: result.causes[0].label }))
      }
    } else if (currentSlide.type === 'step4-background') {
      const birthDateObj = new Date(patientInfo.birthDate)
      const today = new Date()
      let age = today.getFullYear() - birthDateObj.getFullYear()
      const ageGroup = `${Math.floor(age / 10) * 10}대`

      const calculatedRisk = calculateRiskGrade(answers.conditions, answers.skinThickness, ageGroup)
      setAnswers(prev => ({ ...prev, riskGrade: calculatedRisk }))

      const decision = calculateFirstSessionDecision({
        symptoms: answers.conditions,
        primaryCause: answers.primaryCause || standardResult?.mainReaction || '',
        riskGrade: calculatedRisk,
        ageGroup: ageGroup,
        skinThickness: answers.skinThickness || '보통',
        tissueType: answers.tissueType || '보통',
        pigmentHigh: answers.pigmentHigh || false,
        historyOfEasyMarking: answers.historyOfEasyMarking || false
      })
      setFirstSessionDecision(decision)
    } else if (currentSlide.type === 'step-hormone') {
      if (answers.hormonalIssues.length === 0) {
        setError('PLEASE SELECT AT LEAST ONE OPTION (OR SELECT "해당 없음").')
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
    // Always recalculate to ensure latest translation logic applies to old records
    const result = calculateStandardResult(answers.zone || [], answers.conditions || [], answers.coreConditions || [])
    
    // Enrich result with needsMedicalParallelCare flag based on hormonalIssues selection
    const hasHormonalIssue = answers.hormonalIssues && answers.hormonalIssues.length > 0 && !answers.hormonalIssues.includes('해당 없음');
    const enrichedResult = {
      ...result,
      flags: {
        needsMedicalParallelCare: hasHormonalIssue
      }
    };
    setStandardResult(enrichedResult)

    const birthDateObj = new Date(patientInfo.birthDate)
    const today = new Date()
    let age = today.getFullYear() - birthDateObj.getFullYear()
    const storedAgeStr = `${Math.floor(age / 10) * 10}대 (${patientInfo.birthDate})`

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
        sector_results: { standardResult: enrichedResult, firstSessionDecision },
        space_results: [{
          title: 'SOMEGOOD STANDARD 리포트',
          result: enrichedResult,
          firstSessionDecision
        }]
      })

    if (submitErr) {
      setError('제출 중 오류가 발생했습니다.')
      setSubmitting(false)
    } else {
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg">
      <div className="animate-pulse text-brand-text font-black tracking-[0.3em] text-lg uppercase">SOMEGOOD STANDARD</div>
    </div>
  )

  if (!survey) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-6 text-center">
      <div className="max-w-md w-full glass-card p-12 rounded-[2rem] border-white/10">
        <h1 className="text-xl font-bold text-brand-text mb-4 uppercase tracking-widest">INVALID LINK</h1>
        <p className="text-brand-text/50 text-sm">해당 설문 링크가 유효하지 않거나 종료되었습니다.</p>
      </div>
    </div>
  )

  if (submitted && standardResult) return (
    <div className="min-h-screen bg-brand-bg p-4 py-12 md:p-10 font-sans text-brand-text">
      <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-1000">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/10 px-6 py-2 rounded-full border border-white/10 text-brand-text text-[10px] font-black uppercase tracking-[0.3em] shadow-sm mb-4">
            <Sparkles className="w-4 h-4 text-brand-text/50" /> SOMEGOOD STANDARD
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-brand-text tracking-tighter uppercase leading-[0.9]">
            {patientInfo.name}&apos;S<br />
            <span className="text-2xl md:text-4xl tracking-tight opacity-90">SKIN ANALYSIS DOSSIER</span>
          </h1>
          <p className="text-brand-text/40 tracking-[0.4em] uppercase text-[10px]">Professional Aesthetic Diagnostic Report</p>
        </div>

        {/* PAGE 1: Diagnosis Summary */}
        <section className="glass-card rounded-[3rem] overflow-hidden border-white/10">
          <div className="bg-black/20 p-8 md:p-16">
            <h2 className="text-2xl font-black mb-10 flex items-center gap-4 uppercase tracking-wider">
              <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[12px] font-black border border-white/20">01</span>
              DIAGNOSIS SUMMARY
            </h2>
            <div className="space-y-10">
              <div className="bg-white/5 rounded-[2rem] p-10 md:p-14 border border-white/10 backdrop-blur-xl text-center">
                <div className="space-y-6">
                  <p className="text-xl md:text-3xl font-black text-brand-light leading-tight uppercase tracking-tight">
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
                  “{calculateProfileAnalysis(Math.floor((new Date().getFullYear() - new Date(patientInfo.birthDate).getFullYear()) / 10) * 10 + '대', patientInfo.gender)}”
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-[2rem] p-8 border border-white/5">
                  <h4 className="text-brand-text/30 text-[10px] font-black mb-6 uppercase tracking-[0.3em]">PRIMARY SYMPTOMS</h4>
                  <ul className="space-y-4">
                    {standardResult.selectedConditions.map((c, i) => (
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
                    {standardResult.causes.map((cause, i) => (
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
                  <div className={`inline-block px-4 py-1.5 rounded-xl text-[11px] font-black mt-4 md:mt-0 uppercase tracking-widest ${RISK_DETAILS[answers.riskGrade || 'R1'].bg} ${RISK_DETAILS[answers.riskGrade || 'R1'].text} border ${RISK_DETAILS[answers.riskGrade || 'R1'].color}`}>
                    {RISK_DETAILS[answers.riskGrade || 'R1'].label}
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

          {/* Medical Parallel Care Notice */}
          {standardResult.flags?.needsMedicalParallelCare && (
            <div className="p-10 md:p-16 bg-purple-500/10 border-t border-white/5">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
                <div className="flex flex-col items-center gap-4 flex-shrink-0">
                  <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center border-2 bg-purple-500/20 border-purple-500/30 text-purple-300">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <div className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] bg-purple-500 text-white">
                    ADVISORY
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-x-4 mb-4">
                    <h3 className="text-2xl font-black text-purple-200 uppercase tracking-tight">
                      MEDICAL PARALLEL CARE RECOMMENDED
                    </h3>
                    <div className="inline-block px-4 py-1.5 rounded-xl text-[11px] font-black mt-4 md:mt-0 uppercase tracking-widest bg-purple-500/20 text-purple-200 border border-purple-200/20">
                      병원 관리 병행 권장
                    </div>
                  </div>
                  <p className="text-xs font-black text-brand-text/30 mb-4 uppercase tracking-[0.2em]">
                    호르몬 및 내분비 요인 식별 안내
                  </p>
                  <div className="text-brand-text/70 leading-relaxed max-w-xl font-medium space-y-4 text-sm md:text-base">
                    <p>
                      선택하신 항목을 기준으로 볼 때, 현재 피부 상태에는 호르몬 또는 내분비 관련 요인이 함께 작용하고 있을 가능성이 있습니다.
                    </p>
                    <p>
                      이러한 경우 피부 표면 관리만으로는 변화 속도나 유지력에 한계가 있을 수 있으므로, 썸굿의 전문 관리와 함께 산부인과, 내분비내과, 피부과 등 병원 진료 또는 기존 치료 관리를 병행하시는 것을 권장드립니다.
                    </p>
                    <p className="text-xs text-brand-text/40 italic">
                      * 썸굿은 피부 외부 환경을 안정적으로 관리하고 회복 흐름을 돕는 방향으로 접근하며, 내부 요인이 의심되는 경우에는 병원 관리와의 병행을 통해 보다 안전하고 현실적인 개선 방향을 제안드립니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* PAGE 2: Strategy */}
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
                  {standardResult.conclusions.map((conc, i) => (
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

        {/* PAGE 3: 1st Session Plan */}
        {firstSessionDecision && (
          <section className="glass-card rounded-[3rem] overflow-hidden border-white/10">
            <div className="bg-white/5 p-10 md:p-16 border-b border-white/5">
              <h2 className="text-2xl font-black text-brand-text mb-4 flex items-center gap-4 uppercase tracking-wider">
                <span className="w-10 h-10 rounded-full bg-brand-text flex items-center justify-center text-[12px] font-black text-brand-dark">03</span>
                1ST SESSION OPTIMIZATION
              </h2>
              <p className="text-brand-text/40 tracking-[0.1em] text-sm uppercase font-black">SOMEGOOD STANDARD ALGORITHM PROPOSAL</p>
            </div>

            <div className="p-10 md:p-16 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black text-brand-text/30 uppercase tracking-[0.3em] mb-4">PRIMARY TARGET</h4>
                    <div className="font-black text-brand-text uppercase tracking-tight">
                      {renderMixedLabel(firstSessionDecision.primaryTarget, "text-3xl", "text-sm")}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-brand-text/30 uppercase tracking-[0.3em] mb-4">OPTIMIZED DIRECTION</h4>
                    <div className="font-black text-brand-light bg-white/5 px-6 py-4 rounded-2xl inline-block border border-white/10">
                      {renderMixedLabel(firstSessionDecision.direction, "text-lg", "text-xs")}
                    </div>
                  </div>
                </div>
                  <div className="bg-black/20 rounded-[2rem] p-8 border border-white/5 italic text-brand-text/70 leading-relaxed font-medium">
                    {renderMixedLabel(firstSessionDecision.internalInterpretation.replace(/[“”]/g, ''), "text-lg", "text-sm")}
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-12 border-t border-white/5">
                <div className="bg-red-500/10 p-10 rounded-[2.5rem] border border-red-500/20">
                  <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4" /> RESTRICTIONS
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {firstSessionDecision.restrictions.map((res: string, i: number) => (
                      <div key={i} className="bg-white/10 text-red-100 px-5 py-3 rounded-xl border border-white/10 shadow-sm">
                        {renderMixedLabel(res, "text-[13px] font-black", "text-[10px]")}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-green-500/10 p-10 rounded-[2.5rem] border border-green-500/20">
                  <h4 className="text-[10px] font-black text-green-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4" /> NEXT STEP CONDITIONS
                  </h4>
                  <ul className="space-y-4">
                    {firstSessionDecision.nextStepConditions.map((cond: string, i: number) => (
                      <li key={i} className="flex items-start gap-4 text-green-100/70">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                        <div className="flex-1">
                          {renderMixedLabel(cond, "text-sm font-bold", "text-xs")}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* BRAND MESSAGE */}
        <section className="bg-black/20 rounded-[4rem] p-16 md:p-24 text-center text-brand-text relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
          <div className="relative z-10 space-y-12">
            <p className="text-xl md:text-2xl font-medium leading-relaxed max-w-3xl mx-auto italic text-brand-text/80 mb-8 uppercase tracking-tight">
              Your transformation is more than just a result;<br />
              it is the beginning of a journey designed with deep skin understanding.
            </p>
            <p className="text-2xl md:text-3xl font-light leading-relaxed max-w-2xl mx-auto italic">
              {patientInfo.name}님의 변화는 단순한 결과가 아닌,<br />
              피부를 깊이 이해하고 설계한 여정의 시작입니다.
            </p>
            <div className="w-16 h-[1px] bg-brand-text/20 mx-auto"></div>
            <div className="pt-6">
              <p className="text-4xl md:text-6xl font-black tracking-[0.4em] text-brand-text/10 uppercase mb-4">SOMEGOOD</p>
              <p className="text-[10px] font-black tracking-[0.6em] text-brand-text/40 uppercase">Freedom Begins with Clear Body Skin</p>
            </div>
          </div>
        </section>

        <div className="flex justify-center pt-12 pb-20">
          <button
            onClick={() => window.location.reload()}
            className="px-12 py-5 glass-button rounded-full text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white/20 transition-all duration-500"
          >
            START NEW SESSION
          </button>
        </div>
      </div>
    </div>
  )

  const currentSlide = slides[step]
  const progressPercent = Math.round((step / (slides.length - 1)) * 100) || 0

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans text-brand-text selection:bg-brand-text selection:text-brand-dark">
      {/* Header */}
      <div className="bg-brand-bg/80 backdrop-blur-xl sticky top-0 z-20 border-b border-white/5">
        <div className="h-1 w-full bg-white/5">
          <div
            className="h-full bg-brand-text/50 transition-all duration-1000 ease-in-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="p-6 flex items-center justify-between max-w-3xl mx-auto w-full">
          <h1 className="text-[12px] font-black text-brand-text tracking-[0.4em] uppercase flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-brand-text/50" />
            SOMEGOOD STANDARD
          </h1>
          <span className="text-[10px] font-black text-brand-text/40 bg-white/5 px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/5">
            STEP {step + 1} / {slides.length}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full p-4 py-12 md:py-20">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-6 py-4 rounded-2xl mb-8 text-[11px] font-black tracking-widest animate-in fade-in slide-in-from-top-4 text-center uppercase">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            {/* 1. Basic Info */}
            {currentSlide.type === 'info' && (
              <div className="glass-card rounded-[3rem] p-10 md:p-16 space-y-12 border-white/10">
                <div className="text-center">
                  <h2 className="text-2xl md:text-4xl font-black text-brand-text mb-4 uppercase tracking-tight">CUSTOMER INFORMATION</h2>
                  <p className="text-brand-text/40 text-[10px] font-bold tracking-[0.2em]">Patient Identification & Verification</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-brand-text/30 uppercase tracking-[0.3em] ml-1">Full Name</span>
                    <input type="text" placeholder="HONG GILDONG" className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-5 outline-none focus:border-brand-text transition-all placeholder:text-brand-text/10 text-lg font-bold" value={patientInfo.name} onChange={e => setPatientInfo({ ...patientInfo, name: e.target.value })} />
                  </div>
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-brand-text/30 uppercase tracking-[0.3em] ml-1">Mobile Contact</span>
                    <input type="tel" placeholder="010-0000-0000" className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-5 outline-none focus:border-brand-text transition-all placeholder:text-brand-text/10 text-lg font-bold" value={patientInfo.phone} onChange={e => setPatientInfo({ ...patientInfo, phone: formatPhoneNumber(e.target.value) })} />
                  </div>
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-brand-text/30 uppercase tracking-[0.3em] ml-1">Birth Date</span>
                    <input 
                      type="text" 
                      placeholder="YYYY MM DD" 
                      className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-5 outline-none focus:border-brand-text transition-all text-lg font-bold placeholder:text-brand-text/10" 
                      value={patientInfo.birthDate} 
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 4) {
                          // YYYY
                        } else if (val.length <= 6) {
                          // YYYY-MM
                          val = val.slice(0, 4) + '-' + val.slice(4);
                        } else {
                          // YYYY-MM-DD
                          val = val.slice(0, 4) + '-' + val.slice(4, 6) + '-' + val.slice(6, 8);
                        }
                        setPatientInfo({ ...patientInfo, birthDate: val.slice(0, 10) });
                      }} 
                    />
                  </div>
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-brand-text/30 uppercase tracking-[0.3em] ml-1">Gender</span>
                    <div className="flex gap-4">
                      {['M', 'F'].map(g => (
                        <button key={g} onClick={() => setPatientInfo({ ...patientInfo, gender: g })} className={`flex-1 py-5 rounded-[1.5rem] border font-black text-[12px] tracking-[0.3em] transition-all duration-700 uppercase ${patientInfo.gender === g ? 'bg-brand-text text-brand-dark border-brand-text shadow-xl scale-105' : 'bg-white/5 border-white/10 text-brand-text/30'}`}>
                          {g === 'M' ? 'MALE' : 'FEMALE'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Step 1: Zone Selection */}
            {currentSlide.type === 'step1' && (
              <div className="glass-card rounded-[3rem] p-10 md:p-16 border-white/10">
                <div className="text-center mb-16">
                  <h2 className="text-2xl md:text-4xl font-black text-brand-text mb-4 uppercase tracking-tight">TARGET ZONE</h2>
                  <p className="text-brand-text/40 text-[10px] font-bold tracking-[0.2em]">Define the anatomical target area</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {ZONES.map(z => (
                    <button
                      key={z}
                      onClick={() => handleZoneSelect(z)}
                      className={`p-8 rounded-[2rem] border transition-all duration-700 text-left ${answers.zone.includes(z) ? 'bg-brand-text text-brand-dark border-brand-text shadow-2xl scale-[1.02]' : 'bg-white/5 border-white/10 text-brand-text/30 hover:border-white/30 hover:text-brand-text'}`}
                    >
                      {renderMixedLabel(ZONE_DISPLAY_MAP[z] || z, "text-lg", "text-[11px]")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Step 2: Condition Selection */}
            {currentSlide.type === 'step2' && (
              <div className="glass-card rounded-[3rem] p-10 md:p-16 border-white/10">
                <div className="text-center mb-16">
                  <h2 className="text-2xl md:text-4xl font-black text-brand-text mb-4 uppercase tracking-tight">DIAGNOSIS</h2>
                  <p className="text-brand-text/40 text-[10px] font-bold tracking-[0.2em]">Map all observable clinical conditions</p>
                </div>

                <div className="space-y-16">
                  {Object.entries(
                    Object.keys(ALL_CONDITIONS).reduce((acc, name) => {
                      const cat = ALL_CONDITIONS[name].category;
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(name);
                      return acc;
                    }, {} as Record<string, string[]>)
                  ).map(([cat, items], idx) => (
                    <div key={idx} className="space-y-6">
                      <h4 className="text-[10px] font-black text-brand-text/20 uppercase tracking-[0.4em] ml-2">{cat}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {items.map((item, i) => {
                          const isSelected = answers.conditions.includes(item);
                          return (
                            <button
                              key={i}
                              onClick={() => handleConditionToggle(item)}
                              className={`flex items-center gap-5 p-6 rounded-[1.5rem] border transition-all duration-500 text-left ${isSelected ? 'bg-brand-text text-brand-dark border-brand-text shadow-xl' : 'bg-white/5 border-white/10 text-brand-text/30 hover:border-white/20'}`}
                            >
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${isSelected ? 'border-brand-dark bg-brand-dark' : 'border-white/10'}`}>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-text" />}
                              </div>
                              {renderMixedLabel(CONDITION_DISPLAY_MAP[item] || item, "text-sm font-bold", "text-[10px]")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}



            {/* 5. Step 3: Why (Cause Reveal) */}
            {currentSlide.type === 'step3' && standardResult && (
              <div className="glass-card rounded-[3.5rem] p-12 md:p-20 overflow-hidden relative border-white/10">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03]">
                  <Send className="w-64 h-64 text-brand-text" />
                </div>
                <div className="relative z-10">
                  <div className="inline-block bg-white/10 text-brand-text px-6 py-2 rounded-full text-[10px] font-black mb-10 tracking-[0.4em] uppercase border border-white/10">ALGORITHM INSIGHT. 01</div>
                  <h2 className="text-3xl md:text-5xl font-black text-brand-text mb-10 md:mb-16 uppercase tracking-tight leading-none">CAUSAL<br />ANALYSIS</h2>

                  <div className="space-y-8">
                    {standardResult.causes.map((cause, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.3 + 0.4 }}
                        className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10 backdrop-blur-sm"
                      >
                        <h4 className="text-brand-text font-black text-2xl mb-4 uppercase tracking-tight underline decoration-brand-text/10 underline-offset-8">{CAUSE_LABEL_MAP_EN[cause.label] || cause.label}</h4>
                        <p className="text-brand-text/50 leading-relaxed font-medium text-lg whitespace-pre-line">{cause.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. Step 4-Background: Detailed Factors */}
            {currentSlide.type === 'step4-background' && (
              <div className="glass-card rounded-[3rem] p-10 md:p-16 space-y-16 border-white/10">
                <div className="text-center">
                  <h2 className="text-2xl md:text-4xl font-black text-brand-text mb-4 uppercase tracking-tight">BIO-PARAMETERS</h2>
                  <p className="text-brand-text/40 text-[10px] font-bold tracking-[0.2em]">Determining skin physical characteristics</p>
                </div>

                <div className="space-y-16">
                  {/* Skin Thickness */}
                  <div className="space-y-8">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-black text-brand-text/20 uppercase tracking-[0.4em]">Skin Thickness</label>
                      <span className="text-brand-dark font-black bg-brand-text px-6 py-2 rounded-full text-[12px] uppercase shadow-lg tracking-widest">
                        {({
                          '극도로 얇음': 'EXTREMELY THIN',
                          '매우 얇음': 'VERY THIN',
                          '얇은 편': 'THIN',
                          '보통': 'NORMAL',
                          '두꺼운 편': 'THICK',
                          '매우 두꺼움': 'VERY THICK'
                        } as Record<string, string>)[answers.skinThickness] || answers.skinThickness}
                      </span>
                    </div>
                    <div className="relative h-16 flex items-center">
                      <input
                        type="range"
                        min="0" max="5" step="1"
                        value={['극도로 얇음', '매우 얇음', '얇은 편', '보통', '두꺼운 편', '매우 두꺼움'].indexOf(answers.skinThickness) === -1 ? 3 : ['극도로 얇음', '매우 얇음', '얇은 편', '보통', '두꺼운 편', '매우 두꺼움'].indexOf(answers.skinThickness)}
                        onChange={(e) => {
                          const val = ['극도로 얇음', '매우 얇음', '얇은 편', '보통', '두꺼운 편', '매우 두꺼움'][parseInt(e.target.value)];
                          setAnswers(prev => ({ ...prev, skinThickness: val }));
                        }}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-text"
                      />
                      <div className="absolute -bottom-10 w-full flex justify-between text-[9px] text-brand-text/10 font-black tracking-[0.3em] uppercase">
                        <span>Extremely Thin</span>
                        <span>Normal</span>
                        <span>Extremely Thick</span>
                      </div>
                    </div>
                  </div>

                  {/* Tissue Type */}
                  <div className="space-y-8">
                    <label className="text-[10px] font-black text-brand-text/20 uppercase tracking-[0.4em] block">Tissue Density</label>
                    <div className="grid grid-cols-5 gap-4">
                      {[
                        { key: '매우 부드러움', label: 'VERY SOFT' },
                        { key: '부드러운 편', label: 'SOFT' },
                        { key: '보통', label: 'NORMAL' },
                        { key: '단단한 편', label: 'FIRM' },
                        { key: '매우 단단함', label: 'VERY FIRM' }
                      ].map((t, i) => (
                        <button
                          key={i}
                          onClick={() => setAnswers(prev => ({ ...prev, tissueType: t.key }))}
                          className={`flex flex-col items-center gap-5 p-5 rounded-[1.5rem] border transition-all duration-700 ${answers.tissueType === t.key ? 'bg-brand-text border-brand-text text-brand-dark scale-110 shadow-2xl' : 'bg-white/5 border-white/10 text-brand-text/20 hover:border-white/30'}`}
                        >
                          <div className={`w-[2px] h-12 rounded-full transition-all ${answers.tissueType === t.key ? 'bg-brand-dark' : 'bg-white/10'}`} />
                          <span className="text-[9px] font-black text-center leading-tight whitespace-pre-wrap uppercase tracking-tighter">
                            {t.label.replace(' ', '\n')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tendencies */}
                  <div className="grid grid-cols-2 gap-6 pt-4">
                    <button
                      onClick={() => setAnswers(prev => ({ ...prev, pigmentHigh: !prev.pigmentHigh }))}
                      className={`flex items-center justify-between p-8 rounded-[2rem] border transition-all duration-700 ${answers.pigmentHigh ? 'bg-brand-text text-brand-dark border-brand-text shadow-xl' : 'bg-white/5 border-white/10 text-brand-text/20 hover:border-white/30'}`}
                    >
                      <div className="flex flex-col text-left gap-1">
                        <span className="font-black text-[12px] uppercase tracking-[0.2em] leading-tight">Pigment<br />Tendency</span>
                        <span className="text-[10px] font-medium opacity-40">색소 침착 경향</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${answers.pigmentHigh ? 'bg-brand-dark border-brand-dark' : 'border-white/10'}`}>
                        {answers.pigmentHigh && <div className="w-2 h-2 bg-brand-text rounded-full" />}
                      </div>
                    </button>
                    <button
                      onClick={() => setAnswers(prev => ({ ...prev, historyOfEasyMarking: !prev.historyOfEasyMarking }))}
                      className={`flex items-center justify-between p-8 rounded-[2rem] border transition-all duration-700 ${answers.historyOfEasyMarking ? 'bg-brand-text text-brand-dark border-brand-text shadow-xl' : 'bg-white/5 border-white/10 text-brand-text/20 hover:border-white/30'}`}
                    >
                      <div className="flex flex-col text-left gap-1">
                        <span className="font-black text-[12px] uppercase tracking-[0.2em] leading-tight">Post-Damage<br />Marking</span>
                        <span className="text-[10px] font-medium opacity-40">상처 후 자국 남음</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${answers.historyOfEasyMarking ? 'bg-brand-dark border-brand-dark' : 'border-white/10'}`}>
                        {answers.historyOfEasyMarking && <div className="w-2 h-2 bg-brand-text rounded-full" />}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 6.5. Health & Hormonal Issues */}
            {currentSlide.type === 'step-hormone' && (
              <div className="glass-card rounded-[3rem] p-10 md:p-16 space-y-16 border-white/10">
                <div className="text-center">
                  <h2 className="text-2xl md:text-4xl font-black text-brand-text mb-4 uppercase tracking-tight">HEALTH FACTORS</h2>
                  <p className="text-brand-text/40 text-[10px] font-bold tracking-[0.2em] uppercase">피부 변화와 함께 참고해야 할 건강 관련 이슈가 있으신가요?</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    "자궁 관련 이슈",
                    "갑상선 관련 이슈",
                    "호르몬 관련 이슈",
                    "생리 주기 불규칙",
                    "임신 / 출산 / 수유 이후 변화",
                    "현재 병원 치료 또는 약 복용 중",
                    "기타",
                    "해당 없음"
                  ].map((option, i) => {
                    const isSelected = answers.hormonalIssues.includes(option);
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setAnswers(prev => {
                            const current = prev.hormonalIssues || [];
                            if (option === "해당 없음") {
                              if (isSelected) {
                                return { ...prev, hormonalIssues: [] };
                              } else {
                                return { ...prev, hormonalIssues: ["해당 없음"] };
                              }
                            } else {
                              const filtered = current.filter(x => x !== "해당 없음");
                              if (isSelected) {
                                return { ...prev, hormonalIssues: filtered.filter(x => x !== option) };
                              } else {
                                return { ...prev, hormonalIssues: [...filtered, option] };
                              }
                            }
                          });
                          setError('');
                        }}
                        className={`flex items-center gap-5 p-6 rounded-[1.5rem] border transition-all duration-500 text-left ${isSelected ? 'bg-brand-text text-brand-dark border-brand-text shadow-xl scale-[1.02]' : 'bg-white/5 border-white/10 text-brand-text/30 hover:border-white/20'}`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${isSelected ? 'border-brand-dark bg-brand-dark' : 'border-white/10'}`}>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-text" />}
                        </div>
                        <span className="text-sm font-bold">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 7. STOP: Risk Check Reveal */}
            {currentSlide.type === 'stop' && standardResult && (
              <div className="glass-card rounded-[4rem] p-16 md:p-24 text-center border-white/10 relative overflow-hidden">
                <div className={`absolute inset-0 opacity-[0.03] transition-colors duration-1000 ${standardResult.isHighRisk ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`w-32 h-32 rounded-[2.5rem] mx-auto flex items-center justify-center mb-12 border-2 relative z-10 transition-all duration-1000 ${standardResult.isHighRisk ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_50px_rgba(34,197,94,0.2)]'}`}
                >
                  {standardResult.isHighRisk ? <AlertTriangle className="w-16 h-16" /> : <CheckCircle2 className="w-16 h-16" />}
                </motion.div>

                <div className="relative z-10 space-y-8">
                  <h2 className={`text-5xl font-black uppercase tracking-tight transition-colors duration-1000 ${standardResult.isHighRisk ? 'text-red-200' : 'text-green-200'}`}>
                    {standardResult.isHighRisk ? 'HIGH RISK NOTICE' : 'SAFE TO PROCEED'}
                  </h2>
                  <p className="text-brand-text/40 text-xl max-w-lg mx-auto leading-relaxed font-medium">
                    {standardResult.isHighRisk
                      ? '현재 피부는 자극 시 반응이 급격히 확대될 가능성이 높은 고위험군입니다. 무리한 개입보다는 단계적 안정화가 최우선입니다.'
                      : '현재 피부는 특별한 열감이나 확산 징후가 없는 안정적인 상태입니다. 설계된 방향에 따라 관리를 진행할 수 있습니다.'}
                  </p>

                  {/* Prominent Risk Grade Card */}
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className={`p-12 rounded-[3rem] border-2 transition-all duration-1000 ${RISK_DETAILS[answers.riskGrade || 'R1'].bg} ${RISK_DETAILS[answers.riskGrade || 'R1'].color} flex flex-col items-center gap-6 shadow-2xl`}
                  >
                    <div className={`text-[11px] font-black uppercase tracking-[0.5em] opacity-40 ${RISK_DETAILS[answers.riskGrade || 'R1'].text}`}>DIAGNOSTIC STATUS</div>
                    <div className={`text-5xl font-black ${RISK_DETAILS[answers.riskGrade || 'R1'].text} uppercase tracking-tighter`}>
                      {RISK_DETAILS[answers.riskGrade || 'R1'].label}
                    </div>
                    <div className={`text-sm font-black opacity-60 ${RISK_DETAILS[answers.riskGrade || 'R1'].text} uppercase tracking-[0.3em]`}>
                      {RISK_DETAILS[answers.riskGrade || 'R1'].desc}
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* 8. Step 4: Action Plan Reveal */}
            {currentSlide.type === 'step4' && standardResult && (
              <div className="glass-card rounded-[3.5rem] p-12 md:p-20 text-brand-text overflow-hidden relative border-white/10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-[100px]"></div>

                <div className="relative z-10">
                  <div className="inline-block bg-white/10 px-6 py-2 rounded-full text-[10px] font-black mb-10 tracking-[0.4em] uppercase border border-white/10">STRATEGY INSIGHT. 02</div>
                  <h2 className="text-5xl font-black mb-16 uppercase tracking-tight leading-none">MANAGEMENT<br />STRATEGY</h2>

                  <div className="space-y-6">
                    {standardResult.conclusions.map((conc, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.3 + 0.5 }}
                        className="bg-white/5 p-8 md:p-10 rounded-[2rem] border border-white/10 backdrop-blur-sm group hover:bg-white/10 transition-all duration-500 w-full"
                      >
                        <div className="text-brand-text/30 text-[10px] font-black mb-3 uppercase tracking-[0.3em]">PROPOSAL 0{i + 1}</div>
                        <div className="font-black leading-tight tracking-tight">
                          {renderMixedLabel(conc, "text-xl md:text-2xl", "text-sm md:text-base")}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-16 pt-10 border-t border-white/5 text-center">
                    <p className="text-brand-text/60 text-[13px] font-medium italic">
                      “상기 제안은 썸굿 스탠다드 알고리즘의 1차 분석 결과이며, 전문가의 최종 판단에 따라 조정될 수 있습니다.”
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 9. Step 5: Final Session Logic Reveal */}
            {currentSlide.type === 'step5-first-session' && firstSessionDecision && (
              <div className="glass-card rounded-[3.5rem] p-12 md:p-20 border-white/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-brand-light/5 rounded-full -ml-48 -mt-48 blur-[100px]"></div>

                <div className="relative z-10 space-y-16">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-3 bg-brand-text text-brand-dark px-6 py-2 rounded-full text-[10px] font-black tracking-[0.5em] uppercase mb-8 shadow-2xl">
                      <Sparkles className="w-4 h-4" /> 1ST SESSION OPTIMIZATION
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
                      {renderMixedLabel(firstSessionDecision.primaryTarget, "text-4xl md:text-6xl", "text-lg md:text-xl")}
                    </h2>
                    <p className="text-brand-text/40 text-sm uppercase font-black tracking-[0.4em]">Optimized Initial Intervention Target</p>
                  </div>

                  <div className="space-y-10">
                    {/* Clinical Direction Section */}
                    <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10 space-y-8 backdrop-blur-sm">
                      <div>
                        <h4 className="text-[10px] font-black text-brand-text/30 uppercase tracking-[0.3em] mb-4">CLINICAL DIRECTION</h4>
                        <div className="font-black text-brand-light tracking-tight leading-tight">
                          {renderMixedLabel(firstSessionDecision.direction, "text-3xl md:text-4xl", "text-sm md:text-base")}
                        </div>
                      </div>
                        <div className="pt-8 border-t border-white/5 italic text-brand-text/60 leading-relaxed text-lg md:text-xl">
                          {renderMixedLabel(firstSessionDecision.internalInterpretation.replace(/[“”]/g, ''), "text-lg md:text-xl", "text-sm md:text-base")}
                        </div>
                    </div>

                    {/* Contraindications & Success Criteria Section */}
                    <div className="grid grid-cols-1 gap-10">
                      <div className="bg-red-500/5 p-10 rounded-[2.5rem] border border-red-500/10">
                        <h4 className="text-[10px] font-black text-red-400/50 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5" /> CONTRAINDICATIONS
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {firstSessionDecision.restrictions.map((res: string, i: number) => (
                            <div key={i} className="bg-red-500/10 text-red-200 px-6 py-3 rounded-xl border border-red-500/20">
                              {renderMixedLabel(res, "text-[13px] font-black", "text-[10px]")}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-green-500/5 p-10 rounded-[2.5rem] border border-green-500/10">
                        <h4 className="text-[10px] font-black text-green-400/50 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5" /> SUCCESS CRITERIA
                        </h4>
                        <ul className="space-y-4">
                          {firstSessionDecision.nextStepConditions.map((cond: string, i: number) => (
                            <li key={i} className="flex items-start gap-6 text-brand-text/60 font-bold">
                              <div className="w-2 h-2 rounded-full bg-green-400/50 mt-2" /> 
                              <div className="flex-1">
                                {renderMixedLabel(cond, "text-lg", "text-sm")}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>

      {/* Footer Navigation (Sticky) */}
      <div className="bg-brand-bg/80 backdrop-blur-xl sticky bottom-0 z-20 border-t border-white/5 mt-auto">
        <div className="max-w-2xl mx-auto w-full p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          {step > 0 && (
            <button
              onClick={goPrev}
              className="w-full md:flex-1 py-5 rounded-2xl glass-button border-white/5 text-[11px] font-black tracking-[0.4em] uppercase flex items-center justify-center gap-4 hover:bg-white/5 transition-all duration-700 group"
            >
              <ChevronLeft className="w-5 h-5 opacity-30 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" /> PREV
            </button>
          )}
          <button
            onClick={goNext}
            disabled={submitting}
            className={`w-full md:flex-[2] py-5 rounded-2xl font-black text-[12px] tracking-[0.5em] uppercase flex items-center justify-center gap-4 transition-all duration-1000 shadow-2xl group ${step === slides.length - 1 ? 'bg-brand-light text-brand-dark hover:scale-[1.03]' : 'bg-brand-text text-brand-dark hover:scale-[1.03]'}`}
          >
            {submitting ? (
              <div className="w-5 h-5 border-3 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin"></div>
            ) : step === slides.length - 1 ? (
              <>GENERATE DIAGNOSIS <Sparkles className="w-5 h-5 animate-pulse" /></>
            ) : (
              <>NEXT PHASE <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-all" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SurveyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="animate-pulse flex flex-col items-center gap-8">
          <div className="w-16 h-16 border-4 border-white/5 border-t-brand-text rounded-full animate-spin"></div>
          <div className={`text-brand-text font-black tracking-[0.5em] uppercase text-sm`}>INITIALIZING SYSTEM</div>
        </div>
      </div>
    }>
      <SurveyContent />
    </Suspense>
  )
}
