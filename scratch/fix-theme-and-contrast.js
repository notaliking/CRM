const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/components/SidebarLayout.tsx',
  'src/app/settings/page.tsx',
  'src/app/portal/page.tsx',
  'src/app/page.tsx',
  'src/app/leads/page.tsx',
  'src/app/inventory/page.tsx',
  'src/app/incoming/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/chats/page.tsx'
];

// Mappings for invalid Tailwind classes to standard ones
const replacements = [
  // Indigo to Blue theme
  { pattern: /indigo-950/g, replacement: 'blue-950' },
  { pattern: /indigo-900/g, replacement: 'blue-900' },
  { pattern: /indigo-850/g, replacement: 'blue-900' },
  { pattern: /indigo-800/g, replacement: 'blue-800' },
  { pattern: /indigo-755/g, replacement: 'blue-700' },
  { pattern: /indigo-700/g, replacement: 'blue-700' },
  { pattern: /indigo-650/g, replacement: 'blue-600' },
  { pattern: /indigo-600/g, replacement: 'blue-600' },
  { pattern: /indigo-500/g, replacement: 'blue-500' },
  { pattern: /indigo-455/g, replacement: 'blue-400' },
  { pattern: /indigo-450/g, replacement: 'blue-400' },
  { pattern: /indigo-400/g, replacement: 'blue-400' },
  { pattern: /indigo-350/g, replacement: 'blue-400' },
  { pattern: /indigo-300/g, replacement: 'blue-300' },
  { pattern: /indigo-200/g, replacement: 'blue-200' },
  { pattern: /text-indigo-400/g, replacement: 'text-blue-400' },
  { pattern: /text-indigo-600/g, replacement: 'text-blue-600' },
  { pattern: /bg-indigo-600/g, replacement: 'bg-blue-600' },
  { pattern: /border-indigo-500/g, replacement: 'border-blue-500' },
  
  // Slate corrections
  { pattern: /slate-955/g, replacement: 'slate-900' },
  { pattern: /slate-855/g, replacement: 'slate-800' },
  { pattern: /slate-755/g, replacement: 'slate-700' },
  { pattern: /slate-650/g, replacement: 'slate-500' },
  { pattern: /slate-455/g, replacement: 'slate-400' },
  { pattern: /slate-450/g, replacement: 'slate-400' },
  { pattern: /slate-350/g, replacement: 'slate-400' },
  { pattern: /slate-205/g, replacement: 'slate-200' },

  // Emerald corrections
  { pattern: /emerald-650/g, replacement: 'emerald-600' },
  { pattern: /emerald-505/g, replacement: 'emerald-500' },
  { pattern: /emerald-455/g, replacement: 'emerald-400' },

  // Rose corrections
  { pattern: /rose-650/g, replacement: 'rose-600' },
  { pattern: /rose-455/g, replacement: 'rose-400' }
];

function fixFiles() {
  for (const relativePath of filesToFix) {
    const absolutePath = path.resolve(__dirname, '..', relativePath);
    if (!fs.existsSync(absolutePath)) {
      console.warn(`File not found: ${absolutePath}`);
      continue;
    }

    let content = fs.readFileSync(absolutePath, 'utf8');
    let original = content;

    for (const { pattern, replacement } of replacements) {
      content = content.replace(pattern, replacement);
    }

    if (content !== original) {
      fs.writeFileSync(absolutePath, content, 'utf8');
      console.log(`Successfully updated theme and contrast in: ${relativePath}`);
    } else {
      console.log(`No changes needed in: ${relativePath}`);
    }
  }
}

fixFiles();
