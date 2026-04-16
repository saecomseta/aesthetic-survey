import { useState, useEffect } from 'react';

export type TargetContents = {
  F_20s: string; F_30s: string; F_40s: string;
  M_20s: string; M_30s: string; M_40s: string;
}

export const defaultTargetContents = (): TargetContents => ({
  F_20s: '', F_30s: '', F_40s: '', M_20s: '', M_30s: '', M_40s: ''
})

interface Props {
  value: TargetContents;
  onChange: (val: TargetContents) => void;
  placeholder?: string;
  theme?: 'blue' | 'purple';
}

export default function TargetScriptEditor({ value, onChange, placeholder = '진단 소견을 입력하세요...', theme = 'blue' }: Props) {
  const [activeTab, setActiveTab] = useState<keyof TargetContents>('F_20s');
  
  const tabs: {key: keyof TargetContents, label: string}[] = [
    {key: 'F_20s', label: '👩‍🦰 여20대'}, {key: 'F_30s', label: '👩‍💼 여30대'}, {key: 'F_40s', label: '👵 여40대~'},
    {key: 'M_20s', label: '👱‍♂️ 남20대'}, {key: 'M_30s', label: '👨‍💼 남30대'}, {key: 'M_40s', label: '👴 남40대~'}
  ];

  const ringColor = theme === 'blue' ? 'focus-within:ring-blue-300' : 'focus-within:ring-purple-300';
  const activeColor = theme === 'blue' ? 'text-blue-600 border-blue-600' : 'text-purple-600 border-purple-600';
  
  const safeValue = value || defaultTargetContents();

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      <div className={`flex-[2] flex flex-col border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 ${ringColor} transition-all`}>
        <div className="flex bg-gray-50 border-b border-gray-200 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button 
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 px-2 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === t.key ? `bg-white ${activeColor}` : 'border-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <textarea
          placeholder={placeholder}
          className="w-full p-5 outline-none resize-none h-48 text-sm bg-white font-medium text-gray-800 leading-relaxed"
          value={safeValue[activeTab] || ''}
          onChange={e => onChange({ ...safeValue, [activeTab]: e.target.value })}
        />
      </div>

      <div className={`flex-[1] bg-${theme === 'blue' ? 'blue' : 'purple'}-50 border border-${theme === 'blue' ? 'blue' : 'purple'}-100 rounded-lg p-5 flex flex-col gap-4 min-w-[260px]`}>
        <h4 className={`text-sm font-bold text-${theme === 'blue' ? 'blue' : 'purple'}-800`}>[사용 가능한 변수 안내]</h4>
        <ul className="text-xs text-gray-700 space-y-4 leading-relaxed">
          <li>
            <code className="text-primary-600 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">{`{{name}}`}</code>
            <p className="mt-1.5 text-gray-500">환자의 이름이 자동 치환됩니다. (예: 홍길동)</p>
          </li>
          <li>
            <code className="text-primary-600 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">{`{{sector:변수명}}`}</code>
            <p className="mt-1.5 text-gray-500">조건이 일치하여 도출된 해당 섹터의 <strong>개별 소견</strong>이 1:1로 정확히 치환됩니다. 점수 미달 시 해당 영역은 공백으로 자동 소거됩니다.</p>
          </li>
          <li>
            <code className="text-primary-600 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">{`{{extra_advice}}`}</code>
            <p className="mt-1.5 text-gray-500">선택된 문항 옵션들에 지정된 <strong>추가 소견</strong> 문구들이 리스트업됩니다. 중복 내용은 하나로 제거됩니다.</p>
          </li>
        </ul>
      </div>
    </div>
  )
}
