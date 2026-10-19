// Refresh the standalone site's geometry from an explicitly supplied app export.
// The generated TS is checked in: ordinary site builds do not need the app repository.
import { readFileSync, writeFileSync } from 'node:fs';
if (!process.argv[2]) throw new Error('Usage: node scripts/import-ticks.mjs /path/to/generated/tin_ticks.rs');
const rust = readFileSync(process.argv[2], 'utf8');
const names = ['SW', 'DX', 'GAP', 'VB_X', 'VB_W', 'VB_H', 'FRAME_HZ', 'TICK', 'SLACK', 'PULL', 'PLUCK'];
const lines = names.map(name => {
  const value = rust.match(new RegExp(`pub const ${name}: [^=]+ = ([^;]+);`))?.[1];
  if (!value) throw new Error(`Missing tick constant: ${name}`);
  return `export const ${name} = ${value.replace(/^&/, '')};`;
});
writeFileSync(new URL('../playground/src/lib/ui/ticks.gen.ts', import.meta.url),
  '// Generated from tin-icons/generated/tin_ticks.rs by scripts/import-ticks.mjs.\n' + lines.join('\n') + '\n');
