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
  1: 'Stabilization Priority (안정화 우선 접근)',
  2: 'Limited Intervention (제한적 개입 접근)',
  3: 'Non-intervention / Deferral (비개입 / 보류 접근)',
  4: 'Sebum & Stagnation Relief (피지·정체 해소 접근)',
  5: 'Keratin Normalization (각질 구조 정상화 접근)',
  6: 'Active Inflammation Relief (활동성 염증 완화 접근)',
  7: 'Follicle & Comedone Care (모낭·면포 관리 접근)',
  8: 'Friction & Pressure Block (마찰·압박 차단 접근)',
  9: 'Lifestyle & Rhythm Link (생활리듬 조정 연동 접근)',
  10: 'Re-irritation Block & Recovery (재자극 차단 회복 접근)',
  11: 'Pigmentation Relief (색소 완화 접근)',
  12: 'Vascular Redness Soothing (혈관성 붉음 진정 접근)',
  13: 'Scar & Tissue Recovery (흉터·조직 회복 접근)',
  14: 'Combined Lesion Priority (복합 병변 우선순위 접근)',
  15: 'Maintenance & Relapse Prevention (유지·재발방지 접근)'
};

export const CAUSE_LABEL_MAP_EN: Record<string, string> = {
  '각질 이상 구조': 'KERATIN ABNORMALITY',
  '피지 정체 구조': 'SEBUM STAGNATION',
  '염증 반응': 'INFLAMMATORY RESPONSE',
  '염증 + 세균': 'INFLAMMATION & BACTERIA',
  '마찰 + 염증': 'FRICTION & INFLAMMATION',
  '환경 + 염증': 'ENVIRONMENT & INFLAMMATION',
  '생활 + 염증': 'LIFESTYLE & INFLAMMATION',
  '색소 반응': 'PIGMENTATION RESPONSE',
  '혈관 반응': 'VASCULAR RESPONSE',
  '조직 손상': 'TISSUE DAMAGE',
  '마찰 + 색소': 'FRICTION & PIGMENTATION',
  '생활 + 구조': 'LIFESTYLE & STRUCTURE',
  '반복 자극': 'REPEATED IRRITATION',
  '구조 + 정체': 'STRUCTURE & STAGNATION',
  '바이러스': 'VIRAL INFECTION',
  '질환': 'SKIN CONDITION',
  '구조적 질환': 'STRUCTURAL CONDITION'
};

export const CAUSE_MAP_USER: Record<string, string> = {
  '각질 이상 구조': 'Abnormal keratin buildup obstructing pores.\n각질이 쌓이면서 모공이 막힌 상태',
  '피지 정체 구조': 'Sebum accumulation due to poor discharge.\n피지가 배출되지 못하고 고여있는 상태',
  '염증 반응': 'Active inflammatory process within the skin layers.\n피부 내부에서 염증이 활성화된 상태',
  '염증 + 세균': 'Inflammation complicated by potential bacterial growth.\n염증과 함께 세균 번식이 의심되는 상태',
  '마찰 + 염증': 'Aggravated inflammation due to continuous physical friction.\n지속적인 마찰로 인해 염증이 심해진 상태',
  '환경 + 염증': 'Hypersensitive skin reaction to external environmental factors.\n외부 환경 요인으로 피부가 예민해진 상태',
  '생활 + 염증': 'Internal imbalance or lifestyle habits causing skin flare-ups.\n생활 습관이나 내부 밸런스 저하로 인한 상태',
  '색소 반응': 'Active pigment cells or post-inflammatory marks remaining.\n염증 후 색소가 남거나 색소 세포가 활성화된 상태',
  '혈관 반응': 'Persistent redness caused by increased blood flow.\n혈류량이 증가하여 붉음이 지속되는 상태',
  '조직 손상': 'Physical damage or structural deformation of skin tissue.\n피부 조직이 손상되거나 변형된 상태',
  '마찰 + 색소': 'Pigment deposition caused by frequent contact and friction.\n잦은 접촉과 마찰로 인해 색소가 침착된 상태',
  '생활 + 구조': 'Combination of lifestyle patterns and structural skin factors.\n생활 패턴과 피부 구조적 요인이 겹친 상태',
  '반복 자극': 'Skin thickening and coarsening from repeated external stress.\n반복적인 자극으로 피부가 두꺼워지고 거칠어진 상태',
  '구조 + 정체': 'Recurring sebum stagnation due to inherent skin structure.\n피부 구조적 특성으로 피지 정체가 반복되는 상태',
  '바이러스': 'Potential viral infection requiring professional medical care.\n바이러스성 감염이 의심되어 전문가의 진료가 필요한 상태',
  '질환': 'Suspected skin condition beyond standard aesthetic care.\n일반적인 관리 범위를 벗어난 피부 질환이 의심되는 상태',
  '구조적 질환': 'Specific condition related to the physical skin structure.\n피부 구조와 관련된 특이 질환이 의심되는 상태'
};

