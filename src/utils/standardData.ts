export interface ConditionMapping {
  category: '모공/피지' | '염증/감염' | '바이러스' | '색소/자국' | '흉터/피부질환';
  reactionType: '염증' | '피지/정체' | '각질' | '색소' | '혈관' | '질환';
  cause: string;
  conclusions: number[];
}

export const ZONES = [
  '상부 등 / 어깨 / 뒷목',
  '하부 등 / 옆구리',
  '엉덩이 / 허벅지 뒤',
  '허벅지 안쪽 / 팔 안쪽',
  '가슴 / 복부',
  '팔뚝 / 종아리 / 정강이'
];

export const PRIORITY_MAP: Record<string, number> = {
  '염증': 1,
  '피지/정체': 2,
  '각질': 3,
  '색소': 4,
  '혈관': 5,
  '질환': 6
};

export const CONDITION_MAP: Record<string, ConditionMapping> = {
  '모공성 각화증': { category: '모공/피지', reactionType: '각질', cause: '각질 이상 구조', conclusions: [5] },
  '가성속모증': { category: '모공/피지', reactionType: '각질', cause: '각질 이상 구조', conclusions: [5] },
  '인그로운 헤어': { category: '모공/피지', reactionType: '각질', cause: '각질 이상 구조', conclusions: [5] },
  '다발성 피지낭종': { category: '모공/피지', reactionType: '피지/정체', cause: '피지 정체 구조', conclusions: [4] },
  '표피낭종': { category: '모공/피지', reactionType: '피지/정체', cause: '피지 정체 구조', conclusions: [4] },
  
  '화농성 여드름': { category: '염증/감염', reactionType: '염증', cause: '염증 반응', conclusions: [6] },
  '모낭염': { category: '염증/감염', reactionType: '염증', cause: '염증 + 세균', conclusions: [6] },
  '압박성 여드름': { category: '염증/감염', reactionType: '염증', cause: '마찰 + 염증', conclusions: [8, 6] },
  '땀띠': { category: '염증/감염', reactionType: '염증', cause: '환경 + 염증', conclusions: [9, 1] },
  '지루성 피부염': { category: '염증/감염', reactionType: '염증', cause: '생활 + 염증', conclusions: [9, 2] },
  
  '편평 사마귀': { category: '바이러스', reactionType: '질환', cause: '바이러스', conclusions: [3] },
  '전염성 연속종': { category: '바이러스', reactionType: '질환', cause: '바이러스', conclusions: [3] },
  
  'PIH': { category: '색소/자국', reactionType: '색소', cause: '색소 반응', conclusions: [11] },
  'PIE': { category: '색소/자국', reactionType: '혈관', cause: '혈관 반응', conclusions: [12] },
  '일광흑자': { category: '색소/자국', reactionType: '색소', cause: '색소', conclusions: [11] },
  '단순흑자': { category: '색소/자국', reactionType: '색소', cause: '색소', conclusions: [11] },
  '튼살': { category: '색소/자국', reactionType: '색소', cause: '조직 손상', conclusions: [13] },
  '마찰 색소침착': { category: '색소/자국', reactionType: '색소', cause: '마찰 + 색소', conclusions: [8, 11] },
  '흑색 가시세포증': { category: '색소/자국', reactionType: '색소', cause: '생활 + 구조', conclusions: [9, 5] },
  
  '비후성 반흔': { category: '흉터/피부질환', reactionType: '색소', cause: '조직 손상', conclusions: [13] },
  '켈로이드': { category: '흉터/피부질환', reactionType: '질환', cause: '질환', conclusions: [3] },
  '건선': { category: '흉터/피부질환', reactionType: '질환', cause: '질환', conclusions: [3] },
  '태선화': { category: '흉터/피부질환', reactionType: '각질', cause: '반복 자극', conclusions: [10] },
  '한관종': { category: '흉터/피부질환', reactionType: '질환', cause: '구조 질환', conclusions: [3] },
  '비립종': { category: '흉터/피부질환', reactionType: '피지/정체', cause: '구조 + 정체', conclusions: [5, 7] }
};

export const CONCLUSIONS: Record<number, string> = {
  1: '안정화 우선 접근',
  2: '제한적 개입 접근',
  3: '비개입 / 보류 접근',
  4: '피지·정체 해소 접근',
  5: '각질 구조 정상화 접근',
  6: '활동성 염증 완화 접근',
  7: '모낭·면포 관리 접근',
  8: '마찰·압박 차단 접근',
  9: '생활리듬 조정 연동 접근',
  10: '재자극 차단 회복 접근',
  11: '색소 완화 접근',
  12: '혈관성 붉음 진정 접근',
  13: '흉터·조직 회복 접근',
  14: '복합 병변 우선순위 접근',
  15: '유지·재발방지 접근'
};

export const CAUSE_MAP_USER: Record<string, string> = {
  '각질 이상 구조': '각질이 쌓이면서 모공이 막힌 상태',
  '피지 정체 구조': '피지가 배출되지 못하고 고여있는 상태',
  '염증 반응': '피부 내부에서 염증이 활성화된 상태',
  '염증 + 세균': '염증과 함께 세균 번식이 의심되는 상태',
  '마찰 + 염증': '지속적인 마찰로 인해 염증이 심해진 상태',
  '환경 + 염증': '외부 환경 요인으로 피부가 예민해진 상태',
  '생활 + 염증': '생활 습관이나 내부 밸런스 저하로 인한 상태',
  '색소 반응': '염증 후 색소가 남거나 색소 세포가 활성화된 상태',
  '혈관 반응': '혈류량이 증가하여 붉음이 지속되는 상태',
  '조직 손상': '피부 조직이 손상되거나 변형된 상태',
  '마찰 + 색소': '잦은 접촉과 마찰로 인해 색소가 침착된 상태',
  '생활 + 구조': '생활 패턴과 피부 구조적 요인이 겹친 상태',
  '반복 자극': '반복적인 자극으로 피부가 두꺼워지고 거칠어진 상태',
  '구조 + 정체': '피부 구조적 특성으로 피지 정체가 반복되는 상태',
  '바이러스': '바이러스성 감염이 의심되어 전문가의 진료가 필요한 상태',
  '질환': '일반적인 관리 범위를 벗어난 피부 질환이 의심되는 상태',
  '구조적 질환': '피부 구조와 관련된 특이 질환이 의심되는 상태'
};

export const RISK_KEYWORDS = ['바이러스', '켈로이드', '건선 의심', '열감+확산', '강한 압통'];
