import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24 bg-beige-50">
      <div className="z-10 max-w-5xl w-full flex flex-col items-center justify-center text-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        <div className="bg-primary-50 px-6 py-2 rounded-full border border-primary-100 mb-2">
          <span className="text-primary-600 font-semibold tracking-widest text-sm uppercase">Premium Aesthetic Center</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-light text-primary-800 leading-tight tracking-tight">
          <span className="font-semibold text-primary-600">SomeGood</span><br/>고객 관리 시스템
        </h1>
        <p className="text-lg md:text-xl text-primary-600/80 font-light max-w-lg leading-relaxed mt-2">
          고객 맞춤형 설문 관리, 세밀한 진단 분석, 그리고 고품격 고객 경험을 원스톱으로 제공합니다.
        </p>
        
        <div className="flex gap-4 mt-8">
          <Link href="/admin/login" className="px-10 py-4 text-lg bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl tracking-wide flex items-center gap-2">
            관리자 시작하기
          </Link>
        </div>
      </div>
    </main>
  );
}
