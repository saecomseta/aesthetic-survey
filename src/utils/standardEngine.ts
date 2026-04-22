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

export function calculateStandardResult(zones: string[], conditions: string[], coreConditions: string[] = []): StandardResult {
  const zone = zones.join(', ');
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

  // 3. Determine Main and Secondary Reactions
  let mainReactionLabel = '기타';
  let secondaryReactionLabel = '';

  if (coreConditions.length > 0) {
    const coreMappings = coreConditions
      .map(c => CONDITION_MAP[c])
      .filter(m => !!m);
    
    const reactionTypes = coreMappings.map(m => m.reactionType);
    const uniqueReactions = Array.from(new Set(reactionTypes))
      .sort((a, b) => PRIORITY_MAP[a] - PRIORITY_MAP[b]);
    
    mainReactionLabel = uniqueReactions.join('·');
    
    // Find highest priority reaction other than main ones
    const otherReactions = matchedMappings
      .map(m => m.reactionType)
      .filter(r => !uniqueReactions.includes(r))
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => PRIORITY_MAP[a] - PRIORITY_MAP[b]);
    
    secondaryReactionLabel = otherReactions[0] || '';
  } else {
    // Legacy/Auto-selection logic based on Priority
    const sortedReactions = matchedMappings
      .map(m => m.reactionType)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => PRIORITY_MAP[a] - PRIORITY_MAP[b]);

    mainReactionLabel = sortedReactions[0] || '기타';
    secondaryReactionLabel = sortedReactions[1] || '';
  }

  // 4. Generate Diagnostic Summary
  const diagnosticSummary = secondaryReactionLabel
    ? `${zone}에 나타난 ${mainReactionLabel} 반응과 ${secondaryReactionLabel} 반응이 함께 존재하는 상태입니다.`
    : `${zone}에 나타난 ${mainReactionLabel} 반응이 주를 이루는 상태입니다.`;

  // 5. Map Causes (Max 2 or more if multiple cores)
  // If coreConditions exist, prioritize their causes
  let uniqueCauses: string[] = [];
  if (coreConditions.length > 0) {
    coreConditions.forEach(c => {
      if (CONDITION_MAP[c]) uniqueCauses.push(CONDITION_MAP[c].cause);
    });
  }
  
  const otherCauses = matchedMappings.map(m => m.cause);
  uniqueCauses = Array.from(new Set([...uniqueCauses, ...otherCauses])).slice(0, 3); // Slightly more if multiple cores

  const causes = uniqueCauses.map(c => ({
    label: c,
    description: CAUSE_MAP_USER[c] || c
  }));

  // 6. Map Conclusions (Max 2-3)
  let resultConclusions: string[] = [];
  if (isHighRisk) {
    resultConclusions = [CONCLUSIONS[3]]; // 3. 비개입 / 보류 접근
  } else {
    let conclusionIds: number[] = [];
    if (coreConditions.length > 0) {
      coreConditions.forEach(c => {
        if (CONDITION_MAP[c]) conclusionIds = [...conclusionIds, ...CONDITION_MAP[c].conclusions];
      });
    }
    
    const otherIds = matchedMappings.flatMap(m => m.conclusions);
    const uniqueIds = Array.from(new Set([...conclusionIds, ...otherIds])).slice(0, 3);
    resultConclusions = uniqueIds.map(id => `${id}. ${CONCLUSIONS[id]}`);
  }

  return {
    zone: zone,
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
