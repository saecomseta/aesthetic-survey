'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'
import { supabase } from '@/lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'
import { Download, Link as LinkIcon, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SurveyDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [survey, setSurvey] = useState<any>(null)
  const [responseCount, setResponseCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const updated = searchParams.get('updated') === 'true'

  useEffect(() => {
    fetchSurvey()
  }, [params.id])

  const fetchSurvey = async () => {
    // 1. Fetch Survey Data
    const { data: sData, error: sErr } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', params.id)
      .single()

    if (sErr || !sData) {
      setLoading(false)
      return
    }

    setSurvey(sData)

    // 2. Fetch precisely ONLY the count
    const { count } = await supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', params.id)

    setResponseCount(count || 0)
    setLoading(false)
  }

  const toggleStatus = async () => {
    const { error } = await supabase
      .from('surveys')
      .update({ is_active: !survey.is_active })
      .eq('id', survey.id)
      
    if (!error) {
      setSurvey({ ...survey, is_active: !survey.is_active })
    }
  }

  const downloadQR = () => {
    const canvas = document.getElementById('survey-qr') as HTMLCanvasElement
    if (!canvas) return
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
    const downloadLink = document.createElement('a')
    downloadLink.href = pngUrl
    downloadLink.download = `survey-${survey.id}.png`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  const copyLink = () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/survey/${survey.id}`
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  if (loading) return <AdminGuard requireSuperAdmin={true}><div className="p-12 text-center text-primary-500 animate-pulse font-medium">설문지 세부 정보를 불러오는 중입니다...</div></AdminGuard>
  if (!survey) return <AdminGuard requireSuperAdmin={true}><div className="p-12 text-center text-red-500">해당 설문을 찾을 수 없습니다.</div></AdminGuard>

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/survey/${survey.id}`

  return (
    <AdminGuard requireSuperAdmin={true}>
      <div className="max-w-3xl mx-auto p-4 lg:p-10 pb-20">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin" className="text-gray-500 hover:text-primary-700 font-medium flex items-center gap-2 transition-colors -ml-2 p-2 rounded-lg hover:bg-white border border-transparent hover:border-beige-200">
            <ArrowLeft className="w-5 h-5"/> 마스터 대시보드
          </Link>
          <h1 className="text-3xl font-light text-primary-700 ml-2 border-l-2 border-primary-200 pl-4">설문 관리 상세</h1>
        </div>

        {updated && (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 shadow-sm border border-green-200 animate-in fade-in slide-in-from-top-4">
            설문 수정이 성공적으로 저장되었습니다!
          </div>
        )}

        <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 md:p-12 border border-beige-200 shadow-sm flex flex-col items-center text-center mt-12">
          <h2 className="text-2xl font-medium text-gray-900 mb-6">{survey.title}</h2>
          
          <div className="bg-white p-4 rounded-xl border-2 border-beige-100 mb-6 inline-block shadow-sm">
            <QRCodeCanvas 
              id="survey-qr"
              value={publicUrl}
              size={200}
              level={"H"}
              includeMargin={true}
              className="rounded"
            />
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={downloadQR}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 transition font-medium shadow-sm"
            >
              <Download className="w-5 h-5" /> QR 다운로드
            </button>
            <button 
              onClick={copyLink}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition font-medium shadow-sm"
            >
              <LinkIcon className="w-5 h-5 text-gray-500" /> 링크 복사
            </button>
            
            {responseCount === 0 && (
              <Link 
                href={`/admin/surveys/${survey.id}/edit`}
                className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-2xl hover:bg-orange-100 transition font-medium"
              >
                설문 내용 수정
              </Link>
            )}
          </div>

          <div className="w-full mt-8 pt-6 border-t border-gray-100 flex items-center justify-between px-2">
            <span className="text-sm font-medium text-gray-600 flex flex-col items-start leading-snug">
              현재 운영 상태
              <span className="text-xs text-gray-400 font-normal">고객의 접근 가능 여부를 제어합니다.</span>
            </span>
            <button 
              onClick={toggleStatus}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${survey.is_active ? 'bg-green-500' : 'bg-gray-300 shadow-inner'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${survey.is_active ? 'translate-x-[22px]' : 'translate-x-1'}`} />
            </button>
          </div>
          
          <div className="w-full mt-4 pt-4 border-t border-gray-100 flex items-center justify-between px-2 text-sm text-gray-600">
            <span>총 누적 응답 수</span>
            <span className="font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg border border-primary-100">{responseCount}</span>
          </div>
        </div>

      </div>
    </AdminGuard>
  )
}
