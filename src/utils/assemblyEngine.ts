export interface AssemblyResult {
  sectorAdviceMap: Record<string, string>;
  sectorAdviceArr: string[];
  extraAdviceText: string;
}

/**
 * ASMS v4.8.2 Assembly Engine
 * Refined combination logic with "One-Shot Replace" and deduplication.
 */
export function calculateResults(
  sectors: any[],
  questions: any[],
  scripts: any[],
  answers: Record<string, any>,
  activeQuestionIds: string[],
  calculatedAgeGroup: string,
  combinationsJson: any[]
): AssemblyResult {
  const sectorAdviceMap: Record<string, string> = {};
  const sectorAdviceArr: string[] = [];
  const satisfiedVars: Record<string, { content: string; title: string }> = {};
  const usedInCombination = new Set<string>();

  // 1. Calculate Scores and Match Scripts
  for (const sector of sectors) {
    let oScoreSum = 0;
    const activeSectorQs = questions.filter(
      (q) => q.sector_id === sector.id && activeQuestionIds.includes(q.id)
    );

    for (const q of activeSectorQs) {
      if (q.type === 'o_x' && answers[q.id] === 'O') {
        oScoreSum += Number(q.o_score || 0);
      }
      if (q.type === 'multiple_choice' && answers[q.id]) {
        const optStr = answers[q.id];
        if (typeof optStr === 'string' && optStr.includes('||')) {
          oScoreSum += Number(optStr.split('||')[1] || 0);
        }
      }
    }

    let multiplier = 1.0;
    if (calculatedAgeGroup === '20s') multiplier = sector.multiplier_20s;
    else if (calculatedAgeGroup === '30s') multiplier = sector.multiplier_30s;
    else if (calculatedAgeGroup === '40s') multiplier = sector.multiplier_40s;

    const finalScore = (oScoreSum + Number(sector.base_score)) * Number(multiplier);

    const scriptMatch = scripts.find(
      (s) =>
        s.sector_id === sector.id &&
        finalScore >= s.min_score &&
        finalScore <= s.max_score
    );

    if (scriptMatch && scriptMatch.content) {
      const trimmedContent = scriptMatch.content.trim();
      const vName =
        scriptMatch.variable_name && scriptMatch.variable_name.trim()
          ? scriptMatch.variable_name.trim()
          : sector.title.trim();

      satisfiedVars[vName] = { content: trimmedContent, title: sector.title };
    }
  }

  // 2. Process Combinations (v4.8.2 One-Shot Replace / In-place Overwrite)
  const comboRules = combinationsJson || [];
  
  // Helper to normalize variable names (for robust matching)
  const normalize = (v: string) => v ? v.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : '';

  // Initialize map with individual script contents
  // We populate the map first so that combinations can overwrite them even if they use sector titles
  Object.keys(satisfiedVars).forEach(vn => {
    sectorAdviceMap[vn] = satisfiedVars[vn].content;
  });

  // Log for debugging (User can see this in browser console)
  console.log('[AssemblyEngine] Satisfied Variables:', satisfiedVars);
  console.log('[AssemblyEngine] Initial Map:', { ...sectorAdviceMap });

  // Map normalized keys to original keys for replacement
  const keyMap: Record<string, string> = {}; 
  Object.keys(satisfiedVars).forEach(k => { keyMap[normalize(k)] = k; });
  const satisfiedKeys = Object.keys(keyMap);

  comboRules.forEach((rule: any, idx: number) => {
    let rawVns: string[] = [];
    if (Array.isArray(rule.variable_names)) {
      rawVns = rule.variable_names;
    } else if (typeof rule.variable_names === 'string') {
      rawVns = rule.variable_names.split(',').map((v: string) => v.trim()).filter(Boolean);
    }

    if (rawVns.length < 2) return;

    const normalizedVns = rawVns.map(v => normalize(v));
    const allSatisfied = normalizedVns.every(nv => satisfiedKeys.includes(nv));

    console.log(`[AssemblyEngine] Rule #${idx} (${rawVns.join(',')}):`, allSatisfied ? 'MATCHED' : 'NOT MATCHED');

    if (allSatisfied) {
      const comboText = rule.combined_content.trim();
      
      normalizedVns.forEach((nv, index) => {
        const originalKey = keyMap[nv];
        if (index === 0) {
          sectorAdviceMap[originalKey] = comboText;
        } else {
          sectorAdviceMap[originalKey] = ''; // Deduplication: Clear other slots
        }
        usedInCombination.add(originalKey);
      });
    }
  });

  // 3. Build sectorAdviceArr from non-empty map values
  // We preserve the order of sectors as they appear in the sectors list
  sectors.forEach(sector => {
    // Find if this sector produced a variable (either by its title or its script's variable_name)
    const varNamesForSector = Object.keys(satisfiedVars).filter(
      vn => satisfiedVars[vn].title === sector.title
    );

    varNamesForSector.forEach(vn => {
      const finalContent = sectorAdviceMap[vn];
      if (finalContent && finalContent.trim() !== '') {
        sectorAdviceArr.push(finalContent);
      }
    });
  });

  console.log('[AssemblyEngine] Final Result Map:', sectorAdviceMap);
  console.log('[AssemblyEngine] Final Result Array:', sectorAdviceArr);

  // 4. Collect Extra Advices based on Options
  let extraAdviceArr: string[] = [];
  for (const q of questions) {
    if (!activeQuestionIds.includes(q.id)) continue;
    const ans = answers[q.id];
    if (!ans || !q.options_extra_advices) continue;

    if (Array.isArray(ans)) {
      ans.forEach((val) => {
        if (q.options_extra_advices[val]) {
          extraAdviceArr.push(q.options_extra_advices[val].trim());
        }
      });
    } else if (q.type === 'multiple_choice' && typeof ans === 'string') {
      const label = ans.includes('||') ? ans.split('||')[0] : ans;
      if (q.options_extra_advices[label]) {
        extraAdviceArr.push(q.options_extra_advices[label].trim());
      }
    } else {
      if (q.options_extra_advices[ans]) {
        extraAdviceArr.push(q.options_extra_advices[ans].trim());
      }
    }
  }
  const uniqueExtraAdvices = Array.from(new Set(extraAdviceArr.filter(Boolean)));
  const extraAdviceText = uniqueExtraAdvices.length > 0 ? uniqueExtraAdvices.map((text) => `• ${text}`).join('\n') : '';

  return {
    sectorAdviceMap,
    sectorAdviceArr,
    extraAdviceText,
  };
}
