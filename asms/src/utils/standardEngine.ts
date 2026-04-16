import { CONDITION_MAP, PRIORITY_MAP, CONCLUSIONS, CAUSE_MAP_USER, RISK_KEYWORDS } from './standardData';

export interface StandardResult {
  zone: string;
  selectedConditions: string[];
  mainReaction: string;
  secondaryReaction: string;
  diagnosticSummary: string;
  causes: { label: string; description: string }[];
  conclusions: string[];
  isHighRisk: boolean;
  brandMessage: string;
}

export function calculateStandardResult(zone: string, conditions: string[]): StandardResult {
  if (conditions.length === 0) {
    return {
      zone,
      selectedConditions: [],
      mainReaction: '기타',
      secondaryReaction: '',
      diagnosticSummary: `${zone}에 특별한 반응이 관찰되지 않는 상태입니다.`,
      causes: [],
      conclusions: ['정상 관리 진행 가능'],
      isHighRisk: false,
      brandMessage: 'Freedom Begins with Clear Body Skin'
    };
  }

  // 1. Get mappings for all conditions
  const matchedMappings = conditions
    .map(c => ({ name: c, ...CONDITION_MAP[c] }))
    .filter(m => !!m.reactionType);

  // 2. Risk Check
  const highRiskConditions = conditions.filter(c => 
    RISK_KEYWORDS.some(k => c.includes(k)) || CONDITION_MAP[c]?.reactionType === '질환'
  );
  const isHighRisk = highRiskConditions.length > 0;

  // 3. Determine Main and Secondary Reactions based on Priority
  // Sorted by Priest (lower number is higher priority)
  const sortedReactions = matchedMappings
    .map(m => m.reactionType)
    .filter((v, i, a) => a.indexOf(v) === i) // Unique
    .sort((a, b) => PRIORITY_MAP[a] - PRIORITY_MAP[b]);

  const mainReactionLabel = sortedReactions[0] || '기타';
  const secondaryReactionLabel = sortedReactions[1] || '';

  // 4. Generate Diagnostic Summary
  const diagnosticSummary = secondaryReactionLabel
    ? `${zone}에 나타난 ${mainReactionLabel} 반응과 ${secondaryReactionLabel} 반응이 함께 존재하는 상태입니다.`
    : `${zone}에 나타난 ${mainReactionLabel} 반응이 주를 이루는 상태입니다.`;

  // 5. Map Causes (Max 2)
  const allCauses = matchedMappings.map(m => m.cause);
  const uniqueCauses = Array.from(new Set(allCauses)).slice(0, 2);
  const causes = uniqueCauses.map(c => ({
    label: c,
    description: CAUSE_MAP_USER[c] || c
  }));

  // 6. Map Conclusions (Max 2)
  let resultConclusions: string[] = [];
  if (isHighRisk) {
    resultConclusions = [CONCLUSIONS[3]]; // 3. 비개입 / 보류 접근
  } else {
    // Collect all conclusion IDs
    const allConclusionIds = matchedMappings.flatMap(m => m.conclusions);
    const uniqueIds = Array.from(new Set(allConclusionIds)).slice(0, 2);
    resultConclusions = uniqueIds.map(id => `${id}. ${CONCLUSIONS[id]}`);
  }

  return {
    zone,
    selectedConditions: conditions,
    mainReaction: mainReactionLabel,
    secondaryReaction: secondaryReactionLabel,
    diagnosticSummary,
    causes,
    conclusions: resultConclusions,
    isHighRisk,
    brandMessage: 'Freedom Begins with Clear Body Skin'
  };
}
