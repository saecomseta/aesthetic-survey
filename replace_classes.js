const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/components/AdminQRDashboard.tsx',
  'src/components/SuperAdminDashboard.tsx',
  'src/components/LogicViewer.tsx',
  'src/components/TargetScriptEditor.tsx',
  'src/app/admin/main/page.tsx',
  'src/app/survey/[id]/page.tsx',
  'src/app/admin/dashboard/page.tsx',
  'src/app/admin/logic/page.tsx',
  'src/app/admin/responses/page.tsx',
  'src/app/admin/surveys/[id]/page.tsx',
  'src/app/admin/surveys/new/page.tsx'
];

targetFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace white backgrounds
  content = content.replace(/bg-white\//g, 'TEMP_WHITE_ALPHA'); // preserve existing white/5 etc.
  content = content.replace(/bg-white/g, 'bg-transparent');
  content = content.replace(/TEMP_WHITE_ALPHA/g, 'bg-white/');

  // Replace gray/beige backgrounds
  content = content.replace(/bg-gray-50/g, 'bg-white/5');
  content = content.replace(/bg-gray-100/g, 'bg-white/5');
  content = content.replace(/bg-gray-200/g, 'bg-white/10');
  content = content.replace(/bg-gray-800/g, 'bg-black/20');
  content = content.replace(/bg-beige-50/g, 'bg-transparent');
  content = content.replace(/bg-beige-100/g, 'bg-white/5');
  content = content.replace(/bg-red-50/g, 'bg-red-900/30');

  // Replace text colors
  content = content.replace(/text-gray-900/g, 'text-brand-text');
  content = content.replace(/text-gray-800/g, 'text-brand-text');
  content = content.replace(/text-gray-700/g, 'text-brand-text/90');
  content = content.replace(/text-gray-600/g, 'text-brand-text/80');
  content = content.replace(/text-gray-500/g, 'text-brand-text/70');
  content = content.replace(/bg-primary-900/g, 'bg-black/20'); // Dark sections
  content = content.replace(/bg-primary-600/g, 'glass-button'); // Primary buttons
  content = content.replace(/bg-primary-500/g, 'bg-brand-text text-brand-dark'); // Active state buttons
  content = content.replace(/bg-primary-50/g, 'bg-white/5'); // Light accent bg
  content = content.replace(/bg-gray-50/g, 'bg-black/10'); // Input bg
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated classes in ${file}`);
});
