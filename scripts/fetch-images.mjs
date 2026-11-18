// Procura prévias de photocards nas wikis e grava na base de dados
// (public/data/photocards.json), para que todos recebam as imagens
// na próxima atualização automática do app.
//
// Uso:
//   npm run images:fetch                 -> todos os lançamentos
//   npm run images:fetch -- maxident ate -> só os IDs informados
//   npm run images:fetch -- --dry        -> só mostra o que encontraria
//   npm run images:fetch -- --approx     -> também grava prévias aproximadas (≈)
//   npm run images:fetch -- --verbose    -> lista cada imagem encontrada e onde foi usada
//
// Só preenche cards que ainda não têm imagem na base. Depois de rodar,
// confira o resultado no app e execute "npm run data:bump" antes de publicar.
import { readFileSync, writeFileSync } from 'node:fs';
import { expandRelease, releaseMembers } from '../src/lib/expand.js';
import { findReleaseImages, matchImages } from '../src/lib/wiki.js';

const FILE = new URL('../public/data/photocards.json', import.meta.url);
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const approx = args.includes('--approx');
const verbose = args.includes('--verbose');
const only = args.filter((a) => !a.startsWith('--'));

const db = JSON.parse(readFileSync(FILE, 'utf-8'));
const politeFetch = async (url) => {
  await new Promise((r) => setTimeout(r, 250)); // não sobrecarregar a wiki
  return fetch(url, { headers: { 'User-Agent': 'skz-pocadex-image-fetcher/1.0' } });
};

let added = 0;
for (const release of db.releases) {
  if (only.length && !only.includes(release.id)) continue;
  const cards = expandRelease(db, release);
  process.stdout.write(`• ${release.title.padEnd(42)} `);
  let candidates;
  try {
    candidates = await findReleaseImages(release, releaseMembers(db, release), politeFetch);
  } catch (e) {
    console.log(`erro: ${e.message}`);
    continue;
  }
  const matches = matchImages(cards, candidates);
  let n = 0;
  for (const [cardId, m] of matches) {
    if (m.confidence !== 'exact' && !approx) continue;
    release.images ??= {};
    if (release.images[cardId]) continue;
    release.images[cardId] = { url: m.url, thumb: m.thumb, page: m.page, source: m.source };
    n++;
  }
  added += n;
  console.log(`${candidates.length} imagens na wiki, ${n} novas associadas`);
  if (verbose) {
    const byUrl = new Map();
    for (const [cardId, m] of matches) byUrl.set(m.url, [...(byUrl.get(m.url) ?? []), `${cardId} (${m.confidence})`]);
    for (const c of candidates) {
      console.log(`    ${c.member ?? '?'.padEnd(8)} ${c.title}  [${c.source}]`);
      for (const m of byUrl.get(c.url) ?? []) console.log(`        → ${m}`);
    }
  }
}

if (dry) {
  console.log(`\n(--dry) ${added} imagens seriam gravadas. Nada foi alterado.`);
} else if (added > 0) {
  writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n');
  console.log(`\n✔ ${added} imagens gravadas. Confira no app e rode "npm run data:bump" antes de publicar.`);
} else {
  console.log('\nNenhuma imagem nova encontrada.');
}
