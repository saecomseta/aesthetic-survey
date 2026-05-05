const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/app/admin/responses/page.tsx',
  'src/app/admin/surveys/[id]/page.tsx'
];

targetFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace text colors that are hard to read on brown
  content = content.replace(/text-primary-900/g, 'text-brand-text');
  content = content.replace(/text-primary-800/g, 'text-brand-text');
  content = content.replace(/text-primary-700/g, 'text-brand-text');
  content = content.replace(/text-primary-600/g, 'text-brand-text');
  content = content.replace(/text-blue-600/g, 'text-brand-text');
  content = content.replace(/text-gray-400/g, 'text-brand-text/50');
  content = content.replace(/text-gray-500/g, 'text-brand-text/70');
  content = content.replace(/text-gray-600/g, 'text-brand-text/80');
  content = content.replace(/text-gray-900/g, 'text-brand-text');
  content = content.replace(/text-gray-800/g, 'text-brand-text');
  content = content.replace(/text-gray-700/g, 'text-brand-text/90');
  content = content.replace(/text-black/g, 'text-brand-text');
  
  // Border colors
  content = content.replace(/border-gray-200/g, 'border-white/10');
  content = content.replace(/border-gray-100/g, 'border-white/5');
  
  // Backgrounds that might be missed
  content = content.replace(/bg-white\b/g, 'bg-transparent');
  content = content.replace(/bg-gray-50\b/g, 'bg-white/5');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed dark colors in ${file}`);
});
