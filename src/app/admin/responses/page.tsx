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

  // Set default date range (Last 1 month)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [sortBy, setSortBy] = useState('latest')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Bulk Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Auto-search logic
  useEffect(() => {
    const timer = setTimeout(() => setSearchName(searchInput), 600)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchName, startDate, endDate, sortBy])

  const handleBulkDelete = async () => {
    // ... existing logic
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

  const handleDeleteSingle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this response?\nThis action cannot be undone.")) return;



    try {
      const { error } = await supabase
        .from('responses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Response deleted successfully.");
      setResponses(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      console.error(err);
      toast.error("Error deleting response: " + err.message);
    }
  }

  useEffect(() => {
    fetchResponses()
  }, [searchName, startDate, endDate, sortBy])

  const fetchResponses = async () => {
    try {
      setLoading(true)
      setFetchError(null)

      let query = supabase
        .from('responses')
        .select('*')

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

  const paginatedResponses = responses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(responses.length / itemsPerPage)

  return (
    <AdminGuard requireSuperAdmin={true}>
      <main className="min-h-screen w-full bg-[#7A5B44] font-sans">
        <div className="max-w-7xl mx-auto p-4 lg:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin/main" className="text-brand-text/40 hover:text-brand-text font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all border border-transparent hover:border-white/10 px-4 py-2 rounded-xl hover:bg-white/5">
                <ArrowLeft className="w-4 h-4" /> DASHBOARD
              </Link>
              <h1 className="text-3xl font-black text-brand-text ml-2 border-l-2 border-white/10 pl-6 uppercase tracking-tight">INTEGRATED CUSTOMER DATA</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-900/30 border border-red-500/20 text-red-300 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm font-black text-[10px] uppercase tracking-widest"
              >
                <Trash2 className="w-4 h-4" />
                RESET SYSTEM DATA
              </button>

              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 bg-black/20 text-white rounded-xl hover:bg-black transition-all shadow-lg font-black text-[10px] uppercase tracking-widest"
              >
                <BarChart3 className="w-4 h-4 text-primary-300" />
                STATISTICS
              </Link>

              <button
                onClick={() => alert("Excel Export is under development.")}
                className="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-white/10 text-brand-text/50 hover:text-brand-text rounded-xl hover:bg-white/5 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest"
              >
                <Download className="w-4 h-4" />
                DOWNLOAD EXCEL
              </button>
            </div>
          </div>

          {/* Bulk Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-transparent rounded-3xl shadow-2xl border border-red-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-red-900/30 p-6 flex items-center gap-4 border-b border-red-100">
                  <div className="w-12 h-12 bg-transparent rounded-full flex items-center justify-center shadow-sm">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-red-300 uppercase tracking-tight">PERMANENT DATA RESET</h3>
                    <p className="text-red-300/50 text-[10px] font-black uppercase tracking-widest">This action cannot be undone.</p>
                  </div>
                </div>

                <div className="p-8">
                  <p className="text-brand-text/60 mb-8 leading-relaxed text-sm font-medium">
                    All patient diagnostic responses and records will be <span className="text-red-400 font-black">permanently removed</span> from the system. To proceed, please type <span className="font-black text-brand-text bg-white/10 px-2 rounded">RESET</span> below.
                  </p>

                  <input
                    type="text"
                    placeholder="Type 'RESET' here"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    className="w-full px-4 py-4 bg-black/20 border-2 border-white/10 rounded-2xl outline-none focus:border-red-500 transition-all text-center font-black text-xl mb-8 uppercase tracking-widest"
                    autoFocus
                  />

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false)
                        setDeleteConfirmInput('')
                      }}
                      className="flex-1 py-4 bg-white/5 text-brand-text/40 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-brand-text transition-all"
                    >
                      CANCEL
                    </button>
                    <button
                      disabled={deleteConfirmInput !== 'RESET' || isDeleting}
                      onClick={handleBulkDelete}
                      className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${deleteConfirmInput === 'RESET' && !isDeleting
                        ? 'bg-red-600 text-white shadow-2xl shadow-red-900/40 hover:bg-red-500'
                        : 'bg-white/5 text-brand-text/10 cursor-not-allowed'
                        }`}
                    >
                      {isDeleting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>EXECUTE RESET</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-transparent rounded-3xl shadow-sm border border-beige-200 overflow-hidden mb-6 p-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-[2] w-full relative">
                <label className="block text-[10px] font-black text-brand-text/30 mb-2 uppercase tracking-[0.2em]">Patient Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20" />
                  <input
                    type="text"
                    placeholder="Enter patient name..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-brand-text/20 transition-all text-sm font-medium"
                  />
                </div>
              </div>
              <div className="w-full md:w-auto">
                <label className="block text-[10px] font-black text-brand-text/30 mb-2 uppercase tracking-[0.2em]">Date Range</label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-4 py-3.5 bg-black/20 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-brand-text/20 transition-all text-xs font-bold text-brand-text/70"
                  />
                  <span className="text-brand-text/20 font-black">~</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-4 py-3.5 bg-black/20 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-brand-text/20 transition-all text-xs font-bold text-brand-text/70"
                  />
                </div>
              </div>
              <div className="w-full md:w-auto">
                <label className="block text-[10px] font-black text-brand-text/30 mb-2 uppercase tracking-[0.2em]">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-6 py-3.5 bg-black/20 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-brand-text/20 transition-all text-xs font-bold text-brand-text/70 appearance-none cursor-pointer min-w-[140px] uppercase tracking-widest"
                >
                  <option value="latest">Latest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
              <div className="w-full md:w-auto">
                <button
                  onClick={() => fetchResponses()}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-brand-text text-brand-dark rounded-xl hover:scale-105 transition-all shadow-lg font-bold text-sm"
                >
                  <Search className="w-4 h-4" />
                  SEARCH
                </button>
              </div>
            </div>
          </div>

          {fetchError && (
            <div className="mb-6 p-6 bg-red-900/30 border border-red-200 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-900 font-bold mb-1">Data Load Error</h3>
                <p className="text-red-700 text-sm">{fetchError}</p>
                <button
                  onClick={() => fetchResponses()}
                  className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <div className="bg-transparent rounded-3xl shadow-sm border border-beige-200 overflow-hidden">
            <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-brand-text uppercase tracking-tight">TOTAL SURVEY DATA <span className="text-brand-text bg-white/10 px-3 py-1 rounded-lg text-sm ml-4 font-black">{responses.length}</span></h2>
                <p className="text-[11px] font-black text-brand-text/30 mt-2 uppercase tracking-[0.2em]">Cumulative record of all customer visits and diagnostic results.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-brand-text/20 uppercase tracking-[0.3em]">Page {currentPage} of {totalPages || 1}</span>
              </div>
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-transparent border-b border-white/5">
                    <th className="p-6 pl-10 font-black text-brand-text/30 text-[10px] uppercase tracking-[0.2em]">Submitted At</th>
                    <th className="p-6 font-black text-brand-text/30 text-[10px] uppercase tracking-[0.2em]">Manager</th>
                    <th className="p-6 font-black text-brand-text/30 text-[10px] uppercase tracking-[0.2em]">Name</th>
                    <th className="p-6 font-black text-brand-text/30 text-[10px] uppercase tracking-[0.2em]">Phone</th>
                    <th className="p-6 font-black text-brand-text/30 text-[10px] uppercase tracking-[0.2em]">Age</th>
                    <th className="p-6 pr-10 font-black text-brand-text/30 text-[10px] uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="p-12 text-center text-primary-500 animate-pulse font-medium">Analyzing data...</td></tr>
                  ) : paginatedResponses.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-brand-text/50">아직 등록된 고객 데이터가 없습니다.</td></tr>
                  ) : (
                    paginatedResponses.map(res => (
                      <tr key={res.id} className="border-b border-beige-100 hover:bg-transparent/80 transition-colors text-sm">
                        <td className="p-5 text-brand-text/70 whitespace-nowrap">{new Date(res.submitted_at).toLocaleString()}</td>
                        <td className="p-5 font-bold text-brand-text">
                          {res.profiles?.nickname || '-'}
                        </td>
                        <td className="p-5 font-medium text-brand-text">{res.patient_name || '-'}</td>
                        <td className="p-5 text-brand-text/80 whitespace-nowrap">{res.patient_phone ? formatPhoneNumber(res.patient_phone) : '-'}</td>
                        <td className="p-5 text-brand-text/80">{res.patient_age_group || '-'}</td>
                        <td className="p-6 pr-10 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/responses/${res.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-text hover:bg-brand-text hover:text-brand-dark font-black px-6 py-2.5 bg-white/5 rounded-xl transition-all text-[10px] uppercase tracking-widest border border-white/5 inline-block"
                            >
                              VIEW
                            </Link>
                            <button
                              onClick={() => handleDeleteSingle(res.id)}
                              className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all"
                              title="Delete Response"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {responses.length > 0 && (
              <div className="p-6 border-t border-beige-100 bg-transparent/10 flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-brand-text/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-sm"
                >
                  PREV
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${currentPage === i + 1
                        ? 'bg-brand-text text-brand-dark shadow-lg scale-110'
                        : 'bg-white/5 text-brand-text/50 hover:bg-white/10'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-brand-text/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-sm"
                >
                  NEXT
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </AdminGuard>
  )
}
