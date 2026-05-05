'use client'
// Vercel Redeploy Trigger: Premium Aesthetic Final Build

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/admin')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#7A5B44] relative overflow-hidden font-sans">
      <div className="z-10 w-full max-w-sm flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <h1 className="text-4xl font-black text-brand-text mb-16 tracking-[0.2em] uppercase">
          SomeGood
        </h1>
        
        {error && (
          <div className="bg-red-900/30 border border-red-500/30 text-red-200 px-4 py-3 text-[10px] tracking-widest mb-8 w-full text-center uppercase">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-8">
          <div className="relative group">
            <input
              type="email"
              placeholder="EMAIL"
              required
              className="w-full bg-transparent border-b border-brand-text/30 py-3 text-brand-text text-sm tracking-widest placeholder:text-brand-text/30 focus:outline-none focus:border-brand-text transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative group">
            <input
              type="password"
              placeholder="PASSWORD"
              required
              className="w-full bg-transparent border-b border-brand-text/30 py-3 text-brand-text text-sm tracking-widest placeholder:text-brand-text/30 focus:outline-none focus:border-brand-text transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <div className="pt-12">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 glass-button text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white/20 transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <><div className="w-3 h-3 border-2 border-brand-text/30 border-t-brand-text rounded-full animate-spin"></div> AUTHENTICATING</>
              ) : 'LOGIN'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
