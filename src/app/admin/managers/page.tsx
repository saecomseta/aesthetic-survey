'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/components/AdminGuard'
import { ArrowLeft, UserPlus, ShieldCheck, RefreshCcw, Mail, Calendar, Trash2, Search, X, CheckCircle2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export default function ManagersPage() {
  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // UI States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // ID of manager being processed

  // Form State
  const [newManager, setNewManager] = useState({ nickname: '', email: '', password: '123456' })
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean,
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'warning' | 'danger'
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  })

  useEffect(() => {
    fetchManagers()
  }, [])

  const fetchManagers = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const response = await fetch('/api/admin/managers')
      const result = await response.json()
      if (result.success) {
        setManagers(result.managers)
      } else {
        // Fallback to direct client-side fetch if API fails (won't have emails)
        console.warn('API fetch failed, falling back to direct DB query:', result.error)
        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'ADMIN')
          .order('created_at', { ascending: false })

        if (dbError) throw dbError
        setManagers(data.map(m => ({ ...m, email: 'EMAIL HIDDEN (KEY REQUIRED)' })))
        setStatus({ type: 'error', message: 'FULL DATA (EMAIL) REQUIRES SERVICE ROLE KEY.' })
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: 'FETCH ERROR: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading('creating')
    setStatus(null)

    try {
      const response = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newManager, action: 'create' })
      })

      const result = await response.json()
      if (result.success) {
        setStatus({ type: 'success', message: 'MANAGER ACCOUNT CREATED SUCCESSFULLY.' })
        setShowCreateModal(false)
        setNewManager({ nickname: '', email: '', password: '123456' })
        fetchManagers()
      } else {
        setStatus({ type: 'error', message: result.error || 'FAILED TO CREATE ACCOUNT.' })
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'SERVER ERROR OCCURRED.' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPassword = async (id: string, nickname: string) => {
    setConfirmModal({
      show: true,
      title: 'PASSWORD RESET',
      message: `ARE YOU SURE YOU WANT TO RESET PASSWORD FOR [${nickname}] TO '123456'?`,
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, show: false }))
        setActionLoading(id)
        setStatus(null)

        try {
          const response = await fetch('/api/admin/managers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action: 'reset' })
          })

          const result = await response.json()
          if (result.success) {
            setStatus({ type: 'success', message: 'PASSWORD RESET TO 1234 SUCCESSFULLY.' })
          } else {
            setStatus({ type: 'error', message: result.error || 'FAILED TO RESET PASSWORD.' })
          }
        } catch (err) {
          setStatus({ type: 'error', message: 'SERVER ERROR OCCURRED.' })
        } finally {
          setActionLoading(null)
          setTimeout(() => setStatus(null), 3000)
        }
      }
    })
  }

  const handleDeleteManager = async (id: string, nickname: string) => {
    setConfirmModal({
      show: true,
      title: 'DELETE MANAGER',
      message: `ARE YOU SURE YOU WANT TO PERMANENTLY DELETE [${nickname}]? THIS CANNOT BE UNDONE.`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, show: false }))
        setActionLoading(id)
        setStatus(null)

        try {
          const response = await fetch('/api/admin/managers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action: 'delete' })
          })

          const result = await response.json()
          if (result.success) {
            setStatus({ type: 'success', message: 'MANAGER DELETED SUCCESSFULLY.' })
            fetchManagers()
          } else {
            setStatus({ type: 'error', message: result.error || 'FAILED TO DELETE MANAGER.' })
          }
        } catch (err) {
          setStatus({ type: 'error', message: 'SERVER ERROR OCCURRED.' })
        } finally {
          setActionLoading(null)
          setTimeout(() => setStatus(null), 3000)
        }
      }
    })
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#7A5B44] text-brand-text font-sans p-6 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <Link href="/admin/main" className="flex items-center gap-2 text-[10px] font-black text-brand-text/40 hover:text-brand-text mb-4 uppercase tracking-[0.3em] transition-colors">
                <ArrowLeft className="w-4 h-4" /> BACK TO DASHBOARD
              </Link>
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">MANAGER<br />MANAGEMENT</h1>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-3 px-8 py-4 bg-brand-text text-brand-dark rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl"
            >
              <UserPlus className="w-5 h-5" />
              ADD NEW MANAGER
            </button>
          </div>

          {status && status.type === 'success' && (
             <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl flex items-center gap-4 text-green-300 text-xs font-black uppercase tracking-widest">
               <CheckCircle2 className="w-5 h-5" /> {status.message}
             </motion.div>
          )}
          {status && status.type === 'error' && (
             <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center gap-4 text-red-300 text-xs font-black uppercase tracking-widest">
               <AlertTriangle className="w-5 h-5" /> {status.message}
             </motion.div>
          )}

          {/* Grid View */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-pulse text-brand-text/20 font-black tracking-[0.5em] uppercase text-sm">LOADING MANAGERS...</div>
            </div>
          ) : managers.length === 0 ? (
            <div className="glass-card rounded-[3rem] p-20 text-center border border-white/10 flex flex-col items-center">
              <ShieldCheck className="w-16 h-16 text-brand-text/10 mb-6" />
              <p className="text-brand-text/30 font-black uppercase tracking-widest">No managers registered in the system.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {managers.map((manager) => (
                <motion.div 
                  layout
                  key={manager.id}
                  className="glass-card rounded-[2.5rem] p-8 border border-white/10 hover:border-brand-text/30 transition-all flex flex-col relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                      <ShieldCheck className="w-6 h-6 text-brand-text" />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleResetPassword(manager.id, manager.nickname)} 
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-brand-text/50 hover:text-brand-text transition-all"
                        title="Reset Password to 1234"
                      >
                        <RefreshCcw className={`w-4 h-4 ${actionLoading === manager.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button 
                        onClick={() => handleDeleteManager(manager.id, manager.nickname)}
                        className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/20 text-red-400 transition-all"
                        title="Delete Manager"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest">Manager Nickname</p>
                      <p className="text-2xl font-black text-brand-text uppercase tracking-tight">{manager.nickname}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest">Email Address</p>
                      <p className="text-sm font-bold text-brand-text/60 truncate">{manager.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-brand-text/10 uppercase tracking-widest">System ID</p>
                      <p className="text-[10px] font-medium text-brand-text/20 truncate">{manager.id}</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-[10px] font-black text-brand-text/40 uppercase tracking-widest">
                        <Calendar className="w-3 h-3" />
                        {new Date(manager.created_at).toLocaleDateString()}
                      </div>
                      <span className="bg-brand-text/10 text-brand-text text-[9px] px-3 py-1 rounded-full font-black tracking-widest">
                        ADMIN
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md glass-card rounded-[3rem] p-10 border-white/10 shadow-2xl overflow-hidden">
                <button onClick={() => setShowCreateModal(false)} className="absolute top-8 right-8 text-brand-text/30 hover:text-brand-text transition-colors"><X className="w-6 h-6" /></button>
                
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-black uppercase tracking-tight">NEW MANAGER</h2>
                  <p className="text-[10px] font-black text-brand-text/30 uppercase tracking-[0.3em] mt-2">Create system access for store manager</p>
                </div>

                <form onSubmit={handleCreateManager} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest ml-1">Manager Nickname</label>
                      <div className="relative">
                        <ShieldCheck className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-brand-text/20" />
                        <input type="text" required placeholder="Nickname" className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-brand-text transition-all font-bold" value={newManager.nickname} onChange={e => setNewManager({ ...newManager, nickname: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-brand-text/20" />
                        <input type="email" required placeholder="manager@somegood.com" className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-brand-text transition-all font-bold" value={newManager.email} onChange={e => setNewManager({ ...newManager, email: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest ml-1">Initial Password</label>
                      <div className="relative">
                        <RefreshCcw className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-brand-text/20" />
                        <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-brand-text transition-all font-bold" value={newManager.password} onChange={e => setNewManager({ ...newManager, password: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={actionLoading === 'creating'} 
                    className="w-full py-5 bg-brand-text text-brand-dark rounded-2xl font-black text-[11px] tracking-[0.3em] uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50"
                  >
                    {actionLoading === 'creating' ? 'CREATING...' : 'AUTHORIZE MANAGER'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global Confirmation Modal */}
        <AnimatePresence>
          {confirmModal.show && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm glass-card rounded-[2.5rem] p-10 border-white/10 shadow-2xl text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border ${confirmModal.type === 'danger' ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-brand-text/20 border-brand-text/30 text-brand-text'}`}>
                  {confirmModal.type === 'danger' ? <Trash2 className="w-8 h-8" /> : <RefreshCcw className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">{confirmModal.title}</h3>
                <p className="text-[11px] font-medium text-brand-text/50 leading-relaxed uppercase tracking-widest mb-10">
                  {confirmModal.message}
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 ${confirmModal.type === 'danger' ? 'bg-red-500 text-white' : 'bg-brand-text text-brand-dark'}`}
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </AdminGuard>
  )
}
