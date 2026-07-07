#!/usr/bin/env node
/**
 * 产品面：nara-glacier / nara-tundra → 中性 + gate/success
 * Layer B 白名单：website、odyssey-intake、full-journey-map、map 组件、ExecuteRouteMap
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');

const EXCLUDE_PATH_PARTS = [
  '/features/odyssey-intake/',
  '/features/full-journey-map/',
  '/pages/website/',
  '/components/map/',
  '/styles/globals.css',
  '/lib/brand-map-colors.ts',
];

const EXCLUDE_FILES = [
  'ExecuteRouteMap.tsx',
  'MbtiSelfSelectStep.tsx',
  'premium-stress-test.ts',
  'persona-themes.ts',
  'build-identity-card.ts',
];

const REPLACEMENTS = [
  ['dark:text-nara-glacier-foreground', 'dark:text-muted-foreground'],
  ['text-nara-glacier-foreground/90', 'text-muted-foreground'],
  ['text-nara-glacier-foreground', 'text-muted-foreground'],
  ['border-nara-glacier-border/90', 'border-border/90'],
  ['border-nara-glacier-border/80', 'border-border/80'],
  ['border-nara-glacier-border/70', 'border-border/70'],
  ['border-nara-glacier-border/60', 'border-border/60'],
  ['border-nara-glacier-border/55', 'border-border/55'],
  ['border-nara-glacier-border/40', 'border-border/40'],
  ['border-nara-glacier-border/25', 'border-border/25'],
  ['border-nara-glacier-border/20', 'border-border/20'],
  ['border-nara-glacier-border/15', 'border-border/15'],
  ['border-nara-glacier-border', 'border-border'],
  ['bg-nara-glacier-muted/80', 'bg-muted/20'],
  ['bg-nara-glacier-muted/60', 'bg-muted/15'],
  ['bg-nara-glacier-muted/50', 'bg-muted/15'],
  ['bg-nara-glacier-muted/40', 'bg-muted/15'],
  ['bg-nara-glacier-muted/30', 'bg-muted/15'],
  ['bg-nara-glacier-muted/25', 'bg-muted/15'],
  ['bg-nara-glacier-muted/20', 'bg-muted/15'],
  ['bg-nara-glacier-muted/10', 'bg-muted/10'],
  ['bg-nara-glacier-muted', 'bg-muted/15'],
  ['bg-nara-glacier/70', 'bg-foreground/50'],
  ['bg-nara-glacier/15', 'bg-muted/15'],
  ['bg-nara-glacier/10', 'bg-muted/10'],
  ['from-nara-glacier-muted/90', 'from-muted/15'],
  ['from-nara-glacier-muted/80', 'from-muted/15'],
  ['from-nara-glacier-muted/60', 'from-muted/15'],
  ['from-nara-glacier-muted', 'from-muted/15'],
  ['to-nara-glacier-muted', 'to-muted/15'],
  ['via-nara-glacier-muted', 'via-muted/15'],
  ['dark:from-nara-glacier-muted/25', 'dark:from-muted/15'],
  ['fill-nara-glacier/30', 'fill-muted-foreground/20'],
  ['fill-nara-glacier', 'fill-muted-foreground'],
  [
    'rounded-full bg-nara-glacier-foreground hover:bg-nara-glacier-foreground text-white shadow-sm',
    'rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  ],
  [
    'bg-nara-glacier-foreground hover:bg-nara-glacier-foreground',
    'bg-primary text-primary-foreground hover:bg-primary/90',
  ],
  ['bg-nara-glacier-foreground', 'bg-muted-foreground'],
  ['border-l-nara-glacier-foreground/70', 'border-l-border'],
  ['border-l-4 border-l-nara-glacier-foreground', 'border-l-4 border-l-border'],
  ['border-l-nara-glacier-foreground', 'border-l-border'],
  ['ring-nara-glacier-border/80', 'ring-border/80'],
  ['ring-nara-glacier-border', 'ring-border'],
  ['shadow-nara-glacier/25', 'shadow-none'],
  ['border-l-nara-tundra-foreground/70', 'border-l-gate-allow-foreground/70'],
  ['text-nara-tundra-foreground', 'text-gate-allow-foreground'],
  ['border-nara-tundra-border/55', 'border-border/55'],
  ['border-nara-tundra-border/45', 'border-border/45'],
  ['border-nara-tundra-border/30', 'border-border/30'],
  ['border-nara-tundra-border', 'border-border'],
  ['bg-nara-tundra-muted/50', 'bg-muted/15'],
  ['bg-nara-tundra-muted/30', 'bg-muted/15'],
  ['bg-nara-tundra-muted/20', 'bg-muted/15'],
  ['bg-nara-tundra-muted', 'bg-muted/15'],
  ['text-nara-tundra flex-shrink-0', 'text-success flex-shrink-0'],
  ['text-nara-tundra', 'text-success'],
];

function shouldSkip(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (EXCLUDE_PATH_PARTS.some((part) => normalized.includes(part))) return true;
  const base = path.basename(normalized);
  return EXCLUDE_FILES.some((name) => base === name || normalized.endsWith(`/${name}`));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    if (/\.(tsx|ts)$/.test(dir) && !shouldSkip(dir)) files.push(dir);
    return files;
  }
  for (const entry of fs.readdirSync(dir)) {
    walk(path.join(dir, entry), files);
  }
  return files;
}

let total = 0;
let fileCount = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    const count = REPLACEMENTS.reduce((n, [from]) => n + original.split(from).length - 1, 0);
    total += count;
    fileCount += 1;
    console.log(`  ${path.relative(process.cwd(), file)}`);
  }
}
console.log(`\nMigrated ${total} replacements across ${fileCount} files.`);
