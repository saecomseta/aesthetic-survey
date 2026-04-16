'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, User, Phone, CalendarDays, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPhoneNumber } from '@/lib/format'
import ReactMarkdown from 'react-markdown'
import { calculateResults } from '@/utils/assemblyEngine'

type Slide =
  | { type: 'info' }
  | { type: 'question'; sector: any; question: any }

function SurveyContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const adminId = searchParams.get('admin_id')

  const [survey, setSurvey] = useState<any>(null)
  const [sectors, setSectors] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [scripts, setScripts] = useState<any[]>([])
  const [spaces, setSpaces] = useState<any[]>([])
  
  const [patientInfo, setPatientInfo] = useState({ name: '', phone: '', birthDate: '', gender: '' })
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [calculatedSpaceResults, setCalculatedSpaceResults] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // UI state
  const [slides, setSlides] = useState<Slide[]>([])
  const [step, setStep] = useState(0)
  const [subQuestionsMap, setSubQuestionsMap] = useState<Record<string, any[]>>({})
  const slidesRef = useRef<Slide[]>([])
  
  useEffect(() => { slidesRef.current = slides }, [slides])

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    const { data: sData, error: sErr } = await supabase
      .from('surveys')
      .select('id, title, is_active, master_templates_json, combinations_json')
      .eq('id', params.id)
      .single()

    if (sErr || !sData || !sData.is_active) {
      setLoading(false)
      return
    }
    setSurvey(sData)

    const [secRes, qRes, scRes] = await Promise.all([
      supabase.from('sectors').select('*').eq('survey_id', params.id).order('order', { ascending: true }),
      supabase.from('questions').select('*').eq('survey_id', params.id).order('order', { ascending: true }),
      supabase.from('diagnostic_scripts').select('*').eq('survey_id', params.id)
    ])

    let loadedSectors = secRes.data || []
    let loadedQuestions = qRes.data || []
    
    if (loadedSectors.length > 0) setSectors(loadedSectors)
    if (scRes.data) setScripts(scRes.data)
    
    if (loadedQuestions.length > 0) {
      setQuestions(loadedQuestions)
      const initAns: Record<string, any> = {}
      loadedQuestions.forEach(q => {
        if (q.type === 'checkbox') initAns[q.id] = []
        else initAns[q.id] = ''
      })
      setAnswers(initAns)
    }

    // Build Slides Array
    const mainQuestions = loadedQuestions.filter(q => !q.parent_id)
    const subQuestions = loadedQuestions.filter(q => !!q.parent_id)
    
    const subMap: Record<string, any[]> = {}
    subQuestions.forEach(q => {
      if (!subMap[q.parent_id]) subMap[q.parent_id] = []
      subMap[q.parent_id].push(q)
    })
    setSubQuestionsMap(subMap)

    const newSlides: Slide[] = [{ type: 'info' }]
    loadedSectors.forEach(sec => {
      const secQs = mainQuestions.filter(q => q.sector_id === sec.id)
      if (secQs.length > 0) {
        secQs.forEach(q => {
          newSlides.push({ type: 'question', sector: sec, question: q })
        })
      }
    })
    setSlides(newSlides)
    setLoading(false)
  }

  const handleCheckboxChange = (qId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = prev[qId] as string[]
      if (checked) return { ...prev, [qId]: [...current, option] }
      return { ...prev, [qId]: current.filter(o => o !== option) }
    })
  }

  const handleRadioOrOXSelect = (qId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [qId]: option }))
    setError('')
    
    // 동적 하위 질문 슬라이드 삽입 (Dynamic Splice)
    setSlides(prevSlides => {
      const currentSlide = prevSlides[step];
      if (currentSlide?.type === 'question' && currentSlide.question.id === qId) {
        const subs = subQuestionsMap[qId] || [];
        if (subs.length > 0) {
          const newSlides = [...prevSlides];
          // 기존 하위 질문 제거
          const filtered = newSlides.filter(s => 
            s.type !== 'question' || (s as any).question.parent_id !== qId
          );
          
          // 새 하위 질문 삽입
          const matchedSubs = subs.filter(sq => sq.trigger_value ? sq.trigger_value === option : option === 'O');
          if (matchedSubs.length > 0) {
            const insertIdx = filtered.findIndex(s => s.type === 'question' && (s as any).question.id === qId) + 1;
            const subSlides = matchedSubs.map((sq: any) => ({
              type: 'question' as const,
              sector: (currentSlide as any).sector,
              question: sq
            }));
            filtered.splice(insertIdx, 0, ...subSlides);
          }
          return filtered;
        }
      }
      return prevSlides;
    })

    // Auto advance after short delay
    setTimeout(() => {
      goNext(true)
    }, 450)
  }

  const goNext = (autoAdvance = false) => {
    setError('')
    const currentSlides = slidesRef.current.length > 0 ? slidesRef.current : slides;
    const currentSlide = currentSlides[step]

    // Validate
    if (!autoAdvance) {
      if (currentSlide?.type === 'info') {
        if (!patientInfo.name.trim() || !patientInfo.phone.trim() || !patientInfo.birthDate || !patientInfo.gender) {
          setError('성함, 연락처, 생년월일, 성별을 모두 입력/선택해주세요.')
          return
        }
      } else if (currentSlide?.type === 'question') {
        const q = currentSlide.question
        if (q.is_required) {
          const val = answers[q.id]
          if (Array.isArray(val) ? val.length === 0 : (!val || String(val).trim() === '')) {
            setError('이 문항은 필수 응답입니다.')
            return
          }
        }
      }
    }

    if (step < currentSlides.length - 1) {
      setStep(s => s + 1)
    } else {
      if (!autoAdvance) handleSubmit()
    }
  }

  const goPrev = () => {
    setError('')
    if (step > 0) setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    // Calculate Age from birthDate
    const birthDateObj = new Date(patientInfo.birthDate)
    const today = new Date()
    let age = today.getFullYear() - birthDateObj.getFullYear()
    const m = today.getMonth() - birthDateObj.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--
    }

    let calculatedAgeGroup = '20s'
    if (age >= 30 && age < 40) calculatedAgeGroup = '30s'
    else if (age >= 40) calculatedAgeGroup = '40s'
    
    const storedAgeGroupStr = `${calculatedAgeGroup === '20s' ? '20대' : calculatedAgeGroup === '30s' ? '30대' : '40대 이상'} (${patientInfo.birthDate})`
    const targetKey = `${patientInfo.gender}_${calculatedAgeGroup}` as 'M_20s'|'M_30s'|'M_40s'|'F_20s'|'F_30s'|'F_40s';

    const activeQuestionIds = slidesRef.current.filter(s => s.type === 'question').map(s => (s as any).question.id);

    const { sectorAdviceMap, sectorAdviceArr, extraAdviceText } = calculateResults(
      sectors,
      questions,
      scripts,
      answers,
      activeQuestionIds,
      calculatedAgeGroup,
      survey.combinations_json
    );

    const sectorAdviceAllText = sectorAdviceArr.length > 0 ? sectorAdviceArr.map((text: string) => `• ${text}`).join('\n\n') : '';

    // 3. Assemble Master Template
    let masterTemplateText = survey.master_templates_json ? survey.master_templates_json[targetKey] : '';
    if (!masterTemplateText) masterTemplateText = '진단 결과가 생성되었습니다.\n\n추가 소견:\n{{extra_advice}}';

    // First replace general variables
    let finalResultText = masterTemplateText
      .replace(/\{\{\s*name\s*\}\}/g, patientInfo.name)
      .replace(/\{\{\s*sector_advice\s*\}\}/g, sectorAdviceAllText)
      .replace(/\{\{\s*extra_advice\s*\}\}/g, extraAdviceText);

    // Then dynamically replace all {{sector:variable_name}} across the template
    finalResultText = finalResultText.replace(/\{\{\s*sector:([^}]+?)\s*\}\}/g, (match: string, sectorKey: string) => {
      const target = sectorKey.trim();
      const normalizedTarget = target.toLowerCase().replace(/[^a-z0-9_]/g, '');
      
      // Look for a key in sectorAdviceMap that matches the normalized target
      const actualKey = Object.keys(sectorAdviceMap).find(k => 
        k.toLowerCase().replace(/[^a-z0-9_]/g, '') === normalizedTarget
      );
      
      // Returns mapped content, or empty string if not found/no script matched
      return actualKey ? sectorAdviceMap[actualKey] : '';
    });

    const combinedResult = [{
      title: '✨ 당신을 위한 맞춤 진단 결과',
      script: finalResultText
    }]

    const { error: submitErr } = await supabase
      .from('responses')
      .insert({
        survey_id: survey.id,
        admin_id: adminId || null,
        patient_name: patientInfo.name,
        patient_phone: patientInfo.phone,
        patient_gender: patientInfo.gender,
        patient_age_group: storedAgeGroupStr,
        answers,
        sector_results: {},
        space_results: combinedResult
      })

    if (submitErr) {
      console.error(submitErr)
      setError('제출 중 오류가 발생했습니다. 다시 시도해주세요.')
      setSubmitting(false)
    } else {
      setCalculatedSpaceResults(combinedResult)
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-beige-50">
      <div className="animate-pulse text-primary-500">설문지 데이터를 불러오는 중입니다...</div>
    </div>
  )

  if (!survey || slides.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-beige-50 p-6 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-beige-200 shadow-sm">
        <h1 className="text-xl font-medium text-gray-900 mb-2">설문 진행 불가</h1>
        <p className="text-gray-500">존재하지 않거나 현재 비활성화된 설문입니다.</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-beige-50 p-4 py-12 text-center md:p-6">
      <div className="max-w-2xl w-full bg-white p-8 md:p-12 rounded-3xl shadow-lg border border-beige-200 flex flex-col items-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-light text-primary-800 mb-4">제출 완료</h1>
        <p className="text-gray-500 text-lg leading-relaxed">소중한 문답을 남겨주셔서 감사합니다.<br/>담당자가 확인 후 안내해 드리겠습니다.</p>
        
        {calculatedSpaceResults.length > 0 && (
          <div className="w-full mt-10 space-y-4 text-left border-t border-beige-200 pt-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <h2 className="text-xl font-bold text-primary-900 mb-8 text-center flex items-center justify-center gap-2">
              {calculatedSpaceResults[0].title}
            </h2>
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2rem] border border-primary-200 shadow-md transition-all relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-400"></div>
                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-[16px] font-medium pl-3 prose prose-primary max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                  <ReactMarkdown>{calculatedSpaceResults[0].script}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const currentSlide = slides[step]
  const progressPercent = Math.round((step / (slides.length - 1)) * 100) || 0

  return (
    <div className="min-h-screen bg-beige-50 flex flex-col font-sans">
      {/* Top Header & Progress */}
      <div className="bg-white shadow-sm border-b border-beige-200 sticky top-0 z-20">
        <div className="h-1.5 w-full bg-gray-100">
          <div 
            className="h-full bg-primary-500 transition-all duration-500 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="p-4 flex items-center justify-between max-w-3xl mx-auto w-full">
          <h1 className="text-lg font-medium text-primary-800 truncate flex-1">{survey.title}</h1>
          <span className="text-sm font-medium text-gray-400 whitespace-nowrap ml-4 bg-gray-50 px-2 py-1 rounded-md">
            {step} / {slides.length - 1} 완료
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full p-4 py-8 relative overflow-hidden">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl mb-6 mx-auto text-sm w-full animate-in fade-in slide-in-from-top-4 shadow-sm text-center relative z-10">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full flex-1 flex flex-col justify-center"
          >
            {/* 1. Basic Info Slide */}
            {currentSlide.type === 'info' && (
              <div className="bg-white rounded-3xl shadow-sm border border-primary-200 p-8 py-10">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-light text-primary-800 mb-2">기본 정보 입력</h2>
                  <p className="text-gray-500 text-sm">정확한 진단을 위해 아래 정보를 기입해주세요.</p>
                </div>
                
                <div className="space-y-6">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2"><User className="w-4 h-4 text-primary-400"/> 성함</span>
                    <input autoFocus type="text" placeholder="홍길동" className="w-full border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition text-gray-800 text-lg" value={patientInfo.name} onChange={e=>setPatientInfo({...patientInfo, name: e.target.value})} onKeyDown={e => e.key === 'Enter' && goNext()} />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2"><Phone className="w-4 h-4 text-primary-400"/> 연락처</span>
                    <input type="tel" placeholder="010-0000-0000" className="w-full border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition text-gray-800 text-lg" value={patientInfo.phone} onChange={e=>setPatientInfo({...patientInfo, phone: formatPhoneNumber(e.target.value)})} onKeyDown={e => e.key === 'Enter' && goNext()} />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary-400"/> 생년월일</span>
                    <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition text-gray-800 text-lg" value={patientInfo.birthDate} onChange={e=>setPatientInfo({...patientInfo, birthDate: e.target.value})} onKeyDown={e => e.key === 'Enter' && goNext()} />
                  </label>
                  <label className="block space-y-2 pt-2">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2"><User className="w-4 h-4 text-primary-400"/> 생물학적 성별</span>
                    <div className="flex gap-4 mt-2">
                      <button 
                        type="button"
                        onClick={() => setPatientInfo({...patientInfo, gender: 'M'})}
                        className={`flex-1 py-3.5 rounded-xl border-2 font-medium transition-all ${patientInfo.gender === 'M' ? 'border-primary-500 bg-primary-50 text-primary-800 shadow-sm' : 'border-gray-200 bg-white text-gray-400 hover:border-primary-300 hover:text-gray-700'}`}
                      >남성</button>
                      <button 
                        type="button"
                        onClick={() => setPatientInfo({...patientInfo, gender: 'F'})}
                        className={`flex-1 py-3.5 rounded-xl border-2 font-medium transition-all ${patientInfo.gender === 'F' ? 'border-primary-500 bg-primary-50 text-primary-800 shadow-sm' : 'border-gray-200 bg-white text-gray-400 hover:border-primary-300 hover:text-gray-700'}`}
                      >여성</button>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* 2. Question Slide */}
            {currentSlide.type === 'question' && (
              <div className="bg-white rounded-3xl shadow-sm border border-beige-200 p-8 min-h-[360px] flex flex-col">
                <div className="mb-6">
                  <h3 className="text-2xl font-medium text-gray-900 leading-snug">
                    <span className="text-primary-400 mr-2 font-light hidden sm:inline-block">Q.</span>
                    {currentSlide.question.content}
                    {currentSlide.question.is_required && <span className="text-red-500 ml-1 text-lg">*</span>}
                  </h3>
                </div>

                <div className="flex-1">
                  {currentSlide.question.type === 'text' && (
                    <textarea 
                      autoFocus
                      rows={4} 
                      className="w-full border border-gray-200 rounded-2xl p-5 focus:ring-2 focus:ring-primary-400 outline-none transition bg-gray-50 focus:bg-white text-gray-800 text-lg resize-none" 
                      placeholder="자유롭게 답변을 입력해주세요..." 
                      value={answers[currentSlide.question.id]} 
                      onChange={(e) => setAnswers({ ...answers, [currentSlide.question.id]: e.target.value })} 
                    />
                  )}

                  {(currentSlide.question.type === 'radio' || currentSlide.question.type === 'o_x' || currentSlide.question.type === 'multiple_choice') && (
                    <div className="space-y-3">
                      {currentSlide.question.options.map((opt: string, optIdx: number) => {
                        const isSelected = answers[currentSlide.question.id] === opt;
                        const label = opt.includes('||') ? opt.split('||')[0] : opt;
                        return (
                          <button 
                            key={optIdx} 
                            onClick={() => handleRadioOrOXSelect(currentSlide.question.id, opt)}
                            className={`w-full text-left flex items-center gap-4 p-5 rounded-2xl transition border-2 ${isSelected ? 'bg-primary-50 border-primary-400 shadow-sm' : 'bg-transparent border-gray-100 hover:border-primary-200 hover:bg-beige-50/50'}`}
                          >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}>
                              {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                            </div>
                            <span className={`text-lg transition ${isSelected ? 'font-medium text-primary-900' : 'text-gray-700'}`}>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {currentSlide.question.type === 'checkbox' && (
                    <div className="space-y-3">
                      {currentSlide.question.options.map((opt: string, optIdx: number) => {
                        const isSelected = (answers[currentSlide.question.id] as string[])?.includes(opt) || false;
                        return (
                          <label key={optIdx} className={`w-full flex items-center gap-4 p-5 rounded-2xl cursor-pointer transition border-2 ${isSelected ? 'bg-primary-50 border-primary-400 shadow-sm' : 'bg-transparent border-gray-100 hover:border-primary-200 hover:bg-beige-50/50'}`}>
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={isSelected} 
                              onChange={(e) => handleCheckboxChange(currentSlide.question.id, opt, e.target.checked)} 
                            />
                            <span className={`text-lg transition ${isSelected ? 'font-medium text-primary-900' : 'text-gray-700'}`}>{opt}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-100 p-4 pb-8 sm:pb-4 sticky bottom-0 z-20">
        <div className="max-w-2xl mx-auto flex gap-4">
          <button 
            onClick={goPrev}
            disabled={step === 0 || submitting}
            className="flex-1 py-4 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl font-medium transition disabled:opacity-30 border border-gray-200 hover:border-gray-300"
          >
            <ChevronLeft className="w-5 h-5"/> 이전
          </button>
          
          <button 
            onClick={() => goNext(false)}
            disabled={submitting}
            className={`flex-[2] py-4 flex items-center justify-center gap-2 rounded-2xl font-medium transition shadow-md ${step === slides.length - 1 ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20'}`}
          >
            {step === slides.length - 1 ? (
              submitting ? '처리 중...' : <><Send className="w-5 h-5"/> 최종 제출하기</>
            ) : (
              <>다음 <ChevronRight className="w-5 h-5"/></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-beige-50 animate-pulse flex items-center justify-center p-12 text-primary-400">모듈을 불러오는 중입니다...</div>}>
      <SurveyContent />
    </Suspense>
  )
}
