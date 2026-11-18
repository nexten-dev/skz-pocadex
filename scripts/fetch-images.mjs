// Coleta imagens das wikis e grava na base (public/data/photocards.json),
// para que todos recebam na próxima atualização automática do app.
// Roda no GitHub Actions (workflow "Prévias das wikis"), que tem acesso às wikis.
//
// Para cada lançamento grava em release.media:
//   - previews: prévia oficial do conteúdo de cada versão do álbum
//   - members:  uma foto de divulgação de cada membro na era
//   - cover:    capa digital
//
// Uso:
//   node scripts/fetch-images.mjs                 -> todos os lançamentos
//   node scripts/fetch-images.mjs maxident ate    -> só os IDs informados
//   node scripts/fetch-images.mjs --dry           -> só mostra o que encontraria
//   node scripts/fetch-images.mjs --verbose       -> lista as imagens escolhidas
import { readFileSync, writeFileSync } from 'node:fs';
import { releaseMembers, slug } from '../src/lib/expand.js';
import { collectReleaseMedia, previewKeys } from '../src/lib/wiki.js';

const FILE = new URL('../public/data/photocards.json', import.meta.url);
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const verbose = args.includes('--verbose');
const only = args.filter((a) => !a.startsWith('--'));

const db = JSON.parse(readFileSync(FILE, 'utf-8'));
const politeFetch = async (url) => {
  await new Promise((r) => setTimeout(r, 250)); // não sobrecarregar a wiki
  return fetch(url, { headers: { 'User-Agent': 'skz-pocadex-image-fetcher/2.0 (projeto de fã)' } });
};

const stable = (x) => JSON.stringify(x ?? null);
let changed = 0;
let withMedia = 0;
for (const release of db.releases) {
  if (only.length && !only.includes(release.id)) continue;
  process.stdout.write(`• ${release.title.padEnd(42)} `);
  let media;
  try {
    media = await collectReleaseMedia(release, releaseMembers(db, release), politeFetch);
  } catch (e) {
    console.log(`erro: ${e.message}`);
    continue;
  }
  if (!media) {
    console.log('galeria não encontrada na wiki');
    continue;
  }
  withMedia++;
  media.previews = media.previews.map((p) => ({ ...p, keys: previewKeys(p.title ?? p.label, release.sets, slug) }));
  const { totalImages, ...toSave } = media;
  console.log(
    `${totalImages} imagens na galeria · ${media.previews.length} prévias de versão · ` +
      `${Object.keys(media.members).length}/${releaseMembers(db, release).length} membros`,
  );
  if (verbose) {
    for (const p of media.previews) console.log(`    prévia  ${p.label.padEnd(36)} → ${p.keys.join(', ') || '(sem grupo correspondente)'}`);
    for (const [id, m] of Object.entries(media.members)) console.log(`    membro  ${id.padEnd(10)} ${m.title}`);
    if (media.cover) console.log(`    capa    ${media.cover.title}`);
  }
  const before = release.media ? { ...release.media, updatedAt: undefined } : null;
  if (stable(before) !== stable({ ...toSave, updatedAt: undefined })) {
    release.media = { ...toSave, updatedAt: new Date().toISOString().slice(0, 10) };
    changed++;
  }
}

console.log(`\n${withMedia} lançamentos com galeria; ${changed} com imagens novas ou alteradas.`);
if (dry) {
  console.log('(--dry) Nada foi gravado.');
} else if (changed > 0) {
  writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n');
  console.log('✔ Base atualizada. Rode "npm run data:bump" antes de publicar.');
}
