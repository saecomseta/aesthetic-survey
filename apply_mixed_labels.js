const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/survey/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace Step 2 symptoms label
content = content.replace(
  /<span className="text-\[14px\] font-medium leading-tight">\{CONDITION_DISPLAY_MAP\[item\] || item\}<\/span>/g,
  '{renderMixedLabel(CONDITION_DISPLAY_MAP[item] || item, "text-[14px]", "text-[11px]")}'
);

// Replace Step 2-Conclusion core reaction label
content = content.replace(
  /<span className="text-lg font-medium">\{CONDITION_DISPLAY_MAP\[item\] || item\}<\/span>/g,
  '{renderMixedLabel(CONDITION_DISPLAY_MAP[item] || item, "text-lg", "text-[13px]")}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Applied mixed label rendering to Step 2 and Conclusion');
