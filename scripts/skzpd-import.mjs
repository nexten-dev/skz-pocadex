// Importa os photocards do SKZPD (https://skzpd.com — Stray Kids Photocard Database,
// por Manyo / github.com/manyodev/skzpd) para a base do app.
//
// Para cada página do SKZPD com conteúdo:
//   - cada bloco de cards vira um set do lançamento, com a FOTO REAL de cada card;
//   - a categoria (photocard, pob, luckydraw, popup, event) é deduzida pelo rótulo;
//   - sets antigos estimados por nós (photocard/pob/luckydraw/popup) são substituídos;
//     os de “itens do álbum” (inclusion) são mantidos;
//   - marcações antigas são preservadas: o script grava em db.idMigrations o
//     mapeamento card antigo → card novo, que o app aplica ao abrir.
//
// Uso: node scripts/skzpd-import.mjs <pasta-do-clone-skzpd> [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { expandRelease, slug } from '../src/lib/expand.js';
import { parseSite } from './skzpd-parse.mjs';

const [dir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dry = process.argv.includes('--dry');
if (!dir) {
  console.error('Uso: node scripts/skzpd-import.mjs <pasta-do-clone-skzpd> [--dry]');
  process.exit(1);
}

const FILE = new URL('../public/data/photocards.json', import.meta.url);
const db = JSON.parse(readFileSync(FILE, 'utf-8'));
const pages = parseSite(dir);
const SITE = 'https://skzpd.com/src/';

const MEMBER = {
  'bang chan': 'bangchan', chan: 'bangchan', 'lee know': 'leeknow', changbin: 'changbin', hyunjin: 'hyunjin',
  han: 'han', felix: 'felix', seungmin: 'seungmin', 'i.n': 'in', jeongin: 'in', woojin: 'woojin',
};

/** Página do SKZPD → lançamento do app (existente ou novo). */
const PAGE_MAP = {
  'mixtape.html': { id: 'mixtape', new: { subtitle: 'Mixtape (pré-estreia)', type: 'mixtape', market: 'KR' } },
  'i-am-not.html': { id: 'i-am-not' },
  'i-am-who.html': { id: 'i-am-who' },
  'i-am-you.html': { id: 'i-am-you' },
  'miroh.html': { id: 'cle-1-miroh' },
  'yellow-wood.html': { id: 'cle-2-yellow-wood' },
  'levanter.html': { id: 'cle-levanter' },
  'go-live.html': { id: 'go-live' },
  'in-life.html': { id: 'in-life' },
  'noeasy.html': { id: 'noeasy' },
  'christmas-evel.html': { id: 'christmas-evel' },
  'oddinary.html': { id: 'oddinary' },
  'maxident.html': { id: 'maxident' },
  '5-star.html': { id: '5-star' },
  'rock-star.html': { id: 'rock-star' },
  'ate.html': { id: 'ate' },
  'hop.html': { id: 'hop' },
  'karma.html': { id: 'karma' },
  'this-and-that.html': { id: 'this-and-that' },
  'hollow.html': { id: 'hollow' },
  'i-am-not-taiwan.html': { id: 'i-am-not-tw', new: { title: 'I Am NOT (Taiwan)', subtitle: 'Edição especial de Taiwan', type: 'special', market: 'TW' } },
  'i-am-you-taiwan.html': { id: 'i-am-you-tw', new: { title: 'I Am YOU (Taiwan)', subtitle: 'Edição especial de Taiwan', type: 'special', market: 'TW' } },
  'yellow-wood-taiwan.html': { id: 'cle-2-yellow-wood-tw', new: { title: 'Clé 2: Yellow Wood (Taiwan)', subtitle: 'Edição especial de Taiwan', type: 'special', market: 'TW' } },
  'i-am-not-unveil.html': { id: 'unveil-i-am-not', new: { title: 'UNVEIL [Op. 01: I am NOT]', subtitle: 'Showcase de estreia', type: 'event', market: 'KR', category: 'event' } },
  'i-am-you-mwave.html': { id: 'mwave-meet-greet-i-am-you', new: { title: 'MEET&GREET — I Am YOU', subtitle: 'Fanmeeting (Mwave)', type: 'event', market: 'KR', category: 'event' } },
  '0th-stay.html': { id: 'fanclub-0th', new: { title: 'Fanclub STAY 0ª geração', subtitle: 'Fanclub oficial', type: 'fanclub', market: 'KR', category: 'event' } },
  '1st-stay.html': { id: 'fanclub-1st', new: { title: 'Fanclub STAY 1ª geração', subtitle: 'Fanclub oficial', type: 'fanclub', market: 'KR', category: 'event' } },
};

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
function parseDate(tags) {
  for (const t of tags) {
    const m = t.toLowerCase().match(/([a-z]+) (\d{1,2}), (\d{4})/);
    if (m && MONTHS[m[1]]) return `${m[3]}-${String(MONTHS[m[1]]).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  return null;
}

/** Categoria pelo rótulo do bloco. */
function classify(label, fallback) {
  const l = label.toLowerCase();
  if (/lucky ?draw/.test(l)) return 'luckydraw';
  if (/pop-?up/.test(l)) return 'popup';
  if (/broadcast|pre-listening|dominate|fanmeeting|concert|nara store|stamp event/.test(l)) return 'event';
  if (/\bpob\b|exclusive|fans shop|nemoz shop|soundwave|aladin|target|walmart|barnes|hmv|tower records|sony music|rakuten|apple music|makestar|withmuu|yes24|music plant|music korea|everline|dear my muse|blue dream|jyp|kpop nation|vinyl|ktown|weverse/.test(l))
    return 'pob';
  return fallback ?? 'photocard';
}

const STORE_RE = /fans shop|nemoz|soundwave|aladin|target|walmart|barnes|hmv|tower records|sony music|rakuten|apple music|makestar|withmuu|yes24|music plant|music korea|everline|dear my muse|blue dream|jyp|kpop nation|ktown|weverse|synnara|interpark|kyobo|hottracks/i;

/** Nome da loja a partir do rótulo (para POBs). */
function storeOf(label) {
  return label
    .replace(/\(?\bpob\b\)?/gi, '')
    .replace(/\s*(lucky ?draw.*|exclusive.*)$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function membersOf(name) {
  if (/^ot\d$/i.test(name.trim())) return [];
  return name
    .split(/\s*(?:&|,|\+)\s*/)
    .map((n) => MEMBER[n.trim().toLowerCase()])
    .filter(Boolean);
}

// ---------- compactação das URLs de imagem ----------
db.imageHosts = {
  inf: { base: 'https://ndc.infludeo.com/media/photocard_blur/', thumb: '?f=auto&q=75&w=320', full: '?f=auto&q=80&w=800' },
  skzpd: { base: 'https://skzpd.com/images/' },
};
// Miniaturas de imagens grandes (scans do SKZPD, Pinterest…) passam por um redimensionador
db.imageProxy = 'https://wsrv.nl/?url={url}&w={w}&output=webp&q=80';
function compact(url) {
  const inf = url.match(/^https:\/\/ndc\.infludeo\.com\/media\/photocard_blur\/([^?]+)/);
  if (inf) return `inf:${inf[1]}`;
  if (url.startsWith('../images/')) return `skzpd:${url.slice('../images/'.length)}`;
  return url;
}

const GENERIC = /^(unit|set|none|double-sided|photocard|polaroid|pob)$/i;
const KEEP_OLD = new Set(['inclusion']);
db.idMigrations ??= {};
const report = [];

for (const [file, page] of Object.entries(pages)) {
  const map = PAGE_MAP[file];
  if (!map) {
    console.log(`(ignorada) ${file}`);
    continue;
  }
  const src = page.releases.find((r) => r.blocks.length) ?? page.releases[0];
  let release = db.releases.find((r) => r.id === map.id);
  if (!release) {
    release = {
      id: map.id,
      title: map.new?.title ?? src.title,
      subtitle: map.new?.subtitle,
      type: map.new?.type ?? 'special',
      market: map.new?.market ?? 'KR',
      date: parseDate(src.tags) ?? '2018-01-01',
      sets: [],
    };
    db.releases.push(release);
  }
  const date = parseDate(src.tags);
  if (date && date !== release.date) report.push(`  ⚠ ${release.id}: data no app ${release.date}, no SKZPD ${date}`);

  // Cards antigos (para migrar marcações)
  const oldCards = expandRelease(db, release);
  const oldSets = release.sets;
  const hasWoojin = (release.members ?? []).includes('woojin');

  const newSets = [];
  const images = {};
  const used = new Map();
  let lastSpecific = '';
  for (const [i, block] of src.blocks.entries()) {
    let label = (block.label ?? '').trim();
    if (!label || /^none$/i.test(label)) label = 'Sem nome';
    const name0 = GENERIC.test(label) && lastSpecific ? `${lastSpecific} — ${label}` : label;
    if (!GENERIC.test(label) && label !== 'Sem nome') lastSpecific = label;
    const n = (used.get(name0) ?? 0) + 1;
    used.set(name0, n);
    const name = n > 1 ? `${name0} (${n})` : name0;
    const id = `k-${slug(name)}`;
    const category = classify(label, map.new?.category);

    const singles = block.cards.map((c) => membersOf(c.name));
    const allSingle = singles.every((ms) => ms.length === 1) && new Set(singles.map((m) => m[0])).size === singles.length;
    const set = { id, name, category, note: 'Fonte: SKZPD', skzpdBlock: i };
    if (category !== 'photocard') {
      set.itemType = /polaroid/i.test(label) ? 'Polaroid' : /postcard/i.test(label) ? 'Postcard' : /id card/i.test(label) ? 'ID card' : 'Photocard';
      if ((category === 'pob' || category === 'luckydraw') && STORE_RE.test(label)) set.store = storeOf(label) || undefined;
    }
    if (allSingle) {
      const members = singles.map((m) => m[0]);
      if (hasWoojin && members.length === 8 && !members.includes('woojin')) members.splice(1, 0, 'woojin');
      set.members = members;
      set.perMember = 1;
      for (const c of block.cards) images[`${release.id}:${id}:_:${membersOf(c.name)[0]}:1`] = compact(c.img);
    } else {
      set.perMember = 0;
      set.extras = block.cards.map((c, j) => {
        const ms = membersOf(c.name);
        const ex = { id: `${slug(c.name) || 'card'}-${j + 1}`, label: c.name };
        if (ms.length) ex.members = ms;
        return ex;
      });
      for (const ex of set.extras) {
        const memberId = ex.members?.length === 1 ? ex.members[0] : 'group';
        void memberId;
        images[`${release.id}:${id}:_:x-${ex.id}:1`] = compact(block.cards[set.extras.indexOf(ex)].img);
      }
    }
    newSets.push(set);
  }

  // Mantém sets nossos que o SKZPD não cobre (itens do álbum: postcards, pôsteres…)
  const kept = oldSets.filter((s) => KEEP_OLD.has(s.category ?? 'photocard'));
  const replaced = oldSets.filter((s) => !KEEP_OLD.has(s.category ?? 'photocard') && !s.id.startsWith('k-'));
  release.sets = [...newSets, ...kept];
  release.images = { ...Object.fromEntries(Object.entries(release.images ?? {}).filter(([k]) => !k.includes(':k-'))), ...images };
  if (src.cover) release.cover = { url: compact(src.cover), source: 'SKZPD', page: SITE + file };
  release.verified = true;
  release.source = { name: 'SKZPD', url: SITE + file };

  // ---------- migração de marcações ----------
  const newCards = expandRelease(db, release);
  const newIds = new Set(newCards.map((c) => c.id));
  const norm = (s) => slug(String(s ?? '').replace(/\b(ver|version)\b\.?/gi, ''));
  let migrated = 0;
  for (const old of oldCards) {
    if (newIds.has(old.id)) continue;
    // 1) set gerado pelo SKZPD que mudou de nome: mesma posição de bloco
    const oldSet = oldSets.find((s) => s.id === old.setId);
    let target = null;
    if (oldSet?.skzpdBlock !== undefined) {
      const ns = newSets.find((s) => s.skzpdBlock === oldSet.skzpdBlock);
      if (ns) target = newCards.find((c) => c.setId === ns.id && c.memberId === old.memberId);
    }
    // 2) set estimado por nós: versão/nome igual ao rótulo do SKZPD, mesmo membro
    if (!target && replaced.some((s) => s.id === old.setId)) {
      const key = norm(old.version ?? old.setName);
      const matches = newSets.filter((s) => norm(s.name) === key);
      if (matches.length === 1) target = newCards.find((c) => c.setId === matches[0].id && c.memberId === old.memberId && c.index === 1);
    }
    if (target) {
      db.idMigrations[old.id] = target.id;
      migrated++;
    }
  }
  const total = newCards.length;
  const withImg = newCards.filter((c) => release.images[c.id]).length;
  report.push(
    `• ${release.id.padEnd(28)} ${String(newSets.length).padStart(3)} sets do SKZPD · ${String(total).padStart(4)} itens · ${withImg} com foto · ` +
      `${replaced.length} sets antigos substituídos · ${kept.length} mantidos · ${migrated} migrações`,
  );
}

// Encadeia migrações (a → b → c vira a → c) e remove destinos inexistentes
const allIds = new Set(db.releases.flatMap((r) => expandRelease(db, r).map((c) => c.id)));
for (const [from] of Object.entries(db.idMigrations)) {
  let to = db.idMigrations[from];
  for (let i = 0; i < 10 && db.idMigrations[to]; i++) to = db.idMigrations[to];
  if (allIds.has(to)) db.idMigrations[from] = to;
  else delete db.idMigrations[from];
}

db.sources = [
  ...(db.sources ?? []).filter((s) => !/skzpd/i.test(s.url)),
  { name: 'SKZPD — Stray Kids Photocard Database (fotos dos photocards)', url: 'https://skzpd.com/src/index.html' },
];
db.releases.sort((a, b) => a.date.localeCompare(b.date));

console.log(report.join('\n'));
const totalCards = db.releases.reduce((n, r) => n + expandRelease(db, r).length, 0);
const totalImgs = db.releases.reduce((n, r) => n + Object.keys(r.images ?? {}).length, 0);
console.log(`\nBase: ${db.releases.length} lançamentos, ${totalCards} itens, ${totalImgs} fotos, ${Object.keys(db.idMigrations).length} migrações de marcações.`);
if (dry) console.log('(--dry) Nada foi gravado.');
else {
  writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n');
  console.log('✔ Base gravada. Rode "npm run data:bump".');
}