export const RISK_KEYWORDS = ['바이러스', '켈로이드', '건선 의심', '열감+확산', '강한 압통'];

export type FirstSessionTarget = 'calming' | 'barrier' | 'decongestion' | 'comedone' | 'pigmentSafe';

export interface FirstSessionWeights {
  targets: string[];
  priorityIfTie: string[];
  symptomWeights: Record<string, Partial<Record<FirstSessionTarget, number>>>;
  causeWeights: Record<string, Partial<Record<FirstSessionTarget, number>>>;
  riskWeights: Record<string, Partial<Record<FirstSessionTarget, number>>>;
  ageWeights: Record<string, Partial<Record<FirstSessionTarget, number>>>;
  skinThicknessWeights: Record<string, Partial<Record<FirstSessionTarget, number>>>;
  tissueWeights: Record<string, Partial<Record<FirstSessionTarget, number>>>;
}

export const FIRST_SESSION_LOGIC: any = {
  targets: ["calming", "barrier", "decongestion", "comedone", "pigmentSafe"],
  priorityIfTie: ["barrier", "calming", "pigmentSafe", "decongestion", "comedone"],
  symptomWeights: {
    "염증성 구진": { "calming": 4, "barrier": 2, "comedone": -1 },
    "붉은 트러블": { "calming": 4, "barrier": 2 },
    "열감": { "barrier": 4, "calming": 3, "decongestion": -1 },
    "민감 반응": { "barrier": 4, "calming": 3, "comedone": -2 },
    "블랙헤드": { "comedone": 4, "decongestion": 2 },
    "화이트헤드": { "comedone": 4, "decongestion": 2 },
    "각질 정체": { "decongestion": 4, "comedone": 2 },
    "거칠음": { "decongestion": 4, "comedone": 1 },
    "색소 잔존": { "pigmentSafe": 4, "barrier": 2 },
    "오래된 흔적": { "pigmentSafe": 4, "barrier": 2 }
  },
  causeWeights: {
    "마찰": { "barrier": 3, "calming": 2, "comedone": -1 },
    "땀": { "calming": 2, "decongestion": 1 },
    "압박": { "barrier": 2, "decongestion": 2 },
    "손으로 만짐": { "calming": 2, "pigmentSafe": 2, "barrier": 1 },
    "잘못된 홈케어": { "barrier": 4, "calming": 2, "comedone": -2 },
    "호르몬": { "calming": 2, "pigmentSafe": 1 },
    "각질 누적": { "decongestion": 3, "comedone": 2 }
  },
  riskWeights: {
    "R1": {},
    "R2": { "barrier": 1, "calming": 1, "comedone": -1 },
    "R3": { "barrier": 4, "calming": 4, "decongestion": -2, "comedone": -3 },
    "R4": { "barrier": 6, "calming": 5, "decongestion": -4, "comedone": -5 }
  },
  ageWeights: {
    "10대": { "comedone": 1, "decongestion": 1, "calming": 1 },
    "20대": { "comedone": 1, "decongestion": 1, "calming": 1 },
    "30대": {},
    "40대": { "barrier": 2, "pigmentSafe": 2, "comedone": -1 },
    "50대 이상": { "barrier": 3, "pigmentSafe": 3, "decongestion": -1, "comedone": -2 }
  },
  skinThicknessWeights: {
    "매우 두꺼움": { "comedone": 3, "decongestion": 2, "barrier": -1 },
    "두꺼운 편": { "comedone": 2, "decongestion": 2 },
    "보통": {},
    "얇은 편": { "barrier": 3, "calming": 2, "comedone": -2 },
    "매우 얇음": { "barrier": 5, "pigmentSafe": 3, "calming": 3, "comedone": -4, "decongestion": -2 },
    "극도로 얇음": { "barrier": 6, "pigmentSafe": 4, "calming": 3, "comedone": -5, "decongestion": -3 }
  },
  tissueWeights: {
    "매우 단단함": { "decongestion": 3, "comedone": 1 },
    "단단한 편": { "decongestion": 2, "comedone": 1 },
    "보통": {},
    "부드러운 편": { "barrier": 1, "pigmentSafe": 2 },
    "매우 부드러움": { "barrier": 3, "pigmentSafe": 3, "decongestion": -1 }
  }
};

