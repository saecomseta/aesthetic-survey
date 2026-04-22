'use client'

import { useEffect, useState } from 'react'
import AdminGuard from '@/components/AdminGuard'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Download, Search, Trash2, AlertTriangle, X, BarChart3 } from 'lucide-react'
import { formatPhoneNumber } from '@/lib/format'
import { toast } from 'react-hot-toast'

export default function MasterResponsesPage() {
  const [responses, setResponses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [searchName, setSearchName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('latest')

  // Bulk Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSearchName(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('responses')
        .delete()
        .not('id', 'is', null)

      if (error) throw error
      
      toast.success("전체 데이터가 초기화되었습니다.")
      setResponses([])
      setShowDeleteModal(false)
      setDeleteConfirmInput('')
    } catch (err: any) {
      console.error(err)
      toast.error("삭제 중 오류가 발생했습니다: " + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    fetchResponses()
  }, [searchName, startDate, endDate, sortBy])

  const fetchResponses = async () => {
    try {
      setLoading(true)
      setFetchError(null)
      
      // 1. Fetch Responses and Surveys (This join usually works)
      let query = supabase
        .from('responses')
        .select('*, surveys(title)')

      if (searchName) query = query.ilike('patient_name', `%${searchName}%`)
      if (startDate) query = query.gte('submitted_at', `${startDate}T00:00:00.000Z`)
      if (endDate) query = query.lte('submitted_at', `${endDate}T23:59:59.999Z`)

      if (sortBy === 'latest') query = query.order('submitted_at', { ascending: false })
      else if (sortBy === 'oldest') query = query.order('submitted_at', { ascending: true })
      else if (sortBy === 'name') query = query.order('patient_name', { ascending: true })

      const { data: resData, error: resError } = await query
      
      if (resError) throw resError

      if (!resData || resData.length === 0) {
        setResponses([])
        return
      }

      // 2. Fetch Profiles for associated admin_ids (Bypasses PGRST200 join error)
      const adminIds = Array.from(new Set(resData.map(r => r.admin_id).filter(Boolean)))
      
      let mergedData = resData
      if (adminIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', adminIds)

        if (!profileError && profileData) {
          const profileMap = Object.fromEntries(profileData.map(p => [p.id, p]))
          mergedData = resData.map(r => ({
            ...r,
            profiles: r.admin_id ? profileMap[r.admin_id] : null
          }))
        }
      }

      setResponses(mergedData || [])
    } catch (err: any) {
      console.error('Fetch error:', err)
      setFetchError(`데이터 조회 실패: ${err.message || '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminGuard requireSuperAdmin={true}>
      <div className="max-w-7xl mx-auto p-4 lg:p-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-primary-700 font-medium flex items-center gap-2 transition-colors border border-transparent hover:border-beige-200 px-3 py-1.5 rounded-lg hover:bg-white">
              <ArrowLeft className="w-5 h-5"/> 대시보드
            </Link>
            <h1 className="text-3xl font-light text-primary-700 ml-2 border-l-2 border-primary-300 pl-4"><span className="font-bold">SomeGood</span> 통합 고객 데이터</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm font-bold text-sm"
            >
              <Trash2 className="w-4 h-4"/>
              🚨 전체 데이터 초기화
            </button>

            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-black transition-all shadow-lg font-bold text-sm"
            >
              <BarChart3 className="w-4 h-4 text-primary-300" />
              통합 통계 대시보드
            </Link>

            <button 
              onClick={() => alert("엑셀 내보내기 기능은 준비 중입니다.")}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors shadow-sm font-medium text-sm"
            >
              <Download className="w-4 h-4"/>
              엑셀 다운로드
            </button>
          </div>
        </div>

        {/* Bulk Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-red-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-red-50 p-6 flex items-center gap-4 border-b border-red-100">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-900">데이터 영구 삭제</h3>
                  <p className="text-red-700 text-sm opacity-80">이 작업은 취소할 수 없습니다.</p>
                </div>
              </div>
              
              <div className="p-8">
                <p className="text-gray-600 mb-6 leading-relaxed">
                  시스템상의 <span className="font-bold text-red-600">모든 환자 응답 데이터</span>가 영구적으로 삭제됩니다. 계속하시려면 아래에 <span className="font-bold text-black bg-yellow-100 px-1">삭제</span>라고 입력하세요.
                </p>
                
                <input 
                  type="text"
                  placeholder="'삭제'를 입력하세요"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl outline-none focus:border-red-500 transition-colors text-center font-bold text-lg mb-6"
                  autoFocus
                />
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowDeleteModal(false)
                      setDeleteConfirmInput('')
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button 
                    disabled={deleteConfirmInput !== '삭제' || isDeleting}
                    onClick={handleBulkDelete}
                    className={`flex-1 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                      deleteConfirmInput === '삭제' && !isDeleting
                        ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200' 
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {isDeleting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>최종 삭제 실행</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-beige-200 overflow-hidden mb-6 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">고객 이름 검색</label>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="이름을 입력하세요..." 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                />
              </div>
            </div>
            <div className="w-full md:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">접수 기간</label>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                />
                <span className="text-gray-400">~</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                />
              </div>
            </div>
            <div className="w-full md:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">정렬 기준</label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm appearance-none cursor-pointer min-w-[120px]"
              >
                <option value="latest">최신순</option>
                <option value="oldest">과거순</option>
                <option value="name">이름순</option>
              </select>
            </div>
          </div>
        </div>

        {fetchError && (
          <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-900 font-bold mb-1">데이터 로드 오류</h3>
              <p className="text-red-700 text-sm">{fetchError}</p>
              <button 
                onClick={() => fetchResponses()}
                className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition"
              >
                다시 시도하기
              </button>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-3xl shadow-sm border border-beige-200 overflow-hidden">
          <div className="p-6 border-b border-beige-100 bg-beige-50/30">
            <h2 className="text-lg font-medium text-gray-800">모든 설문지 누적 데이터 <span className="text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md text-sm ml-2">{responses.length}</span></h2>
            <p className="text-sm text-gray-500 mt-1">시스템 상의 모든 설문지에서 수집된 방문 고객과 진단 결과 목록입니다.</p>
          </div>
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-beige-50 border-b border-beige-200">
                  <th className="p-5 font-medium text-gray-500 text-sm whitespace-nowrap">제출 일시</th>
                  <th className="p-5 font-medium text-gray-500 text-sm">참여 설문지</th>
                  <th className="p-5 font-medium text-gray-500 text-sm">담당자</th>
                  <th className="p-5 font-medium text-gray-500 text-sm">성함</th>
                  <th className="p-5 font-medium text-gray-500 text-sm">연락처</th>
                  <th className="p-5 font-medium text-gray-500 text-sm">연령대</th>
                  <th className="p-5 font-medium text-gray-500 text-sm">통합 합산 점수</th>
                  <th className="p-5 font-medium text-gray-500 text-sm text-right">상세 정보</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-12 text-center text-primary-500 animate-pulse font-medium">데이터를 분석 중입니다...</td></tr>
                ) : responses.length === 0 ? (
                  <tr><td colSpan={8} className="p-12 text-center text-gray-400">아직 등록된 고객 데이터가 없습니다.</td></tr>
                ) : (
                  responses.map(res => {
                    // Safety check for sector_results to prevent rendering crash
                    let totalScore = 0
                    if (res.sector_results && typeof res.sector_results === 'object') {
                      Object.values(res.sector_results).forEach((sr: any) => {
                        if (sr && typeof sr.score !== 'undefined') {
                          totalScore += Number(sr.score || 0)
                        }
                      })
                    }
                    
                    return (
                      <tr key={res.id} className="border-b border-beige-100 hover:bg-beige-50/80 transition-colors text-sm">
                        <td className="p-5 text-gray-500 whitespace-nowrap">{new Date(res.submitted_at).toLocaleString()}</td>
                        <td className="p-5 font-medium text-primary-700 min-w-[200px] hover:underline cursor-pointer">
                          <Link href={`/admin/surveys/${res.survey_id}`}>{res.surveys?.title || '알 수 없는 설문지'}</Link>
                        </td>
                        <td className="p-5 font-bold text-blue-600">
                          {res.profiles?.nickname || '-'}
                        </td>
                        <td className="p-5 font-medium text-gray-900">{res.patient_name || '-'}</td>
                        <td className="p-5 text-gray-600 whitespace-nowrap">{res.patient_phone ? formatPhoneNumber(res.patient_phone) : '-'}</td>
                        <td className="p-5 text-gray-600">{res.patient_age_group || '-'}</td>
                        <td className="p-5 text-base font-bold text-primary-600">
                          {totalScore > 0 ? (
                            <span className="bg-primary-50 px-3 py-1 rounded-lg border border-primary-100 shadow-sm inline-block">{totalScore.toFixed(1)}</span>
                          ) : '-'}
                        </td>
                        <td className="p-5 text-right">
                          <Link href={`/admin/responses/${res.id}`} className="text-primary-600 hover:text-white font-medium px-4 py-2 bg-primary-50 hover:bg-primary-600 rounded-lg transition-all text-sm shadow-sm inline-block">
                            보기
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
