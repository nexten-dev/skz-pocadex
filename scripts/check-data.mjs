// Valida public/data/photocards.json e (opcional, com --bump) incrementa dataVersion.
// Uso: npm run data:check | npm run data:bump
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../public/data/photocards.json', import.meta.url);
const db = JSON.parse(readFileSync(FILE, 'utf-8'));
const errors = [];
const memberIds = new Set(db.members.map((m) => m.id));
const releaseIds = new Set();

if (db.schemaVersion !== 1) errors.push(`schemaVersion não suportado: ${db.schemaVersion}`);
for (const r of db.releases) {
  const where = `release "${r.id}"`;
  if (releaseIds.has(r.id)) errors.push(`${where}: id duplicado`);
  releaseIds.add(r.id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) errors.push(`${where}: data inválida (${r.date})`);
  if (!['KR', 'JP', 'TW'].includes(r.market)) errors.push(`${where}: market inválido`);
  for (const m of r.members ?? []) if (!memberIds.has(m)) errors.push(`${where}: membro desconhecido ${m}`);
  const setIds = new Set();
  const CATS = ['photocard', 'pob', 'luckydraw', 'popup', 'inclusion', 'event', 'misc'];
  const FORMATS = ['card', 'wide', 'tall', 'square'];
  for (const s of r.sets ?? []) {
    if (setIds.has(s.id)) errors.push(`${where}: set duplicado ${s.id}`);
    setIds.add(s.id);
    if (s.category && !CATS.includes(s.category)) errors.push(`${where}/${s.id}: categoria inválida ${s.category}`);
    if (s.format && !FORMATS.includes(s.format)) errors.push(`${where}/${s.id}: formato inválido ${s.format}`);
    for (const m of s.members ?? []) if (!memberIds.has(m)) errors.push(`${where}/${s.id}: membro desconhecido ${m}`);
    for (const x of s.extras ?? []) for (const m of x.members ?? []) if (!memberIds.has(m)) errors.push(`${where}/${s.id}: membro desconhecido ${m}`);
  }
}

if (errors.length) {
  console.error('❌ Base de dados inválida:\n - ' + errors.join('\n - '));
  process.exit(1);
}

if (process.argv.includes('--bump')) {
  const today = new Date().toISOString().slice(0, 10);
  const prefix = today.replaceAll('-', '.');
  const [d, n] = [db.dataVersion.split('.').slice(0, 3).join('.'), Number(db.dataVersion.split('.')[3] ?? 0)];
  db.dataVersion = d === prefix ? `${prefix}.${n + 1}` : `${prefix}.1`;
  db.updatedAt = today;
  writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n');
  console.log(`✔ dataVersion → ${db.dataVersion}`);
}
console.log(`✔ Base OK: ${db.releases.length} lançamentos, versão ${db.dataVersion}`);
