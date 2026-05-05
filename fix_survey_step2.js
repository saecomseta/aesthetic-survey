const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/survey/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix symptom item label in Step 2
content = content.replace(
  /<span className="text-\[15px\] font-medium">\{item\}<\/span>/g,
  '<span className="text-[14px] font-medium leading-tight">{CONDITION_DISPLAY_MAP[item] || item}</span>'
);

// Fix checkbox border in Step 2
content = content.replace(
  /className={`w-5 h-5 rounded flex items-center justify-center border \${isSelected \? 'border-primary-500 bg-brand-text text-brand-dark' : 'border-gray-200'}`}/g,
  'className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? \'border-white bg-brand-text text-brand-dark\' : \'border-white/10\'}`}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Step 2 items');
