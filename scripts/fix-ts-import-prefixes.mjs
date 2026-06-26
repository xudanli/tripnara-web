#!/usr/bin/env node
/** Fix bad _ prefixes in import specifiers (from over-aggressive unused fix). */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
let tscOut = '';
try {
  tscOut = execSync('yarn tsc --noEmit 2>&1', { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
} catch (e) {
  tscOut = e.stdout || e.message || '';
}

const importErrors = tscOut.split('\n').filter((l) => l.includes('TS2724') && l.includes('Did you mean'));
const setterErrors = tscOut.split('\n').filter((l) => l.includes('TS2304') && l.includes('set'));

const filesToFix = new Set();

for (const err of importErrors) {
  const m = err.match(/^(src\/[^(]+)\((\d+)/);
  if (m) filesToFix.add(m[1]);
}

// Also scan all src for _Prefixed imports in import lines
function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules') walk(p, acc);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

let fixed = 0;
for (const filePath of walk(path.join(root, 'src'))) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Remove _Name from import { ... } lines
  content = content.replace(/^(\s*import\s+(?:type\s+)?\{)([^}]+)(\}\s+from\s+.+)$/gm, (full, start, middle, end) => {
    const parts = middle.split(',').map((p) => p.trim()).filter(Boolean);
    const filtered = parts.filter((p) => !/^_\w+/.test(p.replace(/^type\s+/, '')));
    if (filtered.length === parts.length) return full;
    changed = true;
    if (filtered.length === 0) return '';
    return `${start} ${filtered.join(', ')} ${end}`;
  });

  // Fix useState: [_foo, _setFoo] where setFoo is used -> [_foo, setFoo]
  content = content.replace(
    /\[(\s*_\w+\s*,\s*)_(set[A-Z]\w+)\s*\]/g,
    (m, prefix, setter) => {
      const bare = setter.slice(1);
      if (content.includes(bare)) {
        changed = true;
        return `[${prefix}${bare}]`;
      }
      return m;
    }
  );

  if (changed) {
    fs.writeFileSync(filePath, content.replace(/\n\n\n+/g, '\n\n'));
    fixed++;
  }
}

console.log(`Fixed import/setter issues in ${fixed} files`);
