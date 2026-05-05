'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import { User } from '@supabase/supabase-js'
import { formatPhoneNumber } from '@/lib/format'
import { Search, ArrowLeft, ClipboardList, Sparkles, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function AdminQRDashboard({ user }: { user: User }) {
  const [activeSurvey, setActiveSurvey] = useState<any>(null)
  const [responses, setResponses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [viewMode, setViewMode] = useState<'QR_ONLY' | 'LIST_VIEW'>('LIST_VIEW')
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

  useEffect(() => {
    setCurrentPage(1)
  }, [searchName, startDate, endDate, sortBy])

  useEffect(() => {
    const timer = setTimeout(() => setSearchName(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchData = async () => {
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

  useEffect(() => {
    fetchData()
  }, [user.id, searchName, startDate, endDate, sortBy])

  if (loading && responses.length === 0 && !activeSurvey) return <div className="p-12 text-center text-primary-500 animate-pulse uppercase tracking-widest font-bold">Loading Dashboard...</div>

  const surveyUrl = activeSurvey
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/survey/${activeSurvey.id}?admin_id=${user.id}`
    : ''

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
      <div className="flex justify-between items-center glass-card p-5 rounded-2xl border border-white/10 shadow-sm">
        <h1 className="text-2xl font-medium text-brand-text tracking-tight"><span className="font-bold">SomeGood</span> CRM</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-brand-text/70 hover:text-brand-text border border-white/10 px-4 py-2 rounded-lg transition-all uppercase font-bold tracking-wider">Logout</button>
      </div>

      {viewMode === 'QR_ONLY' ? (
        <div className="flex flex-col items-center justify-center mt-12 space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="glass-card p-12 py-16 rounded-[3rem] border border-white/20 shadow-lg text-center max-w-lg w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
            {activeSurvey ? (
              <div className="flex flex-col items-center">
                <div className="bg-white/5 p-8 rounded-full mb-8 shadow-inner border border-white/20 animate-pulse">
                  <ClipboardList className="w-16 h-16 text-brand-text" />
                </div>
                <h2 className="text-3xl font-bold text-brand-text mb-4 tracking-tight uppercase">Start New Survey</h2>
                <p className="text-brand-text/70 leading-relaxed text-[17px] px-4 mb-10">Click the button below to start the<br />customer survey in a new tab.</p>

                <a
                  href={surveyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 py-5 bg-black/20 text-white rounded-2xl font-bold text-xl shadow-xl hover:bg-black transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-6 h-6 text-primary-300" />
                  OPEN SURVEY PAGE
                </a>
              </div>
            ) : (
              <div className="py-24 text-brand-text/60 font-medium uppercase tracking-widest">No active surveys available.<br /><span className="text-sm mt-3 inline-block font-normal text-brand-text/40">Please contact the Super Admin.</span></div>
            )}
          </div>

          <button
            onClick={() => setViewMode('LIST_VIEW')}
            className="flex items-center gap-3 px-10 py-5 glass-button hover:bg-primary-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            <ClipboardList className="w-6 h-6" />
            📋 VIEW ALL CUSTOMER LIST
          </button>


        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            {/* Hide QR toggle for normal admins as per request */}
            <h2 className="text-2xl font-bold text-brand-text flex items-center gap-4 uppercase tracking-tighter">
              📋 Customer Diagnosis List
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-100 hover:scale-105 transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                VIEW MY STATISTICS
              </Link>
            </h2>
          </div>

          <div className="glass-card rounded-3xl shadow-sm border border-white/10 overflow-hidden mb-8 p-6 lg:px-10 lg:py-8">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-[4] w-full relative">
                <label className="block text-xs font-bold text-brand-text/50 mb-2 uppercase tracking-[0.2em]">Search Name</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
                  <input
                    type="text"
                    placeholder="Enter patient name..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 bg-black/10 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                  />
                </div>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto">
                <label className="block text-xs font-bold text-brand-text/50 mb-2 uppercase tracking-[0.2em]">Date Filter</label>
                <div className="flex items-center gap-2 h-12">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-full px-4 bg-black/10 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-medium text-brand-text/90"
                  />
                  <span className="text-brand-text/40 font-bold">~</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-full px-4 bg-black/10 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-medium text-brand-text/90"
                  />
                </div>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto">
                <label className="block text-xs font-bold text-brand-text/50 mb-2 uppercase tracking-[0.2em]">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full md:w-[130px] h-12 px-4 bg-black/10 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-medium text-brand-text/90 appearance-none cursor-pointer"
                >
                  <option value="latest">Latest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto">
                <button
                  onClick={() => fetchData()}
                  className="w-full md:w-auto h-12 flex items-center justify-center gap-2 px-6 bg-brand-text text-brand-dark rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg font-black text-sm whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  SEARCH
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl border border-white/10 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-transparent/70 border-b border-white/10 text-xs uppercase tracking-widest">
                  <th className="p-5 pl-8 font-bold text-brand-text/70 w-[20%]">Submitted At</th>
                  <th className="p-5 font-bold text-brand-text/70 w-[20%]">Patient Name</th>
                  <th className="p-5 font-bold text-brand-text/70 w-[20%]">Phone</th>
                  <th className="p-5 font-bold text-brand-text/70 w-[15%]">Age</th>
                  <th className="p-5 pr-8 font-bold text-brand-text/70 text-right w-[25%]">Details</th>
                </tr>
              </thead>
              <tbody>
                {responses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-brand-text/60 font-medium uppercase tracking-widest">No matching customer data found.</td>
                  </tr>
                ) : (
                  responses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(res => (
                    <tr key={res.id} className="border-b border-beige-100/60 hover:bg-white/5/40 transition-colors">
                      <td className="p-5 pl-8 text-brand-text/70 text-sm">{new Date(res.submitted_at).toLocaleString()}</td>
                      <td className="p-5 font-bold text-brand-text">{res.patient_name || '-'}</td>
                      <td className="p-5 text-brand-text/80 font-medium tracking-wide">{res.patient_phone ? formatPhoneNumber(res.patient_phone) : '-'}</td>
                      <td className="p-5 text-brand-text/80 text-sm">{res.patient_age_group || '-'}</td>
                      <td className="p-5 pr-8 text-right">
                        <Link
                          href={`/admin/responses/${res.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-white font-bold px-6 py-2.5 bg-brand-text/20 hover:bg-brand-text/40 rounded-xl transition-all text-xs shadow-sm uppercase tracking-wider inline-flex items-center gap-2"
                        >
                          View Report
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {responses.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-brand-text/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-sm"
              >
                PREV
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.ceil(responses.length / itemsPerPage) }).map((_, i) => (
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
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(responses.length / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(responses.length / itemsPerPage)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-brand-text/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-sm"
              >
                NEXT
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
