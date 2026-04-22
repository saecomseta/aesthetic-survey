'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/components/AuthProvider'
import { 
  BarChart3, 
  Users, 
  UserCircle2, 
  Layers, 
  Scissors, 
  ArrowLeft,
  TrendingUp,
  PieChart as PieChartIcon
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function AnalyticsDashboard() {
  const { user, role } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      let query = supabase.from('responses').select('*')
      
      if (role !== 'SUPER_ADMIN' && user) {
        query = query.eq('admin_id', user.id)
      }

      const { data: resData, error: resError } = await query

      if (resError || !resData) {
        setLoading(false)
        return
      }

      // Fetch Profiles if Super Admin to show manager rankings (Client-side Join)
      let profileMap: Record<string, any> = {}
      if (role === 'SUPER_ADMIN') {
        const adminIds = Array.from(new Set(resData.map(r => r.admin_id).filter(Boolean)))
        if (adminIds.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, nickname')
            .in('id', adminIds)
          
          if (profileData) {
            profileMap = Object.fromEntries(profileData.map(p => [p.id, p]))
          }
        }
      }

      // Aggregate Data
      const stats = {
        total: resData.length,
        age: {} as Record<string, number>,
        gender: {} as Record<string, number>,
        symptoms: {} as Record<string, number>,
        thickness: {} as Record<string, number>,
        tissue: {} as Record<string, number>,
        managers: {} as Record<string, number>
      }

      resData.forEach(r => {
        // Age
        const age = r.patient_age_group || '알 수 없음'
        stats.age[age] = (stats.age[age] || 0) + 1

        // Gender
        const gender = r.patient_gender === '남' ? '남성' : (r.patient_gender === '여' ? '여성' : '알 수 없음')
        stats.gender[gender] = (stats.gender[gender] || 0) + 1

        // Symptom (from sector_results)
        const symptom = r.sector_results?.standardResult?.mainReaction || '기타'
        stats.symptoms[symptom] = (stats.symptoms[symptom] || 0) + 1

        // Thickness & Tissue (from answers JSON)
        const thick = r.answers?.answers?.skinThickness || '보통'
        stats.thickness[thick] = (stats.thickness[thick] || 0) + 1

        const tissue = r.answers?.answers?.tissueType || '보통'
        stats.tissue[tissue] = (stats.tissue[tissue] || 0) + 1

        // Managers (Attribution)
        const profile = r.admin_id ? profileMap[r.admin_id] : null
        const managerName = profile?.nickname || (r.admin_id ? `Admin(${r.admin_id.substring(0,4)})` : '직접 방문')
        stats.managers[managerName] = (stats.managers[managerName] || 0) + 1
      })

      setData(stats)
    } catch (err) {
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <AdminGuard><div className="p-20 text-center animate-pulse text-primary-500">데이터를 집계 중입니다...</div></AdminGuard>
  if (!data) return <AdminGuard><div className="p-20 text-center text-red-500">데이터를 불러오지 못했습니다.</div></AdminGuard>

  const getSortedRanking = (obj: Record<string, number>) => {
    return Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count, percentage: Math.round((count / data.total) * 100) }))
  }

  return (
    <AdminGuard>
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10 pb-32">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin" className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-beige-200">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <h1 className="text-3xl font-light text-primary-900 leading-tight">
                {role === 'SUPER_ADMIN' ? '통합 분석 대시보드' : '나의 진단 통계'}
              </h1>
            </div>
            <p className="text-gray-500 ml-12">
              {role === 'SUPER_ADMIN' ? `전체 누적 ${data.total}건` : `나의 누적 ${data.total}건`}의 진단 데이터를 기반으로 한 통계입니다.
            </p>
          </div>
          <div className="bg-primary-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            <span className="font-bold">REAL-TIME DATA</span>
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: '전체 방문', val: data.total, icon: Users, color: 'bg-blue-50 text-blue-600' },
            { label: '주요 성별', val: getSortedRanking(data.gender)[0]?.label || '-', icon: UserCircle2, color: 'bg-purple-50 text-purple-600' },
            { label: '최다 증상', val: getSortedRanking(data.symptoms)[0]?.label || '-', icon: Layers, color: 'bg-orange-50 text-orange-600' },
            { label: '평균 살성', val: getSortedRanking(data.tissue)[0]?.label || '-', icon: Scissors, color: 'bg-green-50 text-green-600' }
          ].map((card, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-[2rem] border border-beige-200 shadow-sm flex items-center gap-5"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-7 h-7" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{card.label}</div>
                <div className="text-2xl font-bold text-gray-900">{card.val}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts & Rankings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 1. Age Distribution Chart */}
          <section className="bg-white rounded-[2.5rem] p-8 border border-beige-200 shadow-sm">
            <h3 className="text-xl font-medium text-gray-900 mb-8 flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary-500" /> 연령대별 분포
            </h3>
            <div className="space-y-6">
              {getSortedRanking(data.age).slice(0, 5).map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-700">{item.label}</span>
                    <span className="text-primary-600">{item.percentage}% ({item.count}명)</span>
                  </div>
                  <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-[2px]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full bg-gradient-to-r from-primary-400 to-primary-700 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Symptom Ranking */}
          <section className="bg-white rounded-[2.5rem] p-8 border border-beige-200 shadow-sm">
            <h3 className="text-xl font-medium text-gray-900 mb-8 flex items-center gap-3">
              <PieChartIcon className="w-5 h-5 text-orange-500" /> 주 증상 랭킹 (Top 5)
            </h3>
            <div className="space-y-4">
              {getSortedRanking(data.symptoms).slice(0, 5).map((item, i) => (
                <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${i === 0 ? 'bg-primary-900 text-white border-primary-900 shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-white/20 text-white' : 'bg-white text-primary-800'}`}>
                      {i + 1}
                    </span>
                    <span className="font-bold">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs opacity-70 ${i === 0 ? 'text-white' : 'text-gray-400'}`}>{item.count}건</span>
                    <span className={`font-bold ${i === 0 ? 'text-primary-300' : 'text-primary-600'}`}>{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Skin Thickness Distribution */}
          <section className="bg-white rounded-[2.5rem] p-8 border border-beige-200 shadow-sm">
            <h3 className="text-xl font-medium text-gray-900 mb-8 flex items-center gap-3">
              <Layers className="w-5 h-5 text-blue-500" /> 피부 두께 분포
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {getSortedRanking(data.thickness).map((item, i) => (
                <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 mb-1 uppercase">{item.label}</div>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold text-slate-800">{item.percentage}%</div>
                    <div className="text-[10px] text-slate-400 mb-1">{item.count}건</div>
                  </div>
                  <div className="mt-3 h-1.5 bg-white rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Tissue Type Distribution */}
          <section className="bg-white rounded-[2.5rem] p-8 border border-beige-200 shadow-sm">
            <h3 className="text-xl font-medium text-gray-900 mb-8 flex items-center gap-3">
              <Scissors className="w-5 h-5 text-green-500" /> 피부 살성 분포
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Using a custom donut-like visualization (CSS only) */}
              <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[16px] border-gray-100" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{getSortedRanking(data.tissue)[0]?.percentage}%</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{getSortedRanking(data.tissue)[0]?.label}</div>
                </div>
              </div>
              <div className="space-y-4 justify-center flex flex-col">
                {getSortedRanking(data.tissue).slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-green-500' : (i === 1 ? 'bg-green-300' : 'bg-green-100')}`} />
                    <span className="text-sm font-medium text-gray-700 flex-1">{item.label}</span>
                    <span className="text-sm font-bold text-gray-900">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 5. Manager Performance Ranking (Super Admin Only) */}
          {role === 'SUPER_ADMIN' && (
            <section className="bg-white rounded-[2.5rem] p-8 border border-beige-200 shadow-sm lg:col-span-2">
              <h3 className="text-xl font-medium text-gray-900 mb-8 flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-500" /> 담당 매니저별 실적 랭킹
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getSortedRanking(data.managers).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 transition-hover hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-blue-600 shadow-sm border border-blue-50">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{item.label}</div>
                        <div className="text-xs text-gray-400">누적 진단 {item.count}건</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">{item.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </AdminGuard>
  )
}
