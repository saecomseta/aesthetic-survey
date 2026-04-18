'use client'

import React, { useState } from 'react'
import { CONDITION_MAP, CONCLUSIONS, CAUSE_MAP_USER, PRIORITY_MAP } from '@/utils/standardData'
import { ArrowLeft, Search, Filter, Info, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function LogicViewer() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('ALL')

  const conditions = Object.entries(CONDITION_MAP).map(([name, data]) => ({
    name,
    ...data
  }))

  const filteredConditions = conditions.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.cause.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || c.category === filterCategory;
    return matchesSearch && matchesCategory;
  })

  const categories = Array.from(new Set(conditions.map(c => c.category)));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin" className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-beige-200">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <h1 className="text-3xl font-light text-primary-900 leading-tight">진단 시스템 로직 설계도</h1>
          </div>
          <p className="text-gray-500 ml-12">SOMEGOOD STANDARD의 24개 항목 진단 알고리즘 및 매핑 데이터입니다.</p>
        </div>
        <div className="bg-primary-900 text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
          <ShieldCheck className="w-5 h-5 text-primary-400" />
          <span className="font-bold">MASTER VIEW ONLY</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 border border-beige-200 shadow-sm space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">항목명/원인 검색</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="증상 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-beige-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">카테고리 필터</label>
              <div className="space-y-1.5">
                <button 
                  onClick={() => setFilterCategory('ALL')}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${filterCategory === 'ALL' ? 'bg-primary-600 text-white font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  전체 보기
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${filterCategory === cat ? 'bg-primary-600 text-white font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
            <h4 className="text-primary-900 font-bold text-sm mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" /> 알고리즘 안내
            </h4>
            <p className="text-xs text-primary-800/70 leading-relaxed">
              본 로직은 <strong>Priority Priority</strong>에 따라 다중 증상 중 무엇을 핵심 원인으로 볼지 결정합니다.<br/>
              현재 우선순위: 염증(1) &gt; 피지(2) &gt; 각질(3) &gt; 색소(4) &gt; 혈관(5) &gt; 질환(6)
            </p>
          </div>
        </div>

        {/* Content Table */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2rem] border border-beige-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-beige-100">
                    <th className="p-5 pl-8 text-xs font-bold text-gray-500 uppercase tracking-widest">증상명</th>
                    <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-widest">분류 / 반응</th>
                    <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-widest">진단 원인</th>
                    <th className="p-5 pr-8 text-xs font-bold text-gray-500 uppercase tracking-widest">매핑된 해결 방향</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredConditions.map((c, i) => (
                    <tr key={i} className="hover:bg-primary-50/30 transition-colors">
                      <td className="p-5 pl-8">
                        <span className="font-bold text-gray-900 block">{c.name}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-1 inline-block uppercase font-bold tracking-tighter">Priority {PRIORITY_MAP[c.reactionType]}</span>
                      </td>
                      <td className="p-5">
                        <span className="text-xs font-medium text-gray-500 block mb-1">{c.category}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                          c.reactionType === '염증' ? 'bg-red-50 text-red-600 border-red-100' :
                          c.reactionType === '피지/정체' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                          c.reactionType === '색소' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          'bg-primary-50 text-primary-700 border-primary-100'
                        }`}>
                          {c.reactionType}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className="text-sm font-medium text-gray-900 block">{c.cause}</span>
                        <span className="text-[11px] text-gray-400 leading-tight block mt-1">{CAUSE_MAP_USER[c.cause]}</span>
                      </td>
                      <td className="p-5 pr-8">
                        <div className="flex flex-wrap gap-1">
                          {c.conclusions.map(id => (
                            <span key={id} className="text-[11px] bg-white border border-beige-200 text-gray-600 px-2 py-1 rounded-lg">
                              {CONCLUSIONS[id]}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredConditions.length === 0 && (
              <div className="p-20 text-center text-gray-400 font-medium">검색 결과가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
