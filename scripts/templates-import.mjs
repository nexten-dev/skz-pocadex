// Importa a lista de templates da wiki de r/skzcollection (data/sources/reddit-skzcollection-templates.md)
// para db.templates. Templates são imagens com vários cards juntos (referência visual), feitas
// por membros da comunidade — o app exibe os endereços originais com crédito e link do post.
//
// Uso: node scripts/templates-import.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { slug } from '../src/lib/expand.js';

const SRC = new URL('../data/sources/reddit-skzcollection-templates.md', import.meta.url);
const FILE = new URL('../public/data/photocards.json', import.meta.url);
const dry = process.argv.includes('--dry');
const md = readFileSync(SRC, 'utf-8');
const db = JSON.parse(readFileSync(FILE, 'utf-8'));

const L1 = [
  'Collections of templates',
  'Albums, Photobooks, Season Greetings, etc.',
  'Photocards (PCs)',
  'Concert, Fansign, etc.',
  'Per Member',
  'Per Member and per album',
  'Per Member and per type of item',
  'Collaborations',
];
/** Subtítulos de 2º nível por seção (os demais são de 3º nível). */
const L2 = {
  'Photocards (PCs)': ['Album PCs'],
  'Concert, Fansign, etc.': ['Broadcast & Streaming Events', 'Korea MD', 'Japan MD', 'Other MD'],
  'Per Member': ['Korean', 'Japanese', 'Non-Korean Albums'],
};

/** Tradução dos títulos de seção para a interface. */
const PT = {
  'Collections of templates': 'Coleções de templates',
  'Albums, Photobooks, Season Greetings, etc.': 'Álbuns, photobooks e Season’s Greetings (visão geral)',
  'Photocards (PCs)': 'Photocards',
  'Album PCs': 'Photocards dos álbuns',
  Korean: 'Coreia',
  Japanese: 'Japão',
  Taiwanese: 'Taiwan',
  'Concert, Fansign, etc.': 'Shows, fansigns e eventos',
  'Broadcast & Streaming Events': 'Transmissões e eventos de streaming',
  'Korea MD': 'Merch da Coreia',
  'Japan MD': 'Merch do Japão',
  'Other MD': 'Outros merchs',
  Concert: 'Shows',
  Fanclub: 'Fanclub',
  Fanmeeting: 'Fanmeeting',
  Photobook: 'Photobooks',
  "Season's Greetings": 'Season’s Greetings',
  SKZOO: 'SKZOO',
  'Pop-up store': 'Pop-up store',
  Dispatch: 'Dispatch',
  'Per Member': 'Por membro',
  Albums: 'Álbuns',
  'Site POBs': 'POBs de lojas',
  'Albums and Site POBs': 'Álbuns e POBs de lojas',
  'Non-Korean Albums': 'Álbuns fora da Coreia',
  'Per Member and per album': 'Por membro e por álbum',
  Oddinary: 'ODDINARY',
  'Per Member and per type of item': 'Por membro e por tipo de item',
  'SKZOO Photocards': 'Photocards SKZOO',
  'Mini ID Photocards': 'Mini ID photocards',
  Collaborations: 'Colaborações',
};

/** Template → lançamento do app (pelo caminho de seções + título). */
const RELEASE_RULES = [
  [/Album PCs>Korean>MAXIDENT/i, 'maxident'],
  [/Album PCs>Korean>Oddinary/i, 'oddinary'],
  [/Album PCs>Korean>Christmas EveL/i, 'christmas-evel'],
  [/Album PCs>Korean>NoEasy/i, 'noeasy'],
  [/Album PCs>Korean>In Life/i, 'in-life'],
  [/Album PCs>Korean>Go Live/i, 'go-live'],
  [/Album PCs>Korean>Clé: Levanter/i, 'cle-levanter'],
  [/Album PCs>Korean>Clé 2: Yellow Wood/i, 'cle-2-yellow-wood'],
  [/Album PCs>Korean>Clé 1: Miroh/i, 'cle-1-miroh'],
  [/Album PCs>Korean>I am YOU/i, 'i-am-you'],
  [/Album PCs>Korean>I am WHO/i, 'i-am-who'],
  [/Album PCs>Korean>I am NOT/i, 'i-am-not'],
  [/Album PCs>Korean>Mixtape/i, 'mixtape'],
  [/Album PCs>Japanese>The Sound/i, 'the-sound'],
  [/Album PCs>Japanese>Circus/i, 'circus'],
  [/Album PCs>Japanese>Scars/i, 'scars-thunderous'],
  [/Album PCs>Japanese>All In/i, 'all-in'],
  [/Album PCs>Japanese>TOP/i, 'top-jp'],
  [/Album PCs>Japanese>SKZ2020/i, 'skz2020'],
  [/Album PCs>Taiwanese>Yellow Wood/i, 'cle-2-yellow-wood-tw'],
  [/Album PCs>Taiwanese>I am YOU/i, 'i-am-you-tw'],
  [/Album PCs>Taiwanese>I am NOT/i, 'i-am-not-tw'],
  [/Korea MD>Concert>Unveil Op\.01/i, 'unveil-i-am-not'],
  [/Fanclub>1st Generation/i, 'fanclub-1st'],
  [/Fanclub>0th Generation/i, 'fanclub-0th'],
  [/Per Member and per album>Oddinary>/i, 'oddinary'],
];

