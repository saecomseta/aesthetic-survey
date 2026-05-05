'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, ArrowLeft, Save, Settings2, FileText, Target, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import TargetScriptEditor, { TargetContents, defaultTargetContents } from '@/components/TargetScriptEditor'

type QuestionType = 'text' | 'radio' | 'checkbox' | 'o_x' | 'multiple_choice'

interface QuestionDraft {
  id: string
  type: QuestionType
  content: string
  options: string[]
  options_extra_advices: Record<string, string>
  o_score: number
  is_required: boolean
  parent_id?: string
  trigger_value?: string
}

interface ScriptDraft {
  id: string
  min_score: number
  max_score: number
  variable_name?: string
  content: string
}

interface CombinationRule {
  id: string;
  variable_names: string; // Changed to string for UI editing
  combined_content: string;
}

interface SectorDraft {
  id: string
  title: string
  base_score: number
  multiplier_20s: number
  multiplier_30s: number
  multiplier_40s: number
  questions: QuestionDraft[]
  scripts: ScriptDraft[]
  is_common: boolean
}

export default function EditSurveyPage() {
  const router = useRouter()
  const params = useParams()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorHeader, setErrorHeader] = useState('')

  const [title, setTitle] = useState('')
  const [masterTemplates, setMasterTemplates] = useState<TargetContents>(defaultTargetContents())
  const [combinations, setCombinations] = useState<CombinationRule[]>([])
  const [sectors, setSectors] = useState<SectorDraft[]>([])

  useEffect(() => {
    fetchSurveyData()
  }, [params.id])

  const fetchSurveyData = async () => {
    // 1. Verify 0 responses
    const { count, error: resError } = await supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', params.id)

    if (resError) {
      console.error(resError)
      setErrorHeader('데이터베이스 오류로 인해 데이터 확인이 불가능합니다.')
      setLoading(false)
      return
    }

    if (count && count > 0) {
      setErrorHeader('이 설문은 이미 수집된 고객 응답이 존재하므로 데이터 무결성 보호를 위해 수정이 차단되었습니다.')
      setLoading(false)
      return
    }

    // 2. Fetch Survey
    const { data: survey } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!survey) {
      setErrorHeader('설문을 찾을 수 없거나 삭제되었습니다.')
      setLoading(false)
      return
    }

    setTitle(survey.title)
    if (survey.master_templates_json) {
      setMasterTemplates(survey.master_templates_json)
    }
    if (survey.combinations_json) {
      // Convert array back to comma-string for editing
      const formatted = (survey.combinations_json as any[]).map(c => ({
        ...c,
        variable_names: Array.isArray(c.variable_names) ? c.variable_names.join(', ') : ''
      }));
      setCombinations(formatted)
    }

    // 3. Fetch Sectors, Questions, Scripts
    const [secRes, qRes, scRes] = await Promise.all([
      supabase.from('sectors').select('*').eq('survey_id', params.id).order('order', { ascending: true }),
      supabase.from('questions').select('*').eq('survey_id', params.id).order('order', { ascending: true }),
      supabase.from('diagnostic_scripts').select('*').eq('survey_id', params.id).order('min_score', { ascending: true })
    ])

    if (secRes.data) {
      const loadedSectors: SectorDraft[] = secRes.data.map(sec => {
        const matchingQs = qRes.data?.filter(q => q.sector_id === sec.id) || []
        const matchingScs = scRes.data?.filter(sc => sc.sector_id === sec.id) || []

        return {
          id: sec.id,
          title: sec.title,
          base_score: Number(sec.base_score),
          multiplier_20s: Number(sec.multiplier_20s),
          multiplier_30s: Number(sec.multiplier_30s),
          multiplier_40s: Number(sec.multiplier_40s),
          is_common: sec.is_common || false,
          questions: matchingQs.map(q => ({
            id: q.id,
            type: q.type as QuestionType,
            content: q.content,
            options: q.options || [],
            options_extra_advices: q.options_extra_advices || {},
            o_score: Number(q.o_score || 0),
            is_required: q.is_required,
            parent_id: q.parent_id || undefined,
            trigger_value: q.trigger_value || undefined
          })),
          scripts: matchingScs.map(sc => ({
            id: sc.id,
            min_score: Number(sc.min_score),
            max_score: Number(sc.max_score),
            variable_name: sc.variable_name || '',
            content: sc.content
          }))
        }
      })
      
      setSectors(loadedSectors.length > 0 ? loadedSectors : [{
        id: Date.now().toString(), title: '섹터 1', base_score: 0, multiplier_20s: 1.0, multiplier_30s: 1.0, multiplier_40s: 1.0, questions: [], scripts: [], is_common: false
      }])
    }

    setLoading(false)
  }

  // Handlers for Sectors
  const addSector = () => {
    setSectors([...sectors, {
      id: Date.now().toString(),
      title: `섹터 ${sectors.length + 1}`,
      base_score: 0,
      multiplier_20s: 1.0,
      multiplier_30s: 1.0,
      multiplier_40s: 1.0,
      questions: [],
      scripts: [],
      is_common: false
    }])
  }
  const updateSector = (sIndex: number, updates: Partial<SectorDraft>) => {
    const newS = [...sectors]
    newS[sIndex] = { ...newS[sIndex], ...updates }
    setSectors(newS)
  }
  const removeSector = (sIndex: number) => {
    setSectors(sectors.filter((_, i) => i !== sIndex))
  }

  // Handlers for Questions
  const addQuestion = (sIndex: number, type: QuestionType) => {
    let initialOptions: string[] = []
    if (type === 'multiple_choice') initialOptions = ['옵션 1||0']
    else if (type !== 'o_x' && type !== 'text') initialOptions = ['옵션 1']
    const q: QuestionDraft = { id: Date.now().toString(), type, content: '', options: initialOptions, options_extra_advices: {}, o_score: 0, is_required: false }
    const newS = [...sectors]
    newS[sIndex].questions.push(q)
    setSectors(newS)
  }

  const addSubQuestion = (sIndex: number, pIndex: number, triggerValue: string) => {
    const parentId = sectors[sIndex].questions[pIndex].id
    const q: QuestionDraft = { id: Date.now().toString(), type: 'text', content: '', options: [], options_extra_advices: {}, o_score: 0, is_required: false, parent_id: parentId, trigger_value: triggerValue }
    const newS = [...sectors]
    newS[sIndex].questions.splice(pIndex + 1, 0, q)
    setSectors(newS)
  }
  const updateQuestion = (sIndex: number, qIndex: number, updates: Partial<QuestionDraft>) => {
    const newS = [...sectors]
    newS[sIndex].questions[qIndex] = { ...newS[sIndex].questions[qIndex], ...updates }
    setSectors(newS)
  }
  const removeQuestion = (sIndex: number, qIndex: number) => {
    const newS = [...sectors]
    newS[sIndex].questions.splice(qIndex, 1)
    setSectors(newS)
  }

  // Handlers for Scripts
  const addScript = (sIndex: number) => {
    const newS = [...sectors]
    newS[sIndex].scripts.push({ id: Date.now().toString(), min_score: 0, max_score: 100, content: '' })
    setSectors(newS)
  }
  const updateScript = (sIndex: number, scIndex: number, updates: Partial<ScriptDraft>) => {
    const newS = [...sectors]
    newS[sIndex].scripts[scIndex] = { ...newS[sIndex].scripts[scIndex], ...updates }
    setSectors(newS)
  }
  const removeScript = (sIndex: number, scIndex: number) => {
    const newS = [...sectors]
    newS[sIndex].scripts.splice(scIndex, 1)
    setSectors(newS)
  }

  const handleSave = async () => {
    if (!title.trim()) return alert('설문지 제목을 입력해주세요.')
    if (sectors.length === 0) return alert('최소 하나 이상의 섹터를 추가해야 합니다.')
    for (const s of sectors) {
      if (!s.title.trim()) return alert('모든 섹터의 항목 제목을 입력해주세요.')
      for (const q of s.questions) {
        if (!q.content.trim()) return alert('모든 문항의 질문 내용을 입력해주세요.')
      }
      for (const sc of s.scripts) {
        if (!sc.content.trim()) return alert('모든 스크립트 작성 칸의 내용을 채워주세요.')
      }
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('로그인이 필요합니다.')
      setSaving(false)
      return
    }

    try {
      // 1. Update Survey Title, Master Template & Combination Logic
      const { error: surveyError } = await supabase
        .from('surveys')
        .update({ 
          title, 
          master_templates_json: masterTemplates,
          combinations_json: combinations.map(c => ({
            ...c,
            variable_names: c.variable_names.split(',').map(v => v.trim()).filter(Boolean)
          }))
        })
        .eq('id', params.id)

      if (surveyError) throw surveyError

      // 2. Delete ALL existing sectors
      // (This will normally ON DELETE CASCADE questions and diagnostic_scripts)
      await Promise.all([
        supabase.from('sectors').delete().eq('survey_id', params.id)
      ])

      // 3. Re-Iterate Sectors
      for (let sIdx = 0; sIdx < sectors.length; sIdx++) {
        const s = sectors[sIdx]
        
        // Insert Sector
        const { data: sectorRecord, error: sectorError } = await supabase
          .from('sectors')
          .insert({
            survey_id: params.id,
            title: s.title,
            base_score: s.base_score,
            multiplier_20s: s.multiplier_20s,
            multiplier_30s: s.multiplier_30s,
            multiplier_40s: s.multiplier_40s,
            order: sIdx,
            is_common: s.is_common
          }).select().single()

        if (sectorError || !sectorRecord) throw sectorError

        // Insert Questions
        if (s.questions.length > 0) {
          const idMap: Record<string, string> = {}
          for (let qIdx = 0; qIdx < s.questions.length; qIdx++) {
            const q = s.questions[qIdx]
            const qData = {
              survey_id: params.id,
              sector_id: sectorRecord.id,
              type: q.type,
              content: q.content,
              options: q.type === 'o_x' ? ['O', 'X'] : q.options.filter(o => o.trim() !== ''),
              options_extra_advices: q.options_extra_advices,
              o_score: q.o_score || 0,
              order: qIdx,
              is_required: q.is_required,
              parent_id: q.parent_id ? idMap[q.parent_id] : null,
              trigger_value: q.trigger_value || null
            }
            const { data: savedQ, error: qError } = await supabase.from('questions').insert(qData).select().single()
            if (qError || !savedQ) throw qError
            idMap[q.id] = savedQ.id
          }
        }

        // Insert Scripts
        if (s.scripts.length > 0) {
          const scsToInsert = s.scripts.map((sc) => ({
            survey_id: params.id,
            sector_id: sectorRecord.id,
            min_score: sc.min_score,
            max_score: sc.max_score,
            variable_name: sc.variable_name?.trim() || null,
            content: sc.content || '복합 스크립트'
          }))
          const { error: scError } = await supabase.from('diagnostic_scripts').insert(scsToInsert)
          if (scError) throw scError
        }
      }

      router.push(`/admin/surveys/${params.id}?updated=true`)
    } catch (e) {
      console.error(e)
      alert('데이터 수정 저장 중 오류가 발생했습니다.')
      setSaving(false)
    }
  }

  if (loading) return (
    <AdminGuard requireSuperAdmin={true}>
      <div className="min-h-screen flex items-center justify-center bg-beige-50">
        <div className="animate-pulse text-primary-500">에디터 데이터를 불러오는 중입니다...</div>
      </div>
    </AdminGuard>
  )

  if (errorHeader) return (
    <AdminGuard requireSuperAdmin={true}>
      <div className="min-h-screen flex items-center justify-center bg-beige-50 p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-red-200">
          <h1 className="text-xl font-medium text-red-600 mb-4">수정 불가</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">{errorHeader}</p>
          <Link href={`/admin/surveys/${params.id}`} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition">
            뒤로 가기
          </Link>
        </div>
      </div>
    </AdminGuard>
  )


  return (
    <AdminGuard requireSuperAdmin={true}>
      <div className="max-w-4xl mx-auto p-4 lg:p-10 pb-32">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/admin/surveys/${params.id}`} className="text-gray-500 hover:text-primary-700 font-medium flex items-center gap-2 transition-colors border border-transparent hover:border-beige-200 px-3 py-1.5 rounded-lg">
            <ArrowLeft className="w-5 h-5"/> 수정 취소
          </Link>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition shadow flex items-center gap-2 font-medium disabled:opacity-70"
          >
            {saving ? '수정 사항 반영 중...' : <><Save className="w-5 h-5"/> 수정 내용 저장</>}
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-orange-200 p-8 mb-8 sticky top-4 z-10 overflow-hidden">
          <div className="absolute top-0 right-0 bg-orange-50 text-orange-600 px-3 py-1 text-xs font-bold rounded-bl-xl border-l border-b border-orange-200">설문 내용 수정 모드</div>
          <input
            type="text"
            placeholder="설문지 전체 제목 (예: VIP 맞춤형 피부 정밀 진단표)"
            className="w-full text-3xl font-light text-primary-800 placeholder:text-gray-300 border-none outline-none bg-transparent pt-2"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-blue-200 p-8 mb-8">
          <h3 className="text-xl font-medium text-blue-800 mb-6 flex items-center gap-2"><Target className="w-5 h-5"/> 전역 마스터 템플릿 설정 (Target별)</h3>
          <p className="text-sm text-gray-500 mb-6">환자의 최종 결과를 조립할 때 뼈대가 되는 마스터 템플릿입니다. 이름 부분은 <code>{`{{name}}`}</code>, 섹터 교체 부분은 <code>{`{{sector_advice}}`}</code>, 추가 문구는 <code>{`{{extra_advice}}`}</code>로 치환됩니다.</p>
          <TargetScriptEditor 
            theme="blue"
            placeholder={`안녕하세요 {{name}}님,\n\n{{sector_advice}}\n\n추가의견: {{extra_advice}}\n\n감사합니다.`}
            value={masterTemplates}
            onChange={setMasterTemplates}
          />
        </div>

        {/* v4.8 Combination Logic Editor */}
        <div className="bg-white rounded-3xl border-2 border-primary-200 p-8 shadow-sm">
          <h3 className="text-xl font-medium text-primary-800 mb-6 flex items-center gap-2"><LayoutGrid className="w-5 h-5"/> 전역 복합 로직 설정 (Alchemy Combinations)</h3>
          <p className="text-sm text-gray-500 mb-6">특정 고유 변수명들을 가진 스크립트들이 동시에 만족되었을 때 출력될 특별한 문구를 정의합니다.</p>
          
          <div className="space-y-4">
            {combinations.map((comb, cIdx) => (
              <div key={comb.id} className="bg-beige-50 rounded-2xl p-5 border border-beige-200 relative group">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="md:w-1/3">
                    <label className="text-xs font-bold text-primary-600 block mb-1">매칭될 변수명 세트 (콤마로 구분)</label>
                    <input 
                      type="text"
                      placeholder="예: skin_dry, low_moisture"
                      className="w-full bg-white border border-beige-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-300 font-bold"
                      value={comb.variable_names}
                      onChange={(e) => {
                        const newC = [...combinations];
                        newC[cIdx].variable_names = e.target.value;
                        setCombinations(newC);
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-primary-600 block mb-1">출력될 복합 진단 소견</label>
                    <textarea 
                      rows={2}
                      className="w-full bg-white border border-beige-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-300"
                      value={comb.combined_content}
                      onChange={(e) => {
                        const newC = [...combinations];
                        newC[cIdx].combined_content = e.target.value;
                        setCombinations(newC);
                      }}
                    />
                  </div>
                </div>
                <button 
                  onClick={() => setCombinations(combinations.filter((_, i) => i !== cIdx))}
                  className="absolute -top-2 -right-2 bg-white text-red-400 hover:text-red-500 p-1.5 rounded-full border border-red-100 shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            ))}
            <button 
              onClick={() => setCombinations([...combinations, { id: Date.now().toString(), variable_names: '', combined_content: '' }])}
              className="w-full py-3 border-2 border-dashed border-beige-200 rounded-2xl text-primary-400 hover:text-primary-600 hover:border-primary-300 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5"/> 새로운 복합 로직(연금술) 추가
            </button>
          </div>
        </div>

        <div className="space-y-12">
          {sectors.map((sector, sIndex) => (
            <div key={sector.id} className="bg-beige-50/50 rounded-3xl border-2 border-primary-200 shadow-sm overflow-hidden">
              <div className="bg-primary-600 p-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center text-white">
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  <input
                    type="text"
                    placeholder="섹터 분류 제목 (예: 수분 및 보습 상태)"
                    className="bg-primary-700 border border-primary-500 rounded-lg px-4 py-2 text-xl font-medium outline-none focus:ring-2 focus:ring-white/50 w-full placeholder:text-primary-300"
                    value={sector.title}
                    onChange={e => updateSector(sIndex, { title: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-4 border-t border-primary-500 pt-4 md:border-t-0 md:pt-0 w-full md:w-auto mt-2 md:mt-0">
                  <label className="flex items-center gap-2 cursor-pointer bg-white/10 px-3 py-1.5 border border-primary-500 rounded-lg hover:bg-white/20 transition-colors w-full md:w-auto justify-center">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" checked={sector.is_common} onChange={e=>updateSector(sIndex, {is_common: e.target.checked})} />
                    <span className="text-sm font-medium whitespace-nowrap">단순 가점형 공통 섹터로 지정</span>
                  </label>
                  <button onClick={() => removeSector(sIndex)} className="p-2 hover:bg-red-500 rounded-lg transition-colors bg-black/10 shrink-0">
                    <Trash2 className="w-5 h-5"/>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Sector Config */}
                <div className="bg-white rounded-xl p-5 border border-beige-200 shadow-sm flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2 text-primary-700 font-medium w-full mb-2 border-b pb-2"><Settings2 className="w-4 h-4"/> 섹터별 기본 점수 및 연령대 가중치 설정</div>
                  <label className="flex flex-col text-sm text-gray-600">섹터 기본 시작 점수
                    <input type="number" value={sector.base_score} onChange={e=>updateSector(sIndex, {base_score: Number(e.target.value)})} className="mt-1 border border-gray-200 rounded px-3 py-1.5 w-24"/>
                  </label>
                  <label className="flex flex-col text-sm text-gray-600">20대 이하 가중치(곱)
                    <input type="number" step="0.1" value={sector.multiplier_20s} onChange={e=>updateSector(sIndex, {multiplier_20s: Number(e.target.value)})} className="mt-1 border border-gray-200 rounded px-3 py-1.5 w-24"/>
                  </label>
                  <label className="flex flex-col text-sm text-gray-600">30대 관리군 가중치
                    <input type="number" step="0.1" value={sector.multiplier_30s} onChange={e=>updateSector(sIndex, {multiplier_30s: Number(e.target.value)})} className="mt-1 border border-gray-200 rounded px-3 py-1.5 w-24"/>
                  </label>
                  <label className="flex flex-col text-sm text-gray-600">40대 이상 가중치
                    <input type="number" step="0.1" value={sector.multiplier_40s} onChange={e=>updateSector(sIndex, {multiplier_40s: Number(e.target.value)})} className="mt-1 border border-gray-200 rounded px-3 py-1.5 w-24"/>
                  </label>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 flex items-center gap-2"><Target className="w-4 h-4 text-primary-500"/> 설문 문항 재구성 (추가/수정/삭제)</h4>
                  {sector.questions.map((q, qIndex) => (
                    <div key={q.id} className={`bg-white rounded-xl shadow-sm p-5 flex gap-4 relative group transition-all ${q.parent_id ? 'border-primary-400 ml-8 md:ml-12 border-l-4 border-y border-r' : 'border border-beige-200'}`}>
                      {q.parent_id && (
                        <div className="absolute -left-10 md:-left-12 top-6 flex items-center gap-2 text-primary-500 font-bold whitespace-nowrap">
                          <span className="bg-primary-50 px-2 py-1 rounded text-xs border border-primary-200">'{q.trigger_value}' 선택 시</span>
                          <div className="w-4 h-px bg-primary-300"/>
                        </div>
                      )}
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                          <input
                            type="text"
                            placeholder="이곳에 고객에게 물어볼 질문 내용을 입력하세요..."
                            className="flex-1 text-base font-medium bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary-300 transition w-full"
                            value={q.content}
                            onChange={e => updateQuestion(sIndex, qIndex, { content: e.target.value })}
                          />
                          <select
                            className="w-full md:w-56 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-300 text-sm font-medium shrink-0"
                            value={q.type}
                            onChange={(e) => {
                              const newType = e.target.value as QuestionType
                              let newOpts = q.options
                              if (newType === 'multiple_choice' && q.type !== 'multiple_choice') {
                                newOpts = q.options.map(opt => opt.includes('||') ? opt : `${opt}||0`)
                                if (newOpts.length === 0) newOpts = ['옵션 1||0']
                              } else if (newType !== 'multiple_choice' && q.type === 'multiple_choice') {
                                newOpts = q.options.map(opt => opt.split('||')[0])
                              }
                              updateQuestion(sIndex, qIndex, { type: newType, options: newOpts })
                            }}
                          >
                            <option value="text">주관식 (단답형)</option>
                            <option value="radio">단일 선택 (일반 객관식)</option>
                            <option value="multiple_choice">다항 객관식 (항목별 배점형)</option>
                            <option value="checkbox">객관식 (다중 중복 선택)</option>
                            <option value="o_x">O / X 배점 측정형</option>
                          </select>
                        </div>

                        {q.type === 'o_x' && (
                          <div className="bg-primary-50 p-3 rounded-lg flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                              <span className="font-medium text-primary-700 text-sm">'O' 선택 시 획득 배점:</span>
                              <div className="flex items-center gap-3">
                                <input 
                                  type="number" 
                                  className="border border-primary-200 rounded px-3 py-1 w-24 outline-none focus:ring-2 focus:ring-primary-300 text-primary-900 font-bold"
                                  value={q.o_score}
                                  onChange={e => updateQuestion(sIndex, qIndex, { o_score: Number(e.target.value) })}
                                />
                                <span className="text-xs text-gray-500">('X' 선택 시에는 0점)</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-primary-100">
                              <span className="text-xs font-bold text-gray-600 text-left">선택 시 누적될 추가 소견 (<code>{`{{extra_advice}}`}</code> 영역에 삽입)</span>
                              <input type="text" placeholder="'O' 선택 시 추가 문구" className="text-sm px-3 py-2 border border-gray-200 bg-gray-50 rounded" value={q.options_extra_advices['O'] || ''} onChange={e => updateQuestion(sIndex, qIndex, {options_extra_advices: {...q.options_extra_advices, O: e.target.value}})} />
                              <input type="text" placeholder="'X' 선택 시 추가 문구" className="text-sm px-3 py-2 border border-gray-200 bg-gray-50 rounded" value={q.options_extra_advices['X'] || ''} onChange={e => updateQuestion(sIndex, qIndex, {options_extra_advices: {...q.options_extra_advices, X: e.target.value}})} />
                            </div>
                            {!q.parent_id && (
                              <button onClick={() => addSubQuestion(sIndex, qIndex, 'O')} className="text-primary-600 text-xs font-bold hover:underline px-2 py-1 bg-white rounded border border-primary-200 shadow-sm transition hover:bg-primary-600 hover:text-white w-fit">+ 'O' 선택 시 구체적으로 물어볼 하위 질문 추가하기</button>
                            )}
                          </div>
                        )}

                        {q.type === 'multiple_choice' && (
                          <div className="space-y-4 pl-2 border-l-2 border-beige-300 ml-1">
                            {q.options.map((opt, oIndex) => {
                              const [label, scoreStr] = opt.includes('||') ? opt.split('||') : [opt, '0']
                              return (
                                <div key={oIndex} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <div className="hidden sm:block w-3 h-3 border border-gray-400 flex-shrink-0 rounded-full"/>
                                    <input
                                      type="text"
                                      placeholder={`선택지 텍스트`}
                                      className="flex-[2] bg-white border border-gray-300 px-3 py-1.5 rounded-lg outline-none focus:border-primary-500 text-sm"
                                      value={label}
                                      onChange={e => {
                                        const newOpts = [...q.options]
                                        newOpts[oIndex] = `${e.target.value}||${scoreStr}`
                                        updateQuestion(sIndex, qIndex, { options: newOpts })
                                      }}
                                    />
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        placeholder={`배점`}
                                        className="w-20 bg-white border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-primary-500 text-sm transition text-center"
                                        value={Number(scoreStr)}
                                        onChange={e => {
                                          const newOpts = [...q.options]
                                          newOpts[oIndex] = `${label}||${e.target.value}`
                                          updateQuestion(sIndex, qIndex, { options: newOpts })
                                        }}
                                      />
                                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">점</span>
                                      <button onClick={() => {
                                        const newOpts = q.options.filter((_, i) => i !== oIndex)
                                        updateQuestion(sIndex, qIndex, { options: newOpts })
                                      }} className="text-gray-400 hover:text-red-500 ml-2 bg-white p-1 rounded shadow-sm border border-gray-200"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                  </div>
                                  <input type="text" placeholder={`선택 시 누적될 추가 소견 ({{extra_advice}})`} className="text-sm px-3 py-1.5 border border-primary-200 bg-white rounded-lg w-full outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 transition" value={q.options_extra_advices[label] || ''} onChange={e => updateQuestion(sIndex, qIndex, {options_extra_advices: {...q.options_extra_advices, [label]: e.target.value}})} />
                                </div>
                              )
                            })}
                            <button onClick={() => updateQuestion(sIndex, qIndex, { options: [...q.options, `새 선택지 ${q.options.length + 1}||0`] })} className="text-primary-600 text-xs font-bold hover:underline mt-2 inline-block px-3 py-2 bg-primary-50 rounded-lg border border-primary-100 transition hover:bg-primary-100">+ 세부 항목 및 배점 추가</button>
                          </div>
                        )}

                        {(q.type === 'radio' || q.type === 'checkbox') && (
                          <div className="space-y-4 pl-2 border-l-2 border-beige-200 ml-1">
                            {q.options.map((opt, oIndex) => (
                              <div key={oIndex} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 border border-gray-300 flex-shrink-0 ${q.type==='radio'?'rounded-full':'rounded-sm'}`}/>
                                  <input
                                    type="text"
                                    placeholder={`선택지 옵션 ${oIndex + 1}`}
                                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-primary-500 text-sm"
                                    value={opt}
                                    onChange={e => {
                                      const newOpts = [...q.options]
                                      newOpts[oIndex] = e.target.value
                                      updateQuestion(sIndex, qIndex, { options: newOpts })
                                    }}
                                  />
                                  <button onClick={() => {
                                      const newOpts = q.options.filter((_, i) => i !== oIndex)
                                      updateQuestion(sIndex, qIndex, { options: newOpts })
                                    }} className="text-gray-400 hover:text-red-500 bg-white p-1 rounded shadow-sm border border-gray-200"><Trash2 className="w-4 h-4"/></button>
                                </div>
                                <input type="text" placeholder={`선택 시 누적될 추가 소견 ({{extra_advice}})`} className="text-sm px-3 py-1.5 border border-primary-200 bg-white rounded-lg w-full outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 transition" value={q.options_extra_advices[opt] || ''} onChange={e => updateQuestion(sIndex, qIndex, {options_extra_advices: {...q.options_extra_advices, [opt]: e.target.value}})} />
                              </div>
                            ))}
                            <button onClick={() => updateQuestion(sIndex, qIndex, { options: [...q.options, `옵션 ${q.options.length + 1}`] })} className="text-primary-600 text-xs font-bold hover:underline mt-2 inline-block px-3 py-2 bg-primary-50 rounded-lg border border-primary-100 transition hover:bg-primary-100">+ 선택지 추가하기</button>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-50">
                          <button onClick={() => removeQuestion(sIndex, qIndex)} className="text-gray-400 hover:text-red-500">문항 삭제하기</button>
                          <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-600">
                            <input type="checkbox" className="w-4 h-4 border-gray-300 text-primary-600 focus:ring-primary-500 rounded" checked={q.is_required} onChange={e=>updateQuestion(sIndex, qIndex, {is_required: e.target.checked})}/> 
                            클라이언트 필수 응답 문항으로 설정
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 text-sm flex-wrap">
                    <button onClick={() => addQuestion(sIndex, 'multiple_choice')} className="px-3 py-1.5 bg-primary-600 border border-primary-700 text-white rounded-lg hover:bg-primary-700 transition shadow-sm font-medium">+ 다항 객관식 추가</button>
                    <button onClick={() => addQuestion(sIndex, 'o_x')} className="px-3 py-1.5 bg-white border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition shadow-sm font-medium">+ O/X 점수 수집형 문항 추가</button>
                    <button onClick={() => addQuestion(sIndex, 'text')} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition shadow-sm">+ 일반 문항(입력/선택) 추가</button>
                  </div>
                </div>

                {/* Scripts */}
                {!sector.is_common && (
                  <div className="space-y-4 pt-4 border-t border-beige-200">
                    <h4 className="font-medium text-gray-800 flex items-center gap-2"><FileText className="w-4 h-4 text-primary-500"/> 해당 섹터 통합 점수 구간별 자동 매칭 타입 작성</h4>
                    {sector.scripts.map((sc, scIndex) => (
                      <div key={sc.id} className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 relative">
                        <div className="flex flex-col xl:flex-row gap-4">
                          <div className="flex flex-col items-start gap-1 xl:w-64 shrink-0 mt-1">
                            <span className="text-xs font-bold text-blue-600 px-1">적용 점수대 (해당 섹터 통합)</span>
                            <div className="flex items-center gap-2 w-full bg-blue-50 p-2 rounded-lg border border-blue-100 mt-1">
                              <input type="number" placeholder="최소 점수" value={sc.min_score} onChange={e=>updateScript(sIndex, scIndex, {min_score: Number(e.target.value)})} className="w-16 text-center px-1 py-1 rounded bg-white border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400"/>
                              <span className="text-blue-400 font-bold">~</span>
                              <input type="number" placeholder="최대 점수" value={sc.max_score} onChange={e=>updateScript(sIndex, scIndex, {max_score: Number(e.target.value)})} className="w-16 text-center px-1 py-1 rounded bg-white border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400"/>
                            </div>
                            <div className="mt-4 w-full">
                              <span className="text-xs font-bold text-primary-600 px-1">고유 변수명 (v4.8)</span>
                              <input 
                                type="text" 
                                placeholder="예: skin_dry" 
                                value={sc.variable_name || ''} 
                                onChange={e=>updateScript(sIndex, scIndex, {variable_name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '')})} 
                                className="w-full mt-1 bg-beige-50 border border-beige-200 rounded-lg px-3 py-1.5 text-sm font-bold text-primary-700 outline-none focus:ring-2 focus:ring-primary-300"
                              />
                            </div>
                          </div>
                          <div className="flex-1 space-y-1 w-full">
                            <span className="text-xs font-bold text-gray-600 px-1 mb-2 block">치환용 단일 진단 소견 (<code>{`{{sector_advice}}`}</code> 영역에 삽입됨)</span>
                            <textarea 
                              rows={3}
                              placeholder="위 구간 점수를 달성했을 때 전역 마스터 템플릿의 {{sector_advice}}에 삽입될 진단 소견 텍스트를 입력하세요."
                              className="w-full text-sm font-medium bg-white border border-blue-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-300 resize-y"
                              value={sc.content}
                              onChange={e => updateScript(sIndex, scIndex, {content: e.target.value})}
                            />
                          </div>
                        </div>
                        <button onClick={()=>removeScript(sIndex, scIndex)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 bg-white shadow-sm rounded-full p-1 border border-gray-100"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    ))}
                    <button onClick={() => addScript(sIndex)} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 font-medium rounded-lg text-sm hover:bg-blue-100 transition shadow-sm">+ 새로운 조건의 점수 구간별 자동 매칭 스크립트 작성</button>
                  </div>
                )}

              </div>
            </div>
          ))}
          
          <button 
            onClick={addSector}
            className="w-full py-6 border-2 border-dashed border-primary-300 text-primary-600 rounded-2xl hover:bg-primary-50 hover:border-primary-400 transition-colors font-medium text-lg flex justify-center items-center gap-2"
          >
            <Plus className="w-6 h-6"/> 새로운 섹터 그룹 추가 생성
          </button>

          {/* Removed Spaces Config block */}
        </div>
      </div>
    </AdminGuard>
  )
}
