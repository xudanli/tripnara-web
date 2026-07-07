import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportConstraintTemplateCatalog } from '../src/trips/trip-constraint-solver/utils/constraint-template-registry.util.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(
  root,
  'src/trips/trip-constraint-solver/schemas/constraint-template-registry.json',
);

writeFileSync(outPath, `${JSON.stringify(exportConstraintTemplateCatalog(), null, 2)}\n`);
console.log(`Wrote ${outPath}`);
