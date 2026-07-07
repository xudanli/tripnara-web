#!/usr/bin/env node
/** decision-problems 面：amber/orange 铺底 → 中性面 + gate-confirm/warning 字色 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('src/components/decision-problems');

const REPLACEMENTS = [
  ['border-amber-200/90 bg-amber-50/80', 'border-border bg-muted/15'],
  ['border-amber-200/80 bg-amber-50/80', 'border-border bg-muted/15'],
  ['border-amber-200/70 bg-background/70', 'border-border bg-card'],
  ['border-amber-200/60 bg-amber-50/40', 'border-border bg-muted/15'],
  ['border-amber-200/60 bg-amber-50/40 p-2.5 dark:border-amber-900/50 dark:bg-amber-950/25', 'border-border bg-muted/15 p-2.5'],
  ['border-amber-200/60 bg-amber-50/40 p-2.5', 'border-border bg-muted/15 p-2.5'],
  ['border-amber-200/80 bg-background/50', 'border-border bg-card'],
  ['border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30', 'border-border bg-muted/15'],
  ['border-amber-200/80 bg-amber-50/40 text-amber-950', 'border-border bg-muted/15 text-foreground'],
  ['border-orange-200 bg-orange-50 text-orange-950', 'border-border bg-muted/15 text-foreground'],
  ['text-amber-950 dark:text-amber-100', 'text-foreground'],
  ['text-amber-950', 'text-foreground'],
  ['text-amber-900/80', 'text-muted-foreground'],
  ['text-amber-900', 'text-foreground'],
  ['text-amber-800 dark:text-amber-200', 'text-gate-confirm-foreground'],
  ['text-amber-800', 'text-gate-confirm-foreground'],
  ['text-amber-700/70', 'text-muted-foreground'],
  ['text-amber-700', 'text-warning'],
  ['text-amber-600', 'text-warning'],
  ['border-amber-200 text-amber-800', 'border-border text-gate-confirm-foreground'],
  ['border-amber-300/80', 'border-border'],
  ['border-amber-400', 'border-border'],
  ['border-amber-300', 'border-border'],
  ['border-amber-200', 'border-border'],
  ['bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200', 'bg-muted text-gate-confirm-foreground'],
  ['bg-amber-100', 'bg-muted'],
  ['hover:bg-amber-100/80', 'hover:bg-muted/30'],
  ['hover:border-amber-300', 'hover:border-border'],
  ['dark:border-amber-800/60', 'dark:border-border'],
  ['dark:border-amber-900/50', 'dark:border-border'],
  ['dark:bg-amber-950/25', 'dark:bg-muted/15'],
  ['dark:bg-amber-950/30', 'dark:bg-muted/15'],
  ['dark:bg-amber-900/50', 'dark:bg-muted/20'],
];

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir)) {
    const f = path.join(dir, e);
    if (fs.statSync(f).isDirectory()) walk(f, files);
    else if (/\.tsx?$/.test(f)) files.push(f);
  }
  return files;
}

let total = 0;
for (const file of walk(DIR)) {
  let c = fs.readFileSync(file, 'utf8');
  const o = c;
  for (const [a, b] of REPLACEMENTS) c = c.split(a).join(b);
  if (c !== o) {
    fs.writeFileSync(file, c);
    total += REPLACEMENTS.reduce((n, [a]) => n + o.split(a).length - 1, 0);
    console.log(path.relative(process.cwd(), file));
  }
}
console.log(`\nMigrated ${total} amber/orange replacements in decision-problems.`);