export const PROFILE_ANALYSIS_DATA: Record<string, Record<string, string>> = {
  "10대": {
    "남": "남성호르몬으로 인한 여드름 발생 확률이 높으며, 재생력은 매우 빠른 편입니다.",
    "여": "피지 분비가 왕성하고 민감도가 높을 수 있는 시기입니다. 기본적인 세정과 진정에 집중해야 합니다."
  },
  "20대": {
    "남": "활동량이 많고 피지 조절 기능이 불규칙할 수 있으며, 흔적 케어가 중요한 시기입니다.",
    "여": "스트레스와 라이프스타일에 따른 성인성 트러블 가능성이 높으므로 원인별 맞춤 관리가 권장됩니다."
  },
  "30대": {
    "남": "회복력이 점차 저하되기 시작하며, 수분 부족으로 인한 정체 현상을 주의해야 합니다.",
    "여": "호르몬 변화와 환경적 요인에 민감하게 반응할 수 있어 장벽 강화와 진정이 핵심입니다."
  },
  "40대": {
    "남": "노화로 인한 탄력 저하와 건조함이 동반되므로 영양 공급과 장벽 보호가 최우선입니다.",
    "여": "전반적인 재생 주기가 늦어지고 색소 침착이 쉽게 고착될 수 있어 보수적이고 정밀한 접근이 필요합니다."
  },
  "50대 이상": {
    "남": "피부 밀도가 낮아지고 물리적 자극에 대한 방어력이 약해진 상태이므로 안정적인 관리가 필수입니다.",
    "여": "호르몬 영향으로 인한 급격한 건조함과 예민함을 고려하여 극한의 보습과 보호 관리가 뒤따라야 합니다."
  }
};

export const BACKGROUND_GUIDE_DATA = {
  thickness: {
    "극도로 얇음": "Skin barrier is extremely fragile. Start management conservatively. (피부 장벽이 매우 취약하여 모든 관리를 가장 보수적이고 안정적으로 시작해야 합니다.)",
    "매우 얇음": "Reactions may expand even with small stimuli. Focus on calming first. (작은 자극에도 반응이 확대될 수 있으므로, 초기에는 진정과 장벽 강화에만 집중하세요.)",
    "얇은 편": "Tolerance is lower than average. Reduce intensity for safety. (평균보다 자극 허용치가 낮아 관리 강도를 평소보다 하향 조정하는 것이 안전합니다.)",
    "보통": "Can proceed with standard intensity if condition is stable. (안정적인 컨디션이라면 설계된 표준 강도로 관리를 진행할 수 있습니다.)",
    "두꺼운 편": "High skin density. Requires sufficient softening before treatment. (피부 밀도가 높아 유효 성분 흡수를 위해 충분한 연화 과정이 선행되어야 합니다.)",
    "매우 두꺼움": "Skin is thick and firm. May require more sessions than average. (피부가 두껍고 단단하면 평균적인 피부에 비해 관리 횟수가 더 많이 필요합니다.)"
  },
  tissue: {
    "매우 부드러움": "Tissue is very soft. Redness may last longer after treatment. (살성이 연하여 압출이나 자극 후 붉음증이 오래 지속될 수 있으니 주의가 필요합니다.)",
    "부드러운 편": "Good flexibility allows smooth management, but prevent marks. (피부 유연성이 좋아 비교적 순조로운 관리가 가능하지만 흔적 예방에 신경 써야 합니다.)",
    "보통": "Shows standard tissue reaction. Can respond flexibly. (일반적인 조직 반응을 보이며, 컨디션에 따른 유동적인 대응이 가능합니다.)",
    "단단한 편": "Dense tissue may make extraction difficult. Enhance softening. (조직이 치밀하여 정체된 면포 배출이 어려울 수 있으니 연화 관리를 강화하세요.)",
    "매우 단단함": "Requires more steps and professional techniques for clearing. (단단한 살성은 정체 해소를 위해 더 많은 단계와 전문적인 테크닉이 요구됩니다.)"
  }
};

export const ZONE_DISPLAY_MAP: Record<string, string> = {
  '상부 등 / 어깨 / 뒷목': 'Upper Back / Shoulder / Neck (상부 등/어깨/뒷목)',
  '하부 등 / 옆구리': 'Lower Back / Flank (하부 등/옆구리)',
  '엉덩이 / 허벅지 뒤': 'Buttock / Back of Thigh (엉덩이/허벅지 뒤)',
  '허벅지 안쪽 / 팔 안쪽': 'Inner Thigh / Inner Arm (허벅지 안쪽/팔 안쪽)',
  '가슴 / 복부': 'Chest / Abdomen (가슴/복부)',
  '팔뚝 / 종아리 / 정강이': 'Arm / Calf / Shin (팔뚝/종아리/정강이)'
};

