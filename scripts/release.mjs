// Gera os pacotes de uma versão em releases/vX.Y.Z/:
//   1. Source  — todos os arquivos do projeto (inclui CLAUDE.md, .claude/ e histórico git)
//   2. Dist    — só o necessário para rodar (build + inicializador sem Node)
//   3. Mobile  — só quando existem arquivos que precisam ir para o celular (pasta mobile/)
// Também gera RELEASE.txt (resumo + SHA-256) e NOTES.md (trecho do CHANGELOG).
//
// Uso: npm run release            (roda o build antes)
//      npm run release -- --skip-build
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
const version = pkg.version;
const tag = `v${version}`;
const name = 'skz-pocadex';
const outDir = join(ROOT, 'releases', tag);

/** Pastas que nunca entram no Source (são regeneradas por npm ci / build / release). */
const SOURCE_EXCLUDE = new Set(['node_modules', 'dist', 'releases']);

function walk(dir, exclude = new Set()) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (exclude.has(entry.name) && dir === ROOT) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

/** Monta um zip a partir de pares [caminhoNoZip, caminhoNoDisco | Buffer]. */
function makeZip(entries) {
  const tree = {};
  for (const [zipPath, src] of entries) {
    const data = typeof src === 'string' ? readFileSync(src) : src;
    const mtime = typeof src === 'string' ? statSync(src).mtime : new Date();
    tree[zipPath.split(sep).join('/')] = [new Uint8Array(data), { mtime }];
  }
  return Buffer.from(zipSync(tree, { level: 9 }));
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function changelogSection() {
  const log = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf-8');
  const start = log.indexOf(`## [${version}]`);
  if (start < 0) return null;
  const next = log.indexOf('\n## [', start + 1);
  return log.slice(start, next < 0 ? undefined : next).trim();
}

// ---------- verificações ----------
const notes = changelogSection();
if (!notes) {
  console.error(`❌ O CHANGELOG.md não tem a seção "## [${version}]". Documente a versão antes de publicar.`);
  process.exit(1);
}
if (!process.argv.includes('--skip-build')) {
  console.log('▶ Gerando o build…');
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
}
if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('❌ dist/ não encontrado. Rode sem --skip-build.');
  process.exit(1);
}
try {
  const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
  if (dirty) console.warn('⚠ Há alterações não commitadas — elas entram no pacote Source, mas não na tag.');
} catch {
  /* sem git */
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const results = [];

// ---------- 1. Source ----------
{
  const files = walk(ROOT, SOURCE_EXCLUDE);
  const zip = makeZip(files.map((f) => [join(name, relative(ROOT, f)), f]));
  const file = `${name}-${tag}-source.zip`;
  writeFileSync(join(outDir, file), zip);
  results.push({ file, label: 'Source', size: zip.length, hash: sha256(zip), count: files.length });
}

// ---------- 2. Dist ----------
{
  const folder = `${name}-${tag}-dist`;
  const appFiles = walk(join(ROOT, 'dist'));
  const entries = appFiles.map((f) => [join(folder, 'app', relative(join(ROOT, 'dist'), f)), f]);
  const pack = join(ROOT, 'packaging', 'dist');
  for (const f of walk(pack)) {
    const rel = relative(pack, f);
    const content = readFileSync(f, 'utf-8').replaceAll('{{VERSION}}', version);
    entries.push([join(folder, rel), Buffer.from(content, 'utf-8')]);
  }
  const zip = makeZip(entries);
  const file = `${folder}.zip`;
  writeFileSync(join(outDir, file), zip);
  results.push({ file, label: 'Dist', size: zip.length, hash: sha256(zip), count: entries.length });
}

// ---------- 3. Mobile ----------
let mobileNote;
const mobileDir = join(ROOT, 'mobile');
if (existsSync(mobileDir) && walk(mobileDir).length) {
  const files = walk(mobileDir);
  const zip = makeZip(files.map((f) => [join(`${name}-${tag}-mobile`, relative(mobileDir, f)), f]));
  const file = `${name}-${tag}-mobile.zip`;
  writeFileSync(join(outDir, file), zip);
  results.push({ file, label: 'Mobile', size: zip.length, hash: sha256(zip), count: files.length });
  mobileNote = 'Pacote Mobile gerado a partir da pasta mobile/.';
} else {
  mobileNote =
    'Pacote Mobile não gerado: nenhum arquivo precisa ir para o celular. O app é instalável (PWA) — ' +
    'abra o endereço publicado no celular e use "Adicionar à Tela de Início" (iPhone) ou "Instalar app" (Android).';
}

// ---------- resumo ----------
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const summary = [
  `SKZ Pocadex ${tag}`,
  `Gerado em ${new Date().toISOString()}`,
  '',
  ...results.map((r) => `${r.label.padEnd(7)} ${r.file}  (${kb(r.size)}, ${r.count} arquivos)\n        SHA-256 ${r.hash}`),
  '',
  `Mobile  ${mobileNote}`,
  '',
].join('\n');
writeFileSync(join(outDir, 'RELEASE.txt'), summary);
writeFileSync(join(outDir, 'NOTES.md'), `${notes}\n\n---\n\n**Pacotes**\n\n${results.map((r) => `- **${r.label}**: \`${r.file}\``).join('\n')}\n- **Mobile**: ${mobileNote}\n`);

console.log(`\n✔ Pacotes em releases/${tag}/\n`);
console.log(summary);
