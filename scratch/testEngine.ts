import { calculateFirstSessionDecision, FirstSessionInput } from '../src/utils/firstSessionEngine';

const example1: FirstSessionInput = {
  ageGroup: '30대',
  skinThickness: '얇은 편',
  tissueType: '부드러운 편',
  symptoms: ['염증성 구진', '색소 잔존'],
  primaryCause: '마찰', // '마찰' and '손으로 만짐' are in logic, but input takes primary
  riskGrade: 'R2',
  pigmentHigh: true,
  historyOfEasyMarking: false
};

const example2: FirstSessionInput = {
  ageGroup: '20대',
  skinThickness: '두꺼운 편',
  tissueType: '단단한 편',
  symptoms: ['화이트헤드', '각질 정체', '거칠음'],
  primaryCause: '각질 누적',
  riskGrade: 'R1'
};

console.log('--- Example 1 ---');
console.log(JSON.stringify(calculateFirstSessionDecision(example1), null, 2));

console.log('\n--- Example 2 ---');
console.log(JSON.stringify(calculateFirstSessionDecision(example2), null, 2));
