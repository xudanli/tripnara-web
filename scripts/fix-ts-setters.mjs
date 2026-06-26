#!/usr/bin/env node
/** Restore _setXxx setters when setXxx is still referenced in the file. */
import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src');

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(tsx?)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const REACT_HOOKS = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'useContext', 'createContext'];
const REACT_TYPES = ['ReactNode', 'ErrorInfo', 'Component', 'FC', 'PropsWithChildren'];

let fixed = 0;
for (const filePath of walk(root)) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix [_val, _setVal] -> [_val, setVal] when setVal is used
  content = content.replace(/\[(\s*_\w+\s*,\s*)_(set[A-Z]\w+)\s*\]/g, (m, prefix, setter) => {
    const bare = setter.slice(1);
    if (content.includes(bare)) {
      changed = true;
      return `[${prefix}${bare}]`;
    }
    return m;
  });

  // Fix standalone _setXxx references when setXxx exists in useState but was wrongly prefixed in usage
  content = content.replace(/\b_(set[A-Z]\w+)\b/g, (m, setter) => {
    const bare = setter.slice(1);
    const decl = new RegExp(`\\[\\s*[^,]+,\\s*${bare}\\s*\\]`);
    if (decl.test(content) && !content.includes(m)) return m;
    if (content.includes(`[`) && content.includes(`, ${bare}]`)) {
      changed = true;
      return bare;
    }
    return m;
  });

  // Add React imports if hooks/types used but not imported
  const usesHooks = REACT_HOOKS.filter((h) => new RegExp(`\\b${h}\\b`).test(content));
  const usesTypes = REACT_TYPES.filter((t) => new RegExp(`\\b${t}\\b`).test(content));
  const hasReactImport = /^import\s+.*from\s+['"]react['"]/m.test(content);

  if ((usesHooks.length || usesTypes.length) && !hasReactImport) {
    const parts = [...usesHooks, ...usesTypes.map((t) => `type ${t}`)];
    const importLine = `import { ${parts.join(', ')} } from 'react';\n`;
    content = importLine + content;
    changed = true;
  } else if (hasReactImport) {
    // Extend existing react import if needed
    content = content.replace(/^import\s+\{([^}]+)\}\s+from\s+['"]react['"];/m, (full, inner) => {
      const existing = inner.split(',').map((s) => s.trim().replace(/^type\s+/, ''));
      const needed = [...usesHooks, ...usesTypes].filter((n) => !existing.includes(n));
      if (needed.length === 0) return full;
      changed = true;
      const typeNeeded = usesTypes.filter((t) => needed.includes(t));
      const hookNeeded = usesHooks.filter((h) => needed.includes(h));
      const additions = [...hookNeeded, ...typeNeeded.map((t) => `type ${t}`)];
      return `import { ${inner.trim()}${inner.trim() ? ', ' : ''}${additions.join(', ')} } from 'react';`;
    });
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    fixed++;
    console.log('fixed', path.relative(root, filePath));
  }
}

console.log(`Done: ${fixed} files`);
