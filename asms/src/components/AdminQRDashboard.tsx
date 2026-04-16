'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import { User } from '@supabase/supabase-js'
import { formatPhoneNumber } from '@/lib/format'
import { Search, ArrowLeft, ClipboardList } from 'lucide-react'

export default function AdminQRDashboard({ user }: { user: User }) {
  const [activeSurvey, setActiveSurvey] = useState<any>(null)
  const [responses, setResponses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResponse, setSelectedResponse] = useState<any>(null)

  const [viewMode, setViewMode] = useState<'QR_ONLY' | 'LIST_VIEW'>('QR_ONLY')
  const [searchInput, setSearchInput] = useState('')
  const [searchName, setSearchName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('latest')

  useEffect(() => {
    const timer = setTimeout(() => setSearchName(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const { data: surveyData } = await supabase
        .from('surveys')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (surveyData) setActiveSurvey(surveyData)

      let query = supabase
        .from('responses')
        .select('*')
        .eq('admin_id', user.id)

      if (searchName) query = query.ilike('patient_name', `%${searchName}%`)
      if (startDate) query = query.gte('submitted_at', `${startDate}T00:00:00.000Z`)
      if (endDate) query = query.lte('submitted_at', `${endDate}T23:59:59.999Z`)

      if (sortBy === 'latest') query = query.order('submitted_at', { ascending: false })
      else if (sortBy === 'oldest') query = query.order('submitted_at', { ascending: true })
      else if (sortBy === 'name') query = query.order('patient_name', { ascending: true })
      else query = query.order('submitted_at', { ascending: false })
        
      const { data: responsesData } = await query
      if (responsesData) setResponses(responsesData)

      setLoading(false)
    }
    fetchData()
  }, [user.id, searchName, startDate, endDate, sortBy])

  if (loading && responses.length === 0 && !activeSurvey) return <div className="p-12 text-center text-primary-500 animate-pulse">대시보드 불러오는 중...</div>

  const surveyUrl = activeSurvey 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/survey/${activeSurvey.id}?admin_id=${user.id}`
    : ''

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-beige-200 shadow-sm">
        <h1 className="text-2xl font-medium text-primary-700 tracking-tight"><span className="font-bold">SomeGood</span> 고객 관리</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200 px-4 py-2 rounded-lg transition-all">로그아웃</button>
      </div>

      {viewMode === 'QR_ONLY' ? (
        <div className="flex flex-col items-center justify-center mt-12 space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="bg-white p-12 py-16 rounded-[3rem] border border-primary-100 shadow-lg text-center max-w-lg w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
            {activeSurvey ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-6 rounded-[2rem] border border-beige-200 shadow-sm mb-8 inline-block">
                  <QRCodeSVG value={surveyUrl} size={280} level="M" fgColor="#5A4A3E" />
                </div>
                <h2 className="text-3xl font-bold text-primary-800 mb-4 tracking-tight">문진표 시작하기</h2>
                <p className="text-gray-500 leading-relaxed text-[17px] px-4">스마트폰 카메라로 위 QR 코드를 스캔해<br/>고객 문진표를 바로 시작할 수 있습니다.</p>
              </div>
            ) : (
              <div className="py-24 text-gray-400 font-medium">진행 가능한 문진표가 없습니다.<br/><span className="text-sm mt-3 inline-block font-normal">최고관리자에게 문의하세요.</span></div>
            )}
          </div>
          
          <button 
            onClick={() => setViewMode('LIST_VIEW')}
            className="flex items-center gap-3 px-10 py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            <ClipboardList className="w-6 h-6" />
            📋 전체 고객 리스트 조회하기
          </button>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => setViewMode('QR_ONLY')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-beige-200 text-gray-600 rounded-xl hover:bg-beige-50 transition-colors shadow-sm font-medium hover:-translate-x-1"
            >
              <ArrowLeft className="w-5 h-5"/> QR 스캔 화면으로 돌아가기
            </button>
            <h2 className="text-2xl font-bold text-gray-800">📋 고객 진단 목록</h2>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-beige-200 overflow-hidden mb-8 p-6 lg:px-10 lg:py-8">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 w-full relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">고객 이름 검색</label>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
                  <input 
                    type="text" 
                    placeholder="환자 이름을 입력하세요..." 
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-beige-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-base"
                  />
                </div>
              </div>
              <div className="w-full md:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">접수 기간 필터</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-4 py-3 bg-gray-50 border border-beige-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm font-medium text-gray-700"
                  />
                  <span className="text-gray-400 font-bold">~</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-4 py-3 bg-gray-50 border border-beige-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm font-medium text-gray-700"
                  />
                </div>
              </div>
              <div className="w-full md:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">정렬 기준</label>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-5 py-3 bg-gray-50 border border-beige-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm font-medium text-gray-700 appearance-none cursor-pointer min-w-[140px]"
                >
                  <option value="latest">최근 방문순</option>
                  <option value="oldest">과거 방문순</option>
                  <option value="name">가나다순</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-beige-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-beige-50/70 border-b border-beige-200 text-sm">
                  <th className="p-5 pl-8 font-medium text-gray-500 w-1/4">제출일시</th>
                  <th className="p-5 font-medium text-gray-500 w-1/4">고객 성함</th>
                  <th className="p-5 font-medium text-gray-500 w-1/4">연락처</th>
                  <th className="p-5 pr-8 font-medium text-gray-500 text-right w-1/4">상세 정보</th>
                </tr>
              </thead>
              <tbody>
                {responses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-16 text-center text-gray-400 font-medium">조건에 일치하는 고객 데이터가 없습니다.</td>
                  </tr>
                ) : (
                  responses.map(res => (
                    <tr key={res.id} className="border-b border-beige-100/60 hover:bg-primary-50/40 transition-colors">
                      <td className="p-5 pl-8 text-gray-500 text-sm">{new Date(res.submitted_at).toLocaleString()}</td>
                      <td className="p-5 font-bold text-gray-900">{res.patient_name || '-'}</td>
                      <td className="p-5 text-gray-600 font-medium tracking-wide">{res.patient_phone ? formatPhoneNumber(res.patient_phone) : '-'}</td>
                      <td className="p-5 pr-8 text-right">
                        <button 
                          onClick={() => setSelectedResponse(res)}
                          className="text-primary-700 hover:text-white font-bold px-5 py-2.5 bg-primary-100/50 hover:bg-primary-600 rounded-xl transition-all text-sm shadow-sm"
                        >
                          진단서 보기
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedResponse && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-full overflow-y-auto shadow-2xl border border-beige-100">
            <div className="p-6 border-b border-beige-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur z-10">
              <h3 className="text-xl font-medium text-gray-900">고객 맞춤형 진단 스크립트</h3>
              <button 
                onClick={() => setSelectedResponse(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-beige-50/80 rounded-2xl p-5 border border-beige-100">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">성함</p>
                  <p className="font-medium text-gray-900">{selectedResponse.patient_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">성별</p>
                  <p className="font-medium text-gray-900">{selectedResponse.patient_gender === 'M' ? '남성' : selectedResponse.patient_gender === 'F' ? '여성' : '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">연락처</p>
                  <p className="font-medium text-gray-900">{selectedResponse.patient_phone ? formatPhoneNumber(selectedResponse.patient_phone) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">연령대</p>
                  <p className="font-medium text-gray-900">{selectedResponse.patient_age_group}</p>
                </div>
                <div className="md:col-span-1">
                  <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">제출일</p>
                  <p className="font-medium text-gray-900 text-sm mt-0.5">{new Date(selectedResponse.submitted_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="w-full text-left">
                <h4 className="text-xl font-bold text-primary-900 mb-5 flex items-center gap-2">
                  <div className="w-2 h-6 bg-primary-600 rounded-full"></div>
                  ✨ 당신을 위한 맞춤 진단 결과
                </h4>
                
                <div className="space-y-6">
                  {((selectedResponse.space_results && selectedResponse.space_results.length > 0) || (selectedResponse.sector_results && Object.keys(selectedResponse.sector_results).length > 0)) ? (
                    <>
                      {selectedResponse.space_results && selectedResponse.space_results.length > 0 ? (
                        // 스페이스 결과
                        selectedResponse.space_results.map((res: any, idx: number) => (
                          <div key={`space-${idx}`} className="bg-white p-8 rounded-[2rem] border border-primary-200 shadow-sm relative overflow-hidden transition-shadow hover:shadow-md">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-400"></div>
                            <div className="absolute top-6 right-6">
                              <span className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full text-sm shadow-sm border border-purple-200">스페이스 매칭</span>
                            </div>
                            <h3 className="text-xl font-bold text-primary-900 mb-4 w-[80%] pl-3">{res.title}</h3>
                            <p className="text-gray-800 leading-relaxed font-medium whitespace-pre-wrap pl-3">{res.script}</p>
                          </div>
                        ))
                      ) : (
                        // 섹터 결과
                        Object.entries(selectedResponse.sector_results as Record<string, any>)
                          .filter(([_, result]) => result.script && result.script.trim())
                          .map(([sectorId, result]) => (
                            <div key={`sector-${sectorId}`} className="bg-white p-8 rounded-[2rem] border border-primary-200 shadow-sm relative overflow-hidden transition-shadow hover:shadow-md">
                              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-400"></div>
                              <div className="absolute top-6 right-6">
                                <span className="bg-primary-50 text-primary-700 font-bold px-3 py-1 rounded-full text-sm shadow-sm border border-primary-100">{result.score} 점</span>
                              </div>
                              <h3 className="text-xl font-bold text-primary-900 mb-4 w-[80%] pl-3">{result.title}</h3>
                              <p className="text-gray-800 leading-relaxed font-medium whitespace-pre-wrap pl-3">{result.script}</p>
                            </div>
                          ))
                      )}
                    </>
                  ) : (
                    <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      조건에 일치하는 진단 스크립트가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
