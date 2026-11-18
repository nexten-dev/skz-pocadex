// Diagnóstico: mostra como as pastas do Drive (data/drive-sources.json) estão organizadas.
// Uso: node scripts/drive-probe.mjs [idDaPasta...]
import { readFileSync } from 'node:fs';
import { crawl } from './drive.mjs';

const cfg = JSON.parse(readFileSync(new URL('../data/drive-sources.json', import.meta.url), 'utf-8'));
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const roots = ids.length ? ids : cfg.folders;

for (const root of roots) {
  console.log(`\n================ pasta ${root}`);
  let folders = 0;
  const files = await crawl(root, {
    onFolder: (node, path) => {
      folders++;
      const sample = node.files.slice(0, 6).map((f) => f.name).join(' | ');
      console.log(
        `${'  '.repeat(Math.max(0, path.length - 1))}📁 ${path.at(-1)}  (${node.folders.length} pastas, ${node.files.length} arquivos)` +
          (node.error ? `  ERRO: ${node.error}` : '') +
          (sample ? `\n${'  '.repeat(path.length)}   ex.: ${sample}` : ''),
      );
    },
  });
  const ext = {};
  for (const f of files) {
    const e = (f.name.match(/\.(\w+)$/)?.[1] ?? '(sem extensão)').toLowerCase();
    ext[e] = (ext[e] ?? 0) + 1;
  }
  console.log(`== total: ${folders} pastas, ${files.length} arquivos; extensões: ${JSON.stringify(ext)}`);
}
