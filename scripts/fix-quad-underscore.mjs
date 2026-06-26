#!/usr/bin/env node
/** Fix quadruple-underscore corruption from over-aggressive unused-var script. */
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

let fixed = 0;
for (const filePath of walk(root)) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Destructuring: ____prop, -> prop: _prop,
  content = content.replace(/(\n\s+)____([a-zA-Z]\w*),/g, '$1$2: _$2,');

  // Default param: ____prop = -> prop: _prop =
  content = content.replace(/(\n\s+)____([a-zA-Z]\w*)\s*=/g, '$1$2: _$2 =');

  // const/function declarations: ____name -> _name
  content = content.replace(/\b____([a-zA-Z]\w*)/g, '_$1');

  // void read pattern: const _____ = x -> void x or keep _conversationContext
  content = content.replace(/const _____ = ([^;]+); \/\/ 读取 state 以消除警告/g, 'void $1;');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    fixed++;
  }
}

console.log(`Fixed ${fixed} files`);
