#!/usr/bin/env node
/**
 * Auto-fix TS6133/6196/6192 — removes unused imports, prefixes unused locals/params.
 * Never prefixes import specifiers.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();

function getErrors() {
  try {
    execSync('yarn tsc --noEmit 2>&1', { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    return '';
  } catch (e) {
    return e.stdout || '';
  }
}

function removeFromNamedImport(line, name) {
  const importMatch = line.match(/^(\s*import\s+(?:type\s+)?\{)([^}]+)(\}\s+from\s+['"][^'"]+['"];?\s*)$/);
  if (importMatch) {
    const [, start, middle, end] = importMatch;
    const parts = middle.split(',').map((p) => p.trim()).filter(Boolean);
    const filtered = parts.filter((p) => {
      const bare = p.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
      return bare !== name;
    });
    if (filtered.length === 0) return null;
    return `${start} ${filtered.join(', ')} ${end}`;
  }
  if (line.match(new RegExp(`^\\s*import\\s+${name}\\s+from\\s+`))) return null;
  if (line.match(new RegExp(`^\\s*import\\s+type\\s+${name}\\s+from\\s+`))) return null;
  return line;
}

function prefixIdentifier(line, name) {
  if (line.trim().startsWith('import ')) return line;
  if (line.includes(`${name}:`)) return line;

  const destructureRe = new RegExp(`(\\{[^}]*?)\\b${name}\\b([^}]*\\})`);
  if (destructureRe.test(line) && !line.includes(`${name}:`)) {
    return line.replace(new RegExp(`\\b${name}\\b(?=\\s*[,}])`), `${name}: _${name}`);
  }

  const paramRe = new RegExp(`([(,]\\s*)\\b${name}\\b(?=\\s*[:,)])`);
  if (paramRe.test(line)) return line.replace(paramRe, `$1_${name}`);

  const setter = `set${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  const useStateRe = new RegExp(
    `\\[\\s*${name}\\s*,\\s*${setter}\\s*\\]|\\[\\s*_${name}\\s*,\\s*${setter}\\s*\\]`
  );
  if (useStateRe.test(line)) {
    return line.replace(new RegExp(`\\b${name}\\b`), `_${name}`);
  }

  const declRe = new RegExp(`\\b(const|let|var)\\s+${name}\\b`);
  if (declRe.test(line)) return line.replace(new RegExp(`\\b${name}\\b`), `_${name}`);

  if (new RegExp(`\\b${name}\\b`).test(line)) {
    return line.replace(new RegExp(`\\b${name}\\b`), `_${name}`);
  }
  return line;
}

let totalFixed = 0;
for (let round = 0; round < 3; round++) {
  const out = getErrors();
  const unusedErrors = out.split('\n').filter(
    (e) => e.includes('TS6133') || e.includes('TS6196') || e.includes('TS6192')
  );
  if (unusedErrors.length === 0) break;

  const byFile = new Map();
  for (const err of unusedErrors) {
    const m = err.match(/^(src\/[^(]+)\((\d+),\d+\): error TS\d+: (.+)$/);
    if (!m) continue;
    const [, file, line, msg] = m;
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push({ line: parseInt(line, 10), msg });
  }

  for (const [relFile, fileErrors] of byFile) {
    const filePath = path.join(root, relFile);
    if (!fs.existsSync(filePath)) continue;
    let lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const { line, msg } of [...fileErrors].sort((a, b) => b.line - a.line)) {
      const idx = line - 1;
      if (idx < 0 || idx >= lines.length) continue;
      const original = lines[idx];
      if (msg.includes('All imports in import declaration are unused')) {
        lines.splice(idx, 1);
        totalFixed++;
        continue;
      }
      const nameMatch = msg.match(/'([^']+)'/);
      if (!nameMatch) continue;
      const name = nameMatch[1];
      if (original.trim().startsWith('import ')) {
        const updated = removeFromNamedImport(original, name);
        if (updated === null) lines.splice(idx, 1);
        else if (updated !== original) lines[idx] = updated;
        totalFixed++;
      } else {
        const updated = prefixIdentifier(original, name);
        if (updated !== original) {
          lines[idx] = updated;
          totalFixed++;
        }
      }
    }
    fs.writeFileSync(filePath, lines.join('\n'));
  }
}

console.log(`Applied ${totalFixed} unused fixes`);