const MEMBERS = { 'bang chan': 'bangchan', 'lee know': 'leeknow', changbin: 'changbin', hyunjin: 'hyunjin', han: 'han', felix: 'felix', seungmin: 'seungmin', 'i.n': 'in' };

const items = [];
let l1 = null;
let l2 = null;
let run = []; // títulos lidos desde o último item
let path = [];
for (const raw of md.split('\n')) {
  const line = raw.trim();
  if (!line) continue;
  if (!line.startsWith('* ')) {
    run.push(line);
    continue;
  }
  if (run.length) {
    for (const h of run) {
      if (L1.includes(h)) {
        l1 = h;
        l2 = null;
        path = [h];
      } else if (!L2[l1] || L2[l1].includes(h)) {
        l2 = h;
        path = [l1, h];
      } else {
        path = l2 ? [l1, l2, h] : [l1, h];
      }
    }
    run = [];
  }
  // Item: um ou mais links de imagem, autor, post, data/status
  const links = [...line.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => ({ label: m[1], url: m[2] }));
  const author = line.match(/by \[(u\/[^\]]+)\]/)?.[1] ?? null;
  const post = links.find((l) => l.label === '[post' || l.label === 'post')?.url ?? line.match(/\[\[post\]\]\((https?:\/\/[^)\s]+)\)/)?.[1] ?? null;
  const updated = line.match(/last updated: (\d{6})(?: \(([^)]+)\))?/);
  const status = /almost complete/.test(line) ? 'quase completo' : /- complete/.test(line) ? 'completo' : null;
  const images = links.filter((l) => !/reddit\.com\/u\//.test(l.url) && !/^\[?post\]?$/.test(l.label) && l.url !== post);
  const baseTitle = images[0]?.label ?? '';
  for (const [i, img] of images.entries()) {
    const title = i === 0 ? img.label : `${baseTitle.replace(/\s*pt\.\s*\d+$/i, '')} ${img.label}`;
    const key = `${path.join('>')}>${title}`;
    const releaseId = RELEASE_RULES.find(([re]) => re.test(key))?.[1];
    const member = MEMBERS[title.toLowerCase()];
    const isImage = /\.(png|jpe?g|webp)(\?|$)|preview\.redd\.it/.test(img.url);
    items.push({
      id: slug(`${path.join(' ')} ${title}`),
      title,
      path: path.map((p) => PT[p] ?? p),
      ...(isImage ? { image: img.url } : { link: img.url }),
      ...(author ? { author } : {}),
      ...(post ? { post } : {}),
      ...(updated ? { updated: `20${updated[1].slice(0, 2)}-${updated[1].slice(2, 4)}-${updated[1].slice(4, 6)}`, upTo: updated[2] } : {}),
      ...(status ? { status } : {}),
      ...(releaseId ? { releaseId } : {}),
      ...(member ? { member } : {}),
    });
  }
}

// Confere se os lançamentos existem
const ids = new Set(db.releases.map((r) => r.id));
const missing = items.filter((t) => t.releaseId && !ids.has(t.releaseId));
for (const t of missing) {
  console.log(`⚠ lançamento inexistente: ${t.releaseId} (${t.title})`);
  delete t.releaseId;
}
// IDs únicos
const seen = new Map();
for (const t of items) {
  const n = (seen.get(t.id) ?? 0) + 1;
  seen.set(t.id, n);
  if (n > 1) t.id = `${t.id}-${n}`;
}

db.templates = {
  source: { name: 'r/skzcollection — wiki de templates', url: 'https://www.reddit.com/r/skzcollection/wiki/templates/' },
  items,
};
db.sources = [
  ...(db.sources ?? []).filter((s) => !/skzcollection/.test(s.url)),
  { name: 'r/skzcollection — templates da comunidade', url: 'https://www.reddit.com/r/skzcollection/wiki/templates/' },
];

const byRelease = {};
for (const t of items) if (t.releaseId) byRelease[t.releaseId] = (byRelease[t.releaseId] ?? 0) + 1;
console.log(`${items.length} templates (${items.filter((t) => t.image).length} imagens, ${items.filter((t) => t.link).length} links).`);
console.log(`Ligados a lançamentos: ${Object.entries(byRelease).map(([k, v]) => `${k}=${v}`).join(', ')}`);
const groups = {};
for (const t of items) groups[t.path.join(' › ')] = (groups[t.path.join(' › ')] ?? 0) + 1;
console.log('Seções:\n' + Object.entries(groups).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
if (!dry) {
  writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n');
  console.log('✔ Base gravada. Rode "npm run data:bump".');
}
