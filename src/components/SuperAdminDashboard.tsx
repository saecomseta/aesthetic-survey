'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Plus, ClipboardList, Clock, ArrowRight, ShieldAlert, BarChart3 } from 'lucide-react'

export default function SuperAdminDashboard() {
  const [surveys, setSurveys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSurveys()
  }, [])

  const fetchSurveys = async () => {
    const { data, error } = await supabase
      .from('surveys')
      .select('*, responses(count)')
      .order('created_at', { ascending: false })

    if (data) setSurveys(data)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-black text-brand-text uppercase tracking-tighter">MASTER DASHBOARD</h1>
            <span className="bg-red-900/30 text-red-700 text-[10px] px-3 py-1 rounded-full font-black flex items-center gap-2 border border-red-500/20 uppercase tracking-widest">
              <ShieldAlert className="w-3 h-3" />
              SUPER ADMIN
            </span>
          </div>
          <p className="text-brand-text/50 text-sm font-medium">Comprehensive management for survey diagnostics, patient data, and system logic.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleSignOut}
            className="px-4 py-2 text-brand-text/40 hover:text-brand-text border border-transparent hover:border-white/10 hover:bg-white/5 rounded-lg transition-all font-black text-[10px] uppercase tracking-widest"
          >
            SIGN OUT
          </button>
          <Link
            href="/admin/logic"
            className="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-white/10 text-brand-text rounded-lg hover:glass-card transition-all shadow-sm font-black text-[10px] uppercase tracking-widest"
          >
            <ShieldAlert className="w-4 h-4 text-primary-500" />
            LOGIC DESIGNER
          </Link>
          <Link
            href="/admin/responses"
            className="flex items-center gap-2 px-5 py-2.5 glass-card border border-white/20 text-brand-text rounded-lg hover:bg-white/5 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest"
          >
            <BarChart3 className="w-4 h-4" />
            INTEGRATED DATA
          </Link>
          <Link
            href="/admin/managers"
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-text text-brand-dark rounded-lg hover:scale-105 transition-all shadow-lg font-black text-[10px] uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            MANAGER LIST
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-pulse text-brand-text/20 font-black tracking-[0.5em] uppercase text-sm">INITIALIZING SYSTEM...</div>
        </div>
      ) : surveys.length === 0 ? (
        <div className="glass-card rounded-[3rem] p-16 text-center border border-white/10 flex flex-col items-center shadow-2xl">
          <div className="bg-transparent p-6 rounded-full mb-6">
            <ClipboardList className="w-12 h-12 text-brand-text/20" />
          </div>
          <h3 className="text-2xl font-black text-brand-text mb-4 uppercase tracking-tight">NO SURVEYS FOUND</h3>
          <p className="text-brand-text/50 mb-10 max-w-sm font-medium">Start by creating your first premium diagnostic survey to welcome your patients.</p>
          <Link 
            href="/admin/surveys/new" 
            className="px-10 py-4 glass-button text-brand-text rounded-full hover:bg-white/10 transition-all shadow-2xl font-black text-[11px] uppercase tracking-[0.3em] inline-flex items-center gap-3"
          >
            <Plus className="w-5 h-5" />
            CREATE NEW SURVEY
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {surveys.map(survey => (
            <Link 
              href={`/admin/surveys/${survey.id}`} 
              key={survey.id}
              className="glass-card group rounded-[2.5rem] p-8 border border-white/10 hover:border-brand-text/30 hover:shadow-2xl transition-all flex flex-col h-full relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-8">
                <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-full ${survey.is_active ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-white/5 text-brand-text/30 border border-white/10'}`}>
                  {survey.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
                <ArrowRight className="w-5 h-5 text-brand-text/20 group-hover:text-brand-text group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-black text-brand-text mb-4 line-clamp-2 leading-tight uppercase tracking-tight">{survey.title}</h3>
              
              <div className="mt-auto pt-8 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-brand-text/30">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 opacity-50" />
                  <span>{new Date(survey.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-brand-text bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                  {survey.responses[0]?.count || 0} RESPONSES
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