export const CONDITION_DISPLAY_MAP: Record<string, string> = {
  '모공성 각화증': 'Keratosis Pilaris (모공성 각화증)',
  '가성속모증': 'Pseudofolliculitis (가성속모증)',
  '인그로운 헤어': 'Ingrown Hair (인그로운 헤어)',
  '다발성 피지낭종': 'Steatocystoma Multiplex (다발성 피지낭종)',
  '표피낭종': 'Epidermal Cyst (표피낭종)',
  '화농성 여드름': 'Inflammatory Acne (화농성 여드름)',
  '모낭염': 'Folliculitis (모낭염)',
  '압박성 여드름': 'Friction Acne (압박성 여드름)',
  '땀띠': 'Heat Rash (땀띠)',
  '지루성 피부염': 'Seborrheic Dermatitis (지루성 피부염)',
  '편평 사마귀': 'Flat Wart (편평 사마귀)',
  '전염성 연속종': 'Molluscum Contagiosum (전염성 연속종)',
  'PIH': 'PIH (Post-Inflammatory Hyperpigmentation)',
  'PIE': 'PIE (Post-Inflammatory Erythema)',
  '일광흑자': 'Solar Lentigo (일광흑자)',
  '단순흑자': 'Simple Lentigo (단순흑자)',
  '튼살': 'Stretch Marks (튼살)',
  '마찰 색소침착': 'Friction Pigmentation (마찰 색소침착)',
  '흑색 가시세포증': 'Acanthosis Nigricans (흑색 가시세포증)',
  '비후성 반흔': 'Hypertrophic Scar (비후성 반흔)',
  '켈로이드': 'Keloid (켈로이드)',
  '건선': 'Psoriasis (건선)',
  '태선화': 'Lichenification (태선화)',
  '한관종': 'Syringoma (한관종)',
  '비립종': 'Milia (비립종)'
};

export const CATEGORY_DISPLAY_MAP: Record<string, string> = {
  '모공/피지': 'Pore / Sebum (모공/피지)',
  '염증/감염': 'Inflammation / Infection (염증/감염)',
  '바이러스': 'Virus (바이러스)',
  '색소/자국': 'Pigmentation / Mark (색소/자국)',
  '흉터/피부질환': 'Scar / Condition (흉터/피부질환)'
};

export const CAUSE_DISPLAY_MAP: Record<string, string> = {
  '각질 이상 구조': 'Keratin Abnormality (각질 이상 구조)',
  '피지 정체 구조': 'Sebum Stagnation (피지 정체 구조)',
  '염증 반응': 'Inflammatory Response (염증 반응)',
  '염증 + 세균': 'Inflammation + Bacteria (염증 + 세균)',
  '마찰 + 염증': 'Friction + Inflammation (마찰 + 염증)',
  '환경 + 염증': 'Environment + Inflammation (환경 + 염증)',
  '생활 + 염증': 'Lifestyle + Inflammation (생활 + 염증)',
  '색소 반응': 'Pigmentation Response (색소 반응)',
  '혈관 반응': 'Vascular Response (혈관 반응)',
  '조직 손상': 'Tissue Damage (조직 손상)',
  '마찰 + 색소': 'Friction + Pigmentation (마찰 + 색소)',
  '생활 + 구조': 'Lifestyle + Structure (생활 + 구조)',
  '반복 자극': 'Repeated Irritation (반복 자극)',
  '구조 + 정체': 'Structure + Stagnation (구조 + 정체)',
  '바이러스': 'Viral Infection (바이러스)',
  '질환': 'Skin Condition (질환)',
  '구조적 질환': 'Structural Condition (구조적 질환)'
};

export const REACTION_DISPLAY_MAP: Record<string, string> = {
  '염증': 'Inflammation (염증)',
  '피지/정체': 'Sebum Stagnation (피지/정체)',
  '각질': 'Keratin Buildup (각질)',
  '색소': 'Pigmentation (색소)',
  '혈관': 'Vascular (혈관)',
  '질환': 'Skin Condition (질환)',
  '피지/정체·각질': 'Sebum & Keratin (피지/정체·각질)',
  '염증·피지/정체': 'Inflammation & Sebum (염증·피지/정체)',
  '염증·각질': 'Inflammation & Keratin (염증·각질)',
  '염증·피지/정체·각질': 'Inflammation, Sebum & Keratin (염증·피지/정체·각질)'
};
