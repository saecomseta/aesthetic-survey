import { FIRST_SESSION_LOGIC, FirstSessionTarget, PROFILE_ANALYSIS_DATA } from './standardData';

export interface FirstSessionInput {
  symptoms: string[];
  primaryCause: string;
  riskGrade: string; // R1, R2, R3, R4
  ageGroup: string;
  skinThickness: string;
  tissueType: string;
  pigmentHigh?: boolean;
  historyOfEasyMarking?: boolean;
}

export interface FirstSessionDecision {
  primaryTarget: string;
  direction: string;
  restrictions: string[];
  nextStepConditions: string[];
  internalInterpretation: string;
  scores: Record<FirstSessionTarget, number>;
}

export function calculateFirstSessionDecision(input: FirstSessionInput): FirstSessionDecision {
  const { symptoms, primaryCause, riskGrade, ageGroup, skinThickness, tissueType, pigmentHigh, historyOfEasyMarking } = input;
  
  // 1. Initialize scores
  const scores: Record<FirstSessionTarget, number> = {
    calming: 0,
    barrier: 0,
    decongestion: 0,
    comedone: 0,
    pigmentSafe: 0
  };

  // 2. Weight Accumulation
  // Symptoms
  symptoms.forEach(s => {
    const weights = FIRST_SESSION_LOGIC.symptomWeights[s];
    if (weights) {
      Object.entries(weights).forEach(([target, weight]) => {
        scores[target as FirstSessionTarget] += weight as number;
      });
    }
  });

  // Cause
  const causeWeights = FIRST_SESSION_LOGIC.causeWeights[primaryCause];
  if (causeWeights) {
    Object.entries(causeWeights).forEach(([target, weight]) => {
      scores[target as FirstSessionTarget] += weight as number;
    });
  }

  // Risk Grade
  const riskWeights = FIRST_SESSION_LOGIC.riskWeights[riskGrade];
  if (riskWeights) {
    Object.entries(riskWeights).forEach(([target, weight]) => {
      scores[target as FirstSessionTarget] += weight as number;
    });
  }

  // Age
  const ageWeights = FIRST_SESSION_LOGIC.ageWeights[ageGroup];
  if (ageWeights) {
    Object.entries(ageWeights).forEach(([target, weight]) => {
      scores[target as FirstSessionTarget] += weight as number;
    });
  }

  // Skin Thickness
  const thicknessWeights = FIRST_SESSION_LOGIC.skinThicknessWeights[skinThickness];
  if (thicknessWeights) {
    Object.entries(thicknessWeights).forEach(([target, weight]) => {
      scores[target as FirstSessionTarget] += weight as number;
    });
  }

  // Tissue Type
  const tissueWeights = FIRST_SESSION_LOGIC.tissueWeights[tissueType];
  if (tissueWeights) {
    Object.entries(tissueWeights).forEach(([target, weight]) => {
      scores[target as FirstSessionTarget] += weight as number;
    });
  }

  // 3. Apply Hard Rules (Overrides)
  let forcedTargets: FirstSessionTarget[] = [];
  
  // Rule 1: Risk R3/R4 and Thin Skin
  if (['R3', 'R4'].includes(riskGrade) && ['얇은 편', '매우 얇음', '극도로 얇음'].includes(skinThickness)) {
    forcedTargets = ['barrier', 'calming'];
  }
  
  // Rule 2: Pigment high and history of marking
  if (pigmentHigh && historyOfEasyMarking) {
    forcedTargets = ['pigmentSafe', 'barrier'];
  }

  // Rule 3: Thick, Hard, Low Risk, Congestion symptoms
  const isThick = ['매우 두꺼움', '두꺼운 편'].includes(skinThickness);
  const isHard = ['매우 단단함', '단단한 편'].includes(tissueType);
  const isLowRisk = ['R1', 'R2'].includes(riskGrade);
  const hasCongestion = symptoms.some(s => ['각질 정체', '블랙헤드', '화이트헤드', '거칠음'].includes(s));
  
  if (isThick && isHard && isLowRisk && hasCongestion) {
    scores.decongestion += 5; // Boost
    scores.comedone += 3;
  }

  // 4. Select Target
  let finalTarget: FirstSessionTarget = 'barrier'; // Default

  if (forcedTargets.length > 0) {
    // Pick the one with higher score among forced, or use priorityIfTie
    finalTarget = forcedTargets.sort((a, b) => {
      if (scores[b] !== scores[a]) return scores[b] - scores[a];
      return FIRST_SESSION_LOGIC.priorityIfTie.indexOf(a) - FIRST_SESSION_LOGIC.priorityIfTie.indexOf(b);
    })[0] as FirstSessionTarget;
  } else {
    // Normal selection
    const sorted = (Object.keys(scores) as FirstSessionTarget[]).sort((a, b) => {
      if (scores[b] !== scores[a]) return scores[b] - scores[a];
      return FIRST_SESSION_LOGIC.priorityIfTie.indexOf(a) - FIRST_SESSION_LOGIC.priorityIfTie.indexOf(b);
    });
    finalTarget = sorted[0];
  }

  // 5. Map to Output
  const decisionMap: Record<FirstSessionTarget, any> = {
    calming: {
      primaryTarget: "염증 안정화",
      direction: "진정 중심 접근",
      restrictions: ["강한 압출 보류", "자극성 박리 제한"],
      nextStepConditions: ["붉음/압통 감소 후 정리 접근 검토"],
      internalInterpretation: "현재는 막힘 자체보다 염증 반응을 먼저 낮추는 것이 중요합니다. 무리한 정리 접근은 오히려 반응을 키울 수 있습니다."
    },
    barrier: {
      primaryTarget: "장벽 안정화",
      direction: "장벽 보호 중심 접근",
      restrictions: ["강한 자극 금지", "반복 마찰 금지", "고강도 기기 보류"],
      nextStepConditions: ["따가움/열감/들뜸 감소 후 단계 상승"],
      internalInterpretation: "현재 피부는 개선보다 먼저 자극 허용 범위를 회복해야 하는 상태입니다. 첫 회차에서는 정리보다 보호와 안정화가 우선입니다."
    },
    decongestion: {
      primaryTarget: "정체 해소",
      direction: "순환 및 연화 중심 접근",
      restrictions: ["과도한 압박 금지"],
      nextStepConditions: ["조직 반응 안정 시 정리 범위 확대"],
      internalInterpretation: "현재 피부는 정체와 막힘이 핵심 문제로 보이며, 리스크가 낮아 첫 회차부터 흐름을 열어주는 접근이 가능합니다."
    },
    comedone: {
      primaryTarget: "면포 정리",
      direction: "연화 후 정리 접근",
      restrictions: ["염증 부위 무리한 개입 금지"],
      nextStepConditions: ["자극 후 반응 안정 시 정리 단계 확대"],
      internalInterpretation: "현재 피부는 면포와 막힘이 주된 문제로, 충분한 연화 과정을 거친 후 안전한 범위 내에서 정리를 진행하는 것이 효율적입니다."
    },
    pigmentSafe: {
      primaryTarget: "흔적 최소화",
      direction: "저자극 보호 접근",
      restrictions: ["자극 후 흔적 남길 수 있는 관리 제한"],
      nextStepConditions: ["새 염증 반응 없이 안정 유지 시 개선 단계 이동"],
      internalInterpretation: "현재 피부는 자극 후 흔적이 남을 가능성이 높아, 개선보다 먼저 잔존 반응을 최소화하는 방향이 적합합니다."
    }
  };

  const decision = decisionMap[finalTarget];

  return {
    ...decision,
    primaryTarget: decision.primaryTarget,
    scores
  };
}

/**
 * NEW: Calculate Profile-based Analysis
 */
export function calculateProfileAnalysis(ageGroup: string, gender: string): string {
  const genderKey = gender === '남' ? '남' : '여';
  const ageData = PROFILE_ANALYSIS_DATA[ageGroup];
  
  if (!ageData) return "연령대에 따른 표준 진단 가이드를 참고하여 관리를 진행해 주세요.";
  
  return ageData[genderKey] || "성별 및 연령에 따른 통합 분석 결과를 바탕으로 관리를 설계합니다.";
}
